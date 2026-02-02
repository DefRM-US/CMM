const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { resolve } = require('metro-resolver');
const path = require('node:path');

let exclusionList;
try {
  ({ exclusionList } = require('metro-config'));
} catch {
  exclusionList = undefined;
}
if (typeof exclusionList !== 'function') {
  try {
    exclusionList = require('metro-config/src/defaults/exclusionList');
  } catch {
    exclusionList = undefined;
  }
}
if (typeof exclusionList !== 'function') {
  exclusionList = (patterns) => {
    const sources = patterns.map((pattern) => pattern.source);
    return new RegExp(sources.join('|'));
  };
}

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const appNodeModules = path.resolve(projectRoot, 'node_modules');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');
const appReactNativeMacos = path.resolve(appNodeModules, 'react-native-macos');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nodeModulesPaths = [appNodeModules, rootNodeModules];

const rootReactNativePattern = new RegExp(
  `${escapeRegExp(rootNodeModules)}[/\\\\]react-native[/\\\\].*`,
);
const rootReactNativeMacosPattern = new RegExp(
  `${escapeRegExp(rootNodeModules)}[/\\\\]react-native-macos[/\\\\].*`,
);

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths,
    extraNodeModules: {
      // Force all packages to use the same React instance
      react: path.resolve(rootNodeModules, 'react'),
      'react-native': appReactNativeMacos,
      'react-native-macos': appReactNativeMacos,
      // Workspace packages
      '@repo/ui': path.resolve(monorepoRoot, 'packages/ui'),
      '@repo/core': path.resolve(monorepoRoot, 'packages/core'),
      '@repo/types': path.resolve(monorepoRoot, 'packages/types'),
      // Polyfills
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
    },
    blockList: exclusionList([rootReactNativePattern, rootReactNativeMacosPattern]),
    unstable_enableSymlinks: true,
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native' || moduleName.startsWith('react-native/')) {
        const targetPath =
          moduleName === 'react-native'
            ? appReactNativeMacos
            : path.join(appReactNativeMacos, moduleName.replace(/^react-native\//, ''));
        return resolve(context, targetPath, platform);
      }

      return resolve(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
