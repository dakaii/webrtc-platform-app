/**
 * Parallel Test Global Setup
 *
 * This file runs once before all parallel tests. It runs once per worker.
 * It's responsible for setting up the test environment, including databases.
 */

import { MikroORM } from '@mikro-orm/core';
import { Client } from 'pg';
import {
  getTestWorkerId,
  getTestWorkerEnv,
  isParallelTestMode,
  logWorkerConfig,
} from './parallel-test-config';
import config from '../mikro-orm.config';

async function waitForDatabase(
  env: Record<string, string>,
  maxRetries = 30,
  delay = 1000,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new Client({
        host: env.TEST_DB_HOST,
        port: parseInt(env.TEST_DB_PORT, 10),
        user: env.TEST_DB_USER,
        password: env.TEST_DB_PASSWORD,
        database: 'postgres',
        connectionTimeoutMillis: 2000,
      });

      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      console.log(`✅ Database connection established`);
      return;
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(
          `⏳ Waiting for database... (attempt ${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error(
          `Database not ready after ${maxRetries} attempts: ${error.message}`,
        );
      }
    }
  }
}

async function createDatabaseIfNotExists(
  dbName: string,
  env: Record<string, string>,
) {
  // Connect to postgres database to create worker database
  const adminClient = new Client({
    host: env.TEST_DB_HOST,
    port: parseInt(env.TEST_DB_PORT, 10),
    user: env.TEST_DB_USER,
    password: env.TEST_DB_PASSWORD,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    await adminClient.connect();

    // Check if database exists
    const result = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database created: ${dbName}`);
    } else {
      console.log(`♻️  Database already exists: ${dbName}`);
    }
  } finally {
    await adminClient.end();
  }
}

export default async function parallelGlobalSetup() {
  const workerId = getTestWorkerId();
  const env = getTestWorkerEnv();
  const isParallel = isParallelTestMode();

  console.log(
    `🚀 Parallel global setup starting for worker ${workerId}${isParallel ? ' (parallel mode)' : ''}`,
  );

  // Log configuration if debug mode is enabled
  logWorkerConfig();

  try {
    // Set up environment variables first
    Object.assign(process.env, env);

    // Use actual environment variables (Docker Compose sets these correctly)
    const dbEnv = {
      TEST_DB_HOST: process.env.TEST_DB_HOST || 'localhost',
      TEST_DB_PORT: '5432', // Always use internal Docker port
      TEST_DB_USER: process.env.TEST_DB_USER || 'postgres',
      TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD || 'postgres',
    };

    // Wait for database to be ready
    console.log(`🔌 Waiting for database connection...`);
    await waitForDatabase(dbEnv);

    // Create worker database if it doesn't exist
    await createDatabaseIfNotExists(env.TEST_DB_NAME, dbEnv);

    // Initialize database schema for this worker
    console.log(`🗃️  Initializing database schema for worker ${workerId}...`);

    const orm = await MikroORM.init(config);
    const generator = orm.getSchemaGenerator();

    // Drop and recreate schema to ensure clean state
    await generator.dropSchema();
    await generator.createSchema();

    console.log(`✅ Database schema initialized for worker ${workerId}`);
    await orm.close();

    if (isParallel) {
      console.log(`📦 Worker ${workerId} environment prepared`);
      console.log(`   Database: ${env.TEST_DB_NAME}`);
      console.log(`   Port: ${dbEnv.TEST_DB_PORT}`);
    }
  } catch (error) {
    console.error(
      `❌ Parallel global setup failed for worker ${workerId}:`,
      error,
    );
    throw error;
  }

  console.log(`✅ Parallel global setup completed for worker ${workerId}`);
}
