import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Search,
  Call,
  Videocam,
  MoreVert,
  Info,
  Delete,
  Archive,
  VolumeOff,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setActiveChat, archiveChat, muteChat, deleteChat } from '../../store/slices/chatSlice';
import { toggleRightPanel, startCall } from '../../store/slices/uiSlice';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const ChatWindow: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { activeChat } = useAppSelector((state) => state.chat);
  const { rightPanelOpen } = useAppSelector((state) => state.ui);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleBack = () => {
    dispatch(setActiveChat(null));
    navigate('/');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleArchive = async () => {
    if (activeChat) {
      await dispatch(archiveChat({ 
        chatId: activeChat.id, 
        isArchived: !activeChat.is_archived 
      }));
      handleMenuClose();
    }
  };

  const handleMute = async () => {
    if (activeChat) {
      await dispatch(muteChat({ 
        chatId: activeChat.id, 
        isMuted: !activeChat.is_muted 
      }));
      handleMenuClose();
    }
  };

  const handleDelete = async () => {
    if (activeChat && window.confirm('Are you sure you want to delete this chat?')) {
      await dispatch(deleteChat(activeChat.id));
      dispatch(setActiveChat(null));
      navigate('/');
      handleMenuClose();
    }
  };

  const handleVoiceCall = () => {
    if (activeChat) {
      dispatch(startCall({ type: 'voice', chatId: activeChat.id }));
    }
  };

  const handleVideoCall = () => {
    if (activeChat) {
      dispatch(startCall({ type: 'video', chatId: activeChat.id }));
    }
  };

  const getChatName = () => {
    if (!activeChat) return '';
    
    if (activeChat.type === 'private') {
      const otherUser = activeChat.members?.find(m => m.id !== user?.id);
      return otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || otherUser.username : activeChat.name;
    }
    return activeChat.name || 'Chat';
  };

  const getChatAvatar = () => {
    if (!activeChat) return null;
    
    if (activeChat.avatar) return activeChat.avatar;
    if (activeChat.type === 'private') {
      const otherUser = activeChat.members?.find(m => m.id !== user?.id);
      return otherUser?.avatar;
    }
    return null;
  };

  const getChatStatus = () => {
    if (!activeChat) return '';
    
    if (activeChat.type === 'private') {
      const otherUser = activeChat.members?.find(m => m.id !== user?.id);
      if (otherUser?.is_online) return 'Online';
      if (otherUser?.last_seen) {
        const lastSeen = new Date(otherUser.last_seen);
        const now = new Date();
        const diff = now.getTime() - lastSeen.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'Last seen just now';
        if (minutes < 60) return `Last seen ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `Last seen ${hours} hour${hours > 1 ? 's' : ''} ago`;
        return `Last seen ${days} day${days > 1 ? 's' : ''} ago`;
      }
      return '';
    }
    
    if (activeChat.typingUsers && activeChat.typingUsers.length > 0) {
      const typingUser = activeChat.members?.find(m => activeChat.typingUsers?.includes(m.id));
      if (typingUser) {
        return `${typingUser.username} is typing...`;
      }
    }
    
    return `${activeChat.member_count || 0} members`;
  };

  const isOnline = () => {
    if (!activeChat || activeChat.type !== 'private') return false;
    const otherUser = activeChat.members?.find(m => m.id !== user?.id);
    return otherUser?.is_online || false;
  };

  if (!activeChat) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={handleBack} sx={{ mr: 2, display: { md: 'none' } }}>
            <ArrowBack />
          </IconButton>
          
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            color="success"
            invisible={!isOnline()}
          >
            <Avatar src={getChatAvatar()} sx={{ mr: 2 }}>
              {getChatName()?.[0]?.toUpperCase()}
            </Avatar>
          </Badge>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap>
              {getChatName()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getChatStatus()}
            </Typography>
          </Box>
          
          <IconButton>
            <Search />
          </IconButton>
          
          {activeChat.type === 'private' && (
            <>
              <IconButton onClick={handleVoiceCall}>
                <Call />
              </IconButton>
              <IconButton onClick={handleVideoCall}>
                <Videocam />
              </IconButton>
            </>
          )}
          
          <IconButton onClick={() => dispatch(toggleRightPanel())}>
            <Info color={rightPanelOpen ? 'primary' : 'inherit'} />
          </IconButton>
          
          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMute}>
              <VolumeOff sx={{ mr: 1 }} />
              {activeChat.is_muted ? 'Unmute' : 'Mute'}
            </MenuItem>
            <MenuItem onClick={handleArchive}>
              <Archive sx={{ mr: 1 }} />
              {activeChat.is_archived ? 'Unarchive' : 'Archive'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 1 }} />
              Delete Chat
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <MessageList />
      </Box>

      {/* Input */}
      <MessageInput />
    </Box>
  );
};

export default ChatWindow;