import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Badge,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  MoreVert,
  Add,
  Settings,
  Logout,
  Person,
  Archive,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setActiveChat } from '../../store/slices/chatSlice';
import { setNewChatDialogOpen } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';

const ChatSidebar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { chats, activeChat } = useAppSelector((state) => state.chat);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tabValue, setTabValue] = useState(0);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const handleChatClick = (chat: any) => {
    dispatch(setActiveChat(chat));
    navigate(`/chat/${chat.id}`);
  };

  const filteredChats = chats.filter((chat) => {
    if (tabValue === 1 && !chat.is_archived) return false;
    if (tabValue === 0 && chat.is_archived) return false;
    
    if (!searchQuery) return true;
    
    const chatName = chat.type === 'private' 
      ? chat.members?.find(m => m.id !== user?.id)?.username || chat.name
      : chat.name;
    
    return chatName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedChats = [...filteredChats].sort((a, b) => {
    // Pinned chats first
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    
    // Then by last message time
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });

  const getChatName = (chat: any) => {
    if (chat.type === 'private') {
      const otherUser = chat.members?.find(m => m.id !== user?.id);
      return otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || otherUser.username : chat.name;
    }
    return chat.name;
  };

  const getChatAvatar = (chat: any) => {
    if (chat.avatar) return chat.avatar;
    if (chat.type === 'private') {
      const otherUser = chat.members?.find(m => m.id !== user?.id);
      return otherUser?.avatar;
    }
    return null;
  };

  const getLastMessageText = (chat: any) => {
    if (!chat.last_message) return 'No messages yet';
    
    const message = chat.last_message;
    if (message.type === 'text') {
      return message.content;
    }
    return `[${message.type}]`;
  };

  const formatTime = (date: string | undefined) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    
    if (messageDate.toDateString() === now.toDateString()) {
      return format(messageDate, 'HH:mm');
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return format(messageDate, 'dd/MM/yyyy');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            src={user?.avatar}
            sx={{ width: 40, height: 40, mr: 2 }}
          >
            {user?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {user?.username}
          </Typography>
          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
              <Person sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
              <Settings sx={{ mr: 1 }} /> Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        {/* Tabs */}
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab label="Chats" />
          <Tab 
            label="Archived" 
            icon={<Badge badgeContent={chats.filter(c => c.is_archived).length} color="primary" />}
          />
        </Tabs>
      </Box>

      {/* Chat List */}
      <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {sortedChats.map((chat) => (
          <ListItem
            key={chat.id}
            button
            selected={activeChat?.id === chat.id}
            onClick={() => handleChatClick(chat)}
            sx={{
              borderLeft: chat.is_pinned ? 4 : 0,
              borderColor: 'primary.main',
              opacity: chat.is_muted ? 0.7 : 1,
            }}
          >
            <ListItemAvatar>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
                color="success"
                invisible={chat.type !== 'private' || !chat.members?.find(m => m.id !== user?.id)?.is_online}
              >
                <Avatar src={getChatAvatar(chat)}>
                  {getChatName(chat)?.[0]?.toUpperCase()}
                </Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" noWrap sx={{ fontWeight: chat.unread_count ? 600 : 400 }}>
                    {getChatName(chat)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(chat.last_message_at)}
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ pr: 1 }}>
                    {getLastMessageText(chat)}
                  </Typography>
                  {chat.unread_count > 0 && (
                    <Badge badgeContent={chat.unread_count} color="primary" />
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      {/* New Chat Button */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <IconButton
          color="primary"
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
          onClick={() => dispatch(setNewChatDialogOpen(true))}
        >
          <Add />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatSidebar;