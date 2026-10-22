/**
 * Unified Authentication Service Facade for Campus Pulse
 * Delegates to Amazon Cognito, Mock Dev Auth, or Legacy Firebase based on configuration.
 *
 * Supported Providers via REACT_APP_AUTH_PROVIDER:
 * - 'cognito': Amazon Cognito User Pool authentication (production standard)
 * - 'mock': Local mock development authentication (strictly dev/test only)
 * - 'firebase': Legacy Firebase Authentication (for immediate rollback)
 *
 * Security:
 * - Production builds will NEVER silently fall back to mock authentication.
 * - Missing or invalid Cognito configuration in production triggers a fatal error.
 */

import * as cognitoAuth from './cognitoAuthService';
import * as mockAuth from './mockAuthService';
import * as firebaseAuth from './authService.firebase';
import { setAuthTokenProvider, setMockHeadersProvider } from './apiClient';

/**
 * Determine the active auth provider name with strict production safeguards.
 */
export const getActiveProviderName = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const envProvider = (process.env.REACT_APP_AUTH_PROVIDER || '').toLowerCase();

  if (envProvider === 'firebase') {
    return 'firebase';
  }

  if (envProvider === 'mock') {
    if (isProduction) {
      throw new Error('Security Error: REACT_APP_AUTH_PROVIDER=mock cannot be used in a production build.');
    }
    return 'mock';
  }

  if (envProvider === 'cognito') {
    if (!cognitoAuth.isCognitoConfigured() && isProduction) {
      throw new Error(
        'Configuration Error: Amazon Cognito is selected but missing required configuration in production (REACT_APP_COGNITO_USER_POOL_ID or REACT_APP_COGNITO_APP_CLIENT_ID).'
      );
    }
    return 'cognito';
  }

  // If no explicit provider is set:
  if (cognitoAuth.isCognitoConfigured()) {
    return 'cognito';
  }

  // In production, NEVER silently fall back to mock authentication: fail closed!
  if (isProduction) {
    throw new Error(
      'Security Error: No valid authentication provider configured. Please configure Amazon Cognito or Firebase in your production environment.'
    );
  }

  // In local development or test environment, fallback to mock mode
  return 'mock';
};

/**
 * Validate that authentication provider and data provider are properly aligned.
 */
export const validateProviderAlignment = () => {
  const authProvider = getActiveProviderName();
  const dataProvider = (process.env.REACT_APP_DATA_PROVIDER || 'aws').toLowerCase();

  if (authProvider === 'firebase' && dataProvider === 'aws') {
    console.warn(
      'Security Warning: Provider mismatch. REACT_APP_AUTH_PROVIDER is "firebase" but REACT_APP_DATA_PROVIDER is "aws". AWS API Gateway authorizers require Amazon Cognito JWT tokens.'
    );
  } else if (authProvider === 'cognito' && dataProvider === 'firebase') {
    console.warn(
      'Security Warning: Provider mismatch. REACT_APP_AUTH_PROVIDER is "cognito" but REACT_APP_DATA_PROVIDER is "firebase". Firestore security rules require Firebase Auth tokens.'
    );
  }
};
validateProviderAlignment();

const getProvider = () => {
  const name = getActiveProviderName();
  switch (name) {
    case 'firebase':
      return firebaseAuth;
    case 'cognito':
      return cognitoAuth;
    case 'mock':
    default:
      return mockAuth;
  }
};

// Wire up API Client token and header providers
setAuthTokenProvider(async () => {
  const provider = getProvider();
  if (provider.getIdToken) {
    return await provider.getIdToken();
  }
  return null;
});

setMockHeadersProvider(() => {
  // Never provide mock headers in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  if (getActiveProviderName() === 'mock') {
    return mockAuth.getMockHeaders();
  }
  return null;
});

// Auth state listeners collection
const authListeners = new Set();
export const notifyAuthChange = (user) => {
  authListeners.forEach((fn) => {
    try {
      fn(user);
    } catch (e) {
      console.error('Error in auth state listener', e);
    }
  });
};

/**
 * Register auth state listener
 */
export const onAuthStateChanged = (callback) => {
  authListeners.add(callback);
  // Emit current state immediately
  getCurrentUser().then(callback).catch(() => callback(null));

  return () => {
    authListeners.delete(callback);
  };
};

/**
 * Register a new user
 * Strictly enforces 'student' role. Public registrations cannot assign club or admin roles.
 */
export async function registerUser(email, password, name, regNo = '', role = 'student') {
  const provider = getProvider();
  // Role is always forced to student for security
  const result = await provider.signUp(email, password, name, regNo);
  const user = result.user || result;
  notifyAuthChange(user);
  return user;
}

/**
 * Login user
 */
export async function loginUser(email, password) {
  const provider = getProvider();
  let user;
  if (provider === firebaseAuth) {
    user = await provider.loginUser(email, password);
  } else {
    user = await provider.signIn(email, password);
  }
  notifyAuthChange(user);
  return user;
}

/**
 * Logout current user
 */
export async function logoutUser() {
  const provider = getProvider();
  if (provider === firebaseAuth) {
    await provider.logoutUser();
  } else {
    await provider.signOut();
  }
  notifyAuthChange(null);
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  try {
    const provider = getProvider();
    return await provider.getCurrentUser();
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Auth provider error:', err.message);
    }
    return null;
  }
}

/**
 * Retrieve current JWT ID token
 */
export async function getIdToken() {
  const provider = getProvider();
  if (provider.getIdToken) {
    return await provider.getIdToken();
  }
  return null;
}

/**
 * Update user display name
 */
export async function updateDisplayName(newName) {
  const provider = getProvider();
  const updated = await provider.updateDisplayName(newName);
  notifyAuthChange(updated);
  return updated;
}

/**
 * Update user password
 */
export async function updateUserPassword(currentPassword, newPassword) {
  const provider = getProvider();
  return await provider.updateUserPassword(currentPassword, newPassword);
}

/**
 * Check if email exists (placeholder)
 */
export async function emailExists(email) {
  const provider = getProvider();
  if (provider.emailExists) {
    return await provider.emailExists(email);
  }
  return false;
}
