const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['IT_ADMIN', 'BREAKFAST_ADMIN', 'EMPLOYEE', 'CEO', 'FINANCE_MANAGER']
  },
  name: {
    type: String,
    required: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  description: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
