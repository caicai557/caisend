const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('username').isLength({ min: 3, max: 50 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').optional().trim(),
  body('last_name').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, first_name, last_name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      first_name,
      last_name
    });

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toSafeObject(),
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('username').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last seen
    await user.update({ 
      last_seen: new Date(),
      is_online: true 
    });

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      message: 'Login successful',
      user: user.toSafeObject(),
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    const token = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      token,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    // In a real app, you might want to invalidate the token here
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
});

module.exports = router;