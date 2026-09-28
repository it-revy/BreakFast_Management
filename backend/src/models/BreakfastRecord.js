const mongoose = require('mongoose');

const breakfastRecordSchema = new mongoose.Schema({
  recordId: {
    type: String,
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true,
    uppercase: true
  },
  businessDate: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  response: {
    type: String,
    enum: ['YES', 'NO', 'TAKING', 'NOT_TAKING'],
    required: true
  },
  employeeResponse: {
    type: String,
    enum: ['TAKING', 'NOT_TAKING', 'NO_RESPONSE'],
    default: 'TAKING'
  },
  actualStatus: {
    type: String,
    enum: ['TAKEN', 'NOT_TAKEN', 'NO_RESPONSE', 'NO_SHOW', null],
    default: null
  },
  actualStatusSource: {
    type: String,
    enum: ['EMPLOYEE_RESPONSE', 'ADMIN_OVERRIDE'],
    default: 'EMPLOYEE_RESPONSE'
  },
  reasonCode: {
    type: String,
    default: null
  },
  reasonText: {
    type: String,
    default: null
  },
  source: {
    type: String,
    enum: ['EMPLOYEE', 'LEAVE_MANAGEMENT', 'ADMIN'],
    default: 'EMPLOYEE'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  history: [{
    response: String,
    actualStatus: String,
    reasonCode: String,
    reasonText: String,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String }
  }]
}, { timestamps: true });

breakfastRecordSchema.index({ employeeId: 1, businessDate: 1 }, { unique: true });

module.exports = mongoose.model('BreakfastRecord', breakfastRecordSchema);
