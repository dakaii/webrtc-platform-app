# Parallel Testing Module

This directory contains all parallel testing infrastructure and configurations.

## Overview

- **Main tests** run sequentially and work perfectly (64/64 passing)
- **Parallel tests** are an optional enhancement with separate configurations
- **All parallel-specific code** is isolated in this directory

## Files

- `parallel-config.ts` - Parallel testing configuration
- `parallel-setup.ts` - Parallel database setup logic
- `parallel-factories/` - Modified factories for parallel testing
- `jest.parallel.config.js` - Jest configuration for parallel mode

## Usage

```bash
# Sequential tests (main/default)
make test

# Parallel tests (experimental)
make test-parallel
```

## Status

- ✅ **Sequential**: 64/64 tests passing
- 🔶 **Parallel**: 44/64 tests passing (foreign key issues)

## Issues

Parallel tests have foreign key constraint violations because:

- Each worker gets its own isolated database
- Factories create entities with hardcoded IDs
- IDs don't exist across different worker databases

## Next Steps

1. Fix factory data isolation
2. Ensure proper entity relationship creation per worker
3. Improve parallel test reliability
