const mongoose = require('mongoose');

const breakfastSettingSchema = new mongoose.Schema({
  cutoffTime: {
    type: String,
    required: true,
    default: '12:00' // HH:mm in 24h format
  },
  timezone: {
    type: String,
    required: true,
    default: 'Asia/Kolkata'
  },
  autoLockEnabled: {
    type: Boolean,
    default: true
  },
  breakfastFundLimit: {
    type: Number,
    required: true,
    default: 2500
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakfastSetting', breakfastSettingSchema);
