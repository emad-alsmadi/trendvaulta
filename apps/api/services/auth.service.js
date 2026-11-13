/**
 * Authentication domain service.
 *
 * Contains all auth business logic: registration, login, refresh, logout,
 * email verification and resend. Functions take the models they touch as
 * arguments (dependency injection) so they stay unit-testable without HTTP.
 * The controller layer owns HTTP concerns: status codes, headers, and
 * response bodies are returned as plain data for the controller to send.
 */
const {
  hashPassword,
  comparePassword,
  dummyPasswordHash: DUMMY_PASSWORD_HASH,
} = require('../utils/password');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} = require('./refreshTokens.service');
const {
  isEmailVerified,
  startEmailVerification,
  confirmEmailToken,
  resendCooldownSeconds,
} = require('./emailVerification.service');
const {
  LOCKED_RESPONSE,
  isAccountLocked,
  recordFailedPassword,
  clearFailedPasswords,
} = require('./loginLockout.service');
const { attachGuestOrders } = require('./guestOrders.service');
const logger = require('../utils/logger');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Fields safe to return to the client after login/register. */
function toPublicUser(user) {
  return {
    _id: user._id,
    email: user.email,
    username: user.username,
    roles: Array.isArray(user.roles) ? user.roles : ['user'],
    emailVerified: isEmailVerified(user),
  };
}

/**
 * Register a new user.
 * @param {{ User: import('mongoose').Model, RefreshToken: import('mongoose').Model }} models
 * @param {{ email: string, username: string, password: string }} input
 * @returns {Promise<{ ok: boolean, status: number, data?: object, code?: string, message?: string }>}
 */
async function register({ User, RefreshToken }, { email, username, password }) {
  const normalized = normalizeEmail(email);
  const existing = await User.findOne({ email: normalized });
  if (existing) {
    return { ok: false, status: 400, data: { code: 'EMAIL_TAKEN', message: 'This user already registered' } };
  }

  const hashedPassword = await hashPassword(password);
  const user = new User({
    email: normalized,
    username,
    password: hashedPassword,
    roles: ['user'],
    emailVerifiedAt: null,
  });
  const result = await user.save();

  // Best effort: a mail outage must not fail sign-up; "Resend" exists.
  await startEmailVerification(User, result).catch((err) =>
    logger.error({ err }, 'Could not start email verification'),
  );

  const token = result.generateToken();
  const { plaintext: refreshToken } = await issueRefreshToken(RefreshToken, result._id);
  return {
    ok: true,
    status: 201,
    data: {
      message: 'User is Created',
      ...toPublicUser(result),
      token,
      refreshToken,
    },
  };
}

/**
 * Login a user and return an access token + refresh token.
 * Unknown emails get bcrypt timing parity so registration can't be probed.
 * @param {{ User, RefreshToken, Order }} models
 * @param {{ email: string, password: string }} input
 */
async function login({ User, RefreshToken, Order }, { email, password }) {
  const normalized = normalizeEmail(email);
  const user = await User.findOne({ email: normalized }).select('+failedLoginAttempts +lockUntil');
  if (!user) {
    await comparePassword(password, DUMMY_PASSWORD_HASH);
    return { ok: false, status: 400, data: { code: 'INVALID_CREDENTIALS', message: 'invalid email or password' } };
  }

  if (isAccountLocked(user)) {
    return { ok: false, status: 429, data: { ...LOCKED_RESPONSE } };
  }

  const isPasswordMatch = await comparePassword(password, user.password);
  if (!isPasswordMatch) {
    await recordFailedPassword(User, user._id);
    return { ok: false, status: 400, data: { code: 'INVALID_CREDENTIALS', message: 'invalid email or password' } };
  }

  await clearFailedPasswords(User, user._id);

  if (user.disabled) {
    return {
      ok: false,
      status: 403,
      data: {
        code: 'ACCOUNT_DISABLED',
        message: 'This account has been disabled. Please contact support.',
      },
    };
  }

  // Guest orders placed with this email join the account, once the account
  // has proven it owns the address. Best effort, never blocks sign-in.
  if (isEmailVerified(user)) {
    await attachGuestOrders(Order, user._id, user.email).catch((err) =>
      logger.error({ err }, 'Could not attach guest orders at login'),
    );
  }

  const token = user.generateToken();
  const { plaintext: refreshToken } = await issueRefreshToken(RefreshToken, user._id);
  return {
    ok: true,
    status: 200,
    data: {
      message: 'User is Login',
      ...toPublicUser(user),
      token,
      refreshToken,
    },
  };
}

