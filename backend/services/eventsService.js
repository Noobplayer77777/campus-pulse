/**
 * Events Service
 * Manages event lifecycle, scheduling constraints, overlap detection,
 * moderation (approve/reject), and event queries in CampusPulse-Events.
 */

const crypto = require('crypto');
const {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { CONFIG, EVENT_STATUS, ROLES } = require('../config/constants');
const { getDocClient, paginateQuery, paginateScan } = require('../db/dynamoClient');
const logger = require('../middleware/logger');

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const nodeCrypto = require('crypto');
  return nodeCrypto.randomUUID();
}

/**
 * Check if another event at the same venue and date overlaps in time.
 * @param {string} locationId - Location name or ID
 * @param {string} date - Date YYYY-MM-DD
 * @param {string} startTime - HH:MM
 * @param {string} endTime - HH:MM
 * @param {string|null} excludeEventId - Optional event to exclude (during edit)
 */
async function checkLocationTimeOverlap(locationId, date, startTime, endTime, excludeEventId = null) {
  // Query events on this date using paginated Scan with filter
  const events = await paginateScan({
    TableName: CONFIG.TABLES.EVENTS,
    FilterExpression: '#location = :loc AND #date = :dt AND #status <> :cancelled',
    ExpressionAttributeNames: {
      '#location': 'location',
      '#date': 'date',
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':loc': locationId,
      ':dt': date,
      ':cancelled': EVENT_STATUS.CANCELLED,
    },
  });

  const conflicts = [];

  for (const event of events) {
    if (excludeEventId && event.eventId === excludeEventId) {
      continue;
    }
    const existingStart = event.time;
    const existingEnd = event.endTime;

    if (!existingStart || !existingEnd) continue;

    // Time window overlap condition
    if (
      (startTime < existingEnd && endTime > existingStart) ||
      (existingStart < endTime && existingEnd > startTime)
    ) {
      conflicts.push({
        eventId: event.eventId,
        name: event.name,
        time: `${existingStart} - ${existingEnd}`,
      });
    }
  }

  return conflicts;
}

/**
 * List events with flexible filtering (status, location, clubId, dateRange).
 */
async function listEvents(filters = {}) {
  const { location, clubId, status, type, dateRange = 'future', search } = filters;
  const todayStr = new Date().toISOString().split('T')[0];

  let items = [];

  // Optimized Path: Querying approved upcoming events using GSI_StatusDate
  if (status === EVENT_STATUS.APPROVED && dateRange === 'future' && !clubId) {
    try {
      items = await paginateQuery({
        TableName: CONFIG.TABLES.EVENTS,
        IndexName: CONFIG.INDEXES.EVENTS_STATUS_DATE,
        KeyConditionExpression: '#status = :status AND #date >= :today',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#date': 'date',
        },
        ExpressionAttributeValues: {
          ':status': EVENT_STATUS.APPROVED,
          ':today': todayStr,
        },
      });
    } catch (err) {
      logger.warn('Index query on GSI_StatusDate failed, falling back to Scan', { error: err.message });
      // Fallback to table Scan with pagination
      items = await paginateScan({ TableName: CONFIG.TABLES.EVENTS });
    }
  } else if (clubId) {
    // Query club events using GSI_ClubEvents
    try {
      items = await paginateQuery({
        TableName: CONFIG.TABLES.EVENTS,
        IndexName: CONFIG.INDEXES.EVENTS_CLUB_DATE,
        KeyConditionExpression: '#clubId = :clubId',
        ExpressionAttributeNames: {
          '#clubId': 'clubId',
        },
        ExpressionAttributeValues: {
          ':clubId': clubId,
        },
      });
    } catch (err) {
      const allEvents = await paginateScan({ TableName: CONFIG.TABLES.EVENTS });
      items = allEvents.filter((e) => e.clubId === clubId);
    }
  } else {
    // Full paginated scan for admin views / complex multi-attribute queries
    items = await paginateScan({ TableName: CONFIG.TABLES.EVENTS });
  }

  // In-memory filters for compound criteria
  let filtered = items.filter((event) => {
    if (status && event.status !== status) return false;
    if (location && location !== 'all' && event.location !== location) return false;
    if (type && type !== 'all' && event.type !== type) return false;
    if (clubId && event.clubId !== clubId) return false;

    if (dateRange === 'future' && event.date < todayStr) return false;
    if (dateRange === 'past' && event.date >= todayStr) return false;

    if (search && search.trim()) {
      const s = search.toLowerCase();
      const nameMatch = event.name && event.name.toLowerCase().includes(s);
      const descMatch = event.description && event.description.toLowerCase().includes(s);
      if (!nameMatch && !descMatch) return false;
    }

    return true;
  });

  // Sort ascending by date
  filtered.sort((a, b) => (a.date > b.date ? 1 : -1));

  return filtered;
}

