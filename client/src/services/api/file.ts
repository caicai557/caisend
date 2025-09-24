import api from './index';

export const fileAPI = {
  uploadFile: (file: File, chatId?: string, messageId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (chatId) formData.append('chat_id', chatId);
    if (messageId) formData.append('message_id', messageId);
    
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        // You can dispatch an action here to update upload progress
        console.log('Upload progress:', percentCompleted);
      },
    });
  },

  uploadMultipleFiles: (files: File[], chatId?: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (chatId) formData.append('chat_id', chatId);
    
    return api.post('/files/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getFile: (fileId: string) =>
    api.get(`/files/${fileId}`),

  downloadFile: (fileId: string) =>
    api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    }),

  deleteFile: (fileId: string) =>
    api.delete(`/files/${fileId}`),
};