/**
 * Exchange a valid refresh token for a new access token (with rotation).
 * @param {{ RefreshToken, User }} models
 * @param {string} refreshToken
 */
async function refresh({ RefreshToken, User }, refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    return { ok: false, status: 400, data: { code: 'VALIDATION_ERROR', message: 'refreshToken is required' } };
  }

  const result = await rotateRefreshToken(RefreshToken, refreshToken);

  if (result.status === 'invalid' || result.status === 'expired') {
    return { ok: false, status: 401, data: { code: 'UNAUTHORIZED', message: 'Refresh token is not valid' } };
  }
  if (result.status === 'reused') {
    return {
      ok: false,
      status: 401,
      data: {
        code: 'REFRESH_TOKEN_REUSED',
        message: 'Session has been revoked. Please sign in again.',
      },
    };
  }

  const user = await User.findById(result.userId).select('-password');
  if (!user || user.disabled) {
    return { ok: false, status: 401, data: { code: 'UNAUTHORIZED', message: 'Refresh token is not valid' } };
  }

  const token = user.generateToken();
  return { ok: true, status: 200, data: { token, refreshToken: result.plaintext } };
}

/**
 * Revoke a refresh token (logout).
 * @param {{ RefreshToken }} models
 * @param {string} refreshToken
 */
async function logout({ RefreshToken }, refreshToken) {
  await revokeRefreshToken(RefreshToken, refreshToken);
  return { ok: true, status: 200, data: { message: 'Logged out' } };
}

/**
 * Confirm an email address from the emailed link.
 * @param {{ User, Order }} models
 * @param {string} token
 */
async function verifyEmail({ User, Order }, token) {
  const user = await confirmEmailToken(User, token);
  if (!user) {
    return {
      ok: false,
      status: 400,
      data: {
        code: 'VERIFICATION_LINK_INVALID',
        message: 'This confirmation link is invalid or has expired. Request a new one from your account.',
      },
    };
  }

  const attachedOrders = await attachGuestOrders(Order, user._id, user.email).catch((err) => {
    logger.error({ err }, 'Could not attach guest orders after email confirmation');
    return 0;
  });

  return {
    ok: true,
    status: 200,
    data: { message: 'Email confirmed', emailVerified: true, attachedOrders },
  };
}

/**
 * Send a new confirmation link to the signed-in user's current email.
 * @param {{ User }} models
 * @param {string} userId
 */
async function resendVerificationEmail({ User }, userId) {
  const user = await User.findById(userId)
    .select('email username emailVerifiedAt +emailVerificationSentAt')
    .lean();
  if (!user) {
    return { ok: false, status: 404, data: { code: 'NOT_FOUND', message: 'User not found' } };
  }

  if (isEmailVerified(user)) {
    return { ok: true, status: 200, data: { message: 'Email already confirmed', emailVerified: true } };
  }

  const wait = resendCooldownSeconds(user);
  if (wait > 0) {
    return {
      ok: false,
      status: 429,
      data: {
        code: 'VERIFICATION_RESEND_TOO_SOON',
        message: `Please wait ${wait} seconds before requesting another link.`,
        retryAfterSeconds: wait,
      },
      headers: { 'Retry-After': String(wait) },
    };
  }

  const { sent } = await startEmailVerification(User, user);
  if (!sent) {
    return {
      ok: false,
      status: 503,
      data: {
        code: 'MAIL_UNAVAILABLE',
        message: 'We could not send the email right now. Please try again later.',
      },
    };
  }

  return { ok: true, status: 200, data: { message: 'Confirmation link sent', emailVerified: false } };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerificationEmail,
};
