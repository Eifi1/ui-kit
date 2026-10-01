# Adopting `@eifi1/ui-kit` 0.15 — per repository

Built from a visual audit of the whole showcase: all 64 pages in headless Chromium at
390px and 1280px, reviewed twice. Almost everything is a fix. `CHANGELOG.md` → `0.15.0`
has the release notes.

## Everyone

1. Bump to `^0.15.0` by hand; a caret below 1.0 locks the minor version.
2. **Visible changes**, each a fix that only shows on a narrow screen or in a corner case:
   - **An empty picker no longer collapses.** EntityCombobox, MultiEntityCombobox,
     MultiSelect, CurrencySelect, the date and month pickers and `renderTrigger` buttons keep one
     line of height with no value and no placeholder.
   - **A plain-text `hint` on `Select` and `NumberInput` is a caption under the field**, and
     is linked through `aria-describedby`. Before, it was drawn inside the box. A `FieldHint`
     element still sits on the label line.
   - **`Tabs`:** a strip that overflows fades at the cut edge, and the open tab is scrolled into
     view. On a phone, a selected tab's second line uses the brand-contrast ink. Beside a
     scrolling strip, the add button is a lone "+" below `md`. Its label is still its name,
     and the label shows again from `md` up.
   - **DataTable `fillHeight` bounds the phone card list too.** It scrolls inside the pane.
   - **BulkActionBar wraps at 390px** instead of crushing the count; Clear stays at the end.
   - **FilterPopover's date panel** stacks its presets above the calendar below `sm`.
   - **`Select` list boxes (`size`, `multiple`)** show exactly `size` whole rows.
   - **SeriesChart** thins crowded x ticks evenly (`equidistantPreserveEnd`) instead of
     dropping one. Marker labels near the plot edge stay inside the plot.
   - **Wizard (`StepperNav`)**: the step area grows to the tallest step seen, not a fixed
     300px. Short wizards lose the gap above the buttons. The buttons move down once when
     a taller step first shows.
   - **ImageGrid**: a file name keeps its extension ("floor-plan-lev….pdf"), and tile actions
     sit on a translucent dark pill, so they keep contrast on any picture.
   - **AlertBanner strips** wrap the action under the message on a phone.
   - **StatTile figure rows** keep the amount beside its label.
   - **CalendarHeatmap** uses the narrow weekday form in locales whose short form does not
     fit (Arabic). The month layout's column headers follow.
   - **TreemapCell** measures `var(--chart-N)` fills, so it picks light or dark ink correctly,
     and draws no halo on translucent fills.
   - **FeedbackThread image attachments** show a placeholder while loading and a
     broken-image glyph if they fail.
   - **Autocomplete's icon** sits on the value line when the field has a label.
   - **A disabled MultiSelect** is dimmed like the other pickers.
   - **`Field` and `FormItem`** keep their content height in a grid row, so a labelled row
     beside a taller one no longer sinks.
   - **Bidi:** DataTable's loading text and MeasuredGrid's count are isolated in RTL.
3. **New, opt-in:** `AppShell mobileSubNavLayout="scroll"` puts the phone sub-nav in one
   sideways-scrolling row, faded at the cut edge, with the current page scrolled into view.
   The default is still `"wrap"`.
4. **New export:** `splitFileName(name)` returns `{ stem, extension }`.

In app tests: the Tabs add button's label is now inside a `span`, so a text query still
finds it. Nothing else changes for jsdom, because the fades and clamps are measured and
do nothing without layout.

## 0.15.1

Everything here is picked up by `^0.15.0`; there is nothing to bump.

- **Slider:** the header row wraps. A readout wider than the room beside the label (a
  value plus a link button) drops to its own line under the label instead of printing
  over it (lenkbank L1).
- **SeriesChart axis budget** (lenkbank L2):
  - **`axisBudget="auto"` is the default.** When one side draws two or more axes and the
    plot would drop under 160px, the chart keeps one axis per side and hides the rest.
    Hidden axes still scale their lines and zoom, but draw no ticks and reserve no width.
    A chart with at most one axis per side is never touched, and neither is any chart at
    desktop widths. `axisBudget="off"` opts out, e.g. for a stack whose bands must match.
  - **`maxVisibleAxes`** (`number | { left, right }`) caps the visible axes explicitly.
  - **Units:** the tooltip names a hidden axis's series "Label (unit)". For the legend, feed
    `onAxisBudget` into state and pass it to `seriesLegendEntries(series, { axes, budgeted })`.
    The unit comes from `SeriesChartAxis.unit`, or from the title's "(…)" ending. Series
    labels must not already carry the unit, or it shows twice.
  - **Fixed along the way:** an axis switched to `hide` on a mounted chart kept its width,
    which pushed the remaining axes off the chart's edge.

