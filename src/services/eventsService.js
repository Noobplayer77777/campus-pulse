import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  collection,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, EVENT_STATUS, ROLES } from '../utils/constants';

/**
 * Convert Firebase error to user-friendly message
 */
function getFirebaseErrorMessage(errorCode) {
  const errorMessages = {
    'permission-denied': 'You do not have permission to perform this action',
    'not-found': 'Event not found',
    'invalid-argument': 'Invalid event data',
  };
  return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

/**
 * Check if there are overlapping events at the same location and time
 * @param {string} locationId - Location ID
 * @param {string} date - Event date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {string} excludeEventId - Event ID to exclude from check (for updates)
 * @returns {Promise<Array>} - Array of conflicting events
 */
export async function checkLocationTimeOverlap(
  locationId,
  date,
  startTime,
  endTime,
  excludeEventId = null
) {
  try {
    // Validate inputs
    if (!locationId || !date || !startTime || !endTime) {
      console.warn('Missing required parameters for overlap check:', { locationId, date, startTime, endTime });
      return [];
    }

    // Query all events at this location on this date that are not cancelled
    const eventsRef = collection(db, COLLECTIONS.EVENTS);
    const q = query(
      eventsRef,
      where('location', '==', locationId),
      where('date', '==', date),
      where('status', '!=', EVENT_STATUS.CANCELLED)
    );

    const snapshot = await getDocs(q);
    const conflicts = [];

    snapshot.forEach((docSnap) => {
      if (excludeEventId && docSnap.id === excludeEventId) {
        return; // Skip the event being updated
      }

      const eventData = docSnap.data();
      if (!eventData || !eventData.time || !eventData.endTime) {
        return; // Skip if missing time data
      }

      const existingStart = eventData.time; // HH:MM format
      const existingEnd = eventData.endTime; // HH:MM format

      // Simple time overlap check (HH:MM comparison as strings works for 24-hour format)
      if (
        (startTime < existingEnd && endTime > existingStart) ||
        (existingStart < endTime && existingEnd > startTime)
      ) {
        conflicts.push({
          eventId: docSnap.id,
          name: eventData.name,
          startTime: existingStart,
          endTime: existingEnd,
        });
      }
    });

    return conflicts;
  } catch (error) {
    console.error('Error checking overlap:', error);
    // Return empty array instead of throwing to allow event creation to proceed
    return [];
  }
}

/**
 * Create a new event
 * @param {Object} eventData - Event details
 * @param {string} eventData.name - Event name
 * @param {string} eventData.type - Event type (solo/team)
 * @param {string} eventData.location - Location ID
 * @param {string} eventData.date - Event date (YYYY-MM-DD)
 * @param {string} eventData.time - Start time (HH:MM)
 * @param {string} eventData.endTime - End time (HH:MM)
 * @param {string} eventData.description - Event description
 * @param {string} eventData.image - Event image URL
 * @param {string} eventData.clubId - Club ID (creator)
 * @param {number} eventData.capacity - Max participants
 * @param {Array} eventData.tags - Event tags
 * @returns {Promise<{eventId, status, message}>}
 */
export async function createEvent(eventData) {
  try {
    const {
      name,
      type,
      location,
      date,
      time,
      endTime,
      description,
      image,
      clubId,
      capacity,
      difficulty = 'beginner',
      tags = [],
    } = eventData;

    // Validate required fields
    if (!name || !type || !location || !date || !time || !endTime || !clubId) {
      throw new Error('Missing required event fields');
    }

    // Validate date is not in the past (no events 24 hours in advance)
    const eventDate = new Date(date);
    const now = new Date();
    const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (eventDate < minDate) {
      throw new Error('Event must be scheduled at least 24 hours in advance');
    }

    // Check for time conflicts at this location
    try {
      const conflicts = await checkLocationTimeOverlap(location, date, time, endTime);
      if (conflicts.length > 0) {
        const conflictNames = conflicts.map((c) => c.name).join(', ');
        throw new Error(`Time conflict with: ${conflictNames}`);
      }
    } catch (conflictError) {
      // If it's a conflict error, rethrow it
      if (conflictError.message.includes('Time conflict')) {
        throw conflictError;
      }
      // Otherwise log the error but allow event creation to proceed
      console.warn('Could not check for conflicts, proceeding with event creation:', conflictError);
    }

    // Create event document
    const eventRef = doc(collection(db, COLLECTIONS.EVENTS));
    const eventId = eventRef.id;

    await setDoc(eventRef, {
      name,
      type,
      location,
      date,
      time,
      endTime,
      description,
      image: image || '',
      clubId,
      capacity: capacity || 50,
      difficulty,
      registeredCount: 0,
      status: EVENT_STATUS.PENDING, // Start as pending, requires admin approval
      tags,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      approvedBy: null,
      rejectionReason: null,
      cancellationRequest: null,
    });

    return {
      eventId,
      status: 'success',
      message: 'Event created successfully. Awaiting admin approval.',
    };
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error(error.message || 'Failed to create event');
  }
}

/**
 * Get all events with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.location - Filter by location ID
 * @param {string} filters.club - Filter by club ID
 * @param {string} filters.status - Filter by status
 * @param {string} filters.type - Filter by event type
 * @param {string} filters.dateRange - Filter by date range (future, past, all)
 * @returns {Promise<Array>} - Array of events
 */
export async function getEvents(filters = {}) {
  try {
    const { location, club, status, type, dateRange = 'future' } = filters;

    let q = query(collection(db, COLLECTIONS.EVENTS));
    const constraints = [];

    // Build query constraints
    if (location) {
      constraints.push(where('location', '==', location));
    }
    if (club) {
      constraints.push(where('clubId', '==', club));
    }
    if (status) {
      constraints.push(where('status', '==', status));
    }
    if (type) {
      constraints.push(where('type', '==', type));
    }

    // Add date range filter
    const now = new Date();
    if (dateRange === 'future') {
      const todayStr = now.toISOString().split('T')[0];
      constraints.push(where('date', '>=', todayStr));
    } else if (dateRange === 'past') {
      const todayStr = now.toISOString().split('T')[0];
      constraints.push(where('date', '<', todayStr));
    }

    // Add ordering by date
    constraints.push(orderBy('date', 'asc'));

    if (constraints.length > 0) {
      q = query(collection(db, COLLECTIONS.EVENTS), ...constraints);
    }

    const snapshot = await getDocs(q);
    const events = [];

    snapshot.forEach((docSnap) => {
      events.push({
        eventId: docSnap.id,
        ...docSnap.data(),
      });
    });

    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw new Error('Failed to fetch events');
  }
}

/**
 * Get a single event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} - Event data
 */
export async function getEventById(eventId) {
  try {
    const eventDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, eventId));
    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    return {
      eventId: eventDoc.id,
      ...eventDoc.data(),
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    throw new Error(error.message || 'Failed to fetch event');
  }
}

