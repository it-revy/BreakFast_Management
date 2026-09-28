const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  roles: [{
    type: String,
    trim: true,
    enum: ['IT_ADMIN', 'BREAKFAST_ADMIN', 'EMPLOYEE', 'CEO', 'FINANCE_MANAGER']
  }],
  breakfastParticipationType: {
    type: String,
    enum: ['NORMAL', 'PERMANENT_NOT_TAKING'],
    default: 'NORMAL'
  },
  forcePasswordChange: {
    type: Boolean,
    default: false
  },
  isHardDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Exclude passwordHash when converting to JSON
employeeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('Employee', employeeSchema);
