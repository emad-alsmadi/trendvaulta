const jwt = require('jsonwebtoken');
const { resolveActiveUser } = require('./verfiyToken');

// The verified payload of the request's Bearer token, or null when there is
// no token or it doesn't verify (bad signature, expired).
const decodeBearer = (req) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token || !process.env.JWT_SECRET_KEY) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch {
    // Ignore invalid tokens on optional paths
    return null;
  }
};

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
 * A route that does decide access to someone else's data from req.user
 * must use optionalVerifyTokenStrict below instead.
 */
const optionalVerifyToken = (req, _res, next) => {
  const decoded = decodeBearer(req);
  if (decoded) req.user = decoded;
  return next();
};

/**
 * optionalVerifyToken for a route that does decide access to someone else's
 * data from the token (the invoice's staff branch reads any order). The
 * account is re-checked exactly as verfiyToken does; a token it would reject
 * is treated as absent rather than failing the request, so a guest token on
 * the same request still works. Only requests carrying a token pay the DB
 * read.
 */
const optionalVerifyTokenStrict = async (req, _res, next) => {
  const decoded = decodeBearer(req);
  const user = decoded ? await resolveActiveUser(decoded) : null;
  if (user) req.user = user;
  return next();
};

module.exports = { optionalVerifyToken, optionalVerifyTokenStrict };
