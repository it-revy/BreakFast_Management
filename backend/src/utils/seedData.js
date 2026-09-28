const bcrypt = require('bcryptjs');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const Application = require('../models/Application');
const Employee = require('../models/Employee');
const BreakfastSetting = require('../models/BreakfastSetting');
const BreakfastReason = require('../models/BreakfastReason');

const permissionsData = [
  { code: '*', name: 'Full Administrative Access', module: 'PLATFORM', description: 'Unrestricted system access' },
  { code: 'breakfast.view_own', name: 'View Own Breakfast Status', module: 'BREAKFAST', description: 'View daily form and history' },
  { code: 'breakfast.submit', name: 'Submit Daily Breakfast Status', module: 'BREAKFAST', description: 'Submit YES/NO daily response' },
  { code: 'breakfast.history_own', name: 'View Own Breakfast History', module: 'BREAKFAST', description: 'View personal historical records' },
  { code: 'breakfast.view', name: 'View All Breakfast Status', module: 'BREAKFAST', description: 'View company wide daily status' },
  { code: 'breakfast.manage', name: 'Manage Daily Breakfast Operations', module: 'BREAKFAST', description: 'Manage records, actual status, and orders' },
  { code: 'breakfast.report', name: 'Generate Breakfast Reports', module: 'BREAKFAST', description: 'Access daily and monthly reports' },
  { code: 'breakfast.dashboard.view', name: 'View CEO/Executive Dashboard', module: 'BREAKFAST', description: 'Executive view of summary analytics' },
  { code: 'breakfast.employee.create', name: 'Create Employees', module: 'BREAKFAST', description: 'Add new employee records' },
  { code: 'breakfast.employee.read', name: 'Read Employee Records', module: 'BREAKFAST', description: 'View employee profiles and status' },
  { code: 'breakfast.employee.update', name: 'Update Employee Records', module: 'BREAKFAST', description: 'Modify employee info, participation types, and roles' },
  { code: 'breakfast.employee.deactivate', name: 'Deactivate Employees', module: 'BREAKFAST', description: 'Soft deactivate employee accounts' },
  { code: 'breakfast.holiday.manage', name: 'Manage Public Holidays', module: 'BREAKFAST', description: 'Add, view, and delete public company holidays' },
  { code: 'breakfast.settings.manage', name: 'Manage System Settings', module: 'BREAKFAST', description: 'Configure cutoff times and reason options' },
  { code: 'breakfast.money.view', name: 'View Breakfast Money Ledger', module: 'MONEY', description: 'View money balance and transactions' },
  { code: 'breakfast.money.request', name: 'Request Breakfast Money', module: 'MONEY', description: 'Request fund replenishment from Finance' },
  { code: 'breakfast.money.receive', name: 'Receive Money from Finance', module: 'MONEY', description: 'Record cash received from Finance' },
  { code: 'breakfast.money.receipt.verify', name: 'Verify Money Receipt', module: 'MONEY', description: 'Confirm money received' },
  { code: 'breakfast.money.expense.view', name: 'View Breakfast Expenses', module: 'MONEY', description: 'View expenses breakdown' },
  { code: 'breakfast.money.expense.create', name: 'Record Breakfast Expenses', module: 'MONEY', description: 'Create manual breakfast expenses' },
  { code: 'breakfast.money.adjust', name: 'Adjust Money Ledger', module: 'MONEY', description: 'Perform ledger adjustments' },
  { code: 'breakfast.money.report', name: 'Generate Money Statements', module: 'MONEY', description: 'Access daily and monthly money statements' },
  { code: 'finance.breakfast_fund.view', name: 'View Finance Breakfast Fund Dashboard', module: 'FINANCE', description: 'Access Finance Manager dashboard' },
  { code: 'finance.breakfast_fund.request.view', name: 'View Fund Requests', module: 'FINANCE', description: 'View pending and past fund requests' },
  { code: 'finance.breakfast_fund.request.approve', name: 'Approve Fund Requests', module: 'FINANCE', description: 'Approve breakfast fund request' },
  { code: 'finance.breakfast_fund.request.reject', name: 'Reject Fund Requests', module: 'FINANCE', description: 'Reject breakfast fund request' },
  { code: 'finance.breakfast_fund.provide', name: 'Provide Money for Fund Request', module: 'FINANCE', description: 'Record money provision for approved request' },
  { code: 'finance.breakfast_fund.report', name: 'Finance Fund Reports', module: 'FINANCE', description: 'View financial fund reports' },
  { code: 'breakfast.actual_status.override', name: 'Override Employee Actual Status', module: 'BREAKFAST', description: 'Override employee actual breakfast status' },
  { code: 'breakfast.audit.view', name: 'View Audit Logs', module: 'AUDIT', description: 'View system audit logs' },
  { code: 'user.password.reset', name: 'Reset User Passwords', module: 'PLATFORM', description: 'Reset employee login passwords' }
];

