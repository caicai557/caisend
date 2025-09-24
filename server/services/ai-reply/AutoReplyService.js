const ReplyMatcher = require('./ReplyMatcher');
const { Message, Chat, ChatMember } = require('../../models');

class AutoReplyService {
  constructor(io) {
    this.io = io;
    this.replyMatcher = new ReplyMatcher();
    this.pendingReplies = new Map();
  }

  /**
   * 处理新消息，检查是否需要自动回复
   */
  async handleNewMessage(message, userId) {
    try {
      // 检查是否是自己发送的消息
      if (message.sender_id === userId) return;

      // 获取聊天成员信息
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id: message.chat_id,
          user_id: userId
        }
      });

      if (!chatMember || !chatMember.permissions.send_messages) return;

      // 获取最近的消息历史
      const recentMessages = await Message.findAll({
        where: { chat_id: message.chat_id },
        order: [['created_at', 'DESC']],
        limit: 10
      });

      // 查找最佳回复
      const bestReply = await this.replyMatcher.findBestReply(
        recentMessages,
        userId,
        message.chat_id
      );

      if (bestReply) {
        // 清除之前的待发送回复
        this.cancelPendingReply(message.chat_id, userId);

        // 个性化回复内容
        const replyText = this.replyMatcher.personalizeReply(bestReply, {
          senderName: message.sender?.username
        });

        // 设置延时回复
        this.schedulReply({
          chatId: message.chat_id,
          userId: userId,
          content: replyText,
          delay: bestReply.delay_seconds * 1000,
          replyToId: message.id
        });
      }
    } catch (error) {
      console.error('Auto-reply error:', error);
    }
  }

  /**
   * 安排延时回复
   */
  schedulReply({ chatId, userId, content, delay, replyToId }) {
    const replyKey = `${chatId}-${userId}`;
    
    // 立即回复
    if (delay === 0) {
      this.sendAutoReply({ chatId, userId, content, replyToId });
      return;
    }

    // 延时回复
    const timeoutId = setTimeout(() => {
      this.sendAutoReply({ chatId, userId, content, replyToId });
      this.pendingReplies.delete(replyKey);
    }, delay);

    this.pendingReplies.set(replyKey, {
      timeoutId,
      content,
      scheduledAt: Date.now(),
      delay
    });
  }

  /**
   * 发送自动回复
   */
  async sendAutoReply({ chatId, userId, content, replyToId }) {
    try {
      // 创建消息
      const message = await Message.create({
        chat_id: chatId,
        sender_id: userId,
        content: content,
        type: 'text',
        reply_to_id: replyToId,
        metadata: { is_auto_reply: true }
      });

      // 更新聊天最后消息时间
      await Chat.update(
        { last_message_at: new Date() },
        { where: { id: chatId } }
      );

      // 通过Socket发送
      this.io.to(`chat:${chatId}`).emit('new_message', {
        ...message.toJSON(),
        is_auto_reply: true
      });

      console.log(`Auto-reply sent to chat ${chatId}`);
    } catch (error) {
      console.error('Failed to send auto-reply:', error);
    }
  }

  /**
   * 取消待发送的回复
   */
  cancelPendingReply(chatId, userId) {
    const replyKey = `${chatId}-${userId}`;
    const pending = this.pendingReplies.get(replyKey);
    
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingReplies.delete(replyKey);
      console.log(`Cancelled pending reply for ${replyKey}`);
    }
  }

  /**
   * 获取待发送回复状态
   */
  getPendingReplies(userId) {
    const userReplies = [];
    
    for (const [key, value] of this.pendingReplies.entries()) {
      if (key.includes(`-${userId}`)) {
        const [chatId] = key.split('-');
        userReplies.push({
          chatId,
          content: value.content,
          remainingTime: Math.max(0, 
            value.delay - (Date.now() - value.scheduledAt))
        });
      }
    }
    
    return userReplies;
  }

  /**
   * 清理所有待发送回复
   */
  clearAllPendingReplies() {
    for (const [key, value] of this.pendingReplies.entries()) {
      clearTimeout(value.timeoutId);
    }
    this.pendingReplies.clear();
  }
}

module.exports = AutoReplyService;