import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Send,
  AttachFile,
  EmojiEmotions,
  Mic,
  Close,
  Reply,
  Edit,
} from '@mui/icons-material';
import SmartReplySettings from '../SmartReply/SmartReplySettings';
import EmojiPicker from 'emoji-picker-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { sendMessage, editMessage } from '../../store/slices/messageSlice';
import { 
  setReplyToMessage, 
  setEditingMessageId,
  setEmojiPickerOpen 
} from '../../store/slices/uiSlice';
import socketService from '../../services/socket';
import { fileAPI } from '../../services/api/file';

const MessageInput: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { activeChat } = useAppSelector((state) => state.chat);
  const { messages } = useAppSelector((state) => state.message);
  const { replyToMessage, editingMessageId, emojiPickerOpen } = useAppSelector((state) => state.ui);
  
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chatMessages = activeChat ? messages[activeChat.id] || [] : [];
  const editingMessage = editingMessageId 
    ? chatMessages.find(m => m.id === editingMessageId)
    : null;

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content || '');
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const handleTyping = () => {
    if (!isTyping && activeChat) {
      setIsTyping(true);
      socketService.typing(activeChat.id, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (activeChat) {
        setIsTyping(false);
        socketService.typing(activeChat.id, false);
      }
    }, 1000);
  };

  const handleSend = async () => {
    if (!message.trim() || !activeChat) return;

    if (editingMessageId && editingMessage) {
      // Edit message
      await dispatch(editMessage({
        messageId: editingMessageId,
        content: message.trim(),
      }));
      dispatch(setEditingMessageId(null));
    } else {
      // Send new message
      const messageData = {
        chat_id: activeChat.id,
        content: message.trim(),
        type: 'text' as const,
        reply_to_id: replyToMessage?.id,
      };

      // Send via socket for real-time delivery
      socketService.sendMessage({
        chatId: activeChat.id,
        content: message.trim(),
        type: 'text',
        replyToId: replyToMessage?.id,
        tempId: Date.now().toString(),
      });

      // Also send via API for persistence
      dispatch(sendMessage(messageData));
      
      if (replyToMessage) {
        dispatch(setReplyToMessage(null));
      }
    }

    setMessage('');
    setIsTyping(false);
    if (activeChat) {
      socketService.typing(activeChat.id, false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeChat) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const response = await fileAPI.uploadFile(file, activeChat.id);
        const fileData = response.data.file;
        
        // Send file message
        const messageData = {
          chat_id: activeChat.id,
          content: fileData.original_name,
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('video/') ? 'video' : 
                file.type.startsWith('audio/') ? 'audio' : 'file',
          metadata: {
            file_id: fileData.id,
            file_url: fileData.url,
            thumbnail_url: fileData.thumbnail_url,
            file_size: fileData.size,
            mime_type: fileData.mime_type,
          },
        };

        socketService.sendMessage({
          chatId: activeChat.id,
          content: messageData.content,
          type: messageData.type,
          metadata: messageData.metadata,
          tempId: Date.now().toString(),
        });

        dispatch(sendMessage(messageData));
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    dispatch(setReplyToMessage(null));
  };

  const handleCancelEdit = () => {
    dispatch(setEditingMessageId(null));
    setMessage('');
  };

  if (!activeChat) return null;

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
      {/* Reply/Edit indicator */}
      {(replyToMessage || editingMessage) && (
        <Paper sx={{ p: 1, mb: 1, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {replyToMessage ? <Reply sx={{ mr: 1 }} /> : <Edit sx={{ mr: 1 }} />}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {replyToMessage ? `Replying to ${replyToMessage.sender?.username}` : 'Edit message'}
              </Typography>
              <Typography variant="body2" noWrap>
                {replyToMessage?.content || editingMessage?.content}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={replyToMessage ? handleCancelReply : handleCancelEdit}
            >
              <Close />
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Input field */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <SmartReplySettings />
        <IconButton onClick={() => fileInputRef.current?.click()}>
          <AttachFile />
        </IconButton>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
        />

        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyPress={handleKeyPress}
          sx={{ flexGrow: 1 }}
        />

        <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          <EmojiEmotions />
        </IconButton>

        {message.trim() ? (
          <IconButton color="primary" onClick={handleSend}>
            <Send />
          </IconButton>
        ) : (
          <IconButton color="primary">
            <Mic />
          </IconButton>
        )}
      </Box>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <Box sx={{ position: 'absolute', bottom: 80, right: 20, zIndex: 1000 }}>
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </Box>
      )}
    </Box>
  );
};

export default MessageInput;