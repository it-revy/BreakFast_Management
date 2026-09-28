require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const connectDB = require('./config/db');
const { seedDatabase } = require('./utils/seedData');

// Route imports
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const breakfastRoutes = require('./routes/breakfast');
const reportRoutes = require('./routes/report');
const auditRoutes = require('./routes/audit');
const settingsRoutes = require('./routes/settings');
const holidayRoutes = require('./routes/holiday');
const orderRoutes = require('./routes/order');
const moneyRoutes = require('./routes/money');

const app = express();

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow Swagger UI inline scripts
}));
app.use(cors());
app.use(express.json());

// Serve OpenAPI/Swagger UI docs at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/breakfast/money', moneyRoutes);
app.use('/api/breakfast', breakfastRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    application: 'Breakfast Management System (Shared Platform)',
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Kolkata',
    docs: 'http://localhost:5000/api/docs'
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  try {
    console.log('[Init] Syncing permissions and roles...');
    await seedDatabase();
  } catch (err) {
    console.log('[Init] Skip auto-seed or database not reachable yet:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Server] Breakfast Management API running on port ${PORT}`);
    console.log(`[Docs] Swagger OpenAPI Documentation: http://localhost:${PORT}/api/docs`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
