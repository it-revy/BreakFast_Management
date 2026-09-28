const AuditLog = require('../models/AuditLog');

/**
 * Log an audit entry into the shared company audit_logs collection.
 * 
 * @param {Object} req Express request object containing authenticated user info
 * @param {String} action Action name (e.g. EMPLOYEE_CREATED, PARTICIPATION_TYPE_CHANGED)
 * @param {Object} target Target object details { recordId, targetEmployeeId, targetEmployeeName, details }
 * @param {Object} beforeState State snapshot before operation (for updates/deactivations)
 * @param {Object} afterState State snapshot after operation
 */
const logAudit = async (req, action, target = {}, beforeState = null, afterState = null) => {
  try {
    const performedBy = {
      employeeId: req.user?.employeeId || 'SYSTEM',
      employeeName: req.user?.name || 'System Process',
      roleUsed: req.headers['x-role-used'] || req.user?.activeRole || (req.user?.roles && req.user.roles[0]) || 'SYSTEM'
    };

    const auditId = `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const auditEntry = new AuditLog({
      auditId,
      application: 'BREAKFAST',
      action,
      performedBy,
      target,
      beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : null,
      afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : null,
      timestamp: new Date()
    });

    await auditEntry.save();
    return auditEntry;
  } catch (error) {
    console.error(`[AuditLog Error] Failed to log action "${action}":`, error.message);
  }
};

module.exports = { logAudit };
