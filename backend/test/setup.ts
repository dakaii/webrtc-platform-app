/**
 * Main Test Setup (runs before each test file)
 *
 * This file runs before each test file is executed.
 * It conditionally loads parallel or sequential setup based on TEST_PARALLEL environment variable.
 */

import { MikroORM } from '@mikro-orm/core';
import mikroOrmConfig from './mikro-orm.config';

// Increase timeout for database operations
jest.setTimeout(30000);

// Conditionally load parallel setup if TEST_PARALLEL is enabled
if (process.env.TEST_PARALLEL === 'true') {
  // Import and use parallel setup for worker databases
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setupParallelDatabase } = require('./parallel/parallel-setup');

  // Setup once before all tests in this worker
  let parallelSetupComplete = false;

  beforeAll(async () => {
    if (!parallelSetupComplete) {
      await setupParallelDatabase();
      parallelSetupComplete = true;
    }
  });
} else {
  // Use sequential setup for regular testing

  /**
   * Simple database setup function for sequential tests
   */
  async function setupSequentialDatabase() {
    console.log('🚀 Setting up sequential test database...');

    try {
      // Connect to the default test database
      const testOrmConfig = {
        ...mikroOrmConfig,
        dbName: process.env.TEST_DB_NAME || 'chirp_test',
      };

      const testOrm = await MikroORM.init(testOrmConfig);

      console.log('🗃️ Initializing database schema...');

      // Generate schema
      const generator = testOrm.getSchemaGenerator();
      await generator.dropSchema();
      await generator.createSchema();

      console.log('✅ Database schema initialized');

      await testOrm.close();

      console.log('✅ Sequential database setup completed');
    } catch (error) {
      console.error('❌ Sequential database setup failed:', error);
      throw error;
    }
  }

  // Setup once before all tests
  let setupComplete = false;

  beforeAll(async () => {
    if (!setupComplete) {
      await setupSequentialDatabase();
      setupComplete = true;
    }
  });
}

// Global error handlers (apply to both parallel and sequential tests)
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// Ensure clean exit
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});