/**
 * Update an event
 * @param {string} eventId - Event ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<{status, message}>}
 */
export async function updateEvent(eventId, updateData) {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    // If updating time/location, check for conflicts
    if (
      updateData.time ||
      updateData.endTime ||
      updateData.location ||
      updateData.date
    ) {
      const eventData = eventDoc.data();
      const date = updateData.date || eventData.date;
      const time = updateData.time || eventData.time;
      const endTime = updateData.endTime || eventData.endTime;
      const location = updateData.location || eventData.location;

      const conflicts = await checkLocationTimeOverlap(
        location,
        date,
        time,
        endTime,
        eventId
      );
      if (conflicts.length > 0) {
        const conflictNames = conflicts.map((c) => c.name).join(', ');
        throw new Error(`Time conflict with: ${conflictNames}`);
      }
    }

    await updateDoc(eventRef, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Event updated successfully',
    };
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error(error.message || 'Failed to update event');
  }
}

/**
 * Approve an event (Admin only)
 * @param {string} eventId - Event ID
 * @param {string} adminId - Admin user ID
 * @returns {Promise<{status, message}>}
 */
export async function approveEvent(eventId, adminId) {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      status: EVENT_STATUS.APPROVED,
      approvedBy: adminId,
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Event approved successfully',
    };
  } catch (error) {
    console.error('Error approving event:', error);
    throw new Error('Failed to approve event');
  }
}

