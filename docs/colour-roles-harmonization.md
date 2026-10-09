# Colour roles — harmonisation plan

Status: **2026-10-09, decided; reviewed 2026-10-09.** Marcel took every recommendation
the same day (§2). All three apps reviewed it the same day; §12 records what they
settled, and it wins over the sections above where they differ. Where a section above was
wrong, it is corrected in place too. Led from ui-kit for the 0.33 round, and ships as
ui-kit 0.33.

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
| `[var(--…)]` colour classes (non-test) | 1,757 (`text-muted` 254) | 855 (`text-muted` **422**) | 33 (§12.4), plus 108 `text-muted-foreground` and 16 other shadcn names | 271 (`text-muted` 124) |
| Palette colours this round removes | 2 survivors in the ratchet, one is SwipeableRow's `text-white` | 5 `eslint-disable` blocks: 3 swipe plans, 2 status pills | 9 lines of status text, icon and marker colours (two of them Gantt fills, §12.4) | 8 lines of status text/icon colours |
| Swipes | `SwipeableRow`; DataTable row actions, feedback inbox, translation review paint their own fills | 2 direct `SwipeableRow`s, 4 swipe plans in palette mid-tones; TranslationReviewPanel `swipe` with its own bindings (`translations-page.tsx:307`) | the kit's `feedbackSwipePlan`; TranslationReviewPanel `swipe` (`translations-page.tsx:252`) | the kit's `feedbackSwipePlan`; TranslationReviewPanel `swipe` (`translations-page.tsx:284-288`, §12.6) |
| `--bg-surface-2` | 49 uses, ~29 without a border | 31, 17 without a border | 3, plus `bg-muted` 6 (its alias) | 10, 9 without a border, 4 of them **selected rows** (all on a table's card, §12.1) |
| Fill foregrounds | `-contrast` for brand, danger, info, success only | `text-white dark:text-slate-900` on money fills | — | — |
| Undeclared `var(--…)` | guarded in its own source (`token-vars-declared.test.ts`); nothing shipped to apps | none | 1 library variable (Radix), 2 uses | `var(--surface)`: black boxes on a public page; fixed with a local guard (0ac3cb5 on `fix/control-diagram`, 1193651 on `refactor/plan-2026-10`) |

## 2. Decisions (Marcel, 2026-10-09)

All as recommended.

1. **k26, the well: light `--bg-surface-2` becomes the page colour in every preset;
   dark is unchanged** (§5.3). Surface-2 is documented as the "inset/well surface"
   (`tokens.css:178`) and fails that only in light: 1.02–1.05:1 against the card, where
   dark has 1.11–1.13. This fixes every site at once: the kit's zebra rows, Card `inset`,
   DataTable header bands and group rows, and KS's invisible selected rows, which sit on
   the table's card (DataTable is framed by default; §12.1): 1.02 → 1.09. Nothing
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
   tests, and kk has 22 test files that name `[var(--…)]` class strings, some of them
   on kit-rendered markup (§12.7).
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
   with a local vitest guard (0ac3cb5; 1193651 on `refactor/plan-2026-10`, §12.5); the
   kit generalises it for all three apps.

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
    hatch, and the white label stays only on that path (§6). A documented app exception
    uses `paint` instead, which is not deprecated (§12.6).
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
  - **`applyTokenSet`** (`:756`) writes them inline on `<html>`. In an app with a
    palette layer (keksdose, kastlan), the inline values beat the `:root`/`.dark`
    mirror of those 46 values.
  - **In an app without one, the mirror is what paints** (§12.3). Kurvenschmiede calls
    no `applyTokenSet`: its palette layer was removed (feedback #34, `main.tsx:52-69`).
    Its More contrast steps from `contrastStep(DEFAULT_PRESET.light)`
    (`contrast.ts:81-93`). So k26 and §5.5 reach KS only through the regenerated mirror.
    The mirror equality test (`src/theme/__tests__/tokens-css-mirror.test.ts`) is
    load-bearing and stays. Its "the stylesheet is INERT" header (`:4-21`) is corrected.
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
live CSS. In an app with a palette layer the inline ones beat them; in KS they are what
paints (§12.3). keksdose's `deploy/gcp/Caddyfile.cloudrun:68-70` repeats the claim
(§12.8). The text-size contract repeats the
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
    (`ui.tsx:3181`); disabled and read-only fields (`ui.tsx:1559,1575,2479,2805`); numpad
    and calculator keys (`numpad-sheet.tsx:93-94`, `calculator.tsx:80-82`);
    mini-calendar cells (`mini-calendar.tsx:606,647`); feedback bubbles and badges
    (`feedback-thread.tsx:286`, `feedback-inbox.tsx:255-265`); the settings icon tile
    (`settings-layout.tsx:296`); ToggleGroup dimmed (`toggle-group.tsx:658`). Bordered
    sites (Button `primary`, chips, stepper) just gain a slightly deeper fill inside their
    border. The hover fills of Button `secondary`/`ghost`, IconButton muted
    (`ui.tsx:101,103,755`) and the feedback inbox's idle filter chip
    (`feedback-inbox.tsx:464`) leave surface-2 for `--bg-hover` (B′, §12.1).
  - **kk:** 31 sites, 17 without a border: `scan-file-preview.tsx:473`,
    `guest-key-control.tsx:126`, the Disclosure headers `accounts-page.tsx:700` and
    `transactions-page.tsx:867`, `budget-table.tsx:54,564,579`,
    `budget-mobile-list.tsx:100,281`, `assistant-handoff.tsx:181`,
    `admin/assistant-panel.tsx:171`, `admin/support-panel.tsx:389`,
    `privacy-proof-card.tsx:362`, `matching-tab.tsx:554`, `price-shop-picker.tsx:559`
    (odd zebra).
  - **KS:** 10 sites, all on a card. The **selected row** in `kinematics-tab.tsx:180`,
    `assemblies-tab.tsx:211`, `hystereses-tab.tsx:221` and `transmissions-tab.tsx:179` sits
    on the table's card (a framed DataTable, §12.1) and is invisible in light today
    (1.02 → 1.09). So are the thead and sticky bands of KS's five tables. Also
    `export-panel.tsx:112`, `corner-guide.tsx:76,94`, `landing-visuals.tsx:160`, and the
    hover in `channel-picker.tsx:85`.
  - **ka:** `assistant-page.tsx:114,149` (chat bubbles, on the page), `landing-visuals.tsx:125`,
    and through its aliases `--muted`/`--secondary`/`--accent` → surface-2: `bg-muted` ×6,
    including the progress track `lease-timeline-card.tsx:79`.
- **The cost, measured** (k26 re-measured after KS 1–2, §12.1). Every app table is
  framed or inside a Card, so no table band sits on the page. What does sit on the page
  goes from 1.05–1.06 to 1.00 against it:
  - kastlan's two user chat bubbles and two `Card variant="inset"` on wizard steps:
    four lines in kastlan (§12.1);
  - the kit's hover fills of Button `secondary`/`ghost` and IconButton muted: B′ moves
    them to `--bg-hover` (§12.1);
  - Button `primary` on the page keeps only its border (1.13 in Default, 1.49–1.50 in
    the derived presets);
  - a `frame={false}` table placed straight on the page would lose its band (none exists
    in the three apps).

  A row that rests on surface-2 and hovers with `--bg-hover` loses its hover: 1.09–1.11
  today, 1.04–1.05 under B. §12.2 sets the rule for it. Two tokens share a value in
  light, and the tokens.css mirror and the derived-presets test are regenerated.

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
    `bg-warning text-warning-contrast` would pass (light 6.03 with the new `--warning`;
    dark 10.39), but the new light `--warning` #a34800 is darker than the amber-700 that
    live #302 rejected as "brick" (kk 2). Its swipe curtain keeps the pill's own fill
    through `SwipeAction.paint` (§12.6).
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
      tone: SwipeTone; paint?: never; className?: never; armedClassName?: never }
  | { /** A documented app exception (§12.6): the app's own fill and the foreground on it,
          as CSS colours or var()s. Idle: a 14 % wash of the fill under --text-primary;
          armed: the fill under the foreground. */
      paint: { fill: string; foreground: string };
      tone?: never; className?: never; armedClassName?: never }
  | { /** @deprecated 0.33 — pass `tone`, or `paint` for an exception. Kept for back-compat.
          The label stays white unless these set a colour. */
      tone?: never; paint?: never; className: string; armedClassName: string }
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
  an edit. So does every app's translation review: all three pass `swipe` to
  TranslationReviewPanel (kk `translations-page.tsx:307`, ka `:252`, KS `:284-288`).
- **`paint`** (§12.6) follows the same idle/armed rule for an app's documented
  exception. keksdose's UNCLEARED, DELETE and RULE_DELETE curtains use it.
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
| `text-*` | `primary` `secondary` `muted` `placeholder` `inverse`; `danger` `warning` `success` `info`; `brand-muted`; `hue-{blue,indigo,purple,teal,orange}`; `<fill>-contrast` for brand, danger, warning, success, info, neutral, money-income/-expense/-net/-neutral, hue-*; `media-ink` (§12.4) |
| `bg-*` | `page` `surface` `surface-2` `hover` `active` `inverse`; `brand` `brand-hover` `brand-soft` (`--brand-bg`) `brand-soft-hover`; `danger` `danger-hover` `warning` `success` `info` `neutral`; `danger-soft` `warning-soft` `success-soft` `info-soft` (`--*-bg`); `hue-*`, `hue-*-soft`; `media-scrim` `media-scrim-hover` (§12.4) |
| `border-*` / `divide-*` | `subtle` (`--border`) `strong` (`--border-strong`) `brand`; `danger` `warning` `success` `info` (`--*-border`); `danger-strong` `warning-strong`; `hue-*`; `media-ink` (§12.4) |
| `ring-*` / `outline-*` | `subtle` (§12.4) `brand` `strong` `danger-strong` `warning-strong`; `media-ink` (ring only, §12.4) |
| `fill-*` / `stroke-*` | `primary` `secondary` `muted` (text roles), `surface`, `subtle` and `strong` (border, `strong` added in §12.4): for SVG, which KS draws |

No `text-*` names for the border roles: an SVG that strokes in `currentColor` takes
`stroke-subtle` / `stroke-strong` instead (§12.4).

- The money statics stay: `.text-money-pos/-neg/-net(-muted)` and
  `.bg-money-pos/-neg/-neutral` (kk uses them 52×, and `-muted` is an opacity, not a
  colour).
- `.text-brand`, `.bg-brand` and `.border-brand` move into the theme. They become layered
  and gain variants.
- `placeholder:text-placeholder` needs no namespace of its own.

### 7.3 Collisions

| where | what | effect |
|---|---|---|
| ka `@theme inline` (`app.css:66-103` at b3adb8f) | `--color-primary` (= brand), `--color-secondary`, `--color-muted` (= surface-2), `--color-border`, … | **The role namespace wins for its property:** `text-primary` becomes ink instead of brand, and `text-secondary`/`text-muted` become text roles instead of the surface-2 colour. kastlan uses none of the three (0 matches). `bg-muted` (6), `border-border` (5), `text-muted-foreground` (108), `bg-primary`, `ring-primary` and `text-primary-foreground` are untouched. Recorded in ka's adoption notes. |
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
- KS fixed it locally in 0ac3cb5, which is on branch `fix/control-diagram` only.
  `refactor/plan-2026-10` carries the same fix as 1193651. Neither is on `main` yet. The
  fix is `fill-[var(--bg-surface)]`, and a vitest
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

1. **The kit:** every name `tokens.css` declares, in any block and either mode, **except
   names declared only in an `@theme inline` block** (§12.5). With `inline`, Tailwind
   emits no variable (§3.4), so `var(--text-color-muted)` would pass and paint nothing.
   The names of the plain `@theme` (`--text-micro`, `--text-caption`,
   `--breakpoint-3xl`) count: Tailwind emits them when they are used.
   - Everything `applyTokenSet` and the More-contrast step write on `<html>` (surfaces,
     border, text, brand, money, `--chart-1…9`) is declared in `tokens.css` too, through
     the `:root`/`.dark` mirror. That holds in 0.32.2; from 0.33 a kit test asserts it.
   - The one runtime-only name the kit publishes, AppShell's measured `--app-nav-h`, is
     **not** declared (§12.5). AppShell sets it only while it is mounted, so on a
     landing, legal, sign-in or pay page it is undefined. An app reads it in the
     fallback form, `var(--app-nav-h,0px)`, as all seven kit reads already do. With
     `checkFallbacks` (§8.3) that form is accepted.
   - Component-internal variables the kit sets for its own classes (`--slider-fill`,
     `--fp-*`, `--line-items-cols`, `--icon-button-tone-*`, `--label-strip-edge*`) are
     not on the list. An app that reads one depends on internals, and the guard says so.
2. **The app's stylesheets:** every `--name:` in any `.css` it passes, in any block.
3. **The app's own runtime writes**, found in its source the way the kit's test finds
   them: `setProperty("--name"`, a React style key `"--name":`, and a Tailwind arbitrary
   property `[--name:…]`.
4. **Tailwind's own theme:** a name `tailwindcss/theme.css` declares. Tailwind 4.3.3
   marks a theme variable as used when a scanned file names it, and then emits it: kk's
   build carries `--color-rose-500`, ka's `--color-red-500`. With `refusePalette`
   (§8.3, §12.5), the palette colours among them (`--color-<hue>-<shade>`,
   `--color-black`, `--color-white`) are reported instead.
5. **A chart series' colour:** a `--color-<key>` that is not a Tailwind theme name
   counts as declared in a file that has a `<key>: {` entry. The kit's ChartContainer
   writes one per key of its `config` (`chart.tsx:134-155`). This is keksdose's rule,
   taken over (§12.5).
6. **A list the app passes** for a library's runtime variables, as names or patterns:
   ka's `--radix-collapsible-content-height` (`app.css:120,127`).

Not counted:
- **Comments**: `//` and `/* */` in TS, `/* */` in CSS, stripped as the kit's own test
  and ratchet strip them.
- **A use with a fallback**, `var(--x, …)`: it says what happens when `--x` is missing.
  AppShell already tells apps to write `bottom-[var(--app-nav-h,0px)]`. With
  `checkFallbacks: true` these are checked too, and `--app-nav-h` counts there (§12.5).
- **A name built at runtime** (`` `var(--chart-${n})` ``): a name must be followed by
  `)` or `,` to count. The kit asserts its own chart ramp separately; an app that builds
  names checks them itself.

What the guard does not judge: whether a declared token is the right one for the
property, and palette discipline unless the app asks for it (`refusePalette`, §12.5).
kk's `sync-status-indicator.tsx` palette variables pass by default, because they
resolve. They are deliberate palette shades that kk's lint cannot see in a string
(§9, §12.8).

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
    /** Also check `var(--x, …)`. `--app-nav-h` counts only here. Default false. */
    checkFallbacks?: boolean;
    /** Report Tailwind palette variables (`--color-red-500`, …) although they resolve. Default false. */
    refusePalette?: boolean;
  },
): string[];
```

- **The kit's tokens are built in.** `KIT_CSS_VARIABLES` is generated from `tokens.css`
  when the kit builds. It leaves out the `@theme inline` names and `--app-nav-h`
  (§8.2 rule 1), and a kit test pins both sides: `--text-muted` and `--text-caption` are
  in, while `--text-color-muted`, `--background-color-surface` and `--app-nav-h` are out.
  So it is always the installed version's, and an app never searches `node_modules`.
  KS's guard tries two relative paths for it; the kit sits in the repo root's
  `node_modules` in kk and KS, and in `frontend/node_modules` in ka.
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
  - `text-warning` (32), `text-danger` (15), `text-brand` (12), `text-success` (4),
    `text-info` (2), `text-brand-contrast` (1);
  - `bg-surface-2` (31), `bg-surface` (20), `bg-hover` (9), `bg-active` (8),
    `bg-brand` (8), `bg-brand-soft` (3), `bg-warning-soft` / `bg-info-soft` /
    `bg-danger-soft` (2 each), `bg-success-soft` (1);
  - `border-warning` / `border-info` (2 each), `border-success` / `border-brand` /
    `border-strong` (1 each); `ring-brand` (1), `outline-brand` (1);
  - `--media-ink` (5, §12.4): `text-media-ink` (`camera-capture.tsx:206,235`),
    `border-media-ink` (`image-cropper.tsx:155,188`, `scan-file-preview.tsx:136` at
    `/80`);
  - `text-[var(--money-income)]` (2: `tour-menu.tsx:62`, `tours-page.tsx:307`) → the
    static `text-money-pos` (§12.4).

  That is all 855 (kk 14 found 33 the first count left out). Variants and `/opacity`
  carry over. Update the lint message. Tests: only assertions on app markup are
  rewritten (§12.7).
- **k22:**
  - `cleared-status-toggle.tsx:184` CLEARED `bg-money-pos text-white
    dark:text-slate-900` → `bg-money-pos text-money-income-contrast`;
  - `:516` FUTURE `bg-money-neutral text-white dark:text-slate-900` →
    `bg-money-neutral text-money-neutral-contrast`.

  The `:515` exception goes, and the `:146` block shrinks to the two hue pills.
- **k23:** NOT_ACCEPTED `:153` and UNCLEARED `:161` stay documented exceptions.
  UNCLEARED cannot take the warning pair: light `--warning` #a34800 is darker than the
  amber-700 that live #302 rejected as "brick" (kk 2, §12.6).
- **k24:** the swipe plans take `tone`, or `paint` for the three documented exceptions
  (§12.6). Three `eslint-disable` blocks go (`accounts-page.tsx:772`,
  `budget-swipe-plan.ts:19`, `transaction-swipe-plan.ts:19`):

  | plan | tones |
  |---|---|
  | `transaction-swipe-plan.ts:22-25` | DELETE → `paint` rose-600 + white; RULE_DELETE → `paint` rose-700 + white (two strengths, kept); RUN → `info`; STEP_BACK → `neutral` |
  | `budget-swipe-plan.ts:22-24` | FUND → `success` (or `income`); UNASSIGN → `neutral`; GOAL → `purple` |
  | `accounts-page.tsx:780-804` | `success`, `info`, `neutral` |
  | `STATUS_TONE` curtains `cleared-status-toggle.tsx:158,173,188` | NOT_ACCEPTED → `neutral`; UNCLEARED → `paint` amber-600 + slate-900 (the pill's own fill); CLEARED → `income`; RECONCILED → `brand` |

  kk declares the three paint pairs once, as its own variables in `app.css`, and passes
  the `var()`s; the guard counts them (§8.2 rule 2). The principle "the curtain is the
  colour of the status it produces" survives: the token pills use the same tokens, and
  UNCLEARED's armed curtain is still exactly its pill's fill.
- **k26:** no edits for the wells; its 17 borderless surface-2 sites deepen by
  themselves. Three hover edits (§12.2): the Disclosure headers `accounts-page.tsx:700`
  and `transactions-page.tsx:867` change `hover:bg-[var(--bg-hover)]` to
  `hover:bg-surface`; `admin/support-panel.tsx:389` adds `hover:bg-surface` to the
  header while the thread is open. B′ restores the on-page hover of its ghost buttons
  (PageHeader fold toggles, month navigation, `budget-page.tsx:341-375`).
- **k27:** `statement-review.tsx:501` and `categories-step.tsx:233` take
  `border-warning-strong` where the frame should be loud.
- **Chip `solid tone="warning"`** in `transactions-page.tsx:580` gets the new contrast
  automatically.
- **The guard (§8.4, §12.5):** keksdose already has a stricter one,
  `frontend/src/shared/components/__tests__/design-tokens.test.ts` (cc1443db). So the
  step is "replace or keep alongside", not "add". The replacement is
  `undeclaredCssVariables(sources, { checkFallbacks: true })`, and it finds nothing
  today:
  - the comments are skipped;
  - `--tone-from`/`--tone-to` are its own writes;
  - its 2 fallback uses are declared;
  - the 14 `var(--color-*)` references in `sync-status-indicator.tsx:70-106` (rose,
    amber, sky, emerald 500 / dark 400) are Tailwind theme variables that resolve, and
    kk leaves `refusePalette` off.

  Those shades are deliberate (`sync-status-indicator.tsx:53-55`: the kit's
  `--warning`/`--success` are a shade darker than the chip has always been). Moving them
  to status roles is optional, not a to-do (kk 16).

**kastlan**
- **k25:**
  - `text-muted-foreground` → `text-muted` (108; same value, through its alias);
  - `text-foreground` → `text-primary` (6);
  - `bg-muted` → `bg-surface-2` (6);
  - `border-border` → `border-subtle` (5), or kept;
  - the 33 `[var(--…)]` classes (§12.4), all with a utility. The two without one in the
    first draft: `ring-[var(--border)]` → `ring-subtle` (new) and
    `bg-[var(--text-primary)]` → `bg-inverse` (`landing-visuals.tsx:65,67`).

  Keep the shadcn `@theme` for the Radix pieces that read it, and note that
  `text-primary` now means ink (§7.3; kastlan confirms 0 uses of `text-`/`fill-`/`stroke-`
  primary, secondary or muted).
- **Palette status text** → `text-success` / `text-warning` / `text-info` /
  `text-danger` / `text-hue-purple`: `changelog-page.tsx:34-42` (6 pairs),
  `import-page.tsx:250`.
- **The Gantt today marker:** `gantt-chart.tsx:129` (legend swatch) and `:202` (the line)
  are `bg-red-500` → `bg-danger`; `:128` `color: "var(--color-red-500)"` →
  `"var(--danger)"`.
- **Side findings:**
  - `app.css:39` `--border: var(--border);` is a self-reference. It is harmless only
    because the palette layer writes `--border` inline before first paint
    (`main.tsx:27`). Drop it.
  - `--destructive` dark `#ef4444` under white is 3.76:1. It is used once, as text;
    alias it to `--danger`.
