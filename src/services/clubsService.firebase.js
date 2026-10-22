import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  Timestamp,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../utils/constants';

/**
 * Create a new club (Admin only)
 * @param {Object} clubData - Club information
 * @param {string} clubData.name - Club name
 * @param {string} clubData.faculty - Faculty in-charge name
 * @param {string} clubData.facultyEmail - Faculty email
 * @param {string} clubData.president - President name
 * @param {string} clubData.presidentId - President user ID
 * @param {string} clubData.description - Club description
 * @param {string} clubData.logo - Logo URL
 * @param {string} adminId - Admin user ID creating the club
 * @returns {Promise<{clubId, status, message}>}
 */
export async function createClub(clubData, adminId) {
  try {
    const {
      name,
      faculty,
      facultyEmail,
      president,
      presidentId,
      description,
      logo,
    } = clubData;

    // Validate required fields
    if (!name || !faculty || !facultyEmail || !presidentId) {
      throw new Error('Missing required club fields');
    }

    // Check if club name already exists
    const existingClub = await checkClubNameExists(name);
    if (existingClub) {
      throw new Error('A club with this name already exists');
    }

    const clubRef = doc(collection(db, COLLECTIONS.CLUBS));
    const clubId = clubRef.id;

    await setDoc(clubRef, {
      name,
      faculty,
      facultyEmail,
      president,
      presidentId,
      description,
      logo: logo || '',
      members: [presidentId],
      status: 'active',
      createdBy: adminId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      clubId,
      status: 'success',
      message: 'Club created successfully',
    };
  } catch (error) {
    console.error('Error creating club:', error);
    throw new Error(error.message || 'Failed to create club');
  }
}

/**
 * Get all clubs
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status (active/inactive)
 * @returns {Promise<Array>} - Array of clubs
 */
export async function getClubs(filters = {}) {
  try {
    const { status } = filters;

    let q = query(collection(db, COLLECTIONS.CLUBS));

    if (status) {
      q = query(collection(db, COLLECTIONS.CLUBS), where('status', '==', status));
    }

    const snapshot = await getDocs(q);
    const clubs = [];

    snapshot.forEach((docSnap) => {
      clubs.push({
        clubId: docSnap.id,
        ...docSnap.data(),
      });
    });

    return clubs;
  } catch (error) {
    console.error('Error fetching clubs:', error);
    throw new Error('Failed to fetch clubs');
  }
}

/**
 * Get a single club by ID
 * @param {string} clubId - Club ID
 * @returns {Promise<Object>} - Club data
 */
export async function getClubById(clubId) {
  try {
    const clubDoc = await getDoc(doc(db, COLLECTIONS.CLUBS, clubId));
    if (!clubDoc.exists()) {
      throw new Error('Club not found');
    }

    return {
      clubId: clubDoc.id,
      ...clubDoc.data(),
    };
  } catch (error) {
    console.error('Error fetching club:', error);
    throw new Error(error.message || 'Failed to fetch club');
  }
}

/**
 * Update club information
 * @param {string} clubId - Club ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<{status, message}>}
 */
export async function updateClub(clubId, updateData) {
  try {
    const clubRef = doc(db, COLLECTIONS.CLUBS, clubId);
    const clubDoc = await getDoc(clubRef);

    if (!clubDoc.exists()) {
      throw new Error('Club not found');
    }

    await updateDoc(clubRef, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Club updated successfully',
    };
  } catch (error) {
    console.error('Error updating club:', error);
    throw new Error(error.message || 'Failed to update club');
  }
}

/**
 * Add a member to a club
 * @param {string} clubId - Club ID
 * @param {string} userId - User ID to add
 * @returns {Promise<{status, message}>}
 */
export async function addMember(clubId, userId) {
  try {
    const clubRef = doc(db, COLLECTIONS.CLUBS, clubId);
    const clubDoc = await getDoc(clubRef);

    if (!clubDoc.exists()) {
      throw new Error('Club not found');
    }

    const members = clubDoc.data().members || [];
    if (members.includes(userId)) {
      throw new Error('User is already a member of this club');
    }

    await updateDoc(clubRef, {
      members: arrayUnion(userId),
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Member added to club',
    };
  } catch (error) {
    console.error('Error adding member:', error);
    throw new Error(error.message || 'Failed to add member');
  }
}

/**
 * Remove a member from a club
 * @param {string} clubId - Club ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<{status, message}>}
 */
export async function removeMember(clubId, userId) {
  try {
    const clubRef = doc(db, COLLECTIONS.CLUBS, clubId);
    const clubDoc = await getDoc(clubRef);

    if (!clubDoc.exists()) {
      throw new Error('Club not found');
    }

    await updateDoc(clubRef, {
      members: arrayRemove(userId),
      updatedAt: Timestamp.now(),
    });

    return {
      status: 'success',
      message: 'Member removed from club',
    };
  } catch (error) {
    console.error('Error removing member:', error);
    throw new Error(error.message || 'Failed to remove member');
  }
}

/**
 * Get all members of a club
 * @param {string} clubId - Club ID
 * @returns {Promise<Array>} - Array of member user IDs
 */
export async function getClubMembers(clubId) {
  try {
    const club = await getClubById(clubId);
    return club.members || [];
  } catch (error) {
    console.error('Error fetching club members:', error);
    throw new Error('Failed to fetch club members');
  }
}

/**
 * Get all events created by a club
 * @param {string} clubId - Club ID
 * @returns {Promise<Array>} - Array of events
 */
export async function getClubEvents(clubId) {
  try {
    const eventsRef = collection(db, COLLECTIONS.EVENTS);
    const q = query(eventsRef, where('clubId', '==', clubId));

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
    console.error('Error fetching club events:', error);
    throw new Error('Failed to fetch club events');
  }
}

/**
 * Check if club name already exists
 * @param {string} clubName - Club name to check
 * @returns {Promise<boolean>}
 */
async function checkClubNameExists(clubName) {
  try {
    const clubsRef = collection(db, COLLECTIONS.CLUBS);
    const q = query(clubsRef, where('name', '==', clubName));

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking club name:', error);
    return false;
  }
}

/**
 * Deactivate/Archive a club
 * @param {string} clubId - Club ID
 * @returns {Promise<{status, message}>}
 */
export async function deactivateClub(clubId) {
  try {
    return await updateClub(clubId, { status: 'inactive' });
  } catch (error) {
    console.error('Error deactivating club:', error);
    throw new Error('Failed to deactivate club');
  }
}

/**
 * Activate a club
 * @param {string} clubId - Club ID
 * @returns {Promise<{status, message}>}
 */
export async function activateClub(clubId) {
  try {
    return await updateClub(clubId, { status: 'active' });
  } catch (error) {
    console.error('Error activating club:', error);
    throw new Error('Failed to activate club');
  }
}
