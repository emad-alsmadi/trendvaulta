const { getUserPermissions } = require('./rolePermissions');

const checkRolePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'NO_TOKEN'
      });
    }

    const userPermissions = getUserPermissions(req.user.roles || ['user']);
    
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        message: 'You do not have permission to perform this action',
        code: 'FORBIDDEN',
      });
    }

    // Attach permissions to request for downstream use
    req.userPermissions = userPermissions;
    next();
  };
};

module.exports = {
  checkRolePermission
};
