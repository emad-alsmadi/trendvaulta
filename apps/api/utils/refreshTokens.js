const { hashToken, generatePlaintextToken } = require('../models/RefreshToken');

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — matches prior single-JWT UX

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
    // Already used once before — treat as compromised and kill every
    // active session for this user.
    await revokeAllForUser(RefreshToken, existing.user);
    return { status: 'reused', userId: String(existing.user) };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return { status: 'expired' };
  }

  const { plaintext, doc: next } = await issueRefreshToken(
    RefreshToken,
    existing.user,
  );
  existing.revokedAt = new Date();
  existing.replacedByHash = next.tokenHash;
  await existing.save();

  return { status: 'ok', userId: String(existing.user), plaintext };
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
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
