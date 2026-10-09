# Colour roles — harmonisation plan

Status: **2026-10-09, decided, not yet reviewed.** Marcel took every recommendation the
same day (§2). The three apps review this contract next; what they settle will be added
as a last section, and it wins over the sections above where they differ. Led from
ui-kit for the 0.33 round, and ships as ui-kit 0.33.

It answers keksdose's 0.32 adoption findings k22–k27 and Kurvenschmiede's undeclared
token (§8):
- **k22:** the money fills have no foreground;
- **k23:** in dark, every status and money fill is unusable under white;
- **k24:** warning and "neutral" have no foreground, and swipe panels paint palette
  colours;
- **k25:** the roles have no utility names, so every use is a `[var(--…)]` class;
- **k26:** the well (`--bg-surface-2`) is invisible on a card in light;
- **k27:** warning has no strong line.

Built from a read-only audit of the kit (0.32.2) and the three apps: keksdose
`feat/kit-0.32`, kastlan `feat/paddle`, Kurvenschmiede `main`, all on ui-kit 0.32.2 and
Tailwind 4.3.3 (kept outside the repo). Every ratio was measured with the kit's own
colour code against the shipped presets (§A). **kk** = keksdose, **ka** = kastlan,
**KS** = Kurvenschmiede.

## 1. Where each one stands

| | kit | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|---|
| Tailwind | 4.3.3, CSS-first. `tokens.css` has a `@theme` (two font sizes, `3xl`) but **no colour theme variables** | imports `tokens.css`, `@source` dist; no `@theme` of its own | imports `tokens.css`, `@source` src; **its own shadcn `@theme inline`** (`--color-primary/secondary/muted/accent/border/…` → kit tokens, `app.css:24-102`) | imports `tokens.css`, `@source` dist; no `@theme` |
| `[var(--…)]` colour classes (non-test) | 1,757 (`text-muted` 254) | 855 (`text-muted` **422**) | 30, plus 108 `text-muted-foreground` and 16 other shadcn names | 271 (`text-muted` 124) |
| Palette colours this round removes | 2 survivors in the ratchet, one is SwipeableRow's `text-white` | 5 `eslint-disable` blocks: 3 swipe plans, 2 status pills | 9 lines of status text/icon/marker colours | 8 lines of status text/icon colours |
| Swipes | `SwipeableRow`; DataTable row actions, feedback inbox, translation review paint their own fills | 2 direct `SwipeableRow`s, 4 swipe plans in palette mid-tones | only the kit's `feedbackSwipePlan` | only the kit's `feedbackSwipePlan` |
| `--bg-surface-2` | 49 uses, ~29 without a border | 31, 17 without a border | 3, plus `bg-muted` 6 (its alias) | 10, 9 without a border, 4 of them **selected rows** |
| Fill foregrounds | `-contrast` for brand, danger, info, success only | `text-white dark:text-slate-900` on money fills | — | — |
| Undeclared `var(--…)` | guarded in its own source (`token-vars-declared.test.ts`); nothing shipped to apps | none | 1 library variable (Radix), 2 uses | `var(--surface)`: black boxes on a public page; fixed with a local guard (0ac3cb5) |

## 2. Decisions (Marcel, 2026-10-09)

All as recommended.

1. **k26, the well: light `--bg-surface-2` becomes the page colour in every preset;
   dark is unchanged** (§5.3). Surface-2 is documented as the "inset/well surface"
   (`tokens.css:178`) and fails that only in light: 1.02–1.05:1 against the card, where
   dark has 1.11–1.13. This fixes every site at once: the kit's zebra rows, Card `inset`,
   DataTable header bands and group rows, and KS's invisible selected rows. Nothing
   re-solves, because the page is already the surface every text role and money colour
   is audited against. A new `--bg-inset` role was not chosen: it changes nothing until
   each site moves, and the kit's own sites would have to move anyway, which is the same
   visual change.
2. **k23: no separate solid family.** Every fill gets its own `-contrast` foreground
   (§5.1), and fills keep the kit's dark-mode rule: a pastel fill under a dark label. A
   non-flipping `-solid` family would give dark mode two loud looks and collide with
   Chip `variant="solid"`. **keksdose's NOT_ACCEPTED red and UNCLEARED amber stay
   documented app exceptions** (§5.4).
3. **The light status colours that fail today are fixed** (§5.5):
   - darker light `--warning`, `--success`, `--hue-orange` and `--hue-teal` (as text
     their worst is 3.86–4.22:1);
   - a louder light `--danger-border-strong` (2.07:1, where its comment claims 3:1);
   - a darker `--status-edited` (2.45:1, claimed 3:1).

   It is a visual change in every app: slightly deeper status text and lines in light. A
   new test audits every `tokens.css` literal against every shipped preset; no test does
   that today.
