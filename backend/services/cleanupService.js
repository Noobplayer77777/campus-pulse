/**
 * Expired Events Cleanup Service
 * Automatically purges past events and their associated registrations.
 * Can be invoked via scheduled EventBridge rule or POST /api/admin/cleanup-expired.
 */

const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { CONFIG } = require('../config/constants');
const { getDocClient, paginateScan, paginateQuery } = require('../db/dynamoClient');
const logger = require('../middleware/logger');

/**
 * Scan for events with date prior to today and remove them along with their registrations.
 * Supports full pagination across large datasets and guards against deleting rescheduled events.
 * @returns {Promise<{ deletedCount: number, errors: Array<{ eventId: string, error: string }>, eventIds: string[] }>}
 */
async function cleanupExpiredEvents() {
  const docClient = getDocClient();
  const today = new Date().toISOString().split('T')[0];

  logger.info('Starting expired events cleanup', { thresholdDate: today });

  // Paginated scan for all events prior to today
  const scanParams = {
    TableName: CONFIG.TABLES.EVENTS,
    FilterExpression: '#date < :today',
    ExpressionAttributeNames: {
      '#date': 'date',
    },
    ExpressionAttributeValues: {
      ':today': today,
    },
  };

  const expiredEvents = await paginateScan(scanParams);

  if (expiredEvents.length === 0) {
    logger.info('No expired events found for cleanup');
    return { deletedCount: 0, errors: [], eventIds: [] };
  }

  logger.info(`Found ${expiredEvents.length} expired events to remove`);

  let deletedCount = 0;
  const errors = [];
  const deletedEventIds = [];

  for (const event of expiredEvents) {
    const eventId = event.eventId;
    try {
      // 1. Atomically delete the event record FIRST with strict ConditionExpression #date < :today
      // This prevents a catastrophic bug: if an administrator rescheduled the event to a future date
      // while cleanup was executing, this DeleteCommand fails immediately with ConditionalCheckFailedException
      // BEFORE any of the event's registrations are touched!
      await docClient.send(
        new DeleteCommand({
          TableName: CONFIG.TABLES.EVENTS,
          Key: { eventId },
          ConditionExpression: '#date < :today',
          ExpressionAttributeNames: {
            '#date': 'date',
          },
          ExpressionAttributeValues: {
            ':today': today,
          },
        })
      );

      // 2. Only after the event is confirmed deleted, retrieve all registrations across all pages
      const regQueryParams = {
        TableName: CONFIG.TABLES.REGISTRATIONS,
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: {
          ':eventId': eventId,
        },
      };

      const registrations = await paginateQuery(regQueryParams);

      // 3. Delete registrations using safe bounded batches of up to 25 items
      const BATCH_SIZE = 25;
      for (let i = 0; i < registrations.length; i += BATCH_SIZE) {
        const batch = registrations.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((reg) =>
            docClient.send(
              new DeleteCommand({
                TableName: CONFIG.TABLES.REGISTRATIONS,
                Key: {
                  eventId: reg.eventId,
                  userId: reg.userId,
                },
              })
            )
          )
        );
      }

      deletedCount++;
      deletedEventIds.push(eventId);
      logger.info('Purged expired event and registrations', {
        eventId,
        deletedRegistrations: registrations.length,
      });
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        logger.warn('Skipped event cleanup: event was rescheduled to a future date', { eventId });
      } else {
        logger.error('Failed to purge expired event', { eventId, error: err.message });
        errors.push({ eventId, error: err.message });
      }
    }
  }

  logger.info('Expired events cleanup finished', {
    totalScanned: expiredEvents.length,
    deletedCount,
    errorCount: errors.length,
  });

  return {
    deletedCount,
    errors,
    eventIds: deletedEventIds,
  };
}

module.exports = {
  cleanupExpiredEvents,
};
