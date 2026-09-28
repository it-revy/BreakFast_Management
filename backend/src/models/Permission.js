const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  module: {
    type: String,
    required: true,
    default: 'BREAKFAST'
  },
  description: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);
