# Text size and contrast — harmonisation plan

Led from ui-kit at Marcel's request, in parallel with the billing round
(`docs/billing-harmonization.md`).

Marcel tried keksdose with his father-in-law, who reads poorly and needs larger letters:
"Not only zoom but the whole appearance should be tailored for larger letters." keksdose
proposed the shape (2026-10-07). This plan is built from that proposal and from a
read-only audit of the kit and the three apps (2026-10-07; kept outside the repo).
**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.

It extends the settings round (`docs/settings-harmonization.md`): the two new settings
live in the core `appearance` group, and the text size follows the account the way the
language does (§6.2 there).

## Status

The body says what the build does as of ui-kit 0.34.0 and server-kit 0.8.0; the reviews
and adoptions that amended a section are folded into it, and the table names them. The
snapshot of where each one stood, the per-repo to-dos, the round's risks and the review
log are in [archive/text-size-history.md](archive/text-size-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | §10.13 (archived) |
| 2 | Decisions | — | |
| 3 | The mechanism | ui-kit 0.32.0 | §10.1–§10.4, §10.9, §10.11; 0.34 (`PHONE_QUERY` removed) |
| 4 | What changes at Large and Extra large | ui-kit 0.32.0 (follow-ups in 0.32.1 and 0.34.0) | §10.7, §10.8, §10.10, §10.17, §10.23; 0.34 (a locked field's reason line, ToggleGroup's strip) |
| 5 | More contrast | ui-kit 0.32.0 | §10.5 |
| 6 | The settings and their backend | ui-kit 0.32.0, server-kit 0.6.0 | §10.6, §10.12 |
| 7 | Per repo | — (archived) | |
| 8 | What the kit adds | ui-kit 0.32.0–0.34.0, server-kit 0.6.0 | |
| 9 | Risks | — (archived) | §10.15 (archived) |
| 10 | Settled after the reviews | — | index; 10.16, 10.17 and 10.23 stand as rules |
| 10.16 | A row action carries its state | ui-kit 0.33.0 | §10.18 |
| 10.17 | Nothing truncates at Large, measured | ui-kit 0.33.0; the sweep gates releases since 0.34.0 | §10.22; adopt-0.33 (0.33.1: `truncate-until-large-words`); round 0.34 (the sweep in CI, the wrap list, ToggleGroup's strip) |
| 10.23 | Help may sit behind a "?" | ui-kit 0.34.0 | |

## 1. Where each one stands

Moved to [archive/text-size-history.md](archive/text-size-history.md): where the kit and
the three apps stood on 2026-10-07, with §10.13's corrections.

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
   handling learns to live with a zoomed viewport (§3.4).

Settled by the kit, and kept by the reviews:

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
- **Applied before first paint**, the way the theme is: `applyPersistedTextSize(key,
  { account })` and `applyPersistedContrast(key, { account })` (`src/theme/text-size.ts`,
  `src/theme/contrast.ts`) are called in `main.tsx` next to `applyPersistedTheme`, before
  `createRoot`. **The first paint uses the last known account value:** `account` returns
  the value the app persisted with its user, so a device without a choice of its own
  doesn't paint Normal and then jump, offline too (§10.3).
- **A boot splash** painted from `index.html` takes `TEXT_SIZE_INLINE_SCRIPT`, the same
  pre-paint as an inline `<head>` script, with the two root rules inline beside it (the
  app's stylesheet arrives after the splash paints). The stored format it reads is
  frozen, the splash sizes in rem, and under a hash-based CSP the script is one more
  hash.
- **A Tailwind variant** for size-dependent styles without JS, modelled on `dark`:
  `large:` matches `[data-text-size=large]` and `[data-text-size=xlarge]`, and `xlarge:`
  matches only the latter.
- **`useTextSize()`** returns `{size, scale}` for the few things CSS can't reach: canvas
  and SVG charts, windowed lists, popover widths.

### 3.2 No fixed px for anything that holds text

- **Type:** the kit's 10 and 11 px sizes become named rem sizes (`text-micro` =
  0.625 rem, `text-caption` = 0.6875 rem) in `@theme`. Every `text-[Npx]` in the kit and
  in the apps moves to them or to Tailwind's own sizes. A lint rule bans new ones.
  Arbitrary px media variants (`min-[2400px]:`) are linted too: they can't scale (§3.3).
- **Geometry:** paddings, track and thumb offsets, popover widths and row heights move to
  rem or `calc(rem ± 1px)`. Pure hairlines stay px: 1 px borders, shadows, gesture
  thresholds.
- **The kit exports CSS lengths, not px copies,** for what an app lines up with:
  `DIALOG_GUTTER` (`src/components/full-bleed-dialog.tsx`, the full-screen dialog's
  gutter) and `TOASTER_OFFSET_TOP` / `TOASTER_OFFSET_BOTTOM` (`src/components/toast.tsx`).
  An app uses them in `calc()` instead of a px number of its own.
- **JS values:** a chart's axis width and tick spacing scale (§4 Charts), and
  SignaturePad's stroke is `lineWidth × scale`.
- **Windowed lists:** "nothing truncates" needs rows of variable height.
  `useWindowedRows(count, rowHeight, scrollRef)` (`src/hooks/use-windowed-rows.ts`)
  measures the rendered rows and takes `rowHeight × scale` as the estimate for the rest;
  a text size switch drops the measured heights. An app's own windowed grid
  (Kurvenschmiede's MeasuredGrid) follows the same rule (§10.9).

### 3.3 Breakpoints that follow the text (§2.3)

A media query's rem resolves against the browser's default, not `<html>`, so Tailwind's
`sm`/`md`/`lg` stay put when the root grows. The kit makes them follow:

- **CSS:** the breakpoint variants are redefined in `tokens.css`, one set per size, so
  `md:` means 48 rem at Normal, 60 rem at Large and 72 rem at Extra large. Each one is
  three media queries scoped by an attribute selector inside `:where()`, so a variant
  keeps its specificity and its place in Tailwind's order; not the body as a container,
  which would break fixed overlays and a container querying itself. `sm` … `2xl`, the
  named `3xl` (150 rem, keksdose's `min-[2400px]`) and the `max-*` set all scale, and
  `md:` keeps its name in every app. An arbitrary `min-[…]` / `max-[…]` media variant
  doesn't scale and is linted (§3.2).
- **JS:** `useBreakpoint("md")` and `usePhoneLayout()` (`src/hooks/use-breakpoint.ts`)
  replace `useMediaQuery` with px strings; `breakpointQuery("max-md", scale)` gives the
  query string where one is needed (`PHONE_QUERY` is gone since 0.34). The CSS and JS
  answers always agree: AppShell's `md:hidden` and its `isMdUp`, DataTable's `isMdUp`.
- **`usePhoneLayout()` is the single answer** to "is this the phone layout": the kit's
  sheets and cards (the DataTable full-screen dialog among them) and an app's own phone
  checks (keksdose's sticky editor footer) use the same one, so a tablet at 150 % gets
  every phone treatment or none. Pointer and display-mode queries stay `useMediaQuery`.
- **The effective widths at 150 %:** a 390 px phone is 260 px wide, a 768 px tablet 512,
  a 1280 px laptop 853. Layouts must hold at 240 px (a 360 px phone at 150 %).

### 3.4 Zoom (§2.5)

- **The kit's fields are at least 16 px on touch** (`pointer: coarse`) at every size:
  iOS zooms the page on focus into a field under 16 px, which `maximum-scale=1` used to
  suppress, and that zoom hides a pinned editor footer behind the keyboard. At Large and
  above they are 17.5 px anyway (`FIELD_TOUCH_TEXT`, `src/components/ui.tsx`).
- **A zoomed page keeps the keyboard inset at 0.** Following a zoomed viewport would drag
  the pinned row on every pan. The kit exports one guarded reader, `readKeyboardInset()`
  (`src/hooks/use-anchored-panel.ts`), and its own `useVisualViewport` (PickerSheet)
  uses the same guard. An app reads the inset through it, not a copy of its own.

## 4. What changes at Large and Extra large

These follow from §2.3. They are kit behaviour; an app gets them by using the kit part.

**Lists and phone cards:**
- **DataTable phone card:** each label goes above its value, nothing truncates, and rows
  get more space. `mobileDetailsInRow` puts the `mobileHidden` columns into the opened
  row, so nothing is lost.
- **ListItem:** title, subtitle and meta wrap instead of truncating.
- **Chips and status squares:** every colour carries a word or a symbol (the kit's
  chips do; an app's own dots and squares follow).

**Controls:**
- **Touch targets at least 48 px** (in scaled px) for buttons, inputs, chips and row
  taps (`TOUCH_TARGET_LARGE`, `src/components/ui.tsx`). Button `sm` grows to `md`'s
  height.
- **IconButton shows its label** as visible text beside the icon. `labelVisible={false}`
  keeps the icon alone only for an icon on content: receipt overlays, map zoom, a
  viewfinder, photo thumbnails.
- **A dense row's actions collapse into a "⋯" row menu** instead of showing every label:
  `RowActions` (`src/components/row-actions.tsx`, `collapse="auto"`) shows the icons
  inline at Normal and the menu at Large once there are two or more; a single action
  stays inline with its label. A row action's state, tone and tour anchor survive the
  collapse (§10.16).
- **FormActions stack** full width on a phone layout.
- **A floating label becomes a static label above its field** (§10.17), the phone card's
  rule for fields.
- **Switch, Slider, ToggleGroup and Checkbox** keep their proportions (their px
  arithmetic moves to rem, §3.2). A ToggleGroup's segments flow onto a second row inside
  its frame where they don't fit, whatever their count and placement, the strip
  (`labelPlacement="strip"`) included; at Normal, and wherever it fits, it stays one
  row. The keyboard is the same either way.

**Navigation:**
- **AppShell's bottom bar** shows at most four entries at Large and three at Extra large,
  and a "More" cell that opens a sheet with the rest; every entry at Normal
  (`mobileBarMax`, a number or one per size; `DEFAULT_MOBILE_BAR_MAX` in
  `src/shell/app-shell.tsx`). A fifth of a 360 px phone at 150 % holds what 48 px holds
  at Normal.
  - The bar takes the app's array order: the app puts its most used first, or orders by
    role (kastlan: manager vs accountant). One hidden entry is no saving, so the bar then
    shows them all.
  - The More sheet keeps each group's sub-pages.
  - Labels wrap to two lines instead of truncating.
  - The More cell carries the hidden entries' links as tour anchors, so a tour step aimed
    at a hidden entry points at More.
- **The sidebar** never collapses to icons only.
- **The top bar** keeps its essential icons; an app may move others into the account
  menu with `mobileHidden`-style flags.

**No fact only in a tooltip** at Large and Extra large, and on a touch screen at every
size, which can't hover a tooltip open (`useInlineFacts`, `src/hooks/use-large-text.ts`):
- `disabledReason` shows as a line under the control, not only as a tooltip: on Button
  and IconButton, and on a field locked through `commit` or `disabledReason`
  (`LockedReason`, `src/components/field-parts.tsx`). Inside `CompactControls` (a top
  bar, a dense row's inline actions) it stays the tooltip: there is no room for a line.
  `disabledReasonDisplay` overrides it: `"line"` always, `"tooltip"` always (many locked
  rows under a banner that already says why);
- FieldHint and StatTile hints show as inline text (`useInlineHint`; every kit field that
  takes a `hint`, `Select` and `AmountInput` included);
- paragraph-long *help* the field is usable without may sit behind a "?" that opens on a
  tap (`HelpPopover`, §10.23); a *fact* stays visible;
- relative dates show the absolute one beside them;
- a colour-only value (heatmap day, status square) gets a number or a word in the
  layout.

**Charts:**
- Axis labels follow the text size, and there are fewer ticks (`tickTarget` in
  `src/components/series-chart-ticks.ts`: five at Normal, three from Large up).
- `SeriesChart`'s height takes a CSS length (`min(20rem, 60dvh)`), not scaled px: 480 px
  × 1.5 would fill a phone.
- Axis widths follow the scale: `SeriesChart` multiplies an `axes[].width` by it itself
  (`axisBandWidth`), so an app passes its Normal width and never multiplies it too. A
  mirrored tick band scales both sides by the same factor.
- Strokes, dash patterns and grid ink stay px.
- An SVG whose text is in viewBox units moves its labels to an HTML overlay or grows the
  drawing.
- Legends move under the chart.
- StatTile shows its one big number; the sparkline and sub-values move below.

## 5. More contrast (§2.4)

`<html data-contrast="more">`, from the setting or from `prefers-contrast: more` when the
setting is on "System".

- **Text:** `--text-muted` becomes the set's `--text-secondary`, `--text-secondary`
  moves halfway to `--text-primary`, and `--text-placeholder` becomes the set's
  `--text-muted`, so primary > secondary > muted > placeholder survives the step.
- **Lines:** `--border` moves towards `--text-primary` until it clears 3 : 1 against the
  worst of the three surfaces (WCAG 1.4.11), and never less far than `--border-strong`'s
  45 %; `--border-strong` stays derived in `tokens.css` and grows with it.
- **Focus:** one shared focus frame (`--focus-ring-width`, 2 px → 3 px) that `FOCUS_RING`
  draws, instead of a hundred spelled-out rings.
- **How: the colour tokens are stepped in JS.** `applyTokenSet` writes the text and
  border tokens inline on `<html>`, and an inline value beats any `[data-contrast=more]`
  rule or `@media (prefers-contrast: more)` block, so the step happens inside it
  (`src/theme/contrast-tokens.ts`, `CONTRAST_STEPPED_VARS`), not in a stylesheet. The
  CSS-derived `--text-placeholder` is written inline there too. `tokens.css` holds only
  what is not inline: `--focus-ring-width` per attribute, and the `contrast:` variant.
- **"System" follows the device live:** it re-applies on a
  `matchMedia("(prefers-contrast: more)")` change (`createContrastStore`'s
  `useApplyContrast`).
- **Apps follow only through tokens.** Hard-coded `text-slate-*` classes and kastlan's
  `--muted-foreground` alias don't follow, and move to the tokens.

## 6. The settings and their backend

- **The kit parts:** `TextSizeSetting` (Normal / Large / Extra large) and
  `ContrastSetting` (System / Standard / More), in `settings-fields.tsx` beside
  `ThemeSetting`. Both are segmented controls with the kit's words in seven languages.
- **The stores:** `createTextSizeStore(key)` and `createContrastStore(key)`, shaped like
  `createThemeStore`.
- **The stored vocabularies:** `TEXT_SIZES = ("normal", "large", "xlarge")` and
  `CONTRAST_MODES = ("system", "standard", "more")`, the same in the kit and server-kit.
  **"System" is a stored value**: the PATCH rule refuses an explicit null, so null means
  only "never chosen".
- **The account (§2.2):** `/auth/me` gains `text_size` and `contrast`, nullable (null =
  never chosen), written with `PATCH /auth/me` under the PATCH rule (settings §6.1).
  The kit's `useAccountAppearance` (`src/settings/use-account-appearance.ts`) applies the
  language's order (the device's own choice → the account's → the default) to both and
  never writes the account on its own; a pick writes the device and the account, except
  in a demo or signed out. If the save fails the device keeps the pick and the app says
  so (`appearance.saveFailed`).
- **One rule for the whole card:** an app ships `useAccountAppearance` together with
  settings §6.2's language rule (no session-start language write), so the appearance
  card doesn't follow two opposite rules.
- **server-kit** (`eifi1_server_kit.auth`): `TEXT_SIZES` and `CONTRAST_MODES`, and the two
  fields on `UserResponse` and `ProfileUpdate`, both optional; `PROFILE_NOT_NULLABLE`
  names them, so an explicit null is refused.

## 7. Per repo (summary; the reviews refine it)

Moved to [archive/text-size-history.md](archive/text-size-history.md): the 0.32 round's
per-repo to-dos, all adopted. What every app does stays here: the stores and the pre-paint
call in `main.tsx` (§3.1), the two settings in the appearance group (§6), `useBreakpoint`
/ `usePhoneLayout` for its JS queries (§3.3), and a look at its main screens at 360 px /
150 %.

## 8. What the kit adds (ui-kit 0.32)

- **0.32.0, the mechanism:** in `tokens.css`, the `data-text-size` root sizes, the
  `--focus-ring-width` step for `data-contrast`, `text-micro` / `text-caption`, the
  `large:` / `xlarge:` / `contrast:` variants and the scaled breakpoint variants (`sm` …
  `3xl` and the `max-*` set). In JS: `TEXT_SIZES`, `TEXT_SCALE`,
  `applyPersistedTextSize`, `TEXT_SIZE_INLINE_SCRIPT`, `createTextSizeStore`,
  `useTextSize` (`src/theme/text-size.ts`); `CONTRAST_MODES`, `applyPersistedContrast`,
  `createContrastStore` (`src/theme/contrast.ts`); `useBreakpoint`, `usePhoneLayout`,
  `breakpointQuery`, `BREAKPOINT_REM`, `remPx`, `useRemPx`; `useLargeText`,
  `useInlineFacts`, `useCoarsePointer`; `readKeyboardInset`; `useAccountAppearance`,
  `resolveAccountAppearance`.
- **0.32.0, the settings:** `TextSizeSetting`, `ContrastSetting`
  (`src/components/settings-fields.tsx`) and `DEFAULT_APPEARANCE_LABELS`, in seven
  languages.
- **0.32.0, the px clean-up** of §3.2, and the lint rules against a px font size and an
  arbitrary px media variant (`eslint.config.js`); `DIALOG_GUTTER`,
  `TOASTER_OFFSET_TOP` / `TOASTER_OFFSET_BOTTOM`; `useWindowedRows` on measured rows.
- **0.32.0, the behaviours of §4:** DataTable `mobileDetailsInRow` and the stacked
  labels, ListItem wrapping, IconButton's visible label and the 48 px targets, RowActions'
  "⋯" at Large, FormActions stacking, AppShell `mobileBarMax` with "More",
  `disabledReason` and hints in the layout, chart scaling; and the contrast step and the
  shared focus frame of §5.
- **0.32.1 / 0.32.2:** `appearance.saveFailed`; `SeriesChart` scales an axis width itself
  (`axisBandWidth`); a ToggleGroup wraps at Large whatever its count; the splash's inline
  root rules; the kit's demos hold at 360 px / Extra large.
- **0.33.0:** §10.16 (`RowAction`'s `pressed`, `expanded` / `controls`, the `muted` /
  `info` / `warning` tones and `dataTour`; RowActions' `glyphSize` and `tooltipSide`) and
  §10.17 (`truncate-until-large`, the static label above a field at Large, the
  truncation and tall-pinned-box checks in `scripts/screenshot-sizes.mjs`).
- **0.33.1:** `truncate-until-large-words` (§10.17).
- **0.34.0:** `HelpPopover` (§10.23); `Select` and `AmountInput` print a FieldHint at
  Large and on touch; a field locked through `commit` or `disabledReason` shows its
  reason as a line (§4); more parts wrap at Large and ToggleGroup's strip wraps (§10.17);
  the sweep gates the release (§10.17); `PHONE_QUERY` is gone (§3.3).
- **The showcase:** a text-size and a contrast switch beside the theme; the device
  preview has a size axis (phone, tablet, desktop × three sizes); the size sweep runs it
  at each size, since jsdom has no layout.

server-kit 0.6.0: the two account fields and their vocabularies (§6).

## 9. Risks

Moved to [archive/text-size-history.md](archive/text-size-history.md): the 0.32 round's
risks, with §10.15's additions; each is answered by a section above (§3.2–§3.4, §5).

## 10. Settled after the reviews (2026-10-07)

The reviews' items keep their numbers, which the code cites. An item that amended a
section above is folded into it and points there; an item that is a rule of its own
stands here (16, 17 and 23). The reviews' wording is in
[archive/text-size-history.md](archive/text-size-history.md).

1. **iOS zoom-on-focus: fields at least 16 px on touch** → §3.4.
2. **A zoomed page keeps the keyboard inset at 0** → §3.4.
3. **First paint uses the last known account value** → §3.1.
4. **Breakpoints** → §3.3.
5. **Contrast mechanics** → §5.
6. **The stored vocabularies** → §6.
7. **The bottom bar** → §4 (Navigation).
8. **Dense row actions** → §4 (Controls).
9. **Windowed lists** → §3.2.
10. **Charts** → §4 (Charts).
11. **The kit exports CSS lengths instead of px copies** → §3.2.
12. **Same release as the settings rule** → §6.
13. **Corrections to §1** → archive.
14. **App notes** → archive.
15. **Risks added to §9** → archive.

16. **A row action carries its state** (ui-kit 0.33). A `RowAction`
    (`src/components/row-actions.tsx`) says "on", "open", a tone and a tour anchor, at
    both sizes, so no row keeps hand-rolled IconButtons at Normal:
    - **A toggle** (`pressed`): inline, `aria-pressed` with IconButton's "on" look; in the
      menu, `aria-pressed` on the entry. The label stays the same in both states.
    - **A disclosure** (`expanded`, with `controls`): `aria-expanded` and `aria-controls`,
      inline and on the menu entry. It is for something the action opens in the page (a
      share card under the row, an add-category row), and is exclusive with `pressed`.
    - **Tones `muted`, `info` and `warning`:** inline, IconButton's tone. In the menu the
      words keep the default text colour and the glyph takes the tone; `danger` keeps its
      danger text; `muted` and `default` look the same in a menu.
    - **A tour anchor** (`dataTour`) goes where the reader must go, on one element per
      action at a time:
      - inline (Normal, a row's single action, `collapse="inline"`): `data-tour` on the
        action's own control: the IconButton, the small text Button of an action without
        a glyph, or the link of an `href` action;
      - collapsed: not on the "⋯" button itself. RowActions puts the "⋯" IconButton in a
        `relative inline-flex` box with `data-slot="row-actions"` (the inline strip's
        slot), and in that box one aria-hidden `<span data-tour="…">` per anchored
        action, `pointer-events-none absolute inset-0`: the More cell's `TourAnchor`
        (`src/shell/app-shell.tsx`, §4 Navigation). So `[data-tour=x]` resolves to a box
        the size of the "⋯", two anchored actions in one row don't fight over one
        attribute, and a tap still reaches the button;
      - **the entry in the open menu carries none.** The menu is portalled after the row
        and the kit's tour takes the first visible match, so a copy there would never be
        found while the "⋯" shows; it would only make `[data-tour=x]` match twice.
    - **The row's glyph size and tooltip side** are RowActions props, so a header strip
      with 14 px glyphs and a last column whose tooltips open to the start need no
      hand-rolled icons. `rowActionsColumn` passes both through. `tooltipSide` is per row:
      every inline action's tooltip opens to that side.

    ```ts
    export type RowActionTone = "default" | "muted" | "info" | "warning" | "danger";
    export interface RowAction {
      // …the rest of the action…
      tone?: RowActionTone;
      commit?: CommitScope; // billing §12.36
      /** A toggle: aria-pressed and the "on" look. The label stays the same in both states. */
      pressed?: boolean;
      /** Opens or closes something in the page: aria-expanded. Not with `pressed`. */
      expanded?: boolean;
      /** The id of what `expanded` opens: aria-controls. */
      controls?: string;
      /** A tour anchor: data-tour on the control; collapsed, an overlay in the "⋯" box. */
      dataTour?: string;
    }
    export interface RowActionsProps {
      // …the rest of the props…
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
    - **Tests** (`src/components/__tests__/row-actions.states.test.tsx`): each field's
      attributes inline and in the menu at both sizes; `dataTour` resolves to the "⋯"'s
      box and nothing in the open menu carries it; `commit: COMMIT_EXCEPT_BILLING` under a
      billing lock stays live.
    - **The apps:** an app folds its hand-rolled row icons into one `<RowActions>` at
      every size. The tour guard of an app that checks its anchors learns `dataTour:`,
      and a test that looked for the anchor round the "⋯" asks its
      `closest('[data-slot="row-actions"]')` instead. keksdose's sites are in the
      archive.
17. **Nothing truncates at Large, measured** (ui-kit 0.33; the release gate since 0.34).
    §4 says text wraps at Large; the size sweep (`scripts/screenshot-sizes.mjs`) holds
    the kit to it. Its first check, `measure()`, sees only a page running past the
    screen, so an ellipsis inside a box needs a check of its own.
    - **The rule:** at Large and Extra large, a one-line ellipsis that cuts its text is a
      finding, as a page running past the screen is. Normal keeps its ellipses.
    - **One name for "truncate at Normal, wrap at Large":** `@utility
      truncate-until-large` in `tokens.css`: `truncate`, plus at `large:`
      `white-space: normal` and `overflow-wrap: anywhere`. It replaced the kit's five
      hand-written copies. DataTable's phone card keeps its descendant rule
      (`CARD_NO_TRUNCATE`, `src/components/data-table.tsx`), which reaches an app's own
      `truncate` in a cell. The sweep still measures the utility, since it must not cut
      at Large.
    - **Figures take `truncate-until-large-words`** (0.33.1, `tokens.css`): `truncate` at
      Normal, and from Large up a wrap at spaces only (`overflow-wrap: normal`), so an
      amount, a date or a count with its unit never splits mid-number ("CHF 1’2" over
      "34.50"). A figure wider than its box is cut at its end instead, so its cell gets
      the room for the widest one (`shrink-0`). Prose (a name, a title, a sentence) keeps
      `truncate-until-large`.
    - **The kit's parts that would cut take the utility:** ShareCard, UserRoster,
      InvitationsPanel, FileButton's picked file and the feedback attachments (0.33);
      Tabs' label and detail, MenuItem, Breadcrumbs, the AppShell sidebar, the combobox
      family's options and values, MultiSelect, Country/CurrencySelect, MonthPicker,
      GroupedPicker, TreeRow, ProgressBar's legend, PieChart's centre label, PageHeader
      `truncateTitle`, passkey names, SignatureView, the DataTable column chooser,
      ProfileSetting's email and the translation table (0.34, from the sweep). A
      ToggleGroup wraps its row instead (§4 Controls).
    - **A deliberate truncation at Large** (a value whose full text is one tap away, such
      as a select's chosen option in a dense table) carries `data-truncate-ok`, with the
      reason in a code comment. The sweep skips that subtree. Never on a name or an email.
    - **The floating label at Large is a static label above the field**: the phone card's
      "label above value" (§4), not a two-line label in the field. It stops being
      absolute, so it wraps like any text, and the field's top strip no longer reserves
      its height. This covers `FLOATING_LABEL_CLASS` (`src/components/ui.tsx`) and
      `FLOATING_LABEL_STATIC` (`src/components/field-parts.tsx`), the row form's label
      among them. Normal keeps the floating label. Every floating-label field in every
      app shows its label above at Large; an app that placed something from the field's
      top strip (a Skeleton at `top-5`) anchors it on the input's own line instead.
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
        `data-overflow-offender` is;
      - it prints `TRUNCATED` lines under each page and a total;
      - flags: `--truncation` (on by default); `--no-screens`, to measure without
        screenshots (faster, less RAM on the shared box); `--pages all`, the slugs of
        `showcase/src/routes.tsx`; `--gate-truncation`, exit 3 on a finding (1 stays
        overflow, 2 a script error);
      - `DEFAULT_PAGES` holds the pages these checks are about: `fields`, `files`,
        `auth-account`, `user-admin`, `subscription`, `feedback-compose` and
        `lists-menus` among them.
    - **The sweep's second check, tall pinned boxes.** A box pinned over the
      page grows with the text too, and can leave no room for what it is pinned over:
      neither an overflow nor a truncation, so neither check sees it. `measurePinned()`
      runs in the same pass as `measureTruncation()`, at Large and Extra large only:
      - it takes every element whose computed `position` is `fixed`, or vertically
        `sticky` (a `top` or `bottom` other than `auto`; a sticky column pins sideways and
        is left out); the outermost only, so a sticky header inside a fixed sheet is one
        box;
      - it skips what `measureTruncation()` skips (zero-size and hidden boxes,
        `aria-hidden`, the device-preview frame), a dialog and what holds one
        (`[role=dialog]`, `[role=alertdialog]`, `[aria-modal=true]`: a sheet covers the
        screen by design), and `[data-pinned-ok]` subtrees, with the reason in a code
        comment;
      - **a finding:** the box's height (for `fixed`, the part inside the viewport) is
        over 50 % of `window.innerHeight`: 390 px in the 360 × 780 variant, 422 px in
        390 × 844. It is the height, not where the box sits now, so a sticky box counts
        before it pins;
      - it prints `PINNED` lines under each page, naming the nearest `[data-slot]` and
        heading, `sticky` or `fixed`, the height in px and as a share of the viewport,
        and the first 50 characters of its text; then a total. The box is marked
        `data-pinned-offender=n`, and the first is screenshotted, as the other two are;
      - `--pinned` is on by default, as `--truncation` is.
    - **The release gate** (report-only in 0.33, both checks): `npm run check:sweep`
      runs the fixture test, builds the showcase and runs every page with
      `--pages all --no-screens --gate-truncation`, so a truncation or a pinned-box
      finding (exit 3), or an overflow (exit 1), stops the release. CI runs it on the
      release PR, a PR or push that changes `package.json`'s version (the job
      "Truncation sweep (release)"); by hand it is `npm run check:sweep`, after
      `npx playwright-core install chromium-headless-shell` once. `scripts/check.mjs`
      never runs it, and jsdom has no layout, so unit tests only pin classes. The phone
      bar's two lines and a clamp (§4 Navigation) carry `data-truncate-ok`.
    - **i18n:** none; no new strings in any of the kit's seven languages.
    - **Tests:**
      - the script: `scripts/screenshot-sizes-fixture.test.mjs` runs the sweep on a
        fixture page, where one ellipsis that cuts, one that fits, one under
        `data-truncate-ok` and one `.sr-only` give exactly one `TRUNCATED` finding, and a
        sticky box of 60 % of the viewport beside one of 40 % exactly one `PINNED`
        finding, at each Large and Extra large variant; outside `npm run check`;
      - class pins: `truncate-until-large` on the parts above, and the static label at
        Large;
      - `data-truncate-ok` never on a name or an email.
    - **The apps:** the kit parts follow by themselves. An app's own "truncate at Normal,
      wrap at Large" (a JS switch such as `!large && "truncate"`, or a class copy) may
      move to `truncate-until-large`, which follows the attribute in CSS. An app's own
      `truncate` in fixed rows, and its own tall pinned boxes, are found by the same
      script pointed at the app's preview with `--url`. Each app's sites are in the
      archive.

18. **Where `dataTour` lands** → §10.16.
19. **"No code change for the apps" was wrong for keksdose** → archive.
20. **Kurvenschmiede has 6 RowActions sites, not 8** → archive.
21. **Kurvenschmiede's three own "truncate at Normal, wrap at Large" copies** → archive.
22. **The sweep's second check, tall pinned boxes** → §10.17.

23. **Help may sit behind a "?"; a fact stays visible** (ui-kit 0.34). §4's "No fact only
    in a tooltip" prints a FieldHint's words under its field at Large and on a touch
    screen, and a paragraph of help printed there becomes the longest thing in a form on
    every phone. So two kinds of text sit beside a field, and they are treated
    differently:
    - **A fact** — a format, a limit, a consequence ("22 characters", "at most 72 bytes",
      "ends your other sessions") — stays visible: a caption, or a `FieldHint` that becomes
      the caption at Large and on touch (`useInlineHint`, `src/components/field-parts.tsx`).
      Every kit field that takes a `hint` does this, `Select` and `AmountInput` included.
    - **Help** — why the field exists, how to choose, what the options mean; the field is
      usable without it — may sit behind a "?" in the kit's `HelpPopover`
      (`src/components/help-popover.tsx`). It stays a "?" at every size and opens the kit
      Popover on a tap, a click, Enter or Space: a dialog named by a short question or
      "About <field>" (`label`, required) and described by the help, which takes the
      focus and gives it back on close. Passed as a field's `hint`, it sits on the label
      line, as any `hint` that is not text does (the `rhf` bindings draw every `hint`
      under the field). It also stands on its own, beside a heading or a column title.
