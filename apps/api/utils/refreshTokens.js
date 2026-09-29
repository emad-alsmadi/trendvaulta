const { hashToken, generatePlaintextToken } = require('../models/RefreshToken');

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — matches prior single-JWT UX

// Two tabs whose access tokens expire together both present the same refresh
// token within moments. Inside this window a just-rotated token gets its own
// successor instead of tripping reuse detection (which would log the user out
// on every device). Tokens revoked by logout/password change never qualify.
const ROTATION_GRACE_MS = 30 * 1000;

/**
 * Issue a brand-new refresh token for a user (login/register).
 * @param {import('mongoose').Model} RefreshToken
 * @param {string} userId
 * @returns {Promise<{ plaintext: string, doc: import('mongoose').Document }>}
 */
async function issueRefreshToken(RefreshToken, userId) {
  const plaintext = generatePlaintextToken();
  const doc = await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(plaintext),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return { plaintext, doc };
}

/**
 * Validate a presented refresh token and rotate it: the old one is marked
 * revoked + linked to its replacement, a new one is issued in its place.
 *
 * Reuse detection: if the presented token was already revoked (i.e. it was
 * already rotated or revoked once before — the classic sign of a stolen
 * token being replayed after the legitimate client rotated past it), the
 * entire session chain for that user is revoked as a precaution.
 *
 * @param {import('mongoose').Model} RefreshToken
 * @param {string} presentedPlaintext
 * @returns {Promise<
 *   | { status: 'ok', userId: string, plaintext: string }
 *   | { status: 'invalid' }
 *   | { status: 'expired' }
 *   | { status: 'reused', userId: string }
 * >}
 */
async function rotateRefreshToken(RefreshToken, presentedPlaintext) {
  if (!presentedPlaintext || typeof presentedPlaintext !== 'string') {
    return { status: 'invalid' };
  }

  const tokenHash = hashToken(presentedPlaintext);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    return { status: 'invalid' };
  }

  if (existing.revokedAt) {
    if (wasJustRotated(existing)) {
      return issueSuccessor(RefreshToken, existing);
    }
    // Already used once before — treat as compromised and kill every
    // active session for this user.
    await revokeAllForUser(RefreshToken, existing.user);
    return { status: 'reused', userId: String(existing.user) };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return { status: 'expired' };
  }

  // Claim the rotation atomically: of two simultaneous requests only one
  // flips revokedAt; the other falls into the grace path above instead of
  // both minting successors unnoticed.
  const plaintext = generatePlaintextToken();
  const nextHash = hashToken(plaintext);
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: existing._id, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedByHash: nextHash } },
    { new: true },
  );
  if (!claimed) {
    return issueSuccessor(RefreshToken, existing);
  }

  await RefreshToken.create({
    user: existing.user,
    tokenHash: nextHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { status: 'ok', userId: String(existing.user), plaintext };
}

/** Rotated (not logged out / revoked) within the grace window. */
function wasJustRotated(doc) {
  return (
    Boolean(doc.replacedByHash) &&
    doc.revokedAt instanceof Date &&
    Date.now() - doc.revokedAt.getTime() < ROTATION_GRACE_MS
  );
}

/** Grace path: a fresh session token for a concurrent refresh. */
async function issueSuccessor(RefreshToken, doc) {
  const { plaintext } = await issueRefreshToken(RefreshToken, doc.user);
  return { status: 'ok', userId: String(doc.user), plaintext };
}

/**
 * @param {import('mongoose').Model} RefreshToken
 * @param {string} presentedPlaintext
 */
async function revokeRefreshToken(RefreshToken, presentedPlaintext) {
  if (!presentedPlaintext || typeof presentedPlaintext !== 'string') return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(presentedPlaintext), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/**
 * @param {import('mongoose').Model} RefreshToken
 * @param {string} userId
 */
async function revokeAllForUser(RefreshToken, userId) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

module.exports = {
  REFRESH_TOKEN_TTL_MS,
  ROTATION_GRACE_MS,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
