import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "coverage/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "max-lines": ["warn", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", 10],
      "max-params": ["warn", 5],
      eqeqeq: "error",
      "no-console": ["error", { allow: ["error"] }],
    },
  },
  {
    // registerX(server) concentra declarações de tools; o tamanho vem dos schemas, não de lógica.
    files: ["src/mcp/tools/**/*.ts", "src/mcp/resources.ts", "src/mcp/prompts.ts"],
    rules: { "max-lines-per-function": "off" },
  },
  {
    files: ["tests/**/*.mjs", "*.js"],
    languageOptions: { globals: { process: "readonly", Response: "readonly", Request: "readonly" } },
  },
  prettier
);
