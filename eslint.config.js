import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import cmmPlugin from './packages/eslint-plugin/dist/index.js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-native': reactNative,
      cmm: cmmPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Native rules
      'react-native/no-unused-styles': 'warn',
      'react-native/no-inline-styles': 'error',
      'react-native/no-color-literals': 'error',

      // CMM design token rules
      'cmm/no-style-literals': [
        'error',
        {
          enforceSpacing: true,
          enforceTypography: true,
          enforceBorderRadius: true,
          allowedLiterals: [0, 1],
        },
      ],

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // CommonJS config files (metro, babel, etc.) - allow require()
    files: ['**/*.config.js', '**/babel.config.js', '**/metro.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Disable cmm rules for the eslint-plugin package (can't import itself)
    files: ['packages/eslint-plugin/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'cmm/no-style-literals': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      '.pnpm-store/',
      'dist/',
      'build/',
      '.turbo/',
      '*.tsbuildinfo',
      '*.jsbundle',
      '*.jsbundle.map',
      'apps/macos/macos/',
      'apps/macos/vendor/',
      'apps/macos/Pods/',
      'apps/mobile/ios/',
      'apps/mobile/android/',
      'apps/windows/windows/',
      '.expo/',
      'coverage/',
    ],
  },
  prettier
);
