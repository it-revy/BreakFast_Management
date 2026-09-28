const mongoose = require('mongoose');

const breakfastDailyEntrySchema = new mongoose.Schema({
  businessDate: {
    type: String, // YYYY-MM-DD
    required: true,
    unique: true
  },
  employeeSnapshot: [{
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    response: { type: String, enum: ['TAKING', 'NOT_TAKING', 'NO_RESPONSE', 'NOT TAKING', 'NO RESPONSE'], default: 'NO_RESPONSE' },
    actualStatus: { type: String, enum: ['TAKEN', 'NOT_TAKEN', 'NO_RESPONSE', null], default: 'NO_RESPONSE' },
    actualStatusSource: { type: String, enum: ['EMPLOYEE_RESPONSE', 'ADMIN_OVERRIDE'], default: 'EMPLOYEE_RESPONSE' },
    reasonCode: { type: String, default: null },
    reasonText: { type: String, default: null }
  }],
  summary: {
    totalActive: { type: Number, default: 0 },
    permanentNotTaking: { type: Number, default: 0 },
    onLeave: { type: Number, default: 0 },
    applicableCount: { type: Number, default: 0 },
    takingCount: { type: Number, default: 0 },
    notTakingCount: { type: Number, default: 0 },
    noResponseCount: { type: Number, default: 0 }
  },
  breakfastItems: [{
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  commonItems: [{
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    total: { type: Number, required: true }
  }],
  totalCost: {
    type: Number,
    required: true,
    default: 0
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakfastDailyEntry', breakfastDailyEntrySchema);
