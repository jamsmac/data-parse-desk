import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "archive/**", "node_modules/**", "tests/**"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // ============================================================
      // STRICT TYPE SAFETY RULES (Phase 2)
      // ============================================================

      // TypeScript: Explicit any types
      "@typescript-eslint/no-explicit-any": "error", // Upgraded from "warn" to "error"
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",

      // TypeScript: Type assertions and conversions
      "@typescript-eslint/consistent-type-assertions": ["error", {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow-as-parameter"
      }],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-as-const": "error",

      // TypeScript: Function types
      "@typescript-eslint/explicit-function-return-type": ["warn", {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      }],
      "@typescript-eslint/explicit-module-boundary-types": "off", // Too strict for React components

      // TypeScript: Null and undefined handling
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/strict-boolean-expressions": ["warn", {
        allowString: true,
        allowNumber: true,
        allowNullableObject: true,
      }],

      // TypeScript: Array and object types
      "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
      "@typescript-eslint/consistent-indexed-object-style": ["error", "record"],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      // TypeScript: Promises and async
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", {
        checksVoidReturn: false, // Allow Promise in React event handlers
      }],
      "@typescript-eslint/promise-function-async": "warn",
      "@typescript-eslint/await-thenable": "error",

      // TypeScript: Variable usage
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-require-imports": "off",

      // JavaScript: General quality
      "no-case-declarations": "warn",
      "no-useless-escape": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error", // Upgraded from "warn" to "error"
      "no-var": "error",
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-throw-literal": "error",

      // Code organization
      "no-duplicate-imports": "error",
      "sort-imports": ["warn", {
        ignoreCase: true,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
      }],
    },
  },
);