4. **k25: role-scoped utility names** from one `@theme inline` block in `tokens.css`
   (§7): `text-muted`, `bg-surface`, `border-subtle` for `--border`, …; each name exists
   only for its own property. Not shadcn-style `--color-*` names (every name on every
   property, so `bg-muted` and `text-surface` would exist, and they would fight
   kastlan's own `--color-muted`/`--color-primary`), and not a prefix (`text-kit-muted`).
5. **The kit's own ~1,757 `[var(--…)]` classes stay.** A ratchet counts `[var(--role)]`
   wherever a utility exists and only lets the number fall; new or touched code uses the
   utilities (§7.4). A mechanical rewrite would change 262 class assertions in the kit's
   tests, and kk has 14 test files that assert `[var(--…)]` class strings, some possibly
   on kit-rendered markup.
6. **SwipeAction: a soft wash when idle, the solid fill and its `-contrast` when armed**
   (§6). Idle is the tone's wash under the tone's text (≥ 4.52:1; brand is the exception
   at 4.43–4.49 in three derived dark presets, the Chip brand soft pair's own edge).
   Armed is ≥ 5.02:1. Today's 60 % opacity on the whole panel leaves the label at
   2.38–4.52:1 on the kit's own panels. The icon disc, the size step, the bold label and
   the haptic tick stay as they are.
7. **The kit ships a guard against undeclared custom properties** (§8): every
   `var(--name)` an app's source uses without a fallback must be declared, in the kit's
   `tokens.css` or in the app's own CSS. KS's control diagram painted `var(--surface)`,
   a token that has never existed, and drew black boxes on a public page. KS caught it
   with a local vitest guard (0ac3cb5); the kit generalises it for all three apps.

Settled by the kit in this draft; the reviews may object:

8. **One foreground per fill**, named `<fill>-contrast`: `--warning-contrast`, the four
   `--money-*-contrast`, `--neutral-contrast`, and the five `--hue-*-contrast` (§5.1).
9. **`--money-*-contrast`** is `#ffffff` in light and `var(--bg-page)` in dark. Both are
   guaranteed by the existing money audit, which solves money to 4.5:1 against the page
   (§5.1).
10. **`--neutral` is `var(--text-muted)`**, with `--neutral-contrast:
    var(--text-inverse)`. No new colour is involved: this is the translation-review reset
    swipe's pair (`translation-review.tsx:807`), and More contrast steps it through
    `--text-muted`.
11. **`--warning-border-strong`** is `var(--warning)` in light and `#d97706` in dark,
    measured against danger's (§5.2).
12. **`SwipeAction.tone`** uses `StatusDotTone`, the vocabulary Chip, ProgressBar and
    StatusDot already share. `className`/`armedClassName` stay as a deprecated escape
    hatch, and the white label stays only on that path (§6).
13. **Utilities come from `@theme inline` in `tokens.css`.** The static
    `.text-brand/.bg-brand/.border-brand` become theme names, which gives them variants;
    `hover:bg-brand` generates nothing today. The money statics stay (§7).
14. **Chip `solid`, the FloatingAction badge and the kit's three swipe sites** take the
    new `-contrast` tokens. That fixes light Chip solid `warning` (4.24:1) and `orange`
    (4.38:1) (§5.1, §6).
15. **More contrast adds no new JS step.** The new roles follow their inputs (§5.6).
16. **The guard's shape** (§8.3): a pure function in a new `@eifi1/ui-kit/testing` entry
    point, run from each app's vitest suite over source texts the app's test collects.
    The kit's tokens, Tailwind's own theme variables and the app's own runtime writes
    count as declared; a library's runtime variables are listed by the app.

## 3. The roles today

### 3.1 Where they live

- **`tokens.css`** is the only stylesheet. Apps `@import` it after `tailwindcss`
  (README.md:114).
  - `@custom-variant dark` (`:31`); the `@theme` with `--text-micro`, `--text-caption`,
    `--breakpoint-3xl` (`:48-58`).
  - The text-size, breakpoint and `large:` / `xlarge:` / `contrast:` variants
    (`:60-173`).
  - A `:root` / `.dark` mirror of `DEFAULT_PRESET` (`:175-272`); the derived roles
    (`:285-318`); the status family (`:331-392`); media (`:399-404`); toast aliases
    (`:419-430`); the categorical hues (`:467-501`).
  - The unlayered static utilities `.text-money-*`, `.text-brand`, `.bg-brand`,
    `.bg-money-*`, `.border-brand` (`:506-519`).
- **`TokenSet`** (`src/theme/palette-presets.ts:20`) holds what follows a preset:
  surfaces, border, the three text roles, brand trio, money quartet, chart ramp, heat
  stops.
  - **`applyTokenSet`** (`:756`) writes them inline on `<html>`. That is why the
    `:root`/`.dark` mirror never paints those 46 values.
  - The selectable presets are `PALETTES` (`:726`): Default, Imprint (= Default except
    the chart ramp), Ink, Moss, Plum, High contrast. `ALTERNATIVE_PRESETS` is "a
    reference bank only" (`:466-468`) and was not measured.
- **More contrast** (`data-contrast="more"`) is stepped in JS, not CSS. `contrastStep`
  (`src/theme/contrast-tokens.ts:90`) moves:
  - `--text-muted` to the set's secondary;
  - `--text-secondary` halfway to primary;
  - `--text-placeholder` to the set's muted;
  - `--border` until it clears 3:1 against the worst surface.

  `applyTokenSet` applies the step; `reapplyContrastTokens` (`src/theme/contrast.ts:81`)
  does the same for an app without a palette layer. CSS only raises
  `--focus-ring-width` from 2 to 3 px (`tokens.css:69-74`). **Nothing else steps**:
  surfaces, brand, money, status, hues and field-sync colours are the same at both
  levels.
- **Dark mode** is `.dark` on `<html>`. Each preset carries a dark `TokenSet`; the
  `tokens.css` literals have a `.dark` block.
- The README's three layers (README.md:160-190) are Palette (inline), Derived
  (`color-mix`) and Semantic (literals, deliberately not per preset).

A note on the header comment (`tokens.css:14-17`): it says Tailwind v4 strips a `:root`
block that holds only custom properties. That is not what 4.3.3 does. The built showcase
CSS carries `--danger:#be123c`, `--bg-surface-2:#f3ead6` and
`:root[data-contrast=more]{--focus-ring-width:3px}`, and `check:tailwind` asserts the
last one (`scripts/check-tailwind-scan.mjs:34-60`). The palette values in that block are
live CSS; they are just beaten by the inline ones. The text-size contract repeats the
claim (§10.5 there); its rule, to test derived tokens in the built CSS, stays useful
either way.

### 3.2 Inventory

| Group | Tokens | Set by | Per preset | More contrast |
|---|---|---|---|---|
| Surfaces | `--bg-page` `--bg-surface` `--bg-surface-2` | TokenSet, inline | yes | — |
| Derived surfaces | `--bg-hover` (7 % ink into surface), `--bg-active` (12 %), `--bg-inverse` (= text-primary) | `color-mix` `tokens.css:294-300` | through inputs | — |
| Text | `--text-primary` | TokenSet | yes | — |
| | `--text-secondary` `--text-muted` | TokenSet | yes | stepped |
| | `--text-placeholder` | derived (`:289`), inline under More | through inputs | stepped |
| | `--text-inverse` (= surface) | derived | through inputs | — |
| Lines | `--border` | TokenSet | yes | stepped to ≥ 3:1 |
| | `--border-strong` (55 % border, 45 % ink) | derived | through inputs | follows `--border` |
| Brand | `--brand` `--brand-hover` `--brand-contrast` | TokenSet | yes | — |
| | `--brand-bg` `--brand-bg-hover` `--brand-muted` | derived | through inputs | — |
| Money | `--money-income` `--money-expense` `--money-net` `--money-neutral` | TokenSet | yes | — |
| Status (an action's consequence) | `--danger` `-hover` `-contrast` `-border` `-border-strong` `-bg`; `--warning` `-border` `-bg`; `--info` `-contrast` `-border` `-bg`; `--success` `-contrast` `-border` `-bg` | literals per mode | no | — |
| Field sync | `--status-synced/-pending/-edited/-error` | literals per mode | no | — |
| Categorical | `--hue-{blue,indigo,purple,teal,orange}` `-border` `-bg` | literals per mode | no | — |
| Media | `--media-ink` `--media-scrim` `--media-scrim-hover` | literals, the same in both modes | no | — |
| Toast | `--toast-*-bg/-border` (aliases), `--z-toast` | aliases | — | — |
| Chart | `--chart-1…9` (+ heat stops in JS) | TokenSet | yes | — |
| Focus | `--focus-ring-width` 2 px / 3 px | CSS | — | 3 px |

### 3.3 Gaps per tone

| tone | fill | `-hover` | `-contrast` | `-border` | `-border-strong` | wash (`-bg`) |
|---|---|---|---|---|---|---|
| danger | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| warning | ✓ | — | **missing (k24)** | ✓ | **missing (k27)** | ✓ |
| info | ✓ | — | ✓ (0.27) | ✓ | — | ✓ |
| success | ✓ | — | ✓ (0.26) | ✓ | — | ✓ |
| brand | ✓ | ✓ | ✓ | (`--brand`) | — | ✓ `--brand-bg` |
| money ×4 | ✓ | — | **missing (k22)** | — | — | — |
| hues ×5 | ✓ | — | missing | ✓ | — | ✓ |
| neutral | **none (k24)**: components improvise with `--text-muted`, `--bg-inverse`, `--bg-surface-2` | | | | | |

Where the kit improvises today:
- Chip `solid` writes `--text-inverse` on the warning, success, info, money and hue fills
  (`chip.tsx:159-173`); so does the FloatingAction badge (`floating-panel.tsx:654`).
- The translation-review reset swipe writes `--bg-surface` on `--text-muted`
  (`translation-review.tsx:807-808`).
- Card `toneStrength="strong"` borrows `--warning` as the missing strong line
  (`ui.tsx:3042-3046`).
- IconButton's warning tone draws its **focus ring in `--warning-border`**, amber-300, at
  1.11–1.13:1 in light (`ui.tsx:730-731`).

### 3.4 How Tailwind is set up, and what that allows

Probed with Tailwind 4.3.3's own compiler and the kit's `cn()` (§A).

- All four repos run Tailwind 4.3.3 with CSS-first config. The kit has no
  `tailwind.config`. `tokens.css` reaches each app's own Tailwind pass because the app
  `@import`s it, and the kit's `@theme` already works there: KS uses `text-caption`.
- The kit's class names reach the apps through `@source`: kk and KS scan
  `node_modules/@eifi1/ui-kit/dist`, ka scans `…/src`.
- **The static utilities in `tokens.css` take no variants.** A plain `.text-brand {}`
  gives `text-brand`, but `hover:text-brand`, `dark:text-brand` and `md:text-brand`
  generate nothing. No repo writes a variant on them today: 0 matches in the kit, the
  showcase and the three apps.
- **Property-scoped theme namespaces work in 4.3.3.** In an `@theme inline` block:
  - `--text-color-muted: var(--text-muted)` generates `text-muted` only. There is no
    `bg-muted`, `fill-muted` or `text-color-muted`.
  - `--background-color-*` generates only `bg-*`, `--border-color-*` only `border-*`
    (`border-x-*` and `border-t-*` too), and `divide-*` falls back to
    `--border-color-*`.
  - `--ring-color-*`, `--outline-color-*`, `--fill-*`, `--stroke-*`,
    `--placeholder-color-*`, `--caret-color-*`, `--accent-color-*`,
    `--text-decoration-color-*`, `--ring-offset-color-*` and `--box-shadow-color-*` each
    generate their own utility.
  - Variants work (`hover:`, `md:`), and so does opacity (`text-muted/60` becomes
    `color-mix(in oklab, var(--text-muted) 60%, transparent)`).
  - With `inline`, no `:root` variable is emitted, and nothing is generated until a
    class is used.
- **A static `@utility text-muted {}` takes no opacity modifier** (`text-muted/50`
  generates nothing). Beside a theme colour of the same name, both declarations are
  emitted.
- **The kit's `cn()`** (tailwind-merge plus the two font sizes) already treats
  `text-muted`, `bg-surface-2`, `border-subtle` and `border-danger-strong` as colours,
  and merges them against `text-sm`, `text-caption`, `border`, `border-2`, `divide-y`
  and arbitrary `[var(--…)]` classes correctly with no new config.

## 4. Measured

Five distinct presets × light/dark × standard/More contrast. Imprint equals Default here.
A range is the minimum to maximum across the presets. Dark washes (`rgba`) are composited
over `--bg-surface`.

### 4.1 Surfaces (k26)

| variant | surface-2 / surface | surface-2 / page | surface / page | hover / surface | active / surface | border / surface | muted on surface-2 |
|---|---|---|---|---|---|---|---|
| default light | **1.02** | 1.06 | 1.09 | 1.13 | 1.24 | 1.23 | 5.11 |
| default dark | 1.13 | 1.25 | 1.11 | 1.15 | 1.30 | 1.39 | 4.81 |
| ink light | 1.05 | 1.06 | 1.10 | 1.15 | 1.26 | 1.66 | 4.84 |
| ink dark | 1.11 | 1.21 | 1.08 | 1.11 | 1.23 | 1.67 | 4.59 |
| moss light | 1.05 | 1.06 | 1.11 | 1.15 | 1.26 | 1.66 | 4.87 |
| moss dark | 1.11 | 1.22 | 1.09 | 1.12 | 1.23 | 1.67 | 4.61 |
| plum light | 1.05 | 1.05 | 1.10 | 1.14 | 1.27 | 1.64 | 4.84 |
| plum dark | 1.11 | 1.21 | 1.09 | 1.12 | 1.23 | 1.67 | 4.60 |
| contrast light | 1.05 | 1.06 | 1.11 | 1.16 | 1.31 | 1.66 | 5.83 |
| contrast dark | 1.11 | 1.21 | 1.08 | 1.14 | 1.28 | 1.67 | 5.48 |

More contrast changes only the border column (to 3.27–4.85) and the text: muted on
surface-2 becomes 6.99–9.03. Default light surface-2/surface is 1.021 exactly; kk's
"~1.03" was rounding.

**A stronger fill costs muted-text contrast.** Mixing p % of `--text-primary` into the
surface gives this fill/surface ratio and `--text-muted` on the fill (standard
contrast):

| p | fill / surface | muted on fill (worst preset) |
|---|---|---|
| 5 % | 1.08–1.12 | 4.62 (ink, plum light) |
| 6 % | 1.10–1.14 | 4.50 (ink light) |
| 8 % | 1.14–1.19 | **4.33** (ink light), 4.36 (moss) |
| 10 % | 1.18–1.24 | **4.17** |
| 12 % | 1.23–1.31 | **4.01** |

So nothing past about 5 % keeps muted text at AA in the derived presets. Their muted
text is solved to 4.6:1 against the page, and in light 5 % lands on the page's own
lightness (fill/page 1.00–1.01). That is why §5.3 uses the page itself.

### 4.2 Fills and their foregrounds (k22–k24)

Light. The status literals are the same in every preset; text-inverse is each preset's
surface.

| fill | white | slate-900 | own `-contrast` | text-inverse | fill vs surface (non-text) |
|---|---|---|---|---|---|
| `--danger` #be123c | 6.29 | 2.84 | 6.29 | 5.31–5.39 | 5.31–5.39 |
| `--danger-hover` #9f1239 | 8.02 | 2.23 | 8.02 | 6.78–6.88 | — |
| `--warning` #b45309 | 5.02 | 3.56 | **none** | **4.24–4.31** | 4.24–4.31 |
| `--success` #047857 | 5.48 | 3.26 | 5.48 | 4.64–4.70 | 4.64–4.70 |
| `--info` #0369a1 | 5.93 | 3.01 | 5.93 | 5.02–5.09 | 5.02–5.09 |
| `--brand` (per preset) | 5.22–14.68 | 1.22–3.42 | 5.22–14.68 | 4.47–12.51 | — |
| `--money-income` | 5.81–6.93 | 2.58–3.08 | none | 4.94–5.91 | 4.94–5.91 |
| `--money-expense` | 5.78–5.87 | 3.04–3.09 | none | 4.96–5.00 | — |
| `--money-net` | 5.78–6.04 | 2.95–3.09 | none | 4.96–5.16 | — |
| `--money-neutral` | 5.47–5.88 | 3.04–3.26 | none | 4.67–5.02 | — |
| `--text-muted` (as a fill) | 5.94–7.16 | 2.49–3.01 | — | 5.06–6.10 | 5.06–6.10 |

Dark:

| fill | white | slate-900 | own `-contrast` | text-inverse | `--bg-page` |
|---|---|---|---|---|---|
| `--danger` #fda4af | **1.89** | 9.44 | 8.27 (#4c0519) | 9.08–9.49 | 10.06–10.30 |
| `--warning` #fcd34d | **1.44** | 12.38 | none | 11.91–12.44 | 13.19–13.50 |
| `--success` #6ee7b7 | **1.52** | 11.71 | 9.94 (#022c22) | 11.27–11.77 | 12.48–12.77 |
| `--info` #7dd3fc | **1.67** | 10.71 | 8.32 (#082f49) | 10.30–10.76 | 11.41–11.68 |
| `--brand` | 2.75–5.38 | 3.32–6.48 | 5.22–6.36 | 3.34–6.24 | 3.62–6.91 |
| `--brand-hover` | 2.02–4.17 | 4.28–8.83 | **4.07**–8.66 | 4.30–8.50 | 4.66–9.41 |
| `--money-income` | **2.20–3.58** | 4.98–8.12 | none | 5.00–7.81 | 5.43–8.65 |
| `--money-expense` | **1.99–3.57** | 5.00–8.98 | none | 5.00–8.64 | 5.44–9.57 |
| `--money-net` | 2.39–3.58 | 4.99–7.47 | none | 5.00–7.18 | 5.43–7.96 |
| `--money-neutral` | 2.46–2.56 | 6.98–7.25 | none | 6.71–7.25 | 7.44–7.89 |
| `--text-muted` (as a fill) | 2.94–3.51 | 5.09–6.07 | — | 5.12–6.10 | 5.55–6.61 |

What the tables show:
- In dark, every status fill and every money fill is unusable under white (1.4–3.6:1).
  This is k23 and k22, and kk's reason for `dark:text-slate-900`.
- Every fill has a foreground that clears AA in both themes. In light that is white; in
  dark it is the page or a 950 ink. Only the names are missing.
- Chip `solid` `warning` with `--text-inverse` is **4.24–4.31:1 in light**, below AA. kk
  uses exactly that pill at 9 px for its pending-invoice count
  (`transactions-page.tsx:580`).
- In the four derived dark presets, `--brand-contrast` (white) on `--brand-hover` is
  **4.07–4.17:1**. DataTable's armed brand swipe (`data-table.tsx:1207-1210`) and every
  hovered brand button sit at that ratio. The deriver lightens hover in dark
  (`palette-derive.ts:298`), and `auditPalette` checks the contrast against `brand`
  only.

### 4.3 Status colours as text and as lines (claims that do not hold)

Worst contrast against the light page, surface and surface-2, across the five presets:

| token | value | as | worst | claimed or needed |
|---|---|---|---|---|
| `--warning` | #b45309 | text (kit 18×, kk 32×, ka 3×) | **3.86** (page), 4.04 (surface-2), 4.24 (surface) | 4.5 |
| `--success` | #047857 | text (kit 24×, kk 4×, ka 2×) | **4.22** (page), 4.42 (surface-2) | 4.5 |
| `--info` | #0369a1 | text | 4.56 | 4.5 (holds) |
| `--hue-orange` | #c2410c | text (Chip soft/outline) | **3.98** | 4.5 |
| `--hue-teal` | #0f766e | text | **4.21** | 4.5 |
| `--danger-border-strong` | #fb7185 | invalid-field line, destructive focus ring | **2.07–2.11** | 3:1, "stays loud (WCAG 1.4.11's 3:1)" (`tokens.css:336-339`); holds only in dark (3.24–3.43) |
| `--warning-border` | #fcd34d | IconButton warning **focus ring** (`ui.tsx:730-731`) | **1.11–1.13** | 3:1 |
| `--status-edited` | #d97706 | a field's frame and icon | **2.45–2.73** | 3:1, "all four clear it" (`tokens.css:205-207`) |
| `--brand` (derived presets) | per preset | text (`text-[var(--brand)]`: kit 28×, kk 12×, KS 5×) | **3.00–3.06** dark (ink, moss, plum, contrast), 4.04–4.41 light (moss, ink) | 4.5. Solved to 3:1 by design (`palette-derive.ts` brand), used as text anyway |
| `--brand-muted` on `--brand-bg` | derived | Chip brand soft | 4.43–4.49 (plum, moss, ink dark) | 4.5 |
| `--money-neutral` | per preset | text (numpad, `numpad-sheet.tsx:218,224`) | 4.24–4.25 (ink, moss, plum, contrast light) | 4.5. Not in `auditPalette` |

**Why nothing caught these:** `palette-audit.test.ts:46` calls
`auditPalette(preset[mode])` without the semantic tokens, so no `tokens.css` literal is
ever measured against a preset surface. The cream and tinted grounds (page luminance
0.76–0.77, surface 0.84–0.85) are why Tailwind 700s that pass on white fail here.
`--money-expense` already went through this: amber-700 failed at 3.88 and was replaced by
#905902 (`tokens.css:192-194`). `--warning` is still amber-700.

The status lines and washes in light are 1.1–2.1:1 against the surfaces. That is fine for
the soft frames, which are decoration, and wrong for the two "strong" uses above.

### 4.4 Swipe panels today (k24)

The kit's own panels. At idle, the whole panel is at `opacity-60` over the card
(`swipeable-row.tsx:194`):

| panel | light armed | light idle | dark armed | dark idle |
|---|---|---|---|---|
| danger | 6.29 | **3.22–3.28** | 8.27 | **3.99–4.02** |
| success | 5.48 | **2.64–2.67** | 9.94 | 4.51–4.52 |
| info | 5.93 | **2.75–2.79** | 8.32 | **4.01–4.05** |
| brand | 5.22–14.68 | **2.49–4.24** | 4.07–6.36 | **3.14–3.55** |
| reset (`--text-muted` / `--bg-surface`) | 5.06–6.10 | **2.38–2.60** | 5.12–6.10 | **2.63–3.01** |

keksdose's palette curtains under the kit's white label. The light card is the
background; dark is the same, because these fills do not flip:

| fill | where | white on it | at idle (opacity-60, light card) |
|---|---|---|---|
| emerald-500 / -600 | FUND, add_transaction (`budget-swipe-plan.ts:22`, `accounts-page.tsx:780-781`) | **2.54** / **3.77** | 1.80 / 2.21 |
| sky-500 / -600 | RUN, reconcile (`transaction-swipe-plan.ts:24`, `accounts-page.tsx:787-788`) | **2.77** / **4.10** | 1.89 / 2.31 |
| slate-400 / -500 | UNASSIGN, archive | **2.56** / 4.76 | 1.71 / 2.36 |
| slate-500 / -600 | STEP_BACK, NOT_ACCEPTED curtain | 4.76 / 7.58 | 2.36 / 2.96 |
| rose-500 / -600 / -700 | DELETE, RULE_DELETE | **3.67** / 4.70 / 6.29 | 2.31 / 2.80 / 3.25 |
| violet-500 / -600 | GOAL | **4.23** / 5.70 | 2.31 / 2.79 |
| emerald-600 / -700 | CLEARED curtain (`cleared-status-toggle.tsx:188`) | **3.77** / 5.48 | 2.21 / 2.65 |
| amber-500 / -600 + slate-900 | UNCLEARED curtain (`:173`) | 8.31 / 5.60 | — |

The label is `text-xs`, or `text-sm font-semibold` when armed. Neither is large text, so
4.5:1 applies.

## 5. The new roles

### 5.1 Every fill names its foreground (k22, k24; §2.8–2.10, §2.14)

| token | light | dark | pair (minimum over the presets), light / dark |
|---|---|---|---|
| `--warning-contrast` | `#ffffff` | `#451a03` (amber-950) | on `--warning`: 6.03 (5.02 on today's #b45309) / 10.39 |
| `--money-income-contrast` | `#ffffff` | `var(--bg-page)` | 5.81 / 5.43 |
| `--money-expense-contrast` | `#ffffff` | `var(--bg-page)` | 5.78 / 5.44 |
| `--money-net-contrast` | `#ffffff` | `var(--bg-page)` | 5.78 / 5.43 |
| `--money-neutral-contrast` | `#ffffff` | `var(--bg-page)` | 5.47 / 7.44 |
| `--neutral` | `var(--text-muted)` | `var(--text-muted)` | vs surface (non-text): 5.06 / 5.12 |
| `--neutral-contrast` | `var(--text-inverse)` | `var(--text-inverse)` | on `--neutral`: 5.06 / 5.12; More contrast 7.59 / 7.79 |
| `--hue-blue-contrast` | `#ffffff` | `#172554` | 6.70 / 8.15 |
| `--hue-indigo-contrast` | `#ffffff` | `#1e1b4b` | 7.90 / 8.02 |
| `--hue-purple-contrast` | `#ffffff` | `#3b0764` | 6.98 / 8.48 |
| `--hue-teal-contrast` | `#ffffff` | `#042f2e` | 6.05 (5.47 on today's teal) / 9.78 |
| `--hue-orange-contrast` | `#ffffff` | `#431407` | 5.99 (5.18 on today's orange) / 9.28 |

Money per preset (`--money-*-contrast`):

| preset · mode | contrast | income | expense | net | neutral |
|---|---|---|---|---|---|
| default light | #ffffff | 6.93 | 5.81 | 6.04 | 5.88 |
| default dark | page #0e0f1c | 8.65 | 9.57 | 7.96 | 7.44 |
| ink light / dark | #ffffff / #090d15 | 5.81 / 5.43 | 5.87 / 5.44 | 5.86 / 5.44 | 5.51 / 7.86 |
| moss light / dark | #ffffff / #060f0a | 5.81 / 5.49 | 5.78 / 5.46 | 5.78 / 5.46 | 5.47 / 7.89 |
| plum light / dark | #ffffff / #100b12 | 5.88 / 5.44 | 5.87 / 5.45 | 5.86 / 5.44 | 5.52 / 7.80 |
| contrast light / dark | #ffffff / #0c0d0f | 5.81 / 5.43 | 5.87 / 5.44 | 5.84 / 5.43 | 5.51 / 7.84 |

- **Why money uses white and the page, and why that holds for any token set:** the
  deriver solves income, expense and net to 4.5:1 against the *worst* surface (the
  page), and `auditPalette` asserts it for every shipped preset.
  - In light, white is lighter than the page, so it does at least as well.
  - In dark, the page is the darkest surface, so it clears 4.5 by the same audit.
  - It is the `--brand-contrast` precedent ("the dark page, not indigo-950",
    `tokens.css:244`). kk's `dark:text-slate-900` would give 4.98 in the derived dark
    presets; the page gives 5.43.
  - `--money-neutral` is not audited today (§4.3), so the audit gains it.
- **Four money names, one value.** That matches the per-tone pattern and k22's own
  naming. It also leaves room for a preset whose money colours differ in lightness.
- **`--neutral` is a pair, not a new grey.** It is the reset swipe's improvisation made
  official. StatusDot, ProgressBar and Chip `dot` already paint "neutral" as
  `--text-muted`. Chip `solid neutral` stays `--bg-inverse` / `--text-inverse` (the
  count pill look), which is a different, louder thing.
- **Chip `solid`, the FloatingAction badge, the showcase money swatches** (which write
  `--brand-contrast` on money fills: `foundations.tsx:318-324`, 3.3:1 in derived dark
  presets) and **the kit's swipes** move to these tokens.

These are defined in `tokens.css`, as literals for warning and the hues and as `var()`
aliases for money and neutral. They are not in `TokenSet`, so no preset has to list them.

### 5.2 Lines: `--warning-border-strong` (k27) and the light danger line

| token | light | dark | worst of page / surface / surface-2 |
|---|---|---|---|
| `--warning-border-strong` (new) | `var(--warning)` | `#d97706` (amber-600) | light ≥ 4.6 with the new `--warning` (3.86–3.94 on today's); dark 4.78–5.06 |
| `--danger-border-strong` (§2.3) | `#fb7185` → **`#e11d48`** (rose-600) | `#e11d48` (unchanged) | light 2.07–2.11 → **3.61–3.69**; dark 3.24–3.43 |

- Light amber-600 would be only 2.45–2.50, which is why the light warning line is the
  warning text colour itself.
- Dark amber-600 is the same step as danger's dark rose-600, but sits higher (4.8 against
  3.3). Amber-400/-500 would shout (7–10:1), as Card `strong` does today with `--warning`
  at 13:1.
- Users of the new line:
  - Card `toneStrength="strong"` for warning (`ui.tsx:3042-3046`, which today borrows the
    text colour);
  - IconButton's warning focus ring (`ui.tsx:730-731`, 1.11:1 today);
  - kk's warning frames (`statement-review.tsx:501`, `categories-step.tsx:233`), where it
    wants a loud line.
- `--success-` and `--info-border-strong` are not added: nothing asks for them.

### 5.3 The well (k26, §2.1)

In every light `TokenSet`, `bgSurface2 = bgPage`. In the deriver,
`SURFACE_L.light.surface2 = SURFACE_L.light.page` (`palette-derive.ts:161`). Dark is
unchanged.

| preset (light) | surface-2 today → 0.33 | surface-2 / surface | muted on it | surface-2 / page |
|---|---|---|---|---|
| default | #f3ead6 → #ede3cf | 1.02 → **1.09** | 5.11 → 4.80 | 1.06 → 1.00 |
| ink | #e1e8f5 → #dce2ef | 1.05 → **1.10** | 4.84 → 4.59 | 1.06 → 1.00 |
| moss | #deece3 → #d8e6dd | 1.05 → **1.11** | 4.87 → 4.61 | 1.06 → 1.00 |
| plum | #ece4ef → #e7dfea | 1.05 → **1.10** | 4.84 → 4.62 | 1.05 → 1.00 |
| contrast | #e6e8ea → #e0e2e5 | 1.05 → **1.11** | 5.83 → 5.52 | 1.06 → 1.00 |

- A well on a card now stands out from the card by exactly as much as the card stands
  out from the page. Dark keeps 1.11–1.13.
- Every text role and every money colour is already audited at ≥ 4.5 against the page,
  so **nothing re-solves**. A 5 % ink mix gives the same ratios (1.08–1.12), but in the
  "contrast" preset it ends a hair darker than the page. It would then become the worst
  surface and push money text to 4.43.
- The derived heat stop `neutral` (= surface-2) follows.
- What changes, in light:
  - **kit:** the 49 surface-2 classes. Those without a border are Table zebra
    (`table.tsx:519`) and group rows (`:487`); DataTable `thead` and sticky header bands
    (`data-table.tsx:2256,2262,2330`), the mobile group header (`:2114`) and the sticky
    footer (`:745`); the MeasuredGrid head (`measured-grid.tsx:606`); Card `inset`
    (`ui.tsx:3181`); disabled and read-only fields (`ui.tsx:1559,1575,2479,2805`); Button
    `secondary`/`ghost` hover and IconButton muted hover (`ui.tsx:101,103,755`); numpad
    and calculator keys (`numpad-sheet.tsx:93-94`, `calculator.tsx:80-82`);
    mini-calendar cells (`mini-calendar.tsx:606,647`); feedback bubbles and badges
    (`feedback-thread.tsx:286`, `feedback-inbox.tsx:255-265`); the settings icon tile
    (`settings-layout.tsx:296`); ToggleGroup dimmed (`toggle-group.tsx:658`). Bordered
    sites (Button `primary`, chips, stepper) just gain a slightly deeper fill inside their
    border.
  - **kk:** 31 sites, 17 without a border: `scan-file-preview.tsx:473`,
    `guest-key-control.tsx:126`, the Disclosure headers `accounts-page.tsx:700` and
    `transactions-page.tsx:867`, `budget-table.tsx:54,564,579`,
    `budget-mobile-list.tsx:100,281`, `assistant-handoff.tsx:181`,
    `admin/assistant-panel.tsx:171`, `admin/support-panel.tsx:389`,
    `privacy-proof-card.tsx:362`, `matching-tab.tsx:554`, `price-shop-picker.tsx:559`
    (odd zebra).
  - **KS:** 10 sites. The **selected row** in `kinematics-tab.tsx:180`,
    `assemblies-tab.tsx:211`, `hystereses-tab.tsx:221` and `transmissions-tab.tsx:179` is
    invisible in light today (1.02). Also `export-panel.tsx:112`,
    `corner-guide.tsx:76,94`, `landing-visuals.tsx:160`, and the hover in
    `channel-picker.tsx:85`.
  - **ka:** `assistant-page.tsx:114,149` (chat bubbles), `landing-visuals.tsx:125`, and
    through its aliases `--muted`/`--secondary`/`--accent` → surface-2: `bg-muted` ×6,
    including the progress track `lease-timeline-card.tsx:79`.
- The cost: anything painted surface-2 *directly on the page* (Button `primary`, a band
  outside a card) goes from 1.05 to 1.00 against the page; its border carries it. Two
  tokens share a value in light, and the tokens.css mirror and the derived-presets test
  are regenerated.

### 5.4 Solid fills (k23, §2.2)

- No new family. The pairs in §5.1 cover every fill the kit has, and in dark they follow
  the kit's rule since 0.26: a pastel fill under its 950 ink, 8–12:1.
  - k23's "`--danger` in dark is unusable under white text" is answered by "don't put
    white on it: `text-danger-contrast`".
  - kk's NOT_ACCEPTED (`cleared-status-toggle.tsx:153`, red-800 / dark red-700 + white,
    8.31 / 6.47) is a hue choice: a red that is not the destructive rose, because the
    delete curtain on the same row is rose. It stays an app exception with its
    `eslint-disable`.
  - UNCLEARED (`:161`, amber-600/500 + slate-900, 5.60 / 8.31) stays an exception too.
    It could take `bg-warning text-warning-contrast` (light 6.03 with the new
    `--warning`; dark 10.39), but live #302 rejected amber-700 as "brick", so that is
    kk's call.
- **Not built:** a non-flipping family (`--danger-solid` #be123c / `-hover` #9f1239,
  `--success-solid` #047857, `--info-solid` #0369a1, `--neutral-solid` #475569, all
  under white: 6.29 / 8.02 / 5.48 / 5.93 / 7.58; `--warning-solid` #d97706 under
  `#12100e`, 5.96). In dark those white-label fills stand out from the surface by only
  2.3–3.3:1 (amber 5.4), and the `-solid` name collides with Chip `variant="solid"`,
  which means the flipping pair.

### 5.5 Status colours that clear AA (§2.3)

| token | today | 0.33 (same OKLCH hue and chroma, solved lightness) | worst after, light | white on it |
|---|---|---|---|---|
| `--warning` | #b45309 (3.86) | `#a34800` | 4.63 | 6.03 |
| `--success` | #047857 (4.22) | `#007152` | 4.63 | 6.03 |
| `--hue-orange` | #c2410c (3.98) | `#b43800` | 4.60 | 5.99 |
| `--hue-teal` | #0f766e (4.21) | `#006f68` | 4.65 | 6.05 |
| `--danger-border-strong` | #fb7185 (2.07) | `#e11d48` (rose-600) | 3.61 | — |
| `--status-edited` | #d97706 (2.45) | `#bf6800` (non-text, 3:1) | 3.11 | — |

- "Worst" means against the page, surface, surface-2 and the token's own wash, over all
  five light presets (the new surface-2 of §5.3 included).
- Dark values are unchanged: the dark status and hue text colours sit at 8–13:1, and
  dark `--danger-border-strong` at 3.24–3.43.
- The new light values are no longer Tailwind steps. Their comments record them as
  solved, as `--money-expense` #905902 already is.
- **The guard:** a test that runs every `tokens.css` literal pair through every preset ×
  mode × contrast level:
  - status text at 4.5 on page, surface, surface-2 and its wash;
  - fill / `-contrast` at 4.5;
  - `-border-strong` and `--status-*` at 3;
  - money neutral;
  - brand-contrast on brand-hover.

  Most of this is `auditPalette` with the semantic layer passed in.

Found while measuring, settled without a decision:
- **The deriver's dark brand hover:** it lightens hover while the contrast is white
  (4.07–4.17:1). Hover should move away from the contrast colour instead.
- **Brand used as text** in the derived presets is 3.00–3.06 in dark. The kit's text
  uses of `--brand` (Chip outline brand `chip.tsx:140`, link-current
  `button-group.tsx:181`, ChoiceCard `choice-card.tsx:256`) should read `--brand-muted`,
  which is 4.45–4.51 there and needs the same 4.5 floor in the deriver.
- **`feedback-swipe.tsx:82-86`** still says `--info` has no contrast token. It has had
  one since 0.27.

### 5.6 More contrast (§2.15)

- No new JS step. The neutral pair steps with `--text-muted` (7.59–11.93:1). The money,
  status and hue pairs are already 5–17:1. The well is a surface, which More contrast has
  never moved.
- A future step could raise the light well to a 10 % ink mix under More contrast: muted
  becomes secondary there, at ≥ 6.28:1 on it. Not part of this round.
- New derived roles in CSS are safe in 4.3.3 (§3.1); `check:tailwind` gains an assertion
  for each.

## 6. SwipeAction `tone` (k24, §2.6, §2.12)

```ts
export type SwipeTone = StatusDotTone; // brand | neutral | success | warning | danger | info
                                       // | income | expense | blue | indigo | purple | teal | orange
export type SwipeAction = {
  onCommit: () => void;
  label: string;
  icon?: ReactNode;
} & (
  | { /** The kit paints the panel: the tone's wash at idle, its fill and `-contrast` armed. */
      tone: SwipeTone; className?: never; armedClassName?: never }
  | { /** @deprecated 0.33 — pass `tone`. The label stays white unless these set a colour. */
      tone?: never; className: string; armedClassName: string }
);
```

| tone | idle: wash / text | armed: fill / text | light idle · armed | dark idle · armed |
|---|---|---|---|---|
| danger | `--danger-bg` / `--danger` | `--danger` / `--danger-contrast` | 5.72 · 6.29 | 8.58 · 8.27 |
| warning | `--warning-bg` / `--warning` | `--warning` / `--warning-contrast` | 4.84 · 5.02 | 10.98 · 10.39 |
| success | `--success-bg` / `--success` | `--success` / `--success-contrast` | 4.84 · 5.48 | 10.11 · 9.94 |
| info | `--info-bg` / `--info` | `--info` / `--info-contrast` | 5.17 · 5.93 | 9.15 · 8.32 |
| brand | `--brand-bg` / `--brand-muted` | `--brand` / `--brand-contrast` | 4.96 · 5.22 | 4.43 · 5.22 |
| neutral | `--bg-active` / `--text-secondary` | `--neutral` / `--neutral-contrast` | 6.04 · 5.06 | 6.07 · 5.12 |
| income / expense | `--bg-surface-2` / `--money-*` (Chip's soft money recipe) | `--money-*` / `--money-*-contrast` | 4.47 with the new well (4.72 before), inside the audit's 4.5 − 0.05 · 5.78 | 4.49 · 5.43 |
| blue, indigo, purple, teal, orange | `--hue-*-bg` / `--hue-*` | `--hue-*` / `--hue-*-contrast` | 4.52 (orange) – 6.41 · 5.18–7.90 | 7.94–10.82 · 8.02–9.78 |

All values are the minimum over the presets. Light warning, success, teal and orange are
measured on today's values; the darker ones of §5.5 only raise them (armed warning and
success become 6.03).
- Armed takes the plain fill, not `-hover`. The soft→solid step is the "it will fire"
  signal, and it avoids the derived dark presets' 4.07:1 brand-hover.
- The brand idle (4.43, plum dark) inherits the Chip brand soft pair's edge (§4.3).
- **The icon disc** (`swipeable-row.tsx:209`, `bg-white/25` / `bg-white/10`) becomes
  `bg-current/20` / `bg-current/10`. A white disc vanishes on a pastel dark fill, while
  the label's own colour works on every pair.
- **The kit's own sites:**
  - `data-table.tsx:1203-1210`: `tone: a.tone === "danger" ? "danger" : "brand"`.
  - `translation-review.tsx:778,794,807`: success; danger or brand; neutral.
  - `feedback-swipe.tsx:100,108,116`: info, success, danger.
- Every app's feedback inbox (kk, ka, KS all use `feedbackSwipePlan`) gets this without
  an edit.
- `text-white` (`swipeable-row.tsx:190`) stays only on the deprecated path. The ratchet's
  budget (`check-token-discipline.mjs:31`) keeps it until that path is removed.

## 7. Utility classes (k25, §2.4, §2.13)

### 7.1 Mechanism

One `@theme inline` block in `tokens.css`. Property-scoped namespaces mean each name
exists only for the property it belongs to:

```css
@theme inline {
  /* text-* */
  --text-color-primary: var(--text-primary);
  --text-color-secondary: var(--text-secondary);
  --text-color-muted: var(--text-muted);
  --text-color-placeholder: var(--text-placeholder);
  --text-color-inverse: var(--text-inverse);
  --text-color-danger: var(--danger);              /* … warning, success, info, hue-* */
  --text-color-danger-contrast: var(--danger-contrast); /* … every -contrast of §5.1 */
  /* bg-* */
  --background-color-page: var(--bg-page);
  --background-color-surface: var(--bg-surface);
  --background-color-surface-2: var(--bg-surface-2);
  --background-color-hover: var(--bg-hover);
  --background-color-danger: var(--danger);
  --background-color-danger-soft: var(--danger-bg);
  /* border-* (and divide-*, which falls back to --border-color-*) */
  --border-color-subtle: var(--border);
  --border-color-strong: var(--border-strong);
  --border-color-danger: var(--danger-border);
  --border-color-danger-strong: var(--danger-border-strong);
  /* ring-*, outline-*, fill-*, stroke-* as listed below */
}
```

- `inline` makes each utility read the role variable at the element, so a local override
  still works. No `:root` variable is emitted.
- An unused name costs nothing: Tailwind generates only what a scanned file uses.
- `hover:`, `md:`, `dark:` and `/60` work on all of them.

### 7.2 Names

The rule: a utility is the token's name with the property's own prefix dropped. A tone's
wash is `-soft` (Chip's variant name), and a tone's line is `border-<tone>`.

| property | names → token |
|---|---|
| `text-*` | `primary` `secondary` `muted` `placeholder` `inverse`; `danger` `warning` `success` `info`; `brand-muted`; `hue-{blue,indigo,purple,teal,orange}`; `<fill>-contrast` for brand, danger, warning, success, info, neutral, money-income/-expense/-net/-neutral, hue-* |
| `bg-*` | `page` `surface` `surface-2` `hover` `active` `inverse`; `brand` `brand-hover` `brand-soft` (`--brand-bg`) `brand-soft-hover`; `danger` `danger-hover` `warning` `success` `info` `neutral`; `danger-soft` `warning-soft` `success-soft` `info-soft` (`--*-bg`); `hue-*`, `hue-*-soft` |
| `border-*` / `divide-*` | `subtle` (`--border`) `strong` (`--border-strong`) `brand`; `danger` `warning` `success` `info` (`--*-border`); `danger-strong` `warning-strong`; `hue-*` |
| `ring-*` / `outline-*` | `brand` `strong` `danger-strong` `warning-strong` |
| `fill-*` / `stroke-*` | `primary` `secondary` `muted` (text roles), `surface`, `subtle` (border): for SVG, which KS draws |

- The money statics stay: `.text-money-pos/-neg/-net(-muted)` and
  `.bg-money-pos/-neg/-neutral` (kk uses them 52×, and `-muted` is an opacity, not a
  colour).
- `.text-brand`, `.bg-brand` and `.border-brand` move into the theme. They become layered
  and gain variants.
- `placeholder:text-placeholder` needs no namespace of its own.

### 7.3 Collisions

| where | what | effect |
|---|---|---|
| ka `@theme inline` (`app.css:66-102`) | `--color-primary` (= brand), `--color-secondary`, `--color-muted` (= surface-2), `--color-border`, … | **The role namespace wins for its property:** `text-primary` becomes ink instead of brand, and `text-secondary`/`text-muted` become text roles instead of the surface-2 colour. kastlan uses none of the three (0 matches). `bg-muted` (6), `border-border` (5), `text-muted-foreground` (108), `bg-primary`, `ring-primary` and `text-primary-foreground` are untouched. Recorded in ka's adoption notes. |
| Tailwind's own palette | `neutral` is a palette name | `text-neutral` / `bg-neutral` (no shade) coexist with `text-neutral-500`. **The kit's ratchet regex makes the shade optional** (`check-token-discipline.mjs:39-48`), so it would count `bg-neutral` and `text-neutral-contrast` as palette colours. It must require a shade for the `neutral` family. kk's lint already requires a digit (`eslint.config.js:48`). |
| Static classes | `.text-brand` etc. | Moved, not duplicated: both declarations would be emitted if both existed. |
| App CSS | kk `.txn-row-*`, `.hb-budget-shift`, `.demo-mode`; KS `.hb-figure`, `.fi-*` | none |
| Existing class strings | `bg-surface-2` in `ui.tsx:3003` and `buttons-surfaces.tsx:568`; `text-secondary` in kk `budget-table.tsx:53` | all three are in comments or prose; none renders |
| tailwind-merge | — | no config needed (§3.4) |

### 7.4 Guards

- **`check:tailwind`** asserts that one utility per namespace reaches the built showcase
  CSS (e.g. `.text-muted{color:var(--text-muted)}`). The property-scoped namespaces are
  less documented than `--color-*`, and a Tailwind release that drops one should fail
  CI.
- **A second ratchet** counts `[var(--role)]` classes wherever a utility exists, and only
  lets the number fall (§2.5).
- **kk's lint message** (`eslint.config.js:47`) names the utilities instead of the
  `[var(--…)]` forms.

## 8. Undeclared custom properties (§2.7, §2.16)

### 8.1 What happened

KS's control page draws a block diagram whose five boxes were
`fill-[var(--surface)] stroke-[var(--text-primary)]` (`control-basics.tsx:110` on
`main`). `--surface` has never existed; the kit's token is `--bg-surface`.

- A custom property that is not defined, read with no fallback, makes the whole
  declaration invalid at computed-value time. `fill` is inherited, so the boxes took
  their parent's value: black, from the root.
- In light the labels sat at about 2:1 on it, on a public page that opens this card by
  default, from the day the control engine landed until a headless render returned
  `rgb(0, 0, 0)` (KS refactor plan 2026-10, F79).
- Nothing else notices: the class compiles, the build passes, the type checker has no
  opinion. The kit guards its own source this way
  (`src/__tests__/token-vars-declared.test.ts`), but ships nothing an app can run.
- KS fixed it locally in 0ac3cb5 (branch `fix/control-diagram`; also on its
  `refactor/plan-2026-10`, not yet on `main`): `fill-[var(--bg-surface)]`, and a vitest
  guard, `src/app/css-variables.test.ts`, that reads every `var(--name)` without a
  fallback in `src` and requires the name to be declared in the kit's `tokens.css` or
  its `app.css`. It found exactly this one.

KS's guard, run unchanged over the other repos, is not enough for them:

| | KS rule as written | the kit's rules (§8.2) |
|---|---|---|
| keksdose | 22 hits | 0 |
| kastlan | 3 | 2 (one Radix variable; 0 once the app lists it) |
| Kurvenschmiede (after its fix) | 0 | 0 |
| the kit's own `src` | 24 | 0 |

The difference is three things KS's rule does not know: comments (kk 4, e.g.
`image-cropper.tsx:210` explains `calc(var(--app-nav-h) - 1px)` in prose), variables the
source writes itself (kk's `--tone-from`/`--tone-to`, set as style keys in
`budget-impact-toast.tsx:160-161` and read in `app.css:133-138`), and Tailwind's own
theme variables (kk's `sync-status-indicator.tsx`, 14 references such as
`var(--color-rose-500)`; ka's `gantt-chart.tsx:128` `var(--color-red-500)`).

### 8.2 The rule

A `var(--name)` with no fallback, in an app's non-test `.ts`, `.tsx` and `.css` source,
must name something declared. Declared means any of:

1. **The kit:** every name `tokens.css` declares, in any block and either mode, and every
   name the kit writes at runtime for apps to read.
   - Everything `applyTokenSet` and the More-contrast step write on `<html>` (surfaces,
     border, text, brand, money, `--chart-1…9`) is declared in `tokens.css` too, through
     the `:root`/`.dark` mirror. That holds in 0.32.2; from 0.33 a kit test asserts it.
   - The one runtime-only name the kit publishes is AppShell's measured `--app-nav-h`.
   - Component-internal variables the kit sets for its own classes (`--slider-fill`,
     `--fp-*`, `--line-items-cols`, `--icon-button-tone-*`, `--label-strip-edge*`) are
     not on the list. An app that reads one depends on internals, and the guard says so.
2. **The app's stylesheets:** every `--name:` in any `.css` it passes, in any block.
3. **The app's own runtime writes**, found in its source the way the kit's test finds
   them: `setProperty("--name"`, a React style key `"--name":`, and a Tailwind arbitrary
   property `[--name:…]`.
4. **Tailwind's own theme:** a name `tailwindcss/theme.css` declares. Tailwind 4.3.3
   marks a theme variable as used when a scanned file names it, and then emits it: kk's
   build carries `--color-rose-500`, ka's `--color-red-500`.
5. **A list the app passes** for a library's runtime variables, as names or patterns:
   ka's `--radix-collapsible-content-height` (`app.css:120,127`), or a ChartContainer
   series' `--color-<key>`.

Not counted:
- **Comments**: `//` and `/* */` in TS, `/* */` in CSS, stripped as the kit's own test
  and ratchet strip them.
- **A use with a fallback**, `var(--x, …)`: it says what happens when `--x` is missing.
  AppShell already tells apps to write `bottom-[var(--app-nav-h,0px)]`.
- **A name built at runtime** (`` `var(--chart-${n})` ``): a name must be followed by
  `)` or `,` to count. The kit asserts its own chart ramp separately; an app that builds
  names checks them itself.

What the guard does not judge: whether a declared token is the right one for the
property, and palette discipline. kk's `sync-status-indicator.tsx` palette variables
pass it, because they resolve; they are palette status colours that kk's lint cannot
see in a string (§9).

### 8.3 What the kit ships

A new entry point, **`@eifi1/ui-kit/testing`**. The 2026-09-22 module audit proposed it
for a chart test harness; this guard is its first content. Like the rest of the kit, it
is browser-safe code with no `node:fs`: the kit's own test reads its source through
`import.meta.glob`, and the guard takes texts, not paths.

```ts
/** Every custom property the installed kit declares or publishes to apps. */
export const KIT_CSS_VARIABLES: ReadonlySet<string>;

/** Every `var(--name)` without a fallback that nothing declares, as "path:line --name". */
export function undeclaredCssVariables(
  /** path → text: the app's .ts/.tsx/.css source, tests left out. */
  sources: Record<string, string>,
  options?: {
    /** Variables a library writes at runtime: names or patterns. */
    runtime?: readonly (string | RegExp)[];
  },
): string[];
```

- **The kit's tokens are built in.** `KIT_CSS_VARIABLES` is generated from `tokens.css`
  when the kit builds, plus `--app-nav-h`, so it is always the installed version's and
  an app never searches `node_modules`. KS's guard tries two relative paths for it; the
  kit sits in the repo root's `node_modules` in kk and KS, and in `frontend/node_modules`
  in ka.
- **Tailwind's theme names are built in too**, generated from the `tailwindcss/theme.css`
  the kit builds with (4.3.3, as all three apps).
- **`.css` entries in `sources` count as declarations** (rule 2) as well as uses.
- **It refuses a vacuous run:** it throws when `sources` holds fewer than ten files, or
  when a `.css` entry is empty. Vitest stubs every stylesheet with an empty string by
  default, `?raw` included; the kit had to opt `tokens.css` out
  (`vitest.config.ts:75-81`). An app reading its CSS the same way would otherwise lose
  every declaration and every use in it without a word: spurious failures for its own
  tokens, and nothing checked inside the stylesheet.
- **One implementation:** the kit's own `token-vars-declared.test.ts` calls the same
  function over the kit's source, so the two sets of rules cannot drift apart.

### 8.4 Wiring in an app

One test file, for example `src/app/css-variables.test.ts`. The app collects the texts
the way its setup allows:

- **`import.meta.glob`**, which needs only `vite/client` types (kastlan's app tsconfig
  has no others):

  ```ts
  import { expect, it } from "vitest";
  import { undeclaredCssVariables } from "@eifi1/ui-kit/testing";

  const sources = import.meta.glob<string>(
    ["/src/**/*.{ts,tsx,css}", "!/src/**/*.test.{ts,tsx}", "!/src/**/__tests__/**"],
    { query: "?raw", import: "default", eager: true },
  );

  it("reads no CSS variable that nothing declares", () => {
    expect(undeclaredCssVariables(sources)).toEqual([]);
  });
  ```

  with the app's stylesheets opted out of Vitest's stub:
  `test.css.include: [/src\/app\.css/]`.
- **`node:fs`**, as KS's guard reads today, in a test project that has node types
  (KS runs it in its DOM-free project). The helper is the same.

An app passes `runtime` only for a library's variables; its own writes are found in its
source.

## 9. Per repo

**keksdose**
- **k25:** 855 classes, mechanically:
  - `text-[var(--text-muted)]` → `text-muted` (422), `text-secondary` (97),
    `text-primary` (43), `text-placeholder` (7);
  - `border-[var(--border)]` → `border-subtle` (94), `divide-subtle` (24);
  - `text-warning` (32), `text-danger` (15), `text-brand` (12);
  - `bg-surface-2` (31), `bg-surface` (20), `bg-hover` (9), `bg-active` (8),
    `bg-brand` (8).

  Variants and `/opacity` carry over. Update the lint message.
- **k22:**
  - `cleared-status-toggle.tsx:184` CLEARED `bg-money-pos text-white
    dark:text-slate-900` → `bg-money-pos text-money-income-contrast`;
  - `:516` FUTURE `bg-money-neutral text-white dark:text-slate-900` →
    `bg-money-neutral text-money-neutral-contrast`.

  The `:515` exception goes, and the `:146` block shrinks to the two hue pills.
- **k23:** NOT_ACCEPTED `:153` and UNCLEARED `:161` stay documented exceptions, or
  UNCLEARED takes the warning pair (kk's call, §5.4).
- **k24:** the swipe plans take `tone`, and three `eslint-disable` blocks go
  (`accounts-page.tsx:772`, `budget-swipe-plan.ts:19`, `transaction-swipe-plan.ts:19`):

  | plan | tones |
  |---|---|
  | `transaction-swipe-plan.ts:22-25` | DELETE / RULE_DELETE → `danger`; RUN → `info`; STEP_BACK → `neutral` |
  | `budget-swipe-plan.ts:22-24` | FUND → `success` (or `income`); UNASSIGN → `neutral`; GOAL → `purple` |
  | `accounts-page.tsx:780-804` | `success`, `info`, `neutral` |
  | `STATUS_TONE` curtains `cleared-status-toggle.tsx:158,173,188` | `neutral`, `warning`, `income`; RECONCILED → `brand` |

  The principle "the curtain is the colour of the status it produces" survives, because
  the pills use the same tokens.
- **k26:** no edits; its 17 borderless surface-2 sites deepen by themselves.
- **k27:** `statement-review.tsx:501` and `categories-step.tsx:233` take
  `border-warning-strong` where the frame should be loud.
- **Chip `solid tone="warning"`** in `transactions-page.tsx:580` gets the new contrast
  automatically.
- **The guard (§8.4):** add the test. It finds nothing today: the comments are skipped,
  `--tone-from`/`--tone-to` are its own writes, and the 14 `var(--color-*)` references in
  `sync-status-indicator.tsx:70-106` (rose, amber, sky, emerald 500 / dark 400) are
  Tailwind theme variables that resolve. Those are palette status colours the lint
  cannot see in a string; they move to the status roles with k25 (which roles is kk's
  call).

**kastlan**
- **k25:**
  - `text-muted-foreground` → `text-muted` (108; same value, through its alias);
  - `text-foreground` → `text-primary` (6);
  - `bg-muted` → `bg-surface-2` (6);
  - `border-border` → `border-subtle` (5), or kept;
  - the 30 `[var(--…)]` classes.

  Keep the shadcn `@theme` for the Radix pieces that read it, and note that
  `text-primary` now means ink (§7.3).
- **Palette status text** → `text-success` / `text-warning` / `text-info` /
  `text-danger` / `text-hue-purple`: `changelog-page.tsx:34-42` (6 pairs),
  `import-page.tsx:250`, `gantt-chart.tsx:129,202`, and the today marker's
  `var(--color-red-500)` at `gantt-chart.tsx:128`.
- **Side findings:**
  - `app.css:39` `--border: var(--border);` is a self-reference. It is harmless only
    because the palette layer writes `--border` inline before first paint
    (`main.tsx:27`). Drop it.
  - `--destructive` dark `#ef4444` under white is 3.76:1. It is used once, as text;
    alias it to `--danger`.
- **The guard (§8.4):** add the test with
  `runtime: ["--radix-collapsible-content-height"]` (Radix writes it; `app.css:120,127`).
  Use the `import.meta.glob` wiring: the app tsconfig has only `vite/client` types.
- k22–k24, k26 and k27: nothing to do beyond following the kit. Its swipes are the kit's
  feedback plan.

**Kurvenschmiede**
- **k25:** 271 classes (`text-muted` 124, `text-primary` 59, `border-subtle` 26,
  `text-secondary` 21, `bg-surface-2` 10). SVG: `fill-primary` and `stroke-primary`.
- **The control diagram (§8.1):** 0ac3cb5 is local today and lands on `main` first. The
  k25 rewrite then turns its `fill-[var(--bg-surface)]` into `fill-surface`.
- **The guard:** once on 0.33, its own `css-variables.test.ts` becomes a call to
  `undeclaredCssVariables`. It may keep reading with `node:fs` in its DOM-free project.
- **Palette status text/icons** → `text-success` / `text-warning` / `text-danger`:
  `gear/common.tsx:148` and `checks-panel.tsx:32,34` (amber-500 is 1.84:1 on cream,
  below the 3:1 an icon needs), `account-menu.tsx:104`, `suggestions-table.tsx:65`,
  `gear-wizard.tsx:296,339`, `assemblies-tab.tsx:136`.
- **k26:** the four selected-row highlights become visible with no edit. `bg-active`
  would be louder still, if KS wants it.

## 10. What the kit adds (ui-kit 0.33)

- **Tokens:**
  - the `-contrast` set of §5.1;
  - `--neutral`;
  - `--warning-border-strong`;
  - the light value fixes of §5.5;
  - light surface-2 = page in every preset and in `SURFACE_L` (§5.3);
  - in the deriver, a dark brand hover that moves away from its contrast colour, and a
    4.5 floor for `--brand-muted` (§5.5).
- **Utilities:** the `@theme inline` block of §7, with the static brand classes moved
  into it.
- **Components:** `SwipeAction.tone` (and DataTable, TranslationReviewPanel and the
  feedback plan using it); Chip `solid`, the FloatingAction badge, Card `strong` and
  IconButton's warning ring on the new tokens; the kit's text uses of `--brand` on
  `--brand-muted` (§5.5).
- **Guards in the kit:**
  - `auditPalette` with the semantic layer, money neutral and brand-hover;
  - the `tokens.css` literal audit;
  - `check:tailwind` assertions for the new names and derived roles;
  - the second ratchet;
  - the `neutral` fix in the first ratchet;
  - the tokens.css mirror test updated.
- **The app guard:** `@eifi1/ui-kit/testing` with `undeclaredCssVariables` and
  `KIT_CSS_VARIABLES` (§8.3); the entry in `exports` and in the packaging checks; the
  kit's own `token-vars-declared.test.ts` on the same function.
- **Docs:**
  - README §Tokens (`README.md:160-190`) gains the utilities and the per-tone table of
    §3.3;
  - `docs/adopt-0.33.md` carries the class rewrite table of §9 (as a sed table, or an
    optional script) and the guard's wiring (§8.4);
  - the showcase foundations page shows every fill with its foreground;
  - the `tokens.css` header comment (§3.1) is corrected.

## 11. Risks

- **Visual change** (§2.1, §2.3): surface-2 sites and status text in light, in every app
  at once. The direction is always "more visible", but a reviewer will see it
  everywhere.
- **Property-scoped namespaces** are Tailwind's compatibility surface, not its headline
  API. The `check:tailwind` assertion is the guard.
- **kastlan's `text-primary`** changes meaning if someone writes it expecting shadcn's
  brand.
- **`color-mix` fallback:** the built CSS carries a no-`color-mix` fallback that keeps the
  *first* colour, so `--bg-hover` falls back to `var(--text-primary)` in old browsers
  (showcase CSS). Any new derived fill should name the surface first. The new well and
  the `var()` aliases have no mix at all.
- **k23 is answered, not built** (§2.2): kk's two hue pills stay exceptions, as intended.
- **The guard reads names, not meaning.** A declared token on the wrong property
  (`--border` as a fill) passes, and so does a name built at runtime.
- **Tailwind's theme names** come from the Tailwind the kit builds with. An app on a
  newer Tailwind may use a theme variable the kit does not know yet; it lists it in
  `runtime` until the kit catches up.
- **An app that reads its CSS through `?raw`** without opting it out of Vitest's stub
  would lose its stylesheet silently; the helper's empty-file check is the guard.

## A. Method

- **Contrast:** the kit's own colour code (`color.ts`, `contrastStep` from
  `contrast-tokens.ts`, the presets from `palette-presets.ts`), built from the 0.32.2
  source, and the literals parsed out of `tokens.css`. Derived roles were mixed exactly
  as `tokens.css` mixes them (OKLab, as `contrast-tokens.ts` does).
- **Presets:** the five distinct ones of `PALETTES` (Imprint = Default except the chart
  ramp; `ALTERNATIVE_PRESETS` not measured) × light/dark × standard/More contrast. Dark
  washes are composited over `--bg-surface`.
- **Tailwind palette candidates** use the v3 hex values. v4 paints OKLCH equivalents,
  which differ by up to about 0.1 in a ratio (kk measured amber-600 against slate-900 at
  5.5; this audit gives 5.60).
- **Tailwind behaviour** (§3.4, §7.3) was probed with Tailwind 4.3.3's compiler, and
  tailwind-merge through the kit's `cn()`.
- **Class counts** skip tests; comments inside class strings are counted.
- **Undeclared variables** (§8.1): KS's rule as committed in 0ac3cb5, and the rules of
  §8.2 modelled on the kit's `token-vars-declared.test.ts`, run over each app's
  `frontend/src` (keksdose `feat/kit-0.32`, kastlan `feat/paddle`, Kurvenschmiede
  `refactor/plan-2026-10`, which carries the fix) and the kit's `src`.
- The measuring scripts were throwaway and are not kept.
