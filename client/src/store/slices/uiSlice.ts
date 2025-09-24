import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  searchOpen: boolean;
  settingsOpen: boolean;
  profileOpen: boolean;
  newChatDialogOpen: boolean;
  emojiPickerOpen: boolean;
  selectedMessageId: string | null;
  replyToMessage: any | null;
  forwardMessageId: string | null;
  editingMessageId: string | null;
  notification: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  } | null;
  contextMenu: {
    open: boolean;
    x: number;
    y: number;
    type: 'message' | 'chat' | 'user' | null;
    data: any;
  };
  dialogs: {
    deleteMessage: boolean;
    deleteChat: boolean;
    leaveChat: boolean;
    addMembers: boolean;
    chatInfo: boolean;
    userProfile: boolean;
    filePreview: boolean;
  };
  filePreview: {
    open: boolean;
    file: any | null;
  };
  call: {
    active: boolean;
    type: 'voice' | 'video' | null;
    chatId: string | null;
    participants: any[];
  };
}

const initialState: UIState = {
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  sidebarOpen: true,
  rightPanelOpen: false,
  searchOpen: false,
  settingsOpen: false,
  profileOpen: false,
  newChatDialogOpen: false,
  emojiPickerOpen: false,
  selectedMessageId: null,
  replyToMessage: null,
  forwardMessageId: null,
  editingMessageId: null,
  notification: null,
  contextMenu: {
    open: false,
    x: 0,
    y: 0,
    type: null,
    data: null,
  },
  dialogs: {
    deleteMessage: false,
    deleteChat: false,
    leaveChat: false,
    addMembers: false,
    chatInfo: false,
    userProfile: false,
    filePreview: false,
  },
  filePreview: {
    open: false,
    file: null,
  },
  call: {
    active: false,
    type: null,
    chatId: null,
    participants: [],
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleRightPanel: (state) => {
      state.rightPanelOpen = !state.rightPanelOpen;
    },
    setRightPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.rightPanelOpen = action.payload;
    },
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload;
    },
    setSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.settingsOpen = action.payload;
    },
    setProfileOpen: (state, action: PayloadAction<boolean>) => {
      state.profileOpen = action.payload;
    },
    setNewChatDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.newChatDialogOpen = action.payload;
    },
    setEmojiPickerOpen: (state, action: PayloadAction<boolean>) => {
      state.emojiPickerOpen = action.payload;
    },
    setSelectedMessage: (state, action: PayloadAction<string | null>) => {
      state.selectedMessageId = action.payload;
    },
    setReplyToMessage: (state, action: PayloadAction<any | null>) => {
      state.replyToMessage = action.payload;
    },
    setForwardMessageId: (state, action: PayloadAction<string | null>) => {
      state.forwardMessageId = action.payload;
    },
    setEditingMessageId: (state, action: PayloadAction<string | null>) => {
      state.editingMessageId = action.payload;
    },
    showNotification: (state, action: PayloadAction<{
      message: string;
      severity: 'success' | 'error' | 'warning' | 'info';
    }>) => {
      state.notification = {
        open: true,
        message: action.payload.message,
        severity: action.payload.severity,
      };
    },
    hideNotification: (state) => {
      state.notification = null;
    },
    openContextMenu: (state, action: PayloadAction<{
      x: number;
      y: number;
      type: 'message' | 'chat' | 'user';
      data: any;
    }>) => {
      state.contextMenu = {
        open: true,
        x: action.payload.x,
        y: action.payload.y,
        type: action.payload.type,
        data: action.payload.data,
      };
    },
    closeContextMenu: (state) => {
      state.contextMenu = {
        open: false,
        x: 0,
        y: 0,
        type: null,
        data: null,
      };
    },
    openDialog: (state, action: PayloadAction<keyof UIState['dialogs']>) => {
      state.dialogs[action.payload] = true;
    },
    closeDialog: (state, action: PayloadAction<keyof UIState['dialogs']>) => {
      state.dialogs[action.payload] = false;
    },
    openFilePreview: (state, action: PayloadAction<any>) => {
      state.filePreview = {
        open: true,
        file: action.payload,
      };
    },
    closeFilePreview: (state) => {
      state.filePreview = {
        open: false,
        file: null,
      };
    },
    startCall: (state, action: PayloadAction<{
      type: 'voice' | 'video';
      chatId: string;
    }>) => {
      state.call = {
        active: true,
        type: action.payload.type,
        chatId: action.payload.chatId,
        participants: [],
      };
    },
    endCall: (state) => {
      state.call = {
        active: false,
        type: null,
        chatId: null,
        participants: [],
      };
    },
    addCallParticipant: (state, action: PayloadAction<any>) => {
      state.call.participants.push(action.payload);
    },
    removeCallParticipant: (state, action: PayloadAction<string>) => {
      state.call.participants = state.call.participants.filter(
        p => p.id !== action.payload
      );
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  toggleSidebar,
  setSidebarOpen,
  toggleRightPanel,
  setRightPanelOpen,
  setSearchOpen,
  setSettingsOpen,
  setProfileOpen,
  setNewChatDialogOpen,
  setEmojiPickerOpen,
  setSelectedMessage,
  setReplyToMessage,
  setForwardMessageId,
  setEditingMessageId,
  showNotification,
  hideNotification,
  openContextMenu,
  closeContextMenu,
  openDialog,
  closeDialog,
  openFilePreview,
  closeFilePreview,
  startCall,
  endCall,
  addCallParticipant,
  removeCallParticipant,
} = uiSlice.actions;

export default uiSlice.reducer;