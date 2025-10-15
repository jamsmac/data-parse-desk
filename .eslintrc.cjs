module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'node_modules',
    'coverage',
    'temp_analysis/**/*',
    'temp_analysis',
    '*.config.js',
    '*.config.ts',
    'vite.config.ts',
    'tailwind.config.ts'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Временно отключаем строгие правила для any
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    
    // Разрешаем require для конфигов
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    
    // Разрешаем пустые интерфейсы и типы
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    
    // Разрешаем Function тип
    '@typescript-eslint/no-unsafe-function-type': 'off',
    '@typescript-eslint/ban-types': 'off',
    
    // Отключаем правило для неиспользуемых переменных в параметрах
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    
    // Другие правила
    'no-case-declarations': 'off',
    'no-useless-escape': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      // Для тестовых файлов более мягкие правила
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      }
    },
    {
      // Для конфигурационных файлов
      files: ['*.config.ts', '*.config.js', 'vite.config.ts', 'tailwind.config.ts'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      }
    }
  ]
};
