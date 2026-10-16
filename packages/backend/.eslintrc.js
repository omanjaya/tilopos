module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',

    // --- Docs/ENGINEERING-RULES.md ---
    // R11: no silently swallowed errors
    'no-empty': ['error', { allowEmptyCatch: false }],
    // R15: identifiers/codes must come from crypto (shared/utils/secure-code.ts)
    'no-restricted-properties': [
      'error',
      { object: 'Math', property: 'random', message: 'R15: use secureCode()/secureInt() from @shared/utils/secure-code.' },
    ],
    'no-restricted-syntax': [
      'error',
      {
        // R6: ValidationPipe cannot validate inline object types
        selector:
          'Identifier:has(Decorator > CallExpression > Identifier[name=/^(Body|Query)$/]) > TSTypeAnnotation > TSTypeLiteral',
        message: 'R6: @Body()/@Query() must be a class-validator DTO class, not an inline type.',
      },
      {
        selector:
          "Identifier:has(Decorator > CallExpression > Identifier[name=/^(Body|Query)$/]) > TSTypeAnnotation > TSTypeReference[typeName.name='Record']",
        message: 'R6: @Body()/@Query() must be a class-validator DTO class, not Record<...>.',
      },
      {
        // R12: full employee rows include the PIN hash and MFA secret
        selector:
          "Property[key.name=/^(include|select)$/] > ObjectExpression > Property[key.name=/^(employee|employees)$/][value.value=true]",
        message: 'R12: select employee fields via EMPLOYEE_PUBLIC_SELECT (@shared/constants/selects).',
      },
      {
        // R7: never persist a raw request body (mass assignment)
        selector:
          "CallExpression[callee.property.name=/^(create|update|updateMany|upsert)$/] > ObjectExpression > Property[key.name='data'][value.type='Identifier'][value.name=/^(dto|body|input|payload|updates)$/]",
        message: 'R7: build Prisma `data` from explicit fields, never pass the request body/DTO directly.',
      },
      {
        selector:
          "CallExpression[callee.property.name=/^(create|update|updateMany|upsert)$/] > ObjectExpression > Property[key.name='data'] > ObjectExpression > SpreadElement[argument.name=/^(dto|body|input|payload|updates)$/]",
        message: 'R7: build Prisma `data` from explicit fields, never spread the request body/DTO.',
      },
    ],
  },
  overrides: [
    {
      // R18: controllers delegate to services/use-cases (warn until legacy debt is paid)
      files: ['src/**/*.controller.ts'],
      rules: {
        'no-restricted-imports': [
          'warn',
          {
            patterns: [
              {
                group: ['**/database/prisma.service', '@infrastructure/database/prisma.service'],
                message: 'R18: controllers must not use PrismaService; move queries into a service/use-case.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['**/*.spec.ts', 'test/**/*.ts', 'src/infrastructure/database/seeders/**/*.ts'],
      rules: {
        'no-restricted-properties': 'off',
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
