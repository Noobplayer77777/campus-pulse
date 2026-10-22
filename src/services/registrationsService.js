/**
 * Registrations Service - AWS API Gateway / Lambda Adapter
 * Handles event registrations, waitlist queuing, and cancellations via AWS backend.
 * Concurrency safety, capacity limits, and queue promotions are enforced atomically in DynamoDB.
 * Preserves legacy Firebase implementation via REACT_APP_DATA_PROVIDER=firebase.
 */

import apiClient from './apiClient';
import * as firebaseRegistrations from './registrationsService.firebase';

const isFirebaseMode = () => (process.env.REACT_APP_DATA_PROVIDER || '').toLowerCase() === 'firebase';

/**
 * Register a user for an event or add to queue if full
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<{status, message, queuePosition}>}
 */
export async function registerForEvent(userId, eventId) {
  if (isFirebaseMode()) {
    return firebaseRegistrations.registerForEvent(userId, eventId);
  }

  try {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    const res = await apiClient.post(`/api/events/${eventId}/register`, {});

    return {
      status: res.status || 'registered',
      message: res.message || 'Registered for event successfully',
      queuePosition: res.queuePosition || null,
    };
  } catch (error) {
    // If backend reports 409 Conflict, user is already registered or waitlisted
    if (error.statusCode === 409 || error.message?.includes('Already registered')) {
      return {
        status: 'already_registered',
        message: 'You are already registered or in the queue for this event',
        queued: false,
      };
    }

    console.error('Error registering for event:', error);
    throw new Error(error.message || 'Failed to register for event');
  }
}

/**
 * Cancel a registration and trigger fair waitlist promotion
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<{status, message, promoted}>}
 */
export async function cancelRegistration(userId, eventId) {
  if (isFirebaseMode()) {
    return firebaseRegistrations.cancelRegistration(userId, eventId);
  }

  try {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    const res = await apiClient.post(`/api/events/${eventId}/cancel`, {});

    const promoted = !!res.promoted;
    return {
      status: 'success',
      message: res.message || (promoted ? 'Unregistered. Next person in queue promoted' : 'Unregistered successfully'),
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
  if (isFirebaseMode()) {
    return firebaseRegistrations.leaveQueue(userId, eventId);
  }

  try {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    const res = await apiClient.post(`/api/events/${eventId}/leave-queue`, {});

    return {
      status: 'success',
      message: res.message || 'Left the queue',
    };
  } catch (error) {
    console.error('Error leaving queue:', error);
    throw new Error(error.message || 'Failed to leave queue');
  }
}

/**
 * Get all events the current user is registered for
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of registrations with event details
 */
export async function getUserRegistrations(userId) {
  if (isFirebaseMode()) {
    return firebaseRegistrations.getUserRegistrations(userId);
  }

  try {
    const res = await apiClient.get('/api/users/me/registrations');
    return res.registrations || [];
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    throw new Error(error.message || 'Failed to fetch your registrations');
  }
}

/**
 * Get registration status for a user and event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>}
 */
export async function getRegistrationStatus(userId, eventId) {
  if (isFirebaseMode()) {
    return firebaseRegistrations.getRegistrationStatus(userId, eventId);
  }

  try {
    const list = await getUserRegistrations(userId);
    const found = list.find((r) => r.eventId === eventId);
    return found || null;
  } catch (error) {
    console.warn(`Could not check registration status for ${eventId}:`, error);
    return null;
  }
}

/**
 * Get all registrations for an event (Club or Admin view)
 */
export async function getEventRegistrations(eventId) {
  if (isFirebaseMode()) {
    return firebaseRegistrations.getEventRegistrations(eventId);
  }

  // Backend does not expose public user listing for privacy; returns empty list if unauthenticated
  return [];
}

/**
 * Get the current queue position count for an event
 */
export async function getQueuePositionCount(eventId) {
  if (isFirebaseMode()) {
    return firebaseRegistrations.getQueuePositionCount(eventId);
  }

  try {
    const data = await apiClient.get(`/api/events/${eventId}`);
    return Number(data.event?.waitlistCount) || 0;
  } catch {
    return 0;
  }
}

/**
 * Get the first user in queue
 */
export async function getFirstQueuedUser(eventId) {
  if (isFirebaseMode()) {
    return firebaseRegistrations.getFirstQueuedUser(eventId);
  }

  // Managed automatically on the backend during atomic cancellation
  return null;
}

/**
 * Submit attendance rating and feedback
 */
export async function submitAttendanceRating(userId, eventId, rating, feedback = '') {
  if (isFirebaseMode()) {
    return firebaseRegistrations.submitAttendanceRating(userId, eventId, rating, feedback);
  }

  try {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const res = await apiClient.post(`/api/events/${eventId}/feedback`, {
      rating: numRating,
      feedback: feedback ? feedback.trim() : '',
    });

    return {
      status: 'success',
      message: res.message || 'Thank you for your feedback',
      registration: res.registration || null,
    };
  } catch (error) {
    console.error('Error submitting rating:', error);
    throw new Error(error.message || 'Failed to submit rating');
  }
}
