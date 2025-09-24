const express = require('express');
const { Op } = require('sequelize');
const { Chat, ChatMember, User, Message, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get user's chats
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, archived = false } = req.query;

    const whereClause = {};
    if (type) whereClause.type = type;

    const chats = await ChatMember.findAll({
      where: {
        user_id: req.user.id,
        is_archived: archived === 'true'
      },
      include: [{
        model: Chat,
        as: 'chat',
        where: whereClause,
        include: [
          {
            model: User,
            as: 'members',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar', 'is_online', 'last_seen'],
            through: { attributes: [] }
          },
          {
            model: Message,
            as: 'messages',
            limit: 1,
            order: [['created_at', 'DESC']],
            include: [{
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'first_name', 'last_name']
            }]
          }
        ]
      }],
      order: [[{ model: Chat, as: 'chat' }, 'last_message_at', 'DESC']]
    });

    const formattedChats = chats.map(cm => ({
      ...cm.chat.toJSON(),
      unread_count: cm.unread_count,
      is_muted: cm.is_muted,
      is_pinned: cm.is_pinned,
      last_message: cm.chat.messages[0] || null
    }));

    res.json(formattedChats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Failed to get chats' });
  }
});

// Create new chat
router.post('/', authenticateToken, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { type, name, description, member_ids = [] } = req.body;

    // Validate chat type
    if (!['private', 'group', 'channel'].includes(type)) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid chat type' });
    }

    // For private chats, ensure only 2 members
    if (type === 'private' && member_ids.length !== 1) {
      await t.rollback();
      return res.status(400).json({ message: 'Private chat must have exactly 2 members' });
    }

    // Check for existing private chat
    if (type === 'private') {
      const existingChat = await ChatMember.findOne({
        where: { user_id: req.user.id },
        include: [{
          model: Chat,
          as: 'chat',
          where: { type: 'private' },
          include: [{
            model: ChatMember,
            as: 'memberships',
            where: { user_id: member_ids[0] }
          }]
        }],
        transaction: t
      });

      if (existingChat) {
        await t.rollback();
        return res.status(400).json({ 
          message: 'Private chat already exists',
          chat_id: existingChat.chat_id 
        });
      }
    }

    // Create chat
    const chat = await Chat.create({
      type,
      name: type === 'private' ? null : name,
      description,
      created_by: req.user.id,
      invite_link: type !== 'private' ? uuidv4() : null
    }, { transaction: t });

    // Add creator as member
    await ChatMember.create({
      chat_id: chat.id,
      user_id: req.user.id,
      role: type === 'private' ? 'member' : 'owner'
    }, { transaction: t });

    // Add other members
    for (const userId of member_ids) {
      const user = await User.findByPk(userId, { transaction: t });
      if (user) {
        await ChatMember.create({
          chat_id: chat.id,
          user_id: userId,
          role: 'member'
        }, { transaction: t });
      }
    }

    // Update member count
    const memberCount = member_ids.length + 1;
    await chat.update({ member_count: memberCount }, { transaction: t });

    await t.commit();

    // Fetch complete chat data
    const completeChat = await Chat.findByPk(chat.id, {
      include: [{
        model: User,
        as: 'members',
        attributes: ['id', 'username', 'first_name', 'last_name', 'avatar', 'is_online', 'last_seen']
      }]
    });

    res.status(201).json(completeChat);
  } catch (error) {
    await t.rollback();
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Failed to create chat' });
  }
});

// Get chat by ID
router.get('/:chatId', authenticateToken, async (req, res) => {
  try {
    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id
      }
    });

    if (!chatMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const chat = await Chat.findByPk(req.params.chatId, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'is_online', 'last_seen'],
          through: { 
            attributes: ['role', 'joined_at', 'is_muted', 'is_pinned']
          }
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar']
        }
      ]
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({
      ...chat.toJSON(),
      unread_count: chatMember.unread_count,
      is_muted: chatMember.is_muted,
      is_pinned: chatMember.is_pinned,
      user_role: chatMember.role
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Failed to get chat' });
  }
});

// Update chat
router.put('/:chatId', authenticateToken, async (req, res) => {
  try {
    const { name, description, settings } = req.body;

    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id,
        role: { [Op.in]: ['owner', 'admin'] }
      }
    });

    if (!chatMember) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const chat = await Chat.findByPk(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await chat.update({
      name: name || chat.name,
      description: description !== undefined ? description : chat.description,
      settings: settings || chat.settings
    });

    res.json(chat);
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ message: 'Failed to update chat' });
  }
});

