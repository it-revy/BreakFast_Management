const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
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

// Whitelist CORS configuration for Vercel frontend and authorized clients
const parseOrigins = (val) => {
  if (!val) return [];
  return val.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
};

const allowedOrigins = Array.from(new Set([
  ...parseOrigins(process.env.CORS_ORIGIN),
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.CLIENT_URL),
  'https://break-fast-management.vercel.app', // Explicit production Vercel frontend
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000'
]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin (health checks, curl, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, '');

    // Exact match against whitelist
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Support for Vercel preview deployments if explicitly enabled
    if (process.env.ALLOW_VERCEL_PREVIEWS === 'true' && /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    // Allow in local development mode
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return callback(null, true);
    }

    return callback(new Error('Blocked by CORS policy: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Role-Used']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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

// Health check endpoint (checks MongoDB connection status)
const mongoose = require('mongoose');
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (!isDbConnected) {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      message: 'Database connection is unavailable'
    });
  }

  res.status(200).json({
    success: true,
    status: 'healthy',
    database: 'connected'
  });
});

// Centralized production-safe error handler
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

  if (!isProduction) {
    console.error('[Global Error]', err);
  } else {
    // Production-safe logging: never leak stack traces or internal filesystem paths to console
    console.error(`[Global Error] [${req.method} ${req.path}]:`, err.message);
  }

  const statusCode = (typeof err.status === 'number' && err.status >= 400 && err.status < 600)
    ? err.status
    : 500;

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const startServer = async () => {
  try {
    console.log('[Server] Connecting to MongoDB Atlas before accepting requests...');
    await connectDB();
    console.log('[Server] Database connection verified. Starting HTTP server...');

    app.listen(PORT, HOST, () => {
      console.log(`[Server] Breakfast Management API running on ${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Docs] Swagger OpenAPI Documentation: http://localhost:${PORT}/api/docs`);
      }
    });
  } catch (error) {
    console.error(`[Server] FATAL: Database startup failure: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
