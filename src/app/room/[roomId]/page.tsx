'use client';

import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useRouter } from 'next/navigation';

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const {
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
  } = useWebRTC(params.roomId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleHangup = () => {
    hangup();
    router.push('/');
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput);
      setChatInput('');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="bg-red-500/10 p-6 rounded-lg text-red-500 max-w-md text-center ring-1 ring-red-500/50">
          <p className="text-xl font-bold mb-2">Error</p>
          <p>{error}</p>
          <button onClick={() => router.push('/')} className="mt-4 underline text-sm hover:text-red-400">Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row text-white overflow-hidden">
      
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Status Indicator */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
          <div className={`w-2.5 h-2.5 rounded-full ${
            status === 'connected' ? 'bg-green-500' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'
          }`} />
          <span className="text-sm font-medium text-gray-200">
            {status === 'waiting' && <span data-test-id="status-waiting">Waiting for others...</span>}
            {status === 'connecting' && <span data-test-id="status-connecting">Connecting...</span>}
            {status === 'connected' && <span data-test-id="status-connected">Connected</span>}
          </span>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 flex items-center justify-center relative">
          <div data-test-id="remote-video-container" className="w-full h-full grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 auto-rows-fr place-items-center">
            
            {/* If no remote peers, show waiting state */}
            {remotePeers.length === 0 && status === 'waiting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <div className="w-24 h-24 mb-4 rounded-full border-4 border-gray-800 border-t-blue-500 animate-spin" />
                <p className="text-xl">Waiting for participants to join room: <span className="text-gray-300 font-mono">{params.roomId}</span></p>
              </div>
            )}

            {remotePeers.map(peer => (
              <RemoteVideo key={peer.id} stream={peer.stream} id={peer.id} />
            ))}
          </div>

          {/* Local Video PiP */}
          <div className="absolute bottom-6 right-6 w-48 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700/50 z-10 transition-transform hover:scale-105 group">
            <video
              ref={localVideoRef}
              data-test-id="local-video"
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${!cameraEnabled ? 'opacity-0' : 'opacity-100'}`}
            />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16" />
                </svg>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs font-medium backdrop-blur-sm">You</div>
            {!micEnabled && (
              <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1 shadow-lg">
                 <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" strokeLinecap="round" />
                 </svg>
              </div>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-6 px-6">
          <button
            data-test-id="mute-mic-button"
            onClick={toggleMic}
            className={`p-4 rounded-full transition-all ${
              micEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            }`}
          >
            {micEnabled ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
          
          <button
            onClick={handleHangup}
            data-test-id="hangup-button"
            className="p-4 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all transform hover:scale-110"
          >
            <svg className="w-6 h-6 transform rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>

          <button
            data-test-id="toggle-camera-button"
            onClick={toggleCamera}
            className={`p-4 rounded-full transition-all ${
              cameraEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            }`}
          >
            {cameraEnabled ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full md:w-80 lg:w-96 bg-gray-900 border-l border-gray-800 flex flex-col h-[50vh] md:h-screen">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-200">Meeting Chat</h2>
          <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">{remotePeers.length + 1} People</span>
        </div>
        
        <div data-test-id="chat-log" className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-10">No messages yet. Say hello!</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} data-test-id="chat-message" className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-gray-500 mb-1 px-1">{msg.isMe ? 'You' : `Peer ${msg.sender.substring(0,4)}`}</span>
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] break-words ${
                  msg.isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              data-test-id="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500"
            />
            <button
              type="submit"
              data-test-id="chat-submit"
              disabled={!chatInput.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Separate component to handle remote video playback properly
function RemoteVideo({ stream, id }: { stream: MediaStream, id: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full h-full min-h-[200px] max-h-[80vh] bg-gray-800 rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-white/10 group">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-md text-sm font-medium backdrop-blur-sm border border-white/10">
        Peer {id.substring(0, 4)}
      </div>
    </div>
  );
}
