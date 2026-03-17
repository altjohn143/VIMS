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

// Database connection
// mongoose.connect('mongodb://127.0.0.1:27017/vims_system', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// Database connection - USE ENVIRONMENT VARIABLE
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vims_system';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB Connected');
  await autoSeedDatabase();
})
.catch(err => console.error('MongoDB Error:', err));

// Auto-seed function
async function autoSeedDatabase() {
  try {
    const bcrypt = require('bcryptjs');
    const User = require('./models/User');
    
    const adminExists = await User.findOne({ email: 'admin@vims.com' });
    const securityExists = await User.findOne({ email: 'security@vims.com' });
    
    if (!adminExists || !securityExists) {
      console.log('Creating pre-registered accounts...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('SecurePass123!', salt);
      
      if (!adminExists) {
        await User.create({
          firstName: 'System',
          lastName: 'Administrator',
          email: 'admin@vims.com',
          phone: '9876543210',
          password: hashedPassword,
          role: 'admin',
          isApproved: true,
          isActive: true
        });
        console.log('Admin account created');
      }
      
      if (!securityExists) {
        await User.create({
          firstName: 'Security',
          lastName: 'Officer',
          email: 'security@vims.com',
          phone: '9876543211',
          password: hashedPassword,
          role: 'security',
          isApproved: true,
          isActive: true
        });
        console.log('Security account created');
      }
      
      console.log('Login credentials:');
      console.log('   Admin: admin@vims.com / SecurePass123!');
      console.log('   Security: security@vims.com / SecurePass123!');
    } else {
      console.log('Pre-registered accounts already exist');
    }
  } catch (error) {
    console.error('Auto-seed error:', error.message);
  }
}

console.log('\n🔗 Registering routes...');

// Import routes
try {
  const authRoutes = require('./routes/auth');
  console.log('/api/auth routes imported');
  
  const userRoutes = require('./routes/users');
  console.log('/api/users routes imported');
  
  const visitorRoutes = require('./routes/visitors');
  console.log('/api/visitors routes imported');
  
  const serviceRequestRoutes = require('./routes/serviceRequests');
  console.log('/api/service-requests routes imported');
  
  // Register routes
  app.use('/api/auth', authRoutes);
  console.log('/api/auth routes registered');
  
  app.use('/api/users', userRoutes);
  console.log('/api/users routes registered');
  
  app.use('/api/visitors', visitorRoutes);
  console.log('/api/visitors routes registered');
  
  app.use('/api/service-requests', serviceRequestRoutes);
  console.log('/api/service-requests routes registered');
  
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
  console.log('\n📱 Mobile Setup:');
  console.log(`   Android Emulator: http://10.0.2.2:${PORT}/api`);
  console.log(`   iOS Simulator: http://localhost:${PORT}/api`);
  console.log(`   Real Device: http://${localIP}:${PORT}/api`);
});

module.exports = app;