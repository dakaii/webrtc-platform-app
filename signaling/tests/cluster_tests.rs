use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, RwLock};
use tokio::time::timeout;
use tokio_test;
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

use webrtc_signaling::auth::AuthenticatedUser;
use webrtc_signaling::cluster::{ClusterMessage, ClusterRoomManager, ConnectionInfo};
use webrtc_signaling::messages::{Participant, ServerMessage};
use webrtc_signaling::room::{LocalRoomManager, RoomManagerTrait, RoomParticipant};

// Test utilities
fn create_test_user(user_id: u32, username: &str) -> AuthenticatedUser {
    AuthenticatedUser {
        user_id,
        username: username.to_string(),
    }
}

fn create_test_participant(user_id: u32, username: &str) -> RoomParticipant {
    let (tx, _rx) = mpsc::unbounded_channel::<Message>();
    RoomParticipant {
        user: create_test_user(user_id, username),
        connection_id: Uuid::new_v4(),
        sender: tx,
    }
}

// Mock Redis for testing
struct MockRedisClient {
    data: Arc<RwLock<HashMap<String, String>>>,
    hash_data: Arc<RwLock<HashMap<String, HashMap<String, String>>>>,
    pub_sub_messages: Arc<RwLock<Vec<(String, String)>>>,
    should_fail: Arc<RwLock<bool>>,
}

impl MockRedisClient {
    fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
            hash_data: Arc::new(RwLock::new(HashMap::new())),
            pub_sub_messages: Arc::new(RwLock::new(Vec::new())),
            should_fail: Arc::new(RwLock::new(false)),
        }
    }

    async fn set_failure(&self, should_fail: bool) {
        *self.should_fail.write().await = should_fail;
    }

    async fn hset(&self, key: &str, field: &str, value: &str) -> Result<(), &'static str> {
        if *self.should_fail.read().await {
            return Err("Redis connection failed");
        }

        let mut hash_data = self.hash_data.write().await;
        let hash = hash_data
            .entry(key.to_string())
            .or_insert_with(HashMap::new);
        hash.insert(field.to_string(), value.to_string());
        Ok(())
    }

    async fn hget(&self, key: &str, field: &str) -> Result<Option<String>, &'static str> {
        if *self.should_fail.read().await {
            return Err("Redis connection failed");
        }

        let hash_data = self.hash_data.read().await;
        Ok(hash_data.get(key).and_then(|hash| hash.get(field)).cloned())
    }

    async fn hdel(&self, key: &str, field: &str) -> Result<(), &'static str> {
        if *self.should_fail.read().await {
            return Err("Redis connection failed");
        }

        let mut hash_data = self.hash_data.write().await;
        if let Some(hash) = hash_data.get_mut(key) {
            hash.remove(field);
        }
        Ok(())
    }

    async fn hgetall(&self, key: &str) -> Result<HashMap<String, String>, &'static str> {
        if *self.should_fail.read().await {
            return Err("Redis connection failed");
        }

        let hash_data = self.hash_data.read().await;
        Ok(hash_data.get(key).cloned().unwrap_or_default())
    }

    async fn publish(&self, channel: &str, message: &str) -> Result<(), &'static str> {
        if *self.should_fail.read().await {
            return Err("Redis connection failed");
        }

        let mut messages = self.pub_sub_messages.write().await;
        messages.push((channel.to_string(), message.to_string()));
        Ok(())
    }

    async fn get_published_messages(&self) -> Vec<(String, String)> {
        self.pub_sub_messages.read().await.clone()
    }

    async fn clear_published_messages(&self) {
        self.pub_sub_messages.write().await.clear();
    }
}

// Tests for ClusterMessage serialization
#[test]
fn test_cluster_message_serialization() {
    let user_joined = ClusterMessage::UserJoined {
        room_id: "room123".to_string(),
        user_id: 1001,
        username: "alice".to_string(),
        target_server: None,
    };

    let json = serde_json::to_string(&user_joined).unwrap();
    let deserialized: ClusterMessage = serde_json::from_str(&json).unwrap();

    match deserialized {
        ClusterMessage::UserJoined {
            room_id,
            user_id,
            username,
            target_server,
        } => {
            assert_eq!(room_id, "room123");
            assert_eq!(user_id, 1001);
            assert_eq!(username, "alice");
            assert_eq!(target_server, None);
        }
        _ => panic!("Wrong message type deserialized"),
    }
}

