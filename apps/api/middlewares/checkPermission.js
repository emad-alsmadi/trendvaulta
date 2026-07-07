const checkPermission = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRoles = req.user.roles || [];
    const hasPermission = requiredRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
        requiredRoles,
        userRoles
      });
    }

    next();
  };
};

module.exports = {
  checkPermission,
};
