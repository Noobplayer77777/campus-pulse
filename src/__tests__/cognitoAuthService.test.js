/**
 * Unit Tests for Amazon Cognito Authentication Adapter
 * Validates configuration detection, claim parsing, and student role enforcement.
 */

import { extractRoleFromPayload, isCognitoConfigured } from '../services/cognitoAuthService';
import { assertMockAllowed } from '../services/mockAuthService';
import { getActiveProviderName } from '../services/authService';

describe('Cognito Auth Service Adapter', () => {
  test('isCognitoConfigured returns false when pool ID has placeholder value', () => {
    expect(isCognitoConfigured()).toBe(false);
  });

  test('extractRoleFromPayload extracts admin role from cognito:groups array', () => {
    const payload = {
      sub: 'user-admin-1',
      email: 'admin@college.edu',
      'cognito:groups': ['admin'],
    };
    expect(extractRoleFromPayload(payload)).toBe('admin');
  });

  test('extractRoleFromPayload does not grant elevated privileges from client-writable custom:role attribute', () => {
    const payload = {
      sub: 'user-club-1',
      email: 'club@college.edu',
      'custom:role': 'admin', // Malicious attempt to escalate via custom attribute
    };
    expect(extractRoleFromPayload(payload)).toBe('student');
  });

  test('extractRoleFromPayload extracts club role from cognito:groups array', () => {
    const payload = {
      sub: 'user-club-1',
      email: 'club@college.edu',
      'cognito:groups': ['club'],
    };
    expect(extractRoleFromPayload(payload)).toBe('club');
  });

  test('extractRoleFromPayload defaults to student role when no elevated claims exist', () => {
    const payload = {
      sub: 'user-student-1',
      email: 'student@college.edu',
      name: 'Freshman Student',
    };
    expect(extractRoleFromPayload(payload)).toBe('student');
  });

  test('extractRoleFromPayload defaults to student when payload is empty or malformed', () => {
    expect(extractRoleFromPayload(null)).toBe('student');
    expect(extractRoleFromPayload({})).toBe('student');
  });

  describe('Production Auth Safeguards & Fail-Closed Boundaries', () => {
    let originalEnv;
    let originalProvider;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      originalProvider = process.env.REACT_APP_AUTH_PROVIDER;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      if (originalProvider !== undefined) {
        process.env.REACT_APP_AUTH_PROVIDER = originalProvider;
      } else {
        delete process.env.REACT_APP_AUTH_PROVIDER;
      }
    });

    test('assertMockAllowed throws fatal error in production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(() => assertMockAllowed()).toThrow(
        'Security Violation: Mock authentication is strictly disabled in production builds.'
      );
    });

    test('getActiveProviderName rejects mock provider in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_AUTH_PROVIDER = 'mock';
      expect(() => getActiveProviderName()).toThrow(
        'Security Error: REACT_APP_AUTH_PROVIDER=mock cannot be used in a production build.'
      );
    });

    test('getActiveProviderName fails closed in production when provider is unconfigured', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.REACT_APP_AUTH_PROVIDER;
      expect(() => getActiveProviderName()).toThrow(
        /Security Error: No valid authentication provider configured/
      );
    });
  });
});
