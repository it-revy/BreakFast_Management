const mongoose = require('mongoose');

const breakfastNonParticipationPeriodSchema = new mongoose.Schema({
  periodId: {
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
  fromDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  toDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  reasonCode: {
    type: String,
    required: true
  },
  reasonText: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    enum: ['EMPLOYEE', 'LEAVE_MANAGEMENT', 'ADMIN'],
    default: 'EMPLOYEE'
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakfastNonParticipationPeriod', breakfastNonParticipationPeriodSchema);
