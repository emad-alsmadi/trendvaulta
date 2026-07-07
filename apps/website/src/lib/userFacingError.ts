import axios from 'axios';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function sanitizeMessage(msg: string): string {
  return msg.replace(/request failed with status code\s*\d+/gi, '').trim();
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallbackMessage: string,
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

    if (status === 401) return 'Your session has expired. Please log in again.';
    if (status === 403) return 'You do not have permission to do that.';
    if (status === 404) return 'We could not find what you requested.';
    if (typeof status === 'number' && status >= 500) {
      const serverMsg =
        isRecord(data) && typeof data.message === 'string'
          ? sanitizeMessage(data.message)
          : '';
      if (serverMsg) return serverMsg;
      return 'Something went wrong on our side. Please try again later.';
    }

    if (!error.response) {
      return 'Unable to reach the server. Please check your connection and try again.';
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
