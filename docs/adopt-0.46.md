# Adopting `@eifi1/ui-kit` 0.46 and `eifi1-server-kit` 0.16.0

ui-kit 0.46 has one change that shows on a plain bump: a table with phone swipe actions now
also gets a desktop actions column with the same actions (Marcel, dev#598; on by default, except
beside `rowActions`). Check every table with `mobileSwipeActions` after the bump: the feedback
inboxes pass `desktopSwipeActions={{ omit: feedbackSwipeOmitShown, name }}` so the column doesn't
repeat the status cell. **An app's own `DataTable` wrapper must forward
`desktopSwipeActions`** (take `props` whole and pass them on): a wrapper that destructures
the prop and drops it hands the kit `undefined`, so the kit draws its column wherever there
is no `rowActions`, beside the wrapper's own, and swallows a `false`. TypeScript does not
catch it, since the kit's `DataTableProps` now has the prop (keksdose B1/S1; its full
migration is in the DataTable section). Everything else is optional, and each section says
which app's workaround it replaces. After any kit bump, regenerate the API types
(`npm run generate:api` or the app's own; keksdose's is in frontend/package.json:15): a
server-kit bump alone can change them (0.15 did: `AdminAction` gained `group_deactivate` /
`group_reactivate`; keksdose N4). server-kit 0.16 changes no model keksdose exposes, so
expect an empty diff there.

## The 0.45 adoptions: ui-kit fixes

### `MailTestCard`: `mailBackend` is optional (keksdose N1, kastlan K6, KS 3)

Leave it out and the transport chip shows from the first answer on; it keeps the last
transport an answer named, so a later 429 does not hide it (admin §9.2.4). An app that
read a one-row query only for the chip can drop it. Passing it still works as in 0.45.

| App | Change |
| --- | --- |
| keksdose | `MailTestPanel` (features/admin/admin-page.tsx:763-777): drop the `TRANSPORT_PROBE` roster query (:755, :765-769) and `mailBackend`. Once the roster had loaded, the probe showed the chip before the first send; without it the chip appears with the first answer (keksdose N1: acceptable). |
| kastlan | platform-page.tsx:95: drop `mailBackend={roster.data?.mail_backend ?? "console"}` and the roster query (:68-72) if nothing else reads it. Today the chip says "console" while the query loads, also on a Resend installation. |
| Kurvenschmiede | Optional. system-panel.tsx:21-24 reads the invitations query the admin page caches anyway; keep it, or drop `mailBackend` and the `!invitations.data` wait so the card shows at once. |

### The feedback tiles have the kit's words (KS 1)

An `extraTiles` entry keyed `"awaiting_verdict"` or `"released_for_work"` may leave out
`label` and `description`: the kit's `adminArea.tiles.awaitingVerdict` /
`awaitingVerdictHint` and `releasedForWork` / `releasedForWorkHint` fill them, in seven
languages (admin §9.5). The app's own words still win, and the kit's hint line comes
only with the kit's label: an entry that keeps its own `label` and no `description` shows
no line under the count, as in 0.45 (keksdose S5). Any other key still needs its
`label`; the type says so (`AdminExtraTile = AdminOwnTile | AdminFeedbackTile`). New
types: `AdminOwnTile`, `AdminFeedbackTile`, `AdminFeedbackTileKey`.

