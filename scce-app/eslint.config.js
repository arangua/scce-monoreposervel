import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/]",
          message: "No usar colores hardcodeados. Usa THEME.",
        },
      ],
    },
  },
  {
    files: ["src/theme.ts", "src/domain/theme.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
])
