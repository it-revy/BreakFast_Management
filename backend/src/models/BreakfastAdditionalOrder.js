const mongoose = require('mongoose');

const breakfastAdditionalOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  businessDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  orderTitle: {
    type: String,
    default: 'Additional Breakfast / Snack Order'
  },
  orderTime: {
    type: String
  },
  applicableEmployeeSnapshot: [{
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true }
  }],
  applicableEmployeeCount: {
    type: Number,
    required: true,
    default: 0
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
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakfastAdditionalOrder', breakfastAdditionalOrderSchema);
