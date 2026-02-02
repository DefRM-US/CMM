const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    extraNodeModules: {
      // Force all packages to use the same React instance
      react: path.resolve(projectRoot, 'node_modules/react'),
      'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
      // Workspace packages
      '@repo/ui': path.resolve(monorepoRoot, 'packages/ui'),
      '@repo/core': path.resolve(monorepoRoot, 'packages/core'),
      '@repo/types': path.resolve(monorepoRoot, 'packages/types'),
      // Polyfills
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
