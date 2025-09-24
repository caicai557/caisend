import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { chatAPI } from '../../services/api/chat';
import { Chat, ChatMember } from '../../types';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  activeChatMembers: ChatMember[];
  loading: boolean;
  error: string | null;
  searchResults: Chat[];
}

const initialState: ChatState = {
  chats: [],
  activeChat: null,
  activeChatMembers: [],
  loading: false,
  error: null,
  searchResults: [],
};

export const fetchChats = createAsyncThunk(
  'chat/fetchChats',
  async (params?: { type?: string; archived?: boolean }) => {
    const response = await chatAPI.getChats(params);
    return response.data;
  }
);

export const fetchChat = createAsyncThunk(
  'chat/fetchChat',
  async (chatId: string) => {
    const response = await chatAPI.getChat(chatId);
    return response.data;
  }
);

export const createChat = createAsyncThunk(
  'chat/createChat',
  async (data: {
    type: 'private' | 'group' | 'channel';
    name?: string;
    description?: string;
    member_ids: string[];
  }) => {
    const response = await chatAPI.createChat(data);
    return response.data;
  }
);

export const updateChat = createAsyncThunk(
  'chat/updateChat',
  async ({ chatId, data }: {
    chatId: string;
    data: { name?: string; description?: string; settings?: any };
  }) => {
    const response = await chatAPI.updateChat(chatId, data);
    return response.data;
  }
);

export const addMembers = createAsyncThunk(
  'chat/addMembers',
  async ({ chatId, userIds }: { chatId: string; userIds: string[] }) => {
    const response = await chatAPI.addMembers(chatId, userIds);
    return { chatId, ...response.data };
  }
);

export const removeMembers = createAsyncThunk(
  'chat/removeMembers',
  async ({ chatId, userId }: { chatId: string; userId: string }) => {
    await chatAPI.removeMember(chatId, userId);
    return { chatId, userId };
  }
);

export const archiveChat = createAsyncThunk(
  'chat/archive',
  async ({ chatId, isArchived }: { chatId: string; isArchived: boolean }) => {
    const response = await chatAPI.archiveChat(chatId, isArchived);
    return { chatId, isArchived };
  }
);

export const muteChat = createAsyncThunk(
  'chat/mute',
  async ({ chatId, isMuted, mutedUntil }: {
    chatId: string;
    isMuted: boolean;
    mutedUntil?: Date;
  }) => {
    const response = await chatAPI.muteChat(chatId, isMuted, mutedUntil);
    return { chatId, isMuted, mutedUntil };
  }
);

export const pinChat = createAsyncThunk(
  'chat/pin',
  async ({ chatId, isPinned }: { chatId: string; isPinned: boolean }) => {
    const response = await chatAPI.pinChat(chatId, isPinned);
    return { chatId, isPinned };
  }
);

export const deleteChat = createAsyncThunk(
  'chat/delete',
  async (chatId: string) => {
    await chatAPI.deleteChat(chatId);
    return chatId;
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveChat: (state, action: PayloadAction<Chat | null>) => {
      state.activeChat = action.payload;
    },
    updateChatLastMessage: (state, action: PayloadAction<{
      chatId: string;
      message: any;
    }>) => {
      const chat = state.chats.find(c => c.id === action.payload.chatId);
      if (chat) {
        chat.last_message = action.payload.message;
        chat.last_message_at = new Date().toISOString();
      }
    },
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const chat = state.chats.find(c => c.id === action.payload);
      if (chat) {
        chat.unread_count = (chat.unread_count || 0) + 1;
      }
    },
    resetUnreadCount: (state, action: PayloadAction<string>) => {
      const chat = state.chats.find(c => c.id === action.payload);
      if (chat) {
        chat.unread_count = 0;
      }
    },
    addChat: (state, action: PayloadAction<Chat>) => {
      if (!state.chats.find(c => c.id === action.payload.id)) {
        state.chats.unshift(action.payload);
      }
    },
    updateChatTypingStatus: (state, action: PayloadAction<{
      chatId: string;
      userId: string;
      isTyping: boolean;
    }>) => {
      if (state.activeChat?.id === action.payload.chatId) {
        if (!state.activeChat.typingUsers) {
          state.activeChat.typingUsers = [];
        }
        if (action.payload.isTyping) {
          if (!state.activeChat.typingUsers.includes(action.payload.userId)) {
            state.activeChat.typingUsers.push(action.payload.userId);
          }
        } else {
          state.activeChat.typingUsers = state.activeChat.typingUsers.filter(
            id => id !== action.payload.userId
          );
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch chats
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.loading = false;
        state.chats = action.payload;
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch chats';
      })
      // Fetch single chat
      .addCase(fetchChat.fulfilled, (state, action) => {
        state.activeChat = action.payload;
        state.activeChatMembers = action.payload.members || [];
      })
      // Create chat
      .addCase(createChat.fulfilled, (state, action) => {
        state.chats.unshift(action.payload);
        state.activeChat = action.payload;
      })
      // Update chat
      .addCase(updateChat.fulfilled, (state, action) => {
        const index = state.chats.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.chats[index] = { ...state.chats[index], ...action.payload };
        }
        if (state.activeChat?.id === action.payload.id) {
          state.activeChat = { ...state.activeChat, ...action.payload };
        }
      })
      // Delete chat
      .addCase(deleteChat.fulfilled, (state, action) => {
        state.chats = state.chats.filter(c => c.id !== action.payload);
        if (state.activeChat?.id === action.payload) {
          state.activeChat = null;
        }
      })
      // Archive chat
      .addCase(archiveChat.fulfilled, (state, action) => {
        const chat = state.chats.find(c => c.id === action.payload.chatId);
        if (chat) {
          chat.is_archived = action.payload.isArchived;
        }
      })
      // Mute chat
      .addCase(muteChat.fulfilled, (state, action) => {
        const chat = state.chats.find(c => c.id === action.payload.chatId);
        if (chat) {
          chat.is_muted = action.payload.isMuted;
        }
      })
      // Pin chat
      .addCase(pinChat.fulfilled, (state, action) => {
        const chat = state.chats.find(c => c.id === action.payload.chatId);
        if (chat) {
          chat.is_pinned = action.payload.isPinned;
        }
      });
  },
});

export const {
  setActiveChat,
  updateChatLastMessage,
  incrementUnreadCount,
  resetUnreadCount,
  addChat,
  updateChatTypingStatus,
  clearError,
} = chatSlice.actions;

export default chatSlice.reducer;