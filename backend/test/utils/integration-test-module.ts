import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from '../../src/entities/user.entity';
import { Room } from '../../src/entities/room.entity';
import { UsersService } from '../../src/modules/users/users.service';
import { RoomsService } from '../../src/modules/rooms/rooms.service';
import { UsersController } from '../../src/modules/users/users.controller';
import { RoomsController } from '../../src/modules/rooms/rooms.controller';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RoomsModule } from '../../src/modules/rooms/rooms.module';
import { UsersModule } from '../../src/modules/users/users.module';
import mikroOrmConfig from '../mikro-orm.config';
import { createTestDataProvider, TestDataProvider } from './test-data-provider';

export interface IntegrationTestContext {
  app: INestApplication;
  module: TestingModule;
  orm: MikroORM;
  data: TestDataProvider;
}

export async function createIntegrationTestingModule(): Promise<IntegrationTestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      MikroOrmModule.forRoot(mikroOrmConfig),
      MikroOrmModule.forFeature([User, Room]),
      AuthModule,
      RoomsModule,
      UsersModule,
    ],
    controllers: [UsersController, RoomsController],
    providers: [UsersService, RoomsService],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply the same global pipes as in main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const orm = moduleFixture.get<MikroORM>(MikroORM);

  // Create data provider that handles entity creation with factories
  const data = createTestDataProvider(orm.em);

  return {
    app,
    module: moduleFixture,
    orm,
    data,
  };
}

export async function cleanupIntegrationTestingModule(
  context: IntegrationTestContext,
): Promise<void> {
  await context.app.close();
  await context.orm.close();
}

export async function cleanupDatabase(
  context: IntegrationTestContext,
): Promise<void> {
  const em = context.orm.em.fork();

  // Clean all tables completely - no seeded data to preserve
  await em.nativeDelete(Room, {});
  await em.nativeDelete(User, {});

  console.log('✅ Database tables cleaned');
}
