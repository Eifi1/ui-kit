import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { KIT_CSS_VARIABLES, declaredCustomProperties, undeclaredCssVariables } from "../testing";
import { KIT_NAMES, TAILWIND_THEME_NAMES } from "../testing/css-variables.generated";
import { applyTokenSet, DEFAULT_PRESET } from "../theme/palette-presets";
import { CONTRAST_STEPPED_VARS } from "../theme/contrast-tokens";

/**
 * Every `var(--token)` this package emits has to resolve to something.
 *
 * An undefined custom property with no fallback does not fall back to anything —
 * `color: var(--text-muted-typo)` is an INVALID value at computed-value time, so the
 * property inherits (or resets to its initial value) and the element renders in
 * whatever colour its ancestor happened to have. No console warning, no build error,
 * no failing test: a typo'd token looks like a styling opinion. Kurvenschmiede shipped
 * exactly that — `fill-[var(--surface)]`, black boxes on a public page.
 *
 * Since 0.33 the rule lives in `@eifi1/ui-kit/testing` (`undeclaredCssVariables`), the
 * guard every app runs over its own source (docs/colour-roles-harmonization.md §8), and
 * this test runs the SAME function over the kit's: one implementation, so the kit's rules
 * and the apps' cannot drift apart. Direction: a name used in `src/` must be declared in
 * `tokens.css` or written by the kit at runtime. The reverse (a declared token nobody
 * uses) is not a defect — the stylesheet is a consumer-facing API.
 */

/** The package's own source, inlined by Vite at build time — the same
 *  `import.meta.glob(…, { query: "?raw" })` the `invalid` sweep and the sonner sweep
 *  use. */
const SOURCES = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("../**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
  )
    .filter(([path]) => !path.includes("__tests__") && !path.startsWith("../test/"))
    .map(([path, text]) => [path.replace("../", "src/"), text]),
);

/** The token sheet, read as TEXT. `vitest.config.ts` has to opt this one file out of
 *  Vitest's empty-string CSS stub for the read to return anything at all — the very trap
 *  the guard refuses to fall into for an app. */
const TOKENS_CSS = Object.values(
  import.meta.glob<string>("../../tokens.css", { query: "?raw", import: "default", eager: true }),
)[0];

describe("every token the kit emits is defined somewhere", () => {
  it("names no custom property that nothing declares — the apps' guard, over the kit", () => {
    // tokens.css rides along as a stylesheet, so its own `var()` reads are checked too.
    expect(undeclaredCssVariables({ ...SOURCES, "tokens.css": TOKENS_CSS })).toEqual([]);
  });

  it("checks the uses with a fallback too: every one names something declared, or a knob", () => {
    // Stricter than an app has to be (keksdose's own guard checks these). `--app-nav-h`
    // is the kit's AppShell's own write. What is left are the knobs an APP sets and the
    // kit reads with a default — CalendarHeatmap's cell and label sizes, documented on
    // its props. Listing them here is the inventory: a new fallback read either names a
    // token or joins this list on purpose.
    const KNOBS = ["--heatmap-cell", "--heatmap-label"];
    expect(
      undeclaredCssVariables({ ...SOURCES, "tokens.css": TOKENS_CSS }, { checkFallbacks: true, runtime: KNOBS }),
    ).toEqual([]);
  });

  it("covers the chart ramp, which is referenced by index", () => {
    // `paletteFor(i)` builds the name, so a sweep cannot see these. The ramp is nine
    // wide in both the stylesheet and `TokenSet.chart`; a tenth series would wrap rather
    // than reach an undeclared `--chart-10`, and this says so.
    for (let i = 1; i <= 9; i += 1) expect(KIT_CSS_VARIABLES).toContain(`--chart-${i}`);
    expect(KIT_CSS_VARIABLES).not.toContain("--chart-10");
  });

  it("is not vacuous: the sweep can see the source and the stylesheet", () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(40);
    expect(TOKENS_CSS.length).toBeGreaterThan(1000);
    expect(KIT_CSS_VARIABLES.size).toBeGreaterThan(80);
  });
});

describe("KIT_CSS_VARIABLES (§8.2 rule 1, §12.5)", () => {
  it("is what tokens.css declares today — regenerate with node scripts/gen-kit-css-variables.mjs", () => {
    const fresh = [...declaredCustomProperties(TOKENS_CSS)].filter((n) => n !== "--app-nav-h").sort();
    expect(KIT_NAMES.split(" ")).toEqual(fresh);
  });

  it("carries Tailwind's theme as the kit builds with it — regenerate after an upgrade", () => {
    const require = createRequire(import.meta.url);
    const css = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
    expect(TAILWIND_THEME_NAMES.split(" ")).toEqual([...declaredCustomProperties(css)].sort());
  });

  it("has the tokens and the plain @theme names, and not the @theme inline ones or --app-nav-h", () => {
    for (const name of ["--text-muted", "--text-caption", "--bg-surface-2", "--warning-contrast", "--neutral"]) {
      expect(KIT_CSS_VARIABLES, name).toContain(name);
    }
    // `@theme inline` emits no variable: `var(--text-color-muted)` would paint nothing.
    for (const name of ["--text-color-muted", "--background-color-surface", "--border-color-subtle", "--app-nav-h"]) {
      expect(KIT_CSS_VARIABLES, name).not.toContain(name);
    }
  });

  it("holds everything applyTokenSet and More contrast write on <html>", () => {
    // In an app without a palette layer these come from the stylesheet's mirror, so
    // each one must be declared there — and is, for every field of a TokenSet.
    const el = document.createElement("div");
    applyTokenSet(el, DEFAULT_PRESET.light, true);
    const written = Array.from({ length: el.style.length }, (_, i) => el.style.item(i));
    expect(written.length).toBeGreaterThan(20);
    for (const name of [...written, ...CONTRAST_STEPPED_VARS]) expect(KIT_CSS_VARIABLES, name).toContain(name);
  });
});

