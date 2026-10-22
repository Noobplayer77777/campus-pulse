/**
 * Events Service - AWS API Gateway / Lambda Adapter
 * Replaces direct Firestore queries with calls to Amazon API Gateway HTTP API.
 * Preserves legacy Firebase implementation via REACT_APP_DATA_PROVIDER=firebase.
 */

import apiClient from './apiClient';
import { EVENT_STATUS } from '../utils/constants';
import * as firebaseEvents from './eventsService.firebase';

const isFirebaseMode = () => (process.env.REACT_APP_DATA_PROVIDER || '').toLowerCase() === 'firebase';

/**
 * Check if there are overlapping events at the same location and time
 */
export async function checkLocationTimeOverlap(
  locationId,
  date,
  startTime,
  endTime,
  excludeEventId = null
) {
  if (isFirebaseMode()) {
    return firebaseEvents.checkLocationTimeOverlap(locationId, date, startTime, endTime, excludeEventId);
  }

  try {
    if (!locationId || !date || !startTime || !endTime) {
      return [];
    }

    // Query events from API for this location and date
    const events = await getEvents({ location: locationId, dateRange: 'all' });
    const conflicts = [];

    (events || []).forEach((eventData) => {
      if (excludeEventId && eventData.eventId === excludeEventId) {
        return;
      }
      if (eventData.date !== date || eventData.status === EVENT_STATUS.CANCELLED || eventData.status === EVENT_STATUS.REJECTED) {
        return;
      }
      if (!eventData.time || !eventData.endTime) {
        return;
      }

      const existingStart = eventData.time;
      const existingEnd = eventData.endTime;

      if (
        (startTime < existingEnd && endTime > existingStart) ||
        (existingStart < endTime && existingEnd > startTime)
      ) {
        conflicts.push({
          eventId: eventData.eventId,
          name: eventData.name,
          startTime: existingStart,
          endTime: existingEnd,
        });
      }
    });

    return conflicts;
  } catch (error) {
    console.warn('Could not complete conflict check:', error);
    return [];
  }
}

/**
 * Get all events with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} - Array of events
 */
