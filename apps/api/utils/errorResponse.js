/**
 * Map an error thrown/forwarded inside a request to a safe HTTP response.
 *
 * Known framework/driver errors get a specific 4xx status and a generic
 * message; anything else keeps its statusCode (or the status already set on
 * the response, e.g. by the 404 handler). In production, 5xx bodies never
 * echo the raw error message (it can contain index names, cast details or
 * internal paths).
 *
 * @param {any} err
 * @param {number} [resStatusCode] current res.statusCode
 * @param {{ production?: boolean }} [options]
 * @returns {{ statusCode: number, body: { message: string, code?: string } }}
 */
function mapErrorResponse(err, resStatusCode = 200, options = {}) {
  const production =
    options.production ?? process.env.NODE_ENV === 'production';

  if (err?.name === 'CastError') {
    return {
      statusCode: 400,
      body: { message: 'Invalid identifier', code: 'INVALID_ID' },
    };
  }

  if (err?.code === 11000 || err?.code === 11001) {
    return {
      statusCode: 409,
      body: { message: 'A record with these values already exists', code: 'DUPLICATE' },
    };
  }

  if (err?.name === 'ValidationError') {
    return {
      statusCode: 400,
      body: { message: 'Invalid request data', code: 'VALIDATION_ERROR' },
    };
  }

  // body-parser: malformed JSON / oversized payload
  if (err?.type === 'entity.parse.failed') {
    return {
      statusCode: 400,
      body: { message: 'Malformed JSON body', code: 'BAD_JSON' },
    };
  }
  if (err?.type === 'entity.too.large') {
    return {
      statusCode: 413,
      body: { message: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' },
    };
  }

  const explicit = Number(err?.statusCode ?? err?.status);
  let statusCode;
  if (Number.isInteger(explicit) && explicit >= 400 && explicit < 600) {
    statusCode = explicit;
  } else if (Number.isInteger(resStatusCode) && resStatusCode >= 400) {
    statusCode = resStatusCode;
  } else {
    statusCode = 500;
  }

  const rawMessage =
    typeof err?.message === 'string' && err.message ? err.message : '';

  if (statusCode >= 500) {
    return {
      statusCode,
      body: {
        message: production
          ? 'Something went wrong. Please try again later.'
          : rawMessage || 'Internal server error',
      },
    };
  }

  return {
    statusCode,
    body: { message: rawMessage || 'Request failed' },
  };
}

module.exports = { mapErrorResponse };
