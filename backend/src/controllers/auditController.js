const AuditLog = require('../models/AuditLog');

const getAuditLogs = async (req, res) => {
  try {
    const { action, employeeId, search, limit = 100 } = req.query;

    const query = {};

    if (action && action !== 'ALL') {
      query.action = action;
    }

    if (employeeId) {
      query['performedBy.employeeId'] = employeeId.toUpperCase();
    }

    if (search) {
      const s = new RegExp(search.trim(), 'i');
      query.$or = [
        { auditId: s },
        { action: s },
        { 'performedBy.employeeId': s },
        { 'performedBy.employeeName': s },
        { 'performedBy.roleUsed': s },
        { 'target.targetEmployeeId': s },
        { 'target.targetEmployeeName': s },
        { 'target.details': s }
      ];
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: error.message });
  }
};

module.exports = { getAuditLogs };
