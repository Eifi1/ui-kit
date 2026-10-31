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
 * No warnings. Every rule is `error` and `npm run lint` runs with `--max-warnings 0`.
 * If a new rule arrives with a backlog, record the count here as a `warn` and clear it
 * before the next release. Don't let warnings accumulate.
 */
/** `min-[2400px]:`, `max-[767.5px]:` — an arbitrary px media variant in a class string. */
const ARBITRARY_PX_MEDIA = String.raw`/(^|[\s:])(min|max)-\[[0-9.]+px\]:/`;
const ARBITRARY_PX_MEDIA_MESSAGE =
  "An arbitrary px media variant does not follow the text size (§10.4). Use a named breakpoint (sm … 3xl) or useBreakpoint().";
/** `text-[11px]`, `sm:text-[10px]`, `text-[length:13px]` — a px font size in a class string. */
const PX_FONT_SIZE = String.raw`/(^|[\s:!])text-\[(length:)?[0-9.]+px\]/`;
const PX_FONT_SIZE_MESSAGE =
  "A px font size does not follow the text size (§3.2). Use text-micro (0.625rem), text-caption (0.6875rem) or Tailwind's text-xs … sizes; a size between them in rem.";
/** `new Promise((r) => setTimeout(r, 20))` — a promise that is only a timer with a delay. */
const SLEEP =
  "NewExpression[callee.name='Promise'] > :function > CallExpression.body[callee.name='setTimeout'][arguments.1]:not([arguments.1.value=0])";
/** The same with a block body: `new Promise((r) => { setTimeout(r, 20); })`. */
const SLEEP_STATEMENT =
  "NewExpression[callee.name='Promise'] > :function > BlockStatement > ExpressionStatement > CallExpression.expression[callee.name='setTimeout'][arguments.1]:not([arguments.1.value=0])";
const SLEEP_MESSAGE =
  "A fixed sleep passes under load whether or not the bug is there (TST-3). Wait for the decision point (waitFor, the promise, a spy), use fake timers, or src/test/tasks.ts (drainTasks, settleMacrotask, flushMicrotasks). Where real time is the point, disable this line with the reason.";

export default tseslint.config(
  // ESLint's flat config reads no ignore file, so this repeats .gitignore's build output,
  // reports and agent worktrees (`.claude/worktrees/`: one there failed the static group
  // with 778 errors) — refactor audit 2026-10-30, TST-8.
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "showcase/dist/**",
      "showcase/dist-pages/**",
      "ci-artifacts/**",
      "coverage/**",
      ".claude/**",
    ],
  },

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
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // The kit deliberately uses `{}` and non-null assertions in a few measured places;
      // `tsc --noEmit` with `strict` already covers what matters here.
      "@typescript-eslint/no-non-null-assertion": "off",
      // date-field.tsx has a comment explaining a deliberate `\u00a0`, and the only way
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

      // ── Emptied ratchet ──────────────────────────────────────────────────────────
      // These were `warn` with a backlog (docs/module-audit-2026-09-22.md). The last 85
      // warnings were cleared on chore/quiet-output, so every one is an error now, and
      // `npm run lint` passes `--max-warnings 0`: a rule a preset adds as `warn` later
      // fails the build too, instead of starting a new backlog nobody reads.
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/no-autofocus": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "error",

      // React Compiler readiness. eslint-plugin-react-hooks v7 ships the compiler's
      // rules and src/ is clean under them. The classic rules-of-hooks / exhaustive-deps
      // are errors as well.
      "react-hooks/refs": "error",
      "react-hooks/preserve-manual-memoization": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/immutability": "error",

      // 0.32 (docs/text-size-harmonization.md §10.4): an arbitrary px media variant
      // (`min-[2400px]:`, `max-[600px]:`) is the one breakpoint tokens.css cannot scale
      // with the text size, so a layout keyed to it keeps its desktop shape at 150 %.
      // Use a named breakpoint — `3xl:` is keksdose's 2400px — or `useBreakpoint`.
      //
      // And a px font size (§3.2): `text-[11px]` stays 11 px at 150 %, beside text that
      // grew. The kit's 10 and 11 px are `text-micro` / `text-caption` in rem; 0 in src/
      // and the showcase since 0.32. Class strings only — a comment may still name one.
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${ARBITRARY_PX_MEDIA}]`, message: ARBITRARY_PX_MEDIA_MESSAGE },
        { selector: `TemplateElement[value.raw=${ARBITRARY_PX_MEDIA}]`, message: ARBITRARY_PX_MEDIA_MESSAGE },
        { selector: `Literal[value=${PX_FONT_SIZE}]`, message: PX_FONT_SIZE_MESSAGE },
        { selector: `TemplateElement[value.raw=${PX_FONT_SIZE}]`, message: PX_FONT_SIZE_MESSAGE },
      ],
    },
  },

  {
    files: ["**/__tests__/**", "**/*.test.{ts,tsx}", "src/test/**"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      // Tests reach into internals and stub globals; that is their job.
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "off",
      // The media rule only: a test may name a px font size to assert it is GONE
      // (`not.toContain("text-[11px]")`), which is the px rule's own regression test.
      //
      // And no fixed sleep (refactor audit 2026-10-30, TST-3; 2026-10, TST-11). A test that
      // slept 20 ms and then asserted that something did NOT happen passed under the loaded
      // check whether or not the bug was there: the deferred work had simply not run yet.
      // The pattern came back in new code after TST-11 removed it, so it is a rule now.
      // Matched: an executor that is only a timer with a delay, `new Promise((r) =>
      // setTimeout(r, 20))`, inline or as a `sleep(ms)` helper. Not matched: a wait for an
      // event with a timer as its cap, which ends on the event.
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${ARBITRARY_PX_MEDIA}]`, message: ARBITRARY_PX_MEDIA_MESSAGE },
        { selector: `TemplateElement[value.raw=${ARBITRARY_PX_MEDIA}]`, message: ARBITRARY_PX_MEDIA_MESSAGE },
        { selector: SLEEP, message: SLEEP_MESSAGE },
        { selector: SLEEP_STATEMENT, message: SLEEP_MESSAGE },
      ],
    },
  },

  {
    files: ["scripts/**", "*.config.{ts,js,mjs}", "showcase/*.ts"],
    languageOptions: { globals: { ...globals.node } },
  },

  // The CommonJS release files: `.versionrc.cjs` (this package is ESM) and the
  // dependency-free commit checks shared with kastlan and keksdose.
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
