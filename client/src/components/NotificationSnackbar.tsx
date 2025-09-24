import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { hideNotification } from '../store/slices/uiSlice';

const NotificationSnackbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const notification = useAppSelector((state) => state.ui.notification);

  const handleClose = () => {
    dispatch(hideNotification());
  };

  return (
    <Snackbar
      open={notification?.open || false}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={handleClose}
        severity={notification?.severity || 'info'}
        sx={{ width: '100%' }}
      >
        {notification?.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar;