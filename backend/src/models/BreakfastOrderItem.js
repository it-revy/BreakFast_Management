const mongoose = require('mongoose');

const breakfastOrderItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  businessDate: {
    type: String,
    required: true,
    index: true
  },
  orderType: {
    type: String,
    enum: ['INDIVIDUAL', 'COMMON'],
    required: true
  },
  employeeId: {
    type: String,
    default: null, // null for COMMON items
    uppercase: true
  },
  employeeName: {
    type: String,
    default: null
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  total: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakfastOrderItem', breakfastOrderItemSchema);
