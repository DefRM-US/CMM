const baseConfig = require('../../jest.config.base');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'macos-app',
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@fluentui/react-native|@tanstack/react-table)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/../../packages/core/src/$1',
    '^@ui/(.*)$': '<rootDir>/../../packages/ui/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/macos/', '/ios/', '/android/'],
};
