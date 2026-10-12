# Colour roles — harmonisation plan

Decided by Marcel on 2026-10-09 (§2) and reviewed by all three apps the same day. Led
from ui-kit for the 0.33 round.

It answers keksdose's 0.32 adoption findings k22–k27 and Kurvenschmiede's undeclared
token (§8):
- **k22:** the money fills have no foreground;
- **k23:** in dark, every status and money fill is unusable under white;
- **k24:** warning and "neutral" have no foreground, and swipe panels paint palette
  colours;
- **k25:** the roles have no utility names, so every use is a `[var(--…)]` class;
- **k26:** the well (`--bg-surface-2`) is invisible on a card in light;
- **k27:** warning has no strong line.

Built from a read-only audit of the kit (0.32.2) and the three apps, all on ui-kit 0.32.2
and Tailwind 4.3.3 (kept outside the repo). Every ratio was measured with the kit's own
colour code against the shipped presets. **kk** = keksdose, **ka** = kastlan,
**KS** = Kurvenschmiede.

## Status

The body says what the build does as of ui-kit 0.34.0; the reviews and adoptions that
amended a section are folded into it, and the table names them. The 0.32.2 snapshot and
measurements, the per-app to-dos, the risks, the review log and the method are in
[archive/colour-roles-history.md](archive/colour-roles-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | |
| 2 | Decisions | — | §12.1; round 0.34 Q1 (decision 5) |
| 3 | The roles today | ui-kit 0.33.0 | §12.3, §12.9, §12.10; adopt-0.33 (`--bg-hover` 5.5 %) |
| 4 | Measured | — (archived) | |
| 5 | The new roles | ui-kit 0.33.0 | §12.1, §12.2, §12.9–§12.12; adopt-0.33 (`--bg-hover` 5.5 %, B′'s translucent ink) |
| 6 | SwipeAction `tone` | ui-kit 0.33.0 | §12.6 (`paint`) |
| 7 | Utility classes | ui-kit 0.33.0; the kit's own markup on them in 0.34.0 | §12.4; round 0.34 Q1 (`ROLE_BUDGET` 0) |
| 8 | Undeclared custom properties | ui-kit 0.33.0 (`@eifi1/ui-kit/testing`) | §12.5; adopt-0.33 (`declaredCustomProperties`) |
| 9 | Per repo | — (archived) | §12.1, §12.4, §12.6, §12.7 |
| 10 | What the kit adds | ui-kit 0.33.0 | §12.1–§12.12; adopt-0.33; round 0.34 Q1 |
| 11 | Risks | — (archived) | |
| 12 | Settled after the reviews | — | index; each item points to its § |
| A | Method | — (archived) | |

## 1. Where each one stands

Moved to [archive/colour-roles-history.md](archive/colour-roles-history.md): the kit and
the three apps on ui-kit 0.32.2 and Tailwind 4.3.3 (their colour classes, palette
survivors, swipes, wells, fill foregrounds and undeclared variables) before this round.

## 2. Decisions (Marcel, 2026-10-09)

All as recommended.

1. **k26, the well: light `--bg-surface-2` becomes the page colour in every preset;
   dark is unchanged** (§5.3). Surface-2 is documented as the "inset/well surface"
   (`tokens.css`) and failed that only in light: 1.02–1.05:1 against the card, where
   dark has 1.11–1.13. This fixes every site at once: the kit's zebra rows, Card `inset`,
   DataTable header bands and group rows, and KS's invisible selected rows, which sit on
   the table's card (DataTable is framed by default; §5.3): 1.02 → 1.09. Nothing
   re-solves, because the page is already the surface every text role and money colour
   is audited against. A new `--bg-inset` role was not chosen: it changes nothing until
   each site moves, and the kit's own sites would have to move anyway, which is the same
   visual change.
2. **k23: no separate solid family.** Every fill gets its own `-contrast` foreground
   (§5.1), and fills keep the kit's dark-mode rule: a pastel fill under a dark label. A
   non-flipping `-solid` family would give dark mode two loud looks and collide with
   Chip `variant="solid"`. **keksdose's NOT_ACCEPTED red and UNCLEARED amber stay
   documented app exceptions** (§5.4).
3. **The light status colours that failed are fixed** (§5.5):
   - darker light `--warning`, `--success`, `--hue-orange` and `--hue-teal` (as text
     their worst was 3.86–4.22:1);
   - a louder light `--danger-border-strong` (2.07:1, where its comment claimed 3:1);
   - a darker `--status-edited` (2.45:1, claimed 3:1).

   It is a visual change in every app: slightly deeper status text and lines in light. A
   test audits every `tokens.css` literal against every shipped preset
   (`src/theme/__tests__/tokens-css-audit.test.ts`); none did before 0.33.
4. **k25: role-scoped utility names** from one `@theme inline` block in `tokens.css`
   (§7): `text-muted`, `bg-surface`, `border-subtle` for `--border`, …; each name exists
   only for its own property. Not shadcn-style `--color-*` names (every name on every
   property, so `bg-muted` and `text-surface` would exist, and they would fight
   kastlan's own `--color-muted`/`--color-primary`), and not a prefix (`text-kit-muted`).
5. **The kit's own ~1,757 `[var(--…)]` classes stay.** A ratchet counts `[var(--role)]`
   wherever a utility exists and only lets the number fall; new or touched code uses the
   utilities (§7.4). A mechanical rewrite would change 262 class assertions in the kit's
   tests, and kk has 22 test files that name `[var(--…)]` class strings, some of them
   on kit-rendered markup. *Superseded in 0.34 (round 0.34 Q1):* the kit's markup
   moved to the utilities in one codemod (3,290 classes, the same rules), the ratchet's
   budget is 0, and `docs/adopt-0.34.md` lists the app tests that name kit classes.
6. **SwipeAction: a soft wash when idle, the solid fill and its `-contrast` when armed**
   (§6). Idle is the tone's wash under the tone's text (≥ 4.52:1; brand was the exception
   at 4.43–4.49 in three derived dark presets until `--brand-muted` moved to 62 %, §5.8).
   Armed is ≥ 5.02:1. The 0.32 panel, dimmed to 60 % opacity as a whole, left the label
   at 2.38–4.52:1 on the kit's own panels. The icon disc, the size step, the bold label
   and the haptic tick stay as they are.
7. **The kit ships a guard against undeclared custom properties** (§8): every
   `var(--name)` an app's source uses without a fallback must be declared, in the kit's
   `tokens.css` or in the app's own CSS. KS's control diagram painted `var(--surface)`,
   a token that has never existed, and drew black boxes on a public page. KS caught it
   with a local vitest guard; the kit generalises it for all three apps.

Settled by the kit, and kept by the reviews:

8. **One foreground per fill**, named `<fill>-contrast`: `--warning-contrast`, the four
   `--money-*-contrast`, `--neutral-contrast`, and the five `--hue-*-contrast` (§5.1).
9. **`--money-*-contrast`** is `#ffffff` in light and `var(--bg-page)` in dark. Both are
   guaranteed by the existing money audit, which solves money to 4.5:1 against the page
   (§5.1).
10. **`--neutral` is `var(--text-muted)`**, with `--neutral-contrast:
    var(--text-inverse)`. No new colour is involved: this is the pair the translation
    review's reset swipe improvised (`translation-review.tsx`), and More contrast steps
    it through `--text-muted`.
11. **`--warning-border-strong`** is `var(--warning)` in light and `#d97706` in dark,
    measured against danger's (§5.2).
12. **`SwipeAction.tone`** uses `StatusDotTone`, the vocabulary Chip, ProgressBar and
    StatusDot already share. `className`/`armedClassName` stay as a deprecated escape
    hatch, and the white label stays only on that path (§6). A documented app exception
    uses `paint` instead, which is not deprecated (§6).
13. **Utilities come from `@theme inline` in `tokens.css`.** The static
    `.text-brand/.bg-brand/.border-brand` become theme names, which gives them variants
    (as plain classes, `hover:bg-brand` generated nothing). The money statics stay (§7).
14. **Chip `solid`, the FloatingAction badge and the kit's three swipe sites** take the
    new `-contrast` tokens. That fixes light Chip solid `warning` (4.24:1) and `orange`
    (4.38:1) (§5.1, §6).
15. **More contrast adds no new JS step.** The new roles follow their inputs (§5.6).
16. **The guard's shape** (§8.3): a pure function in the `@eifi1/ui-kit/testing` entry
    point, run from each app's vitest suite over source texts the app's test collects.
    The kit's tokens, Tailwind's own theme variables and the app's own runtime writes
    count as declared; a library's runtime variables are listed by the app.

## 3. The roles today

### 3.1 Where they live

- **`tokens.css`** is the only stylesheet. Apps `@import` it after `tailwindcss`
  (README, "Tailwind (v4) — tokens + source scan"). In order:
  - `@custom-variant dark`; the `@theme` with `--text-micro`, `--text-caption` and
    `--breakpoint-3xl`;
  - the text-size, breakpoint and `large:` / `xlarge:` / `contrast:` variants;
  - a `:root` / `.dark` mirror of `DEFAULT_PRESET`; the derived roles; the money and
    neutral foregrounds; the status family; media; toast aliases; the categorical hues;
  - the `@theme inline` block of role utilities (§7);
  - the unlayered static money utilities `.text-money-*` and `.bg-money-*`.
- **`TokenSet`** (`src/theme/palette-presets.ts`) holds what follows a preset:
  surfaces, border, the three text roles, brand trio, money quartet, chart ramp, heat
  stops.
  - **`applyTokenSet`** writes them inline on `<html>`. In an app with a palette layer
    (keksdose, kastlan), the inline values beat the `:root`/`.dark` mirror of those 46
    values.
  - **In an app without one, the mirror is what paints.** Kurvenschmiede calls no
    `applyTokenSet` and no `useApplyPalette`: its palette layer was removed. Its More
    contrast steps from `contrastStep(DEFAULT_PRESET.light)` (`reapplyContrastTokens` in
    `src/theme/contrast.ts`). So a change to the default appearance reaches KS only
    through the mirror. The mirror equality test
    (`src/theme/__tests__/tokens-css-mirror.test.ts`) is load-bearing: `tokens.css`
    follows `DEFAULT_PRESET`, never the reverse.
  - **The mirror is live CSS.** Tailwind 4.3.3 keeps a `:root` block that holds only
    custom properties: the built showcase CSS carries the palette values and
    `:root[data-contrast=more]{--focus-ring-width:3px}`, and `check:tailwind`
    (`scripts/check-tailwind-scan.mjs`) asserts it. (Until 0.33 the stylesheet's header
    said Tailwind v4 strips such a block; it never did.)
  - The selectable presets are `PALETTES`: Default, Imprint (= Default except the chart
    ramp), Ink, Moss, Plum, High contrast. `ALTERNATIVE_PRESETS` is a reference bank
    only and is not audited.
- **More contrast** (`data-contrast="more"`) is stepped in JS, not CSS. `contrastStep`
  (`src/theme/contrast-tokens.ts`) moves the four `CONTRAST_STEPPED_VARS`:
  - `--text-muted` to the set's secondary;
  - `--text-secondary` halfway to primary;
  - `--text-placeholder` to the set's muted;
  - `--border` until it clears 3:1 against the worst surface.

  `applyTokenSet` applies the step; `reapplyContrastTokens` does the same for an app
  without a palette layer. CSS only raises `--focus-ring-width` from 2 to 3 px.
  **Nothing else steps**: surfaces, brand, money, status, hues and field-sync colours are
  the same at both levels, and the roles derived from them follow their inputs (§5.6).
- **Dark mode** is `.dark` on `<html>`. Each preset carries a dark `TokenSet`; the
  `tokens.css` literals have a `.dark` block.
- The README's "Tokens" section lists the families: Palette (inline), Derived
  (`color-mix`), and the semantic, hue and media literals, deliberately not per preset.

### 3.2 Inventory

| Group | Tokens | Set by | Per preset | More contrast |
|---|---|---|---|---|
| Surfaces | `--bg-page` `--bg-surface` `--bg-surface-2` (= page in light, §5.3) | TokenSet, inline | yes | — |
| Derived surfaces | `--bg-hover` (5.5 % ink into the card, §5.7), `--bg-active` (12 %), `--bg-inverse` (= text-primary) | `color-mix` in `tokens.css` | through inputs | — |
| Text | `--text-primary` | TokenSet | yes | — |
| | `--text-secondary` `--text-muted` | TokenSet | yes | stepped |
| | `--text-placeholder` | derived, inline under More | through inputs | stepped |
| | `--text-inverse` (= surface) | derived | through inputs | — |
| Lines | `--border` (a line, never a fill under text, §5.2) | TokenSet | yes | stepped to ≥ 3:1 |
| | `--border-strong` (55 % border, 45 % ink) | derived | through inputs | follows `--border` |
| Brand | `--brand` `--brand-hover` `--brand-contrast` | TokenSet | yes | — |
| | `--brand-bg` (14 %) `--brand-bg-hover` (24 %) `--brand-muted` (62 % brand into the ink, §5.8) | derived | through inputs | — |
| Money | `--money-income` `--money-expense` `--money-net` `--money-neutral` | TokenSet | yes | — |
| | `--money-*-contrast` (§5.1) | white in light, `var(--bg-page)` in dark | through inputs | — |
| Neutral | `--neutral` (= text-muted) `--neutral-contrast` (= text-inverse) (§5.1) | aliases | through inputs | follows `--text-muted` |
| Status (an action's consequence) | `--danger` `-hover` `-contrast` `-border` `-border-strong` `-bg`; `--warning` `-contrast` `-border` `-border-strong` `-bg`; `--info` `-contrast` `-border` `-bg`; `--success` `-contrast` `-border` `-bg` | literals per mode | no | — |
| Field sync | `--status-synced/-pending/-edited/-error` | literals per mode | no | — |
| Categorical | `--hue-{blue,indigo,purple,teal,orange}` `-contrast` `-border` `-bg` | literals per mode | no | — |
| Media | `--media-ink` `--media-scrim` `--media-scrim-hover` | literals, the same in both modes | no | — |
| Toast | `--toast-*-bg/-border` (aliases), `--z-toast` | aliases | — | — |
| Chart | `--chart-1…9` (+ heat stops in JS) | TokenSet | yes | — |
| Focus | `--focus-ring-width` 2 px / 3 px | CSS | — | 3 px |

### 3.3 Gaps per tone

What each tone has. The gaps 0.32.2 had (k22, k24, k27), and where the kit improvised
around them, are in the archive.

| tone | fill | `-hover` | `-contrast` | `-border` | `-border-strong` | wash (`-bg`) |
|---|---|---|---|---|---|---|
| danger | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| warning | ✓ | — | ✓ (0.33) | ✓ | ✓ (0.33) | ✓ |
| info | ✓ | — | ✓ | ✓ | — | ✓ |
| success | ✓ | — | ✓ | ✓ | — | ✓ |
| brand | ✓ | ✓ | ✓ | (`--brand`) | — | ✓ `--brand-bg` |
| money ×4 | ✓ | — | ✓ (0.33) | — | — | — |
| hues ×5 | ✓ | — | ✓ (0.33) | ✓ | — | ✓ |
| neutral | ✓ `--neutral` (0.33) | — | ✓ (0.33) | — | — | — |

`--success-` and `--info-border-strong` are not added: nothing asks for them.

### 3.4 How Tailwind is set up, and what that allows

Probed with Tailwind 4.3.3's own compiler and the kit's `cn()` (the method is in the
archive).

- The kit and the three apps run Tailwind 4.3 with CSS-first config. The kit has no
  `tailwind.config`. `tokens.css` reaches each app's own Tailwind pass because the app
  `@import`s it, so the kit's `@theme` and `@theme inline` work there.
- The kit's class names reach the apps through `@source`: an app scans the kit's `dist`
  (or `src`) in `node_modules`.
- **A static utility in `tokens.css` takes no variants.** A plain `.text-money-pos {}`
  gives `text-money-pos`, but `hover:text-money-pos` and `md:text-money-pos` generate
  nothing. That is why the brand classes became theme names (§7.2), and why a money site
  that needs a variant keeps the `[var(--money-…)]` form.
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
- **The kit's `cn()`** (tailwind-merge plus the two font sizes) treats `text-muted`,
  `bg-surface-2`, `border-subtle` and `border-danger-strong` as colours, and merges them
  against `text-sm`, `text-caption`, `border`, `border-2`, `divide-y` and arbitrary
  `[var(--…)]` classes correctly with no config of its own.

## 4. Measured

Moved to [archive/colour-roles-history.md](archive/colour-roles-history.md): the 0.32.2
measurements this round was built on (five distinct presets × light/dark × standard/More
contrast). The rules they led to are §5 and §6;
`auditPalette` and `src/theme/__tests__/tokens-css-audit.test.ts` hold them in every
shipped preset.

### 4.1 Surfaces (k26)

In the archive: the well against the card in 0.32.2, and why a stronger fill costs
muted text (§5.3).

### 4.2 Fills and their foregrounds (k22–k24)

In the archive: every fill under white, slate-900 and its own foreground (§5.1).

### 4.3 Status colours as text and as lines (claims that do not hold)

In the archive: the 0.32.2 light status colours and lines below their ratio (§5.2,
§5.5).

### 4.4 Swipe panels today (k24)

In the archive: the 0.32 swipe panels, dimmed to 60 % at idle (§6).

## 5. The new roles

### 5.1 Every fill names its foreground (k22, k24; §2.8–2.10, §2.14)

| token | light | dark | pair (minimum over the presets), light / dark |
|---|---|---|---|
| `--warning-contrast` | `#ffffff` | `#451a03` (amber-950) | on `--warning`: 6.03 / 10.39 |
| `--money-income-contrast` | `#ffffff` | `var(--bg-page)` | 5.81 / 5.43 |
| `--money-expense-contrast` | `#ffffff` | `var(--bg-page)` | 5.78 / 5.44 |
| `--money-net-contrast` | `#ffffff` | `var(--bg-page)` | 5.78 / 5.43 |
| `--money-neutral-contrast` | `#ffffff` | `var(--bg-page)` | 5.47 / 7.44 |
| `--neutral` | `var(--text-muted)` | `var(--text-muted)` | vs surface (non-text): 5.06 / 5.12 |
| `--neutral-contrast` | `var(--text-inverse)` | `var(--text-inverse)` | on `--neutral`: 5.06 / 5.12; More contrast 7.59 / 7.79 |
| `--hue-blue-contrast` | `#ffffff` | `#172554` | 6.70 / 8.15 |
| `--hue-indigo-contrast` | `#ffffff` | `#1e1b4b` | 7.90 / 8.02 |
| `--hue-purple-contrast` | `#ffffff` | `#3b0764` | 6.98 / 8.48 |
| `--hue-teal-contrast` | `#ffffff` | `#042f2e` | 6.05 / 9.78 |
| `--hue-orange-contrast` | `#ffffff` | `#431407` | 5.99 / 9.28 |

The money pairs per preset are in the archive; the lowest is 5.43:1, and
`tokens-css-audit.test.ts` measures every `<fill>-contrast` on its fill in every shipped
preset × mode × contrast level.

- **Why money uses white and the page, and why that holds for any token set:** the
  deriver solves income, expense, net and neutral to 4.5:1 against the *worst* ground
  (the page, or the card's hover where that is worse, §5.7), and `auditPalette` asserts
  it for every shipped preset.
  - In light, white is lighter than the page, so it does at least as well.
  - In dark, the page is the darkest surface, so it clears 4.5 by the same audit.
  - It is the `--brand-contrast` precedent (the dark page, not indigo-950). A
    `dark:text-slate-900` would give 4.98 in the derived dark presets; the page gives
    5.43.
- **Four money names, one value.** That matches the per-tone pattern and k22's own
  naming. It also leaves room for a preset whose money colours differ in lightness.
- **`--neutral` is a pair, not a new grey.** It is the reset swipe's improvisation made
  official. StatusDot, ProgressBar and Chip `dot` paint "neutral" as `--text-muted`.
  Chip `solid neutral` stays `--bg-inverse` / `--text-inverse` (the count pill look),
  which is a different, louder thing.
- **Who uses them:** Chip `solid`, the FloatingAction badge, the toast's action button
  (`--toast-action-bg` / `-fg`), the kit's swipes (§6) and the showcase's money swatches.

These are defined in `tokens.css`, as literals for warning and the hues and as `var()`
aliases for money and neutral. They are not in `TokenSet`, so no preset has to list them.

### 5.2 Lines: `--warning-border-strong` (k27) and the light danger line

| token | light | dark | worst of page / surface / surface-2 |
|---|---|---|---|
| `--warning-border-strong` | `var(--warning)` | `#d97706` (amber-600) | light ≥ 4.6; dark 4.78–5.06 |
| `--danger-border-strong` (§2.3) | **`#e11d48`** (rose-600; was `#fb7185`, 2.07) | `#e11d48` | light **3.61–3.69**; dark 3.24–3.43 |

- Light amber-600 would be only 2.45–2.50, which is why the light warning line is the
  warning text colour itself.
- Dark amber-600 is the same step as danger's dark rose-600, but sits higher (4.8 against
  3.3). Amber-400/-500 would shout (7–10:1), as Card `strong` did with `--warning` at
  13:1.
- Users of the strong warning line: Card `toneStrength="strong"` for warning
  (`border-warning-strong`), IconButton's warning focus ring (`ring-warning-strong`), and
  an app's warning frame where it wants a loud line.
- `--success-` and `--info-border-strong` are not added: nothing asks for them.

**`--border` is a line, not a fill under text** (§12.9). More contrast steps `--border`
until it clears 3:1 against the worst surface (§3.1); as a fill under text it then falls
to 2.67–3.30 under `text-primary` and 2.23–2.73 under `text-secondary`, in every preset
and both modes.
- A fill that carries text takes **`--bg-active`**: 1.14–1.18 (light) and 1.11–1.15
  (dark) from surface-2, with primary at ≥ 7.15 and secondary at ≥ 6.04 at both contrast
  levels, because surfaces never step. Button `primary` hovers to it, the calculator's
  accent keys rest on it (`KEY_ACCENT` in `calculator.tsx`, hovering back to surface-2),
  and the numpad's accent keys and pressed digit use it (`PAD_ACCENT`, `PAD_DIGIT` in
  `numpad-sheet.tsx`).
- `--border` stays the role for lines, dividers and bar segments that carry no text
  (Separator, PasswordStrength's bars, the stepper's connectors).
- `tokens-css-audit.test.ts` holds it: whatever fills under text is `--bg-active`, which
  carries the ink.

### 5.3 The well (k26, §2.1)

In every light `TokenSet`, `bgSurface2 = bgPage`. In the deriver, `SURFACE_L.light`
gives `surface2` the page's lightness (`src/theme/palette-derive.ts`). Dark is unchanged.

| preset (light) | surface-2 (was) | surface-2 / surface (was) | muted on it | surface-2 / page |
|---|---|---|---|---|
| default | #ede3cf (#f3ead6) | **1.09** (1.02) | 4.80 | 1.00 |
| ink | #dce2ef (#e1e8f5) | **1.10** (1.05) | 4.59 | 1.00 |
| moss | #d8e6dd (#deece3) | **1.11** (1.05) | 4.61 | 1.00 |
| plum | #e7dfea (#ece4ef) | **1.10** (1.05) | 4.62 | 1.00 |
| contrast | #e1e2e3 (#e6e8ea) | **1.11** (1.05) | 5.52 | 1.00 |

- A well on a card stands out from the card by exactly as much as the card stands out
  from the page. Dark keeps 1.11–1.13.
- Every text role and every money colour is audited at ≥ 4.5 against the page, so
  **nothing re-solves**. A 5 % ink mix gives the same ratios (1.08–1.12), but in the
  "contrast" preset it ends a hair darker than the page. It would then become the worst
  surface and push money text to 4.43.
- **Not chosen either: a well one step darker than the page** (option C). Muted falls to
  4.33–4.37, money to 4.22–4.31, five status colours to 4.31–4.49 and `--status-edited`
  to 2.93–3.00, with no headroom in the derived presets.
- The derived heat stop `neutral` (= surface-2) follows.
- **A well belongs on a card.** The kit's DataTable is framed by default (`frame = true`:
  its root is `FramedRoot`, the flush Card on `--bg-surface`), so its `thead`, sticky
  bands, group rows and a selected row on surface-2 sit on the table's card: 1.02 →
  1.09, visible. A `frame={false}` table and `Card variant="inset"` belong inside a card
  (their doc comments say so); placed straight on the page they lose their band (1.00).
  Button `primary` on the page keeps only its border.
- **What follows the well in the kit:** Table zebra and group rows, DataTable's bands
  and sticky footer, the MeasuredGrid head, Card `inset`, disabled and read-only fields,
  the numpad and calculator digit keys, mini-calendar cells, feedback bubbles and badges,
  the settings icon tile and ToggleGroup's dimmed segments. Bordered sites (Button
  `primary`, chips, the stepper) gain a slightly deeper fill inside their border.
- **A selected row stays on surface-2.** `--bg-active` fails AA under a row's own text:
  muted is 4.20 on it in Default (4.01–4.67 across presets), money 3.79–4.77, status
  3.87–4.32. Its hover is §5.7.
- Two tokens share a value in light; the `tokens.css` mirror and the derived-presets test
  hold both. The hovers that used to sit on surface-2 are §5.7.

### 5.4 Solid fills (k23, §2.2)

- No new family. The pairs in §5.1 cover every fill the kit has, and in dark they follow
  the kit's rule since 0.26: a pastel fill under its 950 ink, 8–12:1.
  - k23's "`--danger` in dark is unusable under white text" is answered by "don't put
    white on it: `text-danger-contrast`".
  - keksdose's NOT_ACCEPTED pill (red-800 / dark red-700 + white, 8.31 / 6.47) is a hue
    choice: a red that is not the destructive rose, because the
    delete curtain on the same row is rose. It stays an app exception with its
    `eslint-disable`.
  - UNCLEARED (amber-600/500 + slate-900, 5.60 / 8.31) stays an exception too.
    `bg-warning text-warning-contrast` would pass (light 6.03, dark 10.39), but light
    `--warning` `#a34800` is darker than the amber-700 that keksdose rejected as
    "brick" (live #302). Its swipe curtain keeps the pill's own fill through
    `SwipeAction.paint` (§6).
- **Not built:** a non-flipping family (`--danger-solid` #be123c / `-hover` #9f1239,
  `--success-solid` #047857, `--info-solid` #0369a1, `--neutral-solid` #475569, all
  under white: 6.29 / 8.02 / 5.48 / 5.93 / 7.58; `--warning-solid` #d97706 under
  `#12100e`, 5.96). In dark those white-label fills stand out from the surface by only
  2.3–3.3:1 (amber 5.4), and the `-solid` name collides with Chip `variant="solid"`,
  which means the flipping pair.

### 5.5 Status colours that clear AA (§2.3)

| token | light (same OKLCH hue and chroma as the Tailwind step it was, solved lightness) | was | worst, light | white on it |
|---|---|---|---|---|
| `--warning` | `#a34800` | #b45309 (3.86) | 4.63 | 6.03 |
| `--success` | `#007152` | #047857 (4.22) | 4.63 | 6.03 |
| `--hue-orange` | `#b43800` | #c2410c (3.98) | 4.60 | 5.99 |
| `--hue-teal` | `#006f68` | #0f766e (4.21) | 4.65 | 6.05 |
| `--danger-border-strong` | `#e11d48` (rose-600) | #fb7185 (2.07) | 3.61 | — |
| `--status-edited` | `#bf6800` (non-text, 3:1) | #d97706 (2.45) | 3.11 | — |

- "Worst" means against the page, surface, surface-2 and the token's own wash, over all
  five light presets.
- Dark values are unchanged: the dark status and hue text colours sit at 8–13:1, and
  dark `--danger-border-strong` at 3.24–3.43.
- The light values are not Tailwind steps. Their comments record them as solved, as
  `--money-expense` `#905902` is.
- **The guard** (`src/theme/__tests__/tokens-css-audit.test.ts`) runs every `tokens.css`
  literal pair through every preset × mode × contrast level:
  - text at 4.5 on the page, the card, the well and a hovered row (`--bg-hover`, §5.7);
  - each tone at 4.5 on its own wash;
  - each `<fill>-contrast` at 4.5 on its fill;
  - `-border-strong` and `--status-*` at 3 against every surface;
  - `--border` never a fill under text (§5.2);
  - the hover steps of §5.7 and the soft brand of §5.8.

  `auditPalette` (`src/theme/palette-derive.ts`) takes the semantic layer too, and
  measures money neutral and `--brand-contrast` on `--brand-hover`.
- **The deriver's brand hover moves away from its label**: darker under white, lighter
  under a dark ink. It used to move away from the page, which in dark lightened a fill
  that carries white text, to 4.07–4.17:1.

### 5.6 More contrast (§2.15)

- No new JS step. The neutral pair steps with `--text-muted` (7.59–11.93:1). The money,
  status and hue pairs are 5–17:1 already. The well is a surface, which More contrast
  never moves.
- A future step could raise the light well to a 10 % ink mix under More contrast: muted
  becomes secondary there, at ≥ 6.28:1 on it. Not built.
- Derived roles in CSS are safe in Tailwind 4.3 (§3.1); `check:tailwind` asserts each
  one reaches the built CSS (`--warning-border-strong`, the neutral pair, the money
  foregrounds, the row hover's 5.5 %).

### 5.7 Hovers (§12.1, §12.2, §12.10)

**The rule:** a hover differs from its rest by at least **1.08:1**, and every text role
on it stays at **4.5:1**, the audit's floor (which accepts 4.45). 1.08 is the smallest
card-to-page step the kit ships (dark Ink and High contrast), the step people already
read as two surfaces. Text wins over the hover's step.

- **A row or item on a card hovers to `--bg-hover`**: 5.5 % ink into the card (it was
  7 %; `HOVER_INK` in `src/theme/contrast-tokens.ts` is the same number for the deriver,
  and the token audit holds the two equal). It steps 1.09–1.13 from the card over every
  preset and both modes, and the worst text role on it is 4.50–4.89 (Moss light's
  `--money-income` at 4.50). The deriver solves money and the semantic text against it
  as well as against the page (§5.1), measured on the hex it ships (0.34: it used to solve
  the float colour and round after, landing just under; the audit's 0.05 slack now covers
  only pairs with a `color-mix` side — `--bg-hover`, `--brand-muted`, `--brand-bg*`).
- **A row that rests on the well hovers to the card: `hover:bg-surface`.** In light the
  well is the page, and `--bg-hover` sits only 1.04–1.05 from it; in dark the two are
  1.00–1.02 apart. The card is the only fill that clears both halves of the rule in
  every preset, both modes and both contrast levels (1.09–1.13 from the well, every text
  role at ≥ 4.94). In light every fill darker than the well fails the text half, because
  the page is already the darkest surface the text roles are solved against; in dark the
  same holds for every fill lighter than it.
  - The kit's Table zebra rows take `even:hover:bg-surface`, which outranks the row's
    `hover:` fill.
  - The calculator's digit keys carry only `text-primary`, so they may go darker: they
    hover to `--bg-active`, 1.14–1.18 (light) and 1.11–1.15 (dark) from the key, with
    primary at ≥ 7.15 on it.
  - The kit cannot see an app's own rest colour: an app that paints a row on surface-2
    picks this hover itself.
- **A row whose surface-2 marks a state keeps its fill under the pointer and draws an
  outline** (a selected row, §5.3): the card colour would read as "not selected". The
  outline is a 1 px inside line in `--border-strong`:
  `hover:bg-surface-2 hover:outline hover:-outline-offset-1 hover:outline-strong`. An
  outline, not a box-shadow, because a shadow on a `<tr>` is not painted by every engine.
- **A control that can sit on the page, a card or the well hovers with a translucent
  ink** (B′): `color-mix(in srgb, var(--text-primary) 7%, transparent)`, `HOVER_INK` in
  `src/components/ui.tsx`. Button `secondary` and `ghost`, IconButton muted and the
  feedback inbox's idle filter chip use it. It steps 1.12–1.21 from the page, the card
  and the well in both modes, with `text-primary` at 7.34–12.21. Neither surface-2 (the
  page itself in light) nor `--bg-hover` (mixed against the card, 1.04 from the page)
  would move on the page. A coloured IconButton tone keeps its own wash as its hover
  (`hover:bg-danger-soft`, …): danger's red text on the ink measured 4.24.
- **IconButton's `custom` tone** hovers with the same recipe in its own colour, at 12 %.

### 5.8 The brand as text and as a glyph (§12.11, §12.12)

- **Brand as text reads `--brand-muted`**, not `--brand`, which the deriver solves to 3:1
  only (3.00–3.06 in the derived dark presets). The kit's brand text does: Chip `outline`
  and soft brand, ButtonGroupLink's current page, ChoiceCard's brand tone, DatePicker's
  selected day, MiniCalendar's range.
- **`--brand-muted` is 62 % brand into the ink** (it was 70 %; `BRAND_MUTED_SHARE` in
  `src/theme/contrast-tokens.ts` for the deriver). It must clear 4.5 on its own soft
  chip at rest (`--brand-bg`, 14 %) and hovered (`--brand-bg-hover`, 24 %), the harder
  of the two. At 70 % the hovered chip read 4.08–4.42 in seven of the twelve preset ×
  mode combinations; at 62 % it is 4.50–7.91, and on the page, card, well and
  `--bg-hover` 5.00–11.78. The text moved, not the chip: moving the brand flipped Ink,
  Moss and Plum dark's label from white to the dark ink, and lightening the hovered chip
  enough left no hover. The hover still steps 1.10–1.26 from `--brand-bg`.
- **The deriver solves the brand for its muted form**: the brand moves away from the
  surfaces a step at a time until `--brand-muted` clears 4.5 on the worst ground and on
  both chips (Plum dark's brand moved one step in 0.33).
- **A brand glyph on the hovered chip turns brand-muted.** `--brand` as an icon on
  `--brand-bg-hover` is 2.69–2.80 in Ink, Moss, Plum and Contrast dark, under an icon's
  3:1. Where a pressed control hovers to that chip (IconButton `pressed`, FloatingPanel's
  two toggles), its glyph hovers to `--brand-muted` (`hover:text-brand-muted`). At rest
  the glyph stays `--brand` on `--brand-bg`.
- `auditPalette` and `tokens-css-audit.test.ts` measure the hovered chip in every preset
  × mode × contrast level, hold the three shares equal to the stylesheet's, and hold the
  hover's 1.08 step from the chip.

## 6. SwipeAction `tone` (k24, §2.6, §2.12)

```ts
export type SwipeTone = StatusDotTone; // brand | neutral | success | warning | danger | info
                                       // | income | expense | blue | indigo | purple | teal | orange
export interface SwipePaint {
  fill: string;       // the armed fill; idle shows a 14 % wash of it on the card
  foreground: string; // the text and icon colour ON `fill`; idle text is the body ink
}
export type SwipeAction = SwipeActionBase & ( // onCommit, label, icon?
  | { /** The kit paints the panel: the tone's wash idle, its fill and `-contrast` armed. */
      tone: SwipeTone; paint?: never; className?: never; armedClassName?: never }
  | { /** A documented app exception: idle a 14 % wash of `fill` under the body ink,
          armed `fill` under `foreground`. */
      paint: SwipePaint; tone?: never; className?: never; armedClassName?: never }
  | { tone?: never; paint?: never;
      /** @deprecated 0.33 — pass `tone`, or `paint` for an exception. The panel is dimmed
          idle, and its text is white unless this sets a text colour. */
      className: string;
      /** @deprecated 0.33 — pass `tone`, or `paint`. */
      armedClassName: string }
);
```

The classes per tone are `SWIPE_TONE` in `src/components/swipeable-row.tsx`:

| tone | idle: wash / text | armed: fill / text | light idle · armed | dark idle · armed |
|---|---|---|---|---|
| danger | `--danger-bg` / `--danger` | `--danger` / `--danger-contrast` | 5.72 · 6.29 | 8.58 · 8.27 |
| warning | `--warning-bg` / `--warning` | `--warning` / `--warning-contrast` | 4.84 · 6.03 | 10.98 · 10.39 |
| success | `--success-bg` / `--success` | `--success` / `--success-contrast` | 4.84 · 6.03 | 10.11 · 9.94 |
| info | `--info-bg` / `--info` | `--info` / `--info-contrast` | 5.17 · 5.93 | 9.15 · 8.32 |
| brand | `--brand-bg` / `--brand-muted` | `--brand` / `--brand-contrast` | ≥ 4.96 · 5.22 | ≥ 4.96 · 5.22 |
| neutral | `--bg-active` / `--text-secondary` | `--neutral` / `--neutral-contrast` | 6.04 · 5.06 | 6.07 · 5.12 |
| income / expense | `--bg-surface-2` / `--money-*` (Chip's soft money recipe) | `--money-*` / `--money-*-contrast` | 4.52 · 5.78 | 4.50 · 5.43 |
| blue, indigo, purple, teal, orange | `--hue-*-bg` / `--hue-*` | `--hue-*` / `--hue-*-contrast` | 4.52 (orange) – 6.41 · 5.18–7.90 | 7.94–10.82 · 8.02–9.78 |

All values are the minimum over the presets, measured when the round was drafted; the
0.33 light status and hue values (§5.5) and `--brand-muted` at 62 % (§5.8) only raise
them. `tokens-css-audit.test.ts` prints every tone's label at 4.5:1 idle and armed.
- Armed takes the plain fill, not `-hover`. The soft→solid step is the "it will fire"
  signal.
- **The icon disc** is `bg-current/20` armed and `bg-current/10` idle: a white disc
  vanishes on a pastel dark fill, while the label's own colour works on every pair.
- **The kit's own sites:** DataTable's row actions (`tone: a.tone === "danger" ?
  "danger" : "brand"`); TranslationReviewPanel's swipes (success; danger, or brand for a
  missing row; neutral); `feedbackSwipePlan` (info, success, danger). Every app's feedback
  inbox and translation review get the tones without an edit.
- **`paint`** is for a documented app exception (§2.12): a curtain that must be exactly
  its status pill's palette fill, or two strengths of one tone that `danger` would
  collapse.
  - The values are CSS colours or `var()`s, the same in both themes unless the app passes
    a variable it declares per theme in its own stylesheet (the guard counts it, §8.2
    rule 2). The kit applies them as inline custom properties on the panel
    (`--swipe-paint-fill`, `--swipe-paint-fg`).
  - The idle/armed rule applies: idle is `color-mix(in oklab, <fill> 14%,
    var(--bg-surface))`, the `--brand-bg` recipe, under `--text-primary`; armed is
    `<fill>` under `<foreground>`. The icon disc follows the label.
  - **The idle label is the ink, not the fill.** A mid-tone fill as text on its own wash
    is 2.39–4.77 (amber-600 in light: 2.39), and the `--brand-muted` recipe (70 % fill
    into the ink) still fails.
  - The kit cannot measure an app's paint, so the app's tests pin the pair.
- `text-white` stays only on the deprecated `className` path, dimmed to 60 % idle as in
  0.32. It is one of the two survivors the palette ratchet's `BUDGET` allows
  (`scripts/check-token-discipline.mjs`) until that path is removed.

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
| `text-*` | `primary` `secondary` `muted` `placeholder` `inverse`; `brand` `brand-muted`; `danger` `warning` `success` `info`; `hue-{blue,indigo,purple,teal,orange}`; `<fill>-contrast` for brand, danger, warning, success, info, neutral, money-income/-expense/-net/-neutral, hue-*; `media-ink` |
| `bg-*` | `page` `surface` `surface-2` `hover` `active` `inverse`; `brand` `brand-hover` `brand-soft` (`--brand-bg`) `brand-soft-hover`; `danger` `danger-hover` `warning` `success` `info` `neutral`; `danger-soft` `warning-soft` `success-soft` `info-soft` (`--*-bg`); `hue-*`, `hue-*-soft`; `media-scrim` `media-scrim-hover` |
| `border-*` / `divide-*` | `subtle` (`--border`) `strong` (`--border-strong`) `brand`; `danger` `warning` `success` `info` (`--*-border`); `danger-strong` `warning-strong`; `hue-*`; `media-ink` |
| `ring-*` / `outline-*` | `subtle` `strong` `brand` `danger-strong` `warning-strong`; `media-ink` (ring only) |
| `fill-*` / `stroke-*` | `primary` `secondary` `muted` (text roles), `surface`, `subtle` and `strong` (the two lines): for SVG |

No `text-*` names for the border roles: an SVG that strokes in `currentColor` takes
`stroke-subtle` / `stroke-strong` instead. A chart grid drawn in `stroke-subtle` keeps a
light weight and follows More contrast, which a palette literal never did.

- The money statics stay: `.text-money-pos/-neg/-net(-muted)` and
  `.bg-money-pos/-neg/-neutral` (`-muted` is an opacity, not a colour). They take no
  variants (§3.4); there are no money theme names, so a site that needs a variant keeps
  the `[var(--money-…)]` form.
- `text-brand`, `bg-brand` and `border-brand` are theme names: layered, with variants.
- `placeholder:text-placeholder` needs no namespace of its own.

### 7.3 Collisions

| where | what | effect |
|---|---|---|
| An app's shadcn `@theme inline` (kastlan's) | `--color-primary` (= brand), `--color-secondary`, `--color-muted` (= surface-2), `--color-border`, … | **The role namespace wins for its property:** `text-primary` is ink, not brand, and `text-secondary`/`text-muted` are text roles, not the surface-2 colour. `bg-muted`, `border-border`, `text-muted-foreground`, `bg-primary`, `ring-primary` and `text-primary-foreground` are untouched. |
| Tailwind's own palette | `neutral` is a palette name | `text-neutral` / `bg-neutral` (no shade) coexist with `text-neutral-500`. The kit's palette ratchet requires a shade for the `neutral` family (`NEUTRAL` in `scripts/check-token-discipline.mjs`), so `bg-neutral` and `text-neutral-contrast` are not counted as palette colours. |
| Static classes | `.text-brand` etc. | Moved, not duplicated: both declarations would be emitted if both existed. |
| tailwind-merge | — | no config needed (§3.4) |

### 7.4 Guards

- **`check:tailwind`** asserts that one utility per namespace reaches the built showcase
  CSS (e.g. `.text-muted{color:var(--text-muted)}`). The property-scoped namespaces are
  less documented than `--color-*`, and a Tailwind release that drops one should fail
  CI.
- **A second ratchet** (`npm run check:tokens`) counts `[var(--role)]` classes wherever a
  utility exists, and only lets the number fall (§2.5). Since 0.34 its budget
  (`ROLE_BUDGET`) is 0: no role class with an exact utility may come back. A
  `[var(--…)]` class is still right where no role utility of the same token and property
  exists (the money and chart colours, a ring in `--brand-contrast`).
- `tokens-css-audit.test.ts` reads every role utility's token and fails on a name that
  resolves to nothing, or on a name on the wrong property (`bg-muted`, `text-surface`).

## 8. Undeclared custom properties (§2.7, §2.16)

### 8.1 What happened

KS's control page drew a block diagram whose five boxes were
`fill-[var(--surface)] stroke-[var(--text-primary)]`. `--surface` has never existed; the
kit's token is `--bg-surface`.

- A custom property that is not defined, read with no fallback, makes the whole
  declaration invalid at computed-value time. `fill` is inherited, so the boxes took
  their parent's value: black, from the root. In light the labels sat at about 2:1 on
  it, on a public page.
- Nothing else notices: the class compiles, the build passes, the type checker has no
  opinion. KS caught it with a local vitest guard that required every `var(--name)`
  without a fallback to be declared in the kit's `tokens.css` or its own `app.css`.
- That rule, run unchanged over the other repos, is not enough: it does not know
  comments (a `var(--app-nav-h)` explained in prose), variables the source writes itself
  (keksdose's `--tone-from`/`--tone-to`, set as style keys and read in its CSS), or
  Tailwind's own theme variables (`var(--color-rose-500)`). The kit's rules (§8.2) know
  all three. The per-repo counts are in the archive.

### 8.2 The rule

A `var(--name)` with no fallback, in an app's non-test `.ts`, `.tsx` and `.css` source,
must name something declared. Declared means any of:

1. **The kit:** every name `tokens.css` declares, in any block and either mode, **except
   names declared only in an `@theme inline` block**. With `inline`, Tailwind emits no
   variable (§3.4), so `var(--text-color-muted)` would pass and paint nothing.
   The names of the plain `@theme` (`--text-micro`, `--text-caption`,
   `--breakpoint-3xl`) count: Tailwind emits them when they are used.
   - Everything `applyTokenSet` and the More-contrast step write on `<html>` (surfaces,
     border, text, brand, money, `--chart-1…9`) is declared in `tokens.css` too, through
     the `:root`/`.dark` mirror; a kit test asserts it.
   - The one runtime-only name the kit publishes, AppShell's measured `--app-nav-h`, is
     **not** declared. AppShell sets it only while it is mounted, so on a landing, legal,
     sign-in or pay page it is undefined. An app reads it in the fallback form,
     `var(--app-nav-h,0px)`, as every kit read does. With `checkFallbacks` (§8.3) that
     form is accepted; in the kit's own run, AppShell's `setProperty` counts as a write.
   - Component-internal variables the kit sets for its own classes (`--slider-fill`,
     `--fp-*`, `--line-items-cols`, `--icon-button-tone-*`, `--label-strip-edge*`) are
     not on the list. An app that reads one depends on internals, and the guard says so.
2. **The app's stylesheets:** every `--name:` in any `.css` it passes, in any block.
3. **The app's own runtime writes**, found in its source the way the kit's test finds
   them: `setProperty("--name"`, a React style key `"--name":`, and a Tailwind arbitrary
   property `[--name:…]`.
4. **Tailwind's own theme:** a name `tailwindcss/theme.css` declares. Tailwind 4.3.3
   marks a theme variable as used when a scanned file names it, and then emits it (an
   app's build carries `--color-rose-500` once a file names it). With `refusePalette`
   (§8.3), the palette colours among them (`--color-<hue>-<shade>`, `--color-black`,
   `--color-white`) are reported instead: for an app with no palette lint, this test is
   its refusal.
5. **A chart series' colour:** a `--color-<key>` that is not a Tailwind theme name
   counts as declared in a file that has a `<key>: {` entry. The kit's ChartContainer
   (`chart.tsx`) writes one per key of its `config`. This is keksdose's rule, taken over.
6. **A list the app passes** for a library's runtime variables, as names or patterns:
   Radix's `--radix-collapsible-content-height`, for example.

Not counted:
- **Comments**: `//` and `/* */` in TS, `/* */` in CSS, stripped as the kit's own test
  and ratchet strip them.
- **A use with a fallback**, `var(--x, …)`: it says what happens when `--x` is missing.
  AppShell tells apps to write `bottom-[var(--app-nav-h,0px)]`. With
  `checkFallbacks: true` these are checked too, and `--app-nav-h` counts there.
- **A name built at runtime** (`` `var(--chart-${n})` ``): a name must be followed by
  `)` or `,` to count. The kit asserts its own chart ramp separately; an app that builds
  names checks them itself.

What the guard does not judge: whether a declared token is the right one for the
property (`--border` as a fill passes, §5.2), and palette discipline unless the app asks
for it (`refusePalette`). A palette variable passes by default, because it resolves.

Not taken from keksdose's own guard: counting the names the kit's dist JS writes. They
only widen what passes (component internals such as `--icon-button-tone` and `--fp-*`),
which rule 1 keeps out on purpose.

### 8.3 What the kit ships

The entry point **`@eifi1/ui-kit/testing`** (`src/testing/index.ts`, its own `exports`
entry, not in the main barrel). This guard is its first content. Like the rest of the
kit, it is browser-safe code with no `node:fs`: the kit's own test reads its source
through `import.meta.glob`, and the guard takes texts, not paths.

```ts
/** Every custom property the installed kit declares or publishes to apps. */
export const KIT_CSS_VARIABLES: ReadonlySet<string>;

/** Every custom property a stylesheet declares (`--name:`), in any block, except a name
 *  declared only inside `@theme inline`. Comments are skipped. The same rule builds
 *  KIT_CSS_VARIABLES from tokens.css. */
export function declaredCustomProperties(css: string): Set<string>;

export interface UndeclaredCssVariablesOptions {
  /** Variables a library writes at runtime: names or patterns. */
  runtime?: readonly (string | RegExp)[];
  /** Also check `var(--x, …)`. `--app-nav-h` counts only here. Default false. */
  checkFallbacks?: boolean;
  /** Report Tailwind palette variables (`--color-red-500`, …) although they resolve. Default false. */
  refusePalette?: boolean;
}

/** Every `var(--name)` without a fallback that nothing declares, as "path:line --name". */
export function undeclaredCssVariables(
  /** path → text: the app's .ts/.tsx/.css source, tests left out. */
  sources: Record<string, string>,
  options?: UndeclaredCssVariablesOptions,
): string[];
```

All in `src/testing/css-variables.ts`.
- **The kit's tokens are built in.** `KIT_CSS_VARIABLES` comes from
  `src/testing/css-variables.generated.ts`, which `scripts/gen-kit-css-variables.mjs`
  writes from `tokens.css` by the rule of `declaredCustomProperties`;
  `token-vars-declared.test.ts` fails while it is stale. It leaves out the
  `@theme inline` names and `--app-nav-h` (§8.2 rule 1), and the same test pins both
  sides: `--text-muted` and `--text-caption`
  are in, while `--text-color-muted`, `--background-color-surface` and `--app-nav-h` are
  out. So it is always the installed version's, and an app never searches `node_modules`.
- **Tailwind's theme names are built in too**, generated from the `tailwindcss/theme.css`
  the kit builds with (4.3.3).
- **`.css` entries in `sources` count as declarations** (rule 2) as well as uses.
- **It refuses a vacuous run:** it throws when `sources` holds fewer than ten files, or
  when a `.css` entry is empty. Vitest stubs every stylesheet with an empty string by
  default, `?raw` included; the kit opts `tokens.css` out (`css.include` in
  `vitest.config.ts`). An app reading its CSS the same way would otherwise lose every
  declaration and every use in it without a word: spurious failures for its own tokens,
  and nothing checked inside the stylesheet.
- **One implementation:** the kit's own `token-vars-declared.test.ts` calls the same
  function over the kit's source, so the two sets of rules cannot drift apart.
- **`declaredCustomProperties`** is exported for an app that wants the same reading of
  its own stylesheets, outside the guard.

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
- **`node:fs`**, in a test project that has node types (a DOM-free project, as
  Kurvenschmiede's). The helper is the same.

An app passes `runtime` only for a library's variables; its own writes are found in its
source.

## 9. Per repo

Moved to [archive/colour-roles-history.md](archive/colour-roles-history.md): each app's
0.33 to-dos — the class rewrite, the swipe plans, the money fills, the loud warning
frames, the hovers and the guard's wiring. `docs/adopt-0.33.md` carried them as
checklists.

## 10. What the kit adds (ui-kit 0.33)

All shipped in ui-kit 0.33.0; the kit's own markup moved to the utilities in 0.34.0.
- **Tokens** (`tokens.css`, and the presets in `src/theme/palette-presets.ts`):
  - the `-contrast` set of §5.1, `--neutral` and `--warning-border-strong`;
  - the light value fixes of §5.5;
  - light surface-2 = page in every preset and in the deriver's `SURFACE_L` (§5.3);
  - `--bg-hover` at 5.5 % ink (§5.7) and `--brand-muted` at 62 % brand (§5.8), with
    `HOVER_INK` and `BRAND_MUTED_SHARE` in `src/theme/contrast-tokens.ts` for the
    deriver;
  - in the deriver, a brand hover that moves away from its label (§5.5), and a brand
    solved until `--brand-muted` clears 4.5 on both soft chips (§5.8).
- **Utilities:** the `@theme inline` block of §7, with the static brand classes moved
  into it.
- **Components:**
  - `SwipeAction.tone` and `SwipeAction.paint` (§6), used by DataTable,
    TranslationReviewPanel and `feedbackSwipePlan`;
  - Chip `solid`, the FloatingAction badge, the toast's action button, Card `strong` and
    IconButton's warning ring on the new tokens; the kit's brand text on `--brand-muted`
    (§5.8), and a pressed brand glyph hovering to it;
  - the hovers of §5.7: B′'s translucent ink on Button `secondary`/`ghost`, IconButton
    muted and the feedback inbox's idle filter chip; Table zebra rows
    `even:hover:bg-surface`; the calculator's digit keys hovering to `--bg-active`;
  - `--border` no longer a fill under text (§5.2): Button `primary`'s hover, the
    calculator and numpad accent keys, and the numpad digit's pressed state on
    `--bg-active`.
  - Since 0.34 the kit's own markup and its exported class constants use the role
    utilities instead of `[var(--…)]` classes (round 0.34 Q1, decision 5).
- **Guards in the kit:**
  - `auditPalette` with the semantic layer, money neutral, brand-hover and the hovered
    soft brand chip;
  - the `tokens.css` literal audit (`tokens-css-audit.test.ts`, §5.5);
  - `check:tailwind` assertions for the namespaces and the derived roles;
  - the second ratchet, at 0 since 0.34 (§7.4), and the `neutral` fix in the first;
  - the `tokens.css` mirror test, load-bearing for an app without a palette layer
    (§3.1).
- **The app guard:** `@eifi1/ui-kit/testing` with `undeclaredCssVariables`,
  `KIT_CSS_VARIABLES` and `declaredCustomProperties` (§8.3), with `checkFallbacks`,
  `refusePalette` and the chart-key rule; its entry in `exports` and in the packaging
  checks; the kit's own `token-vars-declared.test.ts` on the same function.
- **Docs:** the README's "Tokens" and "Styling" sections carry the families and the
  utilities; the showcase foundations page shows every fill with its foreground.

## 11. Risks

Moved to [archive/colour-roles-history.md](archive/colour-roles-history.md): the 0.33
round's risks. The ones that are rules are in the body: an app picks the hover for its
own rest colour (§5.7), an app's tests pin its `paint` (§6), and the guard reads names,
not meaning (§8.2).

## 12. Settled after the reviews (2026-10-09)

The reviews' items keep their numbers, which the code cites. An item that amended a
section above is folded into it and points there; an item that is a rule of its own
stands here (none does: all twelve are folded). The reviews' wording is in
[archive/colour-roles-history.md](archive/colour-roles-history.md).

1. **k26 stands: light `--bg-surface-2` = page, plus B′** → §5.3, §5.7.
2. **The hover of a row that rests on surface-2** → §5.7.
3. **The `:root`/`.dark` mirror is load-bearing** → §3.1.
4. **The utility set, completed** → §7.2.
5. **The guard** → §8.2, §8.3.
6. **Swipes: `paint` for a documented exception** → §6.
7. **The adopt-0.33 migration for tests** → archive (`docs/adopt-0.33.md` carried it).
8. **Comments and optional work** → archive.
9. **`--border` is not a fill under text** → §5.2.
10. **Two hover points: B′'s translucent ink, `--bg-hover` at 5.5 %** → §5.7, §5.5.
11. **The brand as text on its hovered chip** → §5.8.
12. **A brand glyph on the hovered chip turns brand-muted** → §5.8.

## A. Method

Moved to [archive/colour-roles-history.md](archive/colour-roles-history.md): how the
0.32.2 audit and the reviews measured — the kit's own colour code over the five distinct
presets, Tailwind 4.3.3's compiler for the namespaces, and the class counts. The audits
that hold the numbers are `auditPalette` and
`src/theme/__tests__/tokens-css-audit.test.ts`.
