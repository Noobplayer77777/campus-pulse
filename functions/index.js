const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const logger = functions.logger;

/**
 * Cloud Function: Triggered when a new registration document is CREATED
 * 
 * Purpose: Automatically decrease the event's capacity when a user registers
 * 
 * Firestore Path: events/{eventId}/registrations/{registrationId}
 * 
 * Logic:
 * 1. Fetch the event document
 * 2. Use Firestore transaction to atomically:
 *    - Check if capacity > 0 (prevent overbooking)
 *    - Decrease capacity by 1
 *    - Ensure capacity never goes below 0
 * 3. Handle errors and log the operation
 */
exports.onRegistrationCreated = functions.firestore
  .document('events/{eventId}/registrations/{registrationId}')
  .onCreate(async (snap, context) => {
    const { eventId, registrationId } = context.params;
    const registrationData = snap.data();

    logger.info(`New registration created: ${registrationId} for event: ${eventId}`, {
      timestamp: new Date().toISOString(),
      registrationData,
    });

    try {
      // Use Firestore transaction for atomic capacity update
      await db.runTransaction(async (transaction) => {
        const eventRef = db.collection('events').doc(eventId);
        const eventDoc = await transaction.get(eventRef);

        // Validate event exists
        if (!eventDoc.exists) {
          throw new Error(`Event document not found: ${eventId}`);
        }

        const currentCapacity = eventDoc.data().capacity ?? 0;

        // Prevent overbooking: Check if capacity is already at 0
        if (currentCapacity <= 0) {
          throw new Error(
            `Overbooking prevented: Event ${eventId} has no available capacity`
          );
        }

        // Calculate new capacity (ensure it never goes below 0)
        const newCapacity = Math.max(0, currentCapacity - 1);

        // Atomically update the capacity field
        transaction.update(eventRef, {
          capacity: newCapacity,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`Capacity updated for event ${eventId}`, {
          previousCapacity: currentCapacity,
          newCapacity: newCapacity,
          registrationId: registrationId,
        });
      });
    } catch (error) {
      logger.error(`Error processing registration creation for ${eventId}:`, {
        registrationId: registrationId,
        errorMessage: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
      });

      // Re-throw the error so Firebase knows the function failed
      throw error;
    }
  });

/**
 * Cloud Function: Triggered when a registration document is DELETED
 * 
 * Purpose: Automatically increase the event's capacity when a registration is cancelled
 * 
 * Firestore Path: events/{eventId}/registrations/{registrationId}
 * 
 * Logic:
 * 1. Fetch the event document
 * 2. Use Firestore transaction to atomically:
 *    - Increase capacity by 1
 *    - Ensure capacity doesn't exceed original event capacity
 * 3. Handle errors and log the operation
 */
exports.onRegistrationDeleted = functions.firestore
  .document('events/{eventId}/registrations/{registrationId}')
  .onDelete(async (snap, context) => {
    const { eventId, registrationId } = context.params;
    const registrationData = snap.data();

    logger.info(`Registration deleted: ${registrationId} for event: ${eventId}`, {
      timestamp: new Date().toISOString(),
      registrationData,
    });

    try {
      // Use Firestore transaction for atomic capacity update
      await db.runTransaction(async (transaction) => {
        const eventRef = db.collection('events').doc(eventId);
        const eventDoc = await transaction.get(eventRef);

        // Validate event exists
        if (!eventDoc.exists) {
          throw new Error(`Event document not found: ${eventId}`);
        }

        const eventData = eventDoc.data();
        const currentCapacity = eventData.capacity ?? 0;
        const originalCapacity = eventData.originalCapacity ?? eventData.capacity ?? 0;

        // Increase capacity by 1, but don't exceed the original capacity
        const newCapacity = Math.min(
          currentCapacity + 1,
          originalCapacity
        );

        // Atomically update the capacity field
        transaction.update(eventRef, {
          capacity: newCapacity,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`Capacity increased for event ${eventId}`, {
          previousCapacity: currentCapacity,
          newCapacity: newCapacity,
          originalCapacity: originalCapacity,
          registrationId: registrationId,
        });
      });
    } catch (error) {
      logger.error(`Error processing registration deletion for ${eventId}:`, {
        registrationId: registrationId,
        errorMessage: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
      });

      // Re-throw the error so Firebase knows the function failed
      throw error;
    }
  });

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