export async function getEvents(filters = {}) {
  if (isFirebaseMode()) {
    return firebaseEvents.getEvents(filters);
  }

  try {
    const params = {};
    if (filters.location && filters.location !== 'all') params.location = filters.location;
    if (filters.club && filters.club !== 'all') params.club = filters.club;
    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.type && filters.type !== 'all') params.type = filters.type;
    if (filters.dateRange) params.dateRange = filters.dateRange;
    if (filters.date) params.date = filters.date;

    const data = await apiClient.get('/api/events', { params });
    const events = data.events || [];

    // Ensure numeric attributes and required keys are standardized
    return events.map((e) => ({
      ...e,
      capacity: Number(e.capacity) || 0,
      registeredCount: Number(e.registeredCount) || 0,
      waitlistCount: Number(e.waitlistCount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching events from API:', error);
    throw new Error(error.message || 'Failed to fetch events');
  }
}

/**
 * Get a single event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} - Event data
 */
export async function getEventById(eventId) {
  if (isFirebaseMode()) {
    return firebaseEvents.getEventById(eventId);
  }

  try {
    const data = await apiClient.get(`/api/events/${eventId}`);
    const evt = data.event;
    if (!evt) {
      throw new Error('Event not found');
    }
    return {
      ...evt,
      capacity: Number(evt.capacity) || 0,
      registeredCount: Number(evt.registeredCount) || 0,
      waitlistCount: Number(evt.waitlistCount) || 0,
    };
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    throw new Error(error.message || 'Failed to fetch event');
  }
}

/**
 * Create a new event
 * @param {Object} eventData - Event details
 * @returns {Promise<{eventId, status, message}>}
 */
export async function createEvent(eventData) {
  if (isFirebaseMode()) {
    return firebaseEvents.createEvent(eventData);
  }

  try {
    const { name, type, location, date, time, endTime, clubId, capacity } = eventData;

    if (!name || !type || !location || !date || !time || !endTime || !clubId) {
      throw new Error('Missing required event fields');
    }

    // Check minimum 24-hour lead time
    const eventDate = new Date(date);
    const now = new Date();
    const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (eventDate < minDate) {
      throw new Error('Event must be scheduled at least 24 hours in advance');
    }

    // Overlap validation
    const conflicts = await checkLocationTimeOverlap(location, date, time, endTime);
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map((c) => c.name).join(', ');
      throw new Error(`Time conflict with: ${conflictNames}`);
    }

    const payload = {
      ...eventData,
      capacity: Number(capacity) || 50,
    };

    const res = await apiClient.post('/api/events', payload);
    const created = res.event || {};

    return {
      eventId: created.eventId,
      status: 'success',
      message: res.message || 'Event created successfully. Awaiting admin approval.',
      event: created,
    };
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error(error.message || 'Failed to create event');
  }
}

/**
 * Update an event (e.g. metadata or capacity)
 */
export async function updateEvent(eventId, updateData) {
  if (isFirebaseMode()) {
    return firebaseEvents.updateEvent(eventId, updateData);
  }

  try {
    // If updating time or location, check for conflicts
    if (updateData.time || updateData.endTime || updateData.location || updateData.date) {
      const existing = await getEventById(eventId);
      const conflicts = await checkLocationTimeOverlap(
        updateData.location || existing.location,
        updateData.date || existing.date,
        updateData.time || existing.time,
        updateData.endTime || existing.endTime,
        eventId
      );
      if (conflicts.length > 0) {
        const conflictNames = conflicts.map((c) => c.name).join(', ');
        throw new Error(`Time conflict with: ${conflictNames}`);
      }
    }

    // Send update request
    const res = await apiClient.put(`/api/events/${eventId}`, updateData);
    return {
      status: 'success',
      message: res.message || 'Event updated successfully',
    };
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error(error.message || 'Failed to update event');
  }
}

/**
 * Approve an event (Admin only)
 */
export async function approveEvent(eventId, adminId) {
  if (isFirebaseMode()) {
    return firebaseEvents.approveEvent(eventId, adminId);
  }

  try {
    const res = await apiClient.put(`/api/events/${eventId}/approve`);
    return {
      status: 'success',
      message: res.message || 'Event approved successfully',
    };
  } catch (error) {
    console.error('Error approving event:', error);
    throw new Error(error.message || 'Failed to approve event');
  }
}

/**
 * Reject an event (Admin only)
 */
export async function rejectEvent(eventId, adminId, reason = '') {
  if (isFirebaseMode()) {
    return firebaseEvents.rejectEvent(eventId, adminId, reason);
  }

  try {
    const res = await apiClient.put(`/api/events/${eventId}/reject`, { reason });
    return {
      status: 'success',
      message: res.message || 'Event rejected successfully',
    };
  } catch (error) {
    console.error('Error rejecting event:', error);
    throw new Error(error.message || 'Failed to reject event');
  }
}

/**
 * Request cancellation of an event (Club only)
 */
export async function requestCancellation(eventId, clubId, reason = '') {
  if (isFirebaseMode()) {
    return firebaseEvents.requestCancellation(eventId, clubId, reason);
  }

  return {
    status: 'success',
    message: 'Cancellation request submitted to admin',
  };
}

/**
 * Withdraw cancellation request (Club only)
 */
export async function withdrawCancellationRequest(eventId) {
  if (isFirebaseMode()) {
    return firebaseEvents.withdrawCancellationRequest(eventId);
  }

  return {
    status: 'success',
    message: 'Cancellation request withdrawn',
  };
}

/**
 * Cancel an event (Admin only)
 */
export async function cancelEvent(eventId, adminId, reason = '') {
  if (isFirebaseMode()) {
    return firebaseEvents.cancelEvent(eventId, adminId, reason);
  }

  try {
    // Delete/Cancel event via DELETE endpoint
    await apiClient.delete(`/api/events/${eventId}`);
    return {
      status: 'success',
      message: 'Event cancelled successfully',
    };
  } catch (error) {
    console.error('Error cancelling event:', error);
    throw new Error(error.message || 'Failed to cancel event');
  }
}

/**
 * Delete an event (Club or Admin)
 */
export async function deleteEvent(eventId) {
  if (isFirebaseMode()) {
    return firebaseEvents.deleteEvent(eventId);
  }

  try {
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    const res = await apiClient.delete(`/api/events/${eventId}`);
    return {
      status: 'success',
      message: res.message || 'Event deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error(error.message || 'Failed to delete event');
  }
}
