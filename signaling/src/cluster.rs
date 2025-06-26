use chrono::{DateTime, Utc};
use futures_util::StreamExt;
use redis::{AsyncCommands, Client as RedisClient};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio_tungstenite::tungstenite::Message;
use tracing::{debug, info, warn};
use uuid::Uuid;

use crate::messages::{Participant, ServerMessage};
use crate::room::{LocalRoomManager, RoomManagerTrait, RoomParticipant};

/// Represents connection information stored in Redis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub user_id: u32,
    pub username: String,
    pub room_id: String,
    pub connected_at: DateTime<Utc>,
    pub connection_id: Uuid,
}

/// Messages sent between cluster nodes via Redis pub/sub
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClusterMessage {
    /// User joined a room - broadcast to all servers
    UserJoined {
        room_id: String,
        user_id: u32,
        username: String,
        target_server: Option<String>, // None = broadcast to all
    },
    /// User left a room - broadcast to all servers
    UserLeft {
        room_id: String,
        user_id: u32,
        target_server: Option<String>,
    },
    /// WebRTC signaling message - route to specific user
    WebRTCSignal {
        room_id: String,
        from_user: u32,
        to_user: u32,
        signal_type: String,
        signal_data: String,
    },
    /// Server heartbeat for failure detection
    ServerHeartbeat {
        node_id: String,
        timestamp: u64,
        connection_count: usize,
    },
    /// Request for room participants list
    ParticipantsRequest {
        room_id: String,
        requesting_server: String,
    },
    /// Response with participants list
    ParticipantsResponse {
        room_id: String,
        participants: Vec<Participant>,
        target_server: String,
    },
}

/// Redis-based clustered room manager
pub struct ClusterRoomManager {
    /// Local room manager for actual WebSocket connections
    local_manager: LocalRoomManager,
    /// Redis client for cluster coordination
    redis_client: RedisClient,
    /// This server's unique identifier
    node_id: String,
    /// Local connections (user_id -> connection info)
    local_connections: Arc<RwLock<HashMap<u32, RoomParticipant>>>,
    /// Health status
    redis_healthy: Arc<RwLock<bool>>,
}

impl ClusterRoomManager {
    /// Create a new cluster room manager
    pub async fn new(
        redis_url: &str,
        node_id: String,
    ) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let redis_client = RedisClient::open(redis_url)?;

        // Test Redis connection
        let mut conn = redis_client.get_multiplexed_async_connection().await?;
        let _: String = redis::cmd("PING").query_async(&mut conn).await?;
        info!("Successfully connected to Redis cluster coordinator");

        let manager = Self {
            local_manager: LocalRoomManager::new(),
            redis_client,
            node_id: node_id.clone(),
            local_connections: Arc::new(RwLock::new(HashMap::new())),
            redis_healthy: Arc::new(RwLock::new(true)),
        };

        // Start background tasks
        manager.start_pubsub_listener().await?;
        manager.start_heartbeat().await?;
        manager.start_health_monitor().await;

        Ok(manager)
    }

    /// Start Redis pub/sub listener for cluster messages
    async fn start_pubsub_listener(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let conn = self.redis_client.get_async_connection().await?;
        let mut pubsub = conn.into_pubsub();
        pubsub.subscribe("cluster:messages").await?;

        let local_connections = Arc::clone(&self.local_connections);
        let node_id = self.node_id.clone();

        tokio::spawn(async move {
            info!("Started cluster message listener for node: {}", node_id);

            while let Some(msg) = pubsub.on_message().next().await {
                if let Ok(payload) = msg.get_payload::<String>() {
                    if let Ok(cluster_msg) = serde_json::from_str::<ClusterMessage>(&payload) {
                        Self::handle_cluster_message(cluster_msg, &local_connections, &node_id)
                            .await;
                    }
                }
            }

            warn!("Cluster message listener stopped for node: {}", node_id);
        });

        Ok(())
    }

    /// Handle incoming cluster messages
    async fn handle_cluster_message(
        message: ClusterMessage,
        local_connections: &Arc<RwLock<HashMap<u32, RoomParticipant>>>,
        node_id: &str,
    ) {
        match message {
            ClusterMessage::UserJoined {
                room_id,
                user_id,
                username,
                target_server,
            } => {
                // Skip if message is targeted to a different server
                if let Some(target) = target_server {
                    if target != node_id {
                        return;
                    }
                }

                debug!(
                    "Cluster: User {} joined room {} (from remote server)",
                    user_id, room_id
                );

                // Notify local users in this room about new participant
                let server_message = ServerMessage::UserJoined {
                    room_name: room_id,
                    user: Participant { user_id, username },
                };

                Self::broadcast_to_local_room_participants(&server_message, local_connections)
                    .await;
            }

            ClusterMessage::UserLeft {
                room_id,
                user_id,
                target_server,
            } => {
                if let Some(target) = target_server {
                    if target != node_id {
                        return;
                    }
                }

                debug!(
                    "Cluster: User {} left room {} (from remote server)",
                    user_id, room_id
                );

                let server_message = ServerMessage::UserLeft {
                    room_name: room_id,
                    user_id,
                };

                Self::broadcast_to_local_room_participants(&server_message, local_connections)
                    .await;
            }

            ClusterMessage::WebRTCSignal {
                from_user,
                to_user,
                signal_type,
                signal_data,
                ..
            } => {
                // Deliver signal to local user if they're connected to this server
                let connections = local_connections.read().await;
                if let Some(participant) = connections.get(&to_user) {
                    debug!(
                        "Cluster: Delivering WebRTC signal from {} to {} on this server",
                        from_user, to_user
                    );

                    let message = match signal_type.as_str() {
                        "offer" => ServerMessage::Offer {
                            room_name: "cluster".to_string(), // TODO: pass actual room name
                            from_user_id: from_user,
                            sdp: signal_data,
                        },
                        "answer" => ServerMessage::Answer {
                            room_name: "cluster".to_string(),
                            from_user_id: from_user,
                            sdp: signal_data,
                        },
                        "ice-candidate" => ServerMessage::IceCandidate {
                            room_name: "cluster".to_string(),
                            from_user_id: from_user,
                            candidate: signal_data,
                            sdp_mid: None,
                            sdp_mline_index: None,
                        },
                        _ => {
                            warn!("Unknown signal type: {}", signal_type);
                            return;
                        }
                    };

                    if let Ok(json_message) = serde_json::to_string(&message) {
                        let websocket_message = Message::Text(json_message);
                        if let Err(e) = participant.sender.send(websocket_message) {
                            warn!(
                                "Failed to deliver cluster WebRTC signal to user {}: {}",
                                to_user, e
                            );
                        }
                    }
                }
            }

            _ => {
                // Handle other message types as needed
                debug!("Received unhandled cluster message type");
            }
        }
    }

    /// Broadcast message to all local participants
    async fn broadcast_to_local_room_participants(
        message: &ServerMessage,
        local_connections: &Arc<RwLock<HashMap<u32, RoomParticipant>>>,
    ) {
        let connections = local_connections.read().await;

        if let Ok(json_message) = serde_json::to_string(message) {
            let websocket_message = Message::Text(json_message);

            for (user_id, participant) in connections.iter() {
                if let Err(e) = participant.sender.send(websocket_message.clone()) {
                    warn!(
                        "Failed to broadcast cluster message to local user {}: {}",
                        user_id, e
                    );
                }
            }
        }
    }

    /// Start heartbeat mechanism for failure detection
    async fn start_heartbeat(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let redis_client = self.redis_client.clone();
        let node_id = self.node_id.clone();
        let local_connections = Arc::clone(&self.local_connections);

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(10));

            loop {
                interval.tick().await;

                match redis_client.get_multiplexed_async_connection().await {
                    Ok(mut conn) => {
                        let connection_count = local_connections.read().await.len();

                        let timestamp = Utc::now().timestamp() as u64;
                        let heartbeat = ClusterMessage::ServerHeartbeat {
                            node_id: node_id.clone(),
                            timestamp,
                            connection_count,
                        };

                        // Update server registry with TTL (expires in 30 seconds)
                        let server_key = format!("servers:{}:heartbeat", node_id);
                        if let Err(e) = conn.set_ex::<_, _, ()>(&server_key, timestamp, 30).await {
                            warn!("Failed to update heartbeat in Redis: {}", e);
                        }

                        // Publish heartbeat event
                        if let Ok(heartbeat_json) = serde_json::to_string(&heartbeat) {
                            if let Err(e) = conn
                                .publish::<_, _, ()>("cluster:events", heartbeat_json)
                                .await
                            {
                                warn!("Failed to publish heartbeat: {}", e);
                            }
                        }

                        debug!(
                            "Sent heartbeat for node {} with {} connections",
                            node_id, connection_count
                        );
                    }
                    Err(e) => {
                        warn!("Failed to connect to Redis for heartbeat: {}", e);
                    }
                }
            }
        });

        Ok(())
    }

    /// Start Redis health monitoring
    async fn start_health_monitor(&self) {
        let redis_client = self.redis_client.clone();
        let redis_healthy = Arc::clone(&self.redis_healthy);

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(5));

            loop {
                interval.tick().await;

                let is_healthy = match redis_client.get_multiplexed_async_connection().await {
                    Ok(mut conn) => {
                        match redis::cmd("PING").query_async::<_, String>(&mut conn).await {
                            Ok(_) => true,
                            Err(_) => false,
                        }
                    }
                    Err(_) => false,
                };

                let mut healthy = redis_healthy.write().await;
                if *healthy != is_healthy {
                    if is_healthy {
                        info!("Redis connection recovered - cluster mode enabled");
                    } else {
                        warn!("Redis connection lost - falling back to local mode");
                    }
                    *healthy = is_healthy;
                }
            }
        });
    }

    /// Add user to Redis room registry
    async fn register_user_in_redis(
        &self,
        room_id: &str,
        user_id: u32,
        username: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;

        // Add user to room participants list in Redis
        let room_key = format!("rooms:{}:participants", room_id);
        let _: () = conn
            .hset(&room_key, user_id.to_string(), &self.node_id)
            .await?;

        // Add connection to this server's connection list
        let server_key = format!("servers:{}:connections", self.node_id);
        let connection_info = ConnectionInfo {
            user_id,
            username: username.to_string(),
            room_id: room_id.to_string(),
            connected_at: Utc::now(),
            connection_id: Uuid::new_v4(), // This should match the actual connection_id
        };

        let connection_json = serde_json::to_string(&connection_info)?;
        let _: () = conn
            .hset(&server_key, user_id.to_string(), connection_json)
            .await?;

        Ok(())
    }

    /// Remove user from Redis room registry
    async fn unregister_user_from_redis(
        &self,
        room_id: &str,
        user_id: u32,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;

        // Remove from room participants
        let room_key = format!("rooms:{}:participants", room_id);
        let _: () = conn.hdel(&room_key, user_id.to_string()).await?;

        // Remove from server connections
        let server_key = format!("servers:{}:connections", self.node_id);
        let _: () = conn.hdel(&server_key, user_id.to_string()).await?;

        Ok(())
    }

    /// Get existing participants from Redis
    async fn get_existing_participants_from_redis(&self, room_id: &str) -> Vec<Participant> {
        match self.redis_client.get_multiplexed_async_connection().await {
            Ok(mut conn) => {
                let room_key = format!("rooms:{}:participants", room_id);

                match conn.hgetall::<_, HashMap<String, String>>(&room_key).await {
                    Ok(participants_map) => {
                        let mut participants = Vec::new();

                        for (user_id_str, server_node) in participants_map {
                            if let Ok(user_id) = user_id_str.parse::<u32>() {
                                // Get username from server's connection list
                                if let Ok(username) =
                                    self.get_username_from_server(&server_node, user_id).await
                                {
                                    participants.push(Participant { user_id, username });
                                }
                            }
                        }

                        participants
                    }
                    Err(e) => {
                        warn!("Failed to get room participants from Redis: {}", e);
                        Vec::new()
                    }
                }
            }
            Err(e) => {
                warn!("Failed to connect to Redis: {}", e);
                Vec::new()
            }
        }
    }

    /// Get username from a server's connection list
    async fn get_username_from_server(
        &self,
        server_node: &str,
        user_id: u32,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let server_key = format!("servers:{}:connections", server_node);

        let connection_json: String = conn.hget(&server_key, user_id.to_string()).await?;
        let connection_info: ConnectionInfo = serde_json::from_str(&connection_json)?;

        Ok(connection_info.username)
    }

    /// Check if Redis is healthy and we can use cluster mode
    async fn is_redis_healthy(&self) -> bool {
        *self.redis_healthy.read().await
    }
}

#[async_trait::async_trait]
impl RoomManagerTrait for ClusterRoomManager {
    async fn join_room(
        &self,
        room_name: String,
        participant: RoomParticipant,
    ) -> Result<Vec<Participant>, String> {
        // Always add to local connections first
        {
            let mut connections = self.local_connections.write().await;
            connections.insert(participant.user.user_id, participant.clone());
        }

        if self.is_redis_healthy().await {
            // Cluster mode: use Redis for coordination
            debug!(
                "Cluster mode: User {} joining room {}",
                participant.user.user_id, room_name
            );

            // Get existing participants from Redis first
            let existing_participants = self.get_existing_participants_from_redis(&room_name).await;

            // Register this user in Redis
            if let Err(e) = self
                .register_user_in_redis(
                    &room_name,
                    participant.user.user_id,
                    &participant.user.username,
                )
                .await
            {
                warn!("Failed to register user in Redis: {}", e);
                // Fall back to local mode for this operation
                return self.local_manager.join_room(room_name, participant).await;
            }

            // Notify other servers about the new user
            let join_message = ClusterMessage::UserJoined {
                room_id: room_name.clone(),
                user_id: participant.user.user_id,
                username: participant.user.username.clone(),
                target_server: None, // Broadcast to all servers
            };

            if let Ok(mut conn) = self.redis_client.get_multiplexed_async_connection().await {
                if let Ok(message_json) = serde_json::to_string(&join_message) {
                    if let Err(e) = conn
                        .publish::<_, _, ()>("cluster:messages", message_json)
                        .await
                    {
                        warn!("Failed to publish join message: {}", e);
                    }
                }
            }

            info!(
                "Cluster: User {} ({}) joined room {} via Redis coordination",
                participant.user.user_id, participant.user.username, room_name
            );

            Ok(existing_participants)
        } else {
            // Fallback to local mode
            debug!(
                "Local mode: User {} joining room {} (Redis unavailable)",
                participant.user.user_id, room_name
            );
            self.local_manager.join_room(room_name, participant).await
        }
    }

