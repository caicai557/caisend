import api from './index';

export const userAPI = {
  getMe: () => api.get('/users/me'),

  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    bio?: string;
    phone?: string;
    settings?: any;
  }) => api.put('/users/me', data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  searchUsers: (query: string, limit?: number, offset?: number) =>
    api.get('/users/search', {
      params: { q: query, limit, offset },
    }),

  getUser: (userId: string) =>
    api.get(`/users/${userId}`),

  getContacts: () =>
    api.get('/users/contacts'),

  addContact: (contactUserId: string, nickname?: string) =>
    api.post('/users/contacts', {
      contact_user_id: contactUserId,
      nickname,
    }),

  blockUser: (contactId: string, isBlocked: boolean) =>
    api.put(`/users/contacts/${contactId}/block`, { is_blocked: isBlocked }),

  updateStatus: (isOnline: boolean) =>
    api.put('/users/status', { is_online: isOnline }),

  deleteAccount: () =>
    api.delete('/users/me'),
};