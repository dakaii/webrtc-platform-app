import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from './entities/user.entity';
import { Room } from './entities/room.entity';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRoot({
      type: 'postgresql',
      dbName: process.env.DB_NAME || 'webrtc_db',
      host: process.env.DB_HOST || 'localhost',
      port: +(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'webrtc_user',
      password: process.env.DB_PASSWORD || 'webrtc_password',
      entities: [User, Room],
      debug: process.env.NODE_ENV === 'development',
      allowGlobalContext:
        process.env.NODE_ENV === 'test' ||
        process.env.JEST_WORKER_ID !== undefined,
      migrations: {
        path: './migrations',
        glob: '!(*.d).{js,ts}',
        transactional: false,
        allOrNothing: false,
        snapshot: false,
      },
    }),
    MikroOrmModule.forFeature([User, Room]),
    UsersModule,
    RoomsModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
