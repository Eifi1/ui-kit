import { describe, expect, it } from "vitest";

/**
 * Every `var(--token)` this package emits has to resolve to something.
 *
 * An undefined custom property with no fallback does not fall back to anything —
 * `color: var(--text-muted-typo)` is an INVALID value at computed-value time, so the
 * property inherits (or resets to its initial value) and the element renders in
 * whatever colour its ancestor happened to have. No console warning, no build error,
 * no failing test: a typo'd token looks like a styling opinion. The kit's whole
 * theming story is these names, three applications read them through the barrel, and
 * `check-token-discipline.mjs` actively pushes components AWAY from literal colours
 * and TOWARD this vocabulary — so the vocabulary needs a spell-checker.
 *
 * Direction: a name used in `src/` must be declared in `tokens.css` or written by the
 * kit at runtime. The reverse (a declared token nobody uses) is not a defect — the
 * stylesheet is a consumer-facing API, and `--danger-contrast` exists for apps, not
 * for this repository's own components.
 */

/** The package's own source, inlined by Vite at build time — the same
 *  `import.meta.glob(…, { query: "?raw" })` the `invalid` sweep and the sonner sweep
 *  use, for the same reason (no `@types/node` here: this ships browser code). */
const SOURCES = Object.entries(
  import.meta.glob<string>("../**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
).filter(([path]) => !path.includes("__tests__"));

/** The token sheet, read as TEXT. jsdom applies no stylesheet, so there is nothing to
 *  ask `getComputedStyle` about; and `vitest.config.ts` has to opt this one file out
 *  of Vitest's empty-string CSS stub for the read to return anything at all. */
const TOKENS_CSS = Object.values(
  import.meta.glob<string>("../../tokens.css", { query: "?raw", import: "default", eager: true }),
)[0];

/** Comments are not CSS. `chart.tsx` explains in prose that recharts generates
 *  `var(--color-total)` for a series named `total`, and `app-shell.tsx` shows a
 *  consumer how to write `bottom-[var(--app-nav-h,0px)]` — neither emits a byte. A
 *  sweep that cannot tell a sentence about a token from a use of one either fails on
 *  documentation or stops being able to read the file's own examples. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** `var(--name)` and `var(--name, fallback)`, in emitted code.
 *
 *  A name must be followed by `)` or `,` to count, which also skips the ONE dynamic
 *  reference in the package — `chart-palette.ts`'s `` `var(--chart-${n})` `` — whose
 *  nine possible values are asserted explicitly below instead. */
const VAR_USE = /var\(\s*(--[a-zA-Z0-9_-]+)\s*([,)])/g;

/** Where each token is used, and whether every use carries a fallback. */
const uses = new Map<string, { files: Set<string>; everyUseHasFallback: boolean }>();
for (const [path, src] of SOURCES) {
  for (const [, name, next] of stripComments(src).matchAll(VAR_USE)) {
    const seen = uses.get(name) ?? { files: new Set<string>(), everyUseHasFallback: true };
    seen.files.add(path.replace("../", "src/"));
    seen.everyUseHasFallback &&= next === ",";
    uses.set(name, seen);
  }
}

/** Declared in the stylesheet — any block, since a token declared only under `.dark`
 *  is still a token that resolves. */
const declaredInCss = new Set(
  [...TOKENS_CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(
    (m) => m[1],
  ),
);

/** Written onto an element at runtime instead: `applyTokenSet`'s preset tokens,
 *  `AppShell`'s measured `--app-nav-h`, and a component-local variable set through a
 *  React `style` object (the slider's `--slider-fill`, which is the thumb position and
 *  has no business in a stylesheet). Found the same way the sweep finds uses, so a
 *  token that moves from the stylesheet into JS does not become a false positive. */
const writtenAtRuntime = new Set(
  SOURCES.flatMap(([, src]) => [
    ...stripComments(src).matchAll(/setProperty\(\s*"(--[a-zA-Z0-9_-]+)"/g),
    ...stripComments(src).matchAll(/"(--[a-zA-Z0-9_-]+)"\s*:/g),
  ]).map((m) => m[1]),
);

describe("every token the kit emits is defined somewhere", () => {
  it("names no custom property that nothing declares", () => {
    const orphans = [...uses.entries()]
      .filter(([, use]) => !use.everyUseHasFallback)
      .filter(([name]) => !declaredInCss.has(name) && !writtenAtRuntime.has(name))
      .map(([name, use]) => `${name} — used in ${[...use.files].sort().join(", ")}`);
    expect(orphans).toEqual([]);
  });

  it("covers the chart ramp, which is referenced by index", () => {
    // `paletteFor(i)` builds the name, so the regex above cannot see these. The ramp
    // is nine wide in both the stylesheet and `TokenSet.chart`; a tenth series would
    // wrap rather than reach an undeclared `--chart-10`, and this says so.
    for (let i = 1; i <= 9; i += 1) expect(declaredInCss).toContain(`--chart-${i}`);
    expect(declaredInCss).not.toContain("--chart-10");
  });

  it("is not vacuous: the sweep can see the source and the stylesheet", () => {
    // Everything above passes trivially if the globs return nothing, the comment
    // stripper eats the file, or the token sheet reads as the empty string — which is
    // exactly what a stylesheet read under Vitest's default CSS stub does.
    expect(SOURCES.length).toBeGreaterThan(40);
    expect(TOKENS_CSS.length).toBeGreaterThan(1000);
    expect(uses.size).toBeGreaterThan(30);
    expect(declaredInCss.size).toBeGreaterThan(30);
  });
});
