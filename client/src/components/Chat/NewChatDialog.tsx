import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  Tabs,
  Tab,
  Box,
  Typography,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Search, Group, Person } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setNewChatDialogOpen } from '../../store/slices/uiSlice';
import { createChat } from '../../store/slices/chatSlice';
import { userAPI } from '../../services/api/user';

const NewChatDialog: React.FC = () => {
  const dispatch = useAppDispatch();
  const { newChatDialogOpen } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);
  
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await userAPI.searchUsers(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateChat = async () => {
    if (tabValue === 0) {
      // Private chat
      if (selectedUsers.length !== 1) return;
      
      await dispatch(createChat({
        type: 'private',
        member_ids: selectedUsers,
      }));
    } else {
      // Group chat
      if (selectedUsers.length === 0 || !groupName.trim()) return;
      
      await dispatch(createChat({
        type: 'group',
        name: groupName,
        description: groupDescription,
        member_ids: selectedUsers,
      }));
    }

    handleClose();
  };

  const handleClose = () => {
    dispatch(setNewChatDialogOpen(false));
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName('');
    setGroupDescription('');
    setTabValue(0);
  };

  const isCreateDisabled = () => {
    if (tabValue === 0) {
      return selectedUsers.length !== 1;
    } else {
      return selectedUsers.length === 0 || !groupName.trim();
    }
  };

  return (
    <Dialog
      open={newChatDialogOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        New Chat
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mt: 1 }}>
          <Tab icon={<Person />} label="Private" />
          <Tab icon={<Group />} label="Group" />
        </Tabs>
      </DialogTitle>
      
      <DialogContent>
        {tabValue === 1 && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        )}

        <TextField
          fullWidth
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: loading && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {searchResults.map((searchUser) => (
            <ListItem
              key={searchUser.id}
              button
              onClick={() => handleUserToggle(searchUser.id)}
            >
              {tabValue === 1 && (
                <Checkbox
                  checked={selectedUsers.includes(searchUser.id)}
                  edge="start"
                />
              )}
              <ListItemAvatar>
                <Avatar src={searchUser.avatar}>
                  {searchUser.username?.[0]?.toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${searchUser.first_name || ''} ${searchUser.last_name || ''}`.trim() || searchUser.username}
                secondary={`@${searchUser.username}`}
              />
            </ListItem>
          ))}
        </List>

        {selectedUsers.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {tabValue === 0 
                ? '1 user selected'
                : `${selectedUsers.length} users selected`}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleCreateChat}
          variant="contained"
          disabled={isCreateDisabled()}
        >
          Create {tabValue === 0 ? 'Chat' : 'Group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewChatDialog;