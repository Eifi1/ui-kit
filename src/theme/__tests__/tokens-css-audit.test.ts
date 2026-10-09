import { describe, expect, it } from "vitest";
import { contrast } from "../color";
import { BRAND_BG_HOVER_SHARE, BRAND_BG_SHARE, BRAND_MUTED_SHARE, HOVER_INK } from "../contrast-tokens";
import { PALETTES } from "../palette-presets";
import { SWIPE_TONE } from "../../components/swipeable-row";
import { mixSrgb, over, resolveTokens, type ResolvedTokens, type Rgba } from "../../test/tokens-css";

/**
 * Every colour pair `tokens.css` sets up, measured in every shipped preset × light/dark ×
 * standard/More contrast (0.33, docs/colour-roles-harmonization.md §5.5, §12.10).
 *
 * The preset audit (`palette-audit.test.ts`) measures a `TokenSet` against itself. It
 * never saw the stylesheet's own literals — the status family, the hues, the field-sync
 * colours — against a preset's surfaces, and that is where the claims were wrong: light
 * `--warning` sat at 3.86:1 as text, `--danger-border-strong` at 2.07:1 where its comment
 * claimed 3:1, `--status-edited` at 2.45:1 where its comment said "all four clear it".
 * The cream and tinted grounds are darker than the white Tailwind's 700s are made for.
 * Nothing here is taken from a comment: each pair is resolved through the cascade a
 * browser would apply (`src/test/tokens-css.ts`) and measured.
 *
 * Text is measured on the darkest fill it can sit on, not only the page: a hovered row
 * on the card (`--bg-hover`), which in light is a shade darker than the page (§12.10).
 * The bar is the preset audit's: WCAG's ratio, with its 0.05 of rounding slack.
 */

const CSS = Object.values(
  import.meta.glob<string>("../../../tokens.css", { query: "?raw", import: "default", eager: true }),
)[0];

/** `auditPalette`'s slack: a pair passes at `required − 0.05`. */
const SLACK = 0.05;

const HUES = ["blue", "indigo", "purple", "teal", "orange"] as const;

/** Every colour that is printed as text somewhere in the kit or an app. */
const TEXT_ROLES = [
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--brand-muted",
  "--money-income",
  "--money-expense",
  "--money-net",
  "--money-neutral",
  "--danger",
  "--warning",
  "--success",
  "--info",
  ...HUES.map((h) => `--hue-${h}`),
];

/** The grounds text sits on: the three surfaces and a hovered row on the card. */
const TEXT_GROUNDS = ["--bg-page", "--bg-surface", "--bg-surface-2", "--bg-hover"];

/** A tone's text on its own wash — a soft chip, an idle swipe. */
const ON_WASH: Array<[string, string]> = [
  ["--danger", "--danger-bg"],
  ["--warning", "--warning-bg"],
  ["--success", "--success-bg"],
  ["--info", "--info-bg"],
  ["--brand-muted", "--brand-bg"],
  // …and on that chip hovered: ButtonGroupLink's current page, a selected day (§12.11).
  ["--brand-muted", "--brand-bg-hover"],
  ...HUES.map((h): [string, string] => [`--hue-${h}`, `--hue-${h}-bg`]),
];

/** B′ (§12.1, §12.10): the hover of a control that can sit on any surface — the body ink
 *  at 7 %, translucent. The class `ui.tsx`'s HOVER_INK writes. */
const B_PRIME_INK = 0.07;

const VARIANTS = PALETTES.flatMap((preset) =>
  (["light", "dark"] as const).flatMap((mode) =>
    [false, true].map((more) => ({
      label: `${preset.id} ${mode}${more ? " +more" : ""}`,
      tokens: resolveTokens(CSS, preset[mode], mode, more),
    })),
  ),
);

/** A colour as painted on the card: a translucent wash composited over `--bg-surface`. */
function onCard(t: ResolvedTokens, name: string): Rgba {
  const c = t.color(name);
  return c.a < 1 ? over(c, t.color("--bg-surface")) : c;
}

/** Each failing pair, named with its ratio — every one at once, not the first. */
function audit(check: (t: ResolvedTokens, fail: (msg: string) => void) => void): string[] {
  const failures: string[] = [];
  for (const { label, tokens } of VARIANTS) check(tokens, (msg) => failures.push(`${label}: ${msg}`));
  return failures;
}

function pair(fail: (msg: string) => void, fg: Rgba, bg: Rgba, required: number, what: string) {
  const ratio = contrast(fg, bg);
  if (ratio < required - SLACK) fail(`${what} ${ratio.toFixed(2)}:1 < ${required}:1`);
}

/** The utilities the `@theme inline` block makes, utility → token. */
function themeUtilities(): Map<string, string> {
  const block = /@theme inline\s*\{([^}]*)\}/.exec(CSS.replace(/\/\*[\s\S]*?\*\//g, ""))?.[1] ?? "";
  const prefix: Record<string, string> = {
    "text-color": "text",
    "background-color": "bg",
    "border-color": "border",
    "ring-color": "ring",
    "outline-color": "outline",
    fill: "fill",
    stroke: "stroke",
  };
  const out = new Map<string, string>();
  for (const [, ns, name, token] of block.matchAll(
    /--(text-color|background-color|border-color|ring-color|outline-color|fill|stroke)-([a-z0-9-]+)\s*:\s*var\((--[a-z0-9-]+)\)/g,
  )) {
    out.set(`${prefix[ns]}-${name}`, token);
  }
  // The money classes stay plain (§7.2), and SWIPE_TONE uses them.
  for (const [, cls, token] of CSS.matchAll(/^\.((?:text|bg)-money-[a-z]+)\s*\{[^}]*var\((--[a-z0-9-]+)\)/gm)) {
    out.set(cls, token);
  }
  return out;
}

/** The token behind a colour utility (`bg-danger-soft`) or an arbitrary `bg-[var(--x)]`. */
function tokenOf(utilities: Map<string, string>, cls: string): string {
  const arbitrary = /^(?:bg|text)-\[var\((--[a-z0-9-]+)\)\]$/.exec(cls);
  const token = arbitrary ? arbitrary[1] : utilities.get(cls);
  if (!token) throw new Error(`${cls} is not a colour utility tokens.css defines`);
  return token;
}

describe("tokens.css, measured in every shipped preset", () => {
  it("resolves every text role and ground in every variant (the audit is not vacuous)", () => {
    expect(VARIANTS).toHaveLength(PALETTES.length * 4);
    for (const { tokens } of VARIANTS) {
      for (const name of [...TEXT_ROLES, ...TEXT_GROUNDS]) expect(tokens.get(name), name).not.toBeNull();
    }
  });

  it("prints text at 4.5:1 on the page, the card, the well and a hovered row", () => {
    expect(
      audit((t, fail) => {
        for (const fg of TEXT_ROLES) {
          for (const bg of TEXT_GROUNDS) pair(fail, t.color(fg), onCard(t, bg), 4.5, `${fg} on ${bg}`);
        }
      }),
    ).toEqual([]);
  });

  it("prints each tone at 4.5:1 on its own wash", () => {
    expect(
      audit((t, fail) => {
        for (const [fg, wash] of ON_WASH) pair(fail, t.color(fg), onCard(t, wash), 4.5, `${fg} on ${wash}`);
      }),
    ).toEqual([]);
  });

  it("gives every fill a foreground at 4.5:1 — each <fill>-contrast on its fill", () => {
    const names = VARIANTS[0].tokens.names();
    const contrasts = names.filter((n) => n.endsWith("-contrast"));
    // The set §5.1 promises: brand, the four statuses, neutral, money ×4, the hues ×5.
    expect(contrasts.sort()).toEqual(
      [
        "brand", "danger", "warning", "info", "success", "neutral",
        "money-income", "money-expense", "money-net", "money-neutral",
        ...HUES.map((h) => `hue-${h}`),
      ]
        .map((f) => `--${f}-contrast`)
        .sort(),
    );
    const pairs: Array<[string, string]> = [
      ...contrasts.map((c): [string, string] => [c.replace(/-contrast$/, ""), c]),
      // The hover fills carry the same label.
      ["--danger-hover", "--danger-contrast"],
      ["--brand-hover", "--brand-contrast"],
      // A count pill, a selected day: the inverse pair.
      ["--bg-inverse", "--text-inverse"],
    ];
    expect(
      audit((t, fail) => {
        for (const [fill, fg] of pairs) pair(fail, t.color(fg), onCard(t, fill), 4.5, `${fg} on ${fill}`);
      }),
    ).toEqual([]);
  });

  it("draws the strong lines and the field-sync marks at 3:1 against every surface", () => {
    const lines = ["--danger-border-strong", "--warning-border-strong", "--status-synced", "--status-pending", "--status-edited", "--status-error"];
    expect(
      audit((t, fail) => {
        for (const line of lines) {
          for (const bg of ["--bg-page", "--bg-surface", "--bg-surface-2"]) pair(fail, t.color(line), t.color(bg), 3, `${line} on ${bg}`);
        }
      }),
    ).toEqual([]);
  });

  it("keeps --border a line: what it fills under text is --bg-active, which carries the ink", () => {
    // §12.9: the calculator and numpad keys and Button primary's hover sat on `--border`,
    // which More contrast steps to a 3:1 LINE — 2.2–3.3:1 under their labels.
    expect(
      audit((t, fail) => {
        for (const fg of ["--text-primary", "--text-secondary"]) pair(fail, t.color(fg), t.color("--bg-active"), 4.5, `${fg} on --bg-active`);
        pair(fail, t.color("--bg-active"), t.color("--bg-surface-2"), 1.08 + SLACK, "--bg-active against the well (a key's step)");
      }),
    ).toEqual([]);
  });
});

describe("the hover rule (§12.2, §12.10)", () => {
  it("is the number the deriver solves against", () => {
    const value = /--bg-hover:\s*color-mix\(in oklab, var\(--text-primary\) ([\d.]+)%, var\(--bg-surface\)\)/.exec(CSS);
    expect(value, "--bg-hover's formula").not.toBeNull();
    expect(Number(value![1]) / 100).toBe(HOVER_INK);
  });

  it("steps a hovered row 1.08:1 from the card, and the well 1.08:1 from the card it is inset in", () => {
    expect(
      audit((t, fail) => {
        pair(fail, t.color("--bg-hover"), t.color("--bg-surface"), 1.08 + SLACK, "--bg-hover against the card");
        // k26: the light well was 1.02:1 from the card; since 0.33 it is the page.
        pair(fail, t.color("--bg-surface-2"), t.color("--bg-surface"), 1.08 + SLACK, "the well against the card");
      }),
    ).toEqual([]);
  });

  it("hovers a well row to the card, where every text role keeps 4.5:1", () => {
    expect(
      audit((t, fail) => {
        pair(fail, t.color("--bg-surface"), t.color("--bg-surface-2"), 1.08 + SLACK, "the card against the well");
        for (const fg of TEXT_ROLES) pair(fail, t.color(fg), t.color("--bg-surface"), 4.5, `${fg} on the card`);
      }),
    ).toEqual([]);
  });

  it("gives B′'s translucent ink a visible step on all three surfaces, under a readable label", () => {
    // Button secondary/ghost, IconButton muted and the inbox's filter pills sit on the
    // page, a card or a well; their hover is the ink at 7 %, so it is measured on each.
    // Every label on it is the body ink (a `muted` ghost turns to it on hover). A
    // `danger` ghost hovers onto the danger wash instead — `--danger` on the ink fell
    // to 4.2:1 over a light page — which "prints each tone on its own wash" covers.
    expect(
      audit((t, fail) => {
        const ink = mixSrgb(t.color("--text-primary"), { r: 0, g: 0, b: 0, a: 0 }, B_PRIME_INK);
        for (const ground of ["--bg-page", "--bg-surface", "--bg-surface-2"]) {
          const hovered = over(ink, t.color(ground));
          pair(fail, hovered, t.color(ground), 1.08 + SLACK, `the ink against ${ground}`);
          pair(fail, t.color("--text-primary"), hovered, 4.5, `--text-primary on the ink over ${ground}`);
        }
      }),
    ).toEqual([]);
  });
});

describe("the soft brand (§12.11)", () => {
  it("mixes --brand-muted, --brand-bg and --brand-bg-hover at the shares the deriver solves with", () => {
    const css = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
    const share = (token: string, into: string) => {
      const value = new RegExp(`${token}:\\s*color-mix\\(in oklab, var\\(--brand\\) ([\\d.]+)%, var\\(${into}\\)\\)`).exec(css);
      expect(value, `${token}'s formula`).not.toBeNull();
      return Number(value![1]) / 100;
    };
    expect(share("--brand-muted", "--text-primary")).toBe(BRAND_MUTED_SHARE);
    expect(share("--brand-bg", "--bg-surface")).toBe(BRAND_BG_SHARE);
    expect(share("--brand-bg-hover", "--bg-surface")).toBe(BRAND_BG_HOVER_SHARE);
  });

  it("keeps the chip's hover a visible step: the text moved, not the hover", () => {
    // Lightening `--brand-bg-hover` until the text cleared 4.5:1 would have left it 1.00:1
    // from the chip it hovers, so `--brand-muted` moved toward the ink instead.
    expect(
      audit((t, fail) => {
        pair(fail, onCard(t, "--brand-bg-hover"), onCard(t, "--brand-bg"), 1.08 + SLACK, "--brand-bg-hover against --brand-bg");
      }),
    ).toEqual([]);
  });
});

describe("SwipeAction tones (§6)", () => {
  const utilities = themeUtilities();

  it("reads every tone's classes as tokens the stylesheet defines", () => {
    for (const { idle, armed } of Object.values(SWIPE_TONE)) {
      for (const cls of [...idle.split(" "), ...armed.split(" ")]) expect(() => tokenOf(utilities, cls)).not.toThrow();
    }
  });

  it("prints the label at 4.5:1 idle (the wash) and armed (the fill)", () => {
    expect(
      audit((t, fail) => {
        for (const [tone, looks] of Object.entries(SWIPE_TONE)) {
          for (const [state, classes] of Object.entries(looks)) {
            const bg = classes.split(" ").find((c) => c.startsWith("bg-"))!;
            const fg = classes.split(" ").find((c) => c.startsWith("text-"))!;
            pair(fail, t.color(tokenOf(utilities, fg)), onCard(t, tokenOf(utilities, bg)), 4.5, `${tone} ${state}`);
          }
        }
      }),
    ).toEqual([]);
  });
});

describe("the role utilities (§7)", () => {
  const utilities = themeUtilities();

  it("point at tokens that resolve in every variant — no typo paints nothing", () => {
    expect(utilities.size).toBeGreaterThan(90);
    const broken = [...utilities].filter(([, token]) => VARIANTS.some(({ tokens }) => !tokens.get(token)));
    expect(broken).toEqual([]);
  });

  it("name each token after its own property: no bg-muted, no text-surface", () => {
    for (const absent of ["bg-muted", "bg-primary", "text-surface", "text-subtle", "border-muted", "fill-brand"]) {
      expect(utilities.has(absent), absent).toBe(false);
    }
    expect(utilities.get("text-muted")).toBe("--text-muted");
    expect(utilities.get("bg-surface-2")).toBe("--bg-surface-2");
    expect(utilities.get("border-subtle")).toBe("--border");
    expect(utilities.get("bg-danger-soft")).toBe("--danger-bg");
    expect(utilities.get("ring-warning-strong")).toBe("--warning-border-strong");
    expect(utilities.get("stroke-strong")).toBe("--border-strong");
    expect(utilities.get("text-money-income-contrast")).toBe("--money-income-contrast");
  });
});
