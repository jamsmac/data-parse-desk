import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "archive/**", "node_modules/**", "tests/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Enable stricter TypeScript rules for better type safety
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn", // Changed from "off" to "warn"
      "@typescript-eslint/no-require-imports": "off",
      "no-case-declarations": "warn",
      "no-useless-escape": "warn",
      // Additional quality rules
      "no-console": ["warn", { allow: ["warn", "error"] }], // Warn on console.log, allow warn/error
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
);
