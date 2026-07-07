const jwt = require('jsonwebtoken');

// Verify Token
const verfiyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.headers.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ message: 'Token is not valid!' });
    }
  } else {
    res.status(401).json({ message: 'You are not authenticated!' });
  }
};

// Verify Token & Authorization
const verfiyTokenAndAuthorization = (req, res, next) => {
  verfiyToken(req, res, () => {
    const userId = req.user?.id ?? req.user?._id;
    const paramId = req.params?.id;
    const isAdmin = req.user?.roles?.includes('admin');

    if (String(userId) === String(paramId) || isAdmin) {
      next();
    } else {
      return res
        .status(403)
        .json({ message: 'You are not allowed to update this user' });
    }
  });
};

// Verify Token & Admin
const verfiyTokenAndAdmin = (req, res, next) => {
  verfiyToken(req, res, () => {
    if (req.user?.roles?.includes('admin')) {
      next();
    } else {
      return res.status(403).json({
        message: `You are not allowed to ${req.method === 'DELETE' ? 'delete this user' : req.method === 'PUT' ? 'update this user' : 'get users'}, only admin`,
      });
    }
  });
};

module.exports = {
  verfiyToken,
  verfiyTokenAndAuthorization,
  verfiyTokenAndAdmin,
};
