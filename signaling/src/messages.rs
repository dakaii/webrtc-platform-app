use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ClientMessage {
    #[serde(rename = "join-room")]
    JoinRoom {
        room_name: String,
        password: Option<String>,
    },

    #[serde(rename = "leave-room")]
    LeaveRoom { room_name: String },

    #[serde(rename = "offer")]
    Offer {
        room_name: String,
        sdp: String,
        target_user_id: Option<u32>,
    },

    #[serde(rename = "answer")]
    Answer {
        room_name: String,
        sdp: String,
        target_user_id: u32,
    },

    #[serde(rename = "ice-candidate")]
    IceCandidate {
        room_name: String,
        candidate: String,
        sdp_mid: Option<String>,
        sdp_mline_index: Option<u32>,
        target_user_id: Option<u32>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ServerMessage {
    #[serde(rename = "room-joined")]
    RoomJoined {
        room_name: String,
        user_id: u32,
        participants: Vec<Participant>,
    },

    #[serde(rename = "room-left")]
    RoomLeft { room_name: String, user_id: u32 },

    #[serde(rename = "user-joined")]
    UserJoined {
        room_name: String,
        user: Participant,
    },

    #[serde(rename = "user-left")]
    UserLeft { room_name: String, user_id: u32 },

    #[serde(rename = "offer")]
    Offer {
        room_name: String,
        from_user_id: u32,
        sdp: String,
    },

    #[serde(rename = "answer")]
    Answer {
        room_name: String,
        from_user_id: u32,
        sdp: String,
    },

    #[serde(rename = "ice-candidate")]
    IceCandidate {
        room_name: String,
        from_user_id: u32,
        candidate: String,
        sdp_mid: Option<String>,
        sdp_mline_index: Option<u32>,
    },

    #[serde(rename = "error")]
    Error { message: String, code: Option<u32> },

    #[serde(rename = "authenticated")]
    Authenticated { user_id: u32, username: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Participant {
    pub user_id: u32,
    pub username: String,
}

impl ServerMessage {
    pub fn error(message: impl Into<String>) -> Self {
        Self::Error {
            message: message.into(),
            code: None,
        }
    }

    pub fn error_with_code(message: impl Into<String>, code: u32) -> Self {
        Self::Error {
            message: message.into(),
            code: Some(code),
        }
    }
}
