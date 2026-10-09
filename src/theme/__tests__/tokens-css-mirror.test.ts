import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, type TokenSet } from "../palette-presets";

/**
 * `tokens.css` claims to mirror `DEFAULT_PRESET`. Nothing checked, and it had drifted.
 *
 * Ten of these 46 values had drifted when this test was written — the light money trio
 * and six of the dark tokens, including the brand accent — and the stylesheet's own
 * header noted the money hues "have not been touched": the drift was known and written
 * down rather than fixed, because the block was believed to be INERT. Its header said
 * Tailwind v4 strips a root block holding only custom properties, so nothing renders
 * from it. That was never true of Tailwind 4.x (0.33, docs/colour-roles-harmonization.md
 * §3.1, §12.3): the block survives the build (`check:tailwind` asserts one), and
 *   - in an app WITH a palette layer, `applyTokenSet`'s inline values beat it;
 *   - in an app WITHOUT one — Kurvenschmiede, whose palette layer was removed — it is
 *     exactly what paints, with only More contrast's four stepped values over it.
 * So this test is load-bearing: a light well or a status fix that reaches
 * `DEFAULT_PRESET` but not this block never reaches Kurvenschmiede. It is also what a
 * consumer reads to learn what the default appearance IS, and what someone copies when
 * promoting a preset to the default.
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

  it("declares every hue family in both themes", () => {
    // The colour, its wash, its frame — and, since 0.33, the text on it as a fill.
    const expected = ["blue", "indigo", "purple", "teal", "orange"]
      .flatMap((h) => [`--hue-${h}`, `--hue-${h}-bg`, `--hue-${h}-border`, `--hue-${h}-contrast`])
      .sort();
    expect(hues(":root")).toEqual(expected);
    expect(hues(".dark")).toEqual(expected);
  });
});

describe("tokens.css's 0.33 roles (docs/colour-roles-harmonization.md §5)", () => {
  // Like the hues, these live only in the stylesheet, and a role declared for one theme
  // and forgotten for the other renders the light value on a dark page.
  const declared = (selector: string) => Object.keys(declarationsUnder(selector));

  it("declares every new foreground and line in both themes", () => {
    const perTheme = [
      "--warning-contrast",
      "--warning-border-strong",
      "--money-income-contrast",
      "--money-expense-contrast",
      "--money-net-contrast",
      "--money-neutral-contrast",
    ];
    for (const selector of [":root", ".dark"]) {
      for (const name of perTheme) expect(declared(selector), `${selector} ${name}`).toContain(name);
    }
  });

  it("makes the light well the page, in the mirror Kurvenschmiede paints", () => {
    const light = declarationsUnder(":root");
    expect(light["--bg-surface-2"]).toBe(light["--bg-page"]);
    const dark = declarationsUnder(".dark");
    expect(dark["--bg-surface-2"]).not.toBe(dark["--bg-page"]);
  });
});
