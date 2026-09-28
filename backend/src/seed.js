const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const connectDB = require('./config/db');
const { seedDatabase } = require('./utils/seedData');

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI environment variable is required to run the seed script. Configure MongoDB Atlas connection in the environment.'
    );
  }

  console.log('[Seed] Initializing connection to MongoDB Atlas...');
  await connectDB();
  console.log('[Seed] Executing idempotent seed initialization...');
  await seedDatabase();
  console.log('[Seed] Seeding process completed successfully.');
  process.exit(0);
};

run().catch(err => {
  console.error('[Seed] FATAL: Seed execution aborted:', err.message);
  process.exit(1);
});

