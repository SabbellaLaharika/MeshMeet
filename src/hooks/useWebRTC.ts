import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type PeerStatus = 'waiting' | 'connecting' | 'connected';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isMe: boolean;
}

export interface RemotePeer {
  id: string;
  stream: MediaStream;
}

export function useWebRTC(roomId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [status, setStatus] = useState<PeerStatus>('waiting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  const STUN_SERVER = process.env.NEXT_PUBLIC_STUN_SERVER || 'stun:stun.l.google.com:19302';
  const configuration = { iceServers: [{ urls: STUN_SERVER }] };

  useEffect(() => {
    // 1. Get user media
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localStreamRef.current = stream;
        
        // 2. Initialize Socket.IO connection
        socketRef.current = io();
        
        const socket = socketRef.current;

        socket.on('connect', () => {
          socket.emit('join-room', roomId);
        });

        socket.on('user-connected', async (userId: string) => {
          // Status updates
          if (Object.keys(peersRef.current).length === 0) setStatus('connecting');
          
          const peerConnection = createPeerConnection(userId, stream);
          peersRef.current[userId] = peerConnection;

          try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', { target: userId, caller: socket.id, sdp: peerConnection.localDescription });
          } catch (e) {
            console.error('Error creating offer', e);
          }
        });

        socket.on('offer', async (payload: { target: string, caller: string, sdp: RTCSessionDescriptionInit }) => {
          if (Object.keys(peersRef.current).length === 0) setStatus('connecting');

          const peerConnection = createPeerConnection(payload.caller, stream);
          peersRef.current[payload.caller] = peerConnection;

          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', { target: payload.caller, caller: socket.id, sdp: peerConnection.localDescription });
          } catch (e) {
            console.error('Error handling offer', e);
          }
        });

        socket.on('answer', async (payload: { target: string, caller: string, sdp: RTCSessionDescriptionInit }) => {
          const peerConnection = peersRef.current[payload.caller];
          if (peerConnection) {
            try {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            } catch (e) {
              console.error('Error setting remote description from answer', e);
            }
          }
        });

        socket.on('ice-candidate', async (payload: { target: string, caller: string, candidate: RTCIceCandidateInit }) => {
          const peerConnection = peersRef.current[payload.caller];
          if (peerConnection) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error('Error adding ICE candidate', e);
            }
          }
        });

        socket.on('user-disconnected', (userId: string) => {
          if (peersRef.current[userId]) {
            peersRef.current[userId].close();
            delete peersRef.current[userId];
            setRemotePeers(prev => prev.filter(p => p.id !== userId));
            
            if (Object.keys(peersRef.current).length === 0) {
              setStatus('waiting');
            }
          }
        });

        socket.on('chat-message', (payload: { roomId: string, message: string, sender: string }) => {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString() + Math.random().toString(),
              text: payload.message,
              sender: payload.sender,
              isMe: payload.sender === socketRef.current?.id,
            },
          ]);
        });

      } catch (err: any) {
        console.error('Error accessing media devices.', err);
        setError('Could not access camera or microphone. Please grant permissions.');
      }
    };

    initMedia();

    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(pc => pc.close());
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  const createPeerConnection = (userId: string, stream: MediaStream) => {
    const peerConnection = new RTCPeerConnection(configuration);

    // Trickle ICE
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          target: userId,
          caller: socketRef.current.id,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        setStatus('connected');
      } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
        // Handled in user-disconnected, but good for fallback
      }
    };

    // Add local stream tracks to connection
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      setRemotePeers(prev => {
        // Prevent adding duplicate streams for the same user
        if (prev.find(p => p.id === userId)) return prev;
        return [...prev, { id: userId, stream: event.streams[0] }];
      });
    };

    return peerConnection;
  };

  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const hangup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setStatus('waiting');
    setRemotePeers([]);
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (socketRef.current && message.trim() !== '') {
      socketRef.current.emit('send-message', {
        roomId,
        message,
        sender: socketRef.current.id,
      });
    }
  }, [roomId]);

  return {
    localStream,
    remotePeers,
    status,
    messages,
    micEnabled,
    cameraEnabled,
    error,
    toggleMic,
    toggleCamera,
    hangup,
    sendMessage,
  };
}
