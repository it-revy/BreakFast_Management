const mongoose = require('mongoose');

const breakfastFundRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  requestedBy: {
    type: String,
    required: true
  },
  requestDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  requestTime: {
    type: String,
    required: true
  },
  currentBalance: {
    type: Number,
    required: true
  },
  fundLimit: {
    type: Number,
    required: true,
    default: 2500
  },
  requestedAmount: {
    type: Number,
    required: true
  },
  expectedBalance: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: [
      'DRAFT',
      'SUBMITTED',
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'MONEY_PROVIDED',
      'RECEIPT_PENDING',
      'RECEIVED_VERIFIED'
    ],
    default: 'PENDING_APPROVAL'
  },
  approvedAmount: {
    type: Number,
    default: 0
  },
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  providedAmount: {
    type: Number,
    default: 0
  },
  providedBy: {
    type: String,
    default: null
  },
  providedAt: {
    type: Date,
    default: null
  },
  providedDate: {
    type: String,
    default: null
  },
  providedTime: {
    type: String,
    default: null
  },
  reference: {
    type: String,
    default: null
  },
  providedNote: {
    type: String,
    default: null
  },
  verifiedAmount: {
    type: Number,
    default: 0
  },
  verifiedBy: {
    type: String,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  differenceReported: {
    reported: { type: Boolean, default: false },
    expectedAmount: { type: Number, default: 0 },
    receivedAmount: { type: Number, default: 0 },
    differenceAmount: { type: Number, default: 0 },
    note: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakfastFundRequest', breakfastFundRequestSchema);