| App | Change |
| --- | --- |
| keksdose | Nothing on the bump: its `awaiting_verdict` tile (features/admin/admin-page.tsx:1224-1229) passes its own `label`, so it gains no hint line. Optional: `EXTRA_TILES` (:1199) can drop `labelKey`, with `admin.overview.awaiting_verdict` in its catalogues, and then the tile shows the kit's label and its hint line. |
| kastlan | Nothing: settings/pages/admin-page.tsx:97-100 keeps `label: t("admin.tiles.awaitingVerdict")` ("Zur Prüfung" names the IN_EVALUATION status; kastlan N3), so the tile stays as it is, with no hint line. Dropping it would also drop the key from four catalogues (de-CH, en, fr, it). |
| Kurvenschmiede | features/admin/admin-page.tsx:120-135: `awaiting_verdict` (:127-135) drops `label` and `description` (the kit's hint is KS's own sentence); `released_for_work` (:120-126) drops `label` and keeps `description` (the feedback loop's queue, `npm run feedback`). That takes three `admin.tiles.*` keys out of seven catalogues (KS N2). |

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
| kastlan | **K1** shared/offline/query-persistence.ts:58-63: the `dehydrateOptions` override → `persistMutations: false` in the `createQueryPersistence` call (:50-57). **K2** the sign-in page (features/auth/pages/login-page.tsx, `LoginPage` :23) runs `removeStaleQueryCopies("kastlan", PERSIST_MAX_AGE)` on mount, for the copy a session left when it ended with no user known (auth-store.ts:121, the rehydrate "ended" path, which lands on /login through app/protected-route.tsx:87-89); providers.tsx:51 stays. Not features/auth/components/auth-page.tsx: that frame also serves not-found and the no-company page, signed in (kastlan S5). The sweep removes the ended session's copy once it is past `maxAge`, at a sign-in ≥ 24 h later (kastlan N1: what K2 asked). **K3** shared/pwa/sw-update.ts → `export const swUpdates = createServiceWorkerUpdates(registerSW)`; main.tsx:31 `swUpdates.start()`; app/pwa-update.tsx:18 → `useServiceWorkerUpdate(swUpdates)` (its names are `onReload` / `onDismiss`, the prompt's props). **K4** shared/offline/offline-lock.ts → the kit's `OFFLINE_LOCK` and `COMMIT_EXCEPT_OFFLINE` (for `COMMIT_OFFLINE_TOO`, in the handover's defect-form, room-inspector and meter-readings-card); app-layout.tsx:88 → `useOfflineWriteLock(!online)`, and `offlineSync.needsConnection` can go if the kit's words fit. |
| Kurvenschmiede | Nothing (online-only). |

## server-kit 0.16.0

Install the wheel by URL, pinned by hash (0.16.0, not 0.15.1: it adds names, which server-kit's
patches never do; nothing breaks):

```
eifi1-server-kit @ https://github.com/Eifi1/server-kit/releases/download/v0.16.0/eifi1_server_kit-0.16.0-py3-none-any.whl
sha256: SHA256_AT_RELEASE
```

Two changes show on the bump itself:

- **The tours export spells `completed_at` as the wire does:** `2026-10-18T07:00:00Z`, not
  `isoformat()`'s `+00:00` (`TourProgressService.export`). A test that pins the export's value
  fails until it is re-pinned.
- **`test_mail_message` returns `HtmlMailMessage`**, a `MailMessage` whose `html` is a `str`.

