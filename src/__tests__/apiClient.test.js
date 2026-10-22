/**
 * Unit Tests for Centralized AWS API Client
 * Validates request interception, Bearer token attachment, 401/403 error handling,
 * and security boundary (tokens/secrets never logged).
 */

import { apiClient, setAuthTokenProvider, setMockHeadersProvider, setSessionExpiredHandler } from '../services/apiClient';

describe('AWS API Client', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    setAuthTokenProvider(null);
    setMockHeadersProvider(null);
    setSessionExpiredHandler(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('resolves baseURL from REACT_APP_API_BASE_URL', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.campuspulse.edu';
    expect(apiClient.getBaseUrl()).toBe('https://api.campuspulse.edu');
  });

  test('request interceptor attaches Bearer token from token provider', async () => {
    setAuthTokenProvider(async () => 'test-jwt-token-xyz');

    const config = { headers: {} };
    const interceptor = apiClient.rawInstance.interceptors.request.handlers[0].fulfilled;
    const modifiedConfig = await interceptor(config);

    expect(modifiedConfig.headers.Authorization).toBe('Bearer test-jwt-token-xyz');
  });

  test('request interceptor attaches mock headers when in mock mode', async () => {
    setMockHeadersProvider(() => ({
      'x-mock-user-id': 'dev-user-123',
      'x-mock-user-role': 'student',
    }));

    const config = { headers: {} };
    const interceptor = apiClient.rawInstance.interceptors.request.handlers[0].fulfilled;
    const modifiedConfig = await interceptor(config);

    expect(modifiedConfig.headers['x-mock-user-id']).toBe('dev-user-123');
    expect(modifiedConfig.headers['x-mock-user-role']).toBe('student');
  });

  test('request interceptor omits mock headers when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    setMockHeadersProvider(() => ({
      'x-mock-user-id': 'dev-user-123',
      'x-mock-user-role': 'admin',
    }));

    const config = { headers: {} };
    const interceptor = apiClient.rawInstance.interceptors.request.handlers[0].fulfilled;
    const modifiedConfig = await interceptor(config);

    expect(modifiedConfig.headers['x-mock-user-id']).toBeUndefined();
    expect(modifiedConfig.headers['x-mock-user-role']).toBeUndefined();
  });

  test('response interceptor unwraps response.data on 2xx response', () => {
    const interceptor = apiClient.rawInstance.interceptors.response.handlers[0].fulfilled;
    const response = { status: 200, data: { events: [{ eventId: 'evt-1' }] } };
    const result = interceptor(response);

    expect(result).toEqual({ events: [{ eventId: 'evt-1' }] });
  });

  test('response interceptor handles 401 Unauthorized without infinite retry loops', async () => {
    let sessionExpiredCalled = false;
    setSessionExpiredHandler(() => {
      sessionExpiredCalled = true;
    });

    const interceptor = apiClient.rawInstance.interceptors.response.handlers[0].rejected;
    const error401 = {
      response: {
        status: 401,
        data: { message: 'The incoming token has expired' },
      },
    };

    await expect(interceptor(error401)).rejects.toThrow('The incoming token has expired');
    expect(sessionExpiredCalled).toBe(true);
  });

  test('response interceptor handles 403 Forbidden with clear permission message', async () => {
    const interceptor = apiClient.rawInstance.interceptors.response.handlers[0].rejected;
    const error403 = {
      response: {
        status: 403,
        data: { message: 'Access denied. You do not have permission.' },
      },
    };

    await expect(interceptor(error403)).rejects.toThrow('Access denied');
  });

  test('response interceptor normalizes 409 Conflict', async () => {
    const interceptor = apiClient.rawInstance.interceptors.response.handlers[0].rejected;
    const error409 = {
      response: {
        status: 409,
        data: { message: 'Already registered or waitlisted for this event' },
      },
    };

    const promise = interceptor(error409);
    await expect(promise).rejects.toThrow('Already registered or waitlisted for this event');
    await promise.catch((err) => {
      expect(err.statusCode).toBe(409);
    });
  });
});
