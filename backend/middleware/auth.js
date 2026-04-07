// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = {
  protect: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || '';
      const hasBearer = authHeader.startsWith('Bearer ');
      const token = hasBearer ? authHeader.split(' ')[1] : null;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized, no token'
        });
      }

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({
          success: false,
          error: 'Authentication configuration error'
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User not found'
          });
        }

        req.user = user;
        return next();
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