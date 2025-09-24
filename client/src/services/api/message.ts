import api from './index';

export const messageAPI = {
  getMessages: (chatId: string, params?: {
    limit?: number;
    offset?: number;
    before?: Date;
    after?: Date;
  }) => api.get(`/messages/chat/${chatId}`, { params }),

  sendMessage: (data: {
    chat_id: string;
    content: string;
    type?: string;
    reply_to_id?: string;
    metadata?: any;
  }) => api.post('/messages', data),

  editMessage: (messageId: string, content: string) =>
    api.put(`/messages/${messageId}`, { content }),

  deleteMessage: (messageId: string) =>
    api.delete(`/messages/${messageId}`),

  addReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/reactions`, { emoji }),

  pinMessage: (messageId: string, isPinned: boolean) =>
    api.put(`/messages/${messageId}/pin`, { is_pinned: isPinned }),

  forwardMessage: (messageId: string, chatIds: string[]) =>
    api.post(`/messages/${messageId}/forward`, { chat_ids: chatIds }),

  searchMessages: (params: {
    q: string;
    chat_id?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/messages/search', { params }),

  markAsRead: (messageId: string) =>
    api.post(`/messages/${messageId}/read`),

  getUnreadCount: () =>
    api.get('/messages/unread-count'),
};