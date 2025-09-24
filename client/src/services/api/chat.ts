import api from './index';

export const chatAPI = {
  getChats: (params?: { type?: string; archived?: boolean }) =>
    api.get('/chats', { params }),

  getChat: (chatId: string) =>
    api.get(`/chats/${chatId}`),

  createChat: (data: {
    type: 'private' | 'group' | 'channel';
    name?: string;
    description?: string;
    member_ids: string[];
  }) => api.post('/chats', data),

  updateChat: (chatId: string, data: {
    name?: string;
    description?: string;
    settings?: any;
  }) => api.put(`/chats/${chatId}`, data),

  deleteChat: (chatId: string) =>
    api.delete(`/chats/${chatId}`),

  addMembers: (chatId: string, userIds: string[]) =>
    api.post(`/chats/${chatId}/members`, { user_ids: userIds }),

  removeMember: (chatId: string, userId: string) =>
    api.delete(`/chats/${chatId}/members/${userId}`),

  updateMemberRole: (chatId: string, userId: string, role: string) =>
    api.put(`/chats/${chatId}/members/${userId}/role`, { role }),

  archiveChat: (chatId: string, isArchived: boolean) =>
    api.put(`/chats/${chatId}/archive`, { is_archived: isArchived }),

  muteChat: (chatId: string, isMuted: boolean, mutedUntil?: Date) =>
    api.put(`/chats/${chatId}/mute`, { 
      is_muted: isMuted,
      muted_until: mutedUntil 
    }),

  pinChat: (chatId: string, isPinned: boolean) =>
    api.put(`/chats/${chatId}/pin`, { is_pinned: isPinned }),

  joinByInviteLink: (inviteLink: string) =>
    api.post('/chats/join', { invite_link: inviteLink }),

  generateInviteLink: (chatId: string) =>
    api.post(`/chats/${chatId}/invite-link`),

  searchChats: (query: string) =>
    api.get('/chats/search', { params: { q: query } }),
};