const express = require('express');
const { Op } = require('sequelize');
const { Message, Chat, ChatMember, User, File, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get messages for a chat
router.get('/chat/:chatId', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, before, after } = req.query;

    // Check if user is member of chat
    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: req.params.chatId,
        user_id: req.user.id
      }
    });

    if (!chatMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const whereClause = {
      chat_id: req.params.chatId,
      is_deleted: false
    };

    if (before) {
      whereClause.created_at = { [Op.lt]: new Date(before) };
    }
    if (after) {
      whereClause.created_at = { [Op.gt]: new Date(after) };
    }

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar']
        },
        {
          model: Message,
          as: 'replyTo',
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'first_name', 'last_name']
          }]
        },
        {
          model: File,
          as: 'files'
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Mark messages as read
    const messageIds = messages.map(m => m.id);
    if (messageIds.length > 0) {
      await Message.update(
        {
          read_by: sequelize.fn('array_append', sequelize.col('read_by'), req.user.id)
        },
        {
          where: {
            id: { [Op.in]: messageIds },
            sender_id: { [Op.ne]: req.user.id },
            [Op.not]: {
              read_by: { [Op.contains]: [req.user.id] }
            }
          }
        }
      );

      // Update last read message
      await chatMember.update({
        last_read_message_id: messages[0].id,
        unread_count: 0
      });
    }

    res.json(messages.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to get messages' });
  }
});

// Send message
router.post('/', authenticateToken, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { chat_id, content, type = 'text', reply_to_id, metadata } = req.body;

    // Verify user is member of chat
    const chatMember = await ChatMember.findOne({
      where: {
        chat_id,
        user_id: req.user.id
      },
      transaction: t
    });

    if (!chatMember) {
      await t.rollback();
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check permissions
    if (!chatMember.permissions.send_messages) {
      await t.rollback();
      return res.status(403).json({ message: 'You cannot send messages in this chat' });
    }

    // Create message
    const message = await Message.create({
      chat_id,
      sender_id: req.user.id,
      content,
      type,
      reply_to_id,
      metadata: metadata || {},
      delivered_to: [req.user.id],
      read_by: [req.user.id]
    }, { transaction: t });

    // Update chat's last message time
    await Chat.update(
      { last_message_at: new Date() },
      { where: { id: chat_id }, transaction: t }
    );

    // Update unread count for other members
    await ChatMember.update(
      { unread_count: sequelize.literal('unread_count + 1') },
      {
        where: {
          chat_id,
          user_id: { [Op.ne]: req.user.id }
        },
        transaction: t
      }
    );

    await t.commit();

    // Fetch complete message with associations
    const completeMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar']
        },
        {
          model: Message,
          as: 'replyTo',
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'first_name', 'last_name']
          }]
        }
      ]
    });

    res.status(201).json(completeMessage);
  } catch (error) {
    await t.rollback();
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Edit message
router.put('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findByPk(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    // Check if message is too old to edit (24 hours)
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const maxEditTime = 24 * 60 * 60 * 1000; // 24 hours

    if (messageAge > maxEditTime) {
      return res.status(400).json({ message: 'Message is too old to edit' });
    }

    await message.update({
      content,
      is_edited: true,
      edited_at: new Date()
    });

    const updatedMessage = await Message.findByPk(message.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'first_name', 'last_name', 'avatar']
      }]
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user can delete message
    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: message.chat_id,
        user_id: req.user.id
      }
    });

    const canDelete = message.sender_id === req.user.id || 
                     chatMember.role === 'owner' ||
                     (chatMember.role === 'admin' && chatMember.permissions.delete_messages);

    if (!canDelete) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await message.update({ is_deleted: true });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// Add reaction to message
router.post('/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;

    const message = await Message.findByPk(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is member of chat
    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: message.chat_id,
        user_id: req.user.id
      }
    });

    if (!chatMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update reactions
    const reactions = message.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    const userIndex = reactions[emoji].indexOf(req.user.id);
    if (userIndex === -1) {
      reactions[emoji].push(req.user.id);
    } else {
      reactions[emoji].splice(userIndex, 1);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    await message.update({ reactions });

    res.json({
      message: 'Reaction updated',
      reactions
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
});

// Pin/unpin message
router.put('/:messageId/pin', authenticateToken, async (req, res) => {
  try {
    const { is_pinned } = req.body;

    const message = await Message.findByPk(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user has permission to pin messages
    const chatMember = await ChatMember.findOne({
      where: {
        chat_id: message.chat_id,
        user_id: req.user.id
      }
    });

    if (!chatMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const canPin = chatMember.role === 'owner' ||
                  chatMember.role === 'admin' ||
                  chatMember.permissions.pin_messages;

    if (!canPin) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await message.update({ is_pinned });

    if (is_pinned) {
      await Chat.update(
        { pinned_message_id: message.id },
        { where: { id: message.chat_id } }
      );
    }

    res.json({
      message: is_pinned ? 'Message pinned' : 'Message unpinned',
      is_pinned
    });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ message: 'Failed to pin message' });
  }
});

// Forward message
router.post('/:messageId/forward', authenticateToken, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { chat_ids } = req.body;

    const originalMessage = await Message.findByPk(req.params.messageId, {
      include: [{
        model: File,
        as: 'files'
      }],
      transaction: t
    });

    if (!originalMessage) {
      await t.rollback();
      return res.status(404).json({ message: 'Message not found' });
    }

    const forwardedMessages = [];

    for (const chatId of chat_ids) {
      // Check if user is member of target chat
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id: chatId,
          user_id: req.user.id
        },
        transaction: t
      });

      if (chatMember && chatMember.permissions.send_messages) {
        const forwardedMessage = await Message.create({
          chat_id: chatId,
          sender_id: req.user.id,
          content: originalMessage.content,
          type: originalMessage.type,
          forwarded_from_id: originalMessage.id,
          metadata: originalMessage.metadata
        }, { transaction: t });

        // Copy files if any
        for (const file of originalMessage.files) {
          await File.create({
            ...file.toJSON(),
            id: undefined,
            message_id: forwardedMessage.id,
            uploaded_by: req.user.id
          }, { transaction: t });
        }

        forwardedMessages.push(forwardedMessage);

        // Update chat's last message time
        await Chat.update(
          { last_message_at: new Date() },
          { where: { id: chatId }, transaction: t }
        );
      }
    }

    await t.commit();

    res.json({
      message: 'Message forwarded successfully',
      forwarded_count: forwardedMessages.length
    });
  } catch (error) {
    await t.rollback();
    console.error('Forward message error:', error);
    res.status(500).json({ message: 'Failed to forward message' });
  }
});

// Search messages
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, chat_id, limit = 20, offset = 0 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query too short' });
    }

    const whereClause = {
      content: { [Op.iLike]: `%${q}%` },
      is_deleted: false
    };

    if (chat_id) {
      // Check if user is member of chat
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id,
          user_id: req.user.id
        }
      });

      if (!chatMember) {
        return res.status(403).json({ message: 'Access denied' });
      }

      whereClause.chat_id = chat_id;
    } else {
      // Search only in user's chats
      const userChats = await ChatMember.findAll({
        where: { user_id: req.user.id },
        attributes: ['chat_id']
      });

      whereClause.chat_id = {
        [Op.in]: userChats.map(cm => cm.chat_id)
      };
    }

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar']
        },
        {
          model: Chat,
          as: 'chat',
          attributes: ['id', 'name', 'type']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(messages);
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;