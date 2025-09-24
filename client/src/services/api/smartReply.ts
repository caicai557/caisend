import api from './index';

export const smartReplyAPI = {
  // 获取回复模板
  getTemplates: (params?: { chat_id?: string; is_active?: boolean }) =>
    api.get('/smart-reply/templates', { params }),

  // 创建回复模板
  createTemplate: (data: {
    reply_text: string;
    trigger_keywords: string[];
    delay_seconds: number;
    match_type: 'exact' | 'contains' | 'regex' | 'ai';
    priority?: number;
    chat_id?: string;
  }) => api.post('/smart-reply/templates', data),

  // 更新回复模板
  updateTemplate: (id: string, data: any) =>
    api.put(`/smart-reply/templates/${id}`, data),

  // 删除回复模板
  deleteTemplate: (id: string) =>
    api.delete(`/smart-reply/templates/${id}`),

  // 获取统计信息
  getStats: () =>
    api.get('/smart-reply/stats'),

  // 测试匹配
  testMatch: (message_text: string, chat_id?: string) =>
    api.post('/smart-reply/test-match', { message_text, chat_id }),

  // 获取自动回复状态
  getAutoReplyStatus: () =>
    api.get('/smart-reply/status'),

  // 设置自动回复状态
  setAutoReplyStatus: (enabled: boolean) =>
    api.post('/smart-reply/status', { enabled }),
};