require('dotenv').config();
const connectDB = require('./config/db');
const { seedDatabase } = require('./utils/seedData');

const run = async () => {
  await connectDB();
  await seedDatabase();
  process.exit(0);
};

run().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
