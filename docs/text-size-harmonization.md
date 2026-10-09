# Text size and contrast — harmonisation plan

Status: **2026-10-07, reviewed.** All three apps answered the same day; §10 records what
they settled, and it wins over the sections above where they differ. Led from ui-kit at Marcel's request. It runs in
parallel with the billing round (`docs/billing-harmonization.md`), and ships as ui-kit 0.32
or the next minor after the reviews. **2026-10-09:** §10.16 and §10.17 (ui-kit 0.33),
settled by Marcel; the three apps review them next.

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
- **A floating label becomes a static label above its field** (§10.17), the phone card's
  rule for fields.
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
  - remove `maximum-scale=1` and the three outdated comments about it; the keyboard inset
    stays 0 while zoomed (§9, §10.2), as `use-keyboard-inset` already does;
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

ui-kit 0.33 (§10.16, §10.17): `RowAction`'s `pressed`, `expanded`/`controls`, the
`muted`/`info`/`warning` tones and `dataTour`; RowActions' `glyphSize` and `tooltipSide`;
the `truncate-until-large` utility; the static label above a field at Large; the
truncation sweep in `scripts/screenshot-sizes.mjs`.

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

## 10. Settled after the reviews (2026-10-07)

All three apps reviewed the draft (dbc957e) the same day. Where this list and the
sections above differ, this list wins.

1. **iOS zoom-on-focus** (keksdose): a field under 16 px makes iOS zoom the page on
   focus, which `maximum-scale=1` used to suppress. Once keksdose drops it, that zoom
   would hide the pinned editor footer behind the keyboard (keksdose #154). **The kit's
   fields are at least 16 px on touch** (`pointer: coarse`) at every size. At Large and
   above they are 17.5 px anyway.
2. **A zoomed page keeps the keyboard inset at 0** (§9 stands; §7's earlier line is
   corrected). Following a zoomed viewport would drag the pinned row on every pan. The
   kit exports one guarded reader, `readKeyboardInset()`, and its own `useVisualViewport`
   (PickerSheet) uses the same guard. Today a zoomed page puts PickerSheet's close
   button off screen in kastlan and Kurvenschmiede. keksdose's local copy goes.
3. **First paint uses the last known account value** (keksdose):
   - `applyPersistedTextSize(key, {account})` and `applyPersistedContrast(key,
     {account})` fall back to the account value the app persisted with its user, so a
     device without its own choice doesn't paint Normal and then jump. This works
     offline too;
   - the kit exports a tiny inline `<head>` snippet for a boot splash painted from
     `index.html`, and the stored format is frozen for it;
   - the splash's px move to rem.
4. **Breakpoints:** attribute-scoped media variants wrapped in `:where()`, not the body as
   a container (fixed overlays and self-queries would break).
   - Arbitrary px media variants (`min-[2400px]`) are linted; keksdose's four become a
     named `3xl`.
   - `usePhoneLayout()` is the single answer: the DataTable full-screen dialog and an
     app's own phone checks (keksdose's sticky editor footer) use the same one.
   - Pointer and display-mode queries stay `useMediaQuery`.
5. **Contrast mechanics** (keksdose):
   - `applyTokenSet` writes the text and border tokens inline on `<html>`, so the
     contrast step is applied inside it, not by a CSS rule;
   - "System" re-applies on a `matchMedia("(prefers-contrast: more)")` change;
   - CSS-only derived tokens are written inline too, or tested in the built CSS. (This
     said Tailwind v4 strips a block that holds only custom properties; 4.3.3 keeps it,
     colour-roles §3.1. The test stays: it proves the value reaches the build.)
6. **The stored vocabularies:** `TEXT_SIZES = ("normal", "large", "xlarge")` and
   `CONTRAST_MODES = ("system", "standard", "more")`. **"System" is a stored value**:
   the PATCH rule refuses an explicit null, so null means only "never chosen".
7. **The bottom bar:**
   - `mobileBarMax` takes the app's array order. The app orders by role if it wants
     (kastlan: manager vs accountant).
   - The More sheet keeps each group's sub-pages.
   - At Large: four entries plus More. At **Extra large: three plus More**: a fifth of a
     360 px phone at 150 % holds what 48 px holds at Normal.
   - Labels wrap to two lines instead of truncating (Kurvenschmiede).
   - The More cell carries the hidden entries' links as tour anchors, so a tour step
     aimed at a hidden entry points at More (keksdose's tours).
8. **Dense row actions:**
   - at Large, a dense row's IconButtons collapse into a "⋯" row menu (the roster's
     `UserRowActionList` pattern), instead of showing every label (Kurvenschmiede 44,
     kastlan 119 IconButtons); a row action's state, tone and tour anchor survive the
     collapse (item 16);
   - `labelVisible={false}` remains for an icon on content: receipt overlays, map zoom,
     a viewfinder, photo thumbnails.
9. **Windowed lists** (Kurvenschmiede): "nothing truncates" needs variable rows.
   `useWindowedRows` takes measured heights, with `rowHeight × scale` as the estimate, and
   MeasuredGrid follows.
10. **Charts:**
    - `SeriesChart`'s height takes a CSS length (e.g. `min(20rem, 60dvh)`) rather than
      scaled px: 480 px × 1.5 would fill a phone;
    - axis widths (keksdose `MONEY_AXIS_WIDTH`) follow the scale: `SeriesChart`
      multiplies an `axes[].width` by it itself (`axisBandWidth`), so an app passes
      its Normal width and never multiplies it too (corrected 0.32.1, keksdose's
      report: it would scale twice);
    - strokes, dash patterns and grid ink stay px;
    - a mirrored tick band scales both sides by the same factor;
    - an SVG whose text is in viewBox units (Kurvenschmiede's corner preview) moves its
      labels to an HTML overlay or grows the drawing.
11. **The kit exports CSS lengths instead of px copies:** the DataTable dialog's gutter
    (keksdose copied `py-3` as `SCROLLER_GUTTER_PX`) and the Toaster's offsets.
    **SignaturePad's** stroke scales with the text (kastlan).
12. **Same release as the settings rule:** keksdose ships settings §6.2 (no
    session-start language write, `caches: []`) together with `useAccountAppearance`, so
    one card doesn't follow two opposite rules.
13. **Corrections to §1:**
    - Kurvenschmiede has about 248 `text-slate-*`;
    - keksdose has 99 lines of `text-slate-*` plus 316 slate border/background lines and
      117 hard-coded hue text classes, all moving to tokens;
    - kastlan has 19 px widths and heights;
    - keksdose's "pinch zoom blocked" is really "zoom-on-focus suppressed" (iOS ignores
      `maximum-scale` for a pinch; Android overrides it).
14. **App notes:**
    - keksdose renames its own "Appearance" select (Simple / Enhanced) to "Feature set";
    - keksdose keeps PinchZoomImage for receipts;
    - kastlan fixes its stale inline theme script;
    - Kurvenschmiede's four bar entries need no More.
15. **Risks added to §9:**
    - iOS zoom-on-focus (item 1);
    - PickerSheet on a zoomed page (item 2);
    - tours losing nav anchors (item 7);
    - inline contrast tokens (item 5).

**Round 033 (ui-kit 0.33).** Marcel settled items 16 and 17 on 2026-10-09, both as
recommended, from the kit's UI audit of that day (kept outside the repo). The three apps
review them next.

