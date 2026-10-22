/**
 * Expired Events Service - AWS API Gateway / Lambda Adapter
 * Triggers backend cleanup of past events via POST /api/admin/cleanup-expired.
 * Preserves legacy Firebase implementation via REACT_APP_DATA_PROVIDER=firebase.
 */

import apiClient from './apiClient';
import * as firebaseCleanup from './expiredEventsService.firebase';

const isFirebaseMode = () => (process.env.REACT_APP_DATA_PROVIDER || '').toLowerCase() === 'firebase';

/**
 * Trigger deletion of expired events and their registrations (Admin only)
 * @returns {Promise<{ deletedCount: number, errors: Array }>}
 */
export async function deleteExpiredEvents() {
  if (isFirebaseMode()) {
    return firebaseCleanup.deleteExpiredEvents();
  }

  try {
    const res = await apiClient.post('/api/admin/cleanup-expired', {});
    return {
      deletedCount: Number(res.deletedCount) || 0,
      errors: res.errors || [],
      eventIds: res.eventIds || [],
    };
  } catch (error) {
    console.error('Error triggering expired events cleanup:', error);
    throw new Error(error.message || 'Failed to cleanup expired events');
  }
}

/**
 * Check if a date string is in the past
 * @param {string} eventDate - Date in YYYY-MM-DD format
 * @returns {boolean}
 */
export function isEventExpired(eventDate) {
  if (!eventDate) return false;
  try {
    const eventTime = new Date(eventDate).setHours(0, 0, 0, 0);
    const todayTime = new Date().setHours(0, 0, 0, 0);
    return eventTime < todayTime;
  } catch {
    return false;
  }
}
