import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  TextField,
  InputAdornment,
  Typography,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setForwardMessageId } from '../../store/slices/uiSlice';
import { forwardMessage } from '../../store/slices/messageSlice';

const ForwardMessageDialog: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { chats } = useAppSelector((state) => state.chat);
  const { forwardMessageId } = useAppSelector((state) => state.ui);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = () => {
    dispatch(setForwardMessageId(null));
    setSelectedChats([]);
    setSearchQuery('');
  };

  const handleForward = async () => {
    if (forwardMessageId && selectedChats.length > 0) {
      await dispatch(forwardMessage({
        messageId: forwardMessageId,
        chatIds: selectedChats,
      }));
      handleClose();
    }
  };

  const handleChatToggle = (chatId: string) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const getChatName = (chat: any) => {
    if (chat.type === 'private') {
      const otherUser = chat.members?.find((m: any) => m.id !== user?.id);
      return otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || otherUser.username : chat.name;
    }
    return chat.name;
  };

  const getChatAvatar = (chat: any) => {
    if (chat.avatar) return chat.avatar;
    if (chat.type === 'private') {
      const otherUser = chat.members?.find((m: any) => m.id !== user?.id);
      return otherUser?.avatar;
    }
    return null;
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const name = getChatName(chat);
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Dialog
      open={!!forwardMessageId}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Forward Message</DialogTitle>
      
      <DialogContent>
        <TextField
          fullWidth
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
          sx={{ mb: 2 }}
        />

        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {filteredChats.map((chat) => (
            <ListItem
              key={chat.id}
              button
              onClick={() => handleChatToggle(chat.id)}
            >
              <Checkbox
                checked={selectedChats.includes(chat.id)}
                edge="start"
              />
              <ListItemAvatar>
                <Avatar src={getChatAvatar(chat)}>
                  {getChatName(chat)?.[0]?.toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={getChatName(chat)}
                secondary={chat.last_message?.content}
              />
            </ListItem>
          ))}
        </List>

        {selectedChats.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {selectedChats.length} chat{selectedChats.length > 1 ? 's' : ''} selected
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleForward}
          variant="contained"
          disabled={selectedChats.length === 0}
        >
          Forward
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForwardMessageDialog;