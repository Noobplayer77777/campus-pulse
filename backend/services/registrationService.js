/**
 * Registrations & Concurrency-Safe Waitlist Service
 *
 * Implements atomic event registration, capacity enforcement, waitlist queuing,
 * and waitlist promotion using DynamoDB TransactWriteItems and atomic counter sequences.
 *
 * CONCURRENCY & ALGORITHM GUARANTEES:
 * 1. Zero Overbooking:
 *    Direct registration uses a DynamoDB transaction combining a conditional PutItem
 *    and an atomic UpdateItem on the event counter with condition `registeredCount < capacity`.
 *    If capacity is exhausted, the transaction aborts atomically.
 *
 * 2. Concurrency-Safe Waitlist Sequence:
 *    Queue positions are NOT calculated via an unprotected `count + 1` query (which races
 *    under concurrent requests). Instead, each event item contains an atomic monotonic counter
 *    `waitlistSequence`. When an event is full, we atomically increment `waitlistSequence`
 *    using an isolated atomic UpdateItem with ReturnValues: 'UPDATED_NEW'. DynamoDB guarantees
 *    serialization, so concurrent callers receive strictly unique, monotonically increasing
 *    queue numbers (1, 2, 3...) with zero collisions.
 *
 * 3. Safe Queue Promotion on Cancellation:
 *    When a registered student unregisters, we locate the lowest queuePosition student.
 *    The cancellation and promotion are grouped in an atomic TransactWriteItems:
 *    - Delete cancelling registration
 *    - Update next queued user to 'registered' with ConditionExpression `#status = :queued`
 *    This condition guarantees that even if multiple cancellations occur concurrently,
 *    the same queued student can NEVER be promoted twice.
 */

const {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  TransactWriteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { CONFIG, REGISTRATION_STATUS, EVENT_STATUS } = require('../config/constants');
const { getDocClient, paginateQuery, paginateScan } = require('../db/dynamoClient');
const { getEventById } = require('./eventsService');
const logger = require('../middleware/logger');

/**
 * Get registration record for a given user and event.
 */
async function getRegistrationStatus(eventId, userId) {
  const docClient = getDocClient();
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG.TABLES.REGISTRATIONS,
      Key: { eventId, userId },
    })
  );
  return result.Item || null;
}

/**
 * Register a user for an event, or place them in the waitlist if full.
 * @param {string} eventId - Target event UUID
 * @param {string} userId - Caller student UUID
 */
async function registerForEvent(eventId, userId) {
  const docClient = getDocClient();
  const now = new Date().toISOString();

  // 1. Check if user is already registered or queued
  const existingReg = await getRegistrationStatus(eventId, userId);
  if (existingReg) {
    const error = new Error(
      existingReg.status === REGISTRATION_STATUS.QUEUED
        ? `Already registered: in queue at position ${existingReg.queuePosition}`
        : 'Already registered for this event'
    );
    error.statusCode = 409;
    error.status = 'already_registered';
    throw error;
  }

  // 2. Verify event exists and is approved
  const event = await getEventById(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== EVENT_STATUS.APPROVED) {
    const error = new Error('Cannot register for an unapproved or cancelled event');
    error.statusCode = 400;
    throw error;
  }

  // 3. Attempt direct atomic registration via TransactWriteCommand
  // Requires: user is not registered AND registeredCount < capacity
  const transactionParams = {
    TransactItems: [
      {
        Put: {
          TableName: CONFIG.TABLES.REGISTRATIONS,
          Item: {
            eventId,
            userId,
            status: REGISTRATION_STATUS.REGISTERED,
            queuePosition: null,
            registeredAt: now,
          },
          ConditionExpression: 'attribute_not_exists(eventId) AND attribute_not_exists(userId)',
        },
      },
      {
        Update: {
          TableName: CONFIG.TABLES.EVENTS,
          Key: { eventId },
          UpdateExpression: 'SET registeredCount = registeredCount + :one, updatedAt = :now',
          ConditionExpression: 'registeredCount < capacity AND #status = :approved',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':one': 1,
            ':approved': EVENT_STATUS.APPROVED,
            ':now': now,
          },
        },
      },
    ],
  };

  try {
    await docClient.send(new TransactWriteCommand(transactionParams));
    logger.info('Student registered for event directly', { eventId, userId });
    return {
      status: 'registered',
      isWaitlisted: false,
      message: 'Registered for event successfully',
      queuePosition: null,
    };
  } catch (err) {
    // If condition on REGISTRATIONS failed (user already registered in concurrent request)
    if (err.CancellationReasons && err.CancellationReasons[0]?.Code === 'ConditionalCheckFailed') {
      const error = new Error('Already registered or queued for this event');
      error.statusCode = 409;
      error.status = 'already_registered';
      throw error;
    }

    // If the conditional check on registeredCount < capacity failed, event is full -> Join waitlist
    const isCapacityExceeded =
      err.name === 'TransactionCanceledException' ||
      err.message?.includes('ConditionalCheckFailed');

    if (!isCapacityExceeded) {
      logger.error('Registration transaction failed unexpectedly', { eventId, userId, error: err.message });
      throw err;
    }

    // 4. Concurrency-Safe Waitlist Allocation:
    // Atomically increment both monotonic sequence and active waitlist counter
    const seqUpdateResult = await docClient.send(
      new UpdateCommand({
        TableName: CONFIG.TABLES.EVENTS,
        Key: { eventId },
        UpdateExpression: 'SET waitlistSequence = if_not_exists(waitlistSequence, :zero) + :one, waitlistCount = if_not_exists(waitlistCount, :zero) + :one, updatedAt = :now',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':now': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    const assignedQueuePosition = seqUpdateResult.Attributes.waitlistSequence;

    // 5. Store queued registration record
    try {
      await docClient.send(
        new PutCommand({
          TableName: CONFIG.TABLES.REGISTRATIONS,
          Item: {
            eventId,
            userId,
            status: REGISTRATION_STATUS.QUEUED,
            queuePosition: assignedQueuePosition,
            registeredAt: now,
          },
          ConditionExpression: 'attribute_not_exists(eventId) AND attribute_not_exists(userId)',
        })
      );
    } catch (putErr) {
      if (putErr.name === 'ConditionalCheckFailedException') {
        // Roll back waitlistCount if registration put failed (e.g. duplicate)
        try {
          await docClient.send(
            new UpdateCommand({
              TableName: CONFIG.TABLES.EVENTS,
              Key: { eventId },
              UpdateExpression: 'SET waitlistCount = if_not_exists(waitlistCount, :one) - :one',
              ConditionExpression: 'attribute_not_exists(waitlistCount) OR waitlistCount > :zero',
              ExpressionAttributeValues: { ':one': 1, ':zero': 0 },
            })
          );
        } catch (rollbackErr) {
          // Ignore rollback error
        }
        const error = new Error('Already registered or queued for this event');
        error.statusCode = 409;
        error.status = 'already_registered';
        throw error;
      }
      throw putErr;
    }

    logger.info('Student added to waitlist queue', { eventId, userId, queuePosition: assignedQueuePosition });
    return {
      status: 'queued',
      isWaitlisted: true,
      message: `You are in queue at position ${assignedQueuePosition}`,
      queuePosition: assignedQueuePosition,
    };
  }
}

/**
 * Cancel an active registration or leave the waitlist.
 * If user was actively registered and waitlisted students exist, promotes the next in queue.
 */
async function cancelRegistration(eventId, userId) {
  const docClient = getDocClient();
  const now = new Date().toISOString();

  // 1. Fetch current registration
  const registration = await getRegistrationStatus(eventId, userId);
  if (!registration) {
    const error = new Error('Registration not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. If user was simply queued, atomically delete queue entry and decrement waitlistCount
  if (registration.status === REGISTRATION_STATUS.QUEUED) {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: CONFIG.TABLES.REGISTRATIONS,
              Key: { eventId, userId },
              ConditionExpression: '#status = :queued',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':queued': REGISTRATION_STATUS.QUEUED },
            },
          },
          {
            Update: {
              TableName: CONFIG.TABLES.EVENTS,
              Key: { eventId },
              UpdateExpression: 'SET waitlistCount = if_not_exists(waitlistCount, :one) - :one, updatedAt = :now',
              ConditionExpression: 'attribute_not_exists(waitlistCount) OR waitlistCount > :zero',
              ExpressionAttributeValues: {
                ':one': 1,
                ':zero': 0,
                ':now': now,
              },
            },
          },
        ],
      })
    );
    logger.info('User left waitlist queue', { eventId, userId });
    return {
      status: 'success',
      registrationStatus: 'cancelled',
      message: 'Left the queue',
      promoted: false,
    };
  }

  // 3. User was registered: Retry loop for atomic cancellation and promotion
  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Strongly consistent read of event metadata to detect active waitlist
    const event = await getEventById(eventId);
    const hasWaitlistCount = event && typeof event.waitlistCount === 'number' && event.waitlistCount > 0;

    // Find next eligible queued user:
    // Try GSI_Waitlist first
    let candidateToPromote = null;
    try {
      if (CONFIG.INDEXES.REGISTRATIONS_WAITLIST) {
        const waitlistItems = await paginateQuery({
          TableName: CONFIG.TABLES.REGISTRATIONS,
          IndexName: CONFIG.INDEXES.REGISTRATIONS_WAITLIST,
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: { ':eventId': eventId },
          Limit: 1,
        });
        candidateToPromote = waitlistItems[0] || null;
      }
    } catch (gsiErr) {
      // GSI query failed or GSI not yet ready
    }

    // Critical: If candidate was not found in GSI (or GSI experienced replication lag),
    // query the primary key partition of the base table with ConsistentRead: true.
    // Base table queries support strongly consistent reads, bypassing GSI replication lag.
    if (!candidateToPromote) {
      const queuedUsers = await paginateQuery({
        TableName: CONFIG.TABLES.REGISTRATIONS,
        KeyConditionExpression: 'eventId = :eventId',
        FilterExpression: '#status = :queued',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':eventId': eventId,
          ':queued': REGISTRATION_STATUS.QUEUED,
        },
        ConsistentRead: true,
      });
      queuedUsers.sort((a, b) => (Number(a.queuePosition) || 0) - (Number(b.queuePosition) || 0));
      candidateToPromote = queuedUsers[0] || null;
    }

    // Safety Guard: If event metadata indicates waitlistCount > 0, but the candidate query returned empty
    // (e.g. an inflight waitlist join has not completed its write), do NOT decrement capacity. Back off and retry!
    if (!candidateToPromote && hasWaitlistCount && attempt < MAX_RETRIES) {
      logger.warn('Waitlist count indicates queued users exist but candidate query was empty; backing off to retry', {
        eventId,
        waitlistCount: event.waitlistCount,
        attempt,
      });
      await new Promise((res) => setTimeout(res, 20 * attempt + Math.random() * 20));
      continue;
    }

    if (!candidateToPromote) {
      // No waitlist: delete registration and decrement event registeredCount.
      // Strict ConditionExpression guarantees registeredCount CANNOT be decremented if waitlistCount > 0.
      try {
        await docClient.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Delete: {
                  TableName: CONFIG.TABLES.REGISTRATIONS,
                  Key: { eventId, userId },
                  ConditionExpression: '#status = :registered',
                  ExpressionAttributeNames: { '#status': 'status' },
                  ExpressionAttributeValues: { ':registered': REGISTRATION_STATUS.REGISTERED },
                },
              },
              {
                Update: {
                  TableName: CONFIG.TABLES.EVENTS,
                  Key: { eventId },
                  UpdateExpression: 'SET registeredCount = registeredCount - :one, updatedAt = :now',
                  ConditionExpression: 'registeredCount > :zero AND (attribute_not_exists(waitlistCount) OR waitlistCount <= :zero)',
                  ExpressionAttributeValues: {
                    ':one': 1,
                    ':zero': 0,
                    ':now': now,
                  },
                },
              },
            ],
          })
        );

        logger.info('User cancelled registration, capacity decremented', { eventId, userId });
        return {
          status: 'success',
          registrationStatus: 'cancelled',
          promotedUserId: null,
          message: 'Unregistered successfully',
          promoted: false,
        };
      } catch (txnErr) {
        if (txnErr.name === 'TransactionCanceledException' && attempt < MAX_RETRIES) {
          await new Promise((res) => setTimeout(res, 20 * attempt + Math.random() * 20));
          continue;
        }
        throw txnErr;
      }
    }

    // Candidate found: attempt atomic cancellation, candidate promotion, and waitlistCount decrement
    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: CONFIG.TABLES.REGISTRATIONS,
                Key: { eventId, userId },
                ConditionExpression: '#status = :registered',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: { ':registered': REGISTRATION_STATUS.REGISTERED },
              },
            },
            {
              Update: {
                TableName: CONFIG.TABLES.REGISTRATIONS,
                Key: { eventId, userId: candidateToPromote.userId },
                UpdateExpression: 'SET #status = :registered, promotedAt = :now REMOVE queuePosition',
                ConditionExpression: '#status = :queued',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                  ':registered': REGISTRATION_STATUS.REGISTERED,
                  ':queued': REGISTRATION_STATUS.QUEUED,
                  ':now': now,
                },
              },
            },
            {
              Update: {
                TableName: CONFIG.TABLES.EVENTS,
                Key: { eventId },
                UpdateExpression: 'SET waitlistCount = if_not_exists(waitlistCount, :one) - :one, updatedAt = :now',
                ConditionExpression: 'attribute_not_exists(waitlistCount) OR waitlistCount > :zero',
                ExpressionAttributeValues: {
                  ':one': 1,
                  ':zero': 0,
                  ':now': now,
                },
              },
            },
          ],
        })
      );

      logger.info('User cancelled registration, next queued user promoted', {
        eventId,
        unregisteredUser: userId,
        promotedUser: candidateToPromote.userId,
      });

      return {
        status: 'success',
        registrationStatus: 'cancelled',
        promotedUserId: candidateToPromote.userId,
        message: 'Unregistered. Next person in queue promoted',
        promoted: true,
      };
    } catch (txnErr) {
      if (txnErr.name === 'TransactionCanceledException' && attempt < MAX_RETRIES) {
        logger.warn('Waitlist promotion collision detected, retrying with next candidate', {
          eventId,
          collisionCandidate: candidateToPromote.userId,
          attempt,
        });
        await new Promise((res) => setTimeout(res, 20 * attempt + Math.random() * 20));
        continue;
      }
      throw txnErr;
    }
  }
}

