import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Avatar,
  Typography,
  IconButton,
  Grid,
} from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  VolumeUp,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { endCall } from '../../store/slices/uiSlice';
import socketService from '../../services/socket';

const CallDialog: React.FC = () => {
  const dispatch = useAppDispatch();
  const { call } = useAppSelector((state) => state.ui);
  const { activeChat } = useAppSelector((state) => state.chat);
  const { user } = useAppSelector((state) => state.auth);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (call.active) {
      startCall();
      startCallTimer();
    } else {
      endCallSession();
    }

    return () => {
      endCallSession();
    };
  }, [call.active]);

  const startCall = async () => {
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: call.type === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC
      initializePeerConnection();

      // Create offer
      if (peerConnectionRef.current) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        // Send offer via socket
        if (call.chatId) {
          socketService.startCall(call.chatId, call.type || 'voice', offer);
        }
      }
    } catch (error) {
      console.error('Failed to start call:', error);
      handleEndCall();
    }
  };

  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (peerConnectionRef.current && localStreamRef.current) {
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        }
      });
    }

    // Handle remote stream
    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && call.participants[0]) {
        socketService.sendIceCandidate(call.participants[0].id, event.candidate);
      }
    };
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const endCallSession = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setCallDuration(0);
  };

  const handleEndCall = () => {
    if (call.chatId) {
      socketService.endCall(call.chatId);
    }
    dispatch(endCall());
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && call.type === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallerName = () => {
    if (!activeChat) return 'Unknown';
    
    if (activeChat.type === 'private') {
      const otherUser = activeChat.members?.find(m => m.id !== user?.id);
      return otherUser?.username || 'Unknown';
    }
    return activeChat.name || 'Group Call';
  };

  return (
    <Dialog
      open={call.active}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ height: '100vh', position: 'relative' }}>
          {call.type === 'video' ? (
            <>
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />

              {/* Local Video */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  width: 200,
                  height: 150,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '2px solid white',
                }}
              />
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Avatar
                sx={{
                  width: 150,
                  height: 150,
                  mb: 3,
                }}
              >
                {getCallerName()?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="h4" gutterBottom>
                {getCallerName()}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {formatDuration(callDuration)}
              </Typography>
            </Box>
          )}

          {/* Call Controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 2,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 4,
              p: 2,
            }}
          >
            <IconButton
              onClick={toggleMute}
              sx={{
                bgcolor: isMuted ? 'error.main' : 'background.paper',
                '&:hover': {
                  bgcolor: isMuted ? 'error.dark' : 'action.hover',
                },
              }}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </IconButton>

            {call.type === 'video' && (
              <IconButton
                onClick={toggleVideo}
                sx={{
                  bgcolor: !isVideoOn ? 'error.main' : 'background.paper',
                  '&:hover': {
                    bgcolor: !isVideoOn ? 'error.dark' : 'action.hover',
                  },
                }}
              >
                {isVideoOn ? <Videocam /> : <VideocamOff />}
              </IconButton>
            )}

            <IconButton
              onClick={handleEndCall}
              sx={{
                bgcolor: 'error.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'error.dark',
                },
              }}
            >
              <CallEnd />
            </IconButton>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CallDialog;