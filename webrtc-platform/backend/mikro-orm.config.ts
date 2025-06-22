import { config } from 'dotenv';
config();

import { Options } from '@mikro-orm/core';
import { SeedManager } from '@mikro-orm/seeder';

const ormConfig: Options = {
  extensions: [SeedManager],
  entities:
    process.env.NODE_ENV === 'production'
      ? ['./dist/src/entities/*.entity.js']
      : ['./src/entities/*.entity.ts'],
  type: 'postgresql',
  dbName: process.env.DB_NAME || 'webrtc_db',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5433),
  user: process.env.DB_USER || 'webrtc_user',
  password: process.env.DB_PASSWORD || 'webrtc_password',
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext:
    process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined,
  migrations: {
    path: './migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
    snapshot: false,
  },
};

console.log('Final DB config:', {
  host: ormConfig.host,
  port: ormConfig.port,
  dbName: ormConfig.dbName,
  user: ormConfig.user,
});

export default ormConfig;
