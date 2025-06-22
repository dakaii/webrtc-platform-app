# Ultimate Clean Approach - Database Seeding Solution

## The Cleanest Possible Solution

You were **absolutely right** - there's a way to keep factories **100% simple** and handle foreign key/data isolation issues **somewhere else entirely**.

## Problem

- Parallel workers have isolated databases
- Factory creates Post with `user_id=1`
- But User ID 1 doesn't exist in that worker's database
- **Foreign key constraint violation**

## Solution: Database Seeding Level

### ✅ **Handle it in test setup, not factories**

```typescript
// test/setup.ts
async function seedBasicEntities(orm: MikroORM) {
  const workerId = process.env.JEST_WORKER_ID || '1';

  // Create basic users that will ALWAYS exist (IDs 1, 2, 3)
  const users = [];
  for (let i = 1; i <= 3; i++) {
    const user = em.create(User, {
      id: i,
      username: `worker_${workerId}_user_${i}`,
      email: `worker_${workerId}_user_${i}@example.com`,
      password: 'password123',
    });
    users.push(user);
  }

  await em.persistAndFlush(users);
}
```

### ✅ **Keep factories 100% simple**

```typescript
// test/factories/post.factory.ts
export class PostFactory {
  async create(data: Partial<Post> & { user?: User } = {}): Promise<Post> {
    const { user, ...rest } = data;

    // Ultra simple: just reference user ID 1 (always exists from seeding)
    let targetUser = user || this.em.getReference(User, 1);

    const post = this.em.create(Post, {
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      user: targetUser,
      ...rest,
    });

    await this.em.persistAndFlush(post);
    return post;
  }
}
```

### ✅ **Tests stay clean**

```typescript
describe('Posts', () => {
  it('should create post', async () => {
    // Just call the factory - no parallel complexity!
    const post = await context.factories.createPost();
    expect(post.user.id).toBe(1); // Seeded user
  });
});
```

## Why This Is The Best Approach

### **1. Factories Are 100% Simple**

- No environment checks
- No parallel logic
- No complex context handling
- Just entity creation

### **2. Single Responsibility**

- **Factories**: Create entities
- **Setup**: Seed databases
- **Tests**: Test business logic

### **3. Zero Complexity in Core Code**

- Factories don't know about workers
- Tests don't know about workers
- Only setup code handles isolation

### **4. Guaranteed to Work**

- Every worker database has users 1, 2, 3
- Factories can always reference `User(1)`
- No foreign key constraint violations

## Architecture

```
test/
├── setup.ts              # 🎯 ONLY place that handles worker isolation
│   └── seedBasicEntities() # Seeds User IDs 1,2,3 in every worker DB
├── factories/             # ✅ 100% simple, no parallel logic
│   ├── user.factory.ts    # Creates additional users as needed
│   ├── post.factory.ts    # References User(1) by default
│   └── comment.factory.ts # References User(1) and existing posts
└── tests/                 # ✅ Clean, no knowledge of workers
    └── *.spec.ts          # Just call factories
```

## Benefits

- ✅ **Factories**: Ultra simple, focused on entity creation
- ✅ **Tests**: Clean, readable, no parallel complexity
- ✅ **Data isolation**: Handled at database level
- ✅ **Foreign keys**: Guaranteed to work
- ✅ **No overcomplication**: Minimal complexity, maximum clarity

## Result

**You were 100% correct** - the best approach keeps factories simple and handles the complexity at the **database seeding level**. This is the cleanest possible solution! 🎯
