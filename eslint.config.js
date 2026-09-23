import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importX from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";

/**
 * The package had no linter at all — and seven inert `eslint-disable` comments in `src`,
 * fossils of the origin repository's config, suppressing rules nothing was running.
 *
 * Two rule families are the reason this exists rather than taste:
 *   - `react-hooks/*`, because the audit found stale-closure and effect-cleanup defects
 *     that `tsc` cannot see.
 *   - `jsx-a11y/*`, because the kit ships ~20 interactive components to three apps, and
 *     an accessibility regression here multiplies by three.
 *
 * WARN vs ERROR is a ratchet, not an opinion. A rule is `error` when `src/` is already
 * clean under it, so it can never regress. A rule with a real backlog is `warn` with the
 * count recorded, so CI stays green while the backlog is worked down — and every `warn`
 * that reaches zero should be promoted to `error` in the same commit that empties it.
 */
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "showcase/dist/**", "coverage/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "import-x": importX,
    },
    // no-cycle has to resolve `./foo` the way tsc does (extensionless, tsconfig paths)
    // or it reports nothing and looks like a passing rule.
    settings: { "import-x/resolver-next": [createTypeScriptImportResolver()] },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      // A cycle in a package built one-file-per-module is a load-order bug waiting for a
      // consumer's bundler to expose it. The graph is clean today, so this is preventive.
      "import-x/no-cycle": "error",
      "import-x/no-self-import": "error",

      // `any` silently disables the checking the rest of the file pays for.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // The kit deliberately uses `{}` and non-null assertions in a few measured places;
      // `tsc --noEmit` with `strict` already covers what matters here.
      "@typescript-eslint/no-non-null-assertion": "off",
      // date-picker.tsx has a comment explaining a deliberate `\u00a0`, and the only way
      // to explain a non-breaking space is to write one.
      "no-irregular-whitespace": ["error", { skipComments: true }],
      "@typescript-eslint/no-empty-object-type": "off",

      // Promoted out of the ratchet below, in the commit that emptied it: the two
      // `role="combobox"` fields that never named the list they opened now carry
      // `aria-controls`, and the count reached zero. A combobox that does not point
      // at its popup is a combobox a reader cannot get out of, which is worth a
      // failing build rather than a warning nobody reads.
      "jsx-a11y/role-has-required-aria-props": "error", // 0 in src/

      // Promoted the same way, in the change that emptied it: the last instance was
      // `Tabs`' tablist — a <div> wearing an interactive role and the strip's
      // arrow-key handler with no way to focus it. The handler now sits on the tabs
      // themselves, which are focusable by being buttons and links, so the rule is
      // satisfied by the component being right rather than by a tabIndex on a div.
      "jsx-a11y/interactive-supports-focus": "error", // 0 in src/

      // ── Ratchet ──────────────────────────────────────────────────────────────────
      // Backlog recorded in docs/module-audit-2026-09-22.md. Each of these is `warn`
      // ONLY because src/ is not clean under it yet; the count is the work item. When a
      // count reaches zero, promote the rule to "error" in the same commit that empties
      // it, or it silently refills.

      // Accessibility — the audit's §a11y. `role="combobox"` without its required
      // attributes and `aria-invalid` on `role="button"` (which does not support it) are
      // the same underlying defect: field triggers wearing a role that does not describe
      // them. Fixing them properly means giving those triggers real combobox semantics,
      // not deleting the attribute — which is what the six pickers got, taking this from
      // 5 to 2 and emptying `role-has-required-aria-props` (promoted above).
      //
      // The two left are a different shape and belong to a different wave: a currency
      // trigger and a date trigger, neither of which is a combobox.
      "jsx-a11y/role-supports-aria-props": "error", // 0 in src/
      "jsx-a11y/no-autofocus": "warn", // 4 — incl. data-table-filter-popover.tsx:58
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",

      // React Compiler readiness, NOT correctness. eslint-plugin-react-hooks v7 ships the
      // compiler's rules, and they flag patterns this package uses deliberately and
      // documents — the latest-ref pattern in use-dismiss / use-close-transition /
      // use-row-swipe is the biggest group. Those are not bugs today; they are what the
      // kit would have to change to adopt the Compiler. Kept visible, not enforced.
      // The CLASSIC rules (`rules-of-hooks`, `exhaustive-deps`) stay errors above — they
      // are the ones that catch stale closures, and src/ is already clean under them.
      "react-hooks/refs": "warn", // 30 in src/
      "react-hooks/preserve-manual-memoization": "warn", // 11 in src/
      "react-hooks/set-state-in-effect": "warn", // 10 in src/
      "react-hooks/immutability": "warn", // 1 in src/
    },
  },

  {
    files: ["**/__tests__/**", "**/*.test.{ts,tsx}", "src/test/**"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      // Tests reach into internals and stub globals; that is their job.
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },

  {
    files: ["scripts/**", "*.config.{ts,js,mjs}", "showcase/*.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
);
