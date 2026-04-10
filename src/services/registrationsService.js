import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  collection,
  Timestamp,
  orderBy,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../utils/constants';
import { getEventById, updateEvent } from './eventsService';

/**
 * Register a user for an event or add to queue if full
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<{status, message, queuePosition}>}
 */
export async function registerForEvent(userId, eventId) {
  try {
    // Validate inputs
    if (!userId || !eventId) {
      throw new Error('Missing userId or eventId');
    }

    // Check if already registered/queued
    const existingReg = await getRegistrationStatus(userId, eventId);
    if (existingReg) {
      // Return a message indicating they're already registered instead of throwing
      return {
        status: 'already_registered',
        message: existingReg.status === 'queued' 
          ? `You are already in queue at position ${existingReg.queuePosition}`
          : 'You are already registered for this event',
        queued: existingReg.status === 'queued',
      };
    }

    // Get event to check capacity
    const event = await getEventById(eventId);
    const isAtCapacity = event.registeredCount >= event.capacity;

    let queuePosition = null;

    if (isAtCapacity) {
      // User is queued
      const queueCount = await getQueuePositionCount(eventId);
      queuePosition = queueCount + 1;

      // Write to subcollection /events/{eventId}/registrations/{userId}
      const registrationRef = doc(
        db,
        COLLECTIONS.EVENTS,
        eventId,
        'registrations',
        userId
      );

      try {
        await setDoc(registrationRef, {
          userId,
          eventId,
          status: 'queued',
          queuePosition,
          registeredAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Firestore error creating queue registration:', {
          path: `events/${eventId}/registrations/${userId}`,
          userId,
          eventId,
          error: err.code,
          message: err.message,
        });
        throw err;
      }

      return {
        status: 'queued',
        message: `You are in queue at position ${queuePosition}`,
        queuePosition,
      };
    } else {
      // User is registered
      // Write to subcollection /events/{eventId}/registrations/{userId}
      const registrationRef = doc(
        db,
        COLLECTIONS.EVENTS,
        eventId,
        'registrations',
        userId
      );

      try {
        await setDoc(registrationRef, {
          userId,
          eventId,
          status: 'registered',
          queuePosition: null,
          registeredAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Firestore error creating registration:', {
          path: `events/${eventId}/registrations/${userId}`,
          userId,
          eventId,
          error: err.code,
          message: err.message,
        });
        throw err;
      }

      // Increment registered count in event using atomic operation
      await updateEvent(eventId, {
        registeredCount: increment(1),
      });

      return {
        status: 'registered',
        message: 'Registered for event successfully',
        queuePosition: null,
      };
    }
  } catch (error) {
    console.error('Error registering for event:', error);
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission to register. Please ensure you are logged in.');
    }
    throw new Error(error.message || 'Failed to register for event');
  }
}

/**
 * Get registration status for a user and event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>} - Registration object or null
 */