| App | Change |
| --- | --- |
| keksdose | Drop `message.html or ""` and its comment after `test_mail_message` (backend/keksdose/adapters/api/admin_router.py:495-496). No tours export (tours stay on the device). |
| kastlan | **The bump fails a backend test until it is re-pinned** (kastlan B1): tests/api/test_tour_progress.py:66, `"completed_at": "2026-10-01T08:00:00+00:00"` → `"2026-10-01T08:00:00Z"`. |
| Kurvenschmiede | **The bump fails a backend test until it is re-pinned** (KS S1): backend/tests/api/test_tours_api.py:99, `"2026-10-18T07:00:00+00:00"` → `"2026-10-18T07:00:00Z"`. |

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
should keep their time set automatically (network time) all the same. **A clock that
changed between the edit and the push moves the edit** (kastlan S3, accepted): a tablet
edits at 09:00 with a correct clock, restarts 5 h behind and syncs at 11:00 before network
time catches up; the skew reads +5 h, its stamp becomes 14:00, clamped to 11:00, and a
colleague's 10:00 edit that 0.15 kept now loses. The slow clock that 0.16 fixes is the
more common case, and the 24 h cap bounds the error. A long offline queue stretches the
same assumption. `client_now` is read as the body is built, so transit time (a 401
replay, a cold backend's wake) counts as a few seconds of skew toward the device: below
the clamp, and accepted (kastlan N4).

| App | Change |
| --- | --- |
| keksdose | Two steps, both kk's own (keksdose S4). Its server merges with its own `_merge_lww` (backend/keksdose/domain/services/sync_service.py:523, called :1239 and :1279), not the kit's, and it has **no future clamp**: it stores `incoming_updated or utcnow()` as sent (:549, and a new row :1268), so a fast device clock wins every later conflict on that row, REST writes included, until real time catches up. **Now**: `clamp_stamp(incoming_updated, now=moment)` for both stored stamps (cheap, closes the hole; kk takes it as its own fix). **Later**: the skew. Its queued upserts carry device stamps (frontend/src/shared/offline/write.ts:178, :236, `stampAfter` sync-client.ts:639-643), so a slow browser clock loses the same way; send `client_now: new Date().toISOString()` with the push (sync-client.ts:1487; the page pulls at :1284 push nothing) and shift `incoming_updated` by `clock_skew(...)` before `_merge_lww` and the stored stamp. REST writes are server-stamped and deletes unconditional, so only queued upserts gain. `stampAfter` can stay: its stamp is shifted and clamped like any other. |
| kastlan | **Client**: features/handover/offline/sync.ts:170-182, add `client_now: new Date().toISOString()` beside `refusals: true` (:181), inside the retry loop so each attempt reads the clock afresh. **Server**: bump to the 0.16.0 wheel (pyproject.toml:90). The router has no `moment` (`apply_incoming` makes its own, domain/services/sync_service.py:345) and its `model_dump()` of the changes (adapters/api/sync_router.py:51) does not carry `client_now`, so sync_router.py:61 passes `client_now=payload.client_now` into `sync_service.apply_incoming` (:331-333, a new keyword), which computes `skew = clock_skew(client_now, now=moment)` once against its own `moment` and passes `skew=skew` to `merge_lww` (:372) and `clamp_stamp` (:392) (kastlan S2). `SyncRequest` (domain/schemas/sync.py:23) inherits the field. A test: a slow tablet's later edit beats a colleague's earlier one that synced first. **Tablets**: set date and time automatically on every handover tablet (a device setting, no code). |
| Kurvenschmiede | Nothing (no `/sync`). |

## A company's rename logs both names (server-kit 0.16.0, kastlan K8)

`AdminAction.GROUP_RENAME` documented `{from, to}` for a company, but `audit_detail` took
only short tokens, so `{"from": "Test AG"}` raised `AuditDetailError` and the rename failed
(500). Now `audit_detail(detail, action=)` treats a `group_rename` detail's top-level `from`
and `to` as names: free text, **cleaned, never refused**, so the log can never turn the
rename into a 500 (kastlan S1, decided by the main session). A name loses its control and
format characters (a tab or line break becomes a space; a soft hyphen or zero-width space
goes), its whitespace collapses, and one over 200 characters (`DETAIL_NAME_MAX_LENGTH`) is
cut, ending in `…`. A name blank after that, or secret-shaped, is left out with its key.
That covers a stored legacy name the app cannot control (`from`). The size limit counts
UTF-8 bytes, so two 200-character names in any script fit (kastlan N5). The rest of that
detail is still tokens, and every other action still refuses a name. `admin_action_record`
passes its own action, so a call through it needs no change. Reading back needs none
either: `AdminActionRow.detail` is a plain dict.

**A new name is refused at the edge, by the same rule**: `group_name_problem(name)` (new,
`eifi1_server_kit.user_admin`) returns `None` or why: `"blank"`, `"too_long"`,
`"control_character"`, `"secret_shaped"` (`GroupNameProblem`). A pydantic validator that
raises `ValueError` on it answers 422; store `name.strip()`.

| App | Change |
| --- | --- |
| keksdose | Nothing (no group renames). |
| kastlan | Bump to the 0.16.0 wheel, then log the names again. **Validate a new name by the kit's rule** (kastlan S1): `PlatformCompanyUpdate.name` (domain/schemas/platform.py:37, a bare `str \| None`: a rename to `"  "` succeeds today) and `CompanySettingsUpdate.name` (domain/schemas/property.py:45, `min_length=1` lets `"   "`, a tab or a soft hyphen through) each get a `field_validator` on `group_name_problem` → 422. The log no longer 500s either way; this keeps bad names out of the table. In domain/services/platform_service.py:195-198, pass `detail={**VIA_PLATFORM, "from": company.name, "to": data.name}` before the name is set, and drop the comment at :196-197. In adapters/api/company_router.py:43-46, pass `detail={"from": renamed_from, "to": company.name}` and drop the comment at :44-45. The frontend already maps them: settings/components/admin-actions-card.tsx:37 turns `detail.from` / `detail.to` into the entry's `renamed`, so the row reads "Company renamed from A to B". Add a test that records a rename with spaced names, e.g. "Test AG" → "Test AG Bern". |
| Kurvenschmiede | Nothing. A team's rename keeps `{}` (team_service.py:224); a team's name is never logged. |

## The 0.45 adoptions: guide notes

- **A new write route brings two touch points** (keksdose N3, admin §9.2.2): its
  billing/demo stance in the app's every-write-route sweep (kk:
  `tests/api/test_billing_gate.py` `ACCOUNT_ALLOWED`; ka: `BILLING_WRITES` / `DEMO_WRITES`;
  KS: `tests/api/test_demo.py`), and, if the app's limiter is process-global, a reset
  of that limiter instance in the test conftest (kk: its own `_mail_test_limiter`,
  built from `MAIL_TEST_LIMIT`, reset by `reset_mail_test_limiter`,
  adapters/api/admin_router.py:465-468). KS builds its limiters per app (`AuthLimiters`,
  infrastructure/security.py:279) and a fresh app per test, so it has nothing to reset.
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
  binding nothing changes. The row's `edit` button opens the editor, so it has its own
  name, apart from the editor's submit that saves: `translationReview.flagRow` ("Flag for
  a change…") and, on a missing string, `suggestRow` ("Add a translation…"), seven
  languages (keksdose B2/S3). The phone's swipe keeps "Needs a change".
