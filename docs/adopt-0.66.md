# Adopting `@eifi1/ui-kit` 0.66

ui-kit 0.66 is two things at once: the round Marcel scoped on 2026-11-16 and 2026-11-20 (AttachButton,
TopBarNav, StatStrip, the DataTable's name, the transfer dialog's "customer" removal, the screenshot that
honours the scroll), and every wave of the refactor audit of 2026-11-22 ("Alles in 0.66"). The audit
found no live defect; most of what it fixed is the keyboard focus falling to `<body>`.

**From 0.65.1.** Restart the Vite dev server after the bump (`vite --force` if a change still does not show).

**Legal wording: Privacy Policy (fr only).** Two French strings on the privacy page gained a no-break space
before ":" (DOC-5). Move the page's `updated` date in the French text.

## Must change (breaking)

- **`TransferUnavailable` loses `"customer"`, and `TransferOwnershipLabels.customer` is gone** (deprecated in
  0.65). No app passes them (searched in keksdose, Kurvenschmiede and Staunlabor).
- **`AccountsClient` / `createAccountsClient` default the user type to `AccountMe`** (was `AccountUser`,
  API-5(d)), the type `/auth/me` answers with. Type-only. Code that reads the user gains fields; code that
  typed it as `AccountUser` on purpose writes `createAccountsClient<AccountUser>(…)`. Staunlabor
  (`shared/api/accounts.ts`) takes the new default without an edit unless its typecheck says otherwise.
- **`createQueryPersistence`'s `persistMutations` now defaults to `false`** (FLW-3). Pass `true` to keep
  paused writes across a reload. The credential hooks never persist, whatever the setting, and the scrub list
  gains `password`, `current_password`, `new_password`. Kurvenschmiede already passes `false`; Staunlabor
  persists nothing; keksdose does not call `createQueryPersistence` (its own `PersistQueryClientProvider`
  options), so nothing changes there; its mutations never pause (`offlineFirst`, no retry), offline writes go
  through its Dexie outbox, and it sets `shouldDehydrateMutation: () => false` as hardening (checked
  2026-11-22).

## Deprecated (removed in 0.67)

- `SortStrip`'s `onPick` → `onChange`.
- `useAdminActions` → `useAdminActionLog`.
- Never read by any app: `ConsentAgainNotice` (+ props, labels, the `consentAgain` namespace),
  `releaseThisDevicePush` (→ `dropPushSubscription`), `FEEDBACK_SWIPE_ACTIONS`,
  `TRANSLATION_REVIEW_SWIPE_ACTIONS`, and `focusIsLost` / `focusFirst` / `returnFocus` / `FocusReturn` /
  `isQuietFocus` off the barrel.

## New

- **`AttachButton`** — one way in for attachments (Camera · Photos · Files, + Screenshot in feedback): a
  sheet on a phone, a menu at the button on a desktop, the picker directly when one source applies,
  `layout="inline"` tiles for `FileDropzone`'s `renderBody` (`attachDropzoneProps(options)` gives the zone
  the same screening). Words: namespace `attach`.
- **`FeedbackAttachmentField picker="sheet"`** and `sources`, also on `FeedbackDialog`. Opt-in in 0.66; the
  default in 0.67.
- **`TopBarNav`** in TopBar's (and PublicHeader's) new **`nav`** slot: plain page links after the brand, the
  active one (`aria-current`, by path prefix or your `isActive`) in brand colour with an underline; when the
  links do not fit beside the actions, all of them move into a menu. `renderLink` takes NavPills' link props.
  Words: namespace `topBarNav`.
- **`StatStrip`** — a quiet row of three to six `StatTile`s between hairlines.
- **DataTable `aria-label`, `aria-labelledby`, `caption`** (`hideCaption` keeps it for screen readers only) —
  name the table and its phone list.
- **`AccountFeedbackPage onCaptureScreenshot={null}`** hides the capture button.
- **`/offline`, `/sync`: `randomUuid`, `uuid5Sync`** (no `crypto.subtle`, so plain http works).
  **`/dates`: `monthStartOf`, `addMonthsIso`, `monthsBetweenIso`, `weekStartOf`, `daysBetweenIso`,
  `isoWeekNumber`** — ISO-day arithmetic from a given day.