#[test]
fn test_webrtc_signal_message_serialization() {
    let webrtc_signal = ClusterMessage::WebRTCSignal {
        room_id: "room123".to_string(),
        from_user: 1001,
        to_user: 1002,
        signal_type: "offer".to_string(),
        signal_data: "v=0\r\no=alice...".to_string(),
    };

    let json = serde_json::to_string(&webrtc_signal).unwrap();
    let deserialized: ClusterMessage = serde_json::from_str(&json).unwrap();

    match deserialized {
        ClusterMessage::WebRTCSignal {
            room_id,
            from_user,
            to_user,
            signal_type,
            signal_data,
        } => {
            assert_eq!(room_id, "room123");
            assert_eq!(from_user, 1001);
            assert_eq!(to_user, 1002);
            assert_eq!(signal_type, "offer");
            assert_eq!(signal_data, "v=0\r\no=alice...");
        }
        _ => panic!("Wrong message type deserialized"),
    }
}

#[test]
fn test_connection_info_serialization() {
    use chrono::Utc;

    let connection_info = ConnectionInfo {
        user_id: 1001,
        username: "alice".to_string(),
        room_id: "room123".to_string(),
        connected_at: Utc::now(),
        connection_id: Uuid::new_v4(),
    };

    let json = serde_json::to_string(&connection_info).unwrap();
    let deserialized: ConnectionInfo = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.user_id, 1001);
    assert_eq!(deserialized.username, "alice");
    assert_eq!(deserialized.room_id, "room123");
}

// Tests for LocalRoomManager (baseline)
#[tokio::test]
async fn test_local_room_manager_basic_operations() {
    let manager = LocalRoomManager::new();
    let participant = create_test_participant(123, "testuser");

    // Test join room
    let result = manager
        .join_room("test_room".to_string(), participant)
        .await;
    assert!(result.is_ok());
    let existing_participants = result.unwrap();
    assert!(existing_participants.is_empty());

    // Test user in room
    assert!(manager.user_in_room("test_room", 123).await);
    assert!(!manager.user_in_room("test_room", 999).await);

    // Test get participants
    let participants = manager.get_room_participants("test_room").await;
    assert_eq!(participants.len(), 1);
    assert_eq!(participants[0].user_id, 123);

    // Test leave room
    let result = manager.leave_room("test_room", 123).await;
    assert!(result.is_ok());

    // Room should be empty now
    let participants = manager.get_room_participants("test_room").await;
    assert!(participants.is_empty());

    // Test health check
    assert!(manager.health_check().await);
}

#[tokio::test]
async fn test_local_room_manager_multiple_users() {
    let manager = LocalRoomManager::new();
    let participant1 = create_test_participant(123, "user1");
    let participant2 = create_test_participant(456, "user2");

    // Both users join
    let result1 = manager
        .join_room("test_room".to_string(), participant1)
        .await;
    assert!(result1.is_ok());

    let result2 = manager
        .join_room("test_room".to_string(), participant2)
        .await;
    assert!(result2.is_ok());
    let existing_participants = result2.unwrap();
    assert_eq!(existing_participants.len(), 1); // user1 was already there

    // Check both users are in room
    assert!(manager.user_in_room("test_room", 123).await);
    assert!(manager.user_in_room("test_room", 456).await);

    let participants = manager.get_room_participants("test_room").await;
    assert_eq!(participants.len(), 2);

    // One user leaves
    let result = manager.leave_room("test_room", 123).await;
    assert!(result.is_ok());

    // Check remaining user
    assert!(!manager.user_in_room("test_room", 123).await);
    assert!(manager.user_in_room("test_room", 456).await);

    let participants = manager.get_room_participants("test_room").await;
    assert_eq!(participants.len(), 1);
    assert_eq!(participants[0].user_id, 456);
}

