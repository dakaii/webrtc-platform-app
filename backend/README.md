<a name="readme-top"></a>
[![GitHub][github-shield]][github-url]
[![LinkedIn][linkedin-shield]][linkedin-url]
[![Medium][medium-shield]][medium-url]

# WebRTC Backend

NestJS backend service for the WebRTC platform, providing user authentication, room management, and JWT token generation.

## Features

- 🔐 JWT-based authentication
- 👥 User management with bcrypt password hashing
- 🏠 Room creation and management
- 🗄️ PostgreSQL database with MikroORM
- 🐳 Docker support
- 🧪 Comprehensive testing setup

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Setup environment**

   ```bash
   cp ../env.example .env
   # Edit .env with your database credentials
   ```

3. **Start database**

   ```bash
   docker-compose up postgres -d
   ```

4. **Run migrations**

   ```bash
   npm run migration:up
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```

The backend will be available at `http://localhost:3001/api`

## Cursor AI Prompts

Here are some helpful prompts you can use with Cursor AI to extend this backend:

### Authentication & Security

```
"Add role-based access control to the authentication system with admin and user roles"
"Implement password reset functionality with email verification"
"Add rate limiting to prevent brute force attacks on login endpoints"
```

### Room Features

```
"Add room capacity limits and waiting room functionality"
"Implement room passwords with bcrypt hashing"
"Create scheduled rooms with start and end times"
```

### Database & Performance

```
"Add database indexing for optimal query performance"
"Implement database connection pooling for better performance"
"Create Redis caching for frequently accessed room data"
```

## Environment Variables

```env
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=postgresql://webrtc_user:webrtc_password@localhost:5432/webrtc_db
BACKEND_PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## Features

- User management (CRUD operations)
- Post management (CRUD operations)
- Relationships between users and posts
- Input validation using class-validator
- PostgreSQL database with MikroORM
- Docker support for development and testing

## Prerequisites

- Node.js (v18 or later)
- Docker and Docker Compose
- PostgreSQL (if running without Docker)

## Installation

```bash
npm install
```

## Running the app

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Docker

```bash
# Start development environment
docker-compose up -d

# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Stop and remove containers
docker-compose down -v
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Challenges and Caveats

This project encountered several significant technical challenges during development. Here's a comprehensive overview of the difficulties faced and how they were resolved:

### 1. MikroORM Jest Integration Issues

**Challenge**: The `Map.prototype.set` error in Jest with MikroORM

- **Symptoms**: Tests failing with `TypeError: Map.prototype.set called on incompatible receiver`
- **Root Cause**: Incompatibility between Jest's `globalSetup`/`globalTeardown` and MikroORM's internal Map usage
- **Solution**: Removed `globalSetup` from Jest configuration and moved database setup to `setupFilesAfterEnv` using standard `beforeAll()` hooks
- **Result**: Sequential tests improved from 0/64 to 64/64 passing

### 2. Parallel Testing Architecture

**Challenge**: Implementing reliable parallel test execution

- **Symptoms**: Foreign key constraint violations and entity relationship conflicts
- **Root Cause**: Each Jest worker gets an isolated database, but factories used hardcoded IDs that don't exist across different worker databases
- **Approach**: Built comprehensive parallel testing infrastructure with:
  - Worker-aware database configuration
  - Isolated factory providers per worker
  - Clean architectural separation in `test/parallel/` directory
- **Current Status**:
  - ✅ Sequential tests: 64/64 passing
  - 🔶 Parallel tests: Partially working but still encountering foreign key issues

### 3. Database Test Isolation

**Challenge**: Ensuring clean database state between tests

- **Initial Approach**: Transaction-based isolation with rollbacks
- **Problems**: Complex nested transaction management and potential deadlocks
- **Final Solution**: Database cleanup using dynamic table discovery
  - Query PostgreSQL metadata to get all user tables automatically
  - Disable foreign key constraints during cleanup
  - Re-enable constraints after cleanup
- **Benefits**: Maintainable, reliable, and automatically adapts to schema changes

### 4. Entity Factory Complexity

**Challenge**: Managing test data creation across different test environments

- **Evolution**:
  1. Started with hardcoded seeding
  2. Moved to complex factory hierarchies
  3. Implemented Factory Provider pattern for clean separation
- **Final Architecture**:
  - Simple factories focused only on entity creation
  - Centralized logic in `factory-provider.ts` for environment-aware behavior
  - Tests use clean `context.factories.createUser()` API without knowing about parallel/sequential modes

### 5. MikroORM Global Context Issues

**Challenge**: `RequestContext` and global context conflicts in tests

- **Solution**: Set `allowGlobalContext: true` for test environments
- **Configuration**: Environment-aware context handling in MikroORM config

### 6. Test Performance and Reliability

**Challenge**: Balancing test speed with reliability

- **Considerations**:
  - Sequential tests: Slower but 100% reliable
  - Parallel tests: Faster but complex database isolation requirements
- **Approach**: Dual configuration supporting both modes:

  ```bash
  # Sequential (reliable)
  npm run test

  # Parallel (experimental)
  npm run test:parallel
  ```

### 7. Database Migration Management

**Challenge**: Ensuring consistent schema across environments

- **Solution**: Comprehensive migration strategy with:
  - Transactional migrations
  - All-or-nothing approach
  - Separate test database initialization
  - Environment-aware entity path resolution

### Key Lessons Learned

1. **Jest + ORM Integration**: Always use `setupFilesAfterEnv` instead of `globalSetup` for database ORMs
2. **Test Isolation**: Database cleanup is more reliable than transaction rollbacks for integration tests
3. **Parallel Testing**: Requires careful architecture and may not always be worth the complexity
4. **Factory Patterns**: Clean separation between data creation and environment logic reduces complexity
5. **Progressive Enhancement**: Build sequential tests first, then add parallel testing as an optional feature

### Architecture Decisions

- **Clean Separation**: All parallel-specific code isolated in `test/parallel/`
- **Backward Compatibility**: Main test suite remains simple and reliable
- **Environment Detection**: Smart configuration based on `NODE_ENV` and `JEST_WORKER_ID`
- **Documentation First**: Comprehensive documentation for complex testing infrastructure

## Contact

Daiki Nakashita - [@LinkedIn](https://www.linkedin.com/in/daikinakashita/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white
[linkedin-url]: https://www.linkedin.com/in/daikinakashita/
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[github-url]: https://github.com/dakaii/
[medium-shield]: https://img.shields.io/badge/Medium-12100E?style=for-the-badge&logo=medium&logoColor=white
[medium-url]: https://dakaii.medium.com/
