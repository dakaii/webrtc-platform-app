# Testing Guide for Redis Clustering Implementation

This guide covers how to test the Redis-based clustering functionality in the WebRTC signaling server.

## Test Structure

The clustering tests are organized into multiple levels:

### 1. Unit Tests (`tests/cluster_tests.rs`)

- **Mock-based tests** that don't require external dependencies
- Test message serialization/deserialization
- Test core clustering logic
- Simulate Redis operations with mock objects
- Fast execution, run in CI/CD

### 2. Integration Tests (`tests/integration_cluster_tests.rs`)

- **Real Redis tests** that require a running Redis instance
- Test actual ClusterRoomManager with Redis
- Test cross-server communication
- Test failure scenarios and recovery
- Performance benchmarks

## Running Tests

### Unit Tests (Always Available)

```bash
# Run all unit tests
cargo test

# Run only clustering unit tests
cargo test cluster_tests

# Run with output
cargo test cluster_tests -- --nocapture
```

### Integration Tests (Require Redis)

#### Option 1: Using Docker Compose

```bash
# Start Redis (in project root)
docker compose up redis -d

# Run integration tests
cd signaling
cargo test integration_cluster_tests -- --ignored --nocapture

# Cleanup
docker compose down
```

#### Option 2: Using Direct Redis

```bash
# Start Redis directly
docker run -d -p 6379:6379 --name test-redis redis:7-alpine

# Run integration tests
cargo test integration_cluster_tests -- --ignored --nocapture

# Cleanup
docker rm -f test-redis
```

#### Option 3: Custom Redis URL

```bash
# Set custom Redis URL
export REDIS_URL="redis://your-redis-server:6379"
cargo test integration_cluster_tests -- --ignored --nocapture
```

## Test Categories

### 📦 Unit Tests

#### Message Serialization Tests

- ✅ `test_cluster_message_serialization`
- ✅ `test_webrtc_signal_message_serialization`
- ✅ `test_connection_info_serialization`
- ✅ `test_cluster_heartbeat_message`

**Purpose**: Ensure all cluster messages can be properly serialized/deserialized for Redis pub/sub.

#### Local Room Manager Tests (Baseline)

- ✅ `test_local_room_manager_basic_operations`
- ✅ `test_local_room_manager_multiple_users`

**Purpose**: Verify the local fallback implementation works correctly.

#### Mock Cluster Simulation Tests

- ✅ `test_cluster_message_routing_simulation`
- ✅ `test_cluster_user_join_leave_simulation`
- ✅ `test_cluster_failure_recovery_simulation`
- ✅ `test_redis_failure_fallback_simulation`
- ✅ `test_full_cluster_simulation`

**Purpose**: Test clustering logic without requiring external Redis.

#### Concurrency Tests

- ✅ `test_concurrent_room_operations`
- ✅ `test_message_broadcast_simulation`

**Purpose**: Ensure thread safety and correct behavior under concurrent access.

### 🔗 Integration Tests

#### Basic Cluster Operations

- ✅ `test_cluster_manager_creation`
- ✅ `test_cluster_room_join_and_leave`
- ✅ `test_cluster_multiple_users`

**Purpose**: Test basic cluster functionality with real Redis.

#### Cross-Server Communication

- ✅ `test_cluster_cross_server_communication`

**Purpose**: Test communication between multiple cluster nodes via Redis.

#### Failure Scenarios

- ✅ `test_cluster_failure_recovery`
- ✅ `test_cluster_heartbeat_and_monitoring`

**Purpose**: Test behavior when Redis fails and recovers.

#### Performance Tests

- ✅ `test_cluster_concurrent_operations`
- ✅ `benchmark_cluster_operations`

**Purpose**: Measure performance and ensure it meets requirements.

## Test Data and Cleanup

### Automatic Cleanup

All integration tests automatically clean up their Redis data:

- Before test: `cleanup_redis_test_data()`
- After test: `cleanup_redis_test_data()`

### Test Keys Used

```redis
# Room data
rooms:test_room:participants
rooms:integration_room:participants
rooms:multi_user_room:participants

# Server data
servers:test-node-1:connections
servers:test-node-2:connections
servers:test-node-1:heartbeat
servers:test-node-2:heartbeat
```

## Expected Test Results

### Unit Tests

