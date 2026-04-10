// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// Values loaded from environment variables in .env
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app); // Initialize analytics
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * FIRESTORE COLLECTION SCHEMAS
 * 
 * users/ - User profiles
 *   uid (doc id)
 *   - name: string
 *   - email: string
 *   - regNo: string (for students)
 *   - role: 'student' | 'club' | 'admin'
 *   - createdAt: timestamp
 * 
 * clubs/ - Club information
 *   clubId (doc id)
 *   - name: string
 *   - faculty: string (faculty in-charge)
 *   - president: string
 *   - description: string
 *   - logo: string (storage url)
 *   - createdAt: timestamp
 * 
 * events/ - Event listings
 *   eventId (doc id)
 *   - name: string
 *   - type: 'solo' | 'team'
 *   - location: string (must match locations collection)
 *   - date: timestamp
 *   - time: string (HH:MM format)
 *   - description: string
 *   - image: string (storage url)
 *   - clubId: reference to clubs/
 *   - status: 'pending' | 'approved' | 'rejected' | 'cancelled'
 *   - maxParticipants: number (optional)
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 * 
 * registrations/ - Event registrations
 *   registrationId (doc id)
 *   - userId: reference to users/
 *   - eventId: reference to events/
 *   - registeredAt: timestamp
 * 
 * locations/ - Venue/Location management
 *   locationId (doc id)
 *   - name: string
 *   - capacity: number
 *   - description: string
 *   - createdAt: timestamp
 * 
 * eventApprovals/ - Approval requests for events/cancellations
 *   approvalId (doc id)
 *   - eventId: reference to events/
 *   - clubId: reference to clubs/
 *   - type: 'creation' | 'cancellation'
 *   - status: 'pending' | 'approved' | 'rejected'
 *   - requestedAt: timestamp
 *   - reviewedAt: timestamp (when admin acted)
 *   - reason: string (rejection reason if applicable)
 */

export default app;