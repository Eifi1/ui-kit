# Adopting `@eifi1/ui-kit` 0.46 and `eifi1-server-kit` 0.16.0

ui-kit 0.46 has one change that shows on a plain bump: a table with phone swipe actions now
also gets a desktop actions column with the same actions (Marcel, dev#598; on by default, except
beside `rowActions`). Check every table with `mobileSwipeActions` after the bump: the feedback
inboxes pass `desktopSwipeActions={{ omit: feedbackSwipeOmitShown, name }}` so the column doesn't
repeat the status cell, and keksdose drops its own wrapper's column (the DataTable section).
Everything else is optional, and each section says which app's workaround it replaces. After any kit bump, regenerate the API types
(`npm run generate:api` or the app's own): a server-kit bump alone can change them
(0.15 did: `AdminAction` gained `group_deactivate` / `group_reactivate`; keksdose N4).

## The 0.45 adoptions: ui-kit fixes

### `MailTestCard`: `mailBackend` is optional (keksdose N1, kastlan K6, KS 3)

Leave it out and the transport chip shows from the first answer on; it keeps the last
transport an answer named, so a later 429 does not hide it (admin §9.2.4). An app that
read a one-row query only for the chip can drop it. Passing it still works as in 0.45.

| App | Change |
| --- | --- |
| keksdose | `MailTestPanel` (features/admin/admin-page.tsx:763-777): drop the `TRANSPORT_PROBE` roster query (:755, :765-769) and `mailBackend`. Note `?? ""` showed no chip before the answer anyway. |
| kastlan | platform-page.tsx:95: drop `mailBackend={roster.data?.mail_backend ?? "console"}` and the roster query (:68-72) if nothing else reads it. Today the chip says "console" while the query loads, also on a Resend installation. |
| Kurvenschmiede | Optional. system-panel.tsx:21-24 reads the invitations query the admin page caches anyway; keep it, or drop `mailBackend` and the `!invitations.data` wait so the card shows at once. |

### The feedback tiles have the kit's words (KS 1)

An `extraTiles` entry keyed `"awaiting_verdict"` or `"released_for_work"` may leave out
`label` and `description`: the kit's `adminArea.tiles.awaitingVerdict` /
`awaitingVerdictHint` and `releasedForWork` / `releasedForWorkHint` fill them, in seven
languages (admin §9.5). The app's own words still win. Any other key still needs its
`label`; the type says so (`AdminExtraTile = AdminOwnTile | AdminFeedbackTile`). New
types: `AdminOwnTile`, `AdminFeedbackTile`, `AdminFeedbackTileKey`.

| App | Change |
| --- | --- |
| keksdose | Optional. `EXTRA_TILES` (features/admin/admin-page.tsx:1199): the `awaiting_verdict` entry can drop `labelKey`, with `admin.overview.awaiting_verdict` in its catalogues, if the kit's words fit. |
| kastlan | settings/pages/admin-page.tsx:97-100: drop `label: t("admin.tiles.awaitingVerdict")` and its seven catalogue entries; the tile gains the kit's line under the count. |
| Kurvenschmiede | features/admin/admin-page.tsx:120-135: drop `label` and `description` of `released_for_work` and `awaiting_verdict`, and the four `admin.tiles.*` keys in seven catalogues. The kit's hints are shorter than KS's (no "the feedback loop's queue"); keep `description` if that line matters. |

### Offline: `persistMutations`, `removeStaleQueryCopies`, the service-worker store, the offline lock (kastlan K1–K4)

All in local-first §1.6 (0.46). From `@eifi1/ui-kit/offline`:

- **`createQueryPersistence({ …, persistMutations: false })`** writes no paused mutation
  and drops any an older build wrote on restore. Default `true` (keksdose).
- **`removeStaleQueryCopies(app, maxAge, { storage?, keep? })`**: the stale sweep without
  a persistence, for the sign-in page. `persistence.removeStale()` is the same with `keep`
  = its own key.
- **`createServiceWorkerUpdates(registerSW)`** and **`useServiceWorkerUpdate(updates)`**:
  register once at start, read "a new version waits" anywhere:
  `<PwaUpdatePrompt {...useServiceWorkerUpdate(swUpdates)} hold={…} />`. This corrects
  0.45's kastlan row ("a `useRegisterSW` call"): an app whose prompt lives in its
  signed-in shell would register only after sign-in, and a first visit's sign-in page
  would get no offline shell. keksdose's prompt mounts at the root, so `useRegisterSW`
  stays right there.

From the main barrel: **`OFFLINE_LOCK`** (`"offline"`, now in `WriteLockKind`),
**`COMMIT_EXCEPT_OFFLINE`** and **`useOfflineWriteLock(offline, labels?)`**, a
`combineWriteLocks` source with `writeLock.offline` ("Needs a connection.", seven
languages). The app reads the connection itself.

| App | Change |
| --- | --- |
| keksdose | Nothing. It queues offline writes as paused mutations (keep the default), and its prompt mounts at the root. |
| kastlan | **K1** shared/offline/query-persistence.ts:58-63: the `dehydrateOptions` override → `persistMutations: false` in the `createQueryPersistence` call (:50-57). **K2** the sign-in page (features/auth/components/auth-page.tsx) runs `removeStaleQueryCopies("kastlan", PERSIST_MAX_AGE)` on mount, for the copy a session left when it ended with no user known (auth-store.ts:121, the rehydrate "ended" path); providers.tsx:51 stays. **K3** shared/pwa/sw-update.ts → `export const swUpdates = createServiceWorkerUpdates(registerSW)`; main.tsx:31 `swUpdates.start()`; app/pwa-update.tsx:18 → `useServiceWorkerUpdate(swUpdates)` (its names are `onReload` / `onDismiss`, the prompt's props). **K4** shared/offline/offline-lock.ts → the kit's `OFFLINE_LOCK` and `COMMIT_EXCEPT_OFFLINE` (for `COMMIT_OFFLINE_TOO`, in the handover's defect-form, room-inspector and meter-readings-card); app-layout.tsx:88 → `useOfflineWriteLock(!online)`, and `offlineSync.needsConnection` can go if the kit's words fit. |
| Kurvenschmiede | Nothing (online-only). |

## Sync: the device clock's skew is corrected (server-kit 0.16.0)

Local-first §1.5 D2, amended in round 0.46 (Marcel, 2026-10-19). The latest DEVICE edit time
wins, and 0.15.0 clamped only future stamps: a tablet whose clock runs SLOW had its edits
count as older, so a colleague's edit made earlier but synced first replaced them without a
word. Now `SyncRequest.client_now` (optional; the device's clock when it sends the push, an
instant with a zone like `updated_at`) lets the server shift each stamp of that push by
`server_now - client_now` before LWW and the clamp: `skew = clock_skew(payload.client_now,
now=moment)` once per push, then `merge_lww(…, now=moment, skew=skew)` and `clamp_stamp(…,
now=moment, skew=skew)`. Skew within 2 s is ignored (`CLOCK_SKEW_TOLERANCE`), the correction
is capped at 24 h (`MAX_CLOCK_SKEW`). Without `client_now`, or without `skew=`, nothing
changes. It assumes the clock did not change between edit and push, so handover tablets
should keep their time set automatically (network time) all the same.

| App | Change |
| --- | --- |
| keksdose | Optional. Its queued upserts carry device stamps too (shared/offline/write.ts:178, :236, `stampAfter` sync-client.ts:639-643), so a slow browser clock loses the same way, but its server merges with its own `_merge_lww` (domain/services/sync_service.py:523, called :1239 and :1279), not the kit's. To adopt: send `client_now: new Date().toISOString()` with the push (sync-client.ts:1487; the page pulls at :1284 push nothing) and shift `incoming_updated` by `clock_skew(...)` before `_merge_lww`. `stampAfter` can stay: its stamp is shifted and clamped like any other. |
| kastlan | **Client**: features/handover/offline/sync.ts:170-182, add `client_now: new Date().toISOString()` beside `refusals: true` (:181), inside the retry loop so each attempt reads the clock afresh. **Server**: bump to the 0.16.0 wheel (pyproject.toml:90); adapters/api/sync_router.py:61 passes `skew=clock_skew(payload.client_now, now=moment)` into `sync_service.apply_incoming` (domain/services/sync_service.py:331-333, one `moment` for both), which passes `skew=skew` to `merge_lww` (:372) and `clamp_stamp` (:392). `SyncRequest` (domain/schemas/sync.py:23) inherits the field. A test: a slow tablet's later edit beats a colleague's earlier one that synced first. **Tablets**: set date and time automatically on every handover tablet (a device setting, no code). |
| Kurvenschmiede | Nothing (no `/sync`). |

## The 0.45 adoptions: guide notes

- **A new write route brings two touch points** (keksdose N3, admin §9.2.2): its
  billing/demo stance in the app's every-write-route sweep (kk:
  `tests/api/test_billing_gate.py` `ACCOUNT_ALLOWED`; ka: `BILLING_WRITES` / `DEMO_WRITES`;
  KS: `tests/api/test_demo.py`), and a reset of its process-global limiter
  (`MAIL_TEST_LIMIT`) in the test conftest.
- **Regenerate the API types after a kit bump** (keksdose N4): now in this guide's header
  and in adopt-0.45's.
- **kastlan's platform Activity** (K7, admin §9.1): one Activity card serves both scopes
  through an `enabled` flag on its query hook (else both queries run); the console's
  catalogue is `adminSections<Own, "invitations" | "billing">(…, { leaveOut })` with the
  type arguments written out. Neither is a kit change.
- **A demo's tour key: fixed, or per demo id** (KS 5, tours §10.2.6). KS's key per demo id
  is fine because `signOutTourProgress` runs at every end of a session, the demo's
  included; it also keeps a second demo on the same PC from inheriting the first's
  finished tours. Without that call at a demo's end, keep the fixed key.
- **Vulture** (KS 2): `SqlTourProgressStore.completions` is called only by the kit's
  service through the port, so a dead-code check flags it. KS baselines it in
  `backend/.vulture-baseline`, as the feedback and translation-review store methods.
  kastlan and keksdose run no vulture.

## Desktop actions from the phone's swipes (keksdose dev#598)

Marcel, 2026-10-19: every table whose phone cards swipe gets a desktop actions column with
the same actions. This is the one 0.46 change that shows on the bump: a `DataTable` with
`mobileSwipeActions` (and no `rowActions`) now draws that column on a wide screen.

- **`DataTable desktopSwipeActions`** (`boolean | DataTableDesktopSwipeActions<T>`):
  derived from the very `mobileSwipeActions` plan, so the two viewports cannot drift. The
  end side's actions first, then the start's, each once (by `SwipeAction.id`, else by
  label); each button runs the swipe's `onCommit` (the same confirm, the same Undo). Hidden
  on the phone, out of the column settings and the count, tooltips toward the row's start.
  On by default; off by default beside `rowActions` (`true` adds it). Options: `omit(action,
  row)`, `name(row)` (default `rowName`), `collapse`, `commit` (a `CommitScope`, or per
  action: refused with the lock's reason instead of vanishing). `false` where the row
  already has every action as its own button; say so at the call site.
- **`SwipeAction.id?`**: what the action is, apart from its words. The column tells
  actions apart by it, and `omit` matches on it instead of a translated label.
- **`feedbackSwipePlan`** sets each action's `id` (`advance`, `done`, `wont_do`), and
  **`feedbackSwipeOmitShown`** (`/feedback` and the barrel) is the `omit` beside the kit's
  status cell: it leaves out an action whose target the cell already offers
  (`visibleFeedbackStatuses`), so the column adds "Done" where DONE is more than a step
  away. No label matching.
- **`TranslationReviewPanel`** with a `swipe` binding: the desktop's approve column becomes
  an actions column (key `actions`, header the provider's `rowActions.actions`): Approve
  where the row can take it (bound or not, as before), then the binding's `edit` and
  `clear`, each once. `clear` was reachable only by a swipe. Under the write lock the
  buttons stay and say why. A `clear` from the button reports `origin: "row"`. Without a
  binding nothing changes.
- **Not dev#598, the 0.45 note (UM)**: a native checkbox, radio, label or summary inside a
  `rowHref` card (or a linked desktop cell) keeps its click's default now. RowLink cancelled
  every plain click, which undid the toggle. Buttons and the card itself are cancelled as
  before. This is checked in jsdom only, so an app with such a field confirms it on a phone.

| App | Change |
| --- | --- |
| keksdose | **Wrapper**: shared/components/data-table.tsx:14-67: drop `DesktopSwipeActionsOptions`, `KeksdoseDataTableProps.desktopSwipeActions` and the `useMemo` column. The kit's prop has the same name and shape, so the call sites compile unchanged. Keep `mobileExpandAsDialog ?? true`. If the wrapper stays and still adds its column, the table gets two. **Commit**: the wrapper's `planSwipeRowActions` defaulted to `commit: true` (swipe-row-actions.tsx:40-44, dev#496); the kit's default is no scope, so feedback-page.tsx:284 adds `commit: true`. **Feedback**: feedback-page.tsx:284-288: `omit: feedbackSwipeOmitShown` replaces the label match on `visibleFeedbackStatuses` + `statusLabels`; keep `name`. **swipe-row-actions.tsx**: `planSwipeRowActions` (:108-128) and its tests (__tests__/swipe-row-actions.test.tsx:76-88, :113-131) go with the wrapper. `boundSwipeRowActions`, `swipeColumnCollapse` and `swipeActionsColumn` stay for transactions-page.tsx:407-433 and budget-table.tsx:207 (no `mobileSwipeActions` on those tables, so the kit adds nothing there). The accounts table (accounts-page.tsx:906, `desktopSwipeActions={false}`) is unchanged; swipe-desktop-parity.test.ts still holds. **Translations**: translations-page.tsx:310 needs no change; the panel's desktop rows now show the user's bound `edit` / `clear` beside Approve. |
| kastlan | features/feedback/pages/feedback-page.tsx:177-181: the inbox gains the column on the bump. Add `desktopSwipeActions={{ omit: feedbackSwipeOmitShown, name: (fb) => fb.title }}` (import from `@eifi1/ui-kit`), or the column repeats the status cell's advance and won't do (`useFeedbackColumns`, :127). Translations (translations-page.tsx:234) passes no `swipe`: unchanged. |
| Kurvenschmiede | features/feedback/feedback-page.tsx:220-224: the same line as kastlan, `name: (row) => row.title` (status cell from `useFeedbackColumns`, :153). Translations (translations-page.tsx:276) passes no `swipe`: unchanged. |
