import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";

/*
  Size and complexity limits. New code must stay under LIMITS. The files below
  already exceed them (see docs/reports/TECH-DEBT-AUDIT-2026-11.md): each is frozen
  at today's worst function so it can only shrink. When you refactor one, LOWER its
  numbers (or delete the entry once it fits). Never raise a number or add a file.
*/
const LIMITS = { complexity: 12, lines: 120 };
const DEBT = {
  "src/components/AiChatWidget.tsx": { complexity: 12, lines: 158 },
  "src/components/ListingCard.tsx": { complexity: 14, lines: 170 },
  "src/components/ListingMap.tsx": { complexity: 12, lines: 149 },
  "src/components/shell.tsx": { complexity: 12, lines: 153 },
  "src/hooks/useListingForm.ts": { complexity: 12, lines: 128 },
  "src/pages/AiRoommates.tsx": { complexity: 12, lines: 143 },
  "src/pages/ConversationDetail.tsx": { complexity: 19, lines: 155 },
  "src/pages/Favorites.tsx": { complexity: 12, lines: 141 },
  "src/pages/MessagesList.tsx": { complexity: 12, lines: 168 },
  "src/pages/Register.tsx": { complexity: 12, lines: 154 },
  "src/pages/messages/MessageBubble.tsx": { complexity: 14, lines: 120 },
  "src/pages/messages/thread/threadLayout.ts": { complexity: 15, lines: 120 },
  "src/pages/profile/ProfileHabitsCard.tsx": { complexity: 12, lines: 170 },
  "src/pages/room/RoomContactCard.tsx": { complexity: 16, lines: 120 },
  "src/ui/illustrations.tsx": { complexity: 12, lines: 161 },
};

const sizeRules = ({ complexity, lines }) => ({
  complexity: ["error", complexity],
  "max-lines-per-function": ["error", { max: lines, skipBlankLines: true, skipComments: true }],
});

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "playwright-report", "test-results", "playwright.config.ts"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      "react-refresh/only-export-components": "off",
      /* Fatal for the banned patterns: any, ts-ignore, non-null assert. */
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      /* Numbers in template literals are intentional (prices, ids). */
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  { files: ["src/**/*.{ts,tsx}"], rules: sizeRules(LIMITS) },
  ...Object.entries(DEBT).map(([file, limits]) => ({
    files: [file],
    rules: sizeRules(limits),
  })),
  {
    /* Specs: a null from boundingBox()/getAttribute() should fail the test loudly,
       so `!` is the idiomatic assertion there. Everything else stays strict. */
    files: ["e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },
  {
    ignores: ["eslint.config.js", "vite.config.ts"],
  },
  prettier,
);
