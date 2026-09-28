const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/company_platform');
    console.log(`[MongoDB] Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    console.error(`[MongoDB] Error: ${error.message}`);
    // Notice: In dev or standalone testing without live mongo instance, we can operate gracefully
  }
};

module.exports = connectDB;