const rolesData = [
  {
    code: 'IT_ADMIN',
    name: 'IT Administrator',
    description: 'Full administrative access and system management',
    permissions: [
      '*',
      'user.password.reset',
      'breakfast.view',
      'breakfast.manage',
      'breakfast.report',
      'breakfast.employee.create',
      'breakfast.employee.read',
      'breakfast.employee.update',
      'breakfast.employee.deactivate',
      'breakfast.holiday.manage',
      'breakfast.settings.manage',
      'breakfast.audit.view',
      'breakfast.submit',
      'breakfast.view_own',
      'breakfast.history_own',
      'breakfast.money.view',
      'breakfast.money.request',
      'breakfast.money.receive',
      'breakfast.money.receipt.verify',
      'breakfast.money.expense.view',
      'breakfast.money.expense.create',
      'breakfast.money.adjust',
      'breakfast.money.report',
      'finance.breakfast_fund.view',
      'finance.breakfast_fund.request.view',
      'finance.breakfast_fund.request.approve',
      'finance.breakfast_fund.request.reject',
      'finance.breakfast_fund.provide',
      'finance.breakfast_fund.report',
      'breakfast.actual_status.override'
    ]
  },
  {
    code: 'BREAKFAST_ADMIN',
    name: 'Breakfast Administrator',
    description: 'Manages daily breakfast process, orders, reports, and holidays',
    permissions: [
      'breakfast.view',
      'breakfast.manage',
      'breakfast.report',
      'breakfast.employee.read',
      'breakfast.holiday.manage',
      'breakfast.submit',
      'breakfast.view_own',
      'breakfast.history_own',
      'breakfast.money.view',
      'breakfast.money.request',
      'breakfast.money.receive',
      'breakfast.money.receipt.verify',
      'breakfast.money.expense.view',
      'breakfast.money.expense.create',
      'breakfast.money.adjust',
      'breakfast.money.report',
      'breakfast.actual_status.override'
    ]
  },
  {
    code: 'FINANCE_MANAGER',
    name: 'Finance Manager',
    description: 'Manages fund approvals, provisions, and financial reports',
    permissions: [
      'finance.breakfast_fund.view',
      'finance.breakfast_fund.request.view',
      'finance.breakfast_fund.request.approve',
      'finance.breakfast_fund.request.reject',
      'finance.breakfast_fund.provide',
      'finance.breakfast_fund.report',
      'breakfast.money.view',
      'breakfast.money.report',
      'breakfast.view_own',
      'breakfast.submit',
      'breakfast.history_own'
    ]
  },
  {
    code: 'EMPLOYEE',
    name: 'Standard Employee',
    description: 'Standard employee submitting daily breakfast status',
    permissions: [
      'breakfast.view_own',
      'breakfast.submit',
      'breakfast.history_own'
    ]
  },
  {
    code: 'CEO',
    name: 'Chief Executive Officer',
    description: 'Executive reporting, analytics dashboard, employee management, and holiday overview',
    permissions: [
      'breakfast.report',
      'breakfast.dashboard.view',
      'breakfast.holiday.manage',
      'breakfast.employee.create',
      'breakfast.employee.read',
      'breakfast.employee.update',
      'breakfast.employee.deactivate',
      'breakfast.view_own',
      'breakfast.submit',
      'breakfast.history_own'
    ]
  }
];