/**
 * Remove a user from the waitlist queue without altering registered capacity.
 */
async function leaveQueue(eventId, userId) {
  const docClient = getDocClient();
  const registration = await getRegistrationStatus(eventId, userId);

  if (!registration || registration.status !== REGISTRATION_STATUS.QUEUED) {
    const error = new Error('You are not in the queue for this event');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: CONFIG.TABLES.REGISTRATIONS,
            Key: { eventId, userId },
            ConditionExpression: '#status = :queued',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':queued': REGISTRATION_STATUS.QUEUED },
          },
        },
        {
          Update: {
            TableName: CONFIG.TABLES.EVENTS,
            Key: { eventId },
            UpdateExpression: 'SET waitlistCount = if_not_exists(waitlistCount, :one) - :one, updatedAt = :now',
            ConditionExpression: 'attribute_not_exists(waitlistCount) OR waitlistCount > :zero',
            ExpressionAttributeValues: {
              ':one': 1,
              ':zero': 0,
              ':now': now,
            },
          },
        },
      ],
    })
  );

  return { status: 'success', registrationStatus: 'cancelled', message: 'Left the queue' };
}

/**
 * Fetch all registrations for a student.
 * Uses GSI_UserRegistrations to eliminate Firestore's N+1 full-table scan.
 */
