const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration for React Native macOS
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Resolve workspace packages
    extraNodeModules: {
      '@cmm/core': path.resolve(monorepoRoot, 'packages/core'),
      '@cmm/db': path.resolve(monorepoRoot, 'packages/db'),
      '@cmm/state': path.resolve(monorepoRoot, 'packages/state'),
      '@cmm/ui': path.resolve(monorepoRoot, 'packages/ui'),
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
