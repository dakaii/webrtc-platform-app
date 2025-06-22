import * as request from 'supertest';
import {
  IntegrationTestContext,
  createIntegrationTestingModule,
  cleanupIntegrationTestingModule,
  cleanupDatabase,
} from '../utils/integration-test-module';
import { User } from '../../src/entities/user.entity';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('UsersController (e2e)', () => {
  let context: IntegrationTestContext;
  let accessToken: string;
  let user: User;
  const password = 'testpassword123';
  let authService: AuthService;

  beforeEach(async () => {
    context = await createIntegrationTestingModule();
    await cleanupDatabase(context);
    user = await context.data.userFactory.createOne({ password });
    authService = context.module.get(AuthService);
    accessToken = (await authService.login(user)).access_token;
  });

  afterEach(async () => {
    await cleanupDatabase(context);
  });

  afterAll(async () => {
    await cleanupIntegrationTestingModule(context);
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      await context.data.userFactory.create(2);
      const response = await request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(response.body).toHaveLength(3);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(response.body.id).toBe(user.id);
    });

    it('should return 404 for non-existent user', async () => {
      await request(context.app.getHttpServer())
        .get('/users/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update a user', async () => {
      const updateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
      };
      const response = await request(context.app.getHttpServer())
        .patch(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateUserDto)
        .expect(200);
      expect(response.body.username).toBe('updateduser');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      await request(context.app.getHttpServer())
        .delete(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(context.app.getHttpServer())
        .get(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
