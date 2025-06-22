/**
 * Parallel Testing Configuration
 *
 * This module handles all parallel testing configuration and worker management.
 * It's isolated from the main test configuration to keep the main tests simple.
 */

export function getTestWorkerId(): number {
  // Jest worker ID (1, 2, 3, etc.)
  return parseInt(process.env.JEST_WORKER_ID || '1', 10);
}

export function isParallelTestMode(): boolean {
  return process.env.TEST_PARALLEL === 'true';
}

export function getParallelTestWorkerEnv() {
  const workerId = getTestWorkerId();
  const basePort = 5432;

  return {
    TEST_DB_NAME: `chirp_test_worker_${workerId}`,
    TEST_DB_HOST: process.env.TEST_DB_HOST || 'localhost',
    TEST_DB_PORT: process.env.TEST_DB_PORT || basePort.toString(), // Use single container
    TEST_DB_USER: process.env.TEST_DB_USER || 'postgres',
    TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD || 'postgres',
    WORKER_ID: workerId.toString(),
  };
}

export function logParallelWorkerConfig() {
  if (process.env.DEBUG_TESTS === 'true') {
    const workerId = getTestWorkerId();
    const testEnv = getParallelTestWorkerEnv();

    console.log(`[Worker ${workerId}] Parallel Test Configuration:`);
    console.log(`[Worker ${workerId}] - Database: ${testEnv.TEST_DB_NAME}`);
    console.log(`[Worker ${workerId}] - Host: ${testEnv.TEST_DB_HOST}`);
    console.log(`[Worker ${workerId}] - Port: ${testEnv.TEST_DB_PORT}`);
    console.log(`[Worker ${workerId}] - User: ${testEnv.TEST_DB_USER}`);
  }
}
