// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Linter, RuleTester, type Rule } from "eslint";
import tseslint from "typescript-eslint";
import plugin from "../index";
import { findRoleClasses, roleUtilitiesFromCss, type RoleUtilityTable } from "../role-utilities";
import { ROLE_UTILITIES } from "../role-utilities.generated";

/**
 * `@eifi1/ui-kit/eslint` (round 0.35 R5, Kurvenschmiede's Q6): an app's `[var(--role)]`
 * classes where tokens.css has the role utility, named and fixed with their variants and
 * opacity kept — and none of the `[var(--…)]` classes the kit's own check allows.
 */

// Typed as ESLint's own rule: the plugin's written-out types are assignable to ESLint's.
const rule: Rule.RuleModule = plugin.rules["role-utilities"];

describe("the table", () => {
  it("is tokens.css's @theme inline block, re-rendered (node scripts/gen-role-utilities.mjs when not)", () => {
    const css = readFileSync(join(process.cwd(), "tokens.css"), "utf8");
    expect(roleUtilitiesFromCss(css)).toEqual(ROLE_UTILITIES);
  });

  it("reads each property's own namespace, the widths included", () => {
    expect(ROLE_UTILITIES.text["--text-muted"]).toEqual(["muted"]);
    expect(ROLE_UTILITIES.border["--border"]).toEqual(["subtle"]);
    expect(ROLE_UTILITIES["ring-offset"]["--bg-surface"]).toEqual(["surface"]);
    expect(ROLE_UTILITIES["ring-width"]["--focus-ring-width"]).toEqual(["focus"]);
    // A divider's fill: `--border` has no `bg-*` utility, so `bg-[var(--border)]` stays.
    expect(ROLE_UTILITIES.bg["--border"]).toBeUndefined();
  });

  it("is null without an @theme inline block", () => {
    expect(roleUtilitiesFromCss(":root { --text-muted: #666; }")).toBeNull();
  });
});

describe("findRoleClasses", () => {
  const table: RoleUtilityTable = {
    ...ROLE_UTILITIES,
    text: { "--ink": ["ink", "ink-alias"] },
  };

  it("names every utility when two read one token", () => {
    expect(findRoleClasses("md:text-[var(--ink)]/50", table)).toEqual([
      { index: 3, found: "text-[var(--ink)]", utilities: ["text-ink", "text-ink-alias"] },
    ]);
  });

  it("needs a class boundary before the property", () => {
    expect(findRoleClasses("context-[var(--text-muted)] xbg-[var(--bg-hover)]", ROLE_UTILITIES)).toEqual([]);
  });
});

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

const error = (found: string, utilities: string) => ({ messageId: "useRoleUtility", data: { found, utilities } });

ruleTester.run("role-utilities", rule, {
  valid: [
    // No role utility for these tokens: `[var(--…)]` is the right spelling.
    `const a = "fill-[var(--chart-1)] text-[var(--chart-3)] stroke-[var(--chart-9)]";`,
    `const b = "bg-[var(--status-synced)] text-[var(--status-error)]";`,
    // A divider's fill, and the colours with no ring/outline utility.
    `const c = "h-px bg-[var(--border)] ring-[var(--danger)] outline-[var(--info)]";`,
    // Already the utility.
    `const d = <div className="text-muted hover:bg-hover border-subtle ring-focus ring-offset-surface" />;`,
    // A fallback changes what the class paints; a width hint is not a colour.
    `const e = "text-[var(--text-muted,#666)] text-[length:var(--text-muted)] border-t-[length:var(--border)]";`,
    // Not a class: a style value, a comment, JSX text, a regular expression.
    `const f = <p style={{ color: "var(--text-muted)" }}>text-[var(--text-muted)]</p>; // bg-[var(--bg-hover)]`,
    `const g = /text-\\[var\\(--text-muted\\)\\]/;`,
    // No class boundary.
    `const h = "context-[var(--text-muted)]";`,
  ],
  invalid: [
    {
      code: `const a = <div className="p-2 text-[var(--text-muted)]" />;`,
      output: `const a = <div className="p-2 text-muted" />;`,
      errors: [{ ...error("text-[var(--text-muted)]", "text-muted"), line: 1, column: 31, endColumn: 55 }],
    },
    {
      // Variants before, an opacity and `!` after: all kept.
      code: `const b = "hover:dark:bg-[var(--bg-hover)]/70 md:border-t-[var(--border)] [&>svg]:text-[var(--text-secondary)]!";`,
      output: `const b = "hover:dark:bg-hover/70 md:border-t-subtle [&>svg]:text-secondary!";`,
      errors: [
        error("bg-[var(--bg-hover)]", "bg-hover"),
        error("border-t-[var(--border)]", "border-t-subtle"),
        error("text-[var(--text-secondary)]", "text-secondary"),
      ],
    },
    {
      // cn() / clsx() arguments are string literals like any other.
      code: `cn("divide-y divide-[var(--border)]", active && "focus-visible:ring-[var(--brand)]/40");`,
      output: `cn("divide-y divide-subtle", active && "focus-visible:ring-brand/40");`,
      errors: [error("divide-[var(--border)]", "divide-subtle"), error("ring-[var(--brand)]", "ring-brand")],
    },
    {
      // A template literal's quasis, either side of an expression.
      code: "const c = `px-2 ${x} focus-visible:ring-[length:var(--focus-ring-width)] ring-offset-[var(--bg-surface)] ${y}`;",
      output: "const c = `px-2 ${x} focus-visible:ring-focus ring-offset-surface ${y}`;",
      errors: [
        error("ring-[length:var(--focus-ring-width)]", "ring-focus"),
        error("ring-offset-[var(--bg-surface)]", "ring-offset-surface"),
      ],
    },
    {
      // A template literal over two lines: the report points at the class's own line.
      code: "const e = `px-2\n  text-[var(--text-muted)]`;",
      output: "const e = `px-2\n  text-muted`;",
      errors: [{ ...error("text-[var(--text-muted)]", "text-muted"), line: 2, column: 3, endLine: 2, endColumn: 27 }],
    },
    {
      // The money colours (DOC-7), the tone washes and borders, a ring on a brand fill, SVG.
      code: `const d = "text-[var(--money-income)] bg-[var(--danger-bg)] border-x-[var(--danger-border)] ring-[var(--brand-contrast)] fill-[var(--text-muted)] stroke-[var(--border)] outline-[var(--border-strong)]";`,
      output: `const d = "text-money-income bg-danger-soft border-x-danger ring-brand-contrast fill-muted stroke-subtle outline-strong";`,
      errors: [
        error("text-[var(--money-income)]", "text-money-income"),
        error("bg-[var(--danger-bg)]", "bg-danger-soft"),
        error("border-x-[var(--danger-border)]", "border-x-danger"),
        error("ring-[var(--brand-contrast)]", "ring-brand-contrast"),
        error("fill-[var(--text-muted)]", "fill-muted"),
        error("stroke-[var(--border)]", "stroke-subtle"),
        error("outline-[var(--border-strong)]", "outline-strong"),
      ],
    },
  ],
});

