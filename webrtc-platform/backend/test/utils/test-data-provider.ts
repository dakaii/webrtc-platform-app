/**
 * Test Data Provider - Provides Factories to Tests
 *
 * Simple provider that gives access to factories for creating test data.
 * Each test creates exactly what it needs using factories.
 */

import { EntityManager } from '@mikro-orm/core';
import { UserFactory } from '../factories/user.factory';
import { PostFactory } from '../factories/post.factory';
import { CommentFactory } from '../factories/comment.factory';

export class TestDataProvider {
  readonly userFactory: UserFactory;
  readonly postFactory: PostFactory;
  readonly commentFactory: CommentFactory;

  constructor(private em: EntityManager) {
    this.userFactory = new UserFactory(em);
    this.postFactory = new PostFactory(em);
    this.commentFactory = new CommentFactory(em);
  }
}

/**
 * Create test data provider for current context
 */
export function createTestDataProvider(em: EntityManager): TestDataProvider {
  return new TestDataProvider(em);
}
