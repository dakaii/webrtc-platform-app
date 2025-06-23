use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;
use webrtc_signaling::auth::AuthenticatedUser;
use webrtc_signaling::room::{Room, RoomManager, RoomParticipant};
use webrtc_signaling::messages::ServerMessage;

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

#[test]
fn test_room_creation() {
    let room = Room::new("test_room".to_string());
    assert_eq!(room.name, "test_room");
    assert!(room.participants.is_empty());
    assert!(room.is_empty());
}

#[test]
fn test_add_participant_to_room() {
    let mut room = Room::new("test_room".to_string());
    let participant = create_test_participant(123, "testuser");

    let result = room.add_participant(participant);
    assert!(result);
    assert_eq!(room.participants.len(), 1);
    assert!(room.has_participant(123));
    assert!(!room.is_empty());
}

#[test]
fn test_add_duplicate_participant() {
    let mut room = Room::new("test_room".to_string());
    let participant1 = create_test_participant(123, "testuser");
    let participant2 = create_test_participant(123, "testuser"); // Same user ID

    let result1 = room.add_participant(participant1);
    assert!(result1);

    let result2 = room.add_participant(participant2);
    assert!(!result2); // Should fail - user already in room
    assert_eq!(room.participants.len(), 1);
}

#[test]
fn test_remove_participant_from_room() {
    let mut room = Room::new("test_room".to_string());
    let participant = create_test_participant(123, "testuser");

    room.add_participant(participant);
    assert!(room.has_participant(123));

    let removed = room.remove_participant(123);
    assert!(removed.is_some());
    assert!(!room.has_participant(123));
    assert!(room.is_empty());
}

#[test]
fn test_remove_nonexistent_participant() {
    let mut room = Room::new("test_room".to_string());

    let removed = room.remove_participant(999);
    assert!(removed.is_none());
}

#[test]
fn test_get_participants_list() {
    let mut room = Room::new("test_room".to_string());
    let participant1 = create_test_participant(123, "user1");
    let participant2 = create_test_participant(456, "user2");

    room.add_participant(participant1);
    room.add_participant(participant2);

    let participants = room.get_participants_list();
    assert_eq!(participants.len(), 2);

    // Check that both users are in the list
    let user_ids: Vec<u32> = participants.iter().map(|p| p.user_id).collect();
    assert!(user_ids.contains(&123));
    assert!(user_ids.contains(&456));
}

#[tokio::test]
async fn test_room_manager_creation() {
    let manager = RoomManager::new();
    let rooms = manager.get_rooms();
    let rooms_guard = rooms.read().await;
    assert!(rooms_guard.is_empty());
}

#[tokio::test]
async fn test_join_room_creates_new_room() {
    let manager = RoomManager::new();
    let participant = create_test_participant(123, "testuser");

    let result = manager.join_room("new_room".to_string(), participant).await;
    assert!(result.is_ok());

    let existing_participants = result.unwrap();
    assert!(existing_participants.is_empty()); // No existing participants in new room

    // Verify room was created
    let rooms = manager.get_rooms();
    let rooms_guard = rooms.read().await;
    assert!(rooms_guard.contains_key("new_room"));
}

#[tokio::test]
async fn test_join_existing_room() {
    let manager = RoomManager::new();
    let participant1 = create_test_participant(123, "user1");
    let participant2 = create_test_participant(456, "user2");

    // First user joins
    let result1 = manager.join_room("test_room".to_string(), participant1).await;
    assert!(result1.is_ok());

    // Second user joins
    let result2 = manager.join_room("test_room".to_string(), participant2).await;
    assert!(result2.is_ok());

    let existing_participants = result2.unwrap();
    assert_eq!(existing_participants.len(), 1); // One existing participant
    assert_eq!(existing_participants[0].user_id, 123);
}

#[tokio::test]
async fn test_join_room_duplicate_user() {
    let manager = RoomManager::new();
    let participant1 = create_test_participant(123, "testuser");
    let participant2 = create_test_participant(123, "testuser"); // Same user ID

    let result1 = manager.join_room("test_room".to_string(), participant1).await;
    assert!(result1.is_ok());

    let result2 = manager.join_room("test_room".to_string(), participant2).await;
    assert!(result2.is_err());
    assert_eq!(result2.unwrap_err(), "User already in room");
}

