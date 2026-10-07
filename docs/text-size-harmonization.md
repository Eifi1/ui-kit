# Text size and contrast — harmonisation plan

Status: **2026-10-07, draft for review.** Led from ui-kit at Marcel's request. It runs in
parallel with the billing round (`docs/billing-harmonization.md`), and ships as ui-kit 0.32
or the next minor after the reviews.

Marcel tried keksdose with his father-in-law, who reads poorly and needs larger letters:
"Not only zoom but the whole appearance should be tailored for larger letters." keksdose
proposed the shape (2026-10-07). This plan is built from that proposal and from a
read-only audit of the kit and the three apps (2026-10-07; kept outside the repo).
**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.

It extends the settings round (`docs/settings-harmonization.md`): the two new settings
live in the core `appearance` group, and the text size follows the account the way the
language does (§6.2 there).

## 1. Where each one stands

| | kit | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|---|
| Root font size | not set (the browser's default, usually 16 px) | not set | not set | not set |
| Fixed-px text | 107 `text-[10/11px]` sites, about 12 shared typography constants | 39 | 4 | 62, plus SVG `fontSize` |
| Other fixed px | about 25 geometry hacks; about 30 JS px values (popover widths, row heights, chart constants) | 16 chart heights in px; `min-[2400px]` | about 23 px widths and heights | `ROW_HEIGHT = 68` windowed rows; 5 MeasuredGrids at 28 px |
| Breakpoints | Tailwind rem, which does **not** follow the root size in media queries; about 26 JS queries in px (`PHONE_QUERY` and others); 11 container-query sites in rem, which do | 13 JS px queries; 65 container queries | none in JS | none |
| Pinch zoom | showcase allows it | **blocked** (`maximum-scale=1`, for the keyboard inset) | allowed | allowed |
| Bottom bar | `mobileHidden` only; no "More" | 7 entries | 6–7 groups | 4 |
| Tooltip-only facts | IconButton labels, `disabledReason`, FieldHint, StatTile hints, absolute dates, colour-only heatmap days | flag dots, cleared status | — | — |
| Contrast handling | none (`prefers-contrast` unused); tokens written inline on `<html>` | 69 hard-coded `text-slate-*` | `--muted-foreground` aliased to `--money-neutral` (110 uses) | 235 hard-coded `text-slate-*` |

What already works: Tailwind's spacing and type scale are in rem, so about 90 % of the
kit grows with one root font size. Icons sized with `size-*` grow with it, and so do
container queries.

## 2. Decisions (Marcel, 2026-10-07)

1. **Three steps: Normal, Large, Extra large** — 100, 125 and 150 % of the browser's own
   font size. "Normal" keeps whatever size the person set in the browser.
2. **The text size follows the account like the language** (settings contract §6.2): it
   is saved with the account, and a new device adopts it unless that device has a choice
   of its own. A phone and a desktop can still differ.
3. **The whole appearance adapts, not just the letters.** At Large and Extra large the
   layout switches earlier: the width limits scale with the text, so a tablet at 150 %
   gets the phone layout and a laptop gets one-column forms.
4. **A separate "More contrast" switch** beside the text size. It is also on
   automatically when the device asks for more contrast (`prefers-contrast: more`), and
   it works with any text size.
5. **keksdose allows pinch zoom again.** Blocking it fails WCAG 1.4.4. Its keyboard
   handling learns to live with a zoomed viewport (§7.3).

Settled by the kit in this draft; the reviews may object:

6. **Both settings are device-scoped in storage and account-scoped by default**, through
   one rule for both: the device's own choice, else the account's, else the system's
   (`prefers-contrast` for contrast, Normal for the size).
7. **The core `appearance` group** holds language, theme, text size and contrast, in that
   order. A quick switch in the top bar is not part of this round.
8. **Public pages follow it too:** the landing, sign-in and the boot splash read the
   device's choice, since it is stored on the device.

## 3. The mechanism

### 3.1 One scale on `<html>`

- `<html data-text-size="normal|large|xlarge">`, with `font-size: 100% / 125% / 150%` set
  in the kit's `tokens.css`. Percent, never px, so it builds on the browser's own
  default.
- **Applied before first paint**, the way the theme is: `applyPersistedTextSize(key)` is
  called in `main.tsx` next to `applyPersistedTheme`, before `createRoot`.
- **A Tailwind variant** for size-dependent styles without JS, modelled on `dark`:
  `large:` matches `[data-text-size=large]` and `[data-text-size=xlarge]`, and `xlarge:`
  matches only the latter.
- **`useTextSize()`** returns `{size, scale}` for the few things CSS can't reach: canvas
  and SVG charts, windowed lists, popover widths.

### 3.2 No fixed px for anything that holds text

- **Type:** the kit's 10 and 11 px sizes become named rem sizes (`text-micro` =
  0.625 rem, `text-caption` = 0.6875 rem) in `@theme`. Every `text-[Npx]` in the kit and
  in the apps moves to them or to Tailwind's own sizes. A lint rule bans new ones.