// The apps lint .tsx through typescript-eslint, whose template elements and JSX
// attributes must map to the same offsets.
new RuleTester({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
}).run("role-utilities (typescript-eslint)", rule, {
  valid: [`const tone: Record<Tone, string> = { chart: "bg-[var(--chart-2)]" };`],
  invalid: [
    {
      code: "export const Row = ({ on }: { on: boolean }) => <tr className={`${on ? \"bg-[var(--bg-active)]\" : \"\"} border-b-[var(--border)]`} />;",
      output: "export const Row = ({ on }: { on: boolean }) => <tr className={`${on ? \"bg-active\" : \"\"} border-b-subtle`} />;",
      errors: [error("bg-[var(--bg-active)]", "bg-active"), error("border-b-[var(--border)]", "border-b-subtle")],
    },
  ],
});

describe("the plugin", () => {
  it("is a flat-config plugin whose recommended config registers itself", () => {
    expect(plugin.meta).toMatchObject({ name: "@eifi1/ui-kit", namespace: "@eifi1/ui-kit" });
    expect(plugin.configs.recommended.plugins["@eifi1/ui-kit"]).toBe(plugin);
    expect(plugin.configs.recommended.rules).toEqual({ "@eifi1/ui-kit/role-utilities": "error" });
  });

  it("leaves an app's tests alone, as check:tokens leaves the kit's", () => {
    const linter = new Linter({ configType: "flat" });
    // The app's own object says which files it lints; the kit's adds the rule to those.
    const config = [{ files: ["**/*.ts"] }, plugin.configs.recommended] satisfies Linter.Config[];
    const code = `expect(row).not.toHaveClass("bg-[var(--danger)]");`;
    expect(linter.verify(code, config, "src/features/__tests__/row.test.ts")).toEqual([]);
    expect(linter.verify(code, config, "src/features/row.spec.ts")).toEqual([]);
    expect(linter.verify(code, config, "src/features/row.ts")).toHaveLength(1);
  });

  it("fixes an app file through configs.recommended alone", () => {
    const linter = new Linter({ configType: "flat" });
    const config = [
      { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
      plugin.configs.recommended,
    ] satisfies Linter.Config[];
    const result = linter.verifyAndFix(`const a = <p className="text-[var(--text-muted)]/60" />;`, config);
    expect(result.output).toBe(`const a = <p className="text-muted/60" />;`);
    expect(result.messages).toEqual([]);
  });

  it("reports a choice without a fix when two utilities read one token", async () => {
    vi.resetModules();
    vi.doMock("../role-utilities.generated", () => ({
      ROLE_UTILITIES: { ...ROLE_UTILITIES, text: { "--ink": ["ink", "ink-alias"] } },
    }));
    try {
      const { default: fresh } = await import("../index");
      const linter = new Linter({ configType: "flat" });
      const messages = linter.verify(`const a = "text-[var(--ink)]";`, [fresh.configs.recommended]);
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain("`text-ink` or `text-ink-alias`");
      expect(messages[0].fix).toBeUndefined();
    } finally {
      vi.doUnmock("../role-utilities.generated");
      vi.resetModules();
    }
  });
});
