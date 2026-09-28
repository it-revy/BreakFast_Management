const mongoose = require('mongoose');

const breakfastOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  businessDate: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  vendorName: {
    type: String,
    default: 'Internal Catering / Vendor'
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakfastOrder', breakfastOrderSchema);
