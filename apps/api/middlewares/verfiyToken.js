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

module.exports = {
  verfiyToken,
};
