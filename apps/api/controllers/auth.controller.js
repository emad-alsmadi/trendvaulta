const asyncHandler = require('express-async-handler');
const { validationBody } = require('../utils/errors');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { Order } = require('../models/Order');
const { attachGuestOrders } = require('../utils/guestOrders');
const {
  isEmailVerified,
  startEmailVerification,
  confirmEmailToken,
  resendCooldownSeconds,
} = require('../utils/emailVerification');
const {
  User,
  validateRegisterUser,
  validateLoginUser,
} = require('../models/User');
const { RefreshToken } = require('../models/RefreshToken');
const {
  LOCKED_RESPONSE,
  isAccountLocked,
  recordFailedPassword,
  clearFailedPasswords,
} = require('../utils/loginLockout');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} = require('../utils/refreshTokens');

// Hash compared against for unknown emails (timing parity with real ones).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-account-password', 10);

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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Register a new user.
 *
 * @route POST /api/auth/register
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON response containing created user fields, access token, and refresh token
 */
const registerUser = asyncHandler(async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Request body is required' });
  }
  const { error } = validateRegisterUser(req.body);
  if (error) {
    return res.status(400).json(validationBody(error));
  }
  const email = normalizeEmail(req.body.email);
  let user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({ code: 'EMAIL_TAKEN', message: 'This user already registered' });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);
  user = new User({
    email,
    username: req.body.username,
    password: hashedPassword,
    // Never trust client-supplied roles on public registration
    roles: ['user'],
    // Unconfirmed until the emailed link is opened (see emailVerification.js)
    emailVerifiedAt: null,
  });
  const result = await user.save();
  // Best effort: a mail outage must not fail the sign-up; "Resend" exists.
  await startEmailVerification(User, result).catch((err) =>
    logger.error({ err }, 'Could not start email verification'),
  );
  const token = user.generateToken();
  const { plaintext: refreshToken } = await issueRefreshToken(
    RefreshToken,
    result._id,
  );
  res.status(201).json({
    message: 'User is Created',
    ...toPublicUser(result),
    token,
    refreshToken,
  });
});

/**
 * Login a user and return an access token + refresh token.
 *
 * @route POST /api/auth/login
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON response containing user fields, access token, and refresh token
 */
const loginUser = asyncHandler(async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Request body is required' });
  }
  const { error } = validateLoginUser(req.body);
  if (error) {
    return res.status(400).json(validationBody(error));
  }
  const user = await User.findOne({
    email: normalizeEmail(req.body.email),
  }).select('+failedLoginAttempts +lockUntil');
  if (!user) {
    // Same bcrypt cost as a real account, so timing doesn't reveal which
    // emails are registered.
    await bcrypt.compare(req.body.password, DUMMY_PASSWORD_HASH);
    return res.status(400).json({ code: 'INVALID_CREDENTIALS', message: 'invalid email or password' });
  }

  // Locked accounts don't even test the password, so guessing stops here.
  if (isAccountLocked(user)) {
    return res.status(429).json(LOCKED_RESPONSE);
  }

  const isPasswordMatch = await bcrypt.compare(
    req.body.password,
    user.password,
  );
  if (!isPasswordMatch) {
    await recordFailedPassword(User, user._id);
    return res.status(400).json({ code: 'INVALID_CREDENTIALS', message: 'invalid email or password' });
  }

  await clearFailedPasswords(User, user);
  // Checked only after the password matches, so this response can't be used
  // to learn which emails belong to disabled accounts.
  if (user.disabled) {
    return res.status(403).json({
      message: 'This account has been disabled. Please contact support.',
      code: 'ACCOUNT_DISABLED',
    });
  }
  // Guest orders placed with this email join the account, once the account
  // has proven it owns the address. Best effort, never blocks sign-in.
  if (isEmailVerified(user)) {
    await attachGuestOrders(Order, user._id, user.email).catch((err) =>
      logger.error({ err }, 'Could not attach guest orders at login'),
    );
  }
  const token = user.generateToken();
  const { plaintext: refreshToken } = await issueRefreshToken(
    RefreshToken,
    user._id,
  );
  res.status(200).json({
    message: 'User is Login',
    ...toPublicUser(user),
    token,
    refreshToken,
  });
});

/**
 * Exchange a valid, unexpired refresh token for a new access token.
 * The refresh token itself is rotated (old one revoked, new one issued) on
 * every successful call — reuse of an already-rotated token revokes the
 * whole session chain for that user.
 *
 * @route POST /api/auth/refresh
 * @access Public (bearer is the refresh token itself)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const presented = req.body?.refreshToken;
  if (!presented || typeof presented !== 'string') {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'refreshToken is required' });
  }

  const result = await rotateRefreshToken(RefreshToken, presented);

  if (result.status === 'invalid' || result.status === 'expired') {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Refresh token is not valid' });
  }
  if (result.status === 'reused') {
    return res.status(401).json({
      message: 'Session has been revoked. Please sign in again.',
      code: 'REFRESH_TOKEN_REUSED',
    });
  }

  const user = await User.findById(result.userId).select('-password');
  if (!user || user.disabled) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Refresh token is not valid' });
  }

  const token = user.generateToken();
  res.status(200).json({ token, refreshToken: result.plaintext });
});

/**
 * Logout: revokes the presented refresh token server-side so it can no
 * longer be exchanged for a new access token, then the frontend clears its
 * cookies. The short-lived access JWT already in flight simply expires on
 * its own (it cannot be revoked early — see models/User.js).
 *
 * @route POST /api/auth/logout
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const logoutUser = asyncHandler(async (req, res) => {
  await revokeRefreshToken(RefreshToken, req.body?.refreshToken);
  res.status(200).json({ message: 'Logged out' });
});

/**
 * Confirm an email address from the emailed link. The token works once and
 * expires after 24 hours; an unknown, used or expired one gets the same 400.
 *
 * @route POST /api/auth/verify-email
 * @access Public (rate-limited)
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const user = await confirmEmailToken(User, req.body?.token);
  if (!user) {
    return res.status(400).json({
      code: 'VERIFICATION_LINK_INVALID',
      message: 'This confirmation link is invalid or has expired. Request a new one from your account.',
    });
  }
  // The address is now proven: its earlier guest orders join the account
  const attachedOrders = await attachGuestOrders(Order, user._id, user.email).catch((err) => {
    logger.error({ err }, 'Could not attach guest orders after email confirmation');
    return 0;
  });
  res.status(200).json({ message: 'Email confirmed', emailVerified: true, attachedOrders });
});

/**
 * Send a new confirmation link to the signed-in user's current email.
 * At most one per minute per account.
 *
 * @route POST /api/auth/verify-email/resend
 * @access Private (rate-limited)
 */
const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?.id)
    .select('email username emailVerifiedAt +emailVerificationSentAt')
    .lean();
  if (!user) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
  }
  if (isEmailVerified(user)) {
    return res.status(200).json({ message: 'Email already confirmed', emailVerified: true });
  }
  const wait = resendCooldownSeconds(user);
  if (wait > 0) {
    res.set('Retry-After', String(wait));
    return res.status(429).json({
      code: 'VERIFICATION_RESEND_TOO_SOON',
      message: `Please wait ${wait} seconds before requesting another link.`,
      retryAfterSeconds: wait,
    });
  }
  const { sent } = await startEmailVerification(User, user);
  if (!sent) {
    return res.status(503).json({
      code: 'MAIL_UNAVAILABLE',
      message: 'We could not send the email right now. Please try again later.',
    });
  }
  res.status(200).json({ message: 'Confirmation link sent', emailVerified: false });
});

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  resendVerificationEmail,
};