- **The guard (§8.4):** add the test with
  `runtime: ["--radix-collapsible-content-height"]` (Radix writes it; `app.css:120,127`)
  and, once `gantt-chart.tsx:128` is on `--danger`, `refusePalette: true`.
  Use the `import.meta.glob` wiring: the app tsconfig has only `vite/client` types.
- **k26 (§12.1):** four lines. The user chat bubbles `assistant-page.tsx:114,149` →
  `bg-surface`; the `Card variant="inset"` on the page at `lease-unit-step.tsx:76` and
  `payment-allocate-step.tsx:143` → `variant="outline"`. `lease-picker-step.tsx:126`
  keeps its border.
- k22–k24 and k27: nothing to do beyond following the kit. Its swipes are the kit's
  feedback plan and translation review.

**Kurvenschmiede**
- **k25:** 271 classes (§12.4):
  - `text-muted` 124, `text-primary` 59, `border-subtle` 26, `text-secondary` 21,
    `bg-surface-2` 10;
  - `text-brand` 5, `bg-surface` 5, `text-placeholder` 3, `divide-subtle` 3;
  - SVG: `fill-primary` 3, `stroke-primary` 2, `fill-muted` 1, `fill-surface` 1 (the
    control diagram);
  - `ring-brand`, `border-brand`, `bg-brand`, `bg-page` 1 each;
  - `plan-view.tsx:194,202` `text-[var(--border-strong)]` and `:211,219`
    `text-[var(--border)]`, which only feed `stroke="currentColor"` → `stroke-strong` and
    `stroke-subtle`, with the `stroke` attribute dropped.
