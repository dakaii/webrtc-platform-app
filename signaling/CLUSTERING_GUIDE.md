# Redis-Based Clustering Implementation Guide

This guide explains how the Redis-based clustering system works in the WebRTC signaling server, with detailed examples and data flows.

## Overview

The clustering system allows multiple signaling server instances to coordinate via Redis, providing:

- **Horizontal scaling**: Run multiple signaling servers
- **Cross-server communication**: Users on different servers can communicate
- **Graceful fallback**: Automatically falls back to local mode if Redis is unavailable
- **State synchronization**: Room state shared across all servers

## Architecture

```
[User A] ──── [Server 1] ─────┐
                               │
[User B] ──── [Server 2] ─────┼──── [Redis] ── Coordination
                               │              ├─ Room state
[User C] ──── [Server 3] ─────┘              ├─ Message routing
                                              └─ Health monitoring
```

## Data Structures in Redis

### 1. Room Participants Registry

**Key Pattern**: `rooms:{room_id}:participants`
**Type**: Hash
**Purpose**: Track which users are in which room and on which server

```redis
HGETALL rooms:room123:participants
1) "1001"        # user_id
2) "server-1"    # server node_id
3) "1002"
4) "server-2"
5) "1003"
6) "server-1"
```

### 2. Server Connection Registry

**Key Pattern**: `servers:{node_id}:connections`
**Type**: Hash
**Purpose**: Track local connections on each server

```redis
HGETALL servers:server-1:connections
1) "1001"
2) "{'user_id': 1001, 'username': 'alice', 'room_id': 'room123', 'connected_at': '2024-01-01T10:00:00Z', 'connection_id': 'uuid...'}"
3) "1003"
4) "{'user_id': 1003, 'username': 'charlie', 'room_id': 'room123', 'connected_at': '2024-01-01T10:05:00Z', 'connection_id': 'uuid...'}"
```

### 3. Server Health Monitoring

**Key Pattern**: `servers:{node_id}:heartbeat`
**Type**: String with TTL (30 seconds)
**Purpose**: Detect failed servers

```redis
GET servers:server-1:heartbeat
"1704110400"  # Unix timestamp

TTL servers:server-1:heartbeat
27  # Seconds remaining
```

### 4. Pub/Sub Channels

- `cluster:messages` - Cross-server message routing
- `cluster:events` - Server lifecycle events

## Detailed Examples

### Example 1: User Joins Room

**Scenario**: Alice (User 1001) joins "room123" on Server-1

#### Step 1: Local Registration

```rust
// On Server-1
let participant = RoomParticipant {
    user: alice_user,
    connection_id: uuid,
    sender: websocket_tx,
};

// Add to local connections
local_connections.insert(1001, participant);
```

#### Step 2: Redis Registration

```redis
# Add user to room participants
HSET rooms:room123:participants 1001 server-1

# Add to server's connection list
HSET servers:server-1:connections 1001 '{"user_id": 1001, "username": "alice", "room_id": "room123", "connected_at": "2024-01-01T10:00:00Z", "connection_id": "uuid..."}'
```

#### Step 3: Get Existing Participants

```redis
# Get all participants in room
HGETALL rooms:room123:participants
# Returns: {1002: "server-2", 1003: "server-1"}

# Get usernames from each server
HGET servers:server-2:connections 1002
# Returns: '{"username": "bob", ...}'
```

#### Step 4: Broadcast Join Event

```redis
# Publish to all servers
PUBLISH cluster:messages '{
  "UserJoined": {
    "room_id": "room123",
    "user_id": 1001,
    "username": "alice",
    "target_server": null
  }
}'
```

#### Step 5: Other Servers Receive Event

```rust
// On Server-2 and Server-3
async fn handle_cluster_message(message: ClusterMessage) {
    match message {
        ClusterMessage::UserJoined { room_id, user_id, username, .. } => {
            // Notify local users about new participant
            let server_message = ServerMessage::UserJoined {
                room_name: room_id,
                user: Participant { user_id, username },
            };
            broadcast_to_local_room_participants(server_message).await;
        }
    }
}
```

### Example 2: Cross-Server WebRTC Signaling

**Scenario**: Alice (Server-1) sends WebRTC offer to Bob (Server-2)

#### Step 1: Alice Sends Offer

```javascript
// Frontend: Alice's browser
websocket.send(
  JSON.stringify({
    type: "Offer",
    room_name: "room123",
    sdp: "v=0\r\no=alice...",
    target_user_id: 1002, // Bob's user_id
  })
);
```

#### Step 2: Server-1 Processing

```rust
// Server-1 receives offer
ClientMessage::Offer { room_name, sdp, target_user_id } => {
    // Check if target user is local
    if local_connections.contains_key(&target_user_id) {
        // Send directly - user is on this server
        local_delivery(target_user_id, offer_message).await;
    } else {
        // User is on different server - route via Redis
        route_via_redis(room_name, target_user_id, offer_message).await;
    }
}
```

#### Step 3: Find Target Server

```redis
# Server-1 queries Redis to find Bob's server
HGET rooms:room123:participants 1002
# Returns: "server-2"
```

#### Step 4: Route Message via Redis

```redis
# Server-1 publishes routing message
PUBLISH cluster:messages '{
  "WebRTCSignal": {
    "room_id": "room123",
    "from_user": 1001,
    "to_user": 1002,
    "signal_type": "offer",
    "signal_data": "v=0\\r\\no=alice..."
  }
}'
```

#### Step 5: Server-2 Receives and Delivers