export async function getRegistrationStatus(userId, eventId) {
  try {
    // Get from subcollection /events/{eventId}/registrations/{userId}
    const registrationRef = doc(
      db,
      COLLECTIONS.EVENTS,
      eventId,
      'registrations',
      userId
    );

    const docSnap = await getDoc(registrationRef);
    if (!docSnap.exists()) {
      return null;
    }

    return {
      registrationId: docSnap.id,
      ...docSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching registration status:', error);
    return null;
  }
}

/**
 * Get all events a user is registered for
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of registrations with event details
 */
export async function getUserRegistrations(userId) {
  try {
    // Get all events, then check each one for a registration from this user
    const eventsRef = collection(db, COLLECTIONS.EVENTS);
    const eventsSnapshot = await getDocs(eventsRef);
    const registrations = [];

    for (const eventDoc of eventsSnapshot.docs) {
      const eventId = eventDoc.id;
      try {
        // Check if user is registered in this event's registrations subcollection
        const registrationRef = doc(
          db,
          COLLECTIONS.EVENTS,
          eventId,
          'registrations',
          userId
        );
        const regSnap = await getDoc(registrationRef);
        if (regSnap.exists()) {
          const regData = regSnap.data();
          registrations.push({
            registrationId: regSnap.id,
            ...regData,
            event: eventDoc.data(),
          });
        }
      } catch (error) {
        // Skip on error
        console.warn(`Error checking registration in event ${eventId}:`, error);
      }
    }

    return registrations;
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    throw new Error('Failed to fetch your registrations');
  }
}

/**
 * Get all registrations for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} - Array of registrations
 */
export async function getEventRegistrations(eventId) {
  try {
    // Get from subcollection /events/{eventId}/registrations
    const regsRef = collection(
      db,
      COLLECTIONS.EVENTS,
      eventId,
      'registrations'
    );
    const q = query(regsRef, orderBy('registeredAt', 'asc'));
    const snapshot = await getDocs(q);
    const registrations = [];

    snapshot.forEach((docSnap) => {
      registrations.push({
        registrationId: docSnap.id,
        ...docSnap.data(),
      });
    });

    return registrations;
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    throw new Error('Failed to fetch registrations');
  }
}

/**
 * Cancel a registration
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<{status, message, promoted}>}
 */
export async function cancelRegistration(userId, eventId) {
  try {
    const registration = await getRegistrationStatus(userId, eventId);
    if (!registration) {
      throw new Error('Registration not found');
    }

    const wasRegistered = registration.status === 'registered';
    const event = await getEventById(eventId);

    // Delete the registration from subcollection /events/{eventId}/registrations/{userId}
    const registrationRef = doc(
      db,
      COLLECTIONS.EVENTS,
      eventId,
      'registrations',
      userId
    );
    await deleteDoc(registrationRef);

    let promoted = false;

    // If user was registered (not queued), decrement count and promote from queue
    if (wasRegistered) {
      // Decrement registered count using atomic operation
      await updateEvent(eventId, {
        registeredCount: increment(-1),
      });

      // Check if there's someone in queue to promote
      const queuedUser = await getFirstQueuedUser(eventId);
      if (queuedUser) {
        // Promote from queue
        const queuedUserRef = doc(
          db,
          COLLECTIONS.EVENTS,
          eventId,
          'registrations',
          queuedUser.userId
        );
        await updateDoc(queuedUserRef, {
          status: 'registered',
          queuePosition: null,
        });

        // Increment registered count back (since we decremented and now promoting a queued user)
        await updateEvent(eventId, {
          registeredCount: increment(1),
        });

        promoted = true;
      }
    }

    return {
      status: 'success',
      message: promoted
        ? 'Unregistered. Next person in queue promoted'
        : 'Unregistered successfully',
      promoted,
    };
  } catch (error) {
    console.error('Error cancelling registration:', error);
    throw new Error(error.message || 'Failed to cancel registration');
  }
}

/**
 * Leave queue without registering
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<{status, message}>}
 */
export async function leaveQueue(userId, eventId) {
  try {
    const registration = await getRegistrationStatus(userId, eventId);
    if (!registration || registration.status !== 'queued') {
      throw new Error('You are not in queue for this event');
    }

    // Delete the queue entry from subcollection /events/{eventId}/registrations/{userId}
    const registrationRef = doc(
      db,
      COLLECTIONS.EVENTS,
      eventId,
      'registrations',
      userId
    );
    await deleteDoc(registrationRef);

    return {
      status: 'success',
      message: 'Left the queue',
    };
  } catch (error) {
    console.error('Error leaving queue:', error);
    throw new Error(error.message || 'Failed to leave queue');
  }
}

/**
 * Get the current queue position count
 * @param {string} eventId - Event ID
 * @returns {Promise<number>} - Count of users in queue
 */
export async function getQueuePositionCount(eventId) {
  try {
    // Get from subcollection /events/{eventId}/registrations with status='queued'
    const regsRef = collection(
      db,
      COLLECTIONS.EVENTS,
      eventId,
      'registrations'
    );
    const q = query(regsRef, where('status', '==', 'queued'));

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting queue count:', error);
    return 0;
  }
}

/**
 * Get the first user in queue
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>} - First queued registration or null
 */
export async function getFirstQueuedUser(eventId) {
  try {
    // Get from subcollection /events/{eventId}/registrations with status='queued'
    const regsRef = collection(
      db,
      COLLECTIONS.EVENTS,
      eventId,
      'registrations'
    );
    const q = query(
      regsRef,
      where('status', '==', 'queued'),
      orderBy('queuePosition', 'asc')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return {
      registrationId: docSnap.id,
      ...docSnap.data(),
    };
  } catch (error) {
    console.error('Error getting first queued user:', error);
    return null;
  }
}

/**
 * Submit attendance rating and feedback
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {number} rating - Rating 1-5
 * @param {string} feedback - User feedback
 * @returns {Promise<{status, message}>}
 */
export async function submitAttendanceRating(
  userId,
  eventId,
  rating,
  feedback
) {
  try {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const registration = await getRegistrationStatus(userId, eventId);
    if (!registration) {
      throw new Error('Registration not found');
    }

    // Update registration in subcollection /events/{eventId}/registrations/{userId}
    const regRef = doc(
      db,
      COLLECTIONS.EVENTS,
      eventId,
      'registrations',
      userId
    );
    await updateDoc(regRef, {
      status: 'attended',
      rating,
      feedback: feedback || '',
      attendedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Thank you for your feedback',
    };
  } catch (error) {
    console.error('Error submitting rating:', error);
    throw new Error(error.message || 'Failed to submit rating');
  }
}