- **GRID_INK** (`shared/charts/series-chart.tsx:4-5`, palette slate-300/80 and dark
  slate-600/50) → `[&_.recharts-cartesian-grid_line]:!stroke-subtle`, one class for both
  modes (measured in §12.4).
- **The control diagram (§8.1):** the fix (0ac3cb5 on `fix/control-diagram`, 1193651 on
  `refactor/plan-2026-10`) lands on `main` first. The k25 rewrite then turns its
  `fill-[var(--bg-surface)]` into `fill-surface`.
- **The guard:** once on 0.33, its own `css-variables.test.ts` becomes a call to
  `undeclaredCssVariables` with `refusePalette: true`. That closes its `@theme inline`
  hole: it reads every `--name:` in `tokens.css` (`:36-37`). It may keep reading with
  `node:fs` in its DOM-free project.
- **Palette status text/icons** → `text-success` / `text-warning` / `text-danger`:
  `gear/common.tsx:148` and `checks-panel.tsx:32,34` (amber-500 is 1.84:1 on cream,
  below the 3:1 an icon needs), `account-menu.tsx:104`, `suggestions-table.tsx:65`,
  `gear-wizard.tsx:296,339`, `assemblies-tab.tsx:136`.
- **k26:** the four selected-row highlights sit on the table's card and become visible
  with no edit (1.02 → 1.09). They stay on surface-2: `--bg-active` fails AA under their
  muted cells (4.20 in Default, §12.1). Their hover keeps the fill and draws an outline:
  `rowClassName` adds `hover:bg-surface-2 hover:outline hover:-outline-offset-1
  hover:outline-strong` (§12.2).

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
  into it, and the names §12.4 adds: `fill-strong`/`stroke-strong`,
  `ring-subtle`/`outline-subtle`, `text-`/`border-`/`ring-media-ink`,
  `bg-media-scrim(-hover)`.