```rust
// Server-2 receives the cluster message
ClusterMessage::WebRTCSignal { from_user, to_user, signal_data, .. } => {
    // Check if target user is connected locally
    if let Some(participant) = local_connections.get(&to_user) {
        let message = ServerMessage::Offer {
            room_name: room_id,
            from_user_id: from_user,
            sdp: signal_data,
        };

        // Send to Bob's WebSocket
        participant.sender.send(websocket_message).await;
    }
}
```

#### Step 6: Bob Receives Offer

```javascript
// Frontend: Bob's browser receives
websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // message = {
  //   type: "Offer",
  //   room_name: "room123",
  //   from_user_id: 1001,
  //   sdp: "v=0\r\no=alice..."
  // }

  // Bob processes the offer and creates answer
  handleOffer(message);
};
```

### Example 3: Server Failure Recovery

**Scenario**: Server-2 crashes, cleanup required

#### Step 1: Heartbeat Detection

```rust
// Server health monitor (runs on all servers)
async fn cleanup_dead_servers() {
    let now = Utc::now().timestamp();

    // Find servers with expired heartbeats
    for server_key in redis.keys("servers:*:heartbeat").await {
        if let Ok(last_heartbeat) = redis.get(&server_key).await {
            if now - last_heartbeat > 60 {
                // Server is dead - cleanup required
                cleanup_server_connections(server_id).await;
            }
        }
    }
}
```

#### Step 2: Cleanup Dead Server Data

```redis
# Get all connections from dead server
HGETALL servers:server-2:connections
# Returns all user connections from server-2

# For each user, remove from rooms
HDEL rooms:room123:participants 1002
HDEL rooms:room456:participants 1004

# Delete server's connection registry
DEL servers:server-2:connections
DEL servers:server-2:heartbeat
```

#### Step 3: Notify Other Servers

```redis
# Publish leave events for each user
PUBLISH cluster:messages '{
  "UserLeft": {
    "room_id": "room123",
    "user_id": 1002,
    "target_server": null
  }
}'
```

#### Step 4: Update Local State

```rust
// Other servers receive the leave events
ClusterMessage::UserLeft { room_id, user_id, .. } => {
    let message = ServerMessage::UserLeft {
        room_name: room_id,
        user_id,
    };

    // Notify local users that user left
    broadcast_to_local_room_participants(message).await;
}
```

## Configuration Examples

### Single Server (Local Mode)

```bash
# .env
CLUSTER_MODE=false
REDIS_URL=redis://localhost:6379  # Optional - not used
NODE_ID=signaling-1               # Optional - not used
```

### Cluster Mode (3 Servers)

```bash
# Server 1 .env
CLUSTER_MODE=true
REDIS_URL=redis://redis-server:6379
NODE_ID=signaling-1

# Server 2 .env
CLUSTER_MODE=true
REDIS_URL=redis://redis-server:6379
NODE_ID=signaling-2

# Server 3 .env
CLUSTER_MODE=true
REDIS_URL=redis://redis-server:6379
NODE_ID=signaling-3
```

### Load Balancer Configuration

```nginx
upstream signaling_servers {
    server signaling-1:9000;
    server signaling-2:9000;
    server signaling-3:9000;
}

server {
    location /ws {
        proxy_pass http://signaling_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Message Flow Diagrams

### Room Join Flow

```
Alice Browser ──► Server-1 ──► Redis ──► Server-2 ──► Bob Browser
     │              │          │ SET     │ NOTIFY     │
     │              │          │ PUBLISH │            │
     │              │ ◄────────┼─────────┼────────────┘
     │              │ participants      │
     │ ◄────────────┼───────────────────┘
     │ room_joined
```

### WebRTC Signal Flow

```
Alice Browser ──► Server-1 ──► Redis ──► Server-2 ──► Bob Browser
   offer            │ find_user │ PUBLISH │ deliver    │ receive_offer
                    │           │ route   │            │
Bob Browser   ◄───┼─────────────┼─────────┼────────────┘
   answer          │             │ PUBLISH │
                   │ deliver ◄───┼─────────┘
Alice Browser ◄───┘
   receive_answer
```

## Performance Characteristics

### Latency

- **Local users (same server)**: ~1ms (direct WebSocket)
- **Cross-server users**: ~5-10ms (via Redis pub/sub)
- **Redis operations**: ~1-2ms per operation

### Scalability

- **Users per server**: 1,000-10,000 (depending on hardware)
- **Total users**: Limited by Redis performance (~100K operations/sec)
- **Servers**: No practical limit (Redis handles coordination)

### Memory Usage

- **Per user in Redis**: ~200 bytes (participant + connection info)
- **Per room in Redis**: ~50 bytes + (users × 50 bytes)
- **Local memory**: Same as single-server mode

## Fallback Behavior

When Redis becomes unavailable:

1. **Existing connections**: Continue working in local mode
2. **New joins**: Only see users on same server
3. **Cross-server communication**: Fails gracefully
4. **Recovery**: Automatic when Redis comes back online

This provides **graceful degradation** - the system continues working with reduced functionality rather than complete failure.

## Monitoring and Debugging

### Redis Monitoring Commands

```bash
# Check cluster health
redis-cli INFO keyspace

# Monitor real-time activity
redis-cli MONITOR

# Check room state
redis-cli HGETALL rooms:room123:participants

# Check server connections
redis-cli HGETALL servers:server-1:connections

# Monitor pub/sub activity
redis-cli PSUBSCRIBE cluster:*
```

### Health Check Endpoints

```rust
// Add to your HTTP server
async fn cluster_health() -> Json<ClusterHealthStatus> {
    Json(ClusterHealthStatus {
        redis_connected: room_manager.health_check().await,
        local_connections: get_connection_count().await,
        mode: if redis_connected { "cluster" } else { "local" },
    })
}
```

This clustering implementation provides a robust, scalable solution while maintaining simplicity and reliability through graceful fallback mechanisms.
