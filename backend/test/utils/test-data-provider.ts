/**
 * Test Data Provider - Provides Factories to Tests
 *
 * Simple provider that gives access to factories for creating test data.
 * Each test creates exactly what it needs using factories.
 */

import { EntityManager } from '@mikro-orm/core';
import { UserFactory } from '../factories/user.factory';

export class TestDataProvider {
  readonly userFactory: UserFactory;

  constructor(private em: EntityManager) {
    this.userFactory = new UserFactory(em);
  }
}

/**
 * Create test data provider for current context
 */
export function createTestDataProvider(em: EntityManager): TestDataProvider {
  return new TestDataProvider(em);
}