- **`isFeedbackBulkPatch(variables)`** (/feedback) — for the bulk-edit guard below.
- **ESLint rule `@eifi1/ui-kit/pending-not-disabled`** (opt-in): flags a button whose own click turns it
  natively `disabled`.

## Fixed (no change needed)

- The focus stays where the user was: the pressed Save / confirm / reauth / capture button while its request
  runs; FieldSuggestion's Clear; a pick in the typed comboboxes' phone sheet; a DataTable row whose inline
  editor closes itself; a grouped table after an insertion; a zoomed chart's Reset and last Back; a field
  whose lock arrives or lifts.
- Enter: the passkey fields and the tour ignore an IME's confirming Enter; FeedbackDialog, the inbox note and
  the chat send only on the kit's submit chord (not Ctrl+Shift+Enter).
- The signed-out account pages load lazily: −23 kB gzip on a public site's first load, no edit.
- `/accounts`: each mutation reports through its own call (a second "Send reset" no longer swallows the
  first's toast); the wire types are checked against server-kit 0.32.
- The screenshot crops to the screen's width on a phone whose layout viewport is wider.
- The npm README lost a stale second copy of 426 lines.
- The privacy page's `standardEntries.recentData(1)` says one hour in the singular (en, de, fr, it, es: it
  said "1 hours"). No app passes 1 (Kurvenschmiede passes 24), so no page's text changes and no `updated`
  date moves.

## What an app does

**keksdose:**
- Feedback page's `update` (contract §13.6): `mutationKey: ["feedback", "update"]`; refetch in `onSettled`
  only when `queryClient.isMutating({ mutationKey }) <= 1`; no error toast when `isFeedbackBulkPatch(patch)`.
- `budget-sort-bar.tsx:31`: `onPick` → `onChange`.
- Optional: `attach-receipt-button.tsx` → `<AttachButton multiple maxFiles={MAX_SCAN_PAGES} … />`;
  `invoice-upload.tsx` → `FileDropzone {...attachDropzoneProps(o)}` with `<AttachButton {...o} layout="inline" />`
  in `renderBody`; `support-attachments.tsx` → `picker="sheet" sources={["photos", "files"]}`.
- Optional: `aria-labelledby={headingId}` on DataTable instead of the labelled-section wrappers.
- Optional: drop `shared/lib/uuid.ts`, `shared/ledger/dates.ts`, `register-periods.ts`'s week helpers for the
  kit's.
- Load the kit catalogues lazily (MOD-2: −56 kB gzip on the entry chunk): `loadUiKitLabels` /
  `peekUiKitLabels`, as Kurvenschmiede and Staunlabor do (5 files).
- Tests the kit now holds (FS-7): delete `data-table-sort.test.ts`, `date-picker-step.test.tsx`,
  `swipeable-row.test.tsx`, `calculator.test.tsx`, `mini-calendar.test.tsx`, `modal.test.tsx`,
  `dropdown.test.tsx`, `multi-select.test.tsx` and `number-input.test.tsx` from
  `frontend/src/shared/components/__tests__/`.
- Persistence: nothing (see "Must change"); `shouldDehydrateMutation: () => false` is in (keksdose FS-13,
  2026-11-23).

**Kurvenschmiede:**
- The same feedback `update` guard as keksdose.
- Open from 2026-10-30: `toFixed` prints "." in de/fr (shortcut-dialog.tsx:679, :832, :1009).

**Staunlabor:**
- `TopBar nav={<TopBarNav items={…} renderLink={…} />}` (or PublicHeader `nav`), and `StatStrip` on the
  front page — the stopgap link row goes.
- Feedback pages: install `modern-screenshot`, or pass `onCaptureScreenshot={null}` (the capture button always
  failed without it).
- Optional: `weekly.ts` helpers → `daysBetweenIso` / `addDaysIso` / `weekStartOf`.

**Words to read natively:** es, hu, zh for `attach` (zh "附加" least sure) and `topBarNav` ("Pages", "Menu").
