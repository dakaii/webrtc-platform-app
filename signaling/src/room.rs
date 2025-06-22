use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;
use tracing::{info, warn, debug};

use crate::auth::AuthenticatedUser;
use crate::messages::{ServerMessage, Participant};

#[derive(Debug, Clone)]
pub struct RoomParticipant {
    pub user: AuthenticatedUser,
    pub connection_id: Uuid,
    pub sender: mpsc::UnboundedSender<Message>,
}

#[derive(Debug)]
pub struct Room {
    pub name: String,
    pub participants: HashMap<u32, RoomParticipant>, // user_id -> participant
}

impl Room {
    pub fn new(name: String) -> Self {
        Self {
            name,
            participants: HashMap::new(),
        }
    }

    pub fn add_participant(&mut self, participant: RoomParticipant) -> bool {
        let user_id = participant.user.user_id;
        if self.participants.contains_key(&user_id) {
            warn!("User {} already in room {}", user_id, self.name);
            return false;
        }

        info!("User {} ({}) joined room {}",
              user_id, participant.user.username, self.name);
        self.participants.insert(user_id, participant);
        true
    }

    pub fn remove_participant(&mut self, user_id: u32) -> Option<RoomParticipant> {
        if let Some(participant) = self.participants.remove(&user_id) {
            info!("User {} ({}) left room {}",
                  user_id, participant.user.username, self.name);
            Some(participant)
        } else {
            None
        }
    }

    pub fn get_participants_list(&self) -> Vec<Participant> {
        self.participants.values()
            .map(|p| Participant {
                user_id: p.user.user_id,
                username: p.user.username.clone(),
            })
            .collect()
    }

    pub fn broadcast_to_others(&self, sender_id: u32, message: ServerMessage) {
        let json_message = match serde_json::to_string(&message) {
            Ok(json) => Message::Text(json),
            Err(e) => {
                warn!("Failed to serialize message: {}", e);
                return;
            }
        };

        for (user_id, participant) in &self.participants {
            if *user_id != sender_id {
                if let Err(e) = participant.sender.send(json_message.clone()) {
                    warn!("Failed to send message to user {}: {}", user_id, e);
                }
            }
        }
    }

    pub fn broadcast_to_all(&self, message: ServerMessage) {
        let json_message = match serde_json::to_string(&message) {
            Ok(json) => Message::Text(json),
            Err(e) => {
                warn!("Failed to serialize message: {}", e);
                return;
            }
        };

        for (user_id, participant) in &self.participants {
            if let Err(e) = participant.sender.send(json_message.clone()) {
                warn!("Failed to send message to user {}: {}", user_id, e);
            }
        }
    }

    pub fn send_to_user(&self, user_id: u32, message: ServerMessage) {
        if let Some(participant) = self.participants.get(&user_id) {
            let json_message = match serde_json::to_string(&message) {
                Ok(json) => Message::Text(json),
                Err(e) => {
                    warn!("Failed to serialize message: {}", e);
                    return;
                }
            };

            if let Err(e) = participant.sender.send(json_message) {
                warn!("Failed to send message to user {}: {}", user_id, e);
            }
        }
    }

    pub fn has_participant(&self, user_id: u32) -> bool {
        self.participants.contains_key(&user_id)
    }

    pub fn is_empty(&self) -> bool {
        self.participants.is_empty()
    }
}

pub type Rooms = Arc<RwLock<HashMap<String, Room>>>;

pub struct RoomManager {
    rooms: Rooms,
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn get_rooms(&self) -> Rooms {
        self.rooms.clone()
    }

    pub async fn join_room(&self, room_name: String, participant: RoomParticipant) -> Result<Vec<Participant>, String> {
        let mut rooms = self.rooms.write().await;
        let room = rooms.entry(room_name.clone()).or_insert_with(|| Room::new(room_name.clone()));

        let existing_participants = room.get_participants_list();

        if room.add_participant(participant.clone()) {
            // Notify other participants about the new user
            let user_joined_msg = ServerMessage::UserJoined {
                room_name: room_name.clone(),
                user: Participant {
                    user_id: participant.user.user_id,
                    username: participant.user.username.clone(),
                },
            };
            room.broadcast_to_others(participant.user.user_id, user_joined_msg);

            Ok(existing_participants)
        } else {
            Err("User already in room".to_string())
        }
    }

    pub async fn leave_room(&self, room_name: &str, user_id: u32) -> Result<(), String> {
        let mut rooms = self.rooms.write().await;

        if let Some(room) = rooms.get_mut(room_name) {
            if let Some(_participant) = room.remove_participant(user_id) {
                // Notify other participants about the user leaving
                let user_left_msg = ServerMessage::UserLeft {
                    room_name: room_name.to_string(),
                    user_id,
                };
                room.broadcast_to_all(user_left_msg);

                // Remove empty rooms
                if room.is_empty() {
                    rooms.remove(room_name);
                    debug!("Removed empty room: {}", room_name);
                }

                Ok(())
            } else {
                Err("User not in room".to_string())
            }
        } else {
            Err("Room not found".to_string())
        }
    }

    pub async fn broadcast_to_room(&self, room_name: &str, sender_id: u32, message: ServerMessage) -> Result<(), String> {
        let rooms = self.rooms.read().await;

        if let Some(room) = rooms.get(room_name) {
            room.broadcast_to_others(sender_id, message);
            Ok(())
        } else {
            Err("Room not found".to_string())
        }
    }

    pub async fn send_to_user_in_room(&self, room_name: &str, target_user_id: u32, message: ServerMessage) -> Result<(), String> {
        let rooms = self.rooms.read().await;

        if let Some(room) = rooms.get(room_name) {
            room.send_to_user(target_user_id, message);
            Ok(())
        } else {
            Err("Room not found".to_string())
        }
    }

    pub async fn user_in_room(&self, room_name: &str, user_id: u32) -> bool {
        let rooms = self.rooms.read().await;
        rooms.get(room_name)
            .map(|room| room.has_participant(user_id))
            .unwrap_or(false)
    }

    pub async fn remove_user_from_all_rooms(&self, user_id: u32, connection_id: Uuid) {
        let mut rooms = self.rooms.write().await;
        let mut rooms_to_remove = Vec::new();

        for (room_name, room) in rooms.iter_mut() {
            if let Some(participant) = room.participants.get(&user_id) {
                if participant.connection_id == connection_id {
                    room.remove_participant(user_id);

                    // Notify other participants
                    let user_left_msg = ServerMessage::UserLeft {
                        room_name: room_name.clone(),
                        user_id,
                    };
                    room.broadcast_to_all(user_left_msg);

                    if room.is_empty() {
                        rooms_to_remove.push(room_name.clone());
                    }
                }
            }
        }

        // Remove empty rooms
        for room_name in rooms_to_remove {
            rooms.remove(&room_name);
            debug!("Removed empty room: {}", room_name);
        }
    }
}
