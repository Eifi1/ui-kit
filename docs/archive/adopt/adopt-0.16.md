# Adopting `@eifi1/ui-kit` 0.16

Built from keksdose's whole-frontend sweep on 0.15.5 (P1–P9). Almost everything is opt-in
API. The visible changes and bug fixes are listed first. `CHANGELOG.md` → `0.16.0` has
the release notes, and the showcase (⌘K) has every prop live.

## Everyone

1. Bump to `^0.16.0` by hand; a caret below 1.0 locks the minor version.
2. **Visible changes and fixes:**
   - **Card parts follow the Card's padding.** With `padding` (or `inset` / `outline`),
     CardHeader, CardContent and CardFooter no longer add their own `px-6 pt-6`, so a
     padded card is no longer padded twice. A card without `padding` is unchanged; a
     padding given only through `className` can't be seen, so use the prop.
   - **CardDescription** uses `--text-muted` instead of `--money-neutral`.
   - **CardAction:** a caller's `grid-cols-*` on CardHeader wins again. The opt-in
     `stackAction` puts the action under the title below `sm`.
   - **IconButton's label tooltip is lazy by default.** It appears on hover or focus and
     is otherwise absent. Accessible names are unchanged, because they come from
     `aria-label`. App tests that find the label bubble without hovering must hover or
     focus first, or pass `tooltipLazy={false}`.
   - **LoadingState `label={null}` / `""`** hide the visible words (bug). The status
     region still announces "Loading…" to screen readers.
   - **ProgressBar legend:** a negative or over-max part shows its own signed value,
     not the clamped slice. The same goes for its `aria-valuetext`.
   - **FeedbackAttachmentField multiple:** two files added in the same tick no longer
     lose the first (bug). The screenshot chip is titled "Screenshot", with the file name
     underneath.
   - **FeedbackDialog:** the multiple-mode heading is `feedbackAttachment.attachmentList`;
     `feedbackDialog.attachments` is deprecated, but still honoured.
   - **Select** with `aria-label` and a FieldHint `hint` now renders the "?" (it was
     dropped).
3. **New label key:** `feedbackAttachment.attachmentScreenshot`. Every catalogue has it.

## New, opt-in

| Area | API |
|---|---|
| ListItem (P2) | `content` (inside the target, e.g. a budget bar; pair with `ProgressBar as="span"`), `overline`, `metaWrap`, `renderRow` (wrap the row in a Tooltip or guard inside the kit's `<li>`), `trailingTone`, expandable rows (`expandedContent`, `expanded` / `defaultExpanded` / `onExpandedChange`) with `leadingActions` for a checkbox outside the target |
| LineItems (P3) | `summary={{ label, value, tone, action }}`, `fieldLabels="floating"` (cells receive `fieldLabel`), `narrowColumns={2}` and per-column `narrowSpan` |
| Card (P4, P9) | `CardTitle as="h2"…`, `CardHeader stackAction`, `Card toneStrength="strong"` |
| Delta / SignedAmount (P1) | `palette="money"` (income/expense colours, with `goodDirection`), `flatWithin` |
| LoadingState (P5) | `labelVisibility="sr-only"`, `compact` |
| IconButton (P6) | `pending`, `tooltipLazy` |
| FormActions (P7) | `start`, `submitProps`, `submitIcon` (the spinner replaces it while pending), `stickyWithin="container"` |
| AuthedImage, AmountInput, FileButton, format (P8) | `AuthedImage stopPropagation`, `errorFallback={null}`; `AmountInput hint`; `FileButton showFileName`; `roundToCurrency(v, c, { fallbackDigits })` |
| StatTile (P9) | `variant="inset" \| "plain"`; `StatTileGrid stretch={false}` and `loading` (one announcement) |
| Others (P9) | `statusDotColor(tone)`; `StaticLegend as="div"`; `ProgressBar as="span"`; refs on every Table part; `PasskeysSetting` generic ids, `id` / `data-*`, `rowProps` |

Not changed: Chip's xs icon stays `size-3`. Side by side, 3.5 crowded the xs pill.

## 0.16.1

Picked up by `^0.16.0`.

- **FileButton `showFileName`:** the full list of picked names is in the kit's Tooltip
  (lazy) instead of a native `title`. 0.16.0 broke the one-tooltip rule (dev#523), and
  keksdose's guard caught it. The read-out stays one stable live region.
- **The kit now guards this itself:** `src/__tests__/no-native-title.test.ts` fails on any
  native `title` attribute on a DOM element in the kit's source, except the explicit
  `nativeTitle` opt-in.
