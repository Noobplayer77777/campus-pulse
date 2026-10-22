/**
 * Legacy Firebase Authentication Service
 * Preserved intact for rollback capabilities and legacy mode.
 */

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
 */
export async function registerUser(email, password, name, regNo, role = ROLES.STUDENT) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail } = userCredential.user;

    await updateProfile(userCredential.user, { displayName: name });

    const userDocData = {
      displayName: name,
      email: userEmail,
      role,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

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
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail } = userCredential.user;

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
 */
export async function emailExists(email) {
  return false;
}

/**
 * Update user's display name
 */
export async function updateDisplayName(newName) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    await updateProfile(user, { displayName: newName });

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      name: newName,
      updatedAt: new Date(),
    }, { merge: true });

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
 * Update user's password
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

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error) {
    console.error('Update password error:', error);
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
