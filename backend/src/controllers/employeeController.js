const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const BreakfastRecord = require('../models/BreakfastRecord');
const { logAudit } = require('../middleware/auditLogger');

// Helper to generate employee ID if not provided
const generateEmployeeId = async () => {
  const count = await Employee.countDocuments();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `EMP-${nextNum}`;
};

// Create Employee (BREAKFAST_ADMIN or IT_ADMIN)
const createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      username,
      name,
      email,
      password,
      phone,
      department,
      designation,
      status = 'active',
      roles = ['EMPLOYEE'],
      breakfastParticipationType = 'NORMAL'
    } = req.body;

    if (!name || !email || !department || !designation) {
      return res.status(400).json({ success: false, message: 'Name, email, department, and designation are required' });
    }

    const rawUsername = (username || email.split('@')[0] || name).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!rawUsername) {
      return res.status(400).json({ success: false, message: 'Valid username is required' });
    }

    const existingUsername = await Employee.findOne({ username: rawUsername });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: `Username "${rawUsername}" is already taken` });
    }

    const finalEmployeeId = employeeId ? employeeId.trim().toUpperCase() : await generateEmployeeId();

    const existingId = await Employee.findOne({ employeeId: finalEmployeeId });
    if (existingId) {
      return res.status(400).json({ success: false, message: `Employee ID ${finalEmployeeId} already exists` });
    }

    const existingEmail = await Employee.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: `Email ${email} is already registered` });
    }

    const rawPassword = password || 'Password123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const newEmployee = new Employee({
      employeeId: finalEmployeeId,
      username: rawUsername,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      phone: phone ? phone.trim() : '',
      department: department.trim(),
      designation: designation.trim(),
      status,
      roles: Array.isArray(roles) && roles.length > 0 ? roles : ['EMPLOYEE'],
      breakfastParticipationType
    });

    await newEmployee.save();

    const createdData = newEmployee.toJSON();

    // Log audit
    await logAudit(
      req,
      'EMPLOYEE_CREATED',
      { targetEmployeeId: finalEmployeeId, targetUsername: newEmployee.username, targetEmployeeName: newEmployee.name, details: 'Created new employee account' },
      null,
      createdData
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: createdData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create employee', error: error.message });
  }
};

// Get all employees with search & filter
const getEmployees = async (req, res) => {
  try {
    const { search, department, status, participationType } = req.query;

    const query = { isHardDeleted: false };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { username: searchRegex },
        { employeeId: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { designation: searchRegex }
      ];
    }

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (participationType && participationType !== 'ALL') {
      query.breakfastParticipationType = participationType;
    }

    const employees = await Employee.find(query).sort({ employeeId: 1 });

    res.json({
      success: true,
      count: employees.length,
      employees
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch employees', error: error.message });
  }
};

// Get single employee details with history
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findOne({ employeeId: id.toUpperCase(), isHardDeleted: false });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const recentRecords = await BreakfastRecord.find({ employeeId: employee.employeeId })
      .sort({ businessDate: -1 })
      .limit(30);

    res.json({
      success: true,
      employee,
      recentRecords
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch employee details', error: error.message });
  }
};

// Update Employee (Supports multi-role updating, participation type change, username edit, status toggle)
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      name,
      email,
      phone,
      department,
      designation,
      status,
      roles,
      breakfastParticipationType
    } = req.body;

    const employee = await Employee.findOne({ employeeId: id.toUpperCase(), isHardDeleted: false });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const beforeState = employee.toJSON();

    if (username && username.trim().toLowerCase() !== employee.username) {
      const normalizedUsername = username.trim().toLowerCase();
      const existingUser = await Employee.findOne({ username: normalizedUsername, _id: { $ne: employee._id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: `Username "${normalizedUsername}" is already in use` });
      }
      employee.username = normalizedUsername;
    }

    if (name) employee.name = name.trim();
    if (email) employee.email = email.trim().toLowerCase();
    if (phone !== undefined) employee.phone = phone.trim();
    if (department) employee.department = department.trim();
    if (designation) employee.designation = designation.trim();
    if (status) employee.status = status;
    if (Array.isArray(roles)) {
      employee.roles = roles; // Fully replaces roles array with selected list
    }
    if (breakfastParticipationType) {
      employee.breakfastParticipationType = breakfastParticipationType;
    }

    await employee.save();

    const afterState = employee.toJSON();

    // Determine sub-actions for granular auditing
    const actions = [];
    if (beforeState.username !== afterState.username) {
      actions.push('USERNAME_UPDATED');
    }
    if (beforeState.status !== afterState.status) {
      actions.push(afterState.status === 'active' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED');
    }
    if (beforeState.breakfastParticipationType !== afterState.breakfastParticipationType) {
      actions.push('PARTICIPATION_TYPE_CHANGED');
    }
    if (JSON.stringify(beforeState.roles) !== JSON.stringify(afterState.roles)) {
      actions.push('EMPLOYEE_ROLES_UPDATED');
    }
    if (actions.length === 0) actions.push('EMPLOYEE_UPDATED');

    for (const act of actions) {
      await logAudit(
        req,
        act,
        { targetEmployeeId: employee.employeeId, targetUsername: employee.username, targetEmployeeName: employee.name, details: `Updated ${act}` },
        beforeState,
        afterState
      );
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: afterState
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update employee', error: error.message });
  }
};

