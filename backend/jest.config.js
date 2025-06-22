module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  // Parallel testing configuration
  maxWorkers: process.env.TEST_PARALLEL === 'true' ? '50%' : 1,
  // Test timeout increased for database operations
  testTimeout: 30000,
  // Transform configuration
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  // Environment variables for all tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  // Silent mode for cleaner output in parallel mode
  silent: process.env.TEST_PARALLEL === 'true',
  // Verbose output for debugging when needed
  verbose: process.env.DEBUG_TESTS === 'true',
  // Force exit to prevent hanging tests
  forceExit: true,
  // Clear mocks between tests
  clearMocks: true,
  // Reset modules between tests for better isolation
  resetModules: true,
};
