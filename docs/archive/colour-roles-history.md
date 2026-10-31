# Colour roles — history

What [the colour roles contract](../colour-roles-harmonization.md) moved out of its body in
ui-kit 0.34 (refactor audit DOC-1): its snapshot of the kit and the three apps on 0.32.2,
the measurements of 2026-10-09, the per-app sites and to-dos, the round's risks, the
reviews' list and the method. Kept as written: "today", line numbers and each app's state
are as of the day each part was written, and an item may since have been folded into the
contract, which wins. Section numbers are the contract's.

## Status as written

Status: **2026-10-09, decided; reviewed 2026-10-09.** Marcel took every recommendation
the same day (§2). All three apps reviewed it the same day; §12 records what they
settled, and it wins over the sections above where they differ. Where a section above was
wrong, it is corrected in place too. Led from ui-kit for the 0.33 round, and ships as
ui-kit 0.33.

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

### 3.1 Where they live — the note on the header comment, as written

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
`--money-expense` already went through this: amber-700 failed at 3.88 and was replaced by `#905902`
(`tokens.css:192-194`). `--warning` is still amber-700.

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

### 5.1 Every fill names its foreground — money per preset, as written

Money per preset (`--money-*-contrast`):

| preset · mode | contrast | income | expense | net | neutral |
|---|---|---|---|---|---|
| default light | #ffffff | 6.93 | 5.81 | 6.04 | 5.88 |
| default dark | page #0e0f1c | 8.65 | 9.57 | 7.96 | 7.44 |
| ink light / dark | #ffffff / #090d15 | 5.81 / 5.43 | 5.87 / 5.44 | 5.86 / 5.44 | 5.51 / 7.86 |
| moss light / dark | #ffffff / #060f0a | 5.81 / 5.49 | 5.78 / 5.46 | 5.78 / 5.46 | 5.47 / 7.89 |
| plum light / dark | #ffffff / #100b12 | 5.88 / 5.44 | 5.87 / 5.45 | 5.86 / 5.44 | 5.52 / 7.80 |
| contrast light / dark | #ffffff / #0c0d0f | 5.81 / 5.43 | 5.87 / 5.44 | 5.84 / 5.43 | 5.51 / 7.84 |

### 5.3 The well — the sites per repo and the cost, as written

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

### 5.5 Status colours that clear AA — found while measuring, as written

Found while measuring, settled without a decision:
- **The deriver's dark brand hover:** it lightens hover while the contrast is white
  (4.07–4.17:1). Hover should move away from the contrast colour instead.
- **Brand used as text** in the derived presets is 3.00–3.06 in dark. The kit's text
  uses of `--brand` (Chip outline brand `chip.tsx:140`, link-current
  `button-group.tsx:181`, ChoiceCard `choice-card.tsx:256`) should read `--brand-muted`,
  which is 4.45–4.51 there and needs the same 4.5 floor in the deriver.
- **`feedback-swipe.tsx:82-86`** still says `--info` has no contrast token. It has had
  one since 0.27.

### 7.3 Collisions — the apps' rows, as written

| where | what | effect |
|---|---|---|
| App CSS | kk `.txn-row-*`, `.hb-budget-shift`, `.demo-mode`; KS `.hb-figure`, `.fi-*` | none |
| Existing class strings | `bg-surface-2` in `ui.tsx:3003` and `buttons-surfaces.tsx:568`; `text-secondary` in kk `budget-table.tsx:53` | all three are in comments or prose; none renders |

### 7.4 Guards — keksdose's lint, as written

- **kk's lint message** (`eslint.config.js:47`) names the utilities instead of the
  `[var(--…)]` forms.

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

## 12. Settled after the reviews (2026-10-09) — as written

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
     - The kit cannot see an app's own rest colour, so `docs/archive/adopt/adopt-0.33.md` states the rule.
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

11. **The brand as text on its hovered chip (found in the 0.33 build).** Item 10's rule
    holds for the soft brand chip too. `--brand-muted` sits on `--brand-bg-hover` in
    ButtonGroupLink's current page (`button-group.tsx:184`), DatePicker's selected day
    (`date-picker.tsx:987`) and MiniCalendar's range (`mini-calendar.tsx:767`). No audit
    measured that pair.
    - **Before:** 4.08–7.83. Seven of the twelve preset × mode combinations failed:
      Default and Imprint light 4.42 (they share their values), Moss light 4.35, Ink
      dark 4.09, Moss dark 4.08, Plum dark 4.11, Contrast dark 4.38.
    - **The fix:** `--brand-muted` moved from 70 % to **62 %** brand in the ink
      (`tokens.css`, and `BRAND_MUTED_SHARE` in `theme/contrast-tokens.ts`). The text
      moves, not the chip.
    - **The other two ways fail:**
      - Moving the brand (the deriver's loop) pushes Ink, Moss and Plum dark so far that
        their label flips from white to the dark ink, at 4.50–4.58. Default light's
        indigo-600 would have to change too.
      - Lightening `--brand-bg-hover` clears 4.5 only at 14–15 %. That hover sits
        1.00–1.003 from `--brand-bg`, so there is no hover left.
    - **After:** on `--brand-bg-hover` **4.50–7.91**: Plum dark 4.50, Ink and Moss dark
      4.51, Default light 4.59. On `--brand-bg` it goes from 4.51–9.85 to 4.96–9.95.
      On the page, card, well and `--bg-hover` it goes from 4.56–11.66 to 5.00–11.78.
      The hover still steps 1.10–1.26 from `--brand-bg`. More contrast changes none of
      these, because none of their inputs step.
    - **The deriver** now solves the brand against both chips, `--brand-bg` and
      `--brand-bg-hover`. At 62 % it needs one step less in Plum dark, so `--brand` goes
      from `#9354a8` to `#9153a6` and `--brand-hover` from `#814295` to `#7f4193`. No
      other preset changes.
    - **The audits** now measure the hovered chip in every preset × mode × contrast
      level: `auditPalette` and `tokens-css-audit.test.ts`. The token audit also holds
      the three shares equal to the stylesheet's, and the hover's 1.08 step from the
      chip.
12. **A brand glyph on the hovered chip turns brand-muted (found in the 0.33 build).**
    `--brand` as an icon on `--brand-bg-hover` is 2.69–2.80 in Ink, Moss, Plum and
    Contrast dark, under an icon's 3:1. Where a pressed control hovers to that chip
    (IconButton `pressed`, FloatingPanel's two toggles), its glyph hovers to
    `--brand-muted`, which item 11 holds at 4.50 or more there. At rest the glyph stays
    `--brand` on `--brand-bg`.

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