16. **A row action carries its state** (keksdose k15; Marcel, 2026-10-09). keksdose keeps
    hand-rolled IconButtons at Normal on three rows and uses RowActions only at Large,
    because a `RowAction` can't say "on", "open", a tone other than danger, or a tour
    anchor. From 0.33 it can, at both sizes:
    - **A toggle** (`pressed`): inline, `aria-pressed` with IconButton's "on" look; in the
      menu, `aria-pressed` on the entry. The label stays the same in both states.
    - **A disclosure** (`expanded`, with `controls`): `aria-expanded` and `aria-controls`,
      inline and on the menu entry. It is for something the action opens in the page (a
      share card under the row, an add-category row), and is exclusive with `pressed`.
    - **Tones `muted`, `info` and `warning`:** inline, IconButton's tone. In the menu the
      words keep the default text colour and the glyph takes the tone; `danger` keeps its
      danger text; `muted` and `default` look the same in a menu.
    - **A tour anchor** (`dataTour`) goes where the reader must go: inline, `data-tour` on
      the IconButton; collapsed, an aria-hidden, pointer-transparent overlay on the "⋯"
      per anchored action (the More cell's `TourAnchor` pattern, item 7), so two anchored
      actions in one row don't fight over one attribute; in the open menu, on the entry
      too.
    - **The row's glyph size and tooltip side** are RowActions props, so a header strip
      with 14 px glyphs and a last column whose tooltips open to the start need no
      hand-rolled icons. `rowActionsColumn` passes both through.

    ```ts
    export type RowActionTone = "default" | "muted" | "info" | "warning" | "danger";
    export interface RowAction {
      // …existing…
      tone?: RowActionTone; // widened from "default" | "danger"
      commit?: CommitScope; // widened by billing §12.36
      /** A toggle: aria-pressed and the "on" look. The label stays the same in both states. */
      pressed?: boolean;
      /** Opens or closes something in the page: aria-expanded. Not with `pressed`. */
      expanded?: boolean;
      /** The id of what `expanded` opens: aria-controls. */
      controls?: string;
      /** A guided tour's anchor: data-tour on the control; collapsed, an overlay on "⋯". */
      dataTour?: string;
    }
    export interface RowActionsProps {
      // …existing…
      /** The inline glyphs' size (IconButton's), e.g. 14 in a dense header strip. */
      glyphSize?: IconButtonGlyphSize;
      /** The inline tooltips' side: "start" for a table's last column. */
      tooltipSide?: TooltipSide;
    }
    ```

    - `glyphSize` takes IconButton's `IconButtonGlyphSize` (12, 14, 16, 20, 24 or 28), not
      a free number.
    - `dataTour` is the kit's existing name (`AppShellNavItem.dataTour`). A generic
      `data-*` bag was rejected: it can't say which control carries it when collapsed.
    - **i18n:** none; no new strings in any of the kit's seven languages.
    - **Tests** (`row-actions-033.test.tsx`, beside `row-actions-032.test.tsx`):
      - `pressed` gives `aria-pressed` and the on class inline, and `aria-pressed` on the
        menu entry;
      - `expanded` and `controls` give `aria-expanded` and `aria-controls` at both sizes;
      - tones: inline `data-tone`; in the menu the glyph's tint, with danger text for
        `danger`;
      - `dataTour`: inline on the IconButton; collapsed, one overlay per anchored action,
        and `querySelector('[data-tour=x]')` resolves to a visible box inside the "⋯";
      - `glyphSize` and `tooltipSide` reach the IconButton;
      - `commit: COMMIT_EXCEPT_BILLING` under a billing lock stays live, inline and in the
        menu.
    - **keksdose** folds its three sites into one `<RowActions>` at every size and drops
      its exception that keeps the icons at Normal:
      - accounts row (`features/accounts/accounts-page.tsx:931-1040`, and the Large list
        `accountActions`, :479-518): open and add as muted links, reconcile as `info` +
        `dataTour="account-reconcile"`, hide as muted + `commit`, delete as danger +
        `commit`, with `tooltipSide="start"`. The `<span data-tour>` round the "⋯" (:939)
        and the `CompactControls`/`stopPropagation` div go: RowActions does both;
      - budgets row (`features/budgets/budgets-page.tsx:380-486`): share (today `pressed`,
        :437-445) becomes `expanded` + `controls` on its share card; rename muted +
        `commit`; delete danger with its `disabledReason`. The in-row confirm (:466) stays
        the app's, beside RowActions, as at Large today (:416-428);
      - category group header (`features/budget/group-admin-actions.tsx:61-120`):
        `size="sm" glyphSize={14}` (today on each icon, :94, :106, :118), add category as
        `expanded` (today a hand-set `aria-expanded`, :97);
      - its other RowActions sites need nothing new.
    - **kastlan** (15 uses) and **Kurvenschmiede** (8): nothing required; neither splits
      Normal and Large.
17. **Nothing truncates at Large, measured** (Marcel, 2026-10-09). §4 says text wraps at
    Large, but the size sweep (`scripts/screenshot-sizes.mjs`) sees only a page running
    past the screen: `measure()` (:142-188) compares the scroll widths of the document,
    `<main>` and unclipped elements, so an ellipsis inside a box is invisible to it. A
    `w-64` FloatingField with a hint reads "Payment r…" at Extra large
    (`showcase/src/sections/fields.tsx:507-510`) and passes.
    - **The rule:** at Large and Extra large, a one-line ellipsis that cuts its text is a
      finding, as a page running past the screen is. Normal keeps its ellipses.
    - **One name for "truncate at Normal, wrap at Large":** `@utility
      truncate-until-large` in `tokens.css`: `truncate`, plus at `large:`
      `white-space: normal` and `overflow-wrap: anywhere`. It replaces the five copies:
      `WRAP_AT_LARGE` (`list.tsx:129`), `CHIP_LABEL_WRAP_AT_LARGE` (`chip.tsx:523`),
      `LABEL_WRAP_AT_LARGE` (`status-dot.tsx:84`) and `VALUE_WRAP_AT_LARGE`
      (`inline-edit-field.tsx:173`, `date-picker.tsx:217`). Four of them use
      `break-words` today; the utility takes list's `overflow-wrap: anywhere`. DataTable's
      phone card keeps its descendant rule (`CARD_NO_TRUNCATE`, `data-table.tsx:785-786`),
      which reaches an app's own `truncate` in a cell. The sweep still measures the
      utility, since it must not cut at Large.
    - **The parts that truncate at every size today take the utility:** ShareCard
      (`share-card.tsx:465`, :471, :536), UserRoster (`admin/user-roster.tsx:197`, :203),
      InvitationsPanel (`admin/invitations-panel.tsx:456`), FileButton's picked file
      (`file-button.tsx:631`) and the feedback attachments
      (`feedback/feedback-attachment.tsx:481`, 665-666, 902-904, 926-927). The sweep
      decides for the rest: Tabs' label and detail, MenuItem, Breadcrumbs, the AppShell
      sidebar, the combobox, multi-select, country and currency values, and the DataTable
      header label.
    - **A deliberate truncation at Large** (a value whose full text is one tap away, such
      as a select's chosen option in a dense table) carries `data-truncate-ok`, with the
      reason in a code comment. The sweep skips that subtree. Never on a name or an email.
    - **The floating label at Large is a static label above the field**: the phone card's
      "label above value" (§4), not a two-line label in the field. It stops being
      absolute, so it wraps like any text, and the field's top strip no longer reserves
      its height. This covers `FLOATING_LABEL_CLASS` (`ui.tsx:1708-1714`),
      `FLOATING_LABEL_STATIC` (`field-parts.tsx:39-43`), the row form's
      `max-w-[calc(100%-3rem)]` (`ui.tsx:1727-1730`) and the static label
      (`ui.tsx:1785-1787`). Normal keeps the floating label. **A visible change at Large
      in every app:** every floating-label field shows its label above.
    - **The sweep:**
      - `measureTruncation()`, a second `page.evaluate` beside `measure()`, runs only
        where `variant.size !== "normal"`. Per element:

        ```js
        const s = getComputedStyle(el);
        const oneLine = s.textOverflow === "ellipsis" && /hidden|clip/.test(s.overflowX) && s.whiteSpace.startsWith("nowrap");
        const clamped = s.webkitLineClamp && s.webkitLineClamp !== "none";
        const cut = oneLine ? el.scrollWidth > el.clientWidth + 1 : clamped ? el.scrollHeight > el.clientHeight + 1 : false;
        ```

      - it skips zero-size boxes, `display:none` and `visibility:hidden`, `.sr-only`,
        `aria-hidden` overlays, `[data-truncate-ok]` subtrees and the device-preview
        frame;
      - a finding names the nearest `[data-slot]` (e.g. `row-actions`), the nearest
        showcase example heading, the full `textContent` and the visible width. It is
        marked `data-truncation-offender=n`, and the first is screenshotted, as
        `data-overflow-offender` is today;
      - it prints `TRUNCATED` lines under each page and a total;
      - flags: `--truncation` (on by default); `--no-screens`, to measure without
        screenshots (faster, less RAM on the shared box); `--pages all`, the slugs of
        `showcase/src/routes.tsx`; `--gate-truncation`, exit 3 on a finding (1 stays
        overflow, 2 a script error);
      - `DEFAULT_PAGES` gains `fields`, `files`, `auth-account`, `user-admin`,
        `subscription`, `feedback-compose` and `lists-menus`.
    - **Report-only in 0.33.** From 0.34, once the parts above are fixed, the release run
      passes `--gate-truncation`. `scripts/check.mjs` does not run the sweep, and jsdom
      has no layout, so unit tests only pin classes.
    - **i18n:** none; no new strings in any of the kit's seven languages.
    - **Tests:**
      - the script: a fixture page with one ellipsis that cuts, one that fits, one under
        `data-truncate-ok` and one `.sr-only` gives exactly one finding; run as
        `node scripts/screenshot-sizes.mjs --url file://… --pages fixture`, outside
        `npm run check`;
      - class pins: `truncate-until-large` on ShareCard, UserRoster, InvitationsPanel,
        FileButton and the feedback attachment, and the static label at Large;
      - `data-truncate-ok` never on a name or an email.
    - **The apps** (keksdose, kastlan, Kurvenschmiede): no code change for 0.33; the kit
      parts follow by themselves, and the label above the field shows in every app's
      forms at Large. An app's own `truncate` in fixed rows (keksdose's three-line
      transaction card) is the next app sweep, with the same script pointed at the app's
      preview by `--url`.
