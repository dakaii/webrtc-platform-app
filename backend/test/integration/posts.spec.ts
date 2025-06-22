import * as request from 'supertest';
import {
  IntegrationTestContext,
  createIntegrationTestingModule,
  cleanupIntegrationTestingModule,
  cleanupDatabase,
} from '../utils/integration-test-module';
import { User } from '../../src/entities/user.entity';
import { Post } from '../../src/entities/post.entity';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('PostsController (e2e)', () => {
  let context: IntegrationTestContext;
  let accessToken: string;
  let user: User;
  let post: Post;
  const password = 'testpassword123';
  let authService: AuthService;

  beforeEach(async () => {
    context = await createIntegrationTestingModule();
    user = await context.data.userFactory.createOne({ password });
    post = await context.data.postFactory.createOne({ user });
    authService = context.module.get(AuthService);
    accessToken = (await authService.login(user)).access_token;
  });

  afterEach(async () => {
    await cleanupDatabase(context);
  });

  afterAll(async () => {
    await cleanupIntegrationTestingModule(context);
  });

  describe('POST /posts', () => {
    it('should create a new post', async () => {
      const createPostDto = {
        title: 'Test Post',
        content: 'This is a test post content',
        userId: user.id,
      };

      const response = await request(context.app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createPostDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Post');
    });
  });

  describe('GET /posts', () => {
    it('should return all posts', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /posts/:id', () => {
    it('should return a post by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/posts/${post.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', post.id);
    });
  });

  describe('PATCH /posts/:id', () => {
    it('should update a post', async () => {
      const updatePostDto = { title: 'Updated Post' };
      const response = await request(context.app.getHttpServer())
        .patch(`/posts/${post.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatePostDto)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Updated Post');
    });
  });

  describe('DELETE /posts/:id', () => {
    it('should delete a post', async () => {
      await request(context.app.getHttpServer())
        .delete(`/posts/${post.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(context.app.getHttpServer())
        .get(`/posts/${post.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /posts/user/:userId', () => {
    it('should return posts by user', async () => {
      await context.data.postFactory.create(2, { user });

      const response = await request(context.app.getHttpServer())
        .get(`/posts/user/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].user.id).toBe(user.id);
    });
  });
});
