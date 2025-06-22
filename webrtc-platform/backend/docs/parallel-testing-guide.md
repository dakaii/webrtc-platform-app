# Parallel Testing Guide

## Overview

This guide describes the parallel testing infrastructure for the Chirp application. Our approach uses **one PostgreSQL container with multiple databases** for efficient resource usage and fast test execution.

## Architecture

### Single Container, Multiple Databases Approach

```
Jest Worker 1 → PostgreSQL Container:5432 → chirp_test_worker_1
Jest Worker 2 → PostgreSQL Container:5432 → chirp_test_worker_2
Jest Worker 3 → PostgreSQL Container:5432 → chirp_test_worker_3
```

**Benefits:**

- **Resource Efficient**: One PostgreSQL process (~100MB vs 300-400MB)
- **Fast Startup**: Single container initialization (3-5s vs 10-15s)
- **Simple Configuration**: No port allocation complexity
- **Complete Isolation**: Each database is completely separate
- **Scalable**: Supports up to 100+ concurrent connections

## Implementation Details

### Worker Configuration (`test/utils/test-config.ts`)

- **Worker ID Detection**: Automatic Jest worker identification
- **Database Naming**: `chirp_test_worker_${workerId}`
- **Port Strategy**: All workers use port 5432 (single container)
- **Environment Management**: Worker-specific environment variables

### Database Initialization (`test/init-databases.sql`)

```sql
CREATE DATABASE chirp_test_worker_1;
CREATE DATABASE chirp_test_worker_2;
CREATE DATABASE chirp_test_worker_3;
-- ... up to worker 5
```

### Global Lifecycle Management

- **Global Setup** (`test/global-setup.ts`): One-time worker initialization
- **Per-Test Setup** (`test/setup.ts`): Database cleanup between tests
- **Global Teardown** (`test/global-teardown.ts`): Worker cleanup

## Usage

### Run Tests Sequentially (Default)

```bash
make test           # Docker-based
npm test           # Local
```

### Run Tests in Parallel

```bash
npm run test:parallel    # Uses 50% of CPU cores
jest --maxWorkers=4      # Explicit worker count
```

### Debug Mode

```bash
npm run test:debug       # Enhanced logging
DEBUG_TEST_CONFIG=true npm test  # Configuration debugging
```

## Configuration

### Environment Variables

- `JEST_WORKER_ID`: Automatic Jest worker identification
- `TEST_DB_HOST`: Database host (default: localhost)
- `TEST_DB_PORT`: Database port (default: 5432)
- `TEST_PARALLEL`: Enable parallel mode features
- `DEBUG_TEST_CONFIG`: Enable configuration debugging

### Database Connection

All workers connect to the same PostgreSQL instance:

```
postgresql://postgres:postgres@localhost:5432/chirp_test_worker_${workerId}
```

## Best Practices

### Test Isolation

- Each worker gets its own database schema
- Database cleanup runs before each test
- No shared state between workers
- No data conflicts or race conditions

### Performance Optimization

- Use `beforeEach()` for database cleanup (not `beforeAll()`)
- Leverage PostgreSQL's connection pooling
- Minimize test data creation overhead
- Use transactions for complex test scenarios

### Debugging

- Worker-aware logging with `[Worker N]` prefixes
- Configuration debugging with `DEBUG_TEST_CONFIG=true`
- Enhanced error messages with context
- Connection health monitoring

## Troubleshooting

### Common Issues

**"Database not found" errors:**

- Ensure `test/init-databases.sql` is executed
- Check Docker volume mounting
- Verify database initialization logs

**Port conflicts:**

- All workers use port 5432 (single container)
- Check if other PostgreSQL instances are running
- Use `docker ps` to verify container status

**Worker identification:**

- Jest automatically sets `JEST_WORKER_ID`
- Fallback to `TEST_WORKER_ID` for custom runners
- Default worker ID is '1' for sequential runs

### Database Connection Debugging

```bash
# Check container status
docker ps | grep chirp-test-db

# View container logs
docker logs chirp-test-db

# Connect to database directly
docker exec -it chirp-test-db psql -U postgres -l
```

## Future Enhancements

### Ready for Implementation

- **Dynamic Database Creation**: Create databases on-demand
- **Connection Pooling**: Optimize connections per worker
- **Test Sharding**: Distribute tests across multiple containers
- **Performance Monitoring**: Track test execution metrics

### Advanced Features

- **Conditional Parallel Testing**: Based on test suite size
- **Resource Scaling**: Dynamic worker allocation
- **Cross-Platform Support**: Windows/Linux compatibility
- **CI/CD Integration**: Optimized for GitHub Actions/Jenkins

## Technical Architecture

### File Structure

```
test/
├── utils/
│   ├── test-config.ts      # Worker configuration
│   └── database.ts         # Database utilities
├── global-setup.ts         # Global initialization
├── global-teardown.ts      # Global cleanup
├── setup.ts               # Per-test setup
├── init-databases.sql     # Database initialization
└── mikro-orm.config.ts    # MikroORM configuration
```

### Docker Configuration

```yaml
# docker-compose.test.yml
services:
  test-db:
    image: postgres:16
    ports:
      - '5432:5432' # Single port
    volumes:
      - ./test/init-databases.sql:/docker-entrypoint-initdb.d/
```

This architecture provides a robust, scalable foundation for parallel testing while maintaining simplicity and efficiency.