const defaultReasons = [
  { code: 'FASTING', label: 'Fasting', isCustomAllowed: false, displayOrder: 1 },
  { code: 'ON_LEAVE', label: 'On Leave', isCustomAllowed: false, displayOrder: 2 },
  { code: 'WORKING_OUTSIDE', label: 'Working Outside', isCustomAllowed: false, displayOrder: 3 },
  { code: 'PERSONAL', label: 'Personal Reason', isCustomAllowed: false, displayOrder: 4 },
  { code: 'NOT_REQUIRED', label: 'Not Required', isCustomAllowed: false, displayOrder: 5 },
  { code: 'OTHER', label: 'Other', isCustomAllowed: true, displayOrder: 6 }
];

const seedDatabase = async () => {
  console.log('[Seed] Seeding platform permissions, roles, settings, and user list...');

  // 1. Seed Permissions
  for (const p of permissionsData) {
    await Permission.findOneAndUpdate({ code: p.code }, p, { upsert: true, new: true });
  }

  // 2. Seed Roles
  for (const r of rolesData) {
    await Role.findOneAndUpdate({ code: r.code }, r, { upsert: true, new: true });
  }

  // 3. Seed Application
  await Application.findOneAndUpdate(
    { code: 'BREAKFAST' },
    { code: 'BREAKFAST', name: 'Breakfast Management System', status: 'active' },
    { upsert: true, new: true }
  );

  // 4. Seed Breakfast Settings
  const existingSetting = await BreakfastSetting.findOne();
  if (!existingSetting) {
    await BreakfastSetting.create({
      cutoffTime: '12:00',
      timezone: 'Asia/Kolkata',
      autoLockEnabled: true,
      breakfastFundLimit: 2500
    });
  } else if (!existingSetting.breakfastFundLimit) {
    existingSetting.breakfastFundLimit = 2500;
    await existingSetting.save();
  }

  // 5. Seed Breakfast Reasons
  for (const reason of defaultReasons) {
    await BreakfastReason.findOneAndUpdate({ code: reason.code }, reason, { upsert: true, new: true });
  }

  // Safe migration for any legacy existing employees in DB missing username
  const unmigratedEmployees = await Employee.find({ $or: [{ username: { $exists: false } }, { username: null }, { username: '' }] });
  for (const emp of unmigratedEmployees) {
    let baseUsername = emp.email ? emp.email.split('@')[0].toLowerCase() : emp.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!baseUsername) baseUsername = emp.employeeId.toLowerCase().replace(/[^a-z0-9]/g, '');
    let candidate = baseUsername;
    let count = 1;
    while (await Employee.findOne({ username: candidate, _id: { $ne: emp._id } })) {
      candidate = `${baseUsername}${count}`;
      count++;
    }
    emp.username = candidate;
    await emp.save();
  }

  // 6. Seed Specified Production Accounts
  const defaultAccounts = [
    {
      employeeId: 'EMP-0001',
      username: 'vasudev',
      name: 'Vasudev Kava',
      email: 'vasudev@company.com',
      initialPasswordText: 'Vasudev123',
      phone: '+91 9876543210',
      department: 'IT Infrastructure',
      designation: 'IT Administrator',
      status: 'active',
      roles: ['IT_ADMIN', 'BREAKFAST_ADMIN', 'EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    },
    {
      employeeId: 'EMP-0002',
      username: 'faiz',
      name: 'Faiz Saiyad',
      email: 'faiz@company.com',
      initialPasswordText: 'Faiz123',
      phone: '+91 9876543211',
      department: 'Administration',
      designation: 'Breakfast Manager',
      status: 'active',
      roles: ['BREAKFAST_ADMIN', 'EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    },
    {
      employeeId: 'EMP-0003',
      username: 'rajneesh',
      name: 'Rajneesh Prasad',
      email: 'rajneesh@company.com',
      initialPasswordText: 'Rajneesh123',
      phone: '+91 9876543212',
      department: 'Executive Office',
      designation: 'Chief Executive Officer',
      status: 'active',
      roles: ['CEO', 'EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    },
    {
      employeeId: 'EMP-0004',
      username: 'jyoti',
      name: 'Jyoti Dutta',
      email: 'jyoti@company.com',
      initialPasswordText: 'Jyoti123',
      phone: '+91 9876543213',
      department: 'Engineering',
      designation: 'Software Engineer',
      status: 'active',
      roles: ['EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    },
    {
      employeeId: 'EMP-0005',
      username: 'hritika',
      name: 'Hritika',
      email: 'hritika@company.com',
      initialPasswordText: 'Hritika123',
      phone: '+91 9876543214',
      department: 'Quality Assurance',
      designation: 'QA Specialist',
      status: 'active',
      roles: ['EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    },
    {
      employeeId: 'EMP-0006',
      username: 'nisha',
      name: 'Nisha',
      email: 'nisha@company.com',
      initialPasswordText: 'Nisha123',
      phone: '+91 9876543215',
      department: 'Research & Development',
      designation: 'R&D Analyst',
      status: 'active',
      roles: ['EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    },
    {
      employeeId: 'EMP-0007',
      username: 'himani',
      name: 'Himani',
      email: 'himani@company.com',
      initialPasswordText: 'Himani123',
      phone: '+91 9876543216',
      department: 'Human Resources',
      designation: 'HR Executive',
      status: 'active',
      roles: ['EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    },
    {
      employeeId: 'EMP-0008',
      username: 'shahil',
      name: 'Shahil',
      email: 'shahil@company.com',
      initialPasswordText: 'Shahil123',
      phone: '+91 9876543217',
      department: 'Operations',
      designation: 'Operations Associate',
      status: 'active',
      roles: ['EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    },
    {
      employeeId: 'EMP-0009',
      username: 'finance.manager',
      name: 'Finance Manager',
      email: 'finance@company.com',
      initialPasswordText: 'Finance123',
      phone: '+91 9876543218',
      department: 'Finance & Accounts',
      designation: 'Finance Manager',
      status: 'active',
      roles: ['FINANCE_MANAGER', 'EMPLOYEE'],
      breakfastParticipationType: 'NORMAL'
    }
  ];

  // Remove any legacy demo employees not in production list
  const validIds = defaultAccounts.map(e => e.employeeId);
  await Employee.deleteMany({ employeeId: { $nin: validIds } });

  for (const account of defaultAccounts) {
    const existing = await Employee.findOne({ employeeId: account.employeeId });

    if (!existing) {
      const passwordHash = await bcrypt.hash(account.initialPasswordText, 10);
      await Employee.create({
        employeeId: account.employeeId,
        username: account.username,
        name: account.name,
        email: account.email,
        passwordHash,
        forcePasswordChange: true,
        phone: account.phone,
        department: account.department,
        designation: account.designation,
        status: account.status,
        roles: account.roles,
        breakfastParticipationType: account.breakfastParticipationType
      });
      console.log(`[Seed] Initial user created: ${account.username}`);
    } else {
      // Update metadata and ensure account fields are aligned
      existing.username = account.username;
      existing.name = account.name;
      existing.email = account.email;
      existing.phone = account.phone;
      existing.department = account.department;
      existing.designation = account.designation;
      existing.roles = account.roles;
      existing.breakfastParticipationType = account.breakfastParticipationType;

      // If user hasn't changed password yet (forcePasswordChange is true), missing hash, or explicit reset
      if (!existing.passwordHash || existing.forcePasswordChange || process.env.RESET_SEEDED_PASSWORDS === 'true') {
        existing.passwordHash = await bcrypt.hash(account.initialPasswordText, 10);
        existing.forcePasswordChange = true;
      }

      await existing.save();
    }
  }

  console.log('[Seed] System roles, permissions, settings, and production users initialized successfully');
};

module.exports = { seedDatabase };