/**
 * Retrieve a single event by eventId.
 */
async function getEventById(eventId) {
  const docClient = getDocClient();
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG.TABLES.EVENTS,
      Key: { eventId },
      ConsistentRead: true,
    })
  );
  return result.Item || null;
}

/**
 * Create a new event.
 */
async function createEvent(eventData, caller) {
  const docClient = getDocClient();

  if (!caller || ![ROLES.CLUB, ROLES.ADMIN].includes(caller.role)) {
    const err = new Error('Permission denied: Only clubs and administrators may create events');
    err.statusCode = 403;
    throw err;
  }

  const {
    location,
    date,
    endTime,
    description,
    image,
    capacity,
    difficulty = 'beginner',
    tags = [],
  } = eventData;

  const name = eventData.name || eventData.title;
  const time = eventData.time || eventData.startTime;
  const type = eventData.type || 'general';

  // Validation
  if (!name || !type || !location || !date || !time || !endTime) {
    throw new Error('Missing required event fields: name, type, location, date, time, endTime');
  }

  const numCapacity = parseInt(capacity, 10);
  if (isNaN(numCapacity) || numCapacity <= 0) {
    throw new Error('Event capacity must be a positive integer');
  }

  // Validate 24 hours advance notice for non-admin creations
  if (caller.role !== ROLES.ADMIN) {
    const eventDateTime = new Date(`${date}T${time}`);
    const minDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (isNaN(eventDateTime.getTime()) || eventDateTime < minDateTime) {
      throw new Error('Events must be scheduled at least 24 hours in advance');
    }
  }

  // Validate start vs end time
  if (time >= endTime) {
    throw new Error('Event end time must be after start time');
  }

  // Collision detection
  const conflicts = await checkLocationTimeOverlap(location, date, time, endTime);
  if (conflicts.length > 0) {
    const conflictNames = conflicts.map((c) => `${c.name} (${c.time})`).join(', ');
    const err = new Error(`Time slot conflicts with existing event(s): ${conflictNames}`);
    err.statusCode = 409;
    throw err;
  }

  const now = new Date().toISOString();
  const eventId = generateUUID();
  const initialStatus = caller.role === ROLES.ADMIN ? EVENT_STATUS.APPROVED : EVENT_STATUS.PENDING;

  const item = {
    eventId,
    name: name.trim(),
    title: name.trim(),
    type,
    location,
    date,
    time,
    startTime: time,
    endTime,
    description: description ? description.trim() : '',
    image: image || '',
    clubId: caller.role === ROLES.ADMIN && eventData.clubId ? eventData.clubId : caller.userId,
    capacity: numCapacity,
    registeredCount: 0,
    waitlistSequence: 0, // Concurrency-safe atomic monotonic sequence counter
    waitlistCount: 0, // Active count of queued students
    difficulty,
    tags: Array.isArray(tags) ? tags : [],
    status: initialStatus,
    approvedBy: caller.role === ROLES.ADMIN ? caller.userId : null,
    rejectionReason: null,
    cancellationRequest: null,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: CONFIG.TABLES.EVENTS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(eventId)',
    })
  );

  logger.info('Event created successfully', { eventId, clubId: caller.userId, status: initialStatus });
  return {
    ...item,
    eventId,
    event: item,
    message: initialStatus === EVENT_STATUS.APPROVED
      ? 'Event created and approved automatically.'
      : 'Event created successfully. Awaiting admin approval.',
  };
}

/**
 * Approve an event (Admin only).
 */
async function approveEvent(eventId, caller) {
  const docClient = getDocClient();
  const adminId = typeof caller === 'object' ? caller.userId : caller;

  if (typeof caller === 'object' && caller.role && caller.role !== ROLES.ADMIN) {
    const err = new Error('Permission denied: Administrator role required to approve events');
    err.statusCode = 403;
    throw err;
  }

  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: CONFIG.TABLES.EVENTS,
      Key: { eventId },
      UpdateExpression: 'SET #status = :approved, #approvedBy = :adminId, #updatedAt = :now, #rejectionReason = :null',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#approvedBy': 'approvedBy',
        '#updatedAt': 'updatedAt',
        '#rejectionReason': 'rejectionReason',
      },
      ExpressionAttributeValues: {
        ':approved': EVENT_STATUS.APPROVED,
        ':adminId': adminId || 'admin',
        ':now': now,
        ':null': null,
      },
      ConditionExpression: 'attribute_exists(eventId)',
    })
  );

  logger.info('Event approved by admin', { eventId, adminId });
  return { eventId, status: EVENT_STATUS.APPROVED, message: 'Event approved successfully' };
}