#[tokio::test]
async fn test_leave_room() {
    let manager = RoomManager::new();
    let participant = create_test_participant(123, "testuser");

    // Join room first
    manager.join_room("test_room".to_string(), participant).await.unwrap();

    // Then leave
    let result = manager.leave_room("test_room", 123).await;
    assert!(result.is_ok());

    // Room should be removed since it's empty
    let rooms = manager.get_rooms();
    let rooms_guard = rooms.read().await;
    assert!(!rooms_guard.contains_key("test_room"));
}

#[tokio::test]
async fn test_leave_room_with_remaining_participants() {
    let manager = RoomManager::new();
    let participant1 = create_test_participant(123, "user1");
    let participant2 = create_test_participant(456, "user2");

    // Both join room
    manager.join_room("test_room".to_string(), participant1).await.unwrap();
    manager.join_room("test_room".to_string(), participant2).await.unwrap();

    // One leaves
    let result = manager.leave_room("test_room", 123).await;
    assert!(result.is_ok());

    // Room should still exist
    let rooms = manager.get_rooms();
    let rooms_guard = rooms.read().await;
    assert!(rooms_guard.contains_key("test_room"));

    let room = rooms_guard.get("test_room").unwrap();
    assert_eq!(room.participants.len(), 1);
    assert!(room.has_participant(456));
}

#[tokio::test]
async fn test_leave_nonexistent_room() {
    let manager = RoomManager::new();

    let result = manager.leave_room("nonexistent_room", 123).await;
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Room not found");
}

#[tokio::test]
async fn test_leave_room_user_not_in_room() {
    let manager = RoomManager::new();
    let participant = create_test_participant(123, "testuser");

    // Create room with one user
    manager.join_room("test_room".to_string(), participant).await.unwrap();

    // Try to remove different user
    let result = manager.leave_room("test_room", 999).await;
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "User not in room");
}

#[tokio::test]
async fn test_user_in_room() {
    let manager = RoomManager::new();
    let participant = create_test_participant(123, "testuser");

    // Initially not in room
    assert!(!manager.user_in_room("test_room", 123).await);

    // Join room
    manager.join_room("test_room".to_string(), participant).await.unwrap();

    // Now in room
    assert!(manager.user_in_room("test_room", 123).await);
}

#[tokio::test]
async fn test_broadcast_to_room() {
    let manager = RoomManager::new();
    let participant = create_test_participant(123, "testuser");

    // Join room
    manager.join_room("test_room".to_string(), participant).await.unwrap();

    // Broadcast message
    let message = ServerMessage::error("test message");
    let result = manager.broadcast_to_room("test_room", 123, message).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_broadcast_to_nonexistent_room() {
    let manager = RoomManager::new();

    let message = ServerMessage::error("test message");
    let result = manager.broadcast_to_room("nonexistent_room", 123, message).await;
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Room not found");
}

#[tokio::test]
async fn test_remove_user_from_all_rooms() {
    let manager = RoomManager::new();
    let participant1 = create_test_participant(123, "testuser");
    let connection_id = participant1.connection_id;

    // Join multiple rooms with the same participant
    manager.join_room("room1".to_string(), participant1).await.unwrap();

    // Create second participant for different room
    let participant2 = create_test_participant(456, "otheruser");
    manager.join_room("room2".to_string(), participant2).await.unwrap();

    // Verify both users are in their respective rooms
    assert!(manager.user_in_room("room1", 123).await);
    assert!(manager.user_in_room("room2", 456).await);

    // Remove user 123 from all rooms
    manager.remove_user_from_all_rooms(123, connection_id).await;

    // Check that user 123 is removed from all rooms but 456 remains
    assert!(!manager.user_in_room("room1", 123).await);
    assert!(manager.user_in_room("room2", 456).await);
}

#[test]
fn test_participant_creation() {
    let user = create_test_user(123, "testuser");
    let (tx, _rx) = mpsc::unbounded_channel::<Message>();
    let connection_id = Uuid::new_v4();

    let participant = RoomParticipant {
        user: user.clone(),
        connection_id,
        sender: tx,
    };

    assert_eq!(participant.user.user_id, 123);
    assert_eq!(participant.user.username, "testuser");
    assert_eq!(participant.connection_id, connection_id);
}
