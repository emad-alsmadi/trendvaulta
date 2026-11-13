const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

// Hash compared against for unknown emails (timing parity with real accounts).
// Computed once at module load so login timing never reveals whether an
// email is registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-account-password', 10);

/** Hash a plaintext password with bcrypt. */
async function hashPassword(plaintext) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plaintext, salt);
}

/** Compare a plaintext password against a stored bcrypt hash. */
async function comparePassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
  dummyPasswordHash: DUMMY_PASSWORD_HASH,
  SALT_ROUNDS,
};
