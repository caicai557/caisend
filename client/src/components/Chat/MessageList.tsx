import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Reply,
  Edit,
  Delete,
  Forward,
  ContentCopy,
  PushPin,
  EmojiEmotions,
  Check,
  DoneAll,
} from '@mui/icons-material';
import { format } from 'date-fns';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchMessages, deleteMessage } from '../../store/slices/messageSlice';
import { 
  setReplyToMessage, 
  setEditingMessageId, 
  setForwardMessageId,
  showNotification 
} from '../../store/slices/uiSlice';
import socketService from '../../services/socket';

const MessageList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { activeChat } = useAppSelector((state) => state.chat);
  const { messages, hasMore } = useAppSelector((state) => state.message);
  const { replyToMessage, editingMessageId } = useAppSelector((state) => state.ui);
  
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    message: any;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const chatMessages = activeChat ? messages[activeChat.id] || [] : [];

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [chatMessages]);

  useEffect(() => {
    // Mark messages as read when viewing
    if (activeChat && chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (lastMessage && !lastMessage.read_by.includes(user?.id || '')) {
        socketService.markRead(activeChat.id, lastMessage.id);
      }
    }
  }, [activeChat, chatMessages, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(isNearBottom);
    }
  };

  const loadMoreMessages = () => {
    if (activeChat && hasMore[activeChat.id]) {
      const oldestMessage = chatMessages[0];
      if (oldestMessage) {
        dispatch(fetchMessages({
          chatId: activeChat.id,
          before: new Date(oldestMessage.created_at),
          limit: 50,
        }));
      }
    }
  };

  const handleContextMenu = (event: React.MouseEvent, message: any) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            message,
          }
        : null
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleReply = () => {
    if (contextMenu?.message) {
      dispatch(setReplyToMessage(contextMenu.message));
    }
    handleCloseContextMenu();
  };

  const handleEdit = () => {
    if (contextMenu?.message) {
      dispatch(setEditingMessageId(contextMenu.message.id));
    }
    handleCloseContextMenu();
  };

  const handleDelete = async () => {
    if (contextMenu?.message) {
      if (window.confirm('Delete this message?')) {
        await dispatch(deleteMessage(contextMenu.message.id));
      }
    }
    handleCloseContextMenu();
  };

  const handleForward = () => {
    if (contextMenu?.message) {
      dispatch(setForwardMessageId(contextMenu.message.id));
    }
    handleCloseContextMenu();
  };

  const handleCopy = () => {
    if (contextMenu?.message?.content) {
      navigator.clipboard.writeText(contextMenu.message.content);
      dispatch(showNotification({
        message: 'Message copied to clipboard',
        severity: 'success',
      }));
    }
    handleCloseContextMenu();
  };

  const formatMessageTime = (date: string) => {
    return format(new Date(date), 'HH:mm');
  };

  const formatDateDivider = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return format(messageDate, 'MMMM d, yyyy');
  };

  const shouldShowDateDivider = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(chatMessages[index].created_at).toDateString();
    const previousDate = new Date(chatMessages[index - 1].created_at).toDateString();
    return currentDate !== previousDate;
  };

  const renderMessageStatus = (message: any) => {
    if (message.sender_id !== user?.id) return null;

    if (message.read_by.length > 1) {
      return <DoneAll sx={{ fontSize: 16, color: 'primary.main' }} />;
    }
    if (message.delivered_to.length > 1) {
      return <DoneAll sx={{ fontSize: 16 }} />;
    }
    return <Check sx={{ fontSize: 16 }} />;
  };

  const renderMessage = (message: any, index: number) => {
    const isOwn = message.sender_id === user?.id;
    const sender = activeChat?.members?.find(m => m.id === message.sender_id);
    const showAvatar = activeChat?.type !== 'private' && !isOwn;

    return (
      <React.Fragment key={message.id}>
        {shouldShowDateDivider(index) && (
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Chip label={formatDateDivider(message.created_at)} size="small" />
          </Box>
        )}
        
        <Box
          sx={{
            display: 'flex',
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
            mb: 1,
            px: 2,
          }}
          onContextMenu={(e) => handleContextMenu(e, message)}
        >
          {showAvatar && (
            <Avatar
              src={sender?.avatar}
              sx={{ width: 32, height: 32, mr: 1 }}
            >
              {sender?.username?.[0]?.toUpperCase()}
            </Avatar>
          )}
          
          <Paper
            sx={{
              maxWidth: '70%',
              p: 1.5,
              bgcolor: isOwn ? 'primary.main' : 'background.paper',
              color: isOwn ? 'primary.contrastText' : 'text.primary',
              borderRadius: 2,
              borderTopLeftRadius: isOwn ? 16 : 4,
              borderTopRightRadius: isOwn ? 4 : 16,
            }}
          >
            {showAvatar && (
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                {sender?.username}
              </Typography>
            )}
            
            {message.replyTo && (
              <Paper
                sx={{
                  p: 1,
                  mb: 1,
                  bgcolor: isOwn ? 'rgba(255,255,255,0.1)' : 'action.hover',
                  borderLeft: 2,
                  borderColor: 'primary.light',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {message.replyTo.sender?.username}
                </Typography>
                <Typography variant="body2" noWrap>
                  {message.replyTo.content}
                </Typography>
              </Paper>
            )}
            
            <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
              {message.content}
            </Typography>
            
            {message.is_edited && (
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {' (edited)'}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {formatMessageTime(message.created_at)}
              </Typography>
              {renderMessageStatus(message)}
            </Box>
            
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                {Object.entries(message.reactions).map(([emoji, users]: [string, any]) => (
                  <Chip
                    key={emoji}
                    label={`${emoji} ${users.length}`}
                    size="small"
                    variant={users.includes(user?.id) ? 'filled' : 'outlined'}
                    onClick={() => socketService.addReaction(message.id, emoji)}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </React.Fragment>
    );
  };

  if (!activeChat) {
    return null;
  }

  return (
    <>
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          height: '100%',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column-reverse',
        }}
      >
        <div ref={messagesEndRef} />
        
        {chatMessages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
          }}>
            <Typography color="text.secondary">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {hasMore[activeChat.id] && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            
            {chatMessages.map((message, index) => renderMessage(message, index))}
          </Box>
        )}
      </Box>

      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleReply}>
          <Reply sx={{ mr: 1 }} /> Reply
        </MenuItem>
        {contextMenu?.message?.sender_id === user?.id && (
          <MenuItem onClick={handleEdit}>
            <Edit sx={{ mr: 1 }} /> Edit
          </MenuItem>
        )}
        <MenuItem onClick={handleForward}>
          <Forward sx={{ mr: 1 }} /> Forward
        </MenuItem>
        <MenuItem onClick={handleCopy}>
          <ContentCopy sx={{ mr: 1 }} /> Copy
        </MenuItem>
        {contextMenu?.message?.sender_id === user?.id && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} /> Delete
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default MessageList;