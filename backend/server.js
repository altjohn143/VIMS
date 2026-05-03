const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();
const auditLogger = require('./middleware/auditLogger');
const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');

console.log('\n📂 Starting VIMS Server...');

const app = express();
app.set('trust proxy', 1);

// Add request ID to all requests for tracing
app.use(requestIdMiddleware);

// SECURITY: Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginResourcePolicy: {
    policy: 'cross-origin'
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// SECURITY: Strict CORS configuration - only allow specific origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006',
  'exp://localhost:19000',
  'https://vims-one.vercel.app',
  'https://casimiro-westville-homes-vims.online',
  // Allow Expo tunnel domains (used for mobile testing)
  'exp://eps6rsi-altjohn143-8081.exp.direct',
  /exp:\/\/.*\.exp\.direct/, // Match any Expo tunnel URL
];

// Add frontend URLs from environment variable
const frontendUrlsFromEnv = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

// Combine all origins (including env-based ones and regex patterns)
const allAllowedOrigins = [...allowedOrigins, ...frontendUrlsFromEnv];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    for (const allowed of allAllowedOrigins) {
      if (allowed instanceof RegExp) {
        if (allowed.test(origin)) {
          return callback(null, true);
        }
      } else if (allowed === origin) {
        return callback(null, true);
      }
    }

    // Allow localhost on any port for development
    if (process.env.NODE_ENV !== 'production') {
      const localhostPattern = /^http:\/\/localhost:\d+$/;
      if (localhostPattern.test(origin)) {
        return callback(null, true);
      }
      // Also allow Expo dev URLs in development
      const expoDevPattern = /^exp:\/\/.*/;
      if (expoDevPattern.test(origin)) {
        return callback(null, true);
      }
    }

    return callback(new Error(`CORS not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));

// Middleware
app.use(express.json({ limit: '10mb' })); // SECURITY: Add payload size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.'
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // 300 requests per window
  standardHeaders: true,
  legacyHeaders: false
});

// SECURITY: Serve static files securely - only allow access to profile photos
app.use('/uploads/profile-photos', express.static(path.join(__dirname, 'uploads/profile-photos'), {
  maxAge: '1d', // Cache for 1 day
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', auditLogger);

// Database connection - USE ENVIRONMENT VARIABLE
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vims_system';
mongoose.connect(MONGODB_URI)
.then(async () => {
  console.log('MongoDB Connected');
  await autoSeedDatabase();
  await initializeLots();
})
.catch(err => console.error('MongoDB Error:', err));

// Initialize lots in database
async function initializeLots() {
  try {
    const Lot = require('./models/Lot');
    const LOT_SIZES = [120, 150, 180, 200, 240, 300];
    const HOUSE_TYPES = ['Single Family', 'Townhouse', 'Corner Lot', 'End Unit'];
    
    const seed = (phase, block, lot) => (phase * 127 + block * 31 + lot * 17) % 100;
    
    const existingCount = await Lot.countDocuments();
    if (existingCount === 0) {
      console.log('📦 Initializing lots in database...');
      let created = 0;
      
      // 5 Phases × 5 Blocks × 20 Lots = 500 total lots
      for (let phase = 1; phase <= 5; phase++) {
        for (let block = 1; block <= 5; block++) {
          for (let lotNum = 1; lotNum <= 20; lotNum++) {
            const s = seed(phase, block, lotNum);
            const lotId = `P${phase}-B${block}-L${lotNum}`;
            const sqm = LOT_SIZES[lotNum % LOT_SIZES.length];
            
            const lot = new Lot({
              phase,
              lotId,
              block,
              lotNumber: lotNum,
              status: 'vacant',
              type: HOUSE_TYPES[lotNum % HOUSE_TYPES.length],
              sqm,
              price: sqm * 18000 + s * 5000,
              address: `Phase ${phase} - Block ${block} - Lot ${lotNum}`,
              features: sqm >= 200 ? ['Large Lot', 'Ready for Occupancy'] : ['Standard Lot', 'Ready for Occupancy'],
              photoSeed: s
            });
            await lot.save();
            created++;
          }
        }
      }
      console.log(`✅ Initialized ${created} lots in database`);
    } else {
      console.log(`📊 Database already has ${existingCount} lots`);
    }
  } catch (error) {
    console.error('Initialize lots error:', error);
  }
}

// Auto-seed function
async function autoSeedDatabase() {
  try {
    const bcrypt = require('bcryptjs');
    const User = require('./models/User');
    
    console.log('Checking/creating admin and security accounts...');
    
    // Check if accounts already exist before deleting
    const existingAdmin = await User.findOne({ email: 'admin@vims.com' });
    const existingSecurity = await User.findOne({ email: 'security@vims.com' });
    
    if (existingAdmin && existingSecurity) {
      console.log('Admin and Security accounts already exist, skipping seed...');
      return;
    }
    
    // Delete existing accounts to ensure clean slate (only if they exist)
    await User.deleteMany({ email: { $in: ['admin@vims.com', 'security@vims.com'] } });
    console.log('Removed existing admin/security accounts');
    
    // Use compliant password for production seeding (must be 12+ chars with uppercase, lowercase, number, special char)
    const compliantPassword = 'SecureVIMS@123';
    
    // Create Admin with compliant password
    const adminUser = new User({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@vims.com',
      phone: '9876543210',
      password: compliantPassword,
      role: 'admin',
      isApproved: true,
      isActive: true
    });
    await adminUser.save();
    console.log('✅ Admin account created with password: SecureVIMS@123');

    // Create Security with compliant password
    const securityUser = new User({
      firstName: 'Security',
      lastName: 'Officer',
      email: 'security@vims.com',
      phone: '9876543211',
      password: compliantPassword,
      role: 'security',
      isApproved: true,
      isActive: true
    });
    await securityUser.save();
    console.log('✅ Security account created with password: SecureVIMS@123');
    
    console.log('\n✅ Login credentials:');
    console.log('   Admin: admin@vims.com / SecureVIMS@123');
    console.log('   Security: security@vims.com / SecureVIMS@123');
    
  } catch (error) {
    console.error('Auto-seed error:', error.message);
  }
}

console.log('\n🔗 Registering routes...');
const { startReportScheduler } = require('./services/reportScheduler');
const announcementScheduler = require('./services/announcementScheduler');

// Import routes
try {
  const paymentRoutes = require('./routes/payments');
  const authRoutes = require('./routes/auth');
  console.log('/api/auth routes imported');
  
  const userRoutes = require('./routes/users');
  console.log('/api/users routes imported');
  
  const visitorRoutes = require('./routes/visitors');
  console.log('/api/visitors routes imported');
  
  const serviceRequestRoutes = require('./routes/serviceRequests');
  console.log('/api/service-requests routes imported');
  
  const lotRoutes = require('./routes/lots');
  console.log('/api/lots routes imported');
  const verificationRoutes = require('./routes/verifications');
  console.log('/api/verifications routes imported');
  const notificationRoutes = require('./routes/notifications');
  console.log('/api/notifications routes imported');
  const reportScheduleRoutes = require('./routes/reportSchedules');
  console.log('/api/report-schedules routes imported');
  const reservationRoutes = require('./routes/reservations');
  console.log('/api/reservations routes imported');
  const announcementRoutes = require('./routes/announcements');
  console.log('/api/announcements routes imported');
  const incidentRoutes = require('./routes/incidents');
  console.log('/api/incidents routes imported');
  const patrolRoutes = require('./routes/patrols');
  console.log('/api/patrols routes imported');
  const aiRoutes = require('./routes/ai');
  console.log('/api/ai routes imported');

  // Register routes
  app.use('/api/payments', paymentRoutes);
  console.log('/api/payments routes registered');

  app.use('/api/auth', authRoutes);
  console.log('/api/auth routes registered');
  
  app.use('/api/users', userRoutes);
  console.log('/api/users routes registered');
  
  app.use('/api/visitors', visitorRoutes);
  console.log('/api/visitors routes registered');
  
  app.use('/api/service-requests', serviceRequestRoutes);
  console.log('/api/service-requests routes registered');
  
  app.use('/api/lots', lotRoutes);
  console.log('/api/lots routes registered');
  app.use('/api/verifications', verificationRoutes);
  console.log('/api/verifications routes registered');
  app.use('/api/notifications', notificationRoutes);
  console.log('/api/notifications routes registered');
  app.use('/api/report-schedules', reportScheduleRoutes);
  console.log('/api/report-schedules routes registered');
  app.use('/api/reservations', reservationRoutes);
  console.log('/api/reservations routes registered');
  app.use('/api/announcements', announcementRoutes);
  console.log('/api/announcements routes registered');
  app.use('/api/incidents', incidentRoutes);
  console.log('/api/incidents routes registered');
  app.use('/api/patrols', patrolRoutes);
  console.log('/api/patrols routes registered');
  app.use('/api/ai', aiRoutes);
  console.log('/api/ai routes registered');

  console.log('All routes registered successfully!');
  startReportScheduler();
  console.log('Report scheduler started');
  announcementScheduler.start();
  console.log('Announcement scheduler started');
  
} catch (error) {
  console.error('Error importing routes:', error.message);
  process.exit(1);
}

// SECURITY: Remove all debug endpoints in production
if (process.env.NODE_ENV !== 'production') {
  // Debug route to see all registered routes (development only)
  app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(middleware => {
      if (middleware.route) {
        routes.push({
          path: middleware.route.path,
          methods: Object.keys(middleware.route.methods)
        });
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach(handler => {
          if (handler.route) {
            routes.push({
              path: '/api' + middleware.regexp.source.replace('\\/?(?=\\/|$)', '') + handler.route.path,
              methods: Object.keys(handler.route.methods)
            });
          }
        });
      }
    });
    
    res.json({
      success: true,
      routes: routes,
      count: routes.length
    });
  });

  app.get('/api/debug/env-check', (req, res) => {
    res.json({
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasPaymongoSecret: !!process.env.PAYMONGO_SECRET_KEY,
      hasPaymongoPublic: !!process.env.PAYMONGO_PUBLIC_KEY,
      hasWebhookSecret: !!process.env.PAYMONGO_WEBHOOK_SECRET,
      frontendUrl: process.env.FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV
    });
  });
}

// Health check endpoint (safe for production)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'VIMS Backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test-connection', (req, res) => {
  console.log('Test connection route hit!');
  res.json({ 
    success: true, 
    message: 'Server is running correctly',
    timestamp: new Date().toISOString()
  });
});

// SECURITY: Remove all test endpoints that expose sensitive information
// Removed: /api/test-password-direct, /api/debug/lots-count, /api/debug/check-users

// 404 handler
app.use('/api/*', (req, res) => {
  console.log(`Route not found: ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    error: 'API route not found'
  });
});

// SECURITY: Centralized error handler - don't expose sensitive information
// Must be registered LAST, after all other middleware and routes
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);

  // Only show debug endpoints in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📍 Lots API: http://localhost:${PORT}/api/lots`);
    console.log(`📍 Debug Lots: http://localhost:${PORT}/api/debug/lots-count`);
  }

  console.log('\n📱 Mobile Setup:');
  console.log(`   Android Emulator: http://10.0.2.2:${PORT}/api`);
  console.log(`   iOS Simulator: http://localhost:${PORT}/api`);
  console.log('\n✅ VIMS Backend is ready!');
});

module.exports = app;