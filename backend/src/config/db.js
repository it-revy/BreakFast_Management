const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/company_platform';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    // If connecting to Atlas fails locally due to querySrv DNS issues, fall back to local MongoDB in development
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging' && error.message.includes('querySrv')) {
      console.log('[MongoDB] Local DNS querySrv blocked; falling back to local MongoDB: mongodb://127.0.0.1:27017/company_platform');
      const fallbackConn = await mongoose.connect('mongodb://127.0.0.1:27017/company_platform');
      console.log(`[MongoDB] Connected locally: ${fallbackConn.connection.host} (DB: ${fallbackConn.connection.name})`);
      return fallbackConn;
    }
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      throw error;
    }
  }
};

module.exports = connectDB;
