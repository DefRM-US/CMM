import noStyleLiterals from './rules/no-style-literals.js';

const plugin = {
  meta: {
    name: '@cmm/eslint-plugin',
    version: '0.0.1',
  },
  rules: {
    'no-style-literals': noStyleLiterals,
  },
};

export default plugin;
