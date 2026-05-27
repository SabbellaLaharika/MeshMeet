# MeshMeet - WebRTC Video Chat Application

A production-ready, multi-peer video chat application built with Next.js, TypeScript, and WebRTC. It utilizes a custom signaling server powered by Socket.IO to negotiate peer-to-peer connections in a mesh topology.

## Overview

MeshMeet allows up to 4 participants to seamlessly connect in a video conference room. It leverages the raw WebRTC API to handle media streams directly between peers, significantly reducing server overhead and latency. 

### Core Features:
- **Real-Time Video/Audio**: P2P media streaming with WebRTC.
- **Mesh Topology**: Every participant maintains a direct connection with all other participants in the room.
- **Media Controls**: Mute microphone, toggle camera, and cleanly hang up the call.
- **Live Text Chat**: Integrated real-time messaging using Socket.IO.
- **Status Indicators**: Visual feedback on WebRTC connection states (waiting, connecting, connected).
- **Trickle ICE**: Expedites connection times by sending ICE candidates as they are discovered.

## Architecture

The application is built using a unified Next.js setup with a **Custom Server**:

1. **Custom Server (`server.ts`)**:
   Instead of Next.js's default server, this project spins up a custom Node.js `http` server. This allows us to attach a `Socket.IO` WebSocket server to the exact same port that serves our Next.js HTTP traffic.
   - It handles signaling events: `join-room`, `offer`, `answer`, `ice-candidate`, and `user-disconnected`.
   
2. **Frontend (Next.js App Router)**:
   - Built using React Server Components where possible, and Client Components for WebRTC logic.
   - The UI is styled with Tailwind CSS for a clean, responsive, dark-mode-first aesthetic.
   
3. **WebRTC Client Logic (`useWebRTC` hook)**:
   - Manages local `navigator.mediaDevices.getUserMedia()`.
   - Maintains a map of `RTCPeerConnection` objects for each remote peer.
   - Handles the complex negotiation flow (SDP Offers/Answers) asynchronously.

## Setup Instructions

This application is fully containerized for easy deployment.

### Prerequisites
- Docker and Docker Compose installed on your system.

### Environment Variables
Copy the provided `.env.example` file to create your own `.env` file:
```bash
cp .env.example .env
```
Ensure `PORT=3000` and `NEXT_PUBLIC_STUN_SERVER` are set.

### Running with Docker

To build and start the application, run the following command in the root directory:

```bash
docker-compose up --build -d
```

- The application will be accessible at `http://localhost:3000`.
- Docker Compose will automatically monitor the health of the container via the `/api/health` endpoint.

### Running Locally (Without Docker)

If you prefer to run it outside of Docker for development:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (uses `ts-node` for the custom server):
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

## Testing

The application includes specific `data-test-id` attributes on core UI elements to support automated E2E testing (e.g., `local-video`, `remote-video-container`, `mute-mic-button`, etc.). To manually test, open the same room URL in multiple browser windows and grant media permissions.
