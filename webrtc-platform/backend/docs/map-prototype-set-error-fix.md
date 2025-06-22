# Map.prototype.set Error Fix

## Problem Description

When running tests with MikroORM + Jest, you may encounter this error:

```
TypeError: Method Map.prototype.set called on incompatible receiver #<Map>
    at Map.set (<anonymous>)
```

## Root Cause

This is a **Jest-specific compatibility issue**, not a MikroORM bug. According to [MikroORM maintainer B4nan](https://github.com/mikro-orm/mikro-orm/discussions/4519):

> "This seems to be jest specific issue, not really something to fix in the ORM... jest likes to do some weird things under the hood, like patching primitives like Map... this is probably connected to the global setup scripts in jest"

## The Issue

- **Jest patches JavaScript primitives** like `Map` during test execution
- **`globalSetup` and `globalTeardown`** in Jest configuration trigger this incompatibility
- **MikroORM metadata discovery** fails when Jest has already patched the Map prototype

## Solution ✅

### Before (Broken):

```javascript
// jest.config.js
module.exports = {
  globalSetup: '<rootDir>/test/global-setup.ts', // ❌ CAUSES ERROR
  globalTeardown: '<rootDir>/test/global-teardown.ts', // ❌ CAUSES ERROR
  // ... other config
};
```

### After (Fixed):

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'], // ✅ WORKS
  // ... other config
  // globalSetup and globalTeardown removed
};
```

```typescript
// test/setup.ts
import { MikroORM } from '@mikro-orm/core';

// Database setup function
async function setupDatabase() {
  // Your database setup logic here
}

// Use Jest's standard lifecycle hooks
beforeAll(async () => {
  await setupDatabase();
});
```

## Results

- **Before**: 0/64 tests passing (Map.prototype.set error blocked everything)
- **After**: 64/64 tests passing ✅

## Alternative Solutions

If you need external setup scripts, the [original poster's solution](https://github.com/mikro-orm/mikro-orm/discussions/4519) was:

1. Remove `globalSetup` from Jest config
2. Use `ts-node` to run setup externally: `pnpm ts-node tests/database.setup.ts`
3. Run setup before tests in CI/CD workflow

## References

- [GitHub Discussion #4519](https://github.com/mikro-orm/mikro-orm/discussions/4519)
- [Related Jest Issue #10199](https://github.com/jestjs/jest/issues/10199) (closed by bot)
- [Previous Discussion #3795](https://github.com/mikro-orm/mikro-orm/discussions/3795)

## Key Takeaway

**Use Jest's standard lifecycle hooks (`beforeAll`, `afterAll`) instead of `globalSetup`/`globalTeardown` when working with MikroORM.**
