const mongoose = require('mongoose');

const breakfastMoneyTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  transactionDate: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  transactionTime: {
    type: String, // HH:mm or HH:mm AM/PM
    required: true
  },
  type: {
    type: String,
    enum: ['MONEY_RECEIVED', 'BREAKFAST_EXPENSE', 'ADJUSTMENT', 'REVERSAL'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfterTransaction: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    default: 'Finance'
  },
  referenceType: {
    type: String,
    enum: ['DAILY_ENTRY', 'ADDITIONAL_ORDER', 'MANUAL_EXPENSE', 'MONEY_RECEIVED', 'ADJUSTMENT', 'REVERSAL', 'BREAKFAST_FUND_REQUEST'],
    required: true
  },
  referenceId: {
    type: String,
    default: null
  },
  expenseCategory: {
    type: String,
    enum: ['DAILY_BREAKFAST', 'ADDITIONAL_ORDER', 'OTHER_BREAKFAST_EXPENSE', 'ADJUSTMENT', 'REVERSAL', 'MONEY_RECEIVED'],
    default: 'DAILY_BREAKFAST'
  },
  expensePurpose: {
    type: String,
    enum: ['EMPLOYEE', 'CLIENT', 'OTHER'],
    default: 'EMPLOYEE'
  },
  description: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  }
}, { timestamps: true });

breakfastMoneyTransactionSchema.index({ transactionDate: 1, createdAt: 1 });

module.exports = mongoose.model('BreakfastMoneyTransaction', breakfastMoneyTransactionSchema);