// Mock cluster tests (simulating Redis behavior without actual Redis)
#[tokio::test]
async fn test_cluster_message_routing_simulation() {
    // Simulate two servers communicating via Redis
    let server1_connections = Arc::new(RwLock::new(HashMap::new()));
    let server2_connections = Arc::new(RwLock::new(HashMap::new()));

    // Server 1 has Alice (user 1001)
    let alice_participant = create_test_participant(1001, "alice");
    server1_connections
        .write()
        .await
        .insert(1001, alice_participant);

    // Server 2 has Bob (user 1002)
    let bob_participant = create_test_participant(1002, "bob");
    server2_connections
        .write()
        .await
        .insert(1002, bob_participant);

    // Simulate Alice sending WebRTC offer to Bob
    let webrtc_message = ClusterMessage::WebRTCSignal {
        room_id: "room123".to_string(),
        from_user: 1001,
        to_user: 1002,
        signal_type: "offer".to_string(),
        signal_data: "v=0\r\no=alice...".to_string(),
    };

    // Simulate message routing via Redis pub/sub
    let message_json = serde_json::to_string(&webrtc_message).unwrap();

    // Server 2 receives the message and processes it
    let received_message: ClusterMessage = serde_json::from_str(&message_json).unwrap();

    match received_message {
        ClusterMessage::WebRTCSignal {
            from_user,
            to_user,
            signal_type,
            signal_data,
            ..
        } => {
            assert_eq!(from_user, 1001);
            assert_eq!(to_user, 1002);
            assert_eq!(signal_type, "offer");
            assert_eq!(signal_data, "v=0\r\no=alice...");

            // Verify Bob is connected to server 2
            let connections = server2_connections.read().await;
            assert!(connections.contains_key(&to_user));
        }
        _ => panic!("Expected WebRTCSignal message"),
    }
}

#[tokio::test]
async fn test_cluster_user_join_leave_simulation() {
    let mock_redis = MockRedisClient::new();

    // Simulate user joining room
    let room_key = "rooms:room123:participants";
    let server_key = "servers:server-1:connections";

    // User joins
    mock_redis.hset(room_key, "1001", "server-1").await.unwrap();

    let connection_info = ConnectionInfo {
        user_id: 1001,
        username: "alice".to_string(),
        room_id: "room123".to_string(),
        connected_at: chrono::Utc::now(),
        connection_id: Uuid::new_v4(),
    };
    let connection_json = serde_json::to_string(&connection_info).unwrap();
    mock_redis
        .hset(server_key, "1001", &connection_json)
        .await
        .unwrap();

    // Publish join message
    let join_message = ClusterMessage::UserJoined {
        room_id: "room123".to_string(),
        user_id: 1001,
        username: "alice".to_string(),
        target_server: None,
    };
    let message_json = serde_json::to_string(&join_message).unwrap();
    mock_redis
        .publish("cluster:messages", &message_json)
        .await
        .unwrap();

    // Verify data was stored
    let stored_server = mock_redis.hget(room_key, "1001").await.unwrap();
    assert_eq!(stored_server, Some("server-1".to_string()));

    let stored_connection = mock_redis.hget(server_key, "1001").await.unwrap();
    assert!(stored_connection.is_some());

    // Verify message was published
    let messages = mock_redis.get_published_messages().await;
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0].0, "cluster:messages");

    // User leaves
    mock_redis.hdel(room_key, "1001").await.unwrap();
    mock_redis.hdel(server_key, "1001").await.unwrap();

    let leave_message = ClusterMessage::UserLeft {
        room_id: "room123".to_string(),
        user_id: 1001,
        target_server: None,
    };
    let leave_json = serde_json::to_string(&leave_message).unwrap();
    mock_redis
        .publish("cluster:messages", &leave_json)
        .await
        .unwrap();

    // Verify user was removed
    let stored_server = mock_redis.hget(room_key, "1001").await.unwrap();
    assert_eq!(stored_server, None);
}

#[tokio::test]
async fn test_cluster_failure_recovery_simulation() {
    let mock_redis = MockRedisClient::new();

    // Setup multiple users on different servers
    let room_key = "rooms:room123:participants";

    // Server-1 users
    mock_redis.hset(room_key, "1001", "server-1").await.unwrap();
    mock_redis.hset(room_key, "1003", "server-1").await.unwrap();

    // Server-2 users
    mock_redis.hset(room_key, "1002", "server-2").await.unwrap();
    mock_redis.hset(room_key, "1004", "server-2").await.unwrap();

    // Verify all users are registered
    let all_participants = mock_redis.hgetall(room_key).await.unwrap();
    assert_eq!(all_participants.len(), 4);

    // Simulate server-2 failure - remove all its users
    let server_2_users = vec![1002, 1004];
    for user_id in server_2_users {
        mock_redis
            .hdel(room_key, &user_id.to_string())
            .await
            .unwrap();

        // Publish leave message for each user
        let leave_message = ClusterMessage::UserLeft {
            room_id: "room123".to_string(),
            user_id,
            target_server: None,
        };
        let leave_json = serde_json::to_string(&leave_message).unwrap();
        mock_redis
            .publish("cluster:messages", &leave_json)
            .await
            .unwrap();
    }

    // Verify only server-1 users remain
    let remaining_participants = mock_redis.hgetall(room_key).await.unwrap();
    assert_eq!(remaining_participants.len(), 2);
    assert_eq!(
        remaining_participants.get("1001"),
        Some(&"server-1".to_string())
    );
    assert_eq!(
        remaining_participants.get("1003"),
        Some(&"server-1".to_string())
    );

    // Verify leave messages were published
    let messages = mock_redis.get_published_messages().await;
    assert_eq!(messages.len(), 2); // Two leave messages
}

