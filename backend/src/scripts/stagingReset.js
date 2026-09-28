require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { seedDatabase } = require('../utils/seedData');

// Models to clean
const BreakfastRecord = require('../models/BreakfastRecord');
const BreakfastDailyEntry = require('../models/BreakfastDailyEntry');
const BreakfastAdditionalOrder = require('../models/BreakfastAdditionalOrder');
const BreakfastOrder = require('../models/BreakfastOrder');
const BreakfastOrderItem = require('../models/BreakfastOrderItem');
const BreakfastFundRequest = require('../models/BreakfastFundRequest');
const BreakfastMoneyTransaction = require('../models/BreakfastMoneyTransaction');
const BreakfastNonParticipationPeriod = require('../models/BreakfastNonParticipationPeriod');
const AuditLog = require('../models/AuditLog');

const runStagingReset = async () => {
  // STRICT SAFETY GUARD: Staging only. Never allow in production!
  const currentEnv = process.env.NODE_ENV;
  if (currentEnv !== 'staging') {
    console.error(`[SAFETY ERROR] Controlled staging reset is ONLY allowed when NODE_ENV=staging.`);
    console.error(`Current NODE_ENV="${currentEnv}". Operation aborted immediately.`);
    process.exit(1);
  }

  console.log('[Staging Reset] Connecting to database...');
  await connectDB();

  console.log('[Staging Reset] Wiping disposable test transactions, orders, entries, and money ledger...');
  await BreakfastRecord.deleteMany({});
  await BreakfastDailyEntry.deleteMany({});
  await BreakfastAdditionalOrder.deleteMany({});
  await BreakfastOrder.deleteMany({});
  await BreakfastOrderItem.deleteMany({});
  await BreakfastFundRequest.deleteMany({});
  await BreakfastMoneyTransaction.deleteMany({});
  await BreakfastNonParticipationPeriod.deleteMany({});
  await AuditLog.deleteMany({});

  console.log('[Staging Reset] Re-seeding baseline configuration, permissions, roles, and initial users...');
  process.env.RESET_SEEDED_PASSWORDS = 'true';
  await seedDatabase();

  console.log('====================================================');
  console.log('[Staging Reset] Staging database reset complete!');
  console.log('Metrics:');
  console.log('  Total Received:         ₹0');
  console.log('  Total Spent:            ₹0');
  console.log('  Current Balance:        ₹0');
  console.log('  Maximum Current Balance: ₹2,500');
  console.log('Initial accounts restored with <Name>123 default passwords and forcePasswordChange=true.');
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(0);
};

runStagingReset().catch(err => {
  console.error('[Staging Reset Failed]:', err.message);
  process.exit(1);
});
