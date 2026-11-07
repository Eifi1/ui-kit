# Adopting `@eifi1/ui-kit` 0.57

ui-kit 0.57 adds two things an app asked for: quantities with units (keksdose's shopping
lists, SL-10) and a multi-select with bulk edit in the feedback inbox (Marcel's dev
feedback #663 in keksdose). Both are additive. With them: the minor dependency updates, and
`check:consumer-types` goes, because every app compiles with TypeScript 6 now.

**From 0.56, nothing else first.**

**Legal wording:** none.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:** nothing in the three apps.

## Feedback inbox: multi-select and bulk edit (feedback §13.6)

The admin on `/feedback` gets a box per row and a select-all; select-all takes what the
table's filters keep, on every page. On the phone, a long press on a card enters selection
mode; swipes rest while selecting, and the awaiting toggle steps aside while rows are
selected. A bulk bar sets the selected reports' **status**, **category** (never CRASH) and,
with `publicSwitch`, **Visible to others**.

- It uses the page's own `update` mutation: one `PATCH /feedback/{id}` per report, three at
  a time, so each report goes through the server's rules and notifies its author. No bulk
  endpoint is needed.
- One 8 s Undo toast for the batch puts each report back to its own previous value. A report
  whose PATCH fails stays selected (pressing again retries just those) and is left out of
  the Undo.
- New: `selectable` (default `true` wherever the inbox is editable; `false` turns it off),
  `inbox.bulk` (`FeedbackInboxBulk<T>`) for a page with its own layout,
  `FeedbackDetailPatch.category?`, and DataTable's `selection.onFilteredRowsChange?` (tells a
  table's owner which rows its filters keep, so a select-all under a filter never ticks rows
  nobody sees).
- Labels: nine `feedbackPage` keys in all seven catalogues (`bulkStatus`, `bulkCategory`,
  `bulkVisibility`, `bulkPublicOn`, `bulkPublicOff`, `bulkChanged`, `bulkFailed`,
  `bulkRestored`, `bulkRestoreFailed`).

**Check:** your `update` mutation's `mutationFn` must put the variables on the wire as they
come. All three spread `({ id, ...patch })` today; a field-by-field `mutationFn` would drop
`category`. keksdose's `feedbackApi.update` parameter type lists only `status`/`body`/`public`:
it compiles and sends `category` anyway; widen the type so it says so.

**In the browser (each app, as admin):**

- Desktop `/feedback`: tick rows, select-all under a status filter, set a status, then Undo.
  Check that the bar appearing above the table does not move the row you are working on.
- Phone: long-press a card, set a status; the floating bar sits above the bottom nav, and
  the awaiting toggle comes back after Clear.
- kastlan: no Visibility list (no `publicSwitch`); with `commit`, the bar is locked offline
  like the status cell.

## Quantities (keksdose SL-10)

An amount and its unit as one value:
`Quantity = { amount: number | null; unit: QuantityUnit }`, units
`"g" | "kg" | "ml" | "cl" | "dl" | "l" | "pcs"`, families `"mass" | "volume" | "count"`.

- **Helpers** (main entry): `QUANTITY_UNITS`, `QUANTITY_DIGITS`, `quantityFamily`,
  `toBaseQuantity`, `convertQuantity`, `sumQuantities`, `formatQuantity`, `parseQuantity`.
  The arithmetic is exact, in whole milli-units (0.1 kg + 0.2 kg is 0.3 kg); across families
  the answer is `null` (pieces to grams needs a piece weight, which is the app's).
  - `sumQuantities(qs, unit?)` answers in `unit`, else the first item's unit.
  - `formatQuantity(q, locale, { bestUnit, labels })` prints "1.5 kg" in de-CH and "1,5 kg"
    in de-DE, fr and it. With `bestUnit` it switches up at 1000 g / ml and down below
    1 kg / l, and cl and dl print as ml or l. The pieces word is "pcs" unless you pass
    `labels: useKitLabels("quantity", DEFAULT_QUANTITY_LABELS)` ("Stk.", "pce", "pz.").
  - `parseQuantity(text, locale, { labels }?)` reads "500g", "1,5 kg", "75 cl", "2.5 dl",
    "6 Stk", "6x". It returns `null` for multipacks ("6 x 1.5 l"), for an amount finer than
    the unit allows ("0.5 g"), and for a missing unit.
- **`QuantityInput`** (the bare control, for a list row) and **`QuantityField`** (labelled,
  with hint, help, error, required, and `suggestion` + `suggestionFrom`: a one-tap
  "Usual pack · 1 kg"). Shared props: `family`, `units` (wins over `family` and must lie
  inside it; a value outside `units`, such as 75 cl, still shows while it is the value),
  `nullable`, `positive` (default `true`: 0 is refused), `max` (in the chosen unit), per-unit
  `digits`, `locale`, `convertOnUnitChange` (default `false`: 500 g switched to kg is 500 kg,
  the typed number rounded to the new unit's grid; `true` makes it 0.5 kg).
- **`RhfQuantityField`** in `@eifi1/ui-kit/rhf` stores the `Quantity` object; nullable by
  default like `RhfNumberField`, with `defaultUnit` for a form whose default is `null`.
- A new **`quantity`** labels namespace in all seven catalogues (`DEFAULT_QUANTITY_LABELS`).
  An app with its own complete label tree gets it from a shipped catalogue spread, or English.
- Prices stay in the app; round them with the kit's money helpers to the currency's minor
  unit.

## Toolchain and dependencies

- `check:consumer-types` is gone: every app compiles with TypeScript 6.0.3, so the 5.9.3
  floor would now be the kit's own version.
- Within their ranges: `@tanstack/*` 5.107.1, `lucide-react` 1.70.0 (a peer; the apps pick
  their own), `vite` 8.3.6, `tailwindcss` 4.3.5, `zustand` 5.1.0. Nothing for the apps to do.
- Still waiting upstream: TypeScript 7 (typescript-eslint does not support it yet) and the
  moderate minimatch advisory GHSA-g3hv-75wg-m249 (eslint's own minimatch 10; development
  only).

## Each app

- **keksdose:** SL-10 builds on the quantity parts; #663 is the bulk edit, which needs no
  wiring. Widen `feedbackApi.update`'s parameter type to include `category`.
- **kastlan:** the bulk edit arrives with the bump (status and category; no Visibility list).
  Browser check as above.
- **Kurvenschmiede:** the bulk edit arrives with the bump. Browser check as above.