## 0.15.2

Picked up by `^0.15.0`.

- **SeriesChart:** a series label that already ends with its unit ("Velocity (mm/s)") is
  no longer given it twice when the axis budget hides its axis. This covers the tooltip
  and `seriesLegendEntries` (lenkbank, on 0.15.1).
- **Chart tooltip:** capped at the viewport width. Long series names wrap and values never
  do, so a six-row tooltip on a 390px chart no longer runs off the edge.
- **AlertBanner box with an `action`:** below `sm` the action wraps under the message,
  lined up with its text, and the × stays at the top end (kastlan 53). The strip variant
  already did this since 0.15.0.
- **Tabs:** no tab is wider than its strip. A long label or `detail` line ends in an
  ellipsis, and the whole text stays the tab's accessible name (lenkbank L3).
- **ToggleGroup `overflow="wrap"`** (opt-in): when the options don't fit, the segments
  flow onto a second row and every label stays whole. The default `"truncate"` keeps
  one row with ellipses, as before (lenkbank L4).
- **Table `stack="phone"`** (opt-in): below `sm` each body row becomes a block. The first
  cell is its title, and every other cell sits under its column's header as a small label,
  read from the head row. The head is visually hidden but still read by screen readers.
  Use it for tables of prose; tables of figures should keep scrolling (lenkbank L5).

## 0.15.3

Picked up by `^0.15.0`.

- **Chart tooltip:** after recharts places it, the tooltip shifts itself to stay 8px inside
  the viewport. It re-measures when recharts' slide ends. The 0.15.2 width cap alone still
  let a wide tooltip open to the right of the pointer and run its values off a 390px
  screen (lenkbank).

## 0.15.4

Picked up by `^0.15.0`. keksdose's 406px round (live #356–#367).

- **SeriesChart `tooltip.placement`** (M1, opt-in): `"cursor"` (default, as before),
  `"above"`, `"below"` or `"auto"`.
  - **Above / below:** the values show in a row reserved over or under the plot,
    so a finger never covers them. The row is reserved from the first render, so
    the plot doesn't jump on the first tap. Hover, tap, touch drag and the
    arrow-key stops fill it.
  - **Auto:** `"above"` below 640px and `"cursor"` from 640px up.
  - **App-wide default:** set it once with `<UiKitProvider chartTooltipPlacement="auto">`.
  - **Also:** the value cell gets `dir="auto"`, so an RTL negative no longer renders
    as "26.6-".
- **FormActions `placement="sticky"`** sits on AppShell's phone nav (offset by
  `--app-nav-h`) instead of under it (M2).
- **Chip:** icon-plus-text children sit in a row, and `icon` also takes a ready element
  (`icon={<Check className="…" />}`) for a glyph whose colour carries a state (M3).
- **NumberInput:** the end padding is the unit's (and calculator's) measured width, not a
  fixed 32px, so a "%" no longer takes half of a narrow cell (M4).
- **AmountInput:** a value the host sets is shown at the currency's minor unit while the
  field rests (93.4213 CHF reads 93.42); `value` itself is untouched. New exports:
  `currencyMinorDigits(currency)` and `roundToCurrency(value, currency, digits?)` (M5).

## 0.15.5

Picked up by `^0.15.0`. keksdose's run 68 (dev #576, #578, live #366). N1, chip content
centring, was already closed by 0.15.4's M3.

- **Tokens (N2):** in dark mode `--danger-border` is now rose-700 at 0.6 alpha, like its
  warning/info/success siblings, so a soft danger Chip no longer sits in a louder frame.
  The new **`--danger-border-strong`** keeps the old opaque line for what must stay
  loud: invalid fields, checkboxes and choice cards, a failed upload, the danger banner,
  the crash message box, and destructive focus rings. If you re-point `--danger-border`,
  re-point `--danger-border-strong` too. Light mode is unchanged.
- **Feedback attachments (N3), opt-in:**
  - **`FeedbackAttachmentField multiple`:** `value: File[]`, `onChange(files)` and
    `max` (default `DEFAULT_MAX_ATTACHMENTS` = 5). Picking and pasting add files, and
    each file gets a removable chip. Optional `screenshot` / `onScreenshotChange` give
    the capture its own single slot.
  - **`FeedbackDialog attachments="multiple"`** (optionally `maxAttachments`): `onSubmit`
    gets `{ …, screenshot: File | null, attachments: File[] }`, and the capture button
    shows only while there's no screenshot.
  - **Unchanged by default:** single mode, and its `attachment`.
- **AmountInput (N4):** `negative` draws the minus on its own, so a read-only or disabled
  signed total no longer needs a dummy `onNegativeChange`.
