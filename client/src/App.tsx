import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { store } from './store';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import socketService from './services/socket';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Components
import PrivateRoute from './components/PrivateRoute';
import NotificationSnackbar from './components/NotificationSnackbar';
import LoadingScreen from './components/LoadingScreen';

function AppContent() {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.ui);
  const { isAuthenticated, token, user } = useAppSelector((state) => state.auth);

  const muiTheme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme,
          primary: {
            main: '#2196f3',
          },
          secondary: {
            main: '#00bcd4',
          },
          background: {
            default: theme === 'light' ? '#f5f5f5' : '#121212',
            paper: theme === 'light' ? '#ffffff' : '#1e1e1e',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [theme]
  );

  useEffect(() => {
    // Connect to socket when authenticated
    if (isAuthenticated && token) {
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Update user online status
    if (user) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // User switched to another tab/window
        } else {
          // User is back
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:chatId?"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/:userId?"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <NotificationSnackbar />
    </ThemeProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;