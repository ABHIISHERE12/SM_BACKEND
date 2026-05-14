const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Not authorized — no token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

 
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return sendError(res, 401, 'Not authorized — user no longer exists');
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Not authorized — invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Not authorized — token expired');
    }
    next(error);
  }
};

module.exports = { protect };