- **Geometry:** paddings, track and thumb offsets, popover widths and row heights move to
  rem or `calc(rem ± 1px)`. Pure hairlines stay px: 1 px borders, shadows, gesture
  thresholds.
- **JS values:** a windowed list's row height, a chart's axis width and tick spacing are
  multiplied by `scale`.

### 3.3 Breakpoints that follow the text (§2.3)

A media query's rem resolves against the browser's default, not `<html>`, so Tailwind's
`sm`/`md`/`lg` stay put when the root grows. The kit makes them follow:

- **CSS:** the breakpoint variants are redefined in `tokens.css`, one set per size, so
  `md:` means 48 rem at Normal, 60 rem at Large and 72 rem at Extra large. The exact
  technique (scaled variants under `:where([data-text-size])`, or the body as a named
  container) is the kit's choice after a spike. Either way `md:` keeps its name in every
  app.
- **JS:** `useBreakpoint("md")` and `usePhoneLayout()` replace `useMediaQuery` with px
  strings and `PHONE_QUERY`. The CSS and JS answers always agree: AppShell's `md:hidden`
  and its `isMdUp`, DataTable's `isMdUp`.
- **The effective widths at 150 %:** a 390 px phone is 260 px wide, a 768 px tablet 512,
  a 1280 px laptop 853. Layouts must hold at 240 px (a 360 px phone at 150 %).

## 4. What changes at Large and Extra large

These follow from §2.3. They are kit behaviour; an app gets them by using the kit part.

**Lists and phone cards:**
- **DataTable phone card:** each label goes above its value, nothing truncates, and rows
  get more space. A new `mobileDetailsInRow` puts the `mobileHidden` columns into the
  opened row, so nothing is lost.