- **Components:**
  - `SwipeAction.tone` (and DataTable, TranslationReviewPanel and the feedback plan
    using it), and `SwipeAction.paint` (§12.6);
  - Chip `solid`, the FloatingAction badge, Card `strong` and IconButton's warning ring
    on the new tokens; the kit's text uses of `--brand` on `--brand-muted` (§5.5);
  - B′: the hover fills of Button `secondary`/`ghost`, IconButton muted and the feedback
    inbox's idle filter chip on `--bg-hover` (§12.1);
  - the hover rule (§12.2): Table zebra rows `even:hover:bg-surface`;
    the calculator's digit keys hover on `--bg-active`;
  - `--border` no longer a fill under text (§12.9): Button `primary`'s hover, the
    calculator and numpad accent keys, and the numpad digit's pressed state on
    `--bg-active`.
- **Guards in the kit:**
  - `auditPalette` with the semantic layer, money neutral and brand-hover;
  - the `tokens.css` literal audit;
  - `check:tailwind` assertions for the new names and derived roles;
  - the second ratchet;
  - the `neutral` fix in the first ratchet;
  - the tokens.css mirror test updated. It is load-bearing for KS (§12.3); its header
    comment is corrected.
- **The app guard:** `@eifi1/ui-kit/testing` with `undeclaredCssVariables` and
  `KIT_CSS_VARIABLES` (§8.3), with `checkFallbacks`, `refusePalette` and the chart-key
  rule (§12.5); a test pinning that `@theme inline` names and `--app-nav-h` are not in
  `KIT_CSS_VARIABLES`; the entry in `exports` and in the packaging checks; the kit's own
  `token-vars-declared.test.ts` on the same function.
