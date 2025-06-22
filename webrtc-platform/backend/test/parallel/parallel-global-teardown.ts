/**
 * Parallel Test Global Teardown
 *
 * This file runs once after all parallel tests complete.
 * It's responsible for cleaning up the test environment.
 */

import { Client } from 'pg';
import { getTestWorkerEnv, getTestWorkerId } from './parallel-test-config';

export default async function parallelGlobalTeardown() {
  const workerId = getTestWorkerId();
  const env = getTestWorkerEnv();

  console.log(`🧹 Parallel global teardown starting for worker ${workerId}...`);

  try {
    // Clean up worker database
    const adminClient = new Client({
      host: env.TEST_DB_HOST,
      port: parseInt(env.TEST_DB_PORT, 10),
      user: env.TEST_DB_USER,
      password: env.TEST_DB_PASSWORD,
      database: 'postgres', // Connect to default postgres database
    });

    await adminClient.connect();

    // Drop the worker database
    await adminClient.query(`DROP DATABASE IF EXISTS "${env.TEST_DB_NAME}"`);
    console.log(`🗑️  Dropped database: ${env.TEST_DB_NAME}`);

    await adminClient.end();

    console.log(`✅ Parallel global teardown completed for worker ${workerId}`);
  } catch (error) {
    console.error(
      `❌ Parallel global teardown failed for worker ${workerId}:`,
      error,
    );
    // Don't throw - we want tests to complete even if cleanup fails
  }
}
