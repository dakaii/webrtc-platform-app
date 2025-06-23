import { Options } from '@mikro-orm/core';

/**
 * Get database configuration for current test mode
 */
function getTestDatabaseConfig() {
  // Check if we're in parallel mode - only when explicitly enabled
  const isParallel = process.env.TEST_PARALLEL === 'true';

  if (isParallel) {
    // Import parallel config only when needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getTestWorkerEnv } = require('./parallel/parallel-test-config');
    return getTestWorkerEnv();
  } else {
    // Simple sequential config
    return {
      TEST_DB_NAME: process.env.TEST_DB_NAME || 'chirp_test',
      TEST_DB_HOST: process.env.TEST_DB_HOST || 'localhost',
      TEST_DB_PORT: process.env.TEST_DB_PORT || '5437',
      TEST_DB_USER: process.env.TEST_DB_USER || 'postgres',
      TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD || 'postgres',
    };
  }
}

// Get appropriate database configuration
const testEnv = getTestDatabaseConfig();

const config: Options = {
  entities: ['./src/entities/*.entity.ts'],
  type: 'postgresql',
  dbName: testEnv.TEST_DB_NAME,
  host: testEnv.TEST_DB_HOST,
  port: parseInt(testEnv.TEST_DB_PORT, 10),
  user: testEnv.TEST_DB_USER,
  password: testEnv.TEST_DB_PASSWORD,
  debug: false,
  allowGlobalContext: true,
  // Schema generator configuration (Django-like approach)
  schemaGenerator: {
    disableForeignKeys: true, // Temporarily disable FKs during schema operations
    createForeignKeyConstraints: true, // But ensure they are created
    ignoreSchema: [], // Don't ignore any schemas
  },
  // Validate required fields
  validateRequired: true,
  // Force UTC timezone for consistency
  forceUtcTimezone: true,
  // Use transactions for tests
  implicitTransactions: true,
  // Connection pool settings optimized for testing
  pool: {
    min: 1,
    max: 5, // Lower max connections for test environment
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 30000,
  },
};

export default config;
