const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Refresh tokens are stored hashed (SHA-256) — the plaintext value only ever
 * exists in the response body and the client's cookie, never at rest here.
 * This lets us revoke/rotate sessions server-side even though the access
 * token itself is a stateless JWT the API cannot invalidate early.
 */
const RefreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    // Set when this token was rotated out in favor of a newer one — lets us
    // detect refresh-token reuse (a strong signal of theft) and revoke the
    // whole chain.
    replacedByHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

RefreshTokenSchema.index({ user: 1 });
// Auto-purge documents once they're well past expiry (30 days of grace for
// forensics/support lookups) instead of growing the collection forever.
RefreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
);

function hashToken(plaintext) {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

function generatePlaintextToken() {
  return crypto.randomBytes(48).toString('hex');
}

const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);

module.exports = { RefreshToken, hashToken, generatePlaintextToken };
