/**
 * Amazon Cognito Authentication Service Adapter
 * Uses amazon-cognito-identity-js for secure client-side authentication.
 *
 * Security:
 * - Credentials and client secrets are never bundled into the client build.
 * - Public signups are strictly defaulted to 'student' role.
 * - Tokens are managed securely in browser session/localStorage via the AWS Cognito SDK.
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

// Configuration from environment variables
const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || '',
  ClientId:
    process.env.REACT_APP_COGNITO_APP_CLIENT_ID ||
    process.env.REACT_APP_COGNITO_CLIENT_ID ||
    '',
};

// Check if Amazon Cognito is configured with real values rather than placeholders
export const isCognitoConfigured = () => {
  const { UserPoolId, ClientId } = poolData;
  if (!UserPoolId || !ClientId) return false;
  if (
    UserPoolId.includes('PLACEHOLDER') ||
    UserPoolId.includes('TODO') ||
    ClientId.includes('PLACEHOLDER') ||
    ClientId.includes('TODO')
  ) {
    return false;
  }
  return true;
};

// Lazy-initialized UserPool instance
let userPoolInstance = null;
const getUserPool = () => {
  if (!userPoolInstance && isCognitoConfigured()) {
    userPoolInstance = new CognitoUserPool(poolData);
  }
  return userPoolInstance;
};

/**
 * Extract verified role from Cognito ID Token payload
 */
export const extractRoleFromPayload = (payload) => {
  if (!payload) return 'student';

  // Only Cognito Groups managed via trusted administrative IAM operations are trusted for elevated privileges
  const groups = payload['cognito:groups'];
  const groupList = Array.isArray(groups) ? groups : typeof groups === 'string' ? [groups] : [];

  if (groupList.includes('admin')) {
    return 'admin';
  }
  if (groupList.includes('club')) {
    return 'club';
  }
  return 'student';
};

/**
 * Normalize Cognito User Profile to match Campus Pulse contract
 */
const buildUserProfile = (cognitoUser, session) => {
  const idToken = session.getIdToken();
  const payload = idToken.decodePayload();

  const userId = payload.sub || cognitoUser.getUsername();
  const email = payload.email || '';
  const name = payload.name || payload['cognito:username'] || email.split('@')[0];
  const role = extractRoleFromPayload(payload);

  return {
    uid: userId, // Preserve uid for legacy component compatibility
    userId,
    email,
    name,
    displayName: name,
    role,
    regNo: payload['custom:regNo'] || '',
  };
};

/**
 * Sign up a new user via Amazon Cognito
 * Enforces 'student' role by default. Public signup can NEVER assign admin or club roles.
 */
export async function signUp(email, password, name, regNo = '') {
  if (!isCognitoConfigured()) {
    throw new Error('Amazon Cognito is not configured. Please configure environment variables.');
  }

  const pool = getUserPool();
  if (!pool) {
    throw new Error('Cognito User Pool initialization failed.');
  }

  const attributeList = [
    new CognitoUserAttribute({ Name: 'email', Value: email }),
    new CognitoUserAttribute({ Name: 'name', Value: name || email.split('@')[0] }),
  ];

  if (regNo) {
    try {
      attributeList.push(new CognitoUserAttribute({ Name: 'custom:regNo', Value: regNo }));
    } catch {
      // Attribute might not be defined in pool schema, omit safely
    }
  }

  // Force 'student' role
  try {
    attributeList.push(new CognitoUserAttribute({ Name: 'custom:role', Value: 'student' }));
  } catch {
    // If custom:role is not in pool schema, backend handles role via Cognito Groups
  }

  return new Promise((resolve, reject) => {
    pool.signUp(email, password, attributeList, null, (err, result) => {
      if (err) {
        return reject(new Error(err.message || 'Cognito signup failed.'));
      }
      resolve({
        user: result.user,
        userConfirmed: result.userConfirmed,
        userSub: result.userSub,
        message: result.userConfirmed
          ? 'Signup successful. You can now log in.'
          : 'Signup successful. Please verify your email with the confirmation code.',
      });
    });
  });
}

/**
 * Sign in existing user via Cognito USER_SRP_AUTH / USER_PASSWORD_AUTH
 */
export async function signIn(email, password) {
  if (!isCognitoConfigured()) {
    throw new Error('Amazon Cognito is not configured.');
  }

  const pool = getUserPool();
  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: pool,
  });

  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const profile = buildUserProfile(cognitoUser, session);
        resolve(profile);
      },
      onFailure: (err) => {
        reject(new Error(err.message || 'Incorrect email or password.'));
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        // Handle forced password change if configured by admin
        reject(new Error('Password change required. Please reset your password.'));
      },
    });
  });
}

/**
 * Sign out current Cognito user and clear local tokens
 */
export async function signOut() {
  if (!isCognitoConfigured()) return;
  const pool = getUserPool();
  if (!pool) return;
  const currentUser = pool.getCurrentUser();
  if (currentUser) {
    currentUser.signOut();
  }
}

/**
 * Get currently authenticated Cognito user profile, refreshing session if expired
 */
export async function getCurrentUser() {
  if (!isCognitoConfigured()) return null;
  const pool = getUserPool();
  if (!pool) return null;

  const currentUser = pool.getCurrentUser();
  if (!currentUser) return null;

  return new Promise((resolve) => {
    currentUser.getSession((err, session) => {
      if (err || !session || !session.isValid()) {
        return resolve(null);
      }
      const profile = buildUserProfile(currentUser, session);
      resolve(profile);
    });
  });
}

/**
 * Get current JWT ID token string for API Gateway Authorization header
 */
export async function getIdToken() {
  if (!isCognitoConfigured()) return null;
  const pool = getUserPool();
  if (!pool) return null;

  const currentUser = pool.getCurrentUser();
  if (!currentUser) return null;

  return new Promise((resolve) => {
    currentUser.getSession((err, session) => {
      if (err || !session || !session.isValid()) {
        return resolve(null);
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

/**
 * Update user's display name attribute in Cognito
 */
export async function updateDisplayName(newName) {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured');
  }

  const pool = getUserPool();
  const currentUser = pool?.getCurrentUser();
  if (!currentUser) {
    throw new Error('No user currently logged in');
  }

  return new Promise((resolve, reject) => {
    currentUser.getSession((sessErr, session) => {
      if (sessErr || !session || !session.isValid()) {
        return reject(new Error('Session expired. Please log in again.'));
      }

      const attributes = [new CognitoUserAttribute({ Name: 'name', Value: newName })];
      currentUser.updateAttributes(attributes, (err) => {
        if (err) {
          return reject(new Error(err.message || 'Failed to update name'));
        }
        const updatedProfile = buildUserProfile(currentUser, session);
        resolve({
          ...updatedProfile,
          name: newName,
          displayName: newName,
        });
      });
    });
  });
}

/**
 * Update user's password in Cognito
 */
export async function updateUserPassword(currentPassword, newPassword) {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured');
  }

  const pool = getUserPool();
  const currentUser = pool?.getCurrentUser();
  if (!currentUser) {
    throw new Error('No user currently logged in');
  }

  return new Promise((resolve, reject) => {
    currentUser.getSession((sessErr, session) => {
      if (sessErr || !session || !session.isValid()) {
        return reject(new Error('Session expired. Please log in again.'));
      }

      currentUser.changePassword(currentPassword, newPassword, (err) => {
        if (err) {
          return reject(new Error(err.message || 'Failed to change password.'));
        }
        resolve({ success: true });
      });
    });
  });
}
