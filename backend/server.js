const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
require('dotenv').config();
const auditLogger = require('./middleware/auditLogger');
const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User');
const { setNotificationSocket } = require('./services/inAppNotificationService');
const { setAnnouncementSocket } = require('./services/announcementRealtimeService');

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

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  for (const allowed of allAllowedOrigins) {
    if (allowed instanceof RegExp && allowed.test(origin)) return true;
    if (allowed === origin) return true;
  }
  if (process.env.NODE_ENV !== 'production') {
    if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
    if (/^exp:\/\/.*/.test(origin)) return true;
  }
  return false;
};

app.use(cors({
  origin: function(origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error(`CORS not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error(`Socket CORS not allowed: ${origin}`));
    },
    credentials: true
  }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next();
    if (!process.env.JWT_SECRET) return next(new Error('Authentication configuration error'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role');
    if (!user) return next(new Error('User not found'));

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  if (socket.user) {
    socket.join(`user:${socket.user._id.toString()}`);
  }
});

setNotificationSocket(io);
setAnnouncementSocket(io);

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

// SECURITY: Serve static files securely - only allow access to vehicle photos
app.use('/uploads/vehicle-photos', express.static(path.join(__dirname, 'uploads/vehicle-photos'), {
  maxAge: '1d', // Cache for 1 day
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

// SECURITY: Serve announcement images
app.use('/uploads/announcements', express.static(path.join(__dirname, 'uploads/announcements'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

// SECURITY: Serve generated PDF exports from the backend uploads folder
app.use('/uploads/pdf-exports', express.static(path.join(__dirname, 'uploads/pdf-exports'), {
  maxAge: '1d',
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
    // Reconcile on every startup so schema expansions also reach existing databases.
    console.log('📦 Checking lot inventory...');
    let created = 0;
      
      // Phase 2 has 13 blocks; all other phases have 5. Every block has 20 lots.
      for (let phase = 1; phase <= 5; phase++) {
        const blockCount = phase === 2 ? 13 : 5;
        for (let block = 1; block <= blockCount; block++) {
          for (let lotNum = 1; lotNum <= 20; lotNum++) {
            const s = seed(phase, block, lotNum);
            const lotId = `P${phase}-B${block}-L${lotNum}`;
            const sqm = LOT_SIZES[lotNum % LOT_SIZES.length];
            
            if (await Lot.exists({ lotId })) continue;

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
    console.log(created > 0 ? `✅ Added ${created} missing lots` : `📊 Lot inventory is up to date (${existingCount} lots)`);
  } catch (error) {
    console.error('Initialize lots error:', error);
  }
}

function isStrongSeedPassword(password) {
  return typeof password === 'string'
    && password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function buildSeedUser({ prefix, defaultEmail, role, securityLevel }) {
  const email = (process.env[`${prefix}_EMAIL`] || defaultEmail).toLowerCase().trim();
  const password = process.env[`${prefix}_PASSWORD`];
  const firstName = process.env[`${prefix}_FIRST_NAME`] || (role === 'admin' ? 'System' : 'Security');
  const lastName = process.env[`${prefix}_LAST_NAME`] || 'Bootstrap';
  const phone = process.env[`${prefix}_PHONE`] || '';

  if (!password) {
    throw new Error(`${prefix}_PASSWORD is required when ENABLE_DEFAULT_ACCOUNT_SEED=true`);
  }

  if (!isStrongSeedPassword(password)) {
    throw new Error(`${prefix}_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol`);
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    password,
    role,
    ...(securityLevel ? { securityLevel } : {}),
    isApproved: true,
    isActive: true
  };
}

// Auto-seed function
async function autoSeedDatabase() {
  try {
    const User = require('./models/User');
    const Resource = require('./models/Resource');

    if (process.env.ENABLE_DEFAULT_ACCOUNT_SEED === 'true') {
      console.log('Checking bootstrap admin/security accounts...');

      const seedUsers = [
        buildSeedUser({
          prefix: 'SEED_ADMIN',
          defaultEmail: 'admin@vims.com',
          role: 'admin'
        }),
        buildSeedUser({
          prefix: 'SEED_SECURITY',
          defaultEmail: 'security@vims.com',
          role: 'security',
          securityLevel: 'head-officer'
        })
      ];

      for (const seedUser of seedUsers) {
        const existingUser = await User.findOne({ email: seedUser.email });

        if (existingUser) {
          console.log(`Bootstrap ${seedUser.role} account already exists: ${seedUser.email}`);
          continue;
        }

        await new User(seedUser).save();
        console.log(`Bootstrap ${seedUser.role} account created: ${seedUser.email}`);
      }
    } else {
      console.log('Bootstrap account seeding disabled.');
    }

    const existingResources = await Resource.find({});
    if (existingResources.length === 0) {
      console.log('Seeding resources...');
      
      const resources = [
        // Venues
        { type: 'venue', name: 'Covered Court', description: 'Outdoor basketball court with roof covering' },
        { type: 'venue', name: 'Swimming Pool', description: 'Community swimming pool' },
        { type: 'venue', name: 'Multi-Purpose Hall', description: 'Large hall for events and gatherings' },
        { type: 'venue', name: 'Function Room', description: 'Small room for meetings and functions' },
        { type: 'venue', name: 'Conference Room', description: 'Room equipped for conferences and presentations' },

        // Equipment
        { type: 'equipment', name: 'Tables', description: 'Folding tables for events' },
        { type: 'equipment', name: 'Chairs', description: 'Folding chairs for events' },
        { type: 'equipment', name: 'Speakers', description: 'Audio speakers for announcements' },
        { type: 'equipment', name: 'Microphones', description: 'Wireless microphones' },
        { type: 'equipment', name: 'Projector', description: 'Video projector for presentations' },
        { type: 'equipment', name: 'Podium', description: 'Speaker podium' },
      ];

      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        const resourcesWithCreator = resources.map(resource => ({
          ...resource,
          createdBy: adminUser._id,
        }));

        await Resource.insertMany(resourcesWithCreator);
        console.log('✅ Resources seeded successfully');
      } else {
        console.log('⚠️ Admin user not found, skipping resource seeding');
      }
    } else {
      console.log('Resources already exist, skipping resource seed...');
    }
    
  } catch (error) {
    console.error('Auto-seed error:', error.message);
  }
}

console.log('\n🔗 Registering routes...');
const { startReportScheduler } = require('./services/reportScheduler');
const announcementScheduler = require('./services/announcementScheduler');
const paymentReminderScheduler = require('./services/paymentReminderScheduler');

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
  const resourceRoutes = require('./routes/resources');
  console.log('/api/resources routes imported');
  const announcementRoutes = require('./routes/announcements');
  console.log('/api/announcements routes imported');
  const contactRoutes = require('./routes/contact');
  console.log('/api/contact routes imported');
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
  app.use('/api/resources', resourceRoutes);
  console.log('/api/resources routes registered');
  app.use('/api/announcements', announcementRoutes);
  console.log('/api/announcements routes registered');
  app.use('/api/contact', contactRoutes);
  console.log('/api/contact routes registered');
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
  paymentReminderScheduler.start();
  console.log('Payment reminder scheduler started');
  
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
server.listen(PORT, '0.0.0.0', () => {
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
  console.log('🔁 Auto-deploy trigger: 2026-08-21');
  console.log('\n✅ VIMS Backend is ready!');
});

module.exports = app;
