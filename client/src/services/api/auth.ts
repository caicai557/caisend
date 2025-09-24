import api from './index';

export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),

  register: (userData: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => api.post('/auth/register', userData),

  logout: () => api.post('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }),

  resetPassword: (email: string) =>
    api.post('/auth/reset-password', { email }),

  changePassword: (data: {
    current_password: string;
    new_password: string;
  }) => api.post('/auth/change-password', data),

  enable2FA: () => api.post('/auth/2fa/enable'),

  disable2FA: (code: string) =>
    api.post('/auth/2fa/disable', { code }),

  verify2FA: (code: string) =>
    api.post('/auth/2fa/verify', { code }),
};