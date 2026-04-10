import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, EVENT_STATUS } from '../utils/constants';

/**
 * Create a new location (Admin only)
 * @param {Object} locationData - Location information
 * @param {string} locationData.name - Location/venue name
 * @param {number} locationData.capacity - Venue capacity
 * @param {string} locationData.address - Full address
 * @param {string} locationData.campus - Campus identifier
 * @param {string} locationData.description - Optional description
 * @param {string} adminId - Admin user ID creating the location
 * @returns {Promise<{locationId, status, message}>}
 */
export async function createLocation(locationData, adminId) {
  try {
    const { name, capacity, address, campus, description = '' } = locationData;

    // Validate required fields
    if (!name || !capacity || !address || !campus) {
      throw new Error('Missing required location fields');
    }

    // Validate capacity is positive
    if (capacity <= 0) {
      throw new Error('Capacity must be greater than 0');
    }

    // Check if location name already exists
    const existingLocation = await checkLocationNameExists(name);
    if (existingLocation) {
      throw new Error('A location with this name already exists');
    }

    const locationRef = doc(collection(db, COLLECTIONS.LOCATIONS));
    const locationId = locationRef.id;

    await setDoc(locationRef, {
      name,
      capacity,
      address,
      campus,
      description,
      isActive: true,
      createdBy: adminId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      locationId,
      status: 'success',
      message: 'Location created successfully',
    };
  } catch (error) {
    console.error('Error creating location:', error);
    throw new Error(error.message || 'Failed to create location');
  }
}

/**
 * Get all locations
 * @param {Object} filters - Optional filters
 * @param {string} filters.campus - Filter by campus
 * @param {boolean} filters.activeOnly - Only fetch active locations
 * @returns {Promise<Array>} - Array of locations
 */
export async function getLocations(filters = {}) {
  try {
    const { campus, activeOnly = true } = filters;

    let q = query(collection(db, COLLECTIONS.LOCATIONS));
    const constraints = [];

    if (activeOnly) {
      constraints.push(where('isActive', '==', true));
    }

    if (campus) {
      constraints.push(where('campus', '==', campus));
    }

    if (constraints.length > 0) {
      q = query(collection(db, COLLECTIONS.LOCATIONS), ...constraints);
    }

    const snapshot = await getDocs(q);
    const locations = [];

    snapshot.forEach((docSnap) => {
      locations.push({
        locationId: docSnap.id,
        ...docSnap.data(),
      });
    });

    return locations;
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw new Error('Failed to fetch locations');
  }
}

/**
 * Get a single location by ID
 * @param {string} locationId - Location ID
 * @returns {Promise<Object>} - Location data
 */
export async function getLocationById(locationId) {
  try {
    const locationDoc = await getDoc(doc(db, COLLECTIONS.LOCATIONS, locationId));
    if (!locationDoc.exists()) {
      throw new Error('Location not found');
    }

    return {
      locationId: locationDoc.id,
      ...locationDoc.data(),
    };
  } catch (error) {
    console.error('Error fetching location:', error);
    throw new Error(error.message || 'Failed to fetch location');
  }
}

/**
 * Update location information
 * @param {string} locationId - Location ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<{status, message}>}
 */
export async function updateLocation(locationId, updateData) {
  try {
    const locationRef = doc(db, COLLECTIONS.LOCATIONS, locationId);
    const locationDoc = await getDoc(locationRef);

    if (!locationDoc.exists()) {
      throw new Error('Location not found');
    }

    // Validate capacity if being updated
    if (updateData.capacity && updateData.capacity <= 0) {
      throw new Error('Capacity must be greater than 0');
    }

    await updateDoc(locationRef, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Location updated successfully',
    };
  } catch (error) {
    console.error('Error updating location:', error);
    throw new Error(error.message || 'Failed to update location');
  }
}

/**
 * Check availability of a location for a given date/time
 * @param {string} locationId - Location ID
 * @param {string} date - Event date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {Promise<boolean>} - True if available, false if conflicts exist
 */
export async function getLocationAvailability(
  locationId,
  date,
  startTime,
  endTime
) {
  try {
    const eventsRef = collection(db, COLLECTIONS.EVENTS);
    const q = query(
      eventsRef,
      where('location', '==', locationId),
      where('date', '==', date),
      where('status', '!=', EVENT_STATUS.CANCELLED)
    );

    const snapshot = await getDocs(q);
    let isAvailable = true;

    snapshot.forEach((docSnap) => {
      const eventData = docSnap.data();
      const existingStart = eventData.time;
      const existingEnd = eventData.endTime;

      // Check for time overlap
      if (
        (startTime < existingEnd && endTime > existingStart) ||
        (existingStart < endTime && existingEnd > startTime)
      ) {
        isAvailable = false;
      }
    });

    return isAvailable;
  } catch (error) {
    console.error('Error checking location availability:', error);
    throw new Error('Failed to check location availability');
  }
}

/**
 * Delete/Archive a location (Admin only)
 * @param {string} locationId - Location ID
 * @returns {Promise<{status, message}>}
 */
export async function deleteLocation(locationId) {
  try {
    const locationRef = doc(db, COLLECTIONS.LOCATIONS, locationId);
    
    // Check if location has active events
    const eventsRef = collection(db, COLLECTIONS.EVENTS);
    const q = query(
      eventsRef,
      where('location', '==', locationId),
      where('status', '!=', EVENT_STATUS.CANCELLED)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error(
        'Cannot delete location with active events. Cancel events first.'
      );
    }

    // Soft delete by marking inactive
    await updateDoc(locationRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Location archived successfully',
    };
  } catch (error) {
    console.error('Error deleting location:', error);
    throw new Error(error.message || 'Failed to delete location');
  }
}

/**
 * Check if location name already exists
 * @param {string} locName - Location name to check
 * @returns {Promise<boolean>}
 */
async function checkLocationNameExists(locName) {
  try {
    const locationsRef = collection(db, COLLECTIONS.LOCATIONS);
    const q = query(locationsRef, where('name', '==', locName));

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking location name:', error);
    return false;
  }
}

/**
 * Get events at a location on a specific date
 * @param {string} locationId - Location ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of events
 */
export async function getLocationEventsOnDate(locationId, date) {
  try {
    const eventsRef = collection(db, COLLECTIONS.EVENTS);
    const q = query(
      eventsRef,
      where('location', '==', locationId),
      where('date', '==', date),
      where('status', '!=', EVENT_STATUS.CANCELLED)
    );

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
    console.error('Error fetching location events:', error);
    throw new Error('Failed to fetch location events');
  }
}
