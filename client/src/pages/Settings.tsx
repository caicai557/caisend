import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Divider,
  Button,
  Avatar,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack,
  Notifications,
  Security,
  Language,
  Palette,
  Storage,
  Help,
  Info,
  Edit,
  PhotoCamera,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { toggleTheme } from '../store/slices/uiSlice';
import { userAPI } from '../services/api/user';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { theme } = useAppSelector((state) => state.ui);
  
  const [settings, setSettings] = useState({
    notifications: {
      message: true,
      mention: true,
      group: true,
    },
    privacy: {
      last_seen: 'everyone',
      profile_photo: 'everyone',
      status: 'everyone',
    },
    language: 'en',
  });

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    try {
      await userAPI.updateProfile({ settings });
      // Show success message
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">Settings</Typography>
      </Box>

      {/* Profile Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Avatar
            src={user?.avatar}
            sx={{ width: 80, height: 80, mr: 3 }}
          >
            {user?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{user?.username}</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Edit />}
              sx={{ mt: 1 }}
              onClick={() => navigate('/profile')}
            >
              Edit Profile
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Appearance */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Appearance
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <Palette />
            </ListItemIcon>
            <ListItemText
              primary="Dark Mode"
              secondary="Use dark theme"
            />
            <Switch
              checked={theme === 'dark'}
              onChange={() => dispatch(toggleTheme())}
            />
          </ListItem>
        </List>
      </Paper>

      {/* Notifications */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notifications
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="Message Notifications"
              secondary="Receive notifications for new messages"
            />
            <Switch
              checked={settings.notifications.message}
              onChange={(e) => handleSettingChange('notifications', 'message', e.target.checked)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Mention Notifications"
              secondary="Receive notifications when mentioned"
              inset
            />
            <Switch
              checked={settings.notifications.mention}
              onChange={(e) => handleSettingChange('notifications', 'mention', e.target.checked)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Group Notifications"
              secondary="Receive notifications from groups"
              inset
            />
            <Switch
              checked={settings.notifications.group}
              onChange={(e) => handleSettingChange('notifications', 'group', e.target.checked)}
            />
          </ListItem>
        </List>
      </Paper>

      {/* Privacy */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Privacy
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <Security />
            </ListItemIcon>
            <ListItemText primary="Last Seen" />
            <Select
              value={settings.privacy.last_seen}
              onChange={(e) => handleSettingChange('privacy', 'last_seen', e.target.value)}
              size="small"
            >
              <MenuItem value="everyone">Everyone</MenuItem>
              <MenuItem value="contacts">My Contacts</MenuItem>
              <MenuItem value="nobody">Nobody</MenuItem>
            </Select>
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Profile Photo"
              inset
            />
            <Select
              value={settings.privacy.profile_photo}
              onChange={(e) => handleSettingChange('privacy', 'profile_photo', e.target.value)}
              size="small"
            >
              <MenuItem value="everyone">Everyone</MenuItem>
              <MenuItem value="contacts">My Contacts</MenuItem>
              <MenuItem value="nobody">Nobody</MenuItem>
            </Select>
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Status"
              inset
            />
            <Select
              value={settings.privacy.status}
              onChange={(e) => handleSettingChange('privacy', 'status', e.target.value)}
              size="small"
            >
              <MenuItem value="everyone">Everyone</MenuItem>
              <MenuItem value="contacts">My Contacts</MenuItem>
              <MenuItem value="nobody">Nobody</MenuItem>
            </Select>
          </ListItem>
        </List>
      </Paper>

      {/* Language */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Language
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Language</InputLabel>
          <Select
            value={settings.language}
            onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
            label="Language"
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="es">Español</MenuItem>
            <MenuItem value="fr">Français</MenuItem>
            <MenuItem value="de">Deutsch</MenuItem>
            <MenuItem value="zh">中文</MenuItem>
            <MenuItem value="ja">日本語</MenuItem>
            <MenuItem value="ko">한국어</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Storage */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Storage
        </Typography>
        <List>
          <ListItem button>
            <ListItemIcon>
              <Storage />
            </ListItemIcon>
            <ListItemText
              primary="Clear Cache"
              secondary="Free up storage space"
            />
          </ListItem>
        </List>
      </Paper>

      {/* About */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          About
        </Typography>
        <List>
          <ListItem button>
            <ListItemIcon>
              <Help />
            </ListItemIcon>
            <ListItemText primary="Help & Support" />
          </ListItem>
          <ListItem button>
            <ListItemIcon>
              <Info />
            </ListItemIcon>
            <ListItemText
              primary="About"
              secondary="Version 1.0.0"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSaveSettings}
          sx={{ minWidth: 200 }}
        >
          Save Settings
        </Button>
      </Box>
    </Container>
  );
};

export default Settings;