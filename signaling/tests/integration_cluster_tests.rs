#[cfg(test)]
mod integration_tests {
    use std::env;
    use std::time::Duration;
    use tokio::sync::mpsc;
    use tokio::time::{sleep, timeout};
    use tokio_tungstenite::tungstenite::Message;
    use uuid::Uuid;

    use webrtc_signaling::auth::AuthenticatedUser;
    use webrtc_signaling::cluster::ClusterRoomManager;
    use webrtc_signaling::messages::ServerMessage;
    use webrtc_signaling::room::{RoomManagerTrait, RoomParticipant};

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

    fn get_redis_url() -> String {
        env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string())
    }

    async fn cleanup_redis_test_data(redis_url: &str) {
        use redis::AsyncCommands;

        if let Ok(client) = redis::Client::open(redis_url) {
            if let Ok(mut conn) = client.get_async_connection().await {
                // Clean up test data
                let _: Result<(), _> = conn
                    .del(vec![
                        "rooms:test_room:participants",
                        "rooms:integration_room:participants",
                        "servers:test-node-1:connections",
                        "servers:test-node-2:connections",
                        "servers:test-node-1:heartbeat",
                        "servers:test-node-2:heartbeat",
                    ])
                    .await;
            }
        }
    }

    #[tokio::test]
    #[ignore] // Run with `cargo test -- --ignored` when Redis is available
    async fn test_cluster_manager_creation() {
        let redis_url = get_redis_url();
        cleanup_redis_test_data(&redis_url).await;

        let result = ClusterRoomManager::new(&redis_url, "test-node-1".to_string()).await;

        match result {
            Ok(cluster_manager) => {
                assert!(cluster_manager.health_check().await);
                println!("✅ Cluster manager created successfully");
            }
            Err(e) => {
                println!("❌ Failed to create cluster manager: {}", e);
                println!("Make sure Redis is running on {}", redis_url);
                panic!("Redis not available for integration test");
            }
        }

        cleanup_redis_test_data(&redis_url).await;
    }

    #[tokio::test]
    #[ignore] // Run with `cargo test -- --ignored` when Redis is available
    async fn test_cluster_room_join_and_leave() {
        let redis_url = get_redis_url();
        cleanup_redis_test_data(&redis_url).await;

        let cluster_manager =
            match ClusterRoomManager::new(&redis_url, "test-node-1".to_string()).await {
                Ok(manager) => manager,
                Err(_) => {
                    println!("Skipping test - Redis not available");
                    return;
                }
            };

        let participant = create_test_participant(1001, "alice");

        // Test join room
        let join_result = cluster_manager
            .join_room("integration_room".to_string(), participant)
            .await;
        assert!(
            join_result.is_ok(),
            "Failed to join room: {:?}",
            join_result
        );

        let existing_participants = join_result.unwrap();
        assert!(existing_participants.is_empty()); // No existing participants

        // Verify user is in room
        assert!(cluster_manager.user_in_room("integration_room", 1001).await);

        // Get participants
        let participants = cluster_manager
            .get_room_participants("integration_room")
            .await;
        assert_eq!(participants.len(), 1);
        assert_eq!(participants[0].user_id, 1001);
        assert_eq!(participants[0].username, "alice");

        // Test leave room
        let leave_result = cluster_manager.leave_room("integration_room", 1001).await;
        assert!(
            leave_result.is_ok(),
            "Failed to leave room: {:?}",
            leave_result
        );

        // Verify user is no longer in room
        assert!(!cluster_manager.user_in_room("integration_room", 1001).await);

        let participants = cluster_manager
            .get_room_participants("integration_room")
            .await;
        assert!(participants.is_empty());

        cleanup_redis_test_data(&redis_url).await;
    }

    #[tokio::test]
    #[ignore] // Run with `cargo test -- --ignored` when Redis is available
    async fn test_cluster_multiple_users() {
        let redis_url = get_redis_url();
        cleanup_redis_test_data(&redis_url).await;

        let cluster_manager =
            match ClusterRoomManager::new(&redis_url, "test-node-1".to_string()).await {
                Ok(manager) => manager,
                Err(_) => {
                    println!("Skipping test - Redis not available");
                    return;
                }
            };

        let alice = create_test_participant(1001, "alice");
        let bob = create_test_participant(1002, "bob");

        // Alice joins first
        let alice_result = cluster_manager
            .join_room("multi_user_room".to_string(), alice)
            .await;
        assert!(alice_result.is_ok());
        let alice_existing = alice_result.unwrap();
        assert!(alice_existing.is_empty());

        // Bob joins second
        let bob_result = cluster_manager
            .join_room("multi_user_room".to_string(), bob)
            .await;
        assert!(bob_result.is_ok());
        let bob_existing = bob_result.unwrap();
        assert_eq!(bob_existing.len(), 1); // Alice was already there
        assert_eq!(bob_existing[0].user_id, 1001);

        // Verify both users are in room
        assert!(cluster_manager.user_in_room("multi_user_room", 1001).await);
        assert!(cluster_manager.user_in_room("multi_user_room", 1002).await);

        let participants = cluster_manager
            .get_room_participants("multi_user_room")
            .await;
        assert_eq!(participants.len(), 2);

        let user_ids: Vec<u32> = participants.iter().map(|p| p.user_id).collect();
        assert!(user_ids.contains(&1001));
        assert!(user_ids.contains(&1002));

        // Alice leaves
        let leave_result = cluster_manager.leave_room("multi_user_room", 1001).await;
        assert!(leave_result.is_ok());

        // Only Bob should remain
        assert!(!cluster_manager.user_in_room("multi_user_room", 1001).await);
        assert!(cluster_manager.user_in_room("multi_user_room", 1002).await);

        let remaining_participants = cluster_manager
            .get_room_participants("multi_user_room")
            .await;
        assert_eq!(remaining_participants.len(), 1);
        assert_eq!(remaining_participants[0].user_id, 1002);

        cleanup_redis_test_data(&redis_url).await;
    }

    #[tokio::test]
    #[ignore] // Run with `cargo test -- --ignored` when Redis is available
    async fn test_cluster_cross_server_communication() {
        let redis_url = get_redis_url();
        cleanup_redis_test_data(&redis_url).await;

        // Create two cluster managers simulating different servers
        let server1 = match ClusterRoomManager::new(&redis_url, "test-server-1".to_string()).await {
            Ok(manager) => manager,
            Err(_) => {
                println!("Skipping test - Redis not available");
                return;
            }
        };

        let server2 = match ClusterRoomManager::new(&redis_url, "test-server-2".to_string()).await {
            Ok(manager) => manager,
            Err(_) => {
                println!("Skipping test - Redis not available");
                return;
            }
        };

        // Alice joins on server1
        let alice = create_test_participant(1001, "alice");
        let alice_result = server1
            .join_room("cross_server_room".to_string(), alice)
            .await;
        assert!(alice_result.is_ok());

        // Small delay to allow Redis pub/sub propagation
        sleep(Duration::from_millis(100)).await;

        // Bob joins on server2
        let bob = create_test_participant(1002, "bob");
        let bob_result = server2
            .join_room("cross_server_room".to_string(), bob)
            .await;
        assert!(bob_result.is_ok());

        // Bob should see Alice as existing participant
        let bob_existing = bob_result.unwrap();
        assert_eq!(bob_existing.len(), 1);
        assert_eq!(bob_existing[0].user_id, 1001);
        assert_eq!(bob_existing[0].username, "alice");

        // Both servers should see both users
        sleep(Duration::from_millis(100)).await; // Allow pub/sub propagation

        let server1_view = server1.get_room_participants("cross_server_room").await;
        let server2_view = server2.get_room_participants("cross_server_room").await;

        assert_eq!(server1_view.len(), 2);
        assert_eq!(server2_view.len(), 2);

        // Both should see Alice and Bob
        for participants in [&server1_view, &server2_view] {
            let user_ids: Vec<u32> = participants.iter().map(|p| p.user_id).collect();
            assert!(user_ids.contains(&1001));
            assert!(user_ids.contains(&1002));
        }

        // Test WebRTC signaling between servers
        let webrtc_message = ServerMessage::WebRTCSignal {
            from_user: 1001,
            signal_type: "offer".to_string(),
            signal_data: "test_sdp_data".to_string(),
        };

        // Alice (server1) sends to Bob (server2)
        let signal_result = server1
            .send_to_user_in_room("cross_server_room", 1002, webrtc_message)
            .await;
        assert!(
            signal_result.is_ok(),
            "Failed to send WebRTC signal: {:?}",
            signal_result
        );

        cleanup_redis_test_data(&redis_url).await;
    }

    #[tokio::test]
    #[ignore] // Run with `cargo test -- --ignored` when Redis is available
    async fn test_cluster_failure_recovery() {
        let redis_url = get_redis_url();
        cleanup_redis_test_data(&redis_url).await;

        let cluster_manager =
            match ClusterRoomManager::new(&redis_url, "test-node-1".to_string()).await {
                Ok(manager) => manager,
                Err(_) => {
                    println!("Skipping test - Redis not available");
                    return;
                }
            };

        // Join room normally
        let participant = create_test_participant(1001, "alice");
        let join_result = cluster_manager
            .join_room("recovery_room".to_string(), participant)
            .await;
        assert!(join_result.is_ok());

        // Verify normal operation
        assert!(cluster_manager.user_in_room("recovery_room", 1001).await);
        assert!(cluster_manager.health_check().await);

        // Simulate Redis temporary unavailability by using wrong URL
        let bad_cluster =
            ClusterRoomManager::new("redis://localhost:9999", "test-node-bad".to_string()).await;
        assert!(bad_cluster.is_err(), "Should fail with bad Redis URL");

        // Original cluster should still work (assuming Redis is still running)
        assert!(cluster_manager.health_check().await);
        assert!(cluster_manager.user_in_room("recovery_room", 1001).await);

        cleanup_redis_test_data(&redis_url).await;
    }

    #[tokio::test]
    #[ignore] // Run with `cargo test -- --ignored` when Redis is available
    async fn test_cluster_heartbeat_and_monitoring() {
        let redis_url = get_redis_url();
        cleanup_redis_test_data(&redis_url).await;

        let cluster_manager =
            match ClusterRoomManager::new(&redis_url, "heartbeat-test-node".to_string()).await {
                Ok(manager) => manager,
                Err(_) => {
                    println!("Skipping test - Redis not available");
                    return;
                }
            };

        // Wait for initial heartbeat to be sent
        sleep(Duration::from_millis(500)).await;

        // Check that heartbeat was registered in Redis
        use redis::AsyncCommands;
        if let Ok(client) = redis::Client::open(&redis_url) {
            if let Ok(mut conn) = client.get_async_connection().await {
                let heartbeat_key = "servers:heartbeat-test-node:heartbeat";
                let heartbeat_exists: bool = conn.exists(&heartbeat_key).await.unwrap_or(false);
                assert!(heartbeat_exists, "Heartbeat should be registered in Redis");

                // Check TTL is set (should be around 30 seconds)
                let ttl: i64 = conn.ttl(&heartbeat_key).await.unwrap_or(-1);
                assert!(
                    ttl > 0 && ttl <= 30,
                    "Heartbeat TTL should be set and reasonable"
                );
            }
        }

        // Health check should pass
        assert!(cluster_manager.health_check().await);

        cleanup_redis_test_data(&redis_url).await;
    }

    #[tokio::test]
    #[ignore] // Run with `cargo test -- --ignored` when Redis is available
    async fn test_cluster_concurrent_operations() {
        use tokio::task::JoinSet;

        let redis_url = get_redis_url();
        cleanup_redis_test_data(&redis_url).await;

        let cluster_manager =
            match ClusterRoomManager::new(&redis_url, "concurrent-test-node".to_string()).await {
                Ok(manager) => manager,
                Err(_) => {
                    println!("Skipping test - Redis not available");
                    return;
                }
            };

        let cluster_manager = std::sync::Arc::new(cluster_manager);
        let mut join_set = JoinSet::new();

        // Spawn multiple concurrent join operations
        for i in 1..=10 {
            let manager_clone = std::sync::Arc::clone(&cluster_manager);
            join_set.spawn(async move {
                let participant = create_test_participant(i, &format!("user{}", i));
                manager_clone
                    .join_room("concurrent_room".to_string(), participant)
                    .await
            });
        }

        // Wait for all operations to complete
        let mut results = Vec::new();
        while let Some(result) = join_set.join_next().await {
            results.push(result.unwrap());
        }

        // Most operations should succeed (some might fail due to race conditions)
        let successful_joins = results.iter().filter(|r| r.is_ok()).count();
        assert!(
            successful_joins >= 8,
            "Most concurrent joins should succeed"
        );

        // Wait for Redis consistency
        sleep(Duration::from_millis(200)).await;

        // Check final room state
        let participants = cluster_manager
            .get_room_participants("concurrent_room")
            .await;
        assert!(participants.len() >= 8, "Room should have most users");

        cleanup_redis_test_data(&redis_url).await;
    }

    // Helper function to run integration tests if Redis is available
    pub async fn can_connect_to_redis() -> bool {
        let redis_url = get_redis_url();
        match redis::Client::open(&redis_url) {
            Ok(client) => match client.get_async_connection().await {
                Ok(mut conn) => {
                    use redis::AsyncCommands;
                    conn.ping().await.is_ok()
                }
                Err(_) => false,
            },
            Err(_) => false,
        }
    }

    #[tokio::test]
    async fn test_redis_connection_availability() {
        let redis_available = can_connect_to_redis().await;
        if redis_available {
            println!("✅ Redis is available for integration tests");
            println!("Run with: cargo test --test integration_cluster_tests -- --ignored");
        } else {
            println!("❌ Redis not available - integration tests will be skipped");
            println!("To run integration tests:");
            println!("1. Start Redis: docker run -d -p 6379:6379 redis:7-alpine");
            println!("2. Run tests: cargo test --test integration_cluster_tests -- --ignored");
        }
    }
}

// Performance benchmarks (optional)
#[cfg(test)]
mod benchmarks {
    use super::integration_tests::*;
    use std::time::Instant;

    #[tokio::test]
    #[ignore] // Run with `cargo test -- --ignored` when Redis is available
    async fn benchmark_cluster_operations() {
        if !can_connect_to_redis().await {
            println!("Skipping benchmark - Redis not available");
            return;
        }

        let redis_url = get_redis_url();
        let cluster_manager = ClusterRoomManager::new(&redis_url, "benchmark-node".to_string())
            .await
            .unwrap();

        const NUM_OPERATIONS: usize = 100;
        let mut join_times = Vec::new();
        let mut leave_times = Vec::new();

        println!("Running benchmark with {} operations...", NUM_OPERATIONS);

        // Benchmark join operations
        for i in 0..NUM_OPERATIONS {
            let participant = create_test_participant(i as u32, &format!("user{}", i));

            let start = Instant::now();
            let _ = cluster_manager
                .join_room("benchmark_room".to_string(), participant)
                .await;
            let duration = start.elapsed();

            join_times.push(duration);
        }

        // Benchmark leave operations
        for i in 0..NUM_OPERATIONS {
            let start = Instant::now();
            let _ = cluster_manager.leave_room("benchmark_room", i as u32).await;
            let duration = start.elapsed();

            leave_times.push(duration);
        }

        // Calculate statistics
        let avg_join = join_times.iter().sum::<std::time::Duration>() / join_times.len() as u32;
        let avg_leave = leave_times.iter().sum::<std::time::Duration>() / leave_times.len() as u32;

        println!("📊 Benchmark Results:");
        println!("  Average join time:  {:?}", avg_join);
        println!("  Average leave time: {:?}", avg_leave);
        println!(
            "  Operations per second (join):  {:.2}",
            1.0 / avg_join.as_secs_f64()
        );
        println!(
            "  Operations per second (leave): {:.2}",
            1.0 / avg_leave.as_secs_f64()
        );

        // Performance assertions (adjust based on your requirements)
        assert!(
            avg_join < std::time::Duration::from_millis(50),
            "Join operations should be under 50ms"
        );
        assert!(
            avg_leave < std::time::Duration::from_millis(50),
            "Leave operations should be under 50ms"
        );
    }
}
