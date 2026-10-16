import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // --- Docs/ENGINEERING-RULES.md ---
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-restricted-syntax': [
        'error',
        {
          // F6: icon-only buttons need an accessible name
          selector:
            "JSXOpeningElement[name.name='Button']:has(JSXAttribute[name.name='size'][value.value='icon']):not(:has(JSXAttribute[name.name=/^(aria-label|aria-labelledby|title)$/]))",
          message: 'F6: <Button size="icon"> needs aria-label.',
        },
        {
          // F4: never persist secrets/PIN in web storage
          selector:
            "CallExpression[callee.object.name=/^(localStorage|sessionStorage)$/][callee.property.name='setItem'][arguments.0.value=/pin|secret|password/i]",
          message: 'F4: do not store PINs/secrets in web storage.',
        },
      ],
    },
  },
);