/**
 * Reject an event (Admin only).
 */
async function rejectEvent(eventId, reasonOrCaller, optionalCaller) {
  const docClient = getDocClient();
  let reason = '';
  let caller = optionalCaller;

  if (typeof reasonOrCaller === 'object') {
    caller = reasonOrCaller;
    reason = typeof optionalCaller === 'string' ? optionalCaller : '';
  } else {
    reason = reasonOrCaller || '';
  }

  const adminId = typeof caller === 'object' ? caller.userId : (caller || 'admin');

  if (typeof caller === 'object' && caller.role && caller.role !== ROLES.ADMIN) {
    const err = new Error('Permission denied: Administrator role required to reject events');
    err.statusCode = 403;
    throw err;
  }

  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: CONFIG.TABLES.EVENTS,
      Key: { eventId },
      UpdateExpression: 'SET #status = :rejected, #approvedBy = :adminId, #rejectionReason = :reason, #updatedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#approvedBy': 'approvedBy',
        '#rejectionReason': 'rejectionReason',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':rejected': EVENT_STATUS.REJECTED,
        ':adminId': adminId,
        ':reason': reason || 'No specific reason provided.',
        ':now': now,
      },
      ConditionExpression: 'attribute_exists(eventId)',
    })
  );

  logger.info('Event rejected by admin', { eventId, adminId, reason });
  return { eventId, status: EVENT_STATUS.REJECTED, message: 'Event rejected successfully' };
}

/**
 * Delete an event.
 * Clubs may only delete their own PENDING events.
 * Admins may delete any event.
 */
async function deleteEvent(eventId, caller) {
  const docClient = getDocClient();

  let conditionExpression = 'attribute_exists(eventId)';
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (caller.role === ROLES.CLUB) {
    conditionExpression += ' AND #clubId = :callerId AND #status = :pending';
    expressionAttributeNames['#clubId'] = 'clubId';
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':callerId'] = caller.userId;
    expressionAttributeValues[':pending'] = EVENT_STATUS.PENDING;
  }

  const deleteParams = {
    TableName: CONFIG.TABLES.EVENTS,
    Key: { eventId },
    ConditionExpression: conditionExpression,
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    deleteParams.ExpressionAttributeNames = expressionAttributeNames;
    deleteParams.ExpressionAttributeValues = expressionAttributeValues;
  }

  try {
    await docClient.send(new DeleteCommand(deleteParams));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      const error = new Error('Permission denied: You may only delete your own pending events');
      error.statusCode = 403;
      throw error;
    }
    throw err;
  }

  logger.info('Event deleted', { eventId, callerId: caller.userId });
  return { status: 'success', message: 'Event deleted successfully' };
}

/**
 * Update an existing event (Club owner or Admin)
 */
async function updateEvent(eventId, updateData, caller) {
  const docClient = getDocClient();
  const existing = await getEventById(eventId);
  if (!existing) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  // Caller must be Admin or the creating Club
  if (caller.role !== ROLES.ADMIN && caller.userId !== existing.clubId) {
    const error = new Error('Access denied. You can only update events created by your club.');
    error.statusCode = 403;
    throw error;
  }

  const allowedFields = ['name', 'description', 'location', 'date', 'time', 'endTime', 'capacity', 'difficulty', 'tags', 'image'];
  const updateExpressions = ['#updatedAt = :updatedAt'];
  const names = { '#updatedAt': 'updatedAt' };
  const values = { ':updatedAt': new Date().toISOString() };

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'capacity') {
        const cap = Number(updateData.capacity);
        if (isNaN(cap) || cap <= 0) {
          throw new Error('Capacity must be a positive number');
        }
        if (cap < (existing.registeredCount || 0)) {
          throw new Error(`Capacity cannot be reduced below current registrations (${existing.registeredCount || 0})`);
        }
        updateExpressions.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = cap;
      } else {
        updateExpressions.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = updateData[field];
      }
    }
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: CONFIG.TABLES.EVENTS,
      Key: { eventId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
  );

  logger.info('Event updated', { eventId, updatedBy: caller.userId });
  return { status: 'success', message: 'Event updated successfully', event: result.Attributes };
}

module.exports = {
  listEvents,
  getEventById,
  createEvent,
  approveEvent,
  rejectEvent,
  deleteEvent,
  updateEvent,
  checkLocationTimeOverlap,
};
