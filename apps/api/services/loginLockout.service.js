/**
 * Per-account brute-force protection, shared by every endpoint that checks
 * a password (login, email change). The IP limiter alone doesn't stop
 * guessing spread over many IPs, or a stolen access token hammering a
 * current-password check. State lives on the User document (select:false
 * fields failedLoginAttempts / lockUntil), so it holds across restarts and
 * instances.
 */
const MAX_FAILED_PASSWORDS = 5;
const PASSWORD_LOCK_MS = 15 * 60 * 1000;

const LOCKED_RESPONSE = {
  message: 'Too many failed password attempts. Please try again in 15 minutes.',
  code: 'ACCOUNT_LOCKED',
};

/** @param {{ lockUntil?: Date }} user loaded with '+lockUntil' */
function isAccountLocked(user) {
  return Boolean(user?.lockUntil && user.lockUntil.getTime() > Date.now());
}

/** Count a wrong password; lock the account once the limit is reached. */
async function recordFailedPassword(User, userId) {
  const counted = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { failedLoginAttempts: 1 } },
    { new: true },
  ).select('+failedLoginAttempts');
  if (counted && counted.failedLoginAttempts >= MAX_FAILED_PASSWORDS) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          lockUntil: new Date(Date.now() + PASSWORD_LOCK_MS),
          failedLoginAttempts: 0,
        },
      },
    );
  }
}

/** Reset after a correct password (no write when there is nothing to clear). */
async function clearFailedPasswords(User, user) {
  if (!user?.failedLoginAttempts && !user?.lockUntil) return;
  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } },
  );
}

module.exports = {
  MAX_FAILED_PASSWORDS,
  PASSWORD_LOCK_MS,
  LOCKED_RESPONSE,
  isAccountLocked,
  recordFailedPassword,
  clearFailedPasswords,
};
