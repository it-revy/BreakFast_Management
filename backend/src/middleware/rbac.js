/**
 * Role-Based Access Control (RBAC) middleware verifying permission unions
 */

const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // IT_ADMIN with '*' permission or explicit match
    const userPermissions = req.user.permissions || [];
    const hasAccess = userPermissions.includes('*') || userPermissions.includes(requiredPermission);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: '${requiredPermission}' is missing.`
      });
    }

    next();
  };
};

const requireAnyPermission = (permissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userPermissions = req.user.permissions || [];
    const hasAccess = userPermissions.includes('*') || permissions.some(p => userPermissions.includes(p));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required one of permissions: ${permissions.join(', ')}`
      });
    }

    next();
  };
};

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles.includes(requiredRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${requiredRole}' is required.`
      });
    }
    next();
  };
};

module.exports = { requirePermission, requireAnyPermission, requireRole };
