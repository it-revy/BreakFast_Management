const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  auditId: {
    type: String,
    required: true,
    unique: true
  },
  application: {
    type: String,
    required: true,
    default: 'BREAKFAST'
  },
  action: {
    type: String,
    required: true
  },
  performedBy: {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    roleUsed: { type: String, required: true }
  },
  target: {
    recordId: { type: String },
    targetEmployeeId: { type: String },
    targetEmployeeName: { type: String },
    details: { type: String }
  },
  beforeState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  afterState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
