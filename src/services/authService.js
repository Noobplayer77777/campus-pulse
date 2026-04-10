import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { ROLES, COLLECTIONS } from '../utils/constants';

/**
 * Convert Firebase error code to user-friendly message
 */
function getFirebaseErrorMessage(errorCode) {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/wrong-password': 'Incorrect password',
    'auth/user-not-found': 'No account found with this email',
    'auth/invalid-email': 'Invalid email address',
    'auth/too-many-requests': 'Too many failed attempts, try again later',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/operation-not-allowed': 'Registration is currently disabled',
    'permission-denied': 'You do not have permission to perform this action',
    'not-found': 'User profile not found in database',
  };
  
  return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

/**
 * Register a new student user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User full name
 * @param {string} regNo - Registration number
 * @param {string} role - User role (student, club, admin)
 * @returns {Promise<{uid, email, role}>}
 */
export async function registerUser(email, password, name, regNo, role = ROLES.STUDENT) {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail } = userCredential.user;

    // Update user profile
    await updateProfile(userCredential.user, { displayName: name });

    // Create Firestore user document with required fields for security rules
    const userDocData = {
      displayName: name, // Required by Firestore rules
      email: userEmail,
      role,
      name, // Keep name for compatibility
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add registration number if student
    if (role === ROLES.STUDENT && regNo) {
      userDocData.regNo = regNo;
    }

    await setDoc(doc(db, COLLECTIONS.USERS, uid), userDocData);

    return {
      uid,
      email: userEmail,
      name,
      role,
    };
  } catch (error) {
    console.error('Registration error:', error);
    const errorCode = error.code || error.message;
    const errorMsg = getFirebaseErrorMessage(errorCode);
    throw new Error(errorMsg);
  }
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{uid, email, role}>}
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail } = userCredential.user;

    // Fetch user role from Firestore
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const { role, name } = userDoc.data();

    return {
      uid,
      email: userEmail,
      name,
      role,
    };
  } catch (error) {
    console.error('Login error:', error);
    const errorCode = error.code || error.message;
    const errorMsg = getFirebaseErrorMessage(errorCode);
    throw new Error(errorMsg);
  }
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Get current user data
 * @returns {Promise<{uid, email, role} | null>}
 */
export async function getCurrentUser() {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
    if (!userDoc.exists()) return null;

    const { role, name } = userDoc.data();

    return {
      uid: user.uid,
      email: user.email,
      name,
      role,
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

/**
 * Verify if email exists
 * @param {string} email - User email to check
 * @returns {Promise<boolean>}
 * NOTE: This would require a callable Firebase function in production
 */
export async function emailExists(email) {
  // Placeholder - requires backend Firebase Cloud Function in production
  return false;
}

/**
 * Update user's display name
 * @param {string} newName - New display name
 * @returns {Promise<{uid, email, name, role}>}
 */
export async function updateDisplayName(newName) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    // Update Firebase Auth profile
    await updateProfile(user, { displayName: newName });

    // Update Firestore user document
    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      name: newName,
      updatedAt: new Date(),
    }, { merge: true });

    // Fetch updated user data
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
    const { role } = userDoc.data();

    return {
      uid: user.uid,
      email: user.email,
      name: newName,
      role,
    };
  } catch (error) {
    console.error('Update display name error:', error);
    const errorCode = error.code || error.message;
    const errorMsg = getFirebaseErrorMessage(errorCode);
    throw new Error(errorMsg);
  }
}

/**
 * Update user's password (requires current password for re-authentication)
 * @param {string} currentPassword - User's current password
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean}>}
 */
export async function updateUserPassword(currentPassword, newPassword) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    if (!user.email) {
      throw new Error('User email not found');
    }

    // Re-authenticate user before password change
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error) {
    console.error('Update password error:', error);
    
    // Handle specific Firebase error codes
    if (error.code === 'auth/wrong-password') {
      throw new Error('Current password is incorrect');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('New password must be at least 6 characters');
    }
    
    const errorCode = error.code || error.message;
    const errorMsg = getFirebaseErrorMessage(errorCode);
    throw new Error(errorMsg);
  }
}
