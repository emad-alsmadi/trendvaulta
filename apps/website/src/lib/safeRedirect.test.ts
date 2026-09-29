import { describe, expect, it } from 'vitest';
import { buildLoginUrl, getSafeRedirectPath } from './safeRedirect';

describe('getSafeRedirectPath', () => {
  it('keeps same-origin paths with query and hash', () => {
    expect(getSafeRedirectPath('/user/orders')).toBe('/user/orders');
    expect(getSafeRedirectPath('/products?q=lip&page=2#top')).toBe(
      '/products?q=lip&page=2#top',
    );
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(getSafeRedirectPath('https://evil.example')).toBeNull();
    expect(getSafeRedirectPath('//evil.example')).toBeNull();
    expect(getSafeRedirectPath('javascript:alert(1)')).toBeNull();
  });

  // URL parsers drop tabs/newlines and treat "\" like "/", so these all
  // resolve to //evil.example (SEC-104).
  it.each([
    ['tab', '/\t/evil.example'],
    ['newline', '/\n/evil.example'],
    ['carriage return', '/\r/evil.example'],
    ['backslash', '/\\evil.example'],
    ['backslash after slash', '/\\/evil.example'],
    ['inner space', '/ /evil.example'],
    ['NUL', '/\u0000/evil.example'],
  ])('rejects a %s smuggling attempt', (_label, value) => {
    expect(getSafeRedirectPath(value)).toBeNull();
  });

  it('rejects auth pages and empty values', () => {
    expect(getSafeRedirectPath('/auth/login')).toBeNull();
    expect(getSafeRedirectPath('')).toBeNull();
    expect(getSafeRedirectPath(null)).toBeNull();
    expect(getSafeRedirectPath(undefined)).toBeNull();
  });
});

describe('buildLoginUrl', () => {
  it('encodes a safe return path', () => {
    expect(buildLoginUrl('/user/orders?tab=open')).toBe(
      '/auth/login?redirect=%2Fuser%2Forders%3Ftab%3Dopen',
    );
  });

  it('falls back to the bare login page for unsafe or root targets', () => {
    expect(buildLoginUrl('/\t/evil.example')).toBe('/auth/login');
    expect(buildLoginUrl('/')).toBe('/auth/login');
  });
});
