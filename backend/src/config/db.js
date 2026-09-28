const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Register connection-level event listeners once
let listenersRegistered = false;
let hasConnectedOnce = false;
const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('error', (err) => {
    // Suppress transient SRV lookup errors if handled by fallback resolver
    if (err.message && err.message.includes('querySrv')) return;
    console.error(`[MongoDB] Runtime connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    if (hasConnectedOnce) {
      console.warn('[MongoDB] Connection lost. Currently disconnected from MongoDB Atlas.');
    }
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Successfully reconnected to MongoDB Atlas.');
  });
};

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is required. Configure MongoDB Atlas connection in the environment.'
    );
  }

  registerConnectionListeners();

  const connectOptions = {
    serverSelectionTimeoutMS: 10000,
  };

  try {
    const conn = await mongoose.connect(mongoUri, connectOptions);
    hasConnectedOnce = true;
    console.log(`[MongoDB] Connected successfully to MongoDB Atlas (DB: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    // If local or ISP DNS blocks SRV resolution (querySrv error), use public DNS (8.8.8.8 / 1.1.1.1) to resolve Atlas
    if (error.message && (error.message.includes('querySrv') || error.message.includes('ENOTFOUND'))) {
      try {
        console.warn('[MongoDB] DNS SRV lookup failed on default resolver; retrying Atlas connection with public DNS...');
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const conn = await mongoose.connect(mongoUri, connectOptions);
        hasConnectedOnce = true;
        console.log(`[MongoDB] Connected successfully to MongoDB Atlas via public DNS (DB: ${conn.connection.name})`);
        return conn;
      } catch (retryError) {
        console.error(`[MongoDB] Atlas connection retry failed: ${retryError.message}`);
      }
    }

    // Production-safe logging: log diagnostic categories without exposing passwords or full URI
    if (error.name === 'MongoServerError' && error.code === 8000) {
      console.error('[MongoDB Error] Atlas Authentication Failed: Check your MongoDB Atlas database username and password.');
    } else if (error.message && (error.message.includes('bad auth') || error.message.includes('authentication failed'))) {
      console.error('[MongoDB Error] Atlas Authentication Failure: Invalid database credentials.');
    } else if (error.message && error.message.includes('querySrv')) {
      console.error('[MongoDB Error] Atlas DNS SRV Resolution Failure: Cluster hostname unreachable.');
    } else if (error.name === 'MongooseServerSelectionError' || (error.message && error.message.includes('timed out'))) {
      console.error('[MongoDB Error] Atlas Connection Timeout: Verify MongoDB Atlas Network Access allowlist (0.0.0.0/0 for Render).');
    } else {
      console.error(`[MongoDB Error] Connection failed: ${error.message}`);
    }

    // Never swallow or fall back to localhost. Production must fail clearly.
    throw error;
  }
};

module.exports = connectDB;

