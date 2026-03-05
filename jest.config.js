/** Jest config for unit tests (e.g. utils). Run: npm test */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: ['utils/**/*.ts', 'lib/**/*.ts'].filter(Boolean),
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: false }],
  },
  watchman: false,
};
