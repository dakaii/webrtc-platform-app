import request from 'supertest';
import {
  IntegrationTestContext,
  createIntegrationTestingModule,
  cleanupIntegrationTestingModule,
  cleanupDatabase,
} from '../utils/integration-test-module';

describe('AuthController (e2e)', () => {
  let context: IntegrationTestContext;

  beforeEach(async () => {
    context = await createIntegrationTestingModule();
    await cleanupDatabase(context);
  });

  afterEach(async () => {
    await cleanupDatabase(context);
  });

  afterAll(async () => {
    await cleanupIntegrationTestingModule(context);
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(context.app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe('testuser');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 409 for duplicate email', async () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      await request(context.app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const duplicateDto = {
        username: 'anotheruser',
        email: 'test@example.com',
        password: 'password123',
      };
      await request(context.app.getHttpServer())
        .post('/users')
        .send(duplicateDto)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login a user and return an access token', async () => {
      const password = 'password123';
      const user = await context.data.userFactory.createOne({ password });

      const response = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({ username: user.username, password })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return the user profile with a valid token', async () => {
      const password = 'password123';
      const user = await context.data.userFactory.createOne({ password });

      const loginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({ username: user.username, password });
      const accessToken = loginResponse.body.access_token;

      const profileResponse = await request(context.app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('id', user.id);
    });
  });
});
