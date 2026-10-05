const jwt = require('jsonwebtoken');

/**
 * Attach req.user when a valid Bearer token is present; never fail the request.
 * Used for public catalog routes that unlock staff-only filters when authenticated.
 *
 * SEC-111: the legacy `token:` header fallback is gone, matching
 * verfiyToken.js. Unlike verfiyToken.js, this does NOT re-check
 * disabled/tokenVersion against the DB — it only ever unlocks staff-only
 * filters or associates a request with an account on otherwise-public
 * routes, never a permission check (checkRolePermission uses verfiyToken),
 * so the extra DB read on every public catalog request isn't worth it here.
 */
const optionalVerifyToken = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token || !process.env.JWT_SECRET_KEY) {
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch {
    // Ignore invalid tokens on optional paths
  }
  return next();
};

module.exports = { optionalVerifyToken };
