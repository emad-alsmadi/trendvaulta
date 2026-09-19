import { beforeEach, describe, expect, it } from 'vitest';
import Cookies from 'js-cookie';
import {
  AUTH_REFRESH_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_TOKEN_COOKIE,
  clearAuthCookies,
  getAuthToken,
  getRefreshToken,
  getUserRole,
  setAuthCookies,
  setRefreshedTokens,
} from './authCookies';

beforeEach(() => {
  Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(AUTH_ROLE_COOKIE, { path: '/' });
  Cookies.remove(AUTH_REFRESH_COOKIE, { path: '/' });
});

describe('setAuthCookies / getAuthToken / getUserRole', () => {
  it('round-trips a token and role', () => {
    setAuthCookies({ token: 'jwt-abc', role: 'admin' });
    expect(getAuthToken()).toBe('jwt-abc');
    expect(getUserRole()).toBe('admin');
  });

  it('returns null for a missing token', () => {
    expect(getAuthToken()).toBeNull();
  });

  it('returns null for a missing role rather than an empty string', () => {
    expect(getUserRole()).toBeNull();
  });

  it('stores a refresh token when provided', () => {
    setAuthCookies({
      token: 'jwt-abc',
      role: 'user',
      refreshToken: 'refresh-abc',
    });
    expect(getRefreshToken()).toBe('refresh-abc');
  });

  it('leaves refresh token unset when not provided', () => {
    setAuthCookies({ token: 'jwt-abc', role: 'user' });
    expect(getRefreshToken()).toBeNull();
  });
});

describe('setRefreshedTokens', () => {
  it('updates the access token without touching the role cookie', () => {
    setAuthCookies({ token: 'jwt-old', role: 'admin', refreshToken: 'r-old' });
    setRefreshedTokens({ token: 'jwt-new', refreshToken: 'r-new' });
    expect(getAuthToken()).toBe('jwt-new');
    expect(getRefreshToken()).toBe('r-new');
    expect(getUserRole()).toBe('admin');
  });

  it('keeps the existing refresh token when a new one is not returned', () => {
    setAuthCookies({ token: 'jwt-old', role: 'user', refreshToken: 'r-old' });
    setRefreshedTokens({ token: 'jwt-new' });
    expect(getAuthToken()).toBe('jwt-new');
    expect(getRefreshToken()).toBe('r-old');
  });
});

describe('clearAuthCookies', () => {
  it('removes all three cookies', () => {
    setAuthCookies({
      token: 'jwt-abc',
      role: 'user',
      refreshToken: 'refresh-abc',
    });
    clearAuthCookies();
    expect(getAuthToken()).toBeNull();
    expect(getUserRole()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