- **Docs:**
  - README §Tokens (`README.md:160-190`) gains the utilities and the per-tone table of
    §3.3;
  - `docs/adopt-0.33.md` carries the class rewrite table of §9 (as a sed table, or an
    optional script), scoped to app markup and its tests (§12.7). It also carries:
    - the guard's wiring (§8.4);
    - the hover rule (§12.2);
    - the reminder that DataTable `frame={false}` and `Card variant="inset"` belong
      inside a card (`data-table.tsx:519-524`, `ui.tsx:3000-3001`);
  - the showcase foundations page shows every fill with its foreground;
  - the `tokens.css` header comment (`:14-17`, §3.1) is corrected: the mirror is live
    CSS, and it is what paints in an app without a palette layer.

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
  (`--border` as a fill) passes, and so does a name built at runtime. The kit had that
  exact case itself (§12.9).
- **`paint` is an escape hatch the kit cannot measure.** Each app pins its own pairs in
  its tests, as keksdose already does for its status pills.
- **Two lists of hover fills:** a row on a well hovers to the card, a row on a card to
  `--bg-hover` (§12.2). An app that paints its own rest colour has to pick the hover
  itself; the kit cannot see it.
- **Tailwind's theme names** come from the Tailwind the kit builds with. An app on a
  newer Tailwind may use a theme variable the kit does not know yet; it lists it in
  `runtime` until the kit catches up.
- **An app that reads its CSS through `?raw`** without opting it out of Vitest's stub
  would lose its stylesheet silently; the helper's empty-file check is the guard.

## 12. Settled after the reviews (2026-10-09)

All three apps reviewed this contract (358f10d) the same day: kastlan point 9 (**ka 9**),
Kurvenschmiede colour roles 1–8 (**KS 1**…), keksdose 2–5 and 14–16 (**kk 2**…). The
reviews and the k26 re-measurement are kept outside the repo
(`audits/round-033/reviews.md`, `audits/round-033/k26-options.md`). Where this list and
the sections above differ, this list wins. Where a section above was wrong, it is
corrected in place too.

1. **k26 stands: light `--bg-surface-2` = page (decision 1), plus B′.**
   - **KS 1 and KS 2 are refuted.** The kit's DataTable is framed by default:
     `frame = true` (`data-table.tsx:1113`). The framed root is the kit's flush Card on
     `--bg-surface` (`FramedRoot`, `:2808-2814`); KS's installed 0.32.2 dist has the same
     (`dist/components/data-table.js:857`). KS passes `frame={false}` nowhere.
   - So KS's four selected rows (`transmissions-tab.tsx:179`, `hystereses-tab.tsx:221`,
     `kinematics-tab.tsx:180`, `assemblies-tab.tsx:211`) sit on the table's card, not on
     the page. So do the thead and sticky bands of its five tables (with
     `sessions-page.tsx:203`). In the Default mirror KS paints they go **1.02 → 1.09:
     visible**. The review's 1.06 → 1.00 is what a `frame={false}` table placed straight
     on the page would get, and no such table exists in the three apps.
   - Nothing is struck from §2.1 or §5.3; their text now says "on the table's card".
   - **KS's selected rows stay on surface-2.** `--bg-active`, KS's proposed fix and
     §9's earlier "louder still", fails AA under the rows' own text: muted is 4.20 on it
     in Default (4.01–4.67 across presets), money 3.79–4.77, status 3.87–4.32. Their
     hover is item 2.
   - **Where surface-2 sits:** on a card at KS 10 of 10 sites, kk 32 of 32 and ka 7 of 12.
     Every kit table in the three apps is framed or inside a Card. Only four borderless
     wells sit on the page, all in kastlan.
   - **B′, kit (4 lines).** The hover fills of Button `secondary` (`ui.tsx:101`),
     `ghost` (`:103`), IconButton muted (`:755`) and the feedback inbox's idle filter
     chip (`feedback-inbox.tsx:464`) move from `--bg-surface-2` to `--bg-hover`.
     tokens.css documents that role for "a hovered row, menu item or icon button"
     (`tokens.css:291-294`).
     - On a card that gives 1.13–1.16 (B alone 1.09–1.11); on the page 1.04–1.05 (B
       alone 1.00; today 1.05–1.06).
     - That keeps kk's on-page ghost buttons where they are today (kk 5): PageHeader
       fold toggles and month navigation, `budget-page.tsx:341-375`.
   - **B′, kastlan (4 lines, at b3adb8f):**
     - the user chat bubbles `assistant-page.tsx:114,149` → `bg-surface`: 1.09 against
       the page, and every role passes on it;
     - `Card variant="inset"` on the page at `lease-unit-step.tsx:76` and
       `payment-allocate-step.tsx:143` → `variant="outline"`. The kit's doc already rules
       out an inset card on the page (`ui.tsx:3000-3001`);
     - `lease-picker-step.tsx:126` keeps its border.
   - **C stays rejected** (a well one step darker than the page), re-measured. Muted
     falls to 4.33–4.37, money to 4.22–4.31, five status colours to 4.31–4.49 and
     `--status-edited` to 2.93–3.00, with 0 % headroom in the derived presets.