/**
 * Reject an event (Admin only)
 * @param {string} eventId - Event ID
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<{status, message}>}
 */
export async function rejectEvent(eventId, adminId, reason) {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      status: EVENT_STATUS.REJECTED,
      approvedBy: adminId,
      rejectionReason: reason,
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Event rejected successfully',
    };
  } catch (error) {
    console.error('Error rejecting event:', error);
    throw new Error('Failed to reject event');
  }
}

/**
 * Request cancellation of an event (Club only)
 * @param {string} eventId - Event ID
 * @param {string} clubId - Club ID (requesting cancellation)
 * @param {string} reason - Cancellation reason
 * @returns {Promise<{status, message}>}
 */
export async function requestCancellation(eventId, clubId, reason) {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      cancellationRequest: {
        requested: true,
        reason,
        requestedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Cancellation request submitted to admin',
    };
  } catch (error) {
    console.error('Error requesting cancellation:', error);
    throw new Error('Failed to request cancellation');
  }
}

/**
 * Withdraw cancellation request (Club only)
 * @param {string} eventId - Event ID
 * @returns {Promise<{status, message}>}
 */
export async function withdrawCancellationRequest(eventId) {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      cancellationRequest: null,
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Cancellation request withdrawn',
    };
  } catch (error) {
    console.error('Error withdrawing cancellation:', error);
    throw new Error('Failed to withdraw cancellation');
  }
}

/**
 * Cancel an event (Admin only - forces cancellation)
 * @param {string} eventId - Event ID
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<{status, message}>}
 */
export async function cancelEvent(eventId, adminId, reason) {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      status: EVENT_STATUS.CANCELLED,
      cancellationRequest: {
        requested: true,
        reason,
        cancelledBy: adminId,
        cancelledAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Event cancelled successfully',
    };
  } catch (error) {
    console.error('Error cancelling event:', error);
    throw new Error('Failed to cancel event');
  }
}

/**
 * Delete an event
 * @param {string} eventId - Event ID
 * @returns {Promise<{status, message}>}
 */
export async function deleteEvent(eventId) {
  try {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    console.log('🗑️ Starting deletion process for event:', eventId);

    // Get event reference
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    
    // Verify event exists before deletion
    const eventDocBefore = await getDoc(eventRef);
    if (!eventDocBefore.exists()) {
      throw new Error('Event not found in database');
    }

    const eventData = eventDocBefore.data();
    console.log('📋 Event found, proceeding with deletion:', eventData.name, 'clubId:', eventData.clubId);

    // Delete the event
    await deleteDoc(eventRef);
    
    console.log('✅ Delete operation completed for event:', eventId);

    // Verify deletion was successful with a small delay for consistency
    setTimeout(() => {}, 100);
    const eventDocAfter = await getDoc(eventRef);
    if (eventDocAfter.exists()) {
      console.error('⚠️ Deletion verification failed - event still exists');
      throw new Error('Event deletion failed - event still exists in database');
    }

    console.log('✅ Deletion verified - event successfully removed from Firebase');
    
    return {
      status: 'success',
      message: 'Event deleted successfully',
    };
  } catch (error) {
    console.error('❌ Error deleting event:', error);
    
    // Parse Firebase error messages
    let errorMessage = error.message || 'Failed to delete event';
    
    if (error.code === 'permission-denied') {
      errorMessage = '❌ Permission denied! You must be the club admin to delete this event. Check Firebase rules.';
    } else if (error.message?.includes('not found')) {
      errorMessage = '❌ Event not found in database';
    }
    
    throw new Error(errorMessage);
  }
}
