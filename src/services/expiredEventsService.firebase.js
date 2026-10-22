import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../utils/constants';

/**
 * Delete expired events from Firestore
 * 
 * Purpose: Check for and delete events that have passed their end time
 * This can be called periodically from the app or when needed
 * 
 * @returns {Promise<{deletedCount: number, errors: Array}>} - Count of deleted events and any errors
 */
export async function deleteExpiredEvents() {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Checking for expired events before ${today}`);
    
    // Query for all events with date before today
    const eventsRef = collection(db, COLLECTIONS.EVENTS);
    const q = query(eventsRef, where('date', '<', today));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No expired events found');
      return { deletedCount: 0, errors: [] };
    }
    
    console.log(`Found ${snapshot.size} expired events to delete`);
    
    const errors = [];
    let deletedCount = 0;
    
    // Delete each expired event and its registrations
    for (const eventDoc of snapshot.docs) {
      try {
        const eventId = eventDoc.id;
        
        // Delete all registrations for this event
        const registrationsRef = collection(db, COLLECTIONS.EVENTS, eventId, 'registrations');
        const registrationsSnapshot = await getDocs(registrationsRef);
        
        for (const regDoc of registrationsSnapshot.docs) {
          await deleteDoc(regDoc.ref);
        }
        
        console.log(`Deleted ${registrationsSnapshot.size} registrations for event ${eventId}`);
        
        // Delete the event document
        await deleteDoc(eventDoc.ref);
        console.log(`Deleted expired event: ${eventId}`);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting event ${eventDoc.id}:`, error);
        errors.push({
          eventId: eventDoc.id,
          error: error.message,
        });
      }
    }
    
    console.log(`Completed: Deleted ${deletedCount} expired events`);
    return { deletedCount, errors };
  } catch (error) {
    console.error('Error in deleteExpiredEvents:', error);
    throw error;
  }
}

/**
 * Check if an event has expired
 * 
 * @param {string} eventDate - Event date in YYYY-MM-DD format
 * @returns {boolean} - True if event date is in the past
 */
export function isEventExpired(eventDate) {
  const today = new Date().toISOString().split('T')[0];
  return eventDate < today;
}
