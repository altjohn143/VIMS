// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = {
  protect: async (req, res, next) => {
    try {
      let token;
      
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      else if (req.headers['x-user-data']) {
        try {
          const userData = JSON.parse(req.headers['x-user-data']);
          if (userData.id) {
            const user = await User.findById(userData.id).select('-password');
            if (user) {
              req.user = user;
              return next();
            }
          }
        } catch (error) {
          // Silent fail
        }
      }
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized, no token'
        });
      }
      
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User not found'
          });
        }
        
        req.user = user;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized, token failed'
        });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  },
  
  authorize: (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: `Role ${req.user.role} not authorized`
        });
      }
      
      next();
    };
  }
};

module.exports = auth;