2. **The hover of a row that rests on surface-2 (kk 5).**
   - **The cases.** Under B such a row rests on the page colour, and `--bg-hover` sits
     only 1.04–1.05 from it (1.09–1.11 today):
     - keksdose's Disclosure headers `accounts-page.tsx:700` and
       `transactions-page.tsx:867`;
     - its open support thread, `admin/support-panel.tsx:389`, whose header hovers with
       the kit's default (`disclosure.tsx:356,363`);
     - the kit's Table zebra rows (`table.tsx:519-520`) and calculator digit keys
       (`calculator.tsx:80`);
     - KS's selected rows under DataTable's row hover (`data-table.tsx:2484`).
   - **Dark already has the problem today:** surface-2 and `--bg-hover` are both lighter
     than the card by about the same step, so the hover is 1.00–1.02.
   - **The rule:** a hover differs from its rest by at least **1.08:1**, and every text
     role on it stays at **4.5:1**, the audit's floor (which accepts 4.45). 1.08 is the
     smallest card-to-page step the kit ships (dark Ink and High contrast; light is
     1.09–1.11), the step people already read as two surfaces.
   - **Measured.** Each cell gives the step from the rest, then the worst text role on
     the hover; ↓ marks a value under 4.45. For the outline it gives the line against
     the rest; the text is the rest's.

     | preset | `--bg-hover` | `--bg-active` | 7 % ink into the well | **`--bg-surface`** | outline `--border-strong`, standard · More |
     |---|---|---|---|---|---|
     | Default light | 1.04 · 4.40 ↓ | 1.14 · 3.99 ↓ | 1.13 · 4.03 ↓ | **1.09 · 4.96** | 2.54 · 4.71 |
     | Ink light | 1.04 · 4.30 ↓ | 1.14 · 3.91 ↓ | 1.14 · 3.91 ↓ | **1.10 · 4.94** | 3.37 · 5.57 |
     | Moss light | 1.04 · 4.32 ↓ | 1.14 · 3.92 ↓ | 1.14 · 3.92 ↓ | **1.11 · 4.96** | 3.36 · 5.51 |
     | Plum light | 1.04 · 4.34 ↓ | 1.15 · 3.91 ↓ | 1.14 · 3.94 ↓ | **1.10 · 4.96** | 3.37 · 5.55 |
     | High contrast light | 1.05 · 4.25 ↓ | 1.18 · 3.79 ↓ | 1.17 · 3.83 ↓ | **1.11 · 4.95** | 3.95 · 7.11 |
     | dark, all five | 1.00–1.02 · 4.40–4.70 ↓ | 1.11–1.15 · 3.91–4.17 ↓ | 1.14–1.17 · 3.86–4.10 ↓ | **1.11–1.13 · 4.95–5.42** | 3.73–4.36 · 5.98–7.40 |

     - The values are the same at both contrast levels: More contrast moves no surface,
       and the worst roles (money, status, brand-muted) do not step. Only the outline
       changes.
     - In light the worst role is money: expense in Default, income in Ink and High
       contrast, net in Moss and Plum. In dark it is muted in Default, and income, net
       or brand-muted elsewhere.
     - The rest itself is 4.47–4.56 in light and 4.45–4.81 in dark, hence the 4.45
       floor.
     - Money-neutral is apart (§4.3): 4.24–4.25 on the light page itself, 4.67–5.02 on
       the card. The 0.33 audit re-solves it.
   - **A well row hovers to the card: `hover:bg-surface`.** It is the only fill that
     clears both halves, in every preset, both modes and both contrast levels. In both
     modes the hover moves from the well to the card, the direction that gains contrast.
     In light, every fill darker than the well fails the text half, because the page is
     already the darkest surface the text roles are solved against (§4.1). In dark, the
     same holds for every fill lighter than the well.
   - **A row whose surface-2 marks a state keeps its fill under the pointer and draws an
     outline** (KS's selected rows). The card colour would read as "not selected". The
     outline is a 1 px inside line in `--border-strong`:
     `hover:bg-surface-2 hover:outline hover:-outline-offset-1 hover:outline-strong`.
     It is an outline, not a box-shadow, because a shadow on a `<tr>` is not painted by
     every engine (`data-table.tsx:2485-2487`).
   - **Where it lands:**
     - kit: Table zebra rows take `even:hover:bg-surface`, which outranks
       the row's `hover:` fill. The calculator's digit keys carry only `text-primary`,
       so they may go darker: `--bg-active`, 1.14–1.18 light and 1.11–1.15 dark from
       the key, with primary ≥ 7.15 on it.
     - keksdose: the three headers above (§9).
     - KS: the four `rowClassName` strings (§9).
     - The kit cannot see an app's own rest colour, so `adopt-0.33.md` states the rule.
   - **B′'s on-page hover is under this bar** (1.04–1.05): item 10.

3. **The `:root`/`.dark` mirror is load-bearing (KS 3).** Kurvenschmiede calls no
   `applyTokenSet` and no `useApplyPalette`: its palette layer was removed (feedback #34,
   `main.tsx:52-69`). So the mirror is what KS paints, and k26 and §5.5 reach KS only
   through the regenerated mirror plus `DEFAULT_PRESET`.
   - §3.1 is corrected: the inline values beat the mirror only in an app with a palette
     layer.
   - The mirror equality test (`src/theme/__tests__/tokens-css-mirror.test.ts`) stays.
     Its INERT header (`:4-21`) and `tokens.css:14-17` are corrected in the 0.33 build.

4. **The utility set, completed (KS 4, kk 14, ka 9).**
   - **`fill-*` / `stroke-*` gain `strong`** (`--border-strong`).
   - **No `text-*` for the border roles.** KS's `plan-view.tsx:194,202`
     (`text-[var(--border-strong)]`) and `:211,219` (`text-[var(--border)]`) set
     `currentColor` only to feed `stroke="currentColor"`. They take `stroke-strong` and
     `stroke-subtle`, and the attribute goes.
   - **GRID_INK** (`shared/charts/series-chart.tsx:4-5`) → `!stroke-subtle`, not KS's
     proposed `stroke-strong/80`. Measured in Default (the mirror KS paints), against
     card / page:

     | grid ink | light | dark | light, More contrast |
     |---|---|---|---|
     | today, slate-300/80 · dark slate-600/50 | 1.20 / 1.13 | 1.47 / 1.49 | 1.20 / 1.13 |
     | **`stroke-subtle`** | **1.23 / 1.13** | **1.39 / 1.53** | **3.27 / 3.01** |
     | `stroke-strong/80` | 2.18 / 2.05 | 3.26 / 3.51 | 3.42 / 3.23 |
     | the kit's default grid, `--border` at 70 % (`chart.tsx:77`) | 1.15 / 1.09 | 1.25 / 1.32 | 2.18 / 2.08 |

     - `stroke-subtle` keeps today's weight within 0.08.
     - It stays darker than the kit's own grid, which is what feedback #84 asked for.
     - It follows More contrast, which the palette literals never did.
     - `stroke-strong/80` would nearly double the grid, close to a data line.
   - **`ring-*` / `outline-*` gain `subtle`** (`--border`), for ka's
     `ring-[var(--border)]` (`landing-visuals.tsx:65`).
   - **ka's `bg-[var(--text-primary)]`** (`landing-visuals.tsx:67`, the QR glyph's dark
     cells) → `bg-inverse`, which is `var(--text-primary)` by definition
     (`tokens.css:300`).
   - **ka's `gantt-chart.tsx:129,202` are `bg-red-500` fills**, not text → `bg-danger`.
     `:128` `var(--color-red-500)` → `var(--danger)`.
   - **Media:** `--media-ink` gains `text-media-ink`, `border-media-ink` and
     `ring-media-ink`; `--media-scrim(-hover)` gains `bg-media-scrim(-hover)`. That maps
     kk's five uses (`camera-capture.tsx:206,235` text; `image-cropper.tsx:155,188` and
     `scan-file-preview.tsx:136` border, one at `/80`). The kit's own shutter can use them
     too (`ui.tsx:820`).
   - **Money:** the statics cover kk's two `text-[var(--money-income)]`
     (`tour-menu.tsx:62`, `tours-page.tsx:307`, a done check with no variant):
     `.text-money-pos` is `var(--money-income)` (`tokens.css:506`). If the check means
     "done" rather than money, `text-success` is the role; that is kk's call. Decision 13
     stands: no money theme names this round, so a site that needs a variant keeps the
     `[var()]` form.
   - **kk 14's other 26** all have utilities in §7.2 and are now mapped in §9:
     - `text-success` 4, `text-info` 2, `text-brand-contrast` 1;
     - `bg-brand-soft` 3, `bg-warning-soft` / `bg-info-soft` / `bg-danger-soft` 2 each,
       `bg-success-soft` 1;
     - `border-warning` / `border-info` 2 each, `border-success` / `border-brand` /
       `border-strong` 1 each;
     - `ring-brand` 1, `outline-brand` 1.
   - **Counts:**
     - **ka: 33 classes, not 30**: `border-subtle` 7, `text-primary` 6 (3 under a
       variant), `text-secondary` 4, `text-warning` 3, `bg-surface-2` 3, `text-success` 2,
       `bg-surface` 2, `text-danger` 1, `ring-subtle` 1, `focus-visible:ring-brand` 1,
       `bg-inverse` 1, `bg-brand` 1, `bg-page` 1. Its `@theme inline` is `app.css:66-103`,
       and ka confirms §7.3: no `text-`/`fill-`/`stroke-` primary, secondary or muted.
     - **KS: 271**, with the breakdown §9 now lists in full. Added: `text-brand` 5,
       `bg-surface` 5, `text-placeholder` 3, `divide-subtle` 3, `fill-muted` 1,
       `fill-surface` 1, `ring-`/`border-`/`bg-brand` 1 each, `bg-page` 1, and the four
       plan-view lines.
     - **kk: 855 with `text-muted` 422**, as kk verified.

