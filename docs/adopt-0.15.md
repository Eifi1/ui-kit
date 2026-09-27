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