#[tokio::test]
async fn test_redis_failure_fallback_simulation() {
    let mock_redis = MockRedisClient::new();

    // Initially Redis is working
    assert!(mock_redis.hset("test", "field", "value").await.is_ok());

    // Simulate Redis failure
    mock_redis.set_failure(true).await;

    // Operations should fail
    assert!(mock_redis.hset("test", "field", "value").await.is_err());
    assert!(mock_redis.hget("test", "field").await.is_err());
    assert!(mock_redis.publish("channel", "message").await.is_err());

    // Simulate Redis recovery
    mock_redis.set_failure(false).await;

    // Operations should work again
    assert!(mock_redis.hset("test", "field", "value").await.is_ok());
    let value = mock_redis.hget("test", "field").await.unwrap();
    assert_eq!(value, Some("value".to_string()));
}

#[tokio::test]
async fn test_concurrent_room_operations() {
    use tokio::task::JoinSet;

    let manager = LocalRoomManager::new();
    let manager = Arc::new(manager);

    let mut join_set = JoinSet::new();

    // Spawn multiple concurrent join operations
    for i in 0..10 {
        let manager_clone = Arc::clone(&manager);
        join_set.spawn(async move {
            let participant = create_test_participant(i, &format!("user{}", i));
            manager_clone
                .join_room("concurrent_room".to_string(), participant)
                .await
        });
    }

    // Wait for all joins to complete
    let mut results = Vec::new();
    while let Some(result) = join_set.join_next().await {
        results.push(result.unwrap());
    }

    // All joins should succeed
    assert_eq!(results.len(), 10);
    for result in results {
        assert!(result.is_ok());
    }

    // Verify all users are in the room
    let participants = manager.get_room_participants("concurrent_room").await;
    assert_eq!(participants.len(), 10);

    // Spawn concurrent leave operations
    let mut leave_set = JoinSet::new();
    for i in 0..10 {
        let manager_clone = Arc::clone(&manager);
        leave_set.spawn(async move { manager_clone.leave_room("concurrent_room", i).await });
    }

    // Wait for all leaves to complete
    let mut leave_results = Vec::new();
    while let Some(result) = leave_set.join_next().await {
        leave_results.push(result.unwrap());
    }

    // All but last leave should succeed (room gets deleted when empty)
    let successful_leaves = leave_results.iter().filter(|r| r.is_ok()).count();
    assert!(successful_leaves >= 9); // At least 9 should succeed

    // Room should be empty
    let participants = manager.get_room_participants("concurrent_room").await;
    assert!(participants.is_empty());
}

#[tokio::test]
async fn test_message_broadcast_simulation() {
    // Simulate broadcasting to multiple local connections
    let local_connections = Arc::new(RwLock::new(HashMap::new()));

    // Create multiple test participants with message receivers
    let mut receivers = Vec::new();
    for i in 1..=3 {
        let (tx, rx) = mpsc::unbounded_channel::<Message>();
        let participant = RoomParticipant {
            user: create_test_user(i, &format!("user{}", i)),
            connection_id: Uuid::new_v4(),
            sender: tx,
        };
        local_connections.write().await.insert(i, participant);
        receivers.push(rx);
    }

    // Simulate broadcasting a user joined message
    let message = ServerMessage::UserJoined {
        room_name: "test_room".to_string(),
        user: Participant {
            user_id: 999,
            username: "new_user".to_string(),
        },
    };

    // Broadcast to all connections
    if let Ok(json_message) = serde_json::to_string(&message) {
        let websocket_message = Message::Text(json_message);
        let connections = local_connections.read().await;

        for (user_id, participant) in connections.iter() {
            let _ = participant.sender.send(websocket_message.clone());
        }
    }

    // Verify all receivers got the message
    for mut rx in receivers {
        let received = timeout(Duration::from_millis(100), rx.recv()).await;
        assert!(received.is_ok());

        if let Ok(Some(Message::Text(json))) = received {
            let server_msg: ServerMessage = serde_json::from_str(&json).unwrap();
            match server_msg {
                ServerMessage::UserJoined { room_name, user } => {
                    assert_eq!(room_name, "test_room");
                    assert_eq!(user.user_id, 999);
                    assert_eq!(user.username, "new_user");
                }
                _ => panic!("Expected UserJoined message"),
            }
        } else {
            panic!("Expected text message");
        }
    }
}

