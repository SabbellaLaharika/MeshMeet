import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server, Socket } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || '3000', 10);

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Configure for production as needed
      methods: ["GET", "POST"]
    }
  });

  // Track room membership for each socket
  const socketRooms = new Map<string, string>();

  io.on('connection', (socket: Socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId: string) => {
      // Leave previous room if any
      const previousRoom = socketRooms.get(socket.id);
      if (previousRoom) {
        socket.leave(previousRoom);
        socket.to(previousRoom).emit('user-disconnected', socket.id);
        console.log(`Socket ${socket.id} left room ${previousRoom}`);
      }

      socket.join(roomId);
      socketRooms.set(socket.id, roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      
      // Notify other users in the room that a new peer joined
      socket.to(roomId).emit('user-connected', socket.id);
    });

    // Listen for signaling events and relay them to the intended peer
    socket.on('offer', (payload: { target: string, caller: string, sdp: RTCSessionDescriptionInit }) => {
      io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload: { target: string, caller: string, sdp: RTCSessionDescriptionInit }) => {
      io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload: { target: string, caller: string, candidate: RTCIceCandidateInit }) => {
      io.to(payload.target).emit('ice-candidate', payload);
    });

    // Chat functionality
    socket.on('send-message', (payload: { roomId: string, message: string, sender: string }) => {
      io.to(payload.roomId).emit('chat-message', payload);
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      const roomId = socketRooms.get(socket.id);
      if (roomId) {
        // Broadcast disconnection to other users in the room
        socket.to(roomId).emit('user-disconnected', socket.id);
        socketRooms.delete(socket.id);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
