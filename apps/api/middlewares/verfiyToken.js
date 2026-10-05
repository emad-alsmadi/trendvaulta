const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

// Verify Token
//
// SEC-111: the legacy `token:` header fallback is gone — only a standard
// `Authorization: Bearer` header is accepted now (confirmed as a deliberate
// breaking change; no known client still relies on the old header).
//
// Also re-checks the account on every request: the access JWT is otherwise
// stateless and can't be revoked early, so a disabled account or one whose
// tokenVersion was bumped (role change, password change/reset — see
// utils/refreshTokens.js bumpTokenVersion) would otherwise keep working for
// up to its full 15-minute TTL after the admin action. This trades a small
// per-request DB read for closing that window immediately.
const verfiyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'You are not authenticated!' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Token is not valid!' });
  }

  const user = await User.findById(decoded.id).select('roles disabled tokenVersion').lean();
  const currentVersion = user?.tokenVersion ?? 0;
  const tokenVersion = decoded.tokenVersion ?? 0;
  if (!user || user.disabled || tokenVersion !== currentVersion) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Token is not valid!' });
  }

  req.user = decoded;
  next();
};

module.exports = {
  verfiyToken,
};
