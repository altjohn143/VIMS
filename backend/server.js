const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

console.log('\n📂 Starting VIMS Server...');

const app = express();

// Configure CORS
const os = require('os');
const networkInterfaces = os.networkInterfaces();
let localIP = 'localhost';

for (const name of Object.keys(networkInterfaces)) {
  for (const net of networkInterfaces[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      localIP = net.address;
      break;
    }
  }
}

app.use(cors({
  origin: [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006',
  'exp://localhost:19000',
  'exp://192.168.*.*:8081',
  `http://${localIP}:3000`,
  `http://${localIP}:8081`,
  'https://vims-one.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-user-data',
    'Cache-Control',
    'Pragma',
    'If-Modified-Since',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection - USE ENVIRONMENT VARIABLE
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vims_system';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
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
    const BLOCKS = ['A', 'B', 'C', 'D', 'E'];
    const LOTS_PER_BLOCK = 12;
    const LOT_SIZES = [120, 150, 180, 200, 240, 300];
    const HOUSE_TYPES = ['Single Family', 'Townhouse', 'Corner Lot', 'End Unit'];
    
    const seed = (block, lot) => (block.charCodeAt(0) * 31 + lot * 17) % 100;
    
    const existingCount = await Lot.countDocuments();
    if (existingCount === 0) {
      console.log('📦 Initializing lots in database...');
      let created = 0;
      
      for (const block of BLOCKS) {
        for (let lotNum = 1; lotNum <= LOTS_PER_BLOCK; lotNum++) {
          const s = seed(block, lotNum);
          const lotId = `${block}-${lotNum}`;
          const sqm = LOT_SIZES[lotNum % LOT_SIZES.length];
          
          const lot = new Lot({
            lotId,
            block,
            lotNumber: lotNum,
            status: 'vacant',
            type: HOUSE_TYPES[lotNum % HOUSE_TYPES.length],
            sqm,
            price: sqm * 18000 + s * 5000,
            address: `Block ${block}, Lot ${lotNum}, Casimiro Westville Homes`,
            features: sqm >= 200 ? ['Large Lot', 'Ready for Occupancy'] : ['Standard Lot', 'Ready for Occupancy'],
            photoSeed: s
          });
          await lot.save();
          created++;
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
    
    // Delete existing accounts to ensure clean slate
    await User.deleteMany({ email: { $in: ['admin@vims.com', 'security@vims.com'] } });
    console.log('Removed existing admin/security accounts');
    
    // Use plain text password - let the User model's pre-save hook hash it
    const plainPassword = 'admin123';
    
    // Create Admin with plain password
    const adminUser = new User({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@vims.com',
      phone: '9876543210',
      password: plainPassword,  // Plain text password - will be hashed by User model
      role: 'admin',
      isApproved: true,
      isActive: true
    });
    await adminUser.save();
    console.log('✅ Admin account created with password: admin123');

    // Create Security with plain password
    const securityUser = new User({
      firstName: 'Security',
      lastName: 'Officer',
      email: 'security@vims.com',
      phone: '9876543211',
      password: plainPassword,  // Plain text password - will be hashed by User model
      role: 'security',
      isApproved: true,
      isActive: true
    });
    await securityUser.save();
    console.log('✅ Security account created with password: admin123');
    
    console.log('\n✅ Login credentials:');
    console.log('   Admin: admin@vims.com / admin123');
    console.log('   Security: security@vims.com / admin123');
    
  } catch (error) {
    console.error('Auto-seed error:', error.message);
  }
}

console.log('\n🔗 Registering routes...');

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
  
  console.log('All routes registered successfully!');
  
} catch (error) {
  console.error('Error importing routes:', error.message);
  process.exit(1);
}

// Debug route to see all registered routes
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
    hasPaymongoSecret: !!process.env.PAYMONGO_SECRET_KEY,
    hasPaymongoPublic: !!process.env.PAYMONGO_PUBLIC_KEY,
    hasWebhookSecret: !!process.env.PAYMONGO_WEBHOOK_SECRET,
    frontendUrl: process.env.FRONTEND_URL,
    nodeEnv: process.env.NODE_ENV
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'VIMS Backend',
    timestamp: new Date().toISOString(),
    ip: localIP,
    endpoints: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/me',
      '/api/users',
      '/api/visitors',
      '/api/service-requests',
      '/api/lots',
      '/api/debug/routes'
    ]
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


// TEMPORARY TEST ENDPOINT - Direct password test
app.post('/api/test-password-direct', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { email, password } = req.body;
    const User = require('./models/User');
    
    console.log('Direct password test for:', email);
    
    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    console.log('User found, stored hash:', user.password);
    console.log('Test password:', password);
    
    // Test 1: Direct bcrypt compare
    const directCompare = await bcrypt.compare(password, user.password);
    console.log('Direct bcrypt.compare result:', directCompare);
    
    // Test 2: Using the model method
    const modelCompare = await user.comparePassword(password);
    console.log('Model compare result:', modelCompare);
    
    // Test 3: Create a fresh hash and compare
    const salt = await bcrypt.genSalt(10);
    const freshHash = await bcrypt.hash(password, salt);
    const testCompare = await bcrypt.compare(password, freshHash);
    console.log('Fresh hash test (should be true):', testCompare);
    
    res.json({
      success: true,
      email: user.email,
      directCompare,
      modelCompare,
      hashLength: user.password.length,
      freshHashTest: testCompare
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 handler
app.use('/api/*', (req, res) => {
  console.log(`Route not found: ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    error: 'API route not found',
    requested: req.originalUrl,
    method: req.method
  });
});

// Add this to your server.js before the 404 handler
app.get('/api/debug/check-users', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find({}).select('email role isApproved createdAt');
    res.json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}/api`);
  console.log(`Network: http://${localIP}:${PORT}/api`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Debug: http://localhost:${PORT}/api/debug/routes`);
  console.log(`Lots API: http://localhost:${PORT}/api/lots`);
  console.log('\n📱 Mobile Setup:');
  console.log(`   Android Emulator: http://10.0.2.2:${PORT}/api`);
  console.log(`   iOS Simulator: http://localhost:${PORT}/api`);
  console.log(`   Real Device: http://${localIP}:${PORT}/api`);
});

module.exports = app;