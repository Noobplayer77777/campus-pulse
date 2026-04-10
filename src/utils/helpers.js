/**
 * Validation helpers
 */

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function validateRegNo(regNo) {
  // Basic validation - adjust based on actual registration number format
  return regNo.trim().length > 0;
}

export function validateEventName(name) {
  return name.trim().length > 0 && name.length <= 100;
}

export function validateDescription(description) {
  return description.trim().length > 0 && description.length <= 1000;
}

/**
 * Date/time helpers
 */

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(timeString) {
  // Expected format: HH:MM
  return timeString;
}

/**
 * Error message helpers
 */

export function getFirebaseErrorMessage(errorCode) {
  const errorMessages = {
    'auth/email-already-in-use': 'Email already in use',
    'auth/weak-password': 'Password is too weak',
    'auth/wrong-password': 'Incorrect password',
    'auth/user-not-found': 'User not found',
    'auth/invalid-email': 'Invalid email address',
    'auth/too-many-requests': 'Too many failed attempts, try again later',
  };
  
  return errorMessages[errorCode] || 'An error occurred';
}

/**
 * Type conversion helpers
 */

export function stringToBoolean(str) {
  return str === 'true' || str === true;
}

export function getDisplayRole(role) {
  const roleDisplay = {
    student: 'Student',
    club: 'Club',
    admin: 'Admin',
  };
  return roleDisplay[role] || role;
}
