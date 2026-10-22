/**
 * Local Development & Mock Authentication Service
 * Used as a fallback when Amazon Cognito is not configured, enabling
 * offline development, testing, and UI validation without AWS credentials.
 *
 * SECURITY GUARD:
 * This service is strictly restricted to development and test environments.
 * It is completely disabled in production builds (NODE_ENV === 'production').
 */

const STORAGE_KEY = 'campus_pulse_mock_auth_user';

/**
 * Asserts that mock authentication is permitted in the current runtime environment.
 * Throws a fatal error if invoked within a production build.
 */
export const assertMockAllowed = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Security Violation: Mock authentication is strictly disabled in production builds.');
  }
};

// Pre-configured mock persona accounts for rapid local development
export const MOCK_ACCOUNTS = {
  student: {
    uid: 'mock-student-1',
    userId: 'mock-student-1',
    email: 'student@college.edu',
    name: 'Dev Student',
    displayName: 'Dev Student',
    role: 'student',
    regNo: '24BCS1001',
  },
  club: {
    uid: 'mock-club-president-1',
    userId: 'mock-club-president-1',
    email: 'robotics@college.edu',
    name: 'Robotics Club Lead',
    displayName: 'Robotics Club Lead',
    role: 'club',
    regNo: '23BCS2045',
  },
  admin: {
    uid: 'mock-admin-1',
    userId: 'mock-admin-1',
    email: 'admin@college.edu',
    name: 'Campus Administrator',
    displayName: 'Campus Administrator',
    role: 'admin',
    regNo: 'ADMIN001',
  },
};

const getStoredUser = () => {
  assertMockAllowed();
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const storeUser = (user) => {
  assertMockAllowed();
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
};

export async function signUp(email, password, name, regNo = '') {
  assertMockAllowed();

  // Public signups always default to student role
  const newUser = {
    uid: `user-${Date.now().toString(36)}`,
    userId: `user-${Date.now().toString(36)}`,
    email,
    name: name || email.split('@')[0],
    displayName: name || email.split('@')[0],
    role: 'student',
    regNo,
  };
  storeUser(newUser);
  return {
    user: newUser,
    message: 'Mock signup successful (Development Mode)',
  };
}

export async function signIn(email, password) {
  assertMockAllowed();

  // Check known mock accounts first for quick dev role selection
  const lowerEmail = email.toLowerCase();
  let matchedUser = null;

  if (lowerEmail.includes('admin')) {
    matchedUser = { ...MOCK_ACCOUNTS.admin, email };
  } else if (lowerEmail.includes('club')) {
    matchedUser = { ...MOCK_ACCOUNTS.club, email };
  } else {
    // Default or student sign in
    const existing = getStoredUser();
    if (existing && existing.email.toLowerCase() === lowerEmail) {
      matchedUser = existing;
    } else {
      matchedUser = {
        uid: `student-${Date.now().toString(36)}`,
        userId: `student-${Date.now().toString(36)}`,
        email,
        name: email.split('@')[0],
        displayName: email.split('@')[0],
        role: 'student',
        regNo: 'DEV2026',
      };
    }
  }

  storeUser(matchedUser);
  return matchedUser;
}

export async function signOut() {
  assertMockAllowed();
  storeUser(null);
}

export async function getCurrentUser() {
  if (process.env.NODE_ENV === 'production') return null;
  return getStoredUser();
}

export async function getIdToken() {
  assertMockAllowed();
  const user = getStoredUser();
  if (!user) return null;
  return `mock-token-${user.role}-${user.userId}`;
}

export function getMockHeaders() {
  if (process.env.NODE_ENV === 'production') return null;
  const user = getStoredUser();
  if (!user) return null;
  return {
    'x-mock-user-id': user.userId,
    'x-mock-user-role': user.role,
    'x-mock-user-email': user.email,
    'x-mock-user-name': user.name,
  };
}

export async function updateDisplayName(newName) {
  assertMockAllowed();
  const user = getStoredUser();
  if (!user) throw new Error('No user logged in');
  const updated = { ...user, name: newName, displayName: newName };
  storeUser(updated);
  return updated;
}

export async function updateUserPassword(currentPassword, newPassword) {
  assertMockAllowed();
  const user = getStoredUser();
  if (!user) throw new Error('No user logged in');
  return { success: true };
}

export function setMockPersona(roleKey) {
  assertMockAllowed();
  const persona = MOCK_ACCOUNTS[roleKey];
  if (persona) {
    storeUser(persona);
    return persona;
  }
  return null;
}
