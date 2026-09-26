import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, type TokenSet } from "../palette-presets";

/**
 * `tokens.css` claims to mirror `DEFAULT_PRESET`. Nothing checked, and it had drifted.
 *
 * The stylesheet says so itself, at the top of the file: "these :root/.dark values
 * MIRROR DEFAULT_PRESET … this block is a documentation mirror, not the live source".
 * That is true and it is the whole problem — Tailwind v4 strips a root block holding
 * only custom properties, and the palette layer writes the real values inline on
 * <html> (`applyTokenSet`), so the stylesheet is INERT. An inert mirror cannot fail:
 * nothing renders from it, so nothing can look wrong, and it drifts one careful commit
 * at a time. Ten of these 46 values had already drifted when this test was written —
 * the light money trio and six of the dark tokens, including the brand accent — and
 * the file's own header notes the money hues "have not been touched", i.e. the drift
 * was known and written down rather than fixed, because writing it down was cheaper
 * than checking it.
 *
 * It still matters even though nothing paints it. It is what a consumer reads to learn
 * what the default appearance IS, it is what someone copies when promoting a preset to
 * the default (the presets file gives exactly that instruction), and it is the fallback
 * for anything rendered before `applyTokenSet` runs.
 *
 * The presets are owned elsewhere, so this test has a direction: `tokens.css` follows
 * `DEFAULT_PRESET`, never the reverse. A failure here is fixed in the stylesheet.
 *
 * Read raw rather than through a CSS import — the same `import.meta.glob(…, { query:
 * "?raw" })` trick `optional-peer-imports.test.tsx` uses — because jsdom does not
 * apply a stylesheet's custom properties and this package has no `@types/node` to
 * spell `readFileSync` with.
 */
const CSS = Object.values(
  import.meta.glob<string>("../../../tokens.css", { query: "?raw", import: "default", eager: true }),
)[0];

/** `bgSurface2` → `--bg-surface-2`, as `applyTokenSet` writes it. */
const cssName = (key: string) => `--${key.replace(/([A-Z0-9])/g, (c) => `-${c.toLowerCase()}`)}`;

/** `chart` is a ramp (`--chart-1…9`) and `heat` never becomes CSS at all — the
 *  heatmaps interpolate it in JS through the palette store. Same two exceptions
 *  `apply-token-set.test.ts` makes, for the same reasons. */
const NOT_ONE_PROPERTY = ["chart", "heat"];

/** Comments out of the way first. Half this stylesheet is prose, several of those
 *  notes quote token names and values, and a parser that cannot tell a declaration
 *  from a sentence about one would read the file's own drift warning as a token. */
const CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The custom properties a block declares, last-wins as the cascade resolves them.
 *
 *  A deliberately small parser: match innermost `selector { … }` pairs and keep the
 *  ones whose selector is EXACTLY the one asked for. That skips `:root, .dark` (the
 *  derived roles, which are formulas rather than preset values), `.dark ::-webkit-…`
 *  and everything nested inside `@layer`/`@media`, none of which carry preset tokens.
 *  The selector is what follows the last `;` or `}` before the brace — the capture
 *  otherwise reaches back over the at-rules and whitespace above the block. */
function declarationsUnder(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, sel, body] of CODE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((sel.split(";").pop() ?? "").trim() !== selector) continue;
    for (const [, name, value] of body.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
      out[name] = value.trim().toLowerCase();
    }
  }
  return out;
}

/** Every `--token: value` pair the preset says that block should hold. */
function expectedFrom(t: TokenSet): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(t)) {
    if (NOT_ONE_PROPERTY.includes(key)) continue;
    out[cssName(key)] = String(value).toLowerCase();
  }
  t.chart.forEach((c, i) => {
    out[`--chart-${i + 1}`] = c.toLowerCase();
  });
  return out;
}

describe("tokens.css mirrors DEFAULT_PRESET", () => {
  for (const [selector, mode] of [
    [":root", "light"],
    [".dark", "dark"],
  ] as const) {
    it(`${selector} carries the ${mode} token set, value for value`, () => {
      const declared = declarationsUnder(selector);
      const expected = expectedFrom(DEFAULT_PRESET[mode]);

      // Every mismatch at once, named: a test that stops at the first one turns a
      // ten-value resync into ten runs.
      const drift = Object.entries(expected)
        .filter(([name, value]) => declared[name] !== value)
        .map(([name, value]) => `${name}: ${declared[name] ?? "(missing)"} — expected ${value}`);
      expect(drift).toEqual([]);
    });
  }

  it("is not vacuous: the parser really found both blocks", () => {
    // If the selectors were renamed or the parser stopped matching, every lookup
    // above would be `undefined` and the test would still say "no drift" — the exact
    // failure mode of the mirror it is guarding.
    expect(Object.keys(declarationsUnder(":root")).length).toBeGreaterThan(20);
    expect(Object.keys(declarationsUnder(".dark")).length).toBeGreaterThan(20);
    expect(Object.keys(expectedFrom(DEFAULT_PRESET.light))).toHaveLength(23);
  });
});

describe("tokens.css categorical hues (0.10.0)", () => {
  // Not preset tokens — like `--danger`, a hue is a fixed colour that lives only in the
  // stylesheet — so nothing above covers them. What can drift is the PAIR: a hue
  // declared for light and forgotten for dark renders the light value on a dark page.
  const hues = (selector: string) =>
    Object.keys(declarationsUnder(selector))
      .filter((name) => name.startsWith("--hue-"))
      .sort();

  it("declares every hue triple in both themes", () => {
    const expected = ["blue", "indigo", "purple", "teal", "orange"]
      .flatMap((h) => [`--hue-${h}`, `--hue-${h}-bg`, `--hue-${h}-border`])
      .sort();
    expect(hues(":root")).toEqual(expected);
    expect(hues(".dark")).toEqual(expected);
  });
});
