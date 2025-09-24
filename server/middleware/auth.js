const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password', 'two_factor_secret'] }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password', 'two_factor_secret'] }
    });

    if (!user || !user.is_active) {
      return next(new Error('Invalid or inactive user'));
    }

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

module.exports = {
  authenticateToken,
  authenticateSocket,
  generateToken,
  generateRefreshToken
};