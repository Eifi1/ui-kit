# Adopting `@eifi1/ui-kit` 0.5 — per repository

What each app replaces with a kit component once it has bumped to `^0.5.0`. Each
section is self-contained, so it can be handed to that repository's session as-is.
`CHANGELOG.md` has the release notes; the showcase (`npm run dev:showcase`, :4170)
has every component live.

## Everyone: first step

1. Bump `@eifi1/ui-kit` to `^0.5.0` and `recharts` to at least `3.8`.
2. **Mount one `UiKitProvider`** at the root, inside the router, with the app's
   translation of `UiKitLabels` and its locale:

   ```tsx
   import { UiKitProvider } from "@eifi1/ui-kit";
   <UiKitProvider labels={kitLabels[lang]} locale={localeTag}>…</UiKitProvider>
   ```

   Type the translation as `UiKitLabels` so `tsc` refuses a missing key, and add
   `expect(missingKitLabels(de, DEFAULT_UI_KIT_LABELS)).toEqual([])` to the app's tests.
   The showcase dictionaries (`showcase/src/i18n/{de,fr,it,es,hu,zh}.ts`, the `kit`
   block) are complete translations to start from.
3. Then delete the per-call-site label props that only repeated the translation
   (`labels`, `calendarLabels`, `clearLabel`, `ariaLabel` …). Keep the ones that say
   something specific to that instance, e.g. `labels={{ table: "Transactions" }}` —
   a prop still wins over the provider.

Optional, for any long page (settings, reports): `PageContentsLayout` with a
`PageContents` rail and `useScrollSpy`, plus `variant="disclosure"` below `xl` — the
showcase's own pages are the worked example (`showcase/src/showcase.tsx`).

**Found while the three apps adopted 0.5.0 — check each in your app:**

- **`Spinner` announces itself now** (`role="status"` with a hidden "Loading…"). Where
  words are already there — `<Spinner /> Loading…`, a spinner inside a labelled button,
  or a spinner inside the app's own live region — pass `label={null}` (0.5.1), or it is
  announced twice and its word joins the button's name.
- **`MultiSelect` rows are `role="option"`**, not buttons (the trigger is a combobox). A
  test that queried rows with `getByRole("button")` has to query `option`.
- **A toggle `Chip` keeps ONE label.** `selected` carries the state; a label that flips
  with it ("Skip" / "Ask again") is announced with "pressed" and says the opposite.
- **The translating wrappers collapse into the provider.** A local wrapper whose only
  job was to pass translated labels to a kit component (`amount-input`, `number-input`,
  `multi-select`, `mini-calendar`, the data-table labels, a `DateField` passing
  `calendarLabels` / `stepLabels` / `todayLabel`) can be deleted once `UiKitProvider`
  is mounted — and any `t` prop it took for that is dead.
- **Name the pickers from outside** (0.5.1): `DatePicker`, `DateRangePicker` and
  `MonthPicker` now put `id` and `aria-*` on their trigger, so `<label htmlFor>` and a
  form library's control slot work — drop any `aria-label` workaround.

Behaviour that changes without a code change: en-US calendars start on Sunday; file
sizes read "2 kB"; phone pickers show "No results"; `SeriesChart` shows "No data" when
empty.

---

## keksdose

