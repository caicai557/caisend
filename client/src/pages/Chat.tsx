import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchChats, setActiveChat } from '../store/slices/chatSlice';
import { fetchMessages } from '../store/slices/messageSlice';

// Components
import ChatSidebar from '../components/Chat/ChatSidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import ChatInfo from '../components/Chat/ChatInfo';
import NewChatDialog from '../components/Chat/NewChatDialog';
import ForwardMessageDialog from '../components/Chat/ForwardMessageDialog';
import CallDialog from '../components/Chat/CallDialog';

const Chat: React.FC = () => {
  const { chatId } = useParams();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { chats, activeChat } = useAppSelector((state) => state.chat);
  const { sidebarOpen, rightPanelOpen, newChatDialogOpen } = useAppSelector(
    (state) => state.ui
  );

  const [sidebarWidth] = useState(320);
  const [rightPanelWidth] = useState(320);

  useEffect(() => {
    // Fetch user's chats
    dispatch(fetchChats());
  }, [dispatch]);

  useEffect(() => {
    // Set active chat based on URL param
    if (chatId && chats.length > 0) {
      const chat = chats.find((c) => c.id === chatId);
      if (chat) {
        dispatch(setActiveChat(chat));
        dispatch(fetchMessages({ chatId }));
      }
    } else if (!chatId && chats.length > 0) {
      // Select first chat if no chat ID in URL
      dispatch(setActiveChat(chats[0]));
      if (chats[0]) {
        dispatch(fetchMessages({ chatId: chats[0].id }));
      }
    }
  }, [chatId, chats, dispatch]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      {(!isMobile || !activeChat) && (
        <Box
          sx={{
            width: isMobile ? '100%' : sidebarWidth,
            flexShrink: 0,
            display: sidebarOpen || isMobile ? 'block' : 'none',
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <ChatSidebar />
        </Box>
      )}

      {/* Main Chat Window */}
      {(!isMobile || activeChat) && (
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            bgcolor: 'background.default',
          }}
        >
          <ChatWindow />
        </Box>
      )}

      {/* Right Panel (Chat Info) */}
      {!isMobile && rightPanelOpen && activeChat && (
        <Box
          sx={{
            width: rightPanelWidth,
            flexShrink: 0,
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <ChatInfo />
        </Box>
      )}

      {/* Dialogs */}
      <NewChatDialog />
      <ForwardMessageDialog />
      <CallDialog />
    </Box>
  );
};

export default Chat;