5. **The guard (§8).**
   - **KS 5:** `KIT_CSS_VARIABLES` leaves out names declared only in `@theme inline`
     (`--text-color-muted`, `--background-color-surface`, …), pinned by a kit test.
     Tailwind emits no variable for them, so `var(--text-color-muted)` would pass and
     paint nothing, F79's failure again. KS's own guard has the same hole: it reads
     every `--name:` in `tokens.css` (`css-variables.test.ts:36-37`). The hole closes
     when KS moves to the kit's function.
   - **KS 6, `--app-nav-h`:** it leaves the declared list. AppShell sets it only while
     mounted (`app-shell.tsx:302,314`; KS's dist `app-shell.js:44-53`), so on a landing,
     legal, sign-in or pay page it is undefined.
     - Apps use the fallback form `var(--app-nav-h,0px)`. All seven kit reads already
       do, and no app reads it bare (keksdose's one hit is a comment).
     - In the kit's own run, AppShell's `setProperty` counts as a write.
   - **KS 6, palette names:** a new option, `refusePalette`, reports Tailwind palette
     variables (`--color-<hue>-<shade>`, `--color-black`, `--color-white`) even though
     they resolve.
     - KS turns it on: it has no palette lint, and this test is its only refusal.
     - ka turns it on after `gantt-chart.tsx:128`.
     - kk leaves it off (item 8).
   - **kk 4, keksdose's stricter guard:**
     `frontend/src/shared/components/__tests__/design-tokens.test.ts` (cc1443db). It also
     checks uses with a fallback, counts the names the kit's dist JS writes as declared,
     and checks each `var(--color-<key>)` against a chart config key in the same file.
     So §9 says "replace or keep alongside". The kit takes two of the three, so keksdose
     can replace its guard without losing coverage:
     - **`checkFallbacks: true`** also checks `var(--x, …)`, and `--app-nav-h` counts
       there. It is off by default, because a fallback says what happens when the name
       is missing. keksdose's 2 fallback uses pass.
     - **The chart-key rule is built in** (§8.2 rule 5). The kit's own ChartContainer
       writes `--color-<key>` per config key (`chart.tsx:134-155`). This replaces the
       `runtime` pattern the draft asked apps to pass.
     - **Not taken: the kit's dist-JS names.** They only widen what passes (component
       internals such as `--icon-button-tone` and `--fp-*`), which §8.2 rule 1 keeps out
       on purpose. Under the kit's rules keksdose has 0 hits without a fallback (§8.1)
       and 0 with one, so it loses nothing.

     keksdose replaces its file with
     `undeclaredCssVariables(sources, { checkFallbacks: true })`, or keeps both; that is
     its call.
   - **KS 7:** 0ac3cb5 is on `fix/control-diagram` only. `refactor/plan-2026-10` carries
     the same fix as 1193651, and neither is on `main` yet (§1, §2.7, §8.1, §9 corrected).

6. **Swipes (§6).**
   - **kk 2.** A `warning` curtain for UNCLEARED breaks keksdose's pinned rule, "the
     armed curtain IS the pill's own fill" (amber-600 + slate-900, live #268/#302;
     `cleared-status-toggle.test.tsx:156,292-307`, `transaction-swipe-plan.test.ts:104-106`).
     The pill cannot move to `--warning` either: light #a34800 is darker than the
     amber-700 that #302 rejected as "brick". And DELETE (rose-500 → 600) and RULE_DELETE
     (rose-600 → 700) are two strengths on purpose (`transaction-swipe-plan.ts:22-23`);
     `danger` would collapse them.
   - **`SwipeAction` gains `paint: { fill: string; foreground: string }`**, not
     deprecated, beside `tone`, for a documented app exception (type in §6).
     - The values are CSS colours or `var()`s, the same in both themes, unless the app
       passes a variable it declares per theme in its own stylesheet (the guard counts
       it, §8.2 rule 2).
     - The kit applies them as inline custom properties on the panel.
     - The `className`/`armedClassName` path stays deprecated, for back-compat only.
   - **The idle/armed rule applies to `paint`.** Idle is a wash of the fill,
     `color-mix(in oklab, <fill> 14%, var(--bg-surface))`, the `--brand-bg` recipe
     (`tokens.css:313`), under `--text-primary`. Armed is `<fill>` under `<foreground>`.
     The icon disc follows the label (`bg-current/20`, §6).
   - **The idle label is the ink, not the fill.** A mid-tone fill as text on its own
     wash is 2.39–4.77 (amber-600 in light: 2.39). The `--brand-muted` recipe, 70 % fill
     into the ink, still fails: UNCLEARED in light 3.36–3.99, RULE_DELETE in dark
     4.02–4.49.
   - **keksdose's three**, over every preset, both modes and both contrast levels:

     | `paint` | wash vs card, light / dark | label (`--text-primary`) on the wash | armed fill vs wash, light / dark | foreground on the fill |
     |---|---|---|---|---|
     | UNCLEARED: amber-600 `#d97706` + slate-900 | 1.13 / 1.18–1.19 | 7.83–12.71 | 2.39–2.42 / 4.52–4.77 | 5.60 |
     | DELETE: rose-600 `#e11d48` + white | 1.18 / 1.13–1.15 | 7.53–12.77 | 3.36–3.40 / 3.19–3.38 | 4.70 |
     | RULE_DELETE: rose-700 `#be123c` + white | 1.21–1.22 / 1.10–1.11 | 7.27–13.07 | 4.37–4.42 / 2.46–2.59 | 6.29 |

     - For scale: the kit's status washes stand 1.02–1.14 from the card, and
       `--brand-bg` 1.12–1.33.
     - UNCLEARED's armed curtain is still exactly its pill's light fill.
     - The two deletes keep their strengths, armed 4.70 against 6.29.
     - The kit cannot measure an app's paint, so the app's tests pin it (§11).
   - **KS 8:** KS also renders TranslationReviewPanel with `swipe`
     (`translations-page.tsx:284-288`). So do kk (`:307`, its own bindings) and ka
     (`:252`). The panel's swipes take `tone` in the kit, so all three get the new look
     without an edit (§1, §6 corrected).