// Add members to chat
router.post('/:chatId/members', authenticateToken, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { user_ids } = req.body;

    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id
      },
      transaction: t
    });

    if (!chatMember) {
      await t.rollback();
      return res.status(403).json({ message: 'Access denied' });
    }

    const chat = await Chat.findByPk(req.params.chatId, { transaction: t });
    if (chat.type === 'private') {
      await t.rollback();
      return res.status(400).json({ message: 'Cannot add members to private chat' });
    }

    // Check permissions
    if (chatMember.role === 'member' && !chatMember.permissions.add_members) {
      await t.rollback();
      return res.status(403).json({ message: 'Permission denied' });
    }

    const addedMembers = [];
    for (const userId of user_ids) {
      const [member, created] = await ChatMember.findOrCreate({
        where: {
          chat_id: req.params.chatId,
          user_id: userId
        },
        defaults: { role: 'member' },
        transaction: t
      });

      if (created) {
        const user = await User.findByPk(userId, {
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar'],
          transaction: t
        });
        addedMembers.push(user);
      }
    }

    // Update member count
    const newMemberCount = await ChatMember.count({
      where: { chat_id: req.params.chatId },
      transaction: t
    });
    await chat.update({ member_count: newMemberCount }, { transaction: t });

    await t.commit();

    res.json({
      message: 'Members added successfully',
      added_members: addedMembers
    });
  } catch (error) {
    await t.rollback();
    console.error('Add members error:', error);
    res.status(500).json({ message: 'Failed to add members' });
  }
});

// Remove member from chat
router.delete('/:chatId/members/:userId', authenticateToken, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id
      },
      transaction: t
    });

    if (!chatMember) {
      await t.rollback();
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if user can remove members
    const canRemove = chatMember.role === 'owner' || 
                     (chatMember.role === 'admin' && req.params.userId === req.user.id) ||
                     req.params.userId === req.user.id;

    if (!canRemove) {
      await t.rollback();
      return res.status(403).json({ message: 'Permission denied' });
    }

    await ChatMember.destroy({
      where: {
        chat_id: req.params.chatId,
        user_id: req.params.userId
      },
      transaction: t
    });

    // Update member count
    const chat = await Chat.findByPk(req.params.chatId, { transaction: t });
    const newMemberCount = await ChatMember.count({
      where: { chat_id: req.params.chatId },
      transaction: t
    });
    await chat.update({ member_count: newMemberCount }, { transaction: t });

    await t.commit();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

// Update member role
router.put('/:chatId/members/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const requesterMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id,
        role: 'owner'
      }
    });

    if (!requesterMember) {
      return res.status(403).json({ message: 'Only owner can change roles' });
    }

    const targetMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.params.userId
      }
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (targetMember.role === 'owner') {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    await targetMember.update({ role });

    res.json({
      message: 'Role updated successfully',
      member: targetMember
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Failed to update role' });
  }
});

// Archive/unarchive chat
router.put('/:chatId/archive', authenticateToken, async (req, res) => {
  try {
    const { is_archived } = req.body;

    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id
      }
    });

    if (!chatMember) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await chatMember.update({ is_archived });

    res.json({
      message: is_archived ? 'Chat archived' : 'Chat unarchived',
      is_archived
    });
  } catch (error) {
    console.error('Archive chat error:', error);
    res.status(500).json({ message: 'Failed to update archive status' });
  }
});

// Mute/unmute chat
router.put('/:chatId/mute', authenticateToken, async (req, res) => {
  try {
    const { is_muted, muted_until } = req.body;

    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id
      }
    });

    if (!chatMember) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await chatMember.update({ 
      is_muted,
      muted_until: is_muted ? muted_until : null
    });

    res.json({
      message: is_muted ? 'Chat muted' : 'Chat unmuted',
      is_muted,
      muted_until
    });
  } catch (error) {
    console.error('Mute chat error:', error);
    res.status(500).json({ message: 'Failed to update mute status' });
  }
});

// Pin/unpin chat
router.put('/:chatId/pin', authenticateToken, async (req, res) => {
  try {
    const { is_pinned } = req.body;

    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id
      }
    });

    if (!chatMember) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await chatMember.update({ is_pinned });

    res.json({
      message: is_pinned ? 'Chat pinned' : 'Chat unpinned',
      is_pinned
    });
  } catch (error) {
    console.error('Pin chat error:', error);
    res.status(500).json({ message: 'Failed to update pin status' });
  }
});

// Delete chat (leave for members, delete for owner)
router.delete('/:chatId', authenticateToken, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id
      },
      transaction: t
    });

    if (!chatMember) {
      await t.rollback();
      return res.status(404).json({ message: 'Chat not found' });
    }

    const chat = await Chat.findByPk(req.params.chatId, { transaction: t });

    if (chatMember.role === 'owner' && chat.type !== 'private') {
      // Delete entire chat
      await Chat.destroy({
        where: { id: req.params.chatId },
        transaction: t
      });
    } else {
      // Just leave the chat
      await chatMember.destroy({ transaction: t });
      
      // Update member count
      const newMemberCount = await ChatMember.count({
        where: { chat_id: req.params.chatId },
        transaction: t
      });
      await chat.update({ member_count: newMemberCount }, { transaction: t });
    }

    await t.commit();

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Failed to delete chat' });
  }
});

module.exports = router;