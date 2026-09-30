/**
 * Email ownership checks (plan P0-02, decision D5).
 *
 * Policy: a soft gate. Signing in and checking out never need a verified
 * email (guests don't have one), but writing a review and requesting a
 * return do, since both put the address on record for follow-up. Accounts
 * created before verification existed have no `emailVerifiedAt` field and
 * count as verified.
 *
 * The link token is 32 random bytes, stored only as a SHA-256 hash, valid
 * for 24 hours and cleared on first use.
 */
const crypto = require('node:crypto');
// Called through the module object (not destructured) so tests can capture
// the emailed link.
const mail = require('./mail');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashVerificationToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** `null` = waiting for the link; a Date, or no field at all (older accounts) = verified. */
function isEmailVerified(user) {
  return Boolean(user) && user.emailVerifiedAt !== null;
}

/**
 * Issue a fresh link for the user's current email and send it. Marks the
 * address unverified (a changed email must be confirmed again). The
 * plaintext token only ever travels in the email.
 *
 * @param {import('mongoose').Model} UserModel
 * @param {{ _id: unknown, email: string, username?: string }} user
 * @returns {Promise<{ sent: boolean }>}
 */
async function startEmailVerification(UserModel, user) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  await UserModel.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerifiedAt: null,
        emailVerificationTokenHash: hashVerificationToken(token),
        emailVerificationExpires: new Date(now + TOKEN_TTL_MS),
        emailVerificationSentAt: new Date(now),
      },
    },
  );
  const sent = await mail.sendEmailVerificationEmail({
    to: user.email,
    token,
    username: user.username,
  }).catch(() => false);
  return { sent };
}

/**
 * Consume a link token. Atomic, so a token works exactly once even when the
 * link is opened twice at the same moment.
 * @returns {Promise<object|null>} the verified user, or null (unknown/used/expired)
 */
async function confirmEmailToken(UserModel, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return null;
  return UserModel.findOneAndUpdate(
    {
      emailVerificationTokenHash: hashVerificationToken(token.toLowerCase()),
      emailVerificationExpires: { $gt: new Date() },
    },
    {
      $set: { emailVerifiedAt: new Date() },
      $unset: { emailVerificationTokenHash: '', emailVerificationExpires: '' },
    },
    { new: true },
  ).lean();
}

/** Seconds until another link may be sent, or 0. */
function resendCooldownSeconds(user, now = Date.now()) {
  const sentAt = user?.emailVerificationSentAt ? new Date(user.emailVerificationSentAt).getTime() : 0;
  const remaining = sentAt + RESEND_COOLDOWN_MS - now;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** Loads the account and applies isEmailVerified (missing account = false). */
async function hasVerifiedEmail(UserModel, userId) {
  const user = await UserModel.findById(userId).select('emailVerifiedAt').lean();
  return isEmailVerified(user);
}

/** 403 body for actions that need a confirmed address. */
const EMAIL_NOT_VERIFIED = {
  code: 'EMAIL_NOT_VERIFIED',
  message: 'Please confirm your email address first. We sent you a link when you signed up.',
};

module.exports = {
  TOKEN_TTL_MS,
  RESEND_COOLDOWN_MS,
  EMAIL_NOT_VERIFIED,
  hashVerificationToken,
  isEmailVerified,
  hasVerifiedEmail,
  startEmailVerification,
  confirmEmailToken,
  resendCooldownSeconds,
};