- **Not dev#598, the 0.45 note (UM)**: a native checkbox, radio, label or summary inside a
  `rowHref` card (or a linked desktop cell) keeps its click's default now. RowLink cancelled
  every plain click, which undid the toggle. Buttons and the card itself are cancelled as
  before. This is checked in jsdom only, so an app with such a field confirms it on a phone.

| App | Change |
| --- | --- |
| keksdose | **The bump breaks the wrapper** (keksdose B1/S1). frontend/src/shared/components/data-table.tsx:42 destructures `({ desktopSwipeActions, ...props })` and never forwards it, so the kit sees `undefined` and draws its own column: feedback gets two actions columns (feedback-page.test.tsx:173-176 fails), the accounts' `false` (accounts-page.tsx:906) is swallowed and the kit's column repeats the row's `RowActions` (:1035), and swipe-row-actions.test.tsx:103-131 fails on a duplicate "Approve". TypeScript does not catch it: `false \| Options` and the kit's `boolean \| DataTableDesktopSwipeActions` are compatible, and dropping only the wrapper's prop type still compiles. **Take `props` whole and forward it; delete the derivation**: data-table.tsx: delete :1-5 and :16-66 (`DesktopSwipeActionsOptions`, `KeksdoseDataTableProps.desktopSwipeActions`, the `useMemo` column) and their now-unused imports; keep `mobileExpandAsDialog ?? true` (:71). swipe-row-actions.tsx: delete `planSwipeRowActions` (:108-129) and its tests (__tests__/swipe-row-actions.test.tsx:76-88); the wrapper tests (:98-141) then check that the prop reaches the kit. Keep `boundSwipeRowActions`, `swipeColumnCollapse` and `swipeActionsColumn` for the hand-rolled transactions register (transactions-page.tsx:407-433) and the budget table (budget-table.tsx:207-210), which are not kit phone cards. **Feedback**: feedback-page.tsx:284-288 → `desktopSwipeActions={{ omit: feedbackSwipeOmitShown, name: (fb) => fb.title, commit: true }}` (the wrapper's `planSwipeRowActions` defaulted to `commit: true`, dev#496; the kit's default is no scope), and the `visibleFeedbackStatuses` import (:22) goes. **Accounts**: nothing once the prop is forwarded. **Guard**: shared/components/__tests__/swipe-desktop-parity.test.ts still holds in substance, but its comments (:19-20, :46) describe the wrapper, and the translations entry (:57-64, `via: "kit"`) plus the assertion at :115 demand the text "kit finding": the kit now derives that column, so the entry becomes a covered case (keksdose S2). **Translations**: translations-page.tsx:310 needs no change; the panel's desktop rows now show Approve plus the user's bound `edit` ("Flag for a change…") and `clear`, so translations-page.test.tsx:145 still finds one "Needs a change" (the editor's), and a test that clicks a row's edit asks for "Flag for a change…". |
| kastlan | features/feedback/pages/feedback-page.tsx:177-181: the inbox gains the column on the bump. Add `desktopSwipeActions={{ omit: feedbackSwipeOmitShown, name: (fb) => fb.title }}` (import from `@eifi1/ui-kit`), or the column repeats the status cell's advance and won't do (`useFeedbackColumns`, :127). Optional (kastlan N2, predates 0.46): pass `commit` to the column and to the status cell, so offline they say "Needs a connection" as the rest of the app does. **Translations**: features/translations/pages/translations-page.tsx:252 passes `swipe` (the default binding, approve and edit), so the desktop's approve column (key `approve`) becomes an actions column (key `actions`) with Approve plus "Flag for a change…" / "Add a translation…". A width or visibility stored for `approve` under `storageKey="translations"` (:246) is orphaned; check the table after the bump (kastlan S4). |
| Kurvenschmiede | features/feedback/feedback-page.tsx:220-224: the same line as kastlan, `name: (row) => row.title` (status cell from `useFeedbackColumns`, :153). Translations (translations-page.tsx:276) passes no `swipe`: unchanged. |
