# Clean Factory Architecture

## Problem Solved

Previously, factories were polluted with parallel testing logic:

```typescript
// ❌ BAD: Factories knew about parallel testing
export class UserFactory {
  async create(data: any) {
    if (process.env.TEST_PARALLEL === 'true') {
      // Parallel logic mixed with factory logic
      const { ParallelUserFactory } = await import(
        '../parallel/factories/user.factory'
      );
      return new ParallelUserFactory(this.em).create(data);
    }
    // Regular logic
    return this.createUser(data);
  }
}
```

## Solution: Factory Provider Pattern

### 1. **Simple, Clean Factories**

Factories are now focused solely on their core responsibility:

```typescript
// ✅ CLEAN: Factory only knows about creating entities
export class UserFactory {
  async create(data: Partial<User> = {}): Promise<User> {
    const user = this.em.create(User, {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      ...data,
    });
    await this.em.persistAndFlush(user);
    return user;
  }
}
```

### 2. **Centralized Complexity**

All parallel testing logic is isolated in one place:

```typescript
// test/utils/factory-provider.ts
export function createTestFactories(em: EntityManager): TestFactories {
  if (process.env.TEST_PARALLEL === 'true') {
    return new ParallelFactories(em); // Handles worker isolation
  }
  return new SequentialFactories(em); // Uses simple factories
}
```

### 3. **Clean Test Interface**

Tests are simple and don't know about parallel complexity:

```typescript
// ✅ CLEAN: Tests just call factories
describe('User Tests', () => {
  it('should work', async () => {
    const user = await context.factories.createUser();
    const post = await context.factories.createPost({ user });
    // Test logic...
  });
});
```

## Architecture Benefits

### ✅ **Separation of Concerns**

- **Factories**: Focus on entity creation
- **Provider**: Handles test mode complexity
- **Tests**: Focus on business logic

### ✅ **No Environment Pollution**

- Main factories never check `process.env.TEST_PARALLEL`
- Environment logic centralized in one place
- Clean conditional imports

### ✅ **Backward Compatibility**

- Existing tests work with minimal changes
- Gradual migration path
- No breaking changes

### ✅ **Easy Testing**

```bash
# Sequential tests: Uses simple factories
make test

# Parallel tests: Uses worker-aware factories
make test-parallel
```

## File Structure

```
test/
├── factories/              # ✅ Simple, clean factories
│   ├── user.factory.ts     # No parallel logic
│   ├── post.factory.ts     # No parallel logic
│   └── comment.factory.ts  # No parallel logic
├── parallel/               # 🔒 All parallel complexity isolated
│   ├── factories/
│   ├── parallel-config.ts
│   └── parallel-setup.ts
└── utils/
    └── factory-provider.ts # 🎯 ONLY place that knows about modes
```

## Migration Path

### Old Way (Polluted):

```typescript
const user = await context.userFactory.create();
const post = await context.postFactory.create({ user });
```

### New Way (Clean):

```typescript
const user = await context.factories.createUser();
const post = await context.factories.createPost({ user });
```

## Result

- **Main factories**: Simple and focused ✅
- **Tests**: Clean and readable ✅
- **Parallel logic**: Isolated and contained ✅
- **No overcomplication**: Complexity only where needed ✅