    async fn leave_room(&self, room_name: &str, user_id: u32) -> Result<(), String> {
        // Remove from local connections
        {
            let mut connections = self.local_connections.write().await;
            connections.remove(&user_id);
        }

        if self.is_redis_healthy().await {
            // Cluster mode: use Redis for coordination
            debug!("Cluster mode: User {} leaving room {}", user_id, room_name);

            if let Err(e) = self.unregister_user_from_redis(room_name, user_id).await {
                warn!("Failed to unregister user from Redis: {}", e);
            }

            // Notify other servers about user leaving
            let leave_message = ClusterMessage::UserLeft {
                room_id: room_name.to_string(),
                user_id,
                target_server: None,
            };

            if let Ok(mut conn) = self.redis_client.get_multiplexed_async_connection().await {
                if let Ok(message_json) = serde_json::to_string(&leave_message) {
                    if let Err(e) = conn
                        .publish::<_, _, ()>("cluster:messages", message_json)
                        .await
                    {
                        warn!("Failed to publish leave message: {}", e);
                    }
                }
            }

            info!(
                "Cluster: User {} left room {} via Redis coordination",
                user_id, room_name
            );
            Ok(())
        } else {
            // Fallback to local mode
            debug!(
                "Local mode: User {} leaving room {} (Redis unavailable)",
                user_id, room_name
            );
            self.local_manager.leave_room(room_name, user_id).await
        }
    }

    async fn broadcast_to_room(
        &self,
        room_name: &str,
        sender_id: u32,
        message: ServerMessage,
    ) -> Result<(), String> {
        if self.is_redis_healthy().await {
            // In cluster mode, we need to broadcast to ALL servers that have users in this room
            // For now, we'll just broadcast locally and let other message types handle cross-server communication
            self.local_manager
                .broadcast_to_room(room_name, sender_id, message)
                .await
        } else {
            self.local_manager
                .broadcast_to_room(room_name, sender_id, message)
                .await
        }
    }

    async fn send_to_user_in_room(
        &self,
        room_name: &str,
        target_user_id: u32,
        message: ServerMessage,
    ) -> Result<(), String> {
        if self.is_redis_healthy().await {
            // Check if user is connected locally first
            let connections = self.local_connections.read().await;
            if connections.contains_key(&target_user_id) {
                drop(connections);
                return self
                    .local_manager
                    .send_to_user_in_room(room_name, target_user_id, message)
                    .await;
            }
            drop(connections);

            // User not local, find which server has them and route via Redis
            match self.redis_client.get_multiplexed_async_connection().await {
                Ok(mut conn) => {
                    let room_key = format!("rooms:{}:participants", room_name);

                    if let Ok(target_server) = conn
                        .hget::<_, _, String>(&room_key, target_user_id.to_string())
                        .await
                    {
                        // Create a WebRTC signal message that will be routed to the correct server
                        let cluster_message = match &message {
                            ServerMessage::Offer {
                                from_user_id, sdp, ..
                            } => Some(ClusterMessage::WebRTCSignal {
                                room_id: room_name.to_string(),
                                from_user: *from_user_id,
                                to_user: target_user_id,
                                signal_type: "offer".to_string(),
                                signal_data: sdp.clone(),
                            }),
                            ServerMessage::Answer {
                                from_user_id, sdp, ..
                            } => Some(ClusterMessage::WebRTCSignal {
                                room_id: room_name.to_string(),
                                from_user: *from_user_id,
                                to_user: target_user_id,
                                signal_type: "answer".to_string(),
                                signal_data: sdp.clone(),
                            }),
                            ServerMessage::IceCandidate {
                                from_user_id,
                                candidate,
                                ..
                            } => Some(ClusterMessage::WebRTCSignal {
                                room_id: room_name.to_string(),
                                from_user: *from_user_id,
                                to_user: target_user_id,
                                signal_type: "ice-candidate".to_string(),
                                signal_data: candidate.clone(),
                            }),
                            _ => None, // Not a WebRTC signal, handle locally
                        };

                        if let Some(cluster_message) = cluster_message {
                            if let Ok(message_json) = serde_json::to_string(&cluster_message) {
                                if let Err(e) = conn
                                    .publish::<_, _, ()>("cluster:messages", message_json)
                                    .await
                                {
                                    warn!("Failed to route message via Redis: {}", e);
                                    return Err("Failed to route message".to_string());
                                }

                                debug!(
                                    "Routed message to user {} on server {}",
                                    target_user_id, target_server
                                );
                                return Ok(());
                            }
                        } else {
                            // Not a WebRTC signal, try to handle locally
                            return self
                                .local_manager
                                .send_to_user_in_room(room_name, target_user_id, message)
                                .await;
                        }
                    }

                    Err("User not found in room".to_string())
                }
                Err(e) => {
                    warn!("Failed to connect to Redis for message routing: {}", e);
                    Err("Redis connection failed".to_string())
                }
            }
        } else {
            self.local_manager
                .send_to_user_in_room(room_name, target_user_id, message)
                .await
        }
    }

    async fn user_in_room(&self, room_name: &str, user_id: u32) -> bool {
        if self.is_redis_healthy().await {
            match self.redis_client.get_multiplexed_async_connection().await {
                Ok(mut conn) => {
                    let room_key = format!("rooms:{}:participants", room_name);
                    conn.hexists(&room_key, user_id.to_string())
                        .await
                        .unwrap_or(false)
                }
                Err(_) => self.local_manager.user_in_room(room_name, user_id).await,
            }
        } else {
            self.local_manager.user_in_room(room_name, user_id).await
        }
    }

    async fn remove_user_from_all_rooms(&self, user_id: u32, connection_id: Uuid) {
        // Remove from local connections
        {
            let mut connections = self.local_connections.write().await;
            connections.remove(&user_id);
        }

        if self.is_redis_healthy().await {
            // In cluster mode, clean up Redis state
            if let Ok(mut conn) = self.redis_client.get_multiplexed_async_connection().await {
                let server_key = format!("servers:{}:connections", self.node_id);

                // Get user's connection info to find their room
                if let Ok(connection_json) = conn
                    .hget::<_, _, String>(&server_key, user_id.to_string())
                    .await
                {
                    if let Ok(connection_info) =
                        serde_json::from_str::<ConnectionInfo>(&connection_json)
                    {
                        if connection_info.connection_id == connection_id {
                            // Remove from room
                            let room_key =
                                format!("rooms:{}:participants", connection_info.room_id);
                            let _: Result<(), _> = conn.hdel(&room_key, user_id.to_string()).await;

                            // Remove from server connections
                            let _: Result<(), _> =
                                conn.hdel(&server_key, user_id.to_string()).await;

                            // Notify other servers
                            let leave_message = ClusterMessage::UserLeft {
                                room_id: connection_info.room_id,
                                user_id,
                                target_server: None,
                            };

                            if let Ok(message_json) = serde_json::to_string(&leave_message) {
                                let _ = conn
                                    .publish::<_, _, ()>("cluster:messages", message_json)
                                    .await;
                            }
                        }
                    }
                }
            }
        } else {
            self.local_manager
                .remove_user_from_all_rooms(user_id, connection_id)
                .await;
        }
    }

    async fn get_room_participants(&self, room_name: &str) -> Vec<Participant> {
        if self.is_redis_healthy().await {
            self.get_existing_participants_from_redis(room_name).await
        } else {
            self.local_manager.get_room_participants(room_name).await
        }
    }

    async fn health_check(&self) -> bool {
        // Health check passes if either Redis is healthy OR local manager is working
        self.is_redis_healthy().await || self.local_manager.health_check().await
    }
}
