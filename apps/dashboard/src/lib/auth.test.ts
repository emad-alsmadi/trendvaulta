import { describe, it, expect, beforeEach } from '@jest/globals';
import Cookies from 'js-cookie';
import {
  AUTH_REFRESH_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_TOKEN_COOKIE,
  clearAuthSession,
  getAuthRole,
  getAuthToken,
  getRefreshToken,
  pickPrimaryRole,
  setAuthSession,
  setRefreshedTokens,
} from './auth';

beforeEach(() => {
  Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(AUTH_ROLE_COOKIE, { path: '/' });
  Cookies.remove(AUTH_REFRESH_COOKIE, { path: '/' });
});

describe('pickPrimaryRole', () => {
  it('prefers admin over any other role present', () => {
    expect(pickPrimaryRole(['user', 'moderator', 'admin'])).toBe('admin');
  });

  it('falls back to moderator when admin is absent', () => {
    expect(pickPrimaryRole(['user', 'moderator'])).toBe('moderator');
  });

  it('falls back to the first role when neither admin nor moderator is present', () => {
    expect(pickPrimaryRole(['user'])).toBe('user');
  });

  it('defaults to "user" for an empty or missing roles list', () => {
    expect(pickPrimaryRole([])).toBe('user');
    expect(pickPrimaryRole(undefined)).toBe('user');
  });
});

describe('setAuthSession / getAuthToken / getAuthRole', () => {
  it('round-trips a token and role', () => {
    setAuthSession({ token: 'jwt-1', role: 'admin' });
    expect(getAuthToken()).toBe('jwt-1');
    expect(getAuthRole()).toBe('admin');
  });

  it('stores a token without a role when role is omitted', () => {
    setAuthSession({ token: 'jwt-2' });
    expect(getAuthToken()).toBe('jwt-2');
    expect(getAuthRole()).toBeUndefined();
  });

  it('stores a refresh token when provided', () => {
    setAuthSession({ token: 'jwt-1', role: 'admin', refreshToken: 'r-1' });
    expect(getRefreshToken()).toBe('r-1');
  });

  it('leaves refresh token unset when not provided', () => {
    setAuthSession({ token: 'jwt-1', role: 'admin' });
    expect(getRefreshToken()).toBeUndefined();
  });
});

describe('setRefreshedTokens', () => {
  it('updates the access token without touching the role cookie', () => {
    setAuthSession({ token: 'jwt-old', role: 'admin', refreshToken: 'r-old' });
    setRefreshedTokens({ token: 'jwt-new', refreshToken: 'r-new' });
    expect(getAuthToken()).toBe('jwt-new');
    expect(getRefreshToken()).toBe('r-new');
    expect(getAuthRole()).toBe('admin');
  });

  it('keeps the existing refresh token when a new one is not returned', () => {
    setAuthSession({ token: 'jwt-old', role: 'user', refreshToken: 'r-old' });
    setRefreshedTokens({ token: 'jwt-new' });
    expect(getAuthToken()).toBe('jwt-new');
    expect(getRefreshToken()).toBe('r-old');
  });
});

describe('clearAuthSession', () => {
  it('removes all three cookies', () => {
    setAuthSession({ token: 'jwt-1', role: 'admin', refreshToken: 'r-1' });
    clearAuthSession();
    expect(getAuthToken()).toBeUndefined();
    expect(getAuthRole()).toBeUndefined();
    expect(getRefreshToken()).toBeUndefined();
  });
});