| Replace | With | Notes |
|---|---|---|
| `features/reports/charts/category-treemap.tsx` (8 call sites) | `Treemap` from `@eifi1/ui-kit/chart` | `total` → `value`; `currency` is gone — pass `valueFormatter={useReportSeriesFormatter(data, currency)}` at each site. In spending-tab's all-categories map also pass `colors={pal}`. `food-group-card`: `maxTiles={MAX_TILES}` can replace the slice. Delete the file and its test; `food-group-tiles.test.tsx` imports `TreemapCell` from the kit (vitest needs `server.deps.inline: ["@eifi1/ui-kit"]` for its `vi.mock("recharts")` to reach inside). Dark label ink is now `#1a1a1a`; clickable tiles are keyboard buttons. |
| `features/budget/month-picker.tsx` | `MonthPicker` | `value={monthKey(date)}`, `onChange={(k) => onChange(new Date(+k.slice(0,4), +k.slice(5,7) - 1, 1))}`, `min={minMonth}`, `labels={{ previousYear, nextYear }}`, `triggerClassName="h-9 w-auto min-w-[8.5rem] py-0 text-sm font-medium"`. |
| `KpiCard` (24 uses) | `StatTile` in `StatTileGrid` | Pass `sensitive` on money tiles (the kit defaults to false); `compactValue` → `size="sm"`; the visible `hint` → `description` (the kit's `hint` is a tooltip); `variant` positive/negative → `tone` income/expense; `AmountTone` inflow/outflow/balance → income/expense/signed; `projected` → first `subValues` entry. Pass numbers (`Number(...)`) plus `currency` — the kit formats with `Intl`. |
| admin `Tile` + both `Sparkline` copies (`metrics-panel.tsx`, `price-book-table.tsx`) | `StatTile size="sm" … trend={series}` / `Sparkline` | Keep a `values.length >= 2 &&` guard where a single point should hide. Price book: `<Sparkline data={values} tone="net" label={…} />`. |
| `features/auth/password-strength-meter.tsx` | `PasswordStrengthMeter` | Same props (`value`, `maxBytes`). Map `auth.password_strength.0–4` and `auth.password_rule.*` onto the `passwordStrength` namespace. Fewer than 4 distinct characters now caps at "Weak". |
| ~30 raw `<input type="checkbox">` | `Checkbox` | `label`, `description`, `indeterminate`, `invalid`/`error`, `onCheckedChange`. |
| settings rows that are on/off checkboxes | `Switch` | |
| 2 × `type="time"` in `notifications-card.tsx` | `TimeInput` | `onValueChange={(v) => saveQuietHour(k, v)}`; `TIME_INPUT_CLASS` can stay as sizing. |
| `DateField` wrapper | `DatePicker` with `step`, `today` | The step/today labels now come from the provider (`datePicker.*`). |

## lenkbank

| Replace | With | Notes |
|---|---|---|
| `shared/ui/number-field.tsx` (73 call sites) | `NumberField` | Re-export it, or keep a one-line wrapper adding `unitPlacement="label"` and turning `hint: string` into `hint={<FieldHint label={hint} />}`. `onCommit` no longer fires on a blur that did not change the number. |
| `OptionalNumber` (kinematics-dialog) | `<NumberField nullable …/>` | |
| `shared/ui/slider-field.tsx`, `SpeedSlider`, raw `type="range"` | `Slider` | `scale="log"`, `marks`, `readout` slot (holds a `NumberField`), `formatValue` for `aria-valuetext`. Arrow up from 0 on a log slider now lands on `min` (it rounded back to 0 before). |
| `shared/charts/series-chart.tsx`, `with-zoom.tsx`, `zoom-fit.ts`, `toggle-legend.tsx` | `@eifi1/ui-kit/chart` | Renames: `ChartSeries` → `SeriesChartSeries`, `ChartAxis` → `SeriesChartAxis`, `soleSeriesColour` → `soleSeriesColor`, `SQUARE_ENOUGH` → `ZOOM_SQUARE_ENOUGH`, `FitSource` → `ZoomFitSource`, `toggled` → `toggleHidden`, `Side` → `FacingSide`. Keep lenkbank's grid with `className={GRID_INK}`. Charts with no `empty` prop now say "No data" — `empty={null}` for the old look. Move `chart.zoom_reset` / `chart.zoom_hint` into the provider's `seriesChart`. |
| `shared/charts/facing-pair.tsx` | keep `FacingRow`/`FacingHeadings` locally, on the kit's `facingAxes`/`facingBand`/`facingHeadingPad` | The kit's default tick width is 48 (lenkbank's is 54): pass `FACING_TICK_WIDTH` wherever it was omitted. |
| `CheckboxField` + raw checkboxes | `Checkbox` | `className="self-end pb-2"` for the field-baseline layout. |
| metrics `Tiles` | `StatTile size="sm"` in `<StatTileGrid minTileWidth="7.5rem">` | ok/warn/bad → `tone` success/warning/danger; "not applicable" → `value={null}`. |
| the kit-owned tests (`with-zoom`, `zoom-fit`, `zoom-layer`, `series-chart`, `facing-pair`) | — | Covered by the kit's tests; delete with the copies. |

## kastlan

| Replace | With | Notes |
|---|---|---|
| `shared/components/ui/checkbox.tsx`, `switch.tsx` (Radix/shadcn) | `Checkbox`, `Switch` | They used shadcn tokens (`bg-primary`), not the kit's. `CheckboxField`'s description variant → `description`. |
| `features/handover/components/signature-pad.tsx` (2 sites) | `SignaturePad` | `onSave` and `disabled` work unchanged. Pass `label`/`description`. `allowTypedName` can replace the hand-built typed fallback — check `detail.method === "typed"` and store `detail.typedName`. PNG ink is `#111111`; the pad follows the theme on screen. |
| `features/calendar/components/month-year-picker.tsx` | `MonthPicker` | `value={`${year}-${pad(month + 1)}`}`, `onChange={(k) => { const [y, m] = k.split("-").map(Number); onSelect(y, m - 1); }}` — kastlan months are 0-based. The year list becomes arrows + PageUp/PageDown. |
| `MoneyField` | `NumberField` | `value={v == null \|\| v === "" ? null : Number(v)} onCommit={field.onChange} min max digits={2} nullable` — stores a number, drops the hand-written clamp. Shows "12.5", not "12.50". |
| form `DateField` (native `type="date"`) | the existing `DatePickerField` / kit `DatePicker` | |
| `TextField type="time"` (meeting-estate-step) | `TimeInput` | |
| `KpiCard`, `KpiProgressCard` | `StatTile` (`footer={<ProgressBar/>}` for the progress one) | `title` → `label`; `trend {value,label}` → `delta={{ value: v / 100, unit: "percent", label }}` with `goodDirection="up"`. Linked tiles: `href` + `renderLink`. |
| `RecipientChips` | `Chip` | |
| `LanguageSwitcher` | `LanguageMenu` | Already imported elsewhere in kastlan. |
| `DocumentUpload`'s own drop zone | `FileDropzone` | |
