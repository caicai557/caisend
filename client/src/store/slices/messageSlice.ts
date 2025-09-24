import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { messageAPI } from '../../services/api/message';
import { Message } from '../../types';

interface MessageState {
  messages: { [chatId: string]: Message[] };
  loading: boolean;
  error: string | null;
  hasMore: { [chatId: string]: boolean };
  searchResults: Message[];
}

const initialState: MessageState = {
  messages: {},
  loading: false,
  error: null,
  hasMore: {},
  searchResults: [],
};

export const fetchMessages = createAsyncThunk(
  'message/fetchMessages',
  async ({
    chatId,
    limit = 50,
    offset = 0,
    before,
    after,
  }: {
    chatId: string;
    limit?: number;
    offset?: number;
    before?: Date;
    after?: Date;
  }) => {
    const response = await messageAPI.getMessages(chatId, {
      limit,
      offset,
      before,
      after,
    });
    return { chatId, messages: response.data };
  }
);

export const sendMessage = createAsyncThunk(
  'message/sendMessage',
  async (data: {
    chat_id: string;
    content: string;
    type?: string;
    reply_to_id?: string;
    metadata?: any;
  }) => {
    const response = await messageAPI.sendMessage(data);
    return response.data;
  }
);

export const editMessage = createAsyncThunk(
  'message/editMessage',
  async ({ messageId, content }: { messageId: string; content: string }) => {
    const response = await messageAPI.editMessage(messageId, content);
    return response.data;
  }
);

export const deleteMessage = createAsyncThunk(
  'message/deleteMessage',
  async (messageId: string) => {
    await messageAPI.deleteMessage(messageId);
    return messageId;
  }
);

export const addReaction = createAsyncThunk(
  'message/addReaction',
  async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
    const response = await messageAPI.addReaction(messageId, emoji);
    return { messageId, ...response.data };
  }
);

export const pinMessage = createAsyncThunk(
  'message/pinMessage',
  async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
    const response = await messageAPI.pinMessage(messageId, isPinned);
    return { messageId, isPinned };
  }
);

export const forwardMessage = createAsyncThunk(
  'message/forwardMessage',
  async ({ messageId, chatIds }: { messageId: string; chatIds: string[] }) => {
    const response = await messageAPI.forwardMessage(messageId, chatIds);
    return response.data;
  }
);

export const searchMessages = createAsyncThunk(
  'message/search',
  async ({
    query,
    chatId,
    limit = 20,
    offset = 0,
  }: {
    query: string;
    chatId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await messageAPI.searchMessages({
      q: query,
      chat_id: chatId,
      limit,
      offset,
    });
    return response.data;
  }
);

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      const chatId = action.payload.chat_id;
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      
      // Check if message already exists
      const exists = state.messages[chatId].find(m => m.id === action.payload.id);
      if (!exists) {
        state.messages[chatId].push(action.payload);
        // Sort messages by created_at
        state.messages[chatId].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
    },
    updateMessage: (state, action: PayloadAction<Message>) => {
      const chatId = action.payload.chat_id;
      if (state.messages[chatId]) {
        const index = state.messages[chatId].findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.messages[chatId][index] = action.payload;
        }
      }
    },
    removeMessage: (state, action: PayloadAction<{ chatId: string; messageId: string }>) => {
      if (state.messages[action.payload.chatId]) {
        state.messages[action.payload.chatId] = state.messages[action.payload.chatId].filter(
          m => m.id !== action.payload.messageId
        );
      }
    },
    updateMessageReactions: (state, action: PayloadAction<{
      chatId: string;
      messageId: string;
      reactions: any;
    }>) => {
      const { chatId, messageId, reactions } = action.payload;
      if (state.messages[chatId]) {
        const message = state.messages[chatId].find(m => m.id === messageId);
        if (message) {
          message.reactions = reactions;
        }
      }
    },
    markMessageAsRead: (state, action: PayloadAction<{
      chatId: string;
      messageId: string;
      userId: string;
    }>) => {
      const { chatId, messageId, userId } = action.payload;
      if (state.messages[chatId]) {
        const message = state.messages[chatId].find(m => m.id === messageId);
        if (message && !message.read_by.includes(userId)) {
          message.read_by.push(userId);
        }
      }
    },
    clearChatMessages: (state, action: PayloadAction<string>) => {
      delete state.messages[action.payload];
      delete state.hasMore[action.payload];
    },
    clearAllMessages: (state) => {
      state.messages = {};
      state.hasMore = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { chatId, messages } = action.payload;
        
        if (!state.messages[chatId]) {
          state.messages[chatId] = [];
        }
        
        // Add new messages that don't exist
        const existingIds = new Set(state.messages[chatId].map(m => m.id));
        const newMessages = messages.filter(m => !existingIds.has(m.id));
        
        state.messages[chatId] = [...state.messages[chatId], ...newMessages].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        state.hasMore[chatId] = messages.length === 50;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      })
      // Send message
      .addCase(sendMessage.fulfilled, (state, action) => {
        const chatId = action.payload.chat_id;
        if (!state.messages[chatId]) {
          state.messages[chatId] = [];
        }
        state.messages[chatId].push(action.payload);
        state.messages[chatId].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      })
      // Edit message
      .addCase(editMessage.fulfilled, (state, action) => {
        const chatId = action.payload.chat_id;
        if (state.messages[chatId]) {
          const index = state.messages[chatId].findIndex(m => m.id === action.payload.id);
          if (index !== -1) {
            state.messages[chatId][index] = action.payload;
          }
        }
      })
      // Delete message
      .addCase(deleteMessage.fulfilled, (state, action) => {
        Object.keys(state.messages).forEach(chatId => {
          state.messages[chatId] = state.messages[chatId].filter(
            m => m.id !== action.payload
          );
        });
      })
      // Search messages
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      });
  },
});

export const {
  addMessage,
  updateMessage,
  removeMessage,
  updateMessageReactions,
  markMessageAsRead,
  clearChatMessages,
  clearAllMessages,
  clearError,
} = messageSlice.actions;

export default messageSlice.reducer;