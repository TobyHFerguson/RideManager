module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  roots: ['<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.test.js'],
};
