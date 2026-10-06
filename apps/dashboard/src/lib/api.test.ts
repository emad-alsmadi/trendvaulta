import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AxiosAdapter } from 'axios';
import { clearAuthSession, getAuthToken, getRefreshToken, setAuthSession } from './auth';

type Reply = { status: number; data?: unknown } | 'network-error';

const UNAUTHORIZED: Reply = { status: 401, data: { code: 'UNAUTHORIZED' } };
const REVOKED: Reply = { status: 401, data: { code: 'REFRESH_TOKEN_REUSED' } };
const isRefresh = (url: string) => url.endsWith('/auth/refresh');

/**
 * A fresh copy of the client for each test, because it keeps module state
 * (the shared refresh promise, the "already redirecting" flag). Every request
 * is answered by `respond` instead of the network.
 */
async function loadApi(respond: (url: string) => Reply) {
  jest.resetModules();
  const { default: axios, AxiosError } = await import('axios');
  const { api } = await import('./api');

  const adapter: AxiosAdapter = async (config) => {
    const reply = respond(config.url ?? '');
    if (reply === 'network-error') {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }
    const response = {
      data: reply.data ?? {},
      status: reply.status,
      statusText: '',
      headers: {},
      config,
    };
    if (reply.status < 400) return response;
    throw new AxiosError(
      `Request failed with status code ${reply.status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    );
  };
  axios.defaults.adapter = adapter;
  api.defaults.adapter = adapter;
  return api;
}

const realLocation = window.location;

/** jsdom cannot navigate, so a plain object records where the tab is sent. */
function stubLocation(pathname: string) {
  const origin = 'http://localhost';
  // Absolute, like the real thing: axios parses it as soon as it loads.
  const stub = { pathname, href: origin + pathname, origin, protocol: 'http:' };
  Object.defineProperty(window, 'location', { configurable: true, value: stub });
  return stub;
}

beforeEach(() => {
  setAuthSession({ token: 'access-old', role: 'admin', refreshToken: 'refresh-old' });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  clearAuthSession();
});

describe('forced logout', () => {
  it('sends a session the API revoked to the login page with that reason', async () => {
    const location = stubLocation('/orders');
    const api = await loadApi((url) => (isRefresh(url) ? REVOKED : UNAUTHORIZED));

    await expect(api.get('/orders')).rejects.toMatchObject({ response: { status: 401 } });

    expect(location.href).toBe('/login?reason=revoked');
    expect(getAuthToken()).toBeUndefined();
    expect(getRefreshToken()).toBeUndefined();
  });

  it('calls it expired when the refresh token is just no longer accepted', async () => {
    const location = stubLocation('/orders');
    const api = await loadApi(() => UNAUTHORIZED);

    await expect(api.get('/orders')).rejects.toMatchObject({ response: { status: 401 } });

    expect(location.href).toBe('/login?reason=expired');
    expect(getAuthToken()).toBeUndefined();
  });

  it('keeps the session when the refresh call gets no answer', async () => {
    const location = stubLocation('/orders');
    const api = await loadApi((url) => (isRefresh(url) ? 'network-error' : UNAUTHORIZED));

    await expect(api.get('/orders')).rejects.toMatchObject({ response: { status: 401 } });

    expect(location.href).toBe('http://localhost/orders');
    expect(getAuthToken()).toBe('access-old');
    expect(getRefreshToken()).toBe('refresh-old');
  });

  it('keeps the first reason when later requests fail on the cleared session', async () => {
    const location = stubLocation('/orders');
    const api = await loadApi((url) => (isRefresh(url) ? REVOKED : UNAUTHORIZED));

    await expect(api.get('/orders')).rejects.toMatchObject({ response: { status: 401 } });
    // The tab is still on the old page while the redirect loads.
    await expect(api.get('/users')).rejects.toMatchObject({ response: { status: 401 } });

    expect(location.href).toBe('/login?reason=revoked');
  });

  it('leaves a failed sign-in on the login page where it is', async () => {
    const location = stubLocation('/login');
    const api = await loadApi(() => UNAUTHORIZED);

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } });

    expect(location.href).toBe('http://localhost/login');
  });
});
