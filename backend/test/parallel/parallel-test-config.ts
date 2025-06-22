/**
 * Parallel Test Configuration Utilities
 *
 * This module provides utilities for configuring parallel tests.
 * Each test worker can have its own isolated environment.
 */

interface TestWorkerConfig {
  workerId: string;
  dbName: string;
  dbPort: number;
  appPort: number;
}

/**
 * Gets the current Jest worker ID or generates a fallback ID
 */
export function getTestWorkerId(): string {
  // Jest provides JEST_WORKER_ID for parallel runs
  if (process.env.JEST_WORKER_ID) {
    return process.env.JEST_WORKER_ID;
  }

  // Fallback for non-parallel runs or other test runners
  return process.env.TEST_WORKER_ID || '1';
}

/**
 * Generates worker-specific configuration for isolated testing
 */
export function getTestWorkerConfig(): TestWorkerConfig {
  const workerId = getTestWorkerId();
  const basePort = parseInt(process.env.TEST_DB_PORT || '5433', 10);
  const baseAppPort = parseInt(process.env.TEST_BASE_APP_PORT || '3001', 10);

  // Calculate unique app ports for this worker, but use same DB port (single container)
  const workerNum = parseInt(workerId, 10);
  const dbPort = basePort; // All workers use same database container
  const appPort = baseAppPort + (workerNum - 1);

  return {
    workerId,
    dbName: `chirp_test_worker_${workerId}`,
    dbPort,
    appPort,
  };
}

/**
 * Gets environment variables for the current test worker
 */
export function getTestWorkerEnv(): Record<string, string> {
  const config = getTestWorkerConfig();

  return {
    NODE_ENV: 'test',
    TEST_WORKER_ID: config.workerId,
    TEST_DB_NAME: config.dbName,
    TEST_DB_HOST: process.env.TEST_DB_HOST || 'localhost',
    TEST_DB_PORT: process.env.TEST_DB_PORT || config.dbPort.toString(),
    TEST_DB_USER: process.env.TEST_DB_USER || 'postgres',
    TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD || 'postgres',
    TEST_APP_PORT: config.appPort.toString(),
    MIKRO_ORM_CONFIG_PATH: './test/mikro-orm.config.ts',
  };
}

/**
 * Checks if we're running in parallel test mode
 */
export function isParallelTestMode(): boolean {
  return (
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.TEST_PARALLEL === 'true'
  );
}

/**
 * Gets the database connection string for the current worker
 */
export function getTestDatabaseUrl(): string {
  const env = getTestWorkerEnv();
  return `postgresql://${env.TEST_DB_USER}:${env.TEST_DB_PASSWORD}@${env.TEST_DB_HOST}:${env.TEST_DB_PORT}/${env.TEST_DB_NAME}`;
}

/**
 * Debug utility to log worker configuration
 */
export function logWorkerConfig(): void {
  if (process.env.DEBUG_TEST_CONFIG === 'true') {
    const config = getTestWorkerConfig();
    const env = getTestWorkerEnv();

    console.log('🔧 Test Worker Configuration:', {
      worker: config,
      env,
      parallel: isParallelTestMode(),
      databaseUrl: getTestDatabaseUrl(),
    });
  }
}
