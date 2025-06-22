# Running the WebRTC Platform

This guide explains how to run all components of the WebRTC platform.

## Prerequisites

- Node.js 18+ installed
- Rust 1.82+ installed
- PostgreSQL running with database `webrtc_db` and user `webrtc_user`

## Port Configuration

The application uses the following custom ports to avoid conflicts:

- **Frontend (Vue.js)**: Port 8080
- **Backend (NestJS)**: Port 4000
- **Signaling Server (Rust)**: Port 9000

## Step 1: Start the Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

The backend will start on **http://localhost:4000**

## Step 2: Start the Signaling Server (Rust)

```bash
cd signaling
RUST_LOG=info cargo run --release -- --port 9000
```

The signaling server will start on **ws://localhost:9000**

## Step 3: Start the Frontend (Vue.js)

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on **http://localhost:8080**

## Testing the Application

1. Open your browser and go to **http://localhost:8080**
2. Register a new account or login
3. Create a room or join an existing room
4. Test the video calling functionality

## Architecture

```
Frontend (Vue.js) :8080
    ↓ HTTP API calls
Backend (NestJS) :4000 ←→ PostgreSQL Database
    ↓ WebSocket connections
Signaling Server (Rust) :9000
```

## Troubleshooting

### Frontend not loading

- Make sure the backend is running on port 4000
- Check that `.env` file exists in frontend directory with correct URLs

### Video calls not working

- Ensure signaling server is running on port 9000
- Check browser console for WebRTC errors
- Verify JWT token is valid

### Database connection issues

- Make sure PostgreSQL is running
- Verify database `webrtc_db` exists
- Check user `webrtc_user` has proper permissions

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql://webrtc_user:password@localhost:5432/webrtc_db
JWT_SECRET=dev-super-secret-jwt-key-change-in-production
PORT=4000
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:9000
```

### Signaling Server

Set via environment variable:

```bash
export JWT_SECRET=dev-super-secret-jwt-key-change-in-production
```
