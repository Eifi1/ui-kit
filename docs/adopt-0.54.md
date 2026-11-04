# Adopting `@eifi1/ui-kit` 0.54

ui-kit 0.54 takes the apps' notes since 0.53: keksdose's "Report this problem" diagnostics (live
#481), keksdose's audit follow-ups of 2026-11-01, and three proposals from kastlan's reuse
audit of 2026-11-02. Nothing breaks in the three apps; each addition replaces app code that can
go when the app gets to it. The places are from keksdose, kastlan and Kurvenschmiede (KS) on
2026-11-04 (`frontend/src`).

**From 0.52, adopt 0.53 first:** its removals apply (docs/adopt-0.53.md).

**Legal wording:** none.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:** nothing in the three apps. `KitFormat`, what `useKitFormat()` returns, gains
`formatDuration`: code that builds a `KitFormat` object itself has to add it. No app does.

## Feedback: what the app attaches to a report (keksdose live #481)

- **The admin sees it.** `FeedbackRowDetail` draws a **Diagnostics** / **Diagnose** section
  between the URL and the attachment: `context.diagnostics` as the app wrote it, each key and its
  value (an object or a list as JSON, nothing as "—"). Only for the admin (`canEdit`) and the
  author, never for another viewer of a shared row. Erasure drops the key (it is not on
  server-kit's `FEEDBACK_CONTEXT_KEEP`).
- **The reporter sees it too.** `useFeedbackSubmit().open(category, { diagnostics, title, body })`
  (`FeedbackSubmitOpenOptions`): the record is copied when the dialog opens, shown read-only in
  the context box under **Diagnostics sent with the report** / **Mitgesendete Diagnose**, and
  sent as `context.diagnostics` even with "Attach current page URL" off. `title` and `body`
  prefill the fields. A one-argument `open` is unchanged. Anything only the admin should read
  belongs in `diagnostics`, not in a public report's title or body.
- **keksdose:** drop `extraContext` from `useAppFeedbackSubmit` and the merge in its `create`;
  invoice-review.tsx and statement-review.tsx call
  `report.open("BUG", { diagnostics: { ...receiptScanDiagnostics(invoice) } })` (or
  `statementScanDiagnostics(statement)`) and lose their `scanDiagnostics` state. Keep the spread
  or declare `ReceiptScanDiagnostics` / `StatementScanDiagnostics` with `type`: TypeScript does
  not accept an `interface` where `Readonly<Record<string, unknown>>` is expected. The
  `extraContext` case in feedback-submit-wiring.test.tsx moves to the option; tests reading
  `sent.context.diagnostics` keep passing.
- **The server keeps it under 8 KB**: server-kit's `MAX_CONTEXT_SIZE` measures the whole
  `context`.

## Components (keksdose's audit follow-ups)

- **StatTile** `descriptionSensitive` and `footerSensitive` tag the description and the footer
  `data-private`, as `sensitive` tags the figures (`sensitive` alone still leaves them readable).
  keksdose: the Reserve tile in reports/tabs/tax-tab.tsx (`descriptionSensitive`,
  `footerSensitive={short}`) and reports/charts/kpi-card.tsx (`descriptionSensitive={hintSensitive}`)
  drop their hand-made `data-private` wrappers; a description private only in part (tax-tab's
  joint note) keeps its span.
- **Modal** and **DialogFrame** `held` refuse the backdrop, Escape, every Back press, the × and
  `actions(close)`, as `busy` does, without `aria-busy`. The × shows disabled; the caller closes
  with `open={false}` or by unmounting. With `urlParam`, Back is not held (as under `busy`).
  keksdose's features/auth/recovery-code-pane.tsx can pass `held={!kept}` and a plain `onClose`;
  a held refusal is silent (`onClose` is not called), so its `closeRefused` banner no longer
  fires: its warning above the code already says why the dialog stays.
- **DangerConfirm** `error` shows under the password field (or the phrase field), marks it
  invalid, is announced (`role="alert"`) and clears itself on the next edit and while the next
  attempt runs. keksdose's shared/components/password-danger-card.tsx can drop its `onError`
  toast and pass `error={mut.error ? … : undefined}`.
- **Hotkeys** don't fire while typing in a `contenteditable` where the engine lacks
  `isContentEditable` (jsdom); a `contenteditable="false"` island inside an editor still gets
  them. A test that stubbed `isContentEditable` can drop the stub.

## Formatting and billing

- **The currency pickers no longer offer the Bulgarian lev** (euro since 2026-01-01). A field
  holding BGN still shows it, an explicit `options` list still offers it, and `getCurrency("BGN")`
  still formats a stored amount. keksdose can drop the "the picker still offers the lev" remark
  in features/auth/signup-currency.ts.
- **Cached date formatters:** `formatIsoDate`, DateField's display, CalendarHeatmap and
  MiniCalendar reuse cached formatters instead of building one per call or per cell. Same text.
- **`formatDuration(seconds, { locale, unitDisplay, empty, minus })`**, also on `useKitFormat()`:
  "42s", "3m 12s", "1h 0m 0s" (en narrow; de-CH "3 Min. 12 Sek."). keksdose deletes
  `formatElapsed` (shared/components/scan-processing-card.tsx:25-29) for
  `formatDuration(secs, { locale: numberLocale() })`: the same text under an hour; past an hour
  it shows hours where it said "60m 0s".
- **`billingRefusalText(err, labels, { guest, item })`** gives a billing refusal's words from the
  `billing` labels, and `null` for anything else; `{ guest: true }` words `billing_read_only` for
  a guest without the payer's plan state.
  - kastlan: the `codedText` map in features/billing/components/billing-refusal-dialog.tsx:32-41
    goes, and `CODED` in billing-refusals.ts:12-22 can become `isBillingError`.
  - keksdose: `BILLING_ERROR_WORDS` and `billingErrorMessage` in
    features/billing/subscription-cards.tsx:58-77 become
    `billingRefusalText(err, labels) ?? extractApiErrorMessage(…)`.
  - KS: `KIT_BILLING_WORDS` / `KitBillingSentence` in shared/api/client.ts:247-263 and the
    kit-words branch at :323-328 go.
  - An app with its own words for `billing_read_only` or `plan_limit` (KS's figure line,
    kastlan's notice) checks those codes first.

## Tables and the translation review (kastlan's proposals 7 and 5)

- **`numberBound`** is exported (root and `@eifi1/ui-kit/data-table`): what a server-side number
  filter sends, `null` for a half-typed bound. **`numberFilter(get, { abs: false })`** drops the
  "Absolute value" box, and a link's `!` is ignored for such a column.
  - kastlan: delete its own `numberBound` in shared/components/data-table/use-server-table.ts:22-29
    (the kit's returns `null`, so `filterValueToQuery` at :42-47 adds `?? undefined`); columns that
    are never negative take `{ abs: false }`: construction_year (building-list-page.tsx:73,
    estate-detail-page.tsx:136), notice_period_months (lease-columns.tsx:177), file_size_bytes
    (document-columns.tsx:74), unit_values.length (distribution-key-columns.tsx:75).
- **`saveReviewsInChunks(writes, save)`** and **`clearReviewsInChunks(keys, clear)`** send the
  review's writes 1000 at a time, one after the other, under server-kit's cap of 2000, and
  return what to hand to one `mergeReviews` / `dropReviews`. A failing chunk rejects; the chunks
  before it stay saved. All three apps drop `SAVE_CHUNK`, `chunks<T>()` and their loops in
  features/translations/…/translations-page.tsx: kastlan :44-55, :152-161; keksdose :45-46,
  :75-79, :196-209; KS :47-48, :85-89, :199-213.

## Dependencies

The kit's own updates within their ranges (react 19.3.1, react-router 8.5.1, @tanstack/*
5.105.3, lucide-react 1.67.0, vite 8.3.5, vitest 5.1.0, …). The peer ranges are unchanged:
nothing to do in the apps.
