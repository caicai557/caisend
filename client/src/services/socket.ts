import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import {
  addMessage,
  updateMessage,
  removeMessage,
  updateMessageReactions,
  markMessageAsRead,
} from '../store/slices/messageSlice';
import {
  updateChatLastMessage,
  incrementUnreadCount,
  updateChatTypingStatus,
} from '../store/slices/chatSlice';
import { showNotification } from '../store/slices/uiSlice';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      store.dispatch(
        showNotification({
          message: 'Connected to server',
          severity: 'success',
        })
      );
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        store.dispatch(
          showNotification({
            message: 'Failed to connect to server',
            severity: 'error',
          })
        );
      }
    });

    // Message events
    this.socket.on('new_message', (message) => {
      store.dispatch(addMessage(message));
      store.dispatch(
        updateChatLastMessage({
          chatId: message.chat_id,
          message,
        })
      );

      // Increment unread count if not in active chat
      const state = store.getState();
      if (state.chat.activeChat?.id !== message.chat_id) {
        store.dispatch(incrementUnreadCount(message.chat_id));
        
        // Show notification
        if (state.auth.user?.id !== message.sender_id) {
          this.showDesktopNotification(message);
        }
      }
    });

    this.socket.on('message_edited', (message) => {
      store.dispatch(updateMessage(message));
    });

    this.socket.on('message_deleted', (data) => {
      store.dispatch(
        removeMessage({
          chatId: data.chatId,
          messageId: data.messageId,
        })
      );
    });

    this.socket.on('reaction_updated', (data) => {
      store.dispatch(
        updateMessageReactions({
          chatId: data.chatId,
          messageId: data.messageId,
          reactions: data.reactions,
        })
      );
    });

    this.socket.on('message_read', (data) => {
      store.dispatch(
        markMessageAsRead({
          chatId: data.chatId,
          messageId: data.messageId,
          userId: data.userId,
        })
      );
    });

    // Typing events
    this.socket.on('user_typing', (data) => {
      store.dispatch(
        updateChatTypingStatus({
          chatId: data.chatId,
          userId: data.userId,
          isTyping: data.isTyping,
        })
      );
    });

    // User status events
    this.socket.on('user_status_changed', (data) => {
      // Update user status in the UI
      console.log('User status changed:', data);
    });

    // Call events
    this.socket.on('incoming_call', (data) => {
      console.log('Incoming call:', data);
      // Handle incoming call UI
    });

    this.socket.on('call_answered', (data) => {
      console.log('Call answered:', data);
    });

    this.socket.on('call_rejected', (data) => {
      console.log('Call rejected:', data);
    });

    this.socket.on('call_ended', (data) => {
      console.log('Call ended:', data);
    });

    this.socket.on('ice_candidate', (data) => {
      console.log('ICE candidate:', data);
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      store.dispatch(
        showNotification({
          message: error.message || 'An error occurred',
          severity: 'error',
        })
      );
    });
  }

  private showDesktopNotification(message: any) {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(
        message.sender?.username || 'New Message',
        {
          body: message.content || 'You have a new message',
          icon: message.sender?.avatar || '/logo192.png',
          tag: message.id,
        }
      );

      notification.onclick = () => {
        window.focus();
        // Navigate to chat
        notification.close();
      };
    }
  }

  // Emit events
  joinChat(chatId: string) {
    this.socket?.emit('join_chat', chatId);
  }

  leaveChat(chatId: string) {
    this.socket?.emit('leave_chat', chatId);
  }

  sendMessage(data: {
    chatId: string;
    content: string;
    type?: string;
    replyToId?: string;
    metadata?: any;
    tempId?: string;
  }) {
    this.socket?.emit('send_message', data);
  }

  typing(chatId: string, isTyping: boolean) {
    this.socket?.emit('typing', { chatId, isTyping });
  }

  markRead(chatId: string, messageId: string) {
    this.socket?.emit('mark_read', { chatId, messageId });
  }

  editMessage(messageId: string, content: string) {
    this.socket?.emit('edit_message', { messageId, content });
  }

  deleteMessage(messageId: string) {
    this.socket?.emit('delete_message', { messageId });
  }

  addReaction(messageId: string, emoji: string) {
    this.socket?.emit('add_reaction', { messageId, emoji });
  }

  // Call methods
  startCall(chatId: string, type: 'voice' | 'video', offer: any) {
    this.socket?.emit('call_start', { chatId, type, offer });
  }

  answerCall(callerId: string, answer: any) {
    this.socket?.emit('call_answer', { callerId, answer });
  }

  rejectCall(callerId: string) {
    this.socket?.emit('call_reject', { callerId });
  }

  endCall(chatId: string) {
    this.socket?.emit('call_end', { chatId });
  }

  sendIceCandidate(targetUserId: string, candidate: any) {
    this.socket?.emit('ice_candidate', { targetUserId, candidate });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  get isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;