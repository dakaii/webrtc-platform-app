# WebRTC Video Calling Platform

A full-stack WebRTC video calling platform with Rust signaling server, NestJS backend, and Vue.js frontend.

## 🚀 Quick Start with Docker Compose

### Prerequisites

- Docker and Docker Compose installed
- Git

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/dakaii/vibertc.git
cd vibertc

# Start all services
docker compose up --build

# Or run in background
docker compose up --build -d
```

That's it! All services will start automatically:

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:4000
- **Signaling Server**: ws://localhost:9000
- **PostgreSQL**: localhost:5433

### Stop Services

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (clean slate)
docker compose down -v
```

## 🏗️ Architecture

```
Frontend (Vue.js) :8080
    ↓ HTTP API calls
Backend (NestJS) :4000 ←→ PostgreSQL :5433
    ↓ WebSocket connections
Signaling Server (Rust) :9000
```

## 🛠️ Development Mode

For active development with hot reload:

```bash
# Start only the database
docker compose up postgres -d

# Run services individually for development
# Terminal 1: Backend
cd backend && npm install && npm run start:dev

# Terminal 2: Signaling Server
cd signaling && JWT_SECRET=dev-super-secret-jwt-key-change-in-production RUST_LOG=info cargo run --release

# Terminal 3: Frontend
cd frontend && npm install && npm run dev
```

## 📝 Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the example
cp env.example .env

# Edit as needed
nano .env
```

### Key Environment Variables

```env
# Database
DB_NAME=webrtc_db
DB_USER=webrtc_user
DB_PASSWORD=webrtc_password
DB_PORT=5433

# Service Ports
BACKEND_PORT=4000
SIGNALING_PORT=9000
FRONTEND_PORT=8080

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Development
NODE_ENV=development
RUST_LOG=info
```

## 🔧 Available Commands

### Docker Compose Commands

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Build and start
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs

# View logs for specific service
docker compose logs backend

# Restart a service
docker compose restart backend

# Scale a service (if needed)
docker compose up --scale backend=2
```

### Individual Service Commands

```bash
# Backend
cd backend
npm install
npm run start:dev      # Development
npm run start:prod     # Production
npm run migration:up   # Run migrations

# Signaling Server
cd signaling
cargo run              # Development
cargo run --release    # Production

# Frontend
cd frontend
npm install
npm run dev            # Development
npm run build          # Build for production
```

## 🧪 Testing the Application

1. **Open your browser** and go to http://localhost:8080
2. **Register a new account** or login
3. **Create a room** or join an existing room
4. **Test video calling** functionality between multiple browser tabs/windows

## 📊 Monitoring

### Check Service Health

```bash
# View all running containers
docker compose ps

# Check logs
docker compose logs -f

# Check individual service logs
docker compose logs -f backend
docker compose logs -f signaling
docker compose logs -f frontend
docker compose logs -f postgres
```

### Database Access

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U webrtc_user -d webrtc_db

# Or from host (if you have psql installed)
psql -h localhost -p 5433 -U webrtc_user -d webrtc_db
```

## 🔧 Troubleshooting

### Port Conflicts

If you get port conflicts, update the `.env` file:

```env
BACKEND_PORT=4001
SIGNALING_PORT=9001
FRONTEND_PORT=8081
DB_PORT=5434
```

### Container Issues

```bash
# Rebuild containers
docker compose build --no-cache

# Remove all containers and start fresh
docker compose down -v
docker compose up --build

# Check container status
docker compose ps
```

### Database Issues

```bash
# Reset database
docker compose down -v
docker compose up postgres -d

# Check database logs
docker compose logs postgres
```

## 🚀 Production Deployment

For production deployment:

1. **Update environment variables** in `.env`
2. **Use production builds**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
3. **Set up reverse proxy** (nginx/traefik)
4. **Configure SSL certificates**
5. **Set up monitoring** and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes using Docker Compose for testing
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Issues**: https://github.com/dakaii/vibertc/issues
- **Discussions**: https://github.com/dakaii/vibertc/discussions