7. **The adopt-0.33 migration for tests (kk 3).**
   - **Rewrite assertions on app markup only.** A test that asserts a kit component's
     classes keeps the kit's `[var(--…)]` form, because the kit's own classes stay
     (decision 5). Example: `shared/components/__tests__/ui.test.tsx:304-331`, the kit
     Input's `[&[readonly]]:bg-[var(--bg-surface-2)]`. The sed table is scoped by path,
     and the tests of kit components are listed and left alone.
   - **keksdose has 22 test files** that name a `[var(--…)]` class, not 14 (kk: about
     20; decision 5 corrected).
   - **`.not.toContain` / `.not.toMatch` pass vacuously after a rewrite** (kk counts 7).
     Each is rewritten to the new form, then checked to fail against the old code, or
     paired with a positive assertion.
   - **`cleared-status-toggle.test.tsx:274-289`** lets a pill skip its `dark:`
     foreground only when it matches `text-[var(--…-contrast)]`. After k22/k25, CLEARED
     is `text-money-income-contrast` and RECONCILED `text-brand-contrast`, so the
     exemption must accept the utility form too:
     `/(?:^|\s)text-(?:\[var\(--[a-z-]+-contrast\)\]|[a-z-]+-contrast)(?=\s|$)/`.

8. **Comments and optional work (kk 15, kk 16).**
   - keksdose's `deploy/gcp/Caddyfile.cloudrun:68-70` repeats "Tailwind v4 strips a bare
     `:root` block" in its CSP rationale. keksdose corrects it when it next touches the
     file; the `'unsafe-inline'` reason stands, because the palette is written inline.
   - The kit's own `tokens.css:14-17` header and the mirror test's header are corrected
     in the 0.33 build (item 3).
   - **kk 16:** the sync chip's 500/400 shades are deliberate
     (`sync-status-indicator.tsx:53-55`). Moving them to status roles is optional, not a
     to-do (§9 corrected).

9. **Found while measuring: `--border` is not a fill under text.**
   - More contrast steps `--border` until it clears 3:1 against the worst surface (§3.1).
     As a fill under text it then falls to **2.67–3.30 under `text-primary` and
     2.23–2.73 under `text-secondary`**, in every preset and both modes. At standard
     contrast it is 4.63–10.16.
   - The kit does that in four places: Button `primary`'s hover (`ui.tsx:99`), the
     calculator's accent keys (`calculator.tsx:82,189`), and the numpad's accent keys
     and pressed digit (`numpad-sheet.tsx:93-94`).
   - They move to **`--bg-active`**. It stands 1.14–1.18 (light) and 1.11–1.15 (dark)
     from surface-2, and carries primary at ≥ 7.15 and secondary at ≥ 6.04 at both
     contrast levels, because surfaces never step.
   - The accent keys' hover stays surface-2, 1.11–1.18 from the new rest.
   - `--border` stays the role for lines, dividers and bar segments that carry no text
     (`separator.tsx:31`, `password-strength.tsx:227`, `stepper-nav.tsx:273`).

10. **Two hover points, settled by ui-kit (2026-10-09).** Both are technical and sit
    inside decisions 1 and 3; B′ was a kit addition, not one of Marcel's decisions.
    - **B′'s controls hover with a translucent ink, not `--bg-hover`.** With
      `--bg-hover` the on-page hover is 1.04–1.05, under item 2's 1.08. The translucent
      ink is `color-mix(in srgb, var(--text-primary) 7%, transparent)`, IconButton's
      coloured-tone recipe at 12 % (`ui.tsx:748,750`). It gives 1.11–1.21 on the page,
      the card and the well in both modes, with `text-primary` at 7.34–12.21. The build
      measures each moved control's own label (4.5:1) and glyph (3:1) on it.
    - **The ordinary row hover (`--bg-hover` on the card) must clear 4.5 for its text**,
      as at rest. This is an old miss that B neither causes nor fixes: in light, money
      is 4.25–4.40 on it, status 4.35–4.49 and muted 4.42–4.45 in Ink, Moss and Plum;
      in dark, money and brand-muted are 4.40–4.49.
      - Decision 3's audit test covers hover fills: every text role is measured on the
        darkest fill it can sit on, the card's hover, not only the page.
      - Fix order: first re-solve the failing roles against the hover (decision 3's
        darker status colours already lift status). Where a role can't move, lighten
        `--bg-hover` until every role clears 4.5. Text wins over the hover's step; the
        on-page hovers no longer use `--bg-hover` (above).
      - **What the build measured (ui-kit 0.33):**
        - `--bg-hover` went from 7 % to **5.5 %** ink into the card (`tokens.css`, and
          `HOVER_INK` in `theme/contrast-tokens.ts` for the deriver).
        - Its step from the card is **1.09–1.13** over every preset and both modes.
        - The worst text role on it is **4.47–4.89**. The lowest is Moss light's
          `--money-income` at 4.47, inside the audit's 4.45 floor.
        - B′'s translucent ink steps **1.12–1.21** from any surface: page, card or well,
          in both modes.
        - A danger-tone ghost button keeps the danger wash as its hover, not the ink:
          its red text on the ink measured 4.24.

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
- **§12 (2026-10-09)** uses the same colour code with B applied (light surface-2 = page)
  and the 0.33 light literals of §5.5. The hover rule's text roles are primary,
  secondary, muted, brand-muted, the three money colours, and the status and hue colours;
  money-neutral is reported apart (§4.3). Translucent fills and the grid ink are
  composited in sRGB. App lines are read at the reviewed commits: keksdose 6a746d5f,
  kastlan b3adb8f, Kurvenschmiede `main` and `refactor/plan-2026-10`.
- The measuring scripts were throwaway and are not kept.
