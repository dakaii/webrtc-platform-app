# LiveKit Application

A modern, scalable real-time communication application built with LiveKit, TypeScript, and Node.js. This application provides a complete backend solution for managing rooms, participants, and real-time communication using LiveKit's powerful infrastructure.

## 🚀 Features

- **Real-time Communication**: Powered by LiveKit's WebRTC infrastructure
- **Room Management**: Create, list, update, and delete rooms
- **Participant Management**: Manage participants and their permissions
- **Token Generation**: Secure JWT-based authentication for participants
- **Webhook Support**: Handle LiveKit events with webhook endpoints
- **Data Channels**: Send real-time data messages between participants
- **RESTful API**: Clean and well-documented API endpoints
- **TypeScript**: Full type safety and modern JavaScript features
- **Comprehensive Testing**: Unit and integration tests included

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- LiveKit Server running locally or LiveKit Cloud account
- TypeScript knowledge (for development)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd livekit-app
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your LiveKit credentials:
```env
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_HOST=wss://your-livekit-host
```

## 🚦 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📚 API Documentation

Once the server is running, visit `http://localhost:3000` to see the API documentation.

### Main Endpoints

#### Authentication
- `POST /api/auth/token` - Generate access token for a participant
- `POST /api/auth/validate` - Validate an access token

#### Rooms
- `POST /api/rooms` - Create a new room
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/:roomName` - Get room details
- `PATCH /api/rooms/:roomName` - Update room metadata
- `DELETE /api/rooms/:roomName` - Delete a room

#### Participants
- `GET /api/rooms/:roomName/participants` - List participants in a room
- `GET /api/rooms/:roomName/participants/:identity` - Get participant details
- `DELETE /api/rooms/:roomName/participants/:identity` - Remove participant from room

#### Data
- `POST /api/rooms/:roomName/data` - Send data to participants

#### Webhooks
- `POST /api/webhooks/livekit` - Handle LiveKit webhook events
- `GET /api/webhooks/events` - List supported webhook events

## 🔧 Configuration

Configuration is managed through environment variables. See `.env.example` for all available options.

### Key Configuration Options

- `LIVEKIT_API_KEY`: Your LiveKit API key
- `LIVEKIT_API_SECRET`: Your LiveKit API secret
- `LIVEKIT_HOST`: LiveKit server URL (e.g., `ws://localhost:7880` for local development)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: CORS allowed origins
- `DEFAULT_ROOM_MAX_PARTICIPANTS`: Default maximum participants per room
- `DEFAULT_ROOM_EMPTY_TIMEOUT`: Timeout in seconds before empty rooms are closed

## 🏗️ Project Structure

```
livekit-app/
├── src/
│   ├── app.ts              # Express app setup
│   ├── index.ts            # Server entry point
│   ├── config/             # Configuration management
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── .env                    # Environment variables (create from .env.example)
├── .env.example            # Example environment variables
├── jest.config.js          # Jest configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## 🧪 Testing

This project includes comprehensive unit and integration tests.

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/livekit.service.test.ts

# Generate coverage report
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test API endpoints and full request/response cycles

## 🔐 Security

- All tokens are JWT-based and signed with your API secret
- Webhook endpoints verify signatures to ensure authenticity
- Input validation on all API endpoints
- CORS configuration for cross-origin requests

## 🚀 Deployment

### Using Docker

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t livekit-app .
docker run -p 3000:3000 --env-file .env livekit-app
```

### Using PM2

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name livekit-app
```

## 🤝 Integration with LiveKit

This application is designed to work seamlessly with LiveKit. You'll need:

1. **LiveKit Server**: Either self-hosted or LiveKit Cloud
2. **API Credentials**: Generate from your LiveKit dashboard
3. **Client SDK**: Use LiveKit client SDKs to connect from web/mobile apps

## 📝 Example Usage

### Generate a Token

```bash
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user123",
    "roomName": "meeting-room",
    "name": "John Doe"
  }'
```

### Create a Room

```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "meeting-room",
    "maxParticipants": 10
  }'
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure LiveKit server is running and accessible
2. **Invalid Token**: Check API key and secret are correct
3. **CORS Errors**: Update `CORS_ORIGIN` in environment variables

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with [LiveKit](https://livekit.io) - Open source live audio and video infrastructure