- **ListItem:** title, subtitle and meta wrap instead of truncating.
- **Chips and status squares:** every colour carries a word or a symbol (the kit's
  chips already do; the apps' own dots and squares follow, §7).

**Controls:**
- **Touch targets at least 48 px** (in scaled px) for buttons, inputs, chips and row
  taps. Button `sm` grows to `md`'s height.
- **IconButton shows its label** as visible text beside the icon. Inside a dense table
  row an app may keep the icon alone with `labelVisible={false}`, which must be rare.
- **FormActions stack** full width on a phone layout.
- **Switch, Slider, ToggleGroup and Checkbox** keep their proportions (their px
  arithmetic moves to rem, §3.2).

**Navigation:**
- **AppShell's bottom bar** shows at most four entries and a fifth "More" cell that opens
  a sheet with the rest (`mobileBarMax`, default 4 at Large and above, unlimited at
  Normal). The app orders its nav so the four most used come first.
- **The sidebar** never collapses to icons only.
- **The top bar** keeps its essential icons; an app may move others into the account
  menu with `mobileHidden`-style flags.

**No fact only in a tooltip** (at every size, not only at Large: touch can't open a
tooltip):
- `disabledReason` shows as a line under the control, not only as a tooltip;
- FieldHint and StatTile hints show as inline text;
- relative dates show the absolute one beside them;
- a colour-only value (heatmap day, status square) gets a number or a word in the
  layout.

**Charts:**
- Axis labels follow the text size, the y-axis width and tick spacing scale (§3.2), and
  there are fewer ticks (three instead of five).
- Legends move under the chart.
- StatTile shows its one big number; the sparkline and sub-values move below.

## 5. More contrast (§2.4)

`<html data-contrast="more">`, from the setting or from `prefers-contrast: more` when the
setting is on "System".

- **Text:** `--text-muted` becomes `--text-secondary`, and `--text-secondary` and
  `--text-placeholder` move a step towards `--text-primary`.
- **Lines:** dividers and borders move towards `--border-strong`.
- **Focus:** one shared focus frame (`--focus-ring-width`, 2 px → 3 px), instead of the
  hundred spelled-out rings in the kit today.
- **How:** the kit's `applyTokenSet` takes a contrast flag, because the colour tokens are
  written inline on `<html>`. The derived tokens are redefined per attribute in
  `tokens.css`.
- **Apps follow only through tokens.** Hard-coded `text-slate-*` classes (keksdose 69,
  Kurvenschmiede 235) and kastlan's `--muted-foreground` alias don't follow, and move to
  the tokens in this round.

## 6. The settings and their backend

- **The kit parts:** `TextSizeSetting` (Normal / Large / Extra large) and
  `ContrastSetting` (System / Standard / More), in `settings-fields.tsx` beside
  `ThemeSetting`. Both are segmented controls with the kit's words in seven languages.
- **The stores:** `createTextSizeStore(key)` and `createContrastStore(key)`, shaped like
  `createThemeStore`.
- **The account (§2.2):** `/auth/me` gains `text_size` and `contrast`, nullable (null =
  never chosen), written with `PATCH /auth/me` under the PATCH rule (settings §6.1).
  The kit's `useAccountAppearance` applies the language's order (the device's own choice
  → the account's → the default) to both and never writes the account on its own; a
  pick writes the device and the account, except in a demo.
- **server-kit:** `TEXT_SIZES` and `CONTRAST_MODES`, and the two fields on `UserResponse`
  and `ProfileUpdate`, both optional.

## 7. Per repo (summary; the reviews refine it)

- **keksdose** (first adopter, as it offered):
  - remove `maximum-scale=1`; teach `use-keyboard-inset` to read a zoomed viewport
    (`visualViewport.scale > 1`) and keep the bottom editor above the keyboard then;
  - move its appearance card onto the settings layout (due from 0.31) with the two new
    settings;
  - its 39 px text sites, 13 JS px queries and 16 chart heights;
  - the transaction register's phone rows at Large: payee, category and memo wrap; the
    flag dot gets its name; the cleared status gets a word;
  - the budget's three-column phone figures stack at Large;
  - its 7 bottom-bar entries ordered so the four most used come first;
  - its 69 `text-slate-*` to tokens;
  - the boot splash in rem.
- **kastlan:**
  - `viewport-fit=cover`; the stale inline theme script goes;
  - `--muted-foreground` points at `--text-muted`;
  - its px widths and heights to rem; `mobilePrimary` on the main registers (tenant before
    lease number);
  - its 6–7 nav groups ordered for the four-plus-More bar.
- **Kurvenschmiede:**
  - the segment list's 68 px rows and the five MeasuredGrids scale;
  - its 62 px text sites and the corner preview's SVG `fontSize`;
  - its 235 `text-slate-*` to tokens;
  - the facing-pair legend stacks at Large;
  - its bar already has four entries.

Every app: the store and the pre-paint call in `main.tsx`, the two settings in the
appearance group, `useBreakpoint` for its JS queries, and a look at its main screens at
360 px / 150 %.

## 8. What the kit adds (ui-kit 0.32)

- The mechanism: the `data-text-size` and `data-contrast` CSS in `tokens.css`, the
  `large:` / `xlarge:` / `contrast:` variants, the scaled breakpoint variants,
  `applyPersistedTextSize` / `applyPersistedContrast`, the stores, `useTextSize`,
  `useBreakpoint`, `usePhoneLayout`, `useAccountAppearance`.
- The settings: `TextSizeSetting`, `ContrastSetting`, and the labels in seven languages.
- The px clean-up of §3.2, and a lint rule against new `text-[Npx]`.
- The behaviours of §4: DataTable `mobileDetailsInRow` and the stacked labels, ListItem
  wrapping, IconButton's visible label, FormActions stacking, AppShell `mobileBarMax`
  with "More", `disabledReason` and hints in the layout, chart scaling.
- The contrast tokens and the shared focus frame of §5.
- **The showcase:** a text-size and a contrast switch beside the theme; the device
  preview gains a size axis (phone, tablet, desktop × three sizes); a Playwright pass at
  each size, since jsdom has no layout.

server-kit 0.6: the two account fields and their vocabularies (§6).

## 9. Risks

- **Breakpoints:** without §3.3, a tablet at 150 % would get the desktop shell with a
  360 px sidebar.
- **Arithmetic that breaks at 125 %:** fractional pixels (0.125 rem = 2.5 px), the
  ToggleGroup-to-field height match, Switch thumbs, fixed windowed rows. §3.2 covers the
  known ones; the Playwright pass finds the rest.
- **Layouts tuned for a 320 px phone** crack at 240 px effective width (StatTile 2-up).
- **Pinch zoom (keksdose):** a zoomed viewport shrinks like an open keyboard; while
  zoomed, the inset hook must not move bottom editors (§7).
- **Apps that bypass the tokens** don't follow the contrast setting until their
  hard-coded colours move.

## 9a. Questions for the reviews

1. Is four the right maximum for the bottom bar at Large, and which four in your app?
2. Where would `IconButton`'s visible label break your layout, so that you need
   `labelVisible={false}`?
3. Do your windowed lists or canvases need anything beyond `useTextSize().scale`?
4. Anything that must stay fixed px in your app that §3.2 would move?
