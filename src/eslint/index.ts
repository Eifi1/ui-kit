// `@eifi1/ui-kit/eslint` — the kit's role-utility rule for an app's own markup (round 0.35
// R5, Kurvenschmiede's Q6).
//
// The kit holds its markup to "write `text-muted`, not `text-[var(--text-muted)]`" with
// `npm run check:tokens`, at zero since 0.34. The apps are asked to follow the same rule
// (README "How to write a colour"), but nothing in their builds objected when a
// `[var(--role)]` class came back. This is that check as an ESLint plugin, so an app's
// `eslint.config.js` turns it on with one line:
//
//   import uiKit from "@eifi1/ui-kit/eslint";
//   export default [..., uiKit.configs.recommended];
//
// It reads every string literal and template-literal quasi — a JSX `className`, a `cn()` or
// `clsx()` argument, a class constant — and reports a `[var(--x)]` class where the property
// has a role utility for that token, naming it. One utility is an autofix that keeps the
// variants and the opacity: `hover:text-[var(--text-muted)]/70` → `hover:text-muted/70`.
//
// Plain Node, like the rest of an ESLint config: no React, no stylesheet, and no import of
// `eslint` itself, which is the app's (packaging-contract.test.ts refuses an undeclared
// package in src/), so the few types it needs are written out below.
import { findRoleClasses } from "./role-utilities";
import { ROLE_UTILITIES } from "./role-utilities.generated";

interface Position {
  line: number;
  column: number;
}

/** The part of an ESTree string node the rule reads. */
interface StringNode {
  type: string;
  value?: unknown;
  range?: [number, number];
  loc?: { start: Position; end: Position } | null;
}

interface Fix {
  range: [number, number];
  text: string;
}

/**
 * The part of ESLint's rule context the rule uses — `sourceCode.text` and `report`, which
 * every ESLint since flat config has — so that ESLint's own RuleContext, and @eslint/core's
 * that `defineConfig` checks a plugin against, are assignable to it. The source is only an
 * `object` here because a language's source may be binary, with no `text` at all.
 */
interface RoleUtilitiesContext {
  sourceCode: object;
  report(descriptor: {
    loc: { start: Position; end: Position };
    messageId: string;
    data: Record<string, string>;
    fix: ((fixer: { replaceTextRange(range: [number, number], text: string): Fix }) => Fix) | null;
  }): void;
}

interface RoleUtilitiesRule {
  meta: {
    type: "suggestion";
    docs: { description: string; url: string };
    fixable: "code";
    schema: [];
    messages: { useRoleUtility: string };
  };
  create(context: RoleUtilitiesContext): {
    Literal(node: StringNode): void;
    TemplateElement(node: StringNode): void;
  };
}

const roleUtilities: RoleUtilitiesRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Write a colour role's utility (text-muted) rather than its [var(--…)] class",
      url: "https://github.com/Eifi1/ui-kit#lint-the-role-utilities-in-an-app",
    },
    fixable: "code",
    schema: [],
    messages: {
      useRoleUtility:
        "Write the role utility `{{utilities}}`, not `{{found}}`: variants and an opacity work on it the same (tokens.css, @theme inline).",
    },
  },
  create(context) {
    const source = context.sourceCode as { text?: unknown };
    const text = typeof source.text === "string" ? source.text : "";
    const check = (node: StringNode) => {
      if (!node.range || !node.loc) return;
      const [start] = node.range;
      const { line, column } = node.loc.start;
      // An offset in the node's source text — quotes included, so it is an offset in the
      // file — as a position. A template literal may span lines.
      const at = (offset: number): Position => {
        const lines = text.slice(start, start + offset).split("\n");
        const last = lines.length - 1;
        return { line: line + last, column: last ? lines[last].length : column + offset };
      };
      for (const hit of findRoleClasses(text.slice(start, node.range[1]), ROLE_UTILITIES)) {
        const end = hit.index + hit.found.length;
        const range: [number, number] = [start + hit.index, start + end];
        const [only] = hit.utilities;
        context.report({
          loc: { start: at(hit.index), end: at(end) },
          messageId: "useRoleUtility",
          data: { found: hit.found, utilities: hit.utilities.join("` or `") },
          // Several names for one token are a choice, not a fix.
          fix: hit.utilities.length === 1 ? (fixer) => fixer.replaceTextRange(range, only) : null,
        });
      }
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node);
      },
      TemplateElement: check,
    };
  },
};

// The kit's version, baked in by tsup's `define` (tsup.config.ts). ESLint's cache keys a
// file's result on each plugin's name@version, so without it an app's `eslint --cache`
// would keep a file's old verdict after a kit release that gave a role a utility. Unset
// when the source runs (the tests), where nothing is cached.
declare const __UI_KIT_VERSION__: string | undefined;
const VERSION = typeof __UI_KIT_VERSION__ === "string" ? __UI_KIT_VERSION__ : "0.0.0-source";

/** Spelled out, self-reference included, so a typed config (`defineConfig`, `tseslint.config`) takes it. */
interface UiKitEslintPlugin {
  meta: { name: string; version: string; namespace: string };
  rules: { "role-utilities": RoleUtilitiesRule };
  configs: {
    /** The rule as an error, on every file the app's other config objects lint but its tests. */
    recommended: {
      name: string;
      ignores: string[];
      plugins: { "@eifi1/ui-kit": UiKitEslintPlugin };
      rules: { "@eifi1/ui-kit/role-utilities": "error" };
    };
  };
}

const recommended: UiKitEslintPlugin["configs"]["recommended"] = {
  name: "@eifi1/ui-kit/recommended",
  // Not the tests, as check:tokens skips the kit's: a test names the old class to assert it
  // is gone (keksdose's cleared-status-toggle.test.tsx does, three times).
  ignores: ["**/__tests__/**", "**/*.test.*", "**/*.spec.*"],
  plugins: {} as UiKitEslintPlugin["configs"]["recommended"]["plugins"],
  rules: { "@eifi1/ui-kit/role-utilities": "error" },
};

/** The flat-config plugin: add `configs.recommended`, or register it under `@eifi1/ui-kit`. */
const plugin: UiKitEslintPlugin = {
  meta: { name: "@eifi1/ui-kit", version: VERSION, namespace: "@eifi1/ui-kit" },
  rules: { "role-utilities": roleUtilities },
  configs: { recommended },
};
recommended.plugins["@eifi1/ui-kit"] = plugin;

export default plugin;
