use webrtc_signaling::messages::*;

#[test]
fn test_client_message_auth_serialization() {
    let msg = ClientMessage::Auth {
        token: "test_token_123".to_string(),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"auth\""));
    assert!(json.contains("\"token\":\"test_token_123\""));

    let deserialized: ClientMessage = serde_json::from_str(&json).unwrap();
    match deserialized {
        ClientMessage::Auth { token } => assert_eq!(token, "test_token_123"),
        _ => panic!("Wrong message type"),
    }
}

#[test]
fn test_client_message_join_room_serialization() {
    let msg = ClientMessage::JoinRoom {
        room_name: "test_room".to_string(),
        password: Some("secret".to_string()),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"join-room\""));
    assert!(json.contains("\"roomName\":\"test_room\""));
    assert!(json.contains("\"password\":\"secret\""));

    let deserialized: ClientMessage = serde_json::from_str(&json).unwrap();
    match deserialized {
        ClientMessage::JoinRoom {
            room_name,
            password,
        } => {
            assert_eq!(room_name, "test_room");
            assert_eq!(password, Some("secret".to_string()));
        }
        _ => panic!("Wrong message type"),
    }
}

#[test]
fn test_client_message_join_room_without_password() {
    let msg = ClientMessage::JoinRoom {
        room_name: "public_room".to_string(),
        password: None,
    };

    let json = serde_json::to_string(&msg).unwrap();
    let deserialized: ClientMessage = serde_json::from_str(&json).unwrap();

    match deserialized {
        ClientMessage::JoinRoom {
            room_name,
            password,
        } => {
            assert_eq!(room_name, "public_room");
            assert_eq!(password, None);
        }
        _ => panic!("Wrong message type"),
    }
}

#[test]
fn test_client_message_leave_room_serialization() {
    let msg = ClientMessage::LeaveRoom {
        room_name: "test_room".to_string(),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"leave-room\""));
    assert!(json.contains("\"roomName\":\"test_room\""));

    let deserialized: ClientMessage = serde_json::from_str(&json).unwrap();
    match deserialized {
        ClientMessage::LeaveRoom { room_name } => assert_eq!(room_name, "test_room"),
        _ => panic!("Wrong message type"),
    }
}

#[test]
fn test_client_message_offer_serialization() {
    let msg = ClientMessage::Offer {
        room_name: "test_room".to_string(),
        sdp: "offer_sdp_data".to_string(),
        target_user_id: Some(123),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"offer\""));
    assert!(json.contains("\"roomName\":\"test_room\""));
    assert!(json.contains("\"sdp\":\"offer_sdp_data\""));
    assert!(json.contains("\"targetUserId\":123"));
}

#[test]
fn test_client_message_answer_serialization() {
    let msg = ClientMessage::Answer {
        room_name: "test_room".to_string(),
        sdp: "answer_sdp_data".to_string(),
        target_user_id: 456,
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"answer\""));
    assert!(json.contains("\"targetUserId\":456"));
}

#[test]
fn test_client_message_ice_candidate_serialization() {
    let msg = ClientMessage::IceCandidate {
        room_name: "test_room".to_string(),
        candidate: "ice_candidate_data".to_string(),
        sdp_mid: Some("audio".to_string()),
        sdp_mline_index: Some(0),
        target_user_id: Some(789),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"ice-candidate\""));
    assert!(json.contains("\"candidate\":\"ice_candidate_data\""));
    assert!(json.contains("\"sdpMid\":\"audio\""));
    assert!(json.contains("\"sdpMLineIndex\":0"));
    assert!(json.contains("\"targetUserId\":789"));
}

#[test]
fn test_server_message_authenticated_serialization() {
    let msg = ServerMessage::Authenticated {
        user_id: 123,
        username: "testuser".to_string(),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"authenticated\""));
    assert!(json.contains("\"userId\":123"));
    assert!(json.contains("\"username\":\"testuser\""));

    let deserialized: ServerMessage = serde_json::from_str(&json).unwrap();
    match deserialized {
        ServerMessage::Authenticated { user_id, username } => {
            assert_eq!(user_id, 123);
            assert_eq!(username, "testuser");
        }
        _ => panic!("Wrong message type"),
    }
}

#[test]
fn test_server_message_room_joined_serialization() {
    let participants = vec![
        Participant {
            user_id: 1,
            username: "user1".to_string(),
        },
        Participant {
            user_id: 2,
            username: "user2".to_string(),
        },
    ];

    let msg = ServerMessage::RoomJoined {
        room_name: "test_room".to_string(),
        user_id: 123,
        participants,
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"room-joined\""));
    assert!(json.contains("\"roomName\":\"test_room\""));
    assert!(json.contains("\"userId\":123"));
    assert!(json.contains("\"participants\""));
}

#[test]
fn test_server_message_user_joined_serialization() {
    let user = Participant {
        user_id: 456,
        username: "newuser".to_string(),
    };

    let msg = ServerMessage::UserJoined {
        room_name: "test_room".to_string(),
        user,
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"user-joined\""));
    assert!(json.contains("\"userId\":456"));
    assert!(json.contains("\"username\":\"newuser\""));
}

#[test]
fn test_server_message_error_creation() {
    let error_msg = ServerMessage::error("Something went wrong");

    match error_msg {
        ServerMessage::Error { message, code } => {
            assert_eq!(message, "Something went wrong");
            assert_eq!(code, None);
        }
        _ => panic!("Wrong message type"),
    }
}

#[test]
fn test_server_message_error_with_code_creation() {
    let error_msg = ServerMessage::error_with_code("Auth failed", 401);

    match error_msg {
        ServerMessage::Error { message, code } => {
            assert_eq!(message, "Auth failed");
            assert_eq!(code, Some(401));
        }
        _ => panic!("Wrong message type"),
    }
}

#[test]
fn test_participant_serialization() {
    let participant = Participant {
        user_id: 999,
        username: "participant_user".to_string(),
    };

    let json = serde_json::to_string(&participant).unwrap();
    assert!(json.contains("\"userId\":999"));
    assert!(json.contains("\"username\":\"participant_user\""));

    let deserialized: Participant = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.user_id, 999);
    assert_eq!(deserialized.username, "participant_user");
}

#[test]
fn test_message_deserialization_from_client_json() {
    // Test parsing real JSON that might come from client
    let auth_json = r#"{"type":"auth","token":"abc123"}"#;
    let msg: ClientMessage = serde_json::from_str(auth_json).unwrap();

    match msg {
        ClientMessage::Auth { token } => assert_eq!(token, "abc123"),
        _ => panic!("Failed to parse auth message"),
    }

    let join_json = r#"{"type":"join-room","roomName":"myroom","password":"secret"}"#;
    let msg: ClientMessage = serde_json::from_str(join_json).unwrap();

    match msg {
        ClientMessage::JoinRoom {
            room_name,
            password,
        } => {
            assert_eq!(room_name, "myroom");
            assert_eq!(password, Some("secret".to_string()));
        }
        _ => panic!("Failed to parse join room message"),
    }
}

#[test]
fn test_invalid_message_deserialization() {
    // Test that invalid JSON fails gracefully
    let invalid_json = r#"{"type":"unknown","data":"test"}"#;
    let result: Result<ClientMessage, _> = serde_json::from_str(invalid_json);
    assert!(result.is_err());

    let malformed_json = r#"{"type":"auth""#; // Missing closing brace
    let result: Result<ClientMessage, _> = serde_json::from_str(malformed_json);
    assert!(result.is_err());
}
