import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  REFRESH_COOKIE,
  getBackendApiBase,
  normalizeApiBase,
  refreshCookieOptions,
  splitRefreshToken,
} from './serverAuth';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('normalizeApiBase', () => {
  it('falls back to /api when unset', () => {
    expect(normalizeApiBase(undefined)).toBe('/api');
  });

  it('appends /api and strips trailing slashes', () => {
    expect(normalizeApiBase('http://localhost:3000/')).toBe(
      'http://localhost:3000/api',
    );
  });

  it('does not double the /api suffix', () => {
    expect(normalizeApiBase('https://api.example.com/api')).toBe(
      'https://api.example.com/api',
    );
  });
});

describe('getBackendApiBase', () => {
  it('prefers API_INTERNAL_URL over NEXT_PUBLIC_API_URL', () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://api:3000');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://public.example.com');
    expect(getBackendApiBase()).toBe('http://api:3000/api');
  });

  it('uses NEXT_PUBLIC_API_URL when no internal URL is set', () => {
    vi.stubEnv('API_INTERNAL_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://public.example.com/');
    expect(getBackendApiBase()).toBe('https://public.example.com/api');
  });

  it('defaults to the local API instead of a relative path', () => {
    vi.stubEnv('API_INTERNAL_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    expect(getBackendApiBase()).toBe('http://localhost:3000/api');
  });
});

describe('refreshCookieOptions', () => {
  it('is httpOnly, lax and scoped to the auth handlers for 30 days', () => {
    expect(REFRESH_COOKIE).toBe('tv_refresh');
    expect(refreshCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 30 * 24 * 60 * 60,
      secure: false,
    });
  });

  it('is secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(refreshCookieOptions().secure).toBe(true);
  });
});

describe('splitRefreshToken', () => {
  it('removes the refresh token from the payload handed to the browser', () => {
    const { refreshToken, rest } = splitRefreshToken({
      message: 'User is Login',
      token: 'jwt',
      refreshToken: 'r-1',
      roles: ['user'],
    });
    expect(refreshToken).toBe('r-1');
    expect(rest).toEqual({ message: 'User is Login', token: 'jwt', roles: ['user'] });
  });

  it('returns null when the backend sent no refresh token', () => {
    expect(splitRefreshToken({ message: 'x' }).refreshToken).toBeNull();
  });
});
