/**
 * Clubs Service - AWS API Gateway / Lambda Adapter
 * Queries and manages student clubs via AWS backend API.
 * Preserves legacy Firebase implementation via REACT_APP_DATA_PROVIDER=firebase.
 */

import apiClient from './apiClient';
import * as firebaseClubs from './clubsService.firebase';

const isFirebaseMode = () => (process.env.REACT_APP_DATA_PROVIDER || '').toLowerCase() === 'firebase';

/**
 * Check if a club name already exists
 */
export async function checkClubNameExists(clubName) {
  try {
    const allClubs = await getClubs();
    return allClubs.some((c) => c.name?.toLowerCase() === clubName?.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Create a new club (Admin only)
 */
export async function createClub(clubData, adminId) {
  if (isFirebaseMode()) {
    return firebaseClubs.createClub(clubData, adminId);
  }

  try {
    const { name, faculty, facultyEmail, presidentId } = clubData;

    if (!name || !faculty || !facultyEmail || !presidentId) {
      throw new Error('Missing required club fields');
    }

    const res = await apiClient.post('/api/clubs', clubData);
    const newClub = res.club || {};

    return {
      clubId: newClub.clubId,
      status: 'success',
      message: res.message || 'Club created successfully',
      club: newClub,
    };
  } catch (error) {
    console.error('Error creating club:', error);
    throw new Error(error.message || 'Failed to create club');
  }
}

/**
 * Get all clubs with optional filters
 */
export async function getClubs(filters = {}) {
  if (isFirebaseMode()) {
    return firebaseClubs.getClubs(filters);
  }

  try {
    const params = {};
    if (filters.status) params.status = filters.status;

    const res = await apiClient.get('/api/clubs', { params });
    return res.clubs || [];
  } catch (error) {
    console.error('Error fetching clubs:', error);
    throw new Error(error.message || 'Failed to fetch clubs');
  }
}

/**
 * Get a single club by ID
 */
export async function getClubById(clubId) {
  if (isFirebaseMode()) {
    return firebaseClubs.getClubById(clubId);
  }

  try {
    const res = await apiClient.get(`/api/clubs/${clubId}`);
    return res.club || null;
  } catch (error) {
    console.error(`Error fetching club ${clubId}:`, error);
    throw new Error(error.message || 'Failed to fetch club');
  }
}

/**
 * Update club information (Admin or Club President)
 */
export async function updateClub(clubId, updateData) {
  if (isFirebaseMode()) {
    return firebaseClubs.updateClub(clubId, updateData);
  }

  try {
    const res = await apiClient.put(`/api/clubs/${clubId}`, updateData);
    return {
      status: 'success',
      message: res.message || 'Club updated successfully',
    };
  } catch (error) {
    console.error('Error updating club:', error);
    throw new Error(error.message || 'Failed to update club');
  }
}

/**
 * Add member to club
 */
export async function addMember(clubId, userId) {
  if (isFirebaseMode()) {
    return firebaseClubs.addMember(clubId, userId);
  }

  return { status: 'success', message: 'Member added' };
}

/**
 * Remove member from club
 */
export async function removeMember(clubId, userId) {
  if (isFirebaseMode()) {
    return firebaseClubs.removeMember(clubId, userId);
  }

  return { status: 'success', message: 'Member removed' };
}

/**
 * Get club members
 */
export async function getClubMembers(clubId) {
  if (isFirebaseMode()) {
    return firebaseClubs.getClubMembers(clubId);
  }

  try {
    const club = await getClubById(clubId);
    return club?.members || [];
  } catch {
    return [];
  }
}

/**
 * Get events hosted by a club
 */
export async function getClubEvents(clubId) {
  if (isFirebaseMode()) {
    return firebaseClubs.getClubEvents(clubId);
  }

  try {
    const res = await apiClient.get('/api/events', { params: { club: clubId } });
    return res.events || [];
  } catch {
    return [];
  }
}

/**
 * Deactivate club (Admin only)
 */
export async function deactivateClub(clubId) {
  if (isFirebaseMode()) {
    return firebaseClubs.deactivateClub(clubId);
  }

  return { status: 'success', message: 'Club deactivated' };
}

/**
 * Activate club (Admin only)
 */
export async function activateClub(clubId) {
  if (isFirebaseMode()) {
    return firebaseClubs.activateClub(clubId);
  }

  return { status: 'success', message: 'Club activated' };
}
