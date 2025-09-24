const express = require('express');
const { Op } = require('sequelize');
const { User, Contact, Chat, ChatMember } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'two_factor_secret'] },
      include: [{
        model: Contact,
        as: 'contacts',
        include: [{
          model: User,
          as: 'contactUser',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar', 'is_online', 'last_seen']
        }]
      }]
    });

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, bio, phone, settings } = req.body;

    await req.user.update({
      first_name,
      last_name,
      bio,
      phone,
      settings: settings || req.user.settings
    });

    res.json({
      message: 'Profile updated successfully',
      user: req.user.toSafeObject()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Upload avatar
router.post('/me/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // Delete old avatar if exists
    if (req.user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', req.user.avatar);
      try {
        await fs.unlink(oldAvatarPath);
      } catch (err) {
        console.log('Could not delete old avatar:', err);
      }
    }

    await req.user.update({ avatar: avatarUrl });

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarUrl
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query too short' });
    }

    const users = await User.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: req.user.id } },
          { is_active: true },
          {
            [Op.or]: [
              { username: { [Op.iLike]: `%${q}%` } },
              { first_name: { [Op.iLike]: `%${q}%` } },
              { last_name: { [Op.iLike]: `%${q}%` } },
              { email: { [Op.iLike]: `%${q}%` } }
            ]
          }
        ]
      },
      attributes: ['id', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'is_online', 'last_seen'],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// Get user by ID
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'is_online', 'last_seen']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if users have a common chat
    const commonChat = await ChatMember.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: Chat,
        as: 'chat',
        where: { type: 'private' },
        include: [{
          model: ChatMember,
          as: 'memberships',
          where: { user_id: req.params.userId }
        }]
      }]
    });

    res.json({
      ...user.toJSON(),
      has_chat: !!commonChat,
      chat_id: commonChat?.chat_id
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

// Add contact
router.post('/contacts', authenticateToken, async (req, res) => {
  try {
    const { contact_user_id, nickname } = req.body;

    if (contact_user_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot add yourself as contact' });
    }

    const contactUser = await User.findByPk(contact_user_id);
    if (!contactUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [contact, created] = await Contact.findOrCreate({
      where: {
        user_id: req.user.id,
        contact_user_id
      },
      defaults: { nickname }
    });

    if (!created && nickname) {
      await contact.update({ nickname });
    }

    const updatedContact = await Contact.findByPk(contact.id, {
      include: [{
        model: User,
        as: 'contactUser',
        attributes: ['id', 'username', 'first_name', 'last_name', 'avatar', 'is_online', 'last_seen']
      }]
    });

    res.json(updatedContact);
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ message: 'Failed to add contact' });
  }
});

// Get contacts
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: User,
        as: 'contactUser',
        attributes: ['id', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'is_online', 'last_seen']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Failed to get contacts' });
  }
});

// Block/unblock user
router.put('/contacts/:contactId/block', authenticateToken, async (req, res) => {
  try {
    const { is_blocked } = req.body;
    
    const contact = await Contact.findOne({
      where: {
        id: req.params.contactId,
        user_id: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    await contact.update({ is_blocked });

    res.json({
      message: is_blocked ? 'User blocked' : 'User unblocked',
      contact
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Failed to update block status' });
  }
});

// Update online status
router.put('/status', authenticateToken, async (req, res) => {
  try {
    const { is_online } = req.body;
    
    await req.user.update({
      is_online,
      last_seen: new Date()
    });

    res.json({
      message: 'Status updated',
      is_online,
      last_seen: req.user.last_seen
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

module.exports = router;