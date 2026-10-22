/**
 * Authentication and Role-Based Authorization (RBAC) Middleware.
 * Never trusts client-supplied body roles or user IDs.
 * Extracts caller credentials exclusively from verified Cognito JWT claims.
 */

const { ROLES } = require('../config/constants');
const { error } = require('../utils/response');

/**
 * Extract caller identity and verified role from API Gateway HTTP API v2 context.
 * In HTTP API with Cognito JWT authorizer, claims are available at:
 * `event.requestContext.authorizer.jwt.claims`
 */
function extractCaller(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;

  // Security guard: Mock headers are strictly prohibited in production.
  // Only permitted during automated test execution or explicitly configured local development.
  const isProd = process.env.NODE_ENV === 'production';
  const isMockAllowed = !isProd && (process.env.NODE_ENV === 'test' || process.env.ALLOW_MOCK_AUTH === 'true');

  if (isMockAllowed && !claims && event?.headers?.['x-mock-user-id']) {
    const mockRole = event.headers['x-mock-user-role'] || ROLES.STUDENT;
    return {
      userId: event.headers['x-mock-user-id'],
      email: event.headers['x-mock-user-email'] || 'test@college.edu',
      role: mockRole,
      displayName: event.headers['x-mock-user-name'] || 'Test User',
      isAuthenticated: true,
      isMock: true,
    };
  }

  if (!claims) {
    return {
      userId: null,
      email: null,
      role: null,
      displayName: null,
      isAuthenticated: false,
    };
  }

  const userId = claims.sub;
  const email = claims.email || '';
  const displayName = claims.name || claims['cognito:username'] || email.split('@')[0];

  // Resolve verified role strictly from Cognito Groups managed through trusted administrative process.
  // Security guard: Never trust client-writable attributes (e.g. custom:role) for elevated authorization.
  let role = ROLES.STUDENT;
  const groups = claims['cognito:groups'];
  const groupList = Array.isArray(groups) ? groups : (typeof groups === 'string' ? [groups] : []);

  if (groupList.includes(ROLES.ADMIN)) {
    role = ROLES.ADMIN;
  } else if (groupList.includes(ROLES.CLUB)) {
    role = ROLES.CLUB;
  } else {
    role = ROLES.STUDENT;
  }

  return {
    userId,
    email,
    displayName,
    role,
    isAuthenticated: true,
  };
}

/**
 * Guard: Requires caller to be authenticated.
 */
function requireAuth(caller) {
  if (!caller || !caller.isAuthenticated || !caller.userId) {
    return error('Authentication required. Please log in.', 401, 'UNAUTHORIZED');
  }
  return null;
}

/**
 * Guard: Requires caller to have at least one of the allowed roles.
 * @param {Object} caller - Caller object from extractCaller
 * @param {Array<string>} allowedRoles - Allowed roles
 */
function requireRole(caller, allowedRoles) {
  const authErr = requireAuth(caller);
  if (authErr) return authErr;

  if (!allowedRoles.includes(caller.role)) {
    return error(
      'Access denied. You do not have permission to perform this action.',
      403,
      'FORBIDDEN'
    );
  }
  return null;
}

/**
 * Guard: Enforce student-only role assignment on public registration.
 * Ensures a user cannot elevate themselves to admin or club during signup.
 */
function enforceStudentOnlyRole(requestedRole) {
  if (requestedRole && requestedRole !== ROLES.STUDENT) {
    // Force student role for public registrations
    return ROLES.STUDENT;
  }
  return ROLES.STUDENT;
}

module.exports = {
  extractCaller,
  requireAuth,
  requireRole,
  enforceStudentOnlyRole,
};
