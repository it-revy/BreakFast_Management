const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Role = require('../models/Role');
const { logAudit } = require('../middleware/auditLogger');

const login = async (req, res) => {
  try {
    const { username, loginId, password } = req.body;
    const inputIdentifier = (username || loginId || '').trim();

    if (!inputIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const normalizedIdentifier = inputIdentifier.toLowerCase();

    // Strictly authenticate by username only. Employee ID is prohibited for login.
    const employee = await Employee.findOne({
      username: normalizedIdentifier,
      isHardDeleted: false
    });

    if (!employee) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (employee.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact IT Administrator.' });
    }

    // Secure bcrypt comparison with stored hash only - no plaintext bypasses
    const isMatch = await bcrypt.compare(password, employee.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Calculate permissions across assigned roles and mapped per role
    const roleDocs = await Role.find({ code: { $in: employee.roles } });
    const permissionsByRole = {};
    const permissionsSet = new Set();
    roleDocs.forEach(r => {
      permissionsByRole[r.code] = r.permissions || [];
      (r.permissions || []).forEach(p => permissionsSet.add(p));
    });

    const permissions = Array.from(permissionsSet);

    // Create JWT Token
    const payload = {
      employeeId: employee.employeeId,
      username: employee.username,
      name: employee.name,
      roles: employee.roles
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'breakfast_platform_super_secret_jwt_key_2026_xyz', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    const userObj = {
      employeeId: employee.employeeId,
      username: employee.username,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      status: employee.status,
      roles: employee.roles,
      breakfastParticipationType: employee.breakfastParticipationType,
      forcePasswordChange: !!employee.forcePasswordChange,
      permissions,
      permissionsByRole
    };

    // Log audit login
    req.user = { employeeId: employee.employeeId, username: employee.username, name: employee.name, activeRole: employee.roles[0] };
    await logAudit(req, 'USER_LOGIN', { targetEmployeeId: employee.employeeId, targetUsername: employee.username, details: 'User logged in successfully' });

    res.json({
      success: true,
      token,
      user: userObj
    });
  } catch (error) {
    console.error('[Auth Login Error]', error.message);
    res.status(500).json({ success: false, message: 'Unable to process the request.', code: 'INTERNAL_SERVER_ERROR' });
  }
};

const getMe = async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.user.employeeId, isHardDeleted: false });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee account not found' });
    }

    const roleDocs = await Role.find({ code: { $in: employee.roles } });
    const permissionsByRole = {};
    roleDocs.forEach(r => {
      permissionsByRole[r.code] = r.permissions || [];
    });

    res.json({
      success: true,
      user: {
        ...employee.toJSON(),
        forcePasswordChange: !!employee.forcePasswordChange,
        permissions: req.user.allPermissions || req.user.permissions,
        permissionsByRole
      }
    });
  } catch (error) {
    console.error('[Auth GetMe Error]', error.message);
    res.status(500).json({ success: false, message: 'Unable to process the request.', code: 'INTERNAL_SERVER_ERROR' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirmation do not match' });
    }

    const employee = await Employee.findOne({ employeeId: req.user.employeeId, isHardDeleted: false });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee account not found' });
    }

    // If not in forced mode, verify current password
    if (!employee.forcePasswordChange && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, employee.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    employee.passwordHash = newHash;
    employee.forcePasswordChange = false;
    await employee.save();

    await logAudit(
      req,
      'PASSWORD_CHANGED',
      { targetEmployeeId: employee.employeeId, targetUsername: employee.username, details: 'User changed their account password' }
    );

    res.json({
      success: true,
      message: 'Password updated successfully. You may now continue using the platform.'
    });
  } catch (error) {
    console.error('[Auth ChangePassword Error]', error);
    res.status(500).json({ success: false, message: 'Unable to process the request.', code: 'INTERNAL_SERVER_ERROR' });
  }
};

module.exports = { login, getMe, changePassword };