#[test]
fn test_cluster_heartbeat_message() {
    let heartbeat = ClusterMessage::ServerHeartbeat {
        node_id: "server-1".to_string(),
        timestamp: 1704110400,
        connection_count: 42,
    };

    let json = serde_json::to_string(&heartbeat).unwrap();
    let deserialized: ClusterMessage = serde_json::from_str(&json).unwrap();

    match deserialized {
        ClusterMessage::ServerHeartbeat {
            node_id,
            timestamp,
            connection_count,
        } => {
            assert_eq!(node_id, "server-1");
            assert_eq!(timestamp, 1704110400);
            assert_eq!(connection_count, 42);
        }
        _ => panic!("Wrong message type deserialized"),
    }
}

// Integration test helpers
fn create_mock_cluster_environment() -> (
    MockRedisClient,
    Vec<Arc<RwLock<HashMap<u32, RoomParticipant>>>>,
) {
    let mock_redis = MockRedisClient::new();
    let mut server_connections = Vec::new();

    // Create 3 mock servers
    for _ in 0..3 {
        server_connections.push(Arc::new(RwLock::new(HashMap::new())));
    }

    (mock_redis, server_connections)
}

#[tokio::test]
async fn test_full_cluster_simulation() {
    let (mock_redis, server_connections) = create_mock_cluster_environment();

    // Server 1: Alice joins room123
    let alice = create_test_participant(1001, "alice");
    server_connections[0].write().await.insert(1001, alice);
    mock_redis
        .hset("rooms:room123:participants", "1001", "server-1")
        .await
        .unwrap();

    // Server 2: Bob joins room123
    let bob = create_test_participant(1002, "bob");
    server_connections[1].write().await.insert(1002, bob);
    mock_redis
        .hset("rooms:room123:participants", "1002", "server-2")
        .await
        .unwrap();

    // Server 3: Charlie joins room123
    let charlie = create_test_participant(1003, "charlie");
    server_connections[2].write().await.insert(1003, charlie);
    mock_redis
        .hset("rooms:room123:participants", "1003", "server-3")
        .await
        .unwrap();

    // Verify all participants are registered
    let participants = mock_redis
        .hgetall("rooms:room123:participants")
        .await
        .unwrap();
    assert_eq!(participants.len(), 3);

    // Alice sends WebRTC offer to Bob (cross-server communication)
    let webrtc_signal = ClusterMessage::WebRTCSignal {
        room_id: "room123".to_string(),
        from_user: 1001,
        to_user: 1002,
        signal_type: "offer".to_string(),
        signal_data: "sdp_offer_data".to_string(),
    };

    let signal_json = serde_json::to_string(&webrtc_signal).unwrap();
    mock_redis
        .publish("cluster:messages", &signal_json)
        .await
        .unwrap();

    // Server 2 should route the message to Bob
    let messages = mock_redis.get_published_messages().await;
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0].0, "cluster:messages");

    let received_message: ClusterMessage = serde_json::from_str(&messages[0].1).unwrap();
    match received_message {
        ClusterMessage::WebRTCSignal {
            from_user, to_user, ..
        } => {
            assert_eq!(from_user, 1001);
            assert_eq!(to_user, 1002);

            // Verify Bob is on server 2
            let server_2_connections = server_connections[1].read().await;
            assert!(server_2_connections.contains_key(&to_user));
        }
        _ => panic!("Expected WebRTCSignal"),
    }

    // Charlie leaves the room
    server_connections[2].write().await.remove(&1003);
    mock_redis
        .hdel("rooms:room123:participants", "1003")
        .await
        .unwrap();

    let leave_message = ClusterMessage::UserLeft {
        room_id: "room123".to_string(),
        user_id: 1003,
        target_server: None,
    };
    let leave_json = serde_json::to_string(&leave_message).unwrap();
    mock_redis.clear_published_messages().await;
    mock_redis
        .publish("cluster:messages", &leave_json)
        .await
        .unwrap();

    // Verify Charlie was removed
    let remaining_participants = mock_redis
        .hgetall("rooms:room123:participants")
        .await
        .unwrap();
    assert_eq!(remaining_participants.len(), 2);
    assert!(!remaining_participants.contains_key("1003"));

    // Verify leave message was published
    let leave_messages = mock_redis.get_published_messages().await;
    assert_eq!(leave_messages.len(), 1);
}
