const mongoose = require('mongoose');

const breakfastReasonSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  label: {
    type: String,
    required: true
  },
  isCustomAllowed: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakfastReason', breakfastReasonSchema);
