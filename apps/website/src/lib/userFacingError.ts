import axios from 'axios';
import type { Translate } from '@/lib/i18n';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/**
 * API error codes whose copy lives outside `errors.api.*` (older keys).
 * Every other code is looked up as `errors.api.<CODE>`; add it to both
 * dictionaries when the API gains one a shopper can hit.
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

/** `items[0].postalCode` → `Postal code` (the API's own field key). */
function humanizeField(path: string) {
  const key = path.split('.').pop() || path;
  const words = key.replace(/\[\d+\]/g, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** The translator echoes a missing key back — use that to test for copy. */
function translateIfExists(t: Translate, key: string, vars?: Record<string, string | number>) {
  const text = t(key, vars);
  return text === key ? undefined : text;
}

/**
 * Shopper-facing text for a failed request, in the shopper's language when
 * `t` is passed: the API's stable `code` (or Joi rule `type`) is translated
 * first; only then its English `message`, then status-based fallbacks.
 * `t` stays optional so existing callers keep compiling.
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

  // Axios first: its own `message` ("Network Error", "timeout of …ms
  // exceeded") is transport text, never something to show a shopper.
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (t && isRecord(data)) {
      const params: Record<string, string | number> = {
        ...(isRecord(data.params) ? (data.params as Record<string, string | number>) : {}),
        seconds:
          typeof data.retryAfterSeconds === 'number'
            ? data.retryAfterSeconds
            : typeof data.retryAfter === 'number'
              ? data.retryAfter
              : 60,
      };

      // Joi rule of the first field that failed.
      const details = Array.isArray(data.details) ? data.details : [];
      const rule = details.find((d): d is UnknownRecord => isRecord(d) && typeof d.type === 'string');
      if (rule) {
        const text = translateIfExists(t, `errors.validation.${String(rule.type).replace(/\./g, '_')}`, {
          field: humanizeField(typeof rule.field === 'string' ? rule.field : ''),
          limit: typeof rule.limit === 'number' ? rule.limit : '',
        });
        if (text) return text;
      }

      if (typeof data.code === 'string') {
        const legacyKey = API_ERROR_CODE_KEYS[data.code];
        const text = legacyKey
          ? t(legacyKey, params)
          : translateIfExists(t, `errors.api.${data.code}`, params);
        if (text) return text;
      }
    }

    const apiMessage = (() => {
      if (typeof data === 'string') return data;
      if (isRecord(data) && typeof data.message === 'string') return data.message;
      return null;
    })();

    if (apiMessage && (typeof status !== 'number' || status < 500)) {
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
      const serverMsg = apiMessage ? sanitizeMessage(apiMessage) : '';
      if (serverMsg) return serverMsg;
      return t ? t('errors.serverError') : 'Something went wrong on our side. Please try again later.';
    }

    if (!error.response) {
      return t
        ? t('errors.networkError')
        : 'Unable to reach the server. Please check your connection and try again.';
    }
    return fallbackMessage;
  }

  if (isRecord(error) && typeof error.message === 'string') {
    const sanitized = sanitizeMessage(error.message);
    if (sanitized) return sanitized;
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