// Soft Deactivate Employee (DELETE /api/employees/:id)
const deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findOne({ employeeId: id.toUpperCase(), isHardDeleted: false });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const beforeState = employee.toJSON();
    employee.status = 'inactive';
    await employee.save();

    const afterState = employee.toJSON();

    await logAudit(
      req,
      'EMPLOYEE_DEACTIVATED',
      { targetEmployeeId: employee.employeeId, targetEmployeeName: employee.name, details: 'Deactivated employee account (Soft Delete)' },
      beforeState,
      afterState
    );

    res.json({
      success: true,
      message: `Employee ${employee.employeeId} deactivated successfully. Historical records preserved.`,
      employee: afterState
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate employee', error: error.message });
  }
};

// IT Admin Password Reset (POST /api/employees/:id/reset-password)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
    }

    const employee = await Employee.findOne({ employeeId: id.toUpperCase(), isHardDeleted: false });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    employee.passwordHash = passwordHash;
    await employee.save();

    await logAudit(
      req,
      'PASSWORD_CHANGED_BY_ADMIN',
      {
        targetEmployeeId: employee.employeeId,
        targetUsername: employee.username,
        targetEmployeeName: employee.name,
        performedBy: req.user.name,
        details: `Password reset for user ${employee.username} (${employee.employeeId}) by Admin`
      }
    );

    res.json({
      success: true,
      message: `Password for user "${employee.username}" updated successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message });
  }
};

// IT_ADMIN Only Hard Delete Operation with explicit confirmation requirement
const hardDeleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmCode } = req.body;

    if (confirmCode !== 'CONFIRM_PERMANENT_DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Permanent deletion requires explicit confirmation code "CONFIRM_PERMANENT_DELETE".'
      });
    }

    const employee = await Employee.findOne({ employeeId: id.toUpperCase() });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const beforeState = employee.toJSON();
    employee.isHardDeleted = true;
    employee.status = 'inactive';
    await employee.save();

    await logAudit(
      req,
      'EMPLOYEE_HARD_DELETED',
      { targetEmployeeId: employee.employeeId, targetEmployeeName: employee.name, details: 'PERMANENT HARD DELETE executed by IT_ADMIN' },
      beforeState,
      { isHardDeleted: true }
    );

    res.json({
      success: true,
      message: `Employee ${employee.employeeId} hard-deleted by IT_ADMIN.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to execute hard delete', error: error.message });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
  resetUserPassword,
  hardDeleteEmployee
};
