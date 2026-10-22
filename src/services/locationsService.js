/**
 * Locations Service - AWS API Gateway / Lambda Adapter
 * Queries and manages campus locations via AWS backend API.
 * Preserves legacy Firebase implementation via REACT_APP_DATA_PROVIDER=firebase.
 */

import apiClient from './apiClient';
import * as firebaseLocations from './locationsService.firebase';

const isFirebaseMode = () => (process.env.REACT_APP_DATA_PROVIDER || '').toLowerCase() === 'firebase';

/**
 * Create a new location (Admin only)
 */
export async function createLocation(locationData, adminId) {
  if (isFirebaseMode()) {
    return firebaseLocations.createLocation(locationData, adminId);
  }

  try {
    const { name, campus, capacity } = locationData;

    if (!name || !campus || !capacity) {
      throw new Error('Missing required location fields');
    }

    const res = await apiClient.post('/api/locations', locationData);
    const created = res.location || res;

    return {
      locationId: created.locationId,
      status: 'success',
      message: 'Location created successfully',
      location: created,
    };
  } catch (error) {
    console.error('Error creating location:', error);
    throw new Error(error.message || 'Failed to create location');
  }
}

/**
 * Get all locations with optional filters
 */
export async function getLocations(filters = {}) {
  if (isFirebaseMode()) {
    return firebaseLocations.getLocations(filters);
  }

  try {
    const params = {};
    if (filters.campus) params.campus = filters.campus;
    if (filters.activeOnly !== undefined) params.activeOnly = filters.activeOnly;

    const res = await apiClient.get('/api/locations', { params });
    return res.locations || [];
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw new Error(error.message || 'Failed to fetch locations');
  }
}

/**
 * Get a single location by ID
 */
export async function getLocationById(locationId) {
  if (isFirebaseMode()) {
    return firebaseLocations.getLocationById(locationId);
  }

  try {
    const res = await apiClient.get(`/api/locations/${locationId}`);
    return res.location || null;
  } catch (error) {
    console.error(`Error fetching location ${locationId}:`, error);
    throw new Error(error.message || 'Failed to fetch location');
  }
}

/**
 * Update location details (Admin only)
 */
export async function updateLocation(locationId, updateData) {
  if (isFirebaseMode()) {
    return firebaseLocations.updateLocation(locationId, updateData);
  }

  try {
    const res = await apiClient.put(`/api/locations/${locationId}`, updateData);
    return {
      status: 'success',
      message: res.message || 'Location updated successfully',
    };
  } catch (error) {
    console.error('Error updating location:', error);
    throw new Error(error.message || 'Failed to update location');
  }
}

/**
 * Check location availability for a given date and time range
 */
export async function getLocationAvailability(locationId, date, startTime, endTime, excludeEventId = null) {
  if (isFirebaseMode()) {
    return firebaseLocations.getLocationAvailability(locationId, date, startTime, endTime, excludeEventId);
  }

  try {
    const events = await apiClient.get('/api/events', {
      params: { location: locationId, date, dateRange: 'all' },
    });

    const conflicts = (events.events || []).filter((e) => {
      if (excludeEventId && e.eventId === excludeEventId) return false;
      if (e.status === 'cancelled' || e.status === 'rejected') return false;
      const start = e.time;
      const end = e.endTime;
      return (startTime < end && endTime > start) || (start < endTime && end > startTime);
    });

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  } catch (error) {
    console.warn('Could not check location availability:', error);
    return { available: true, conflicts: [] };
  }
}

/**
 * Delete a location (Admin only)
 */
export async function deleteLocation(locationId) {
  if (isFirebaseMode()) {
    return firebaseLocations.deleteLocation(locationId);
  }

  try {
    await apiClient.delete(`/api/locations/${locationId}`);
    return {
      status: 'success',
      message: 'Location deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting location:', error);
    throw new Error(error.message || 'Failed to delete location');
  }
}

/**
 * Get all events for a location on a specific date
 */
export async function getLocationEventsOnDate(locationId, date) {
  if (isFirebaseMode()) {
    return firebaseLocations.getLocationEventsOnDate(locationId, date);
  }

  try {
    const data = await apiClient.get('/api/events', {
      params: { location: locationId, date, dateRange: 'all' },
    });
    return data.events || [];
  } catch {
    return [];
  }
}
