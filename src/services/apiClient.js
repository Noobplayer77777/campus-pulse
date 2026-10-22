/**
 * Centralized AWS API Client for Campus Pulse
 * Handles HTTP requests to Amazon API Gateway, Cognito JWT token attachment,
 * error normalization, and non-2xx response handling.
 *
 * Security: Never logs tokens, authorization headers, or sensitive user payload.
 */

import axios from 'axios';

// Resolves base API URL from environment variable
const getBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL.replace(/\/+$/, '');
  }
  // Default for local development with standalone backend server
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  return '';
};

// Internal token provider function, configured dynamically by authService
let tokenProvider = null;
let mockHeadersProvider = null;
let sessionExpiredHandler = null;

export const setAuthTokenProvider = (provider) => {
  tokenProvider = provider;
};

export const setMockHeadersProvider = (provider) => {
  mockHeadersProvider = provider;
};

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

// Create configured Axios instance
const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Flag to guard against infinite 401 notification cascades
let hasNotifiedExpiry = false;

// Request Interceptor: Attach Cognito JWT ID token or mock dev headers
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      if (tokenProvider) {
        const token = await tokenProvider();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // If mock dev mode is active and headers are provided (strictly non-production)
      if (process.env.NODE_ENV !== 'production' && mockHeadersProvider) {
        const mockHeaders = mockHeadersProvider();
        if (mockHeaders) {
          Object.keys(mockHeaders).forEach((key) => {
            if (mockHeaders[key]) {
              config.headers[key] = mockHeaders[key];
            }
          });
        }
      }
    } catch (err) {
      // Do not block request if token provider fails, let backend authorizer respond
    }

    return config;
  },
  (err) => Promise.reject(err)
);

// Response Interceptor: Normalize errors and handle 401/403 securely
axiosInstance.interceptors.response.use(
  (response) => {
    // Reset expiration notification guard on successful authenticated request
    hasNotifiedExpiry = false;
    return response.data;
  },
  (err) => {
    const status = err.response?.status;
    let normalizedMessage = 'An unexpected network error occurred';

    if (err.response?.data) {
      const data = err.response.data;
      if (typeof data === 'string') {
        normalizedMessage = data;
      } else if (data.message) {
        normalizedMessage = data.message;
      } else if (data.error && typeof data.error === 'string') {
        normalizedMessage = data.error;
      }
    } else if (err.message) {
      normalizedMessage = err.message;
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (status === 401) {
      if (!hasNotifiedExpiry) {
        hasNotifiedExpiry = true;
        if (sessionExpiredHandler) {
          sessionExpiredHandler();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('campuspulse:session-expired'));
        }
      }
      const authError = new Error(normalizedMessage || 'Session expired. Please log in again.');
      authError.statusCode = 401;
      return Promise.reject(authError);
    }

    // Handle 403 Forbidden - Insufficient role permissions
    if (status === 403) {
      const forbiddenError = new Error(
        normalizedMessage || 'Access denied. You do not have permission to perform this action.'
      );
      forbiddenError.statusCode = 403;
      return Promise.reject(forbiddenError);
    }

    // Handle 409 Conflict - Duplicate registration or concurrency check
    if (status === 409) {
      const conflictError = new Error(normalizedMessage || 'Action conflict occurred.');
      conflictError.statusCode = 409;
      return Promise.reject(conflictError);
    }

    const errorObj = new Error(normalizedMessage);
    errorObj.statusCode = status || 500;
    errorObj.code = err.response?.data?.code || null;
    return Promise.reject(errorObj);
  }
);

// High-level API methods with standardized path handling
export const apiClient = {
  get: (url, config = {}) => axiosInstance.get(url, config),
  post: (url, data = {}, config = {}) => axiosInstance.post(url, data, config),
  put: (url, data = {}, config = {}) => axiosInstance.put(url, data, config),
  delete: (url, config = {}) => axiosInstance.delete(url, config),
  getBaseUrl,
  rawInstance: axiosInstance,
};

export default apiClient;
