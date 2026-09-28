const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Role = require('../models/Role');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'breakfast_platform_super_secret_jwt_key_2026_xyz');

    const employee = await Employee.findOne({ employeeId: decoded.employeeId, isHardDeleted: false });

    if (!employee) {
      return res.status(401).json({ success: false, message: 'User account not found' });
    }

    if (employee.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact administrator.' });
    }

    // Fetch full permission matrix for all assigned roles
    const roleDocs = await Role.find({ code: { $in: employee.roles } });
    
    // Calculate permission union across all assigned roles
    const permissionsSet = new Set();
    roleDocs.forEach(roleDoc => {
      roleDoc.permissions.forEach(perm => permissionsSet.add(perm));
    });

    req.user = {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      designation: employee.designation,
      roles: employee.roles,
      breakfastParticipationType: employee.breakfastParticipationType,
      permissions: Array.from(permissionsSet),
      activeRole: req.headers['x-role-used'] || employee.roles[0]
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', error: error.message });
  }
};

module.exports = { protect };