describe("undeclaredCssVariables (§8.2, §8.3)", () => {
  /** Nine filler files: the guard refuses fewer than ten. */
  const FILLER = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`src/f${i}.ts`, "export {};"]));
  const run = (files: Record<string, string>, options?: Parameters<typeof undeclaredCssVariables>[1]) =>
    undeclaredCssVariables({ ...FILLER, ...files }, options);

  it("finds Kurvenschmiede's control diagram: a token that never existed", () => {
    expect(run({ "src/diagram.tsx": `const box = "fill-[var(--surface)] stroke-[var(--text-primary)]";` })).toEqual([
      "src/diagram.tsx:1 --surface",
    ]);
  });

  it("counts the kit's tokens, the app's stylesheets and the app's own runtime writes", () => {
    expect(
      run({
        "src/app.css": ":root { --tone-from: red; }\n.x { color: var(--tone-from); }",
        "src/toast.tsx": `<div style={{ "--tone-to": c }} className="bg-[var(--tone-to)] text-[var(--text-muted)]" />`,
        "src/w.ts": `el.style.setProperty("--measured", "1px"); const w = "w-[var(--measured)] [--pad:4px] p-[var(--pad)]";`,
      }),
    ).toEqual([]);
  });

  it("does not count a name declared only in an @theme inline block", () => {
    expect(
      run({
        "src/app.css": "@theme inline {\n  --color-muted: var(--muted);\n}\n:root { --muted: grey; }",
        "src/a.tsx": `const a = "text-[var(--color-muted)]"; const b = "text-[var(--text-color-muted)]";`,
      }),
    ).toEqual(["src/a.tsx:1 --color-muted", "src/a.tsx:1 --text-color-muted"]);
  });

  it("skips comments, uses with a fallback and names built at runtime", () => {
    expect(
      run({
        "src/a.tsx": [
          "// was var(--gone) before 0.33",
          "/* var(--also-gone) */",
          'const a = "bottom-[var(--app-nav-h,0px)] text-[var(--maybe,red)]";',
          "const b = `var(--chart-${n})`;",
        ].join("\n"),
      }),
    ).toEqual([]);
  });

  it("checks fallback uses on request, where --app-nav-h counts and nowhere else", () => {
    const files = { "src/a.tsx": 'const a = "bottom-[var(--app-nav-h,0px)] text-[var(--maybe,red)]";\nconst b = "h-[var(--app-nav-h)]";' };
    expect(run(files, { checkFallbacks: true })).toEqual(["src/a.tsx:1 --maybe", "src/a.tsx:2 --app-nav-h"]);
    expect(run(files)).toEqual(["src/a.tsx:2 --app-nav-h"]);
  });

  it("lets Tailwind's theme variables resolve, and reports its palette under refusePalette", () => {
    const files = { "src/chip.tsx": 'const c = "var(--color-rose-500)"; const s = "p-[var(--spacing)]";' };
    expect(run(files)).toEqual([]);
    expect(run(files, { refusePalette: true })).toEqual([
      "src/chip.tsx:1 --color-rose-500 (a Tailwind palette colour; refusePalette is on)",
    ]);
  });

  it("counts a chart series' --color-<key> where the file configures that key", () => {
    expect(run({ "src/c.tsx": 'const config = { total: { label: "Total", color: "var(--chart-1)" } };\nconst f = "var(--color-total)";' })).toEqual([]);
    expect(run({ "src/c.tsx": 'const f = "var(--color-total)";' })).toEqual(["src/c.tsx:1 --color-total"]);
  });

  it("takes a library's runtime variables as names or patterns", () => {
    const files = { "src/a.tsx": 'const h = "h-[var(--radix-collapsible-content-height)] w-[var(--radix-popper-anchor-width)]";' };
    expect(run(files, { runtime: ["--radix-collapsible-content-height", /^--radix-popper-/] })).toEqual([]);
  });

  it("refuses a vacuous run: too few files, or a stylesheet Vitest stubbed empty", () => {
    expect(() => undeclaredCssVariables({ "src/a.ts": "" })).toThrow(/source file/);
    expect(() => run({ "src/app.css": "" })).toThrow(/test\.css\.include/);
  });
});
