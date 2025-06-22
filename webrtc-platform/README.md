# WebRTC Video Calling Platform

A full-stack WebRTC video calling platform with Rust signaling server, NestJS backend, and Vue.js frontend.

## Architecture

- **Backend**: NestJS with TypeScript, PostgreSQL, JWT authentication
- **Signaling Server**: Rust WebSocket server for WebRTC signaling
- **Frontend**: Vue.js 3 with Vite and TypeScript
- **Database**: PostgreSQL (running on Docker)

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Rust (for signaling server)

### Environment Setup

1. **Copy environment variables:**

   ```bash
   cp env.example .env
   ```

2. **Start PostgreSQL database:**

   ```bash
   docker compose up -d postgres
   ```

3. **Run database migrations:**
   ```bash
   cd backend
   npm install
   npm run migration:up
   ```

## Running the Application

You can run the backend in two ways:

### Method 1: Direct NestJS Development Server (Recommended for development)

```bash
# Terminal 1: Start PostgreSQL (if not running)
docker compose up -d postgres

# Terminal 2: Start NestJS backend
cd backend
npm run start:dev

# Terminal 3: Start Rust signaling server
cd signaling
cargo run

# Terminal 4: Start Vue.js frontend
cd frontend
npm run dev
```

**Advantages:**

- ✅ Fast hot-reload during development
- ✅ Direct access to Node.js debugging tools
- ✅ Quick iteration cycle
- ✅ Full TypeScript support and IDE integration

### Method 2: Full Docker Compose (Production-like)

```bash
# Start all services
docker compose up -d

# Or start specific services
docker compose up -d backend signaling frontend
```

**Advantages:**

- ✅ Production-like environment
- ✅ Isolated services
- ✅ Easy deployment
- ✅ Consistent environment across team

## Database Configuration

The application uses PostgreSQL running on **port 5433** (not the default 5432) to avoid conflicts with other PostgreSQL instances.

### Database Connection Details:

- **Host**: localhost
- **Port**: 5433
- **Database**: webrtc_db
- **User**: webrtc_user
- **Password**: webrtc_password

Both running methods connect to the **same PostgreSQL instance** running in Docker.

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get user profile (requires JWT)

### Rooms

- `GET /rooms` - List all rooms
- `POST /rooms` - Create new room
- `GET /rooms/:id` - Get room details
- `POST /rooms/:id/join` - Join room
- `POST /rooms/:id/leave` - Leave room

## Development Workflow

### For Backend Development:

1. Use **Method 1** (Direct NestJS) for faster development
2. Database migrations: `npm run migration:up`
3. Hot reload is enabled with `npm run start:dev`

### For Full Stack Development:

1. Use **Method 2** (Docker Compose) to test service integration
2. All services communicate through Docker network

### Database Operations:

```bash
cd backend

# Create new migration
npm run migration:create

# Run migrations
npm run migration:up

# Rollback migrations
npm run migration:down
```

## Troubleshooting

### Port Conflicts

If you encounter port conflicts:

- PostgreSQL runs on port **5433** (not 5432)
- Backend runs on port **3001**
- Signaling server runs on port **3002**
- Frontend runs on port **3000**

### Database Connection Issues

1. Ensure PostgreSQL container is running:

   ```bash
   docker ps | grep postgres
   ```

2. Check database connectivity:
   ```bash
   docker exec -it webrtc-platform-postgres-1 psql -U webrtc_user -d webrtc_db -c "SELECT 1;"
   ```

### Environment Variables Not Loading

- Ensure `.env` file exists in both root and `backend/` directories
- Check that `dotenv` package is installed in backend

## Technology Stack

### Backend (NestJS)

- **Database**: MikroORM with PostgreSQL
- **Authentication**: JWT tokens
- **Validation**: class-validator
- **API**: RESTful endpoints

### Signaling Server (Rust)

- **WebSocket**: tokio-tungstenite
- **JSON**: serde
- **JWT**: jsonwebtoken
- **Async**: tokio runtime

### Frontend (Vue.js)

- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Language**: TypeScript
- **WebRTC**: Native WebRTC APIs

## Next Steps

1. **Implement WebRTC Frontend**: Create video calling interface
2. **Add Room Management**: Implement room creation and joining
3. **Enhanced Authentication**: Add user profiles and permissions
4. **Testing**: Add comprehensive test suites
5. **Deployment**: Set up production deployment pipeline

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes using Method 1 for development
4. Test with Method 2 for integration testing
5. Submit a pull request
