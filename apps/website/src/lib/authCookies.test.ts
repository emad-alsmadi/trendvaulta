import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Cookies from 'js-cookie';
import {
  AUTH_ROLE_COOKIE,
  AUTH_TOKEN_COOKIE,
  clearAuthCookies,
  getAuthToken,
  getUserRole,
  setAccessToken,
  setAuthCookies,
} from './authCookies';

const LEGACY_REFRESH_COOKIE = 'refreshToken';

beforeEach(() => {
  Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(AUTH_ROLE_COOKIE, { path: '/' });
  Cookies.remove(LEGACY_REFRESH_COOKIE, { path: '/' });
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

  it('never writes a JS-readable refresh token', () => {
    setAuthCookies({ token: 'jwt-abc', role: 'user' });
    expect(document.cookie).not.toContain(LEGACY_REFRESH_COOKIE);
  });

  it('clears a legacy refreshToken cookie left by older builds', () => {
    Cookies.set(LEGACY_REFRESH_COOKIE, 'stale', { path: '/' });
    setAuthCookies({ token: 'jwt-abc', role: 'user' });
    expect(Cookies.get(LEGACY_REFRESH_COOKIE)).toBeUndefined();
  });
});

describe('cookie attributes', () => {
  const setSpy = vi.spyOn(Cookies, 'set');

  afterEach(() => {
    setSpy.mockClear();
  });

  it('uses sameSite=lax and path=/ for token and role', () => {
    setAuthCookies({ token: 'jwt-abc', role: 'user' });
    expect(setSpy).toHaveBeenCalledWith(
      AUTH_TOKEN_COOKIE,
      'jwt-abc',
      expect.objectContaining({ sameSite: 'lax', path: '/', secure: false }),
    );
    expect(setSpy).toHaveBeenCalledWith(
      AUTH_ROLE_COOKIE,
      'user',
      expect.objectContaining({ sameSite: 'lax', path: '/' }),
    );
  });

  it('marks cookies secure in production builds', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      setAccessToken('jwt-prod');
      expect(setSpy).toHaveBeenCalledWith(
        AUTH_TOKEN_COOKIE,
        'jwt-prod',
        expect.objectContaining({ secure: true, sameSite: 'lax' }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('setAccessToken', () => {
  it('updates the access token without touching the role cookie', () => {
    setAuthCookies({ token: 'jwt-old', role: 'admin' });
    setAccessToken('jwt-new');
    expect(getAuthToken()).toBe('jwt-new');
    expect(getUserRole()).toBe('admin');
  });
});

describe('clearAuthCookies', () => {
  it('removes token, role and any legacy refresh cookie', () => {
    setAuthCookies({ token: 'jwt-abc', role: 'user' });
    Cookies.set(LEGACY_REFRESH_COOKIE, 'stale', { path: '/' });
    clearAuthCookies();
    expect(getAuthToken()).toBeNull();
    expect(getUserRole()).toBeNull();
    expect(Cookies.get(LEGACY_REFRESH_COOKIE)).toBeUndefined();
  });
});