async function getUserRegistrations(userId) {
  let registrations = [];
  try {
    registrations = await paginateQuery({
      TableName: CONFIG.TABLES.REGISTRATIONS,
      IndexName: CONFIG.INDEXES.REGISTRATIONS_USER,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    });
  } catch (err) {
    logger.warn('GSI query for user registrations failed, scanning with filter', { error: err.message });
    registrations = await paginateScan({
      TableName: CONFIG.TABLES.REGISTRATIONS,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    });
  }

  // Hydrate with event summaries
  const hydrated = await Promise.all(
    registrations.map(async (reg) => {
      const event = await getEventById(reg.eventId);
      return {
        registrationId: reg.eventId,
        ...reg,
        event: event || null,
      };
    })
  );

  return hydrated;
}

/**
 * Submit post-event attendance rating and review.
 */
async function submitAttendanceRating(eventId, userId, rating, feedback = '') {
  const docClient = getDocClient();
  const now = new Date().toISOString();

  const numRating = parseInt(rating, 10);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    throw new Error('Rating must be an integer between 1 and 5');
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: CONFIG.TABLES.REGISTRATIONS,
      Key: { eventId, userId },
      UpdateExpression: 'SET #status = :attended, rating = :rating, feedback = :feedback, attendedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':attended': REGISTRATION_STATUS.ATTENDED,
        ':rating': numRating,
        ':feedback': feedback ? feedback.trim() : '',
        ':now': now,
      },
      ConditionExpression: 'attribute_exists(eventId) AND attribute_exists(userId)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return { status: 'success', message: 'Thank you for your feedback', registration: result.Attributes };
}

module.exports = {
  getRegistrationStatus,
  registerForEvent,
  cancelRegistration,
  leaveQueue,
  getUserRegistrations,
  submitAttendanceRating,
};
