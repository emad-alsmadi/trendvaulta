import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getUserFacingErrorMessage } from './userFacingError';
import { createTranslator } from './i18n';

function apiError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

describe('getUserFacingErrorMessage', () => {
  const ar = createTranslator('ar');
  const en = createTranslator('en');

  it('translates a known API error code instead of echoing the English message', () => {
    const err = apiError(403, { code: 'EMAIL_NOT_VERIFIED', message: 'Please confirm your email address first.' });
    expect(getUserFacingErrorMessage(err, 'fallback', ar)).toBe(ar('errors.emailNotVerified'));
    expect(getUserFacingErrorMessage(err, 'fallback', en)).toBe(en('errors.emailNotVerified'));
  });

  it('fills the wait time into the resend cooldown message', () => {
    const err = apiError(429, { code: 'VERIFICATION_RESEND_TOO_SOON', retryAfterSeconds: 42 });
    expect(getUserFacingErrorMessage(err, 'fallback', en)).toContain('42');
  });

  it('keeps the API message for codes it does not know, and without a translator', () => {
    const unknown = apiError(400, { code: 'SOMETHING_ELSE', message: 'Specific API text' });
    expect(getUserFacingErrorMessage(unknown, 'fallback', en)).toBe('Specific API text');

    const known = apiError(403, { code: 'EMAIL_NOT_VERIFIED', message: 'English from the API' });
    expect(getUserFacingErrorMessage(known, 'fallback')).toBe('English from the API');
  });
});
