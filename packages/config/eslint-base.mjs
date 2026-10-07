import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'bin/**', 'obj/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
