/**
 * Standardized API Gateway HTTP API v2 response helper.
 * Ensures consistent JSON structure, proper HTTP status codes, and secure CORS headers.
 */

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Build a successful HTTP response.
 * @param {any} body - Data payload
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function success(body, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Build an error HTTP response with safe error messaging.
 * @param {string} message - User-facing safe error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string|null} code - Optional error classification code
 */
function error(message, statusCode = 500, code = null) {
  const payload = {
    error: true,
    message: message || 'An unexpected error occurred. Please try again.',
  };
  if (code) {
    payload.code = code;
  }

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(payload),
  };
}

/**
 * Fast OPTIONS pre-flight handler.
 */
function corsOptions() {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: '',
  };
}

module.exports = {
  success,
  error,
  corsOptions,
  CORS_HEADERS,
};
