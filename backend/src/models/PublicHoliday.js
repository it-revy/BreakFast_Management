const mongoose = require('mongoose');

const publicHolidaySchema = new mongoose.Schema({
  holidayId: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('PublicHoliday', publicHolidaySchema);
