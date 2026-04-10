const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const logger = functions.logger;

/**
 * DISABLED: Cloud Function was conflicting with frontend registration logic
 * 
 * NOTE: Registration count is now handled directly by the frontend via Firestore rules
 * The frontend code increments 'registeredCount' when a user registers.
 * This Cloud Function was incorrectly trying to decrement 'capacity' which is the max size.
 * 
 * The new flow (enabled in Firestore rules):
 * 1. User clicks register in StudentDashboard
 * 2. Frontend creates registration doc in /events/{eventId}/registrations/{userId}
 * 3. Frontend then increments event.registeredCount (allowed by Firestore rules)
 * 4. Available seats = capacity - registeredCount
 */
// DISABLED - Not being used anymore
/*
exports.onRegistrationCreated = functions.firestore
  .document('events/{eventId}/registrations/{registrationId}')
  .onCreate(async (snap, context) => {
    // OLD CODE DISABLED
  });
*/

/**
 * DISABLED: Cloud Function was conflicting with frontend registration logic
 * 
 * NOTE: Registration count is now handled directly by the frontend via Firestore rules
 * This Cloud Function was incorrectly trying to increment 'capacity' (max size) instead of
 * decrementing 'registeredCount'.
 * 
 * The new flow (enabled in Firestore rules):
 * 1. User clicks unregister in StudentDashboard
 * 2. Frontend deletes registration doc from /events/{eventId}/registrations/{userId}
 * 3. Frontend then decrements event.registeredCount (allowed by Firestore rules)
 */
// DISABLED - Not being used anymore
/*
exports.onRegistrationDeleted = functions.firestore
  .document('events/{eventId}/registrations/{registrationId}')
  .onDelete(async (snap, context) => {
    // OLD CODE DISABLED
  });
*/

/**
 * Optional: Callable function to check event availability
 * 
 * Purpose: Client-side function to verify capacity before registration
 * 
 * Usage: Call from your React app to check if seats are available
 */
exports.checkEventAvailability = functions.https.onCall(
  async (data, context) => {
    const { eventId } = data;

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const eventDoc = await db.collection('events').doc(eventId).get();

      if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Event not found');
      }

      const { capacity, title } = eventDoc.data();
      const isAvailable = capacity > 0;

      return {
        eventId,
        title,
        capacity,
        isAvailable,
        message: isAvailable
          ? `${capacity} seats available`
          : 'This event is fully booked',
      };
    } catch (error) {
      logger.error(`Error checking availability for event ${eventId}:`, error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to check event availability'
      );
    }
  }
);

/**
 * Scheduled Cloud Function to delete expired events
 * 
 * Purpose: Automatically delete events from Firebase once the event time is done
 * Runs: Every hour (can be adjusted via the schedule parameter)
 * 
 * Logic:
 * 1. Query all events where date is before today
 * 2. For each expired event, delete all associated registrations
 * 3. Delete the event document itself
 */
exports.deleteExpiredEvents = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      logger.info(`Running deleteExpiredEvents function at ${new Date().toISOString()}`);
      
      // Query for all events with date before today
      const expiredEventsSnapshot = await db
        .collection('events')
        .where('date', '<', today)
        .get();

      if (expiredEventsSnapshot.empty) {
        logger.info('No expired events found to delete');
        return null;
      }

      logger.info(`Found ${expiredEventsSnapshot.size} expired events to delete`);

      // Process each expired event
      const deletePromises = expiredEventsSnapshot.docs.map(async (eventDoc) => {
        const eventId = eventDoc.id;
        
        try {
          // Delete all registrations for this event
          const registrationsSnapshot = await db
            .collection('events')
            .doc(eventId)
            .collection('registrations')
            .get();

          const registrationDeletePromises = registrationsSnapshot.docs.map((regDoc) =>
            regDoc.ref.delete()
          );

          await Promise.all(registrationDeletePromises);
          logger.info(`Deleted ${registrationsSnapshot.size} registrations for event ${eventId}`);

          // Delete the event document
          await eventDoc.ref.delete();
          logger.info(`Deleted expired event: ${eventId}`);
        } catch (error) {
          logger.error(`Error deleting expired event ${eventId}:`, error);
        }
      });

      await Promise.all(deletePromises);
      logger.info('Finished deleteExpiredEvents function');
      return null;
    } catch (error) {
      logger.error('Error in deleteExpiredEvents function:', error);
      return null;
    }
  });
