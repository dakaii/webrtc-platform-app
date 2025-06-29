# Migration Guide: From Rust WebRTC Signaling to LiveKit

This guide helps you migrate from the custom Rust WebRTC signaling server to the LiveKit-based solution.

## 🔄 Key Differences

### Architecture Changes

| Rust Signaling Server | LiveKit Application |
|----------------------|---------------------|
| Custom WebRTC signaling | LiveKit handles all WebRTC signaling |
| Manual ICE/SDP handling | Automatic negotiation via LiveKit |
| Custom room management | Built-in room management |
| WebSocket-based | REST API + LiveKit SDK |
| JWT authentication | LiveKit access tokens |
| Manual Redis clustering | LiveKit handles scaling |

### Advantages of LiveKit

1. **No Signaling Code**: LiveKit handles all WebRTC complexity
2. **Built-in Features**: Recording, streaming, SFU, TURN servers
3. **Better Scalability**: Proven infrastructure for thousands of participants
4. **Client SDKs**: Official SDKs for all major platforms
5. **Active Development**: Regular updates and improvements

## 🚀 Migration Steps

### 1. Deploy LiveKit Server

#### Option A: Use LiveKit Cloud (Recommended)
1. Sign up at https://cloud.livekit.io
2. Create a project and get API credentials
3. Update `.env` with your credentials

#### Option B: Self-Host LiveKit
```bash
# Using Docker
docker run -d \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server \
  --dev
```

### 2. Update Client Applications

Replace your WebSocket signaling code with LiveKit SDK:

#### Before (Custom WebSocket)
```javascript
const ws = new WebSocket('ws://localhost:9000');
ws.send(JSON.stringify({
  type: 'join',
  room: 'test-room',
  token: 'jwt-token'
}));
```

#### After (LiveKit SDK)
```javascript
import { Room } from 'livekit-client';

const room = new Room();
await room.connect('ws://localhost:7880', token);
```

### 3. Token Generation

Replace JWT generation with LiveKit tokens:

#### Before (Rust JWT)
```rust
let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref()))?;
```

#### After (LiveKit API)
```bash
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user123",
    "roomName": "test-room"
  }'
```

### 4. Room Management

#### Creating Rooms

**Before**: Rooms created automatically on first join
**After**: 
```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "test-room",
    "maxParticipants": 50
  }'
```

#### Listing Participants

**Before**: Custom WebSocket message
**After**:
```bash
curl http://localhost:3000/api/rooms/test-room/participants
```

### 5. Data Channels

Replace custom data channel implementation:

#### Before
```javascript
dataChannel.send(JSON.stringify({ type: 'chat', message: 'Hello' }));
```

#### After
```javascript
// Using LiveKit data messages
room.localParticipant.publishData(
  new TextEncoder().encode(JSON.stringify({ message: 'Hello' })),
  DataPacket_Kind.RELIABLE
);
```

## 📦 Client Migration Examples

### Web Client

1. Install LiveKit SDK:
```bash
npm install livekit-client
```

2. Update connection code:
```javascript
import { Room, RoomEvent } from 'livekit-client';

const room = new Room();

// Connect to room
const token = await fetchTokenFromAPI(identity, roomName);
await room.connect('ws://localhost:7880', token);

// Handle events
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  // Handle new track
});

room.on(RoomEvent.ParticipantConnected, (participant) => {
  // Handle new participant
});
```

### Mobile Clients

#### iOS/Swift
```swift
import LiveKit

let room = Room(delegate: self)
try await room.connect(url: "ws://localhost:7880", token: token)
```

#### Android/Kotlin
```kotlin
val room = LiveKit.create(appContext)
room.connect(url, token)
```

## 🔧 Feature Mapping

| Rust Signaling Feature | LiveKit Equivalent |
|------------------------|-------------------|
| JWT Authentication | LiveKit Access Tokens |
| Room Creation | `POST /api/rooms` or auto-create |
| Join Room | `room.connect()` with token |
| Leave Room | `room.disconnect()` |
| Send Offer/Answer | Handled automatically |
| ICE Candidates | Handled automatically |
| Participant List | `room.participants` |
| Kick Participant | `DELETE /api/rooms/:room/participants/:identity` |
| Send Data | `publishData()` method |
| Room Metadata | Room metadata API |

## 🎯 Testing the Migration

1. **Start LiveKit Server** (local or cloud)
2. **Run the new API**:
   ```bash
   cd livekit-app
   npm run dev
   ```

3. **Test token generation**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/token \
     -H "Content-Type: application/json" \
     -d '{"identity": "test-user", "roomName": "test-room"}'
   ```

4. **Test with LiveKit example app**:
   - Go to https://meet.livekit.io
   - Use the generated token to connect

## 🚨 Common Migration Issues

### Issue 1: CORS Errors
**Solution**: Update `CORS_ORIGIN` in `.env` to include your client domains

### Issue 2: Connection Refused
**Solution**: Ensure LiveKit server is running and accessible

### Issue 3: Invalid Token
**Solution**: Check API key/secret match between server and API

### Issue 4: Missing Features
**Solution**: Most WebRTC features are built into LiveKit. Check LiveKit docs for specific functionality.

## 📚 Resources

- [LiveKit Documentation](https://docs.livekit.io)
- [LiveKit Client SDK Guide](https://docs.livekit.io/client-sdk-js/)
- [LiveKit Server SDK Guide](https://docs.livekit.io/server-sdk-js/)
- [Migration Examples](https://github.com/livekit/livekit-examples)

## ✅ Migration Checklist

- [ ] Deploy LiveKit server (cloud or self-hosted)
- [ ] Set up LiveKit API application
- [ ] Update client applications to use LiveKit SDK
- [ ] Replace WebSocket connections with LiveKit rooms
- [ ] Update token generation logic
- [ ] Test room creation and joining
- [ ] Test audio/video streaming
- [ ] Test data channels
- [ ] Update deployment configuration
- [ ] Run integration tests
- [ ] Deploy to production

## 🎉 Benefits After Migration

1. **Reduced Complexity**: No need to maintain WebRTC signaling code
2. **Better Performance**: Optimized media routing and quality adaptation
3. **More Features**: Recording, streaming, simulcast, etc.
4. **Easier Scaling**: Built-in clustering and load balancing
5. **Active Support**: Regular updates and community support

Need help? Check the [LiveKit Community](https://livekit.io/community) or file an issue!