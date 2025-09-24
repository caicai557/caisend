const { User, Chat, ChatMember, Message, sequelize } = require('../models');

const socketHandler = (io, socket) => {
  console.log(`User ${socket.userId} connected`);

  // Join user's personal room
  socket.join(`user:${socket.userId}`);

  // Join all user's chat rooms
  joinUserChats(socket);

  // Update user online status
  updateUserStatus(socket.userId, true);

  // Handle joining a chat room
  socket.on('join_chat', async (chatId) => {
    try {
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id: chatId,
          user_id: socket.userId
        }
      });

      if (chatMember) {
        socket.join(`chat:${chatId}`);
        socket.emit('joined_chat', { chatId });
        
        // Notify other members
        socket.to(`chat:${chatId}`).emit('user_joined', {
          chatId,
          userId: socket.userId
        });
      }
    } catch (error) {
      console.error('Join chat error:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Handle leaving a chat room
  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat:${chatId}`);
    socket.emit('left_chat', { chatId });
  });

  // Handle sending a message
  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, type = 'text', replyToId, metadata } = data;

      // Verify user is member of chat
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id: chatId,
          user_id: socket.userId
        }
      });

      if (!chatMember || !chatMember.permissions.send_messages) {
        socket.emit('error', { message: 'Permission denied' });
        return;
      }

      // Create message
      const message = await Message.create({
        chat_id: chatId,
        sender_id: socket.userId,
        content,
        type,
        reply_to_id: replyToId,
        metadata: metadata || {},
        delivered_to: [socket.userId],
        read_by: [socket.userId]
      });

      // Update chat's last message time
      await Chat.update(
        { last_message_at: new Date() },
        { where: { id: chatId } }
      );

      // Update unread count for other members
      await ChatMember.update(
        { unread_count: sequelize.literal('unread_count + 1') },
        {
          where: {
            chat_id: chatId,
            user_id: { [require('sequelize').Op.ne]: socket.userId }
          }
        }
      );

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

      // Emit to all chat members
      io.to(`chat:${chatId}`).emit('new_message', completeMessage);
      
      // Send delivery confirmation to sender
      socket.emit('message_sent', {
        tempId: data.tempId,
        message: completeMessage
      });
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { 
        message: 'Failed to send message',
        tempId: data.tempId 
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', async (data) => {
    const { chatId, isTyping } = data;
    
    socket.to(`chat:${chatId}`).emit('user_typing', {
      chatId,
      userId: socket.userId,
      isTyping
    });
  });

  // Handle message read
  socket.on('mark_read', async (data) => {
    try {
      const { chatId, messageId } = data;

      // Update message read status
      await Message.update(
        {
          read_by: sequelize.fn('array_append', sequelize.col('read_by'), socket.userId)
        },
        {
          where: {
            id: messageId,
            chat_id: chatId,
            [require('sequelize').Op.not]: {
              read_by: { [require('sequelize').Op.contains]: [socket.userId] }
            }
          }
        }
      );

      // Update chat member's last read message
      await ChatMember.update(
        {
          last_read_message_id: messageId,
          unread_count: 0
        },
        {
          where: {
            chat_id: chatId,
            user_id: socket.userId
          }
        }
      );

      // Notify sender about read receipt
      const message = await Message.findByPk(messageId);
      if (message) {
        io.to(`user:${message.sender_id}`).emit('message_read', {
          chatId,
          messageId,
          userId: socket.userId
        });
      }
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // Handle message edit
  socket.on('edit_message', async (data) => {
    try {
      const { messageId, content } = data;

      const message = await Message.findByPk(messageId);
      
      if (!message || message.sender_id !== socket.userId) {
        socket.emit('error', { message: 'Permission denied' });
        return;
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

      io.to(`chat:${message.chat_id}`).emit('message_edited', updatedMessage);
    } catch (error) {
      console.error('Edit message error:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // Handle message delete
  socket.on('delete_message', async (data) => {
    try {
      const { messageId } = data;

      const message = await Message.findByPk(messageId);
      
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user can delete message
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id: message.chat_id,
          user_id: socket.userId
        }
      });

      const canDelete = message.sender_id === socket.userId || 
                       chatMember.role === 'owner' ||
                       (chatMember.role === 'admin' && chatMember.permissions.delete_messages);

      if (!canDelete) {
        socket.emit('error', { message: 'Permission denied' });
        return;
      }

      await message.update({ is_deleted: true });

      io.to(`chat:${message.chat_id}`).emit('message_deleted', {
        chatId: message.chat_id,
        messageId
      });
    } catch (error) {
      console.error('Delete message error:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // Handle reaction
  socket.on('add_reaction', async (data) => {
    try {
      const { messageId, emoji } = data;

      const message = await Message.findByPk(messageId);
      
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Update reactions
      const reactions = message.reactions || {};
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      const userIndex = reactions[emoji].indexOf(socket.userId);
      if (userIndex === -1) {
        reactions[emoji].push(socket.userId);
      } else {
        reactions[emoji].splice(userIndex, 1);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      await message.update({ reactions });

      io.to(`chat:${message.chat_id}`).emit('reaction_updated', {
        chatId: message.chat_id,
        messageId,
        reactions
      });
    } catch (error) {
      console.error('Add reaction error:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });

  // Handle voice/video call initiation
  socket.on('call_start', async (data) => {
    const { chatId, type, offer } = data;
    
    // Get chat members
    const chatMembers = await ChatMember.findAll({
      where: {
        chat_id: chatId,
        user_id: { [require('sequelize').Op.ne]: socket.userId }
      }
    });

    // Notify other members about incoming call
    for (const member of chatMembers) {
      io.to(`user:${member.user_id}`).emit('incoming_call', {
        chatId,
        callerId: socket.userId,
        type,
        offer
      });
    }
  });

  // Handle call answer
  socket.on('call_answer', (data) => {
    const { callerId, answer } = data;
    io.to(`user:${callerId}`).emit('call_answered', {
      userId: socket.userId,
      answer
    });
  });

  // Handle call rejection
  socket.on('call_reject', (data) => {
    const { callerId } = data;
    io.to(`user:${callerId}`).emit('call_rejected', {
      userId: socket.userId
    });
  });

  // Handle call end
  socket.on('call_end', (data) => {
    const { chatId } = data;
    socket.to(`chat:${chatId}`).emit('call_ended', {
      userId: socket.userId
    });
  });

  // Handle ICE candidate
  socket.on('ice_candidate', (data) => {
    const { targetUserId, candidate } = data;
    io.to(`user:${targetUserId}`).emit('ice_candidate', {
      userId: socket.userId,
      candidate
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    updateUserStatus(socket.userId, false);
    
    // Notify all chats about user going offline
    notifyUserStatusChange(io, socket.userId, false);
  });
};

// Helper functions
async function joinUserChats(socket) {
  try {
    const chatMembers = await ChatMember.findAll({
      where: { user_id: socket.userId },
      attributes: ['chat_id']
    });

    for (const member of chatMembers) {
      socket.join(`chat:${member.chat_id}`);
    }
  } catch (error) {
    console.error('Join user chats error:', error);
  }
}

async function updateUserStatus(userId, isOnline) {
  try {
    await User.update(
      {
        is_online: isOnline,
        last_seen: new Date()
      },
      { where: { id: userId } }
    );
  } catch (error) {
    console.error('Update user status error:', error);
  }
}

async function notifyUserStatusChange(io, userId, isOnline) {
  try {
    const chatMembers = await ChatMember.findAll({
      where: { user_id: userId },
      attributes: ['chat_id']
    });

    for (const member of chatMembers) {
      io.to(`chat:${member.chat_id}`).emit('user_status_changed', {
        userId,
        isOnline,
        lastSeen: new Date()
      });
    }
  } catch (error) {
    console.error('Notify status change error:', error);
  }
}

module.exports = socketHandler;