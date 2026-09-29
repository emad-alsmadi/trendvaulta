import axios from 'axios';
import type { Translate } from '@/lib/i18n';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/**
 * API error codes with a translated message. Checked before the API's own
 * (English) `message`, so these read in the shopper's language. Add a code
 * here, with keys in both dictionaries, when the API gains one.
 */
const API_ERROR_CODE_KEYS: Record<string, string> = {
  EMAIL_NOT_VERIFIED: 'errors.emailNotVerified',
  VERIFICATION_LINK_INVALID: 'errors.verificationLinkInvalid',
  VERIFICATION_RESEND_TOO_SOON: 'errors.verificationResendTooSoon',
  MAIL_UNAVAILABLE: 'errors.mailUnavailable',
};

function sanitizeMessage(msg: string): string {
  return msg.replace(/request failed with status code\s*\d+/gi, '').trim();
}

/**
 * `t` is optional so existing callers keep compiling; pass it to localize
 * the status-code-derived fallback strings (401/403/404/5xx/network).
 * Without it, those fallbacks stay in English.
 */
export function getUserFacingErrorMessage(
  error: unknown,
  fallbackMessage: string,
  t?: Translate,
): string {
  if (typeof error === 'string') {
    const sanitized = sanitizeMessage(error);
    return sanitized || fallbackMessage;
  }

  if (isRecord(error) && typeof error.message === 'string') {
    const sanitized = sanitizeMessage(error.message);
    if (sanitized) return sanitized;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    const codeKey =
      t && isRecord(data) && typeof data.code === 'string'
        ? API_ERROR_CODE_KEYS[data.code]
        : undefined;
    if (t && codeKey) {
      const seconds =
        isRecord(data) && typeof data.retryAfterSeconds === 'number'
          ? data.retryAfterSeconds
          : 60;
      return t(codeKey, { seconds });
    }

    const apiMessage = (() => {
      if (typeof data === 'string') return data;
      if (isRecord(data) && typeof data.message === 'string')
        return data.message;
      return null;
    })();

    if (apiMessage) {
      const sanitized = sanitizeMessage(apiMessage);
      if (sanitized) return sanitized;
    }

    if (status === 401)
      return t ? t('errors.sessionExpired') : 'Your session has expired. Please log in again.';
    if (status === 403)
      return t ? t('errors.forbidden') : 'You do not have permission to do that.';
    if (status === 404)
      return t ? t('errors.notFoundGeneric') : 'We could not find what you requested.';
    if (typeof status === 'number' && status >= 500) {
      const serverMsg =
        isRecord(data) && typeof data.message === 'string'
          ? sanitizeMessage(data.message)
          : '';
      if (serverMsg) return serverMsg;
      return t ? t('errors.serverError') : 'Something went wrong on our side. Please try again later.';
    }

    if (!error.response) {
      return t
        ? t('errors.networkError')
        : 'Unable to reach the server. Please check your connection and try again.';
    }
  }

  return fallbackMessage;
}

export function logErrorForDev(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    console.error(error);
    if (isRecord(data) && typeof data.detail === 'string' && data.detail) {
      console.error('[API detail]', data.detail);
    }
    return;
  }
  console.error(error);
}
