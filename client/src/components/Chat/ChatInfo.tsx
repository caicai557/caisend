import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Switch,
  Button,
} from '@mui/material';
import {
  Close,
  Edit,
  Notifications,
  Block,
  Delete,
  ExitToApp,
  AttachFile,
  Image,
  Link,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { toggleRightPanel } from '../../store/slices/uiSlice';
import { muteChat, deleteChat } from '../../store/slices/chatSlice';

const ChatInfo: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { activeChat } = useAppSelector((state) => state.chat);

  if (!activeChat) return null;

  const getChatName = () => {
    if (activeChat.type === 'private') {
      const otherUser = activeChat.members?.find(m => m.id !== user?.id);
      return otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || otherUser.username : activeChat.name;
    }
    return activeChat.name || 'Chat';
  };

  const getChatAvatar = () => {
    if (activeChat.avatar) return activeChat.avatar;
    if (activeChat.type === 'private') {
      const otherUser = activeChat.members?.find(m => m.id !== user?.id);
      return otherUser?.avatar;
    }
    return null;
  };

  const getOtherUser = () => {
    if (activeChat.type === 'private') {
      return activeChat.members?.find(m => m.id !== user?.id);
    }
    return null;
  };

  const handleMuteToggle = () => {
    dispatch(muteChat({
      chatId: activeChat.id,
      isMuted: !activeChat.is_muted,
    }));
  };

  const handleDeleteChat = () => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      dispatch(deleteChat(activeChat.id));
      dispatch(toggleRightPanel());
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Chat Info
        </Typography>
        <IconButton onClick={() => dispatch(toggleRightPanel())}>
          <Close />
        </IconButton>
      </Box>

      {/* Profile Section */}
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Avatar
          src={getChatAvatar()}
          sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }}
        >
          {getChatName()?.[0]?.toUpperCase()}
        </Avatar>
        <Typography variant="h6">{getChatName()}</Typography>
        {activeChat.type === 'private' && getOtherUser() && (
          <>
            <Typography variant="body2" color="text.secondary">
              @{getOtherUser()?.username}
            </Typography>
            {getOtherUser()?.bio && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {getOtherUser()?.bio}
              </Typography>
            )}
          </>
        )}
        {activeChat.type === 'group' && (
          <>
            <Typography variant="body2" color="text.secondary">
              {activeChat.member_count} members
            </Typography>
            {activeChat.description && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {activeChat.description}
              </Typography>
            )}
          </>
        )}
      </Box>

      <Divider />

      {/* Actions */}
      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        <ListItem>
          <ListItemIcon>
            <Notifications />
          </ListItemIcon>
          <ListItemText primary="Mute notifications" />
          <Switch
            checked={activeChat.is_muted || false}
            onChange={handleMuteToggle}
          />
        </ListItem>

        {activeChat.type === 'group' && (
          <>
            <ListItem button>
              <ListItemIcon>
                <Edit />
              </ListItemIcon>
              <ListItemText primary="Edit group info" />
            </ListItem>

            <ListItem button>
              <ListItemIcon>
                <Link />
              </ListItemIcon>
              <ListItemText 
                primary="Invite link" 
                secondary={activeChat.invite_link ? 'Click to copy' : 'Generate link'}
              />
            </ListItem>
          </>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Media Section */}
        <ListItem>
          <ListItemText primary="Media, Links & Files" />
        </ListItem>

        <ListItem button>
          <ListItemIcon>
            <Image />
          </ListItemIcon>
          <ListItemText primary="Photos" secondary="0" />
        </ListItem>

        <ListItem button>
          <ListItemIcon>
            <AttachFile />
          </ListItemIcon>
          <ListItemText primary="Files" secondary="0" />
        </ListItem>

        <ListItem button>
          <ListItemIcon>
            <Link />
          </ListItemIcon>
          <ListItemText primary="Links" secondary="0" />
        </ListItem>

        <Divider sx={{ my: 1 }} />

        {/* Danger Zone */}
        {activeChat.type === 'private' && (
          <ListItem button>
            <ListItemIcon>
              <Block color="error" />
            </ListItemIcon>
            <ListItemText 
              primary="Block user" 
              primaryTypographyProps={{ color: 'error' }}
            />
          </ListItem>
        )}

        {activeChat.type === 'group' && (
          <ListItem button>
            <ListItemIcon>
              <ExitToApp color="error" />
            </ListItemIcon>
            <ListItemText 
              primary="Leave group" 
              primaryTypographyProps={{ color: 'error' }}
            />
          </ListItem>
        )}

        <ListItem button onClick={handleDeleteChat}>
          <ListItemIcon>
            <Delete color="error" />
          </ListItemIcon>
          <ListItemText 
            primary="Delete chat" 
            primaryTypographyProps={{ color: 'error' }}
          />
        </ListItem>
      </List>

      {/* Members List for Groups */}
      {activeChat.type === 'group' && activeChat.members && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Members ({activeChat.members.length})
          </Typography>
          <List dense>
            {activeChat.members.map((member) => (
              <ListItem key={member.id}>
                <ListItemIcon>
                  <Avatar src={member.avatar} sx={{ width: 32, height: 32 }}>
                    {member.username?.[0]?.toUpperCase()}
                  </Avatar>
                </ListItemIcon>
                <ListItemText 
                  primary={member.username}
                  secondary={member.id === activeChat.created_by ? 'Admin' : 'Member'}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default ChatInfo;