```bash
running 15 tests
test test_cluster_message_serialization ... ok
test test_webrtc_signal_message_serialization ... ok
test test_connection_info_serialization ... ok
test test_local_room_manager_basic_operations ... ok
test test_local_room_manager_multiple_users ... ok
test test_cluster_message_routing_simulation ... ok
test test_cluster_user_join_leave_simulation ... ok
test test_cluster_failure_recovery_simulation ... ok
test test_redis_failure_fallback_simulation ... ok
test test_concurrent_room_operations ... ok
test test_message_broadcast_simulation ... ok
test test_cluster_heartbeat_message ... ok
test test_full_cluster_simulation ... ok

test result: ok. 15 passed; 0 failed; 0 ignored
```

### Integration Tests (with Redis)

```bash
running 8 tests
test integration_tests::test_redis_connection_availability ... ok
test integration_tests::test_cluster_manager_creation ... ok
test integration_tests::test_cluster_room_join_and_leave ... ok
test integration_tests::test_cluster_multiple_users ... ok
test integration_tests::test_cluster_cross_server_communication ... ok
test integration_tests::test_cluster_failure_recovery ... ok
test integration_tests::test_cluster_heartbeat_and_monitoring ... ok
test integration_tests::test_cluster_concurrent_operations ... ok
test benchmarks::benchmark_cluster_operations ... ok

test result: ok. 8 passed; 0 failed; 0 ignored
```

## Performance Benchmarks

### Expected Performance (with local Redis)

- **Join operations**: < 50ms average
- **Leave operations**: < 50ms average
- **Operations per second**: > 20 ops/sec
- **Cross-server routing**: < 10ms additional latency

### Benchmark Output Example

```
📊 Benchmark Results:
  Average join time:  15.2ms
  Average leave time: 12.8ms
  Operations per second (join):  65.79
  Operations per second (leave): 78.13
```

## Troubleshooting

### Common Issues

#### Redis Connection Failed

```
Error: Failed to create cluster manager: Connection refused
```

**Solution**: Make sure Redis is running and accessible:

```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis connectivity
redis-cli ping
```

#### Test Timeouts

```
Error: test timed out after 60 seconds
```

**Solution**:

- Check Redis performance
- Reduce test parallelism
- Increase timeout values

#### Port Conflicts

```
Error: Address already in use
```

**Solution**: Use different Redis port:

```bash
export REDIS_URL="redis://localhost:6380"
docker run -d -p 6380:6379 redis:7-alpine
```

### Debug Mode

Enable detailed logging for tests:

```bash
RUST_LOG=debug cargo test integration_cluster_tests -- --ignored --nocapture
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Clustering Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run unit tests
        run: cd signaling && cargo test cluster_tests

  integration-tests:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run integration tests
        env:
          REDIS_URL: redis://localhost:6379
        run: cd signaling && cargo test integration_cluster_tests -- --ignored
```

## Manual Testing

### End-to-End Cluster Test

1. **Start Redis**:

   ```bash
   docker compose up redis -d
   ```

2. **Start Multiple Signaling Servers**:

   ```bash
   # Terminal 1
   cd signaling
   CLUSTER_MODE=true NODE_ID=server-1 SIGNALING_PORT=3001 cargo run

   # Terminal 2
   CLUSTER_MODE=true NODE_ID=server-2 SIGNALING_PORT=3002 cargo run
   ```

3. **Test Cross-Server Communication**:

   - Connect User A to ws://localhost:3001
   - Connect User B to ws://localhost:3002
   - Have both join the same room
   - Verify they can see each other and exchange WebRTC signals

4. **Monitor Redis**:

   ```bash
   # Watch Redis activity
   redis-cli MONITOR

   # Check cluster state
   redis-cli HGETALL rooms:test_room:participants
   redis-cli HGETALL servers:server-1:connections
   ```

## Test Coverage

Run with coverage to ensure all clustering code is tested:

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Run coverage
cd signaling
cargo tarpaulin --out html --output-dir coverage

# Open coverage report
open coverage/index.html
```

Target coverage: **> 80%** for clustering-related code.

## Contributing

When adding new clustering features:

1. **Write unit tests first** (mock-based)
2. **Add integration tests** for complex scenarios
3. **Update this guide** with new test descriptions
4. **Ensure cleanup** - tests should not leave Redis data
5. **Add performance considerations** if the feature affects performance

### Test Naming Convention

- Unit tests: `test_[component]_[functionality]`
- Integration tests: `test_cluster_[scenario]`
- Benchmarks: `benchmark_[operation]`
- Simulations: `test_[scenario]_simulation`
