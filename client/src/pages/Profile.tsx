import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Avatar,
  IconButton,
  Grid,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  PhotoCamera,
  Edit,
  Save,
  Cancel,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setUser } from '../store/slices/authSlice';
import { showNotification } from '../store/slices/uiSlice';
import { userAPI } from '../services/api/user';

interface ProfileForm {
  first_name: string;
  last_name: string;
  bio: string;
  phone: string;
}

const Profile: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !userId || userId === user?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (data: ProfileForm) => {
    try {
      // Update profile
      const response = await userAPI.updateProfile(data);
      
      // Upload avatar if changed
      if (avatarFile) {
        const avatarResponse = await userAPI.uploadAvatar(avatarFile);
        dispatch(setUser({
          ...response.data.user,
          avatar: avatarResponse.data.avatar,
        }));
      } else {
        dispatch(setUser(response.data.user));
      }

      dispatch(showNotification({
        message: 'Profile updated successfully',
        severity: 'success',
      }));
      
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      dispatch(showNotification({
        message: 'Failed to update profile',
        severity: 'error',
      }));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    reset();
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          {isOwnProfile ? 'My Profile' : 'User Profile'}
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarPreview || user?.avatar}
              sx={{ width: 120, height: 120 }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            {isEditing && isOwnProfile && (
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <PhotoCamera />
              </IconButton>
            )}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </Box>
          
          <Box sx={{ ml: 3, flexGrow: 1 }}>
            <Typography variant="h5">{user?.username}</Typography>
            <Typography variant="body1" color="text.secondary">
              {user?.email}
            </Typography>
            {isOwnProfile && !isEditing && (
              <Button
                variant="contained"
                startIcon={<Edit />}
                sx={{ mt: 2 }}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box component="form" onSubmit={handleSubmit(handleSaveProfile)}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('first_name')}
                label="First Name"
                fullWidth
                disabled={!isEditing}
                error={!!errors.first_name}
                helperText={errors.first_name?.message}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('last_name')}
                label="Last Name"
                fullWidth
                disabled={!isEditing}
                error={!!errors.last_name}
                helperText={errors.last_name?.message}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                {...register('bio')}
                label="Bio"
                fullWidth
                multiline
                rows={3}
                disabled={!isEditing}
                error={!!errors.bio}
                helperText={errors.bio?.message}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                {...register('phone', {
                  pattern: {
                    value: /^\+?[1-9]\d{1,14}$/,
                    message: 'Invalid phone number',
                  },
                })}
                label="Phone Number"
                fullWidth
                disabled={!isEditing}
                error={!!errors.phone}
                helperText={errors.phone?.message}
                placeholder="+1234567890"
              />
            </Grid>
          </Grid>

          {isEditing && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
              >
                Save Changes
              </Button>
            </Box>
          )}
        </Box>

        {!isOwnProfile && (
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" fullWidth>
              Send Message
            </Button>
            <Button variant="outlined" fullWidth sx={{ mt: 1 }}>
              Add to Contacts
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Profile;