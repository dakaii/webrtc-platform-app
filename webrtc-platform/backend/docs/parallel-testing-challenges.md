# Parallel Testing Challenges and Solutions

## Overview

This document captures the challenges encountered when attempting to implement parallel testing with multiple Jest workers in our NestJS + MikroORM application, and the eventual decision to use sequential testing.

## Attempted Approaches

### 1. Per-Worker Database Isolation

**Goal**: Create separate databases for each Jest worker to avoid data conflicts.

**Implementation Strategy**:

- Use `JEST_WORKER_ID` environment variable to create unique database names
- Set up databases in `setupFilesAfterEnv` or `globalSetup`
- Run migrations for each worker database

**Challenges Encountered**:

#### A. Jest Lifecycle Complexity

- **Setup Timing**: `globalSetup` runs once before workers start (not per-worker)
- **`setupFilesAfterEnv`**: Runs per test file, causing redundant database creation
- **Module Initialization**: NestJS modules initialize before setup functions complete

#### B. MikroORM Multiple Instance Conflicts

```
TypeError: Method Map.prototype.set called on incompatible receiver #<Map>
```

- **Root Cause**: Multiple MikroORM instances trying to register metadata simultaneously
- **Impact**: Test modules fail to compile, breaking all tests
- **Why It Happens**: MikroORM uses global metadata registry that conflicts across workers

#### C. Migration Timing Issues

```
MigrationClass is not a constructor
```

- **Problem**: Migrations running during Jest module teardown
- **Timing**: Migrations complete after Jest has started cleaning up test environment
- **Error**: `Cannot log after tests are done`

#### D. Database Creation Limitations

- **Container Constraint**: Single PostgreSQL container shared across workers
- **Permission Issues**: Creating databases requires elevated privileges
- **Connection Pooling**: Database connections interfere across workers

### 2. Transaction-Based Isolation

**Goal**: Use database transactions that auto-rollback to isolate test data.

**Implementation**:

```typescript
export async function withTestTransaction<T>(
  context: TestContext,
  testFunction: () => Promise<T>,
): Promise<T> {
  return context.orm.em.transactional(async () => {
    return await testFunction();
  });
}
```

**Challenges**:

- **Factory References**: Entities created in one transaction can't reference entities from another
- **Cross-Transaction Data**: Integration tests need data to persist across multiple operations
- **Factory Complexity**: Required complex EntityManager forking in factories

### 3. Dynamic Database Cleanup

**Goal**: Dynamically discover and clean all entities without hardcoding.

**Iterations**:

1. **PostgreSQL Constraints Manipulation**:

   ```sql
   SET session_replication_role = replica; -- Disable FK constraints
   -- Delete entities
   SET session_replication_role = DEFAULT; -- Re-enable FK constraints
   ```

2. **TRUNCATE CASCADE**:

   ```sql
   TRUNCATE user, post, comment RESTART IDENTITY CASCADE;
   ```

3. **Dynamic Table Discovery**:
   ```typescript
   const metadata = orm.getMetadata();
   const tableNames = Object.values(metadata.getAll()).map(
     (meta) => meta.tableName,
   );
   ```

**Race Condition Issues**:

- **Parallel Execution**: Multiple workers accessing same database simultaneously
- **Foreign Key Violations**: Cleanup in one worker while another worker creating data
- **Deadlocks**: PostgreSQL deadlocks during concurrent TRUNCATE operations

## Root Causes Analysis

### 1. Shared Resource Contention

- **Single Database**: All workers competing for same PostgreSQL instance
- **Global State**: MikroORM metadata registry shared across Node.js processes
- **Entity Manager Conflicts**: EntityManager instances interfering with each other

### 2. Jest Worker Architecture Mismatch

- **Worker Isolation**: Jest workers are separate Node.js processes
- **Shared Database**: Database connection is a shared resource
- **Setup Lifecycle**: Jest setup hooks don't align with per-worker needs

### 3. MikroORM Design Assumptions

- **Single Instance**: MikroORM designed for single application instance
- **Metadata Registry**: Global metadata storage doesn't handle multiple simultaneous instances
- **Entity Manager**: Not designed for cross-process coordination

## Successful Sequential Solution

### Implementation

```typescript
// jest configuration
{
  "maxWorkers": 1,  // Force sequential execution
  "globalSetup": "<rootDir>/test/global-setup.ts"
}
```

### Benefits

- **Simple**: No worker coordination needed
- **Reliable**: No race conditions or resource conflicts
- **Debuggable**: Easier to troubleshoot test failures
- **Consistent**: Predictable test execution order

### Trade-offs

- **Slower**: Tests run sequentially instead of in parallel
- **Resource Usage**: Not utilizing multiple CPU cores for testing

## Future Improvements

### When to Revisit Parallel Testing

**Prerequisites**:

1. **Database Per Worker**: True database isolation (not just separate schemas)
2. **MikroORM Multi-Instance Support**: Framework support for multiple instances
3. **Test Infrastructure Maturity**: More sophisticated test orchestration

**Possible Solutions**:

1. **Containerized Databases**:

   - Spin up separate PostgreSQL containers per worker
   - Use Docker Compose dynamic scaling
   - Requires orchestration complexity

2. **Test Database Service**:

   - Dedicated service managing database lifecycle per worker
   - Pre-provisioned database pools
   - Requires infrastructure investment

3. **In-Memory Databases**:
   - SQLite in-memory for unit tests
   - PostgreSQL only for integration tests
   - Requires dual database support

### Performance Baseline

**Current Sequential Performance** (as of implementation):

- ~4-6 seconds for full test suite
- Acceptable for current test volume
- May need optimization as test suite grows

**Parallel Testing Threshold**:

- Consider revisiting when test suite exceeds 30+ seconds
- Cost/benefit analysis of complexity vs speed
- Team capacity for maintaining complex test infrastructure

## Lessons Learned

1. **Start Simple**: Sequential testing is often sufficient for small-medium projects
2. **Framework Limitations**: Respect ORM and framework design assumptions
3. **Shared Resources**: Database is a shared resource that requires careful coordination
4. **Test Infrastructure ROI**: Complex test setups need significant maintenance

## Recommended Approach

**For Most Projects**: Use sequential testing with robust cleanup
**For Large Codebases**: Invest in proper parallel testing infrastructure
**For CI/CD**: Consider separate test strategies for different environments

---

_Document created: December 2024_
_Last updated: December 2024_
