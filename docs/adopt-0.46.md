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
migration is in the DataTable section). The notification types card also changes
on the bump: a type with two or more channels draws them as columns ("In the app" / "E-mail", and
"Push" where offered) instead of a "By e-mail" switch under the row (the Notifications section);
and `useFeedbackNotificationTypes()` returns `feedback_received` too, so each app's
`NotificationTypeId` union gains it (the Feedback alerts section). Everything else is optional, and each section says
which app's workaround it replaces. After any kit bump, regenerate the API types
(`npm run generate:api` or the app's own; keksdose's is in frontend/package.json:15): a
server-kit bump alone can change them (0.15 did: `AdminAction` gained `group_deactivate` /
`group_reactivate`; keksdose N4). server-kit 0.16 changes several exposed models, so expect a
diff: `TypeSwitches.push`, `InboxItem.company`, the auth zone fields (`UserResponse.timezone` /
`device_timezone`, `ProfileUpdate`, `RegisterRequest.device_timezone`), `SyncRequest.client_now`
and the new `legacy_rework_append` code.

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
patches never do; and it removes the legacy rework append, BREAKING for a tab open across
the deploy, see its section):

```
eifi1-server-kit @ https://github.com/Eifi1/server-kit/releases/download/v0.16.0/eifi1_server_kit-0.16.0-py3-none-any.whl
sha256: SHA256_AT_RELEASE
```

Three changes show on the bump itself:

- **The legacy rework append is a 422** (`code: "legacy_rework_append"`): each app has a
  backend test that still expects the conversion (its section, further down, names it).
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

## The legacy rework append is a 422 (server-kit 0.16.0, BREAKING)

Since round 0.40 a rework is `POST /feedback/{id}/rework`; server-kit 0.13–0.15 still turned
an old client's PATCH append (`--- REWORK <stamp> ---` added to `body`, no status) into a
rework entry. From 0.16.0 that append, on a row outside OPEN / READY / IN_PROGRESS, by the
author or an admin, is refused before anything is written: 422
`{"detail": "This page is out of date: reload it, then send the report back again.", "code":
"legacy_rework_append"}` (`LegacyReworkAppendError`, `LEGACY_REWORK_APPEND`; contract §10.3).
`UpdatePlan.rework`, `UpdatePlan.reopened`, `legacy_rework_block` and `plan_update(prefix=)`
are gone. All three apps already send `onRework` and answer the kit's refusals through
`install_contract_error_handlers`, so the code reaches the wire. The only exposure is a tab
open across the deploy: its old bundle shows the English detail (the kit's toast prefers a
`detail`) until it reloads; nothing is lost silently. The apps' refusal catalogues need no
words: only an old bundle ever meets the code, and it carries its old catalogue (ui-kit has
no feedback words by code either).

| App | Change |
| --- | --- |
| keksdose | **The bump fails a backend test**: tests/api/test_feedback.py:186-225 (`test_the_author_can_rework_a_settled_entry_by_appending_to_it`) expects 200 and a rework entry; it becomes the 422 with `code == "legacy_rework_append"` and an unchanged row. The PWA keeps an old bundle for days (`registerType: "prompt"`), so expect the toast until its users accept the update prompt. |
| kastlan | **The bump fails two backend tests**: tests/api/test_feedback_workflow.py:391 (`test_author_rework_append_reopens_server_side`) and :410 (`test_admin_rework_append_goes_to_rework`) → the 422; :433 (an append while OPEN stays a body edit) holds. Update the module docstring (:9-10, "still turned into such an entry for one release"). **Deploying straight from 0.11** (production): a tab open across the deploy gets the 422 on a rework until it reloads. Zero risk: deploy a release on a ≤ 0.15 wheel first, then this one. |
| Kurvenschmiede | **The bump fails a backend test**: backend/tests/api/test_feedback_api.py:570 (`test_an_old_clients_appended_body_is_written_as_the_authors_entry`) → the 422. Update `FeedbackUpdate`'s docstring (domain/schemas/feedback.py:69-72, "the kit still recognises the old shape"). `refusalMessage` (shared/api/client.ts) needs no entry: an unknown code falls through to the detail. |

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

## The date format is a kit setting (keksdose's, lifted; settings §7.1 amendment)

keksdose's Settings ▸ Appearance "Date format" (feedback #180) is the kit's now: a day is
written in an order of its own choosing, apart from the interface language.

- **`DateFormatSetting`** (`value`, `onChange`, optional `label`, `hint` — `null` for none —
  `language`, `labels`, and a `Select`'s other props): "Follow language — 01 Aug 2026" and
  four shapes, each option labelled by the date it produces (01.08.2026, 01/08/2026,
  08/01/2026, 2026-08-01). Its words are `appearance.dateFormat`, `dateFormatHelp`,
  `dateFormatAuto` in all seven languages (keksdose's own words for de-CH, en, fr, it).
- **`DateFormatPreference`** (`"auto" | "de-DE" | "en-GB" | "en-US" | "sv-SE"`),
  **`DATE_FORMAT_PREFERENCES`**, **`isDateFormatPreference`** (for a stored value),
  **`resolveDateFormat`**, **`dateFormatSample`**, **`formatDateWithPreference(value,
  preference, language, { weekday })`** (keksdose's `renderDate`: a bare day is that
  calendar day in every zone, a timestamp stays local, the weekday's name is the
  language's) and **`dateFormatterFor(preference, language)`**.
- **How `formatDate` reads the preference**: the app keeps it (keksdose: a persisted
  device store, not an account column) and reads it in two places. Its own date helper
  calls `formatDateWithPreference`; `<UiKitProvider formatDate={useMemo(() =>
  dateFormatterFor(preference, language), [preference, language])}>` makes the kit's
  DatePicker, DateRangePicker ends and DateMark write a day the same way (a month or a year
  answers `""`, so the kit keeps its own rendering in the language). The kit's
  `formatDate` / `useKitFormat().formatDate` (named styles) do not read it.

| App | Change |
| --- | --- |
| keksdose | Optional, no visible change. features/auth/appearance-card.tsx:178-193 → `<DateFormatSetting id="date-format-select" value={dateFormat} onChange={setDateFormat} language={currentLang} />` (the kit's words are keksdose's; its `settings.date_format*` keys can go from the catalogues). shared/state/date-format-store.ts:50-54 (`DateFormatPref`, `DATE_FORMAT_PREFS`), :83-169 (`ResolvedDateFormat`, `resolveDateFormat`) and :171 (`sampleFor`) → the kit's names; keep the store (:67). shared/components/ui.tsx:52-120 (`DATE_ONLY`, `renderDate`, `withWeekday`) → `formatDateWithPreference`; shared/i18n/kit-labels.tsx:88-93 → `dateFormatterFor(pref, language)`. Its tests (shared/state/__tests__/date-format-store.test.ts) keep passing on the kit's functions. |
| kastlan | Nothing. To offer it: a device store holding a `DateFormatPreference` (persisted, `"auto"` by default; register it with `registerDeviceSetting` so "Reset this device" clears it), the setting in its appearance card, `dateFormatterFor` on its provider, and its date helper on `formatDateWithPreference`. |
| Kurvenschmiede | Nothing (the same three steps, if wanted). |

## Push survives a rotated subscription (`pushsubscriptionchange`; server-kit 0.16.0, NT:1028)

A push service may replace a browser's subscription; until now the server kept sending to
the old endpoint, got 410, deleted the device, and the person had to turn push on again. The
service worker now re-registers it.

- **ui-kit `handlePushSubscriptionChange(self, { pushKey, replace, onOutcome? })`** for the
  app's worker (dependency-free; `resubscribeAfterChange` is the step itself): the browser's
  new subscription (else the one it holds, else a fresh one under the old key or
  `pushKey()`), sent as `PushReplaceInput {old_endpoint, old_auth, subscription}`. Then every
  open page gets `{type: PUSH_SUBSCRIPTION_CHANGED, outcome}`, and `usePushDevice` re-reads
  on it. Outcomes: `replaced`, `no_previous` (the browser named no old subscription; Chrome
  often doesn't: push then reads as off, as before), `push_off`, `incomplete`, `failed`.
  `pushSubscriptionInput` is the register body of a subscription.
- **server-kit `PushReplaceIn`** and **`push_auth_matches(stored, given)`** for the new route
  **`POST /notifications/devices/replace`**. No session (a worker has no `Authorization`
  header): the old endpoint and its `keys.auth`, which only that browser and the server
  hold, are the proof, compared in constant time. No row with `old_endpoint`, or an `auth`
  that does not match → 404 (one answer for both); the new endpoint on another account →
  409 (`PushEndpointTakenError`); else the row moves in place (new endpoint and keys, the
  same account, `failure_count` 0) → 200 `PushDeviceResponse`; the new endpoint already on
  the same account → the old row goes and that one answers. Rate-limit it as the other
  unauthenticated routes.

| App | Change |
| --- | --- |
| keksdose | frontend/src/sw.ts: `import { handlePushSubscriptionChange } from "@eifi1/ui-kit/push-worker"` (the worker-safe subpath, never the barrel, which reaches React), `handlePushSubscriptionChange(self, { pushKey, replace })` beside the `push` listener (:229), both requests with plain `fetch` (the worker has no token). Backend: the route beside `POST /notifications/devices/unregister` (adapters/api/notifications_router.py:87), on `PushReplaceIn`, rate-limited by the per-instance `SlidingWindowRateLimiter` as the other unauthenticated routes (auth_router.py:82). §10.6's rules: **`push_subscriptions` is FORCE RLS and the route has no session**, so the lookup by `old_endpoint` and the update run inside `async with bypass_rls_for(session)` (infrastructure/tenancy.py:130) with an explicit `PushSubscription.endpoint == body.old_endpoint` filter (the only unauthenticated route that takes the bypass); **proof before the 409**: `push_auth_matches(row.auth, body.old_auth)` first, and only a proven device learns the new endpoint is taken; an **inactive or demo** account → the same 404, and its row deleted; push rows **deleted on sign out everywhere** (auth_router.py:916), **on deactivation** (`request_deletion`, account_deletion_service.py:199) and **on erasure** (`erase_one`, :337). **The reaper's race**: a 404/410 marks the row `gone_at` and stops sending to it instead of deleting it (domain/services/push_service.py:294-298 → a migration adds `push_subscriptions.gone_at`); the replace may claim a gone row within `PUSH_GONE_GRACE` (7 days, server-kit), and the daily reap deletes gone rows older than that. Never log the route's body; its 422 is a plain detail, never the input (`old_auth`). A test per answer (200 in place, 200 claiming a gone row inside the grace and 404 past it, 404 unknown or wrong auth, 404 inactive and demo, 409 another account's endpoint only after the proof). |
| kastlan | Nothing until its own push (its injectManifest worker, app list); then the same two steps. Then: import from `@eifi1/ui-kit/push-worker`, and §10.6's rules — device rows account-scoped **without RLS** (a sessionless route under forced RLS answers 404), push rows deleted on sign-out-everywhere, on deactivation (account_service.py:191-192) and on erasure, inactive or demo → 404, proof before the 409, the reaper's `gone_at` with the 7-day claim. |
| Kurvenschmiede | Nothing (no push). |

## Notifications: the inbox, the bell, a switch per channel and per device, the zone on the account (notifications §10; server-kit 0.16.0)

docs/notifications-harmonization.md §10 (settled 2026-10-19). Additive on a plain bump, with two
visible changes: the types card draws a **column per channel** wherever a type offers two or more
("In the app" / "Push" / "E-mail", stacked under the label on a phone; the old "By e-mail" switch
under the row is gone, `labels.byEmail` is deprecated and unused), and nothing else moves until
the app passes the new props.

- **`NotificationInbox`** (props only): `items` (server-kit `InboxItem`, with `company?`),
  `unreadCount`, `loading`, `onMarkRead(ids | null)`, `onClear()` (asked first, in the header —
  no `ConfirmProvider`), `onOpen?(item)` (the kit marks the row read, then the app routes; left
  out, a row with a `url` is a real link that marks itself read on a click or a middle click),
  `icon(type)` (`Bell` for a type it does not map), `hasMore` / `onLoadMore` / `loadingMore`,
  `formatDate`, `title`, `labels`. **`INBOX_BADGE_INTERVAL = 60_000`** for the badge's poll.
- **`NotificationBell`** (optional per app) for **`TopBarActions`' new `notifications` slot**,
  right before `account`: the unread count as a badge ("99+"), the newest 20 rows in the bar's
  `TopBarActionMenu` panel, then "All notifications" (`href`). One badge per signal: the bell
  or an avatar dot, never both. The panel is the bar's hover panel at every width (the bar's
  menus have no phone sheet).
- **The types card:** `NotificationSwitches.push` (`null` or left out = not offered, so a
  pre-0.16 server draws as before); a PATCH sends `{types: {id: {push}}}` alone.
- **The device list:** `onMutedTypesChange(id, mutedTypes)` with `types` (the card's) and
  `typeSwitches` (the settings `GET`'s `types`) draws "Types on this device" on each row — a
  switch per type with push on; each flip saves the device's **whole** list
  (`PATCH /notifications/devices/{id} {"muted_types": [...]}`). `PushDeviceItem.muted_types?`.
- **`TimeZoneSetting`** (`value` = `/auth/me`'s `timezone`, `null` = Automatic; `onChange(zone |
  null)` → `PATCH /auth/me {timezone}`) for the group that holds the language, and
  **`useDeviceZoneReport({ stored: me.device_timezone, report, isDemo })`** once at app start
  (reports only when the device's zone differs, once per start, never for a demo).
- **`QuietHoursSetting`**: pass `zone` (the account's effective zone) and `zoneHref` (the zone
  row): the picker goes, the card says "In your time zone (…)" and links there, and a time sends
  no zone. **`timezone` is deprecated** (read only without `zone`; removed in 0.47 with the
  settings resource's `timezone` alias). `held` (an app that runs the notifications tick) says a
  held push arrives when the window ends.
- **`<UiKitProvider timeZone>`**: `useKitFormat().formatDate` / `formatRelativeTime` show
  timestamps in it when a call names none; a bare `"YYYY-MM-DD"` is never shifted.
- New words in all seven languages (`notifications.channel*`, `inbox*`, `bell*`, `deviceTypes*`,
  `zone*`, `quietZone*`; `quietDescription(inbox, held?)`); an app's `notifications` overrides
  keep type-checking.

| App | Change |
| --- | --- |
| keksdose | **Inbox:** features/auth/notification-inbox.tsx:67-179 → `<NotificationInbox items={inbox.data?.items} unreadCount={inbox.data?.unread_count ?? 0} loading={inbox.isPending} onMarkRead={(ids) => markRead.mutateAsync(ids)} onClear={() => clear.mutateAsync()} icon={(type) => TYPE_ICONS[type as NotificationTypeId]} formatDate={(iso) => formatDateTime(iso, locale)} />` in settings-page.tsx:178 (the device's zone, as today: no provider `timeZone`); `TYPE_ICONS` (:44-56) stays and gains `feedback_received`; its `notifications.inbox_*` keys go (the kit's words are keksdose's). Keep the avatar dot (app/account-menu.tsx:365-378) and the menu row's count (:146-171): **no `NotificationBell`**. **Switches:** the migration `notification_preferences.enabled` → `app` and `push` (a missing row stays missing; `migrate_enabled_to_channels`); `push_subscriptions.muted_types` (FORCE RLS as today); `PATCH /notifications/devices/{id}`; the `/push/preferences` shim writes both, and `couple_push_to_app=True` while old bundles send `{app}` alone. features/auth/notification-settings-cards.tsx:165 passes the answer as is (now with `push`); :231 `PushDevicesSetting` gains `types`, `typeSwitches={settings.data?.types}` and `onMutedTypesChange`. `PushData.inbox=False` when no inbox row is written, and frontend/src/sw.ts:256 shows the notification when `data.inbox === false` even with a focused window. **Zone:** copy `notification_settings.timezone` → `users.timezone` (then drop the column); `device_timezone`; `TimeZoneSetting` in features/auth/appearance-card.tsx beside the language; `useDeviceZoneReport` in the shell; notification-settings-cards.tsx:205 `QuietHoursSetting` gets `zone={me.effective zone}`, `zoneHref`, `held` (no `timezone`); the four UTC writers through `effective_zone` (billing_notice_service.py:181-188, account_deletion_service.py:268, :274, feedback_publish_notice_service.py:124, push_notifications.py:938-960). **Queue:** the table and store; `_deliver_to_user` (push_notifications.py:396-399) holds a quiet push instead of dropping it; the 15-min product-metrics Cloud Run Job becomes the tick (`notifications_tick` + `send_queued_replies`, out of the daily job at scheduler.py:248) and carries the mail env. |
| kastlan | **No push:** `NotificationTypes(..., push_channel=False)`; `StoredSwitches` takes the defaulted `push` (notification_settings_service.py:52, :71); the card shows two columns for `invoices_overdue` (features/settings/pages/settings-page.tsx:332), nothing to change there. **Inbox for `invoices_overdue`:** the table (`user_id`, `company_id`, account-scoped, no RLS), `InboxStore` + `inbox_router`; the 00:10 job writes a row per (user, company, event) in the mailing loop (overdue_mail.py:151-170); **`NotificationBell` in `notifications=`** (app/top-bar.tsx:136), `onOpen` switching the acting company first when `item.company` is another's; the inbox's page or card for `href`. The poller stays, fed from the inbox rows and the live `dunnings_pending` count (tests/integration/test_notification_poll.py, tests/api/test_staff_only_routes.py:174, use-notifications.test.ts follow). **Zone:** `users.timezone`, `users.device_timezone`, `/auth/me`; `TimeZoneSetting` beside `LanguageSetting` (settings-page.tsx:153); `useDeviceZoneReport`; an app-zone `today()` (Europe/Zurich) on the request paths (invoice_logic.py:39, :61; dunning_repository.py:86-87; journal_entry_service.py:474, :494, :518; accounting_router.py:373, :384, :459; deposit_service.py:143, :150); billing notices stay Zurich. Optional: `<UiKitProvider timeZone={me.timezone ?? undefined}>`. **No queue in 0.46** (`notifications-flush` in `JOBS` with its first queued type). |
| Kurvenschmiede | **No push, no inbox, no bell:** `NotificationTypes(..., push_channel=False)`; `settings_of` and the PATCH filter by `TYPES.receivable(lambda t: t.id != FEEDBACK_RECEIVED or user.role == ADMIN)` (notification_service.py:124-127); its e-mail-only rows keep their single switch (frontend/src/features/notifications/notifications-card.tsx:29). **Zone:** the two columns, `/auth/me` (ignored for a demo, as auth_router.py:249-262); `TimeZoneSetting` beside `LanguageSetting` (frontend/src/features/settings/account-cards.tsx:127); `useDeviceZoneReport`; the billing notice's day in the recipient's effective zone (`NOTICE_ZONE` → the resolver) with a test. Optional: the provider's `timeZone`. No queue, no flush route, no Scheduler job. |

## Feedback alerts for admins (`feedback_received`; feedback §11; server-kit 0.16.0)

docs/feedback-harmonization.md §11 (settled 2026-10-19). One type, `feedback_received`, for a new
report, a rework that lands OPEN, and a new crash; on by default in every channel the app offers,
`quiet`; never the actor, a demo or the platform superuser. **ui-kit:** `useFeedbackNotificationTypes()`
now returns a third entry, `feedback_received` ("New feedback and reworks", "When someone files a
report, sends one back, or a page crashes."), drawn only where the server answers it (an admin);
`feedbackNotificationTypes.adminGroup` ("Admin") is a heading an app may put over it. **Type
change on the bump:** `FeedbackNotificationTypeId` gains `"feedback_received"`, so an app that
spreads the hook into a `NotificationTypeEntry<NotificationTypeId>[]` adds `feedback_received` to
its own id union (all three declare the type in this round; keksdose
features/auth/notification-settings-cards.tsx:145, kastlan
features/settings/pages/settings-page.tsx:313-320, Kurvenschmiede
features/notifications/notification-types.ts:29). An app that passes `groups` puts
`feedback_received` in one (the card throws in development for a type the server answered in no
group).

| App | Change |
| --- | --- |
| keksdose | The type (in the app, push, e-mail on; `quiet`; `bundle` 15 min, which only crash mails use); `TYPE_ICONS.feedback_received`; a group for it in the card's `groups` (the kit's `adminGroup`). `FeedbackAlerts` over `admin_recipient_ids` minus the actor: an inbox row and a push for every kind, the mail at once (after commit) for a report or a rework, a crash's mail queued (the tick). Its **first notification mail**: `send_email(..., headers=)` (infrastructure/email.py:62) for RFC 8058, `POST /notifications/unsubscribe/{token}` (+ `/all`), the `/unsubscribe` page on `UnsubscribePanel`, a dedicated unsubscribe secret (not `jwt_secret`), the `User.email_verified` gate. The mail-kind guard (tests/unit/test_metrics.py:1057-1069) resolves enum kinds and type ids; observability §5.6 lists the billing kinds, `feedback_published`, `feedback_received`. Words: "New feedback report #123 (Bug)", "Report #123 was sent back for rework", "New crash report #123", link `/feedback?row=123`; no title, body or reporter. Support chat's admin push stays apart. |
| kastlan | The type (e-mail on, no app), receivable "ADMIN in some company"; `FeedbackAlerts` via `FeedbackDeps` (feedback_router.py:84-107): the ADMINs of the report's company, active, non-demo, verified, switch on, not the actor (as `_recipients`, overdue_mail.py:95-116); report and rework mailed in a background task after commit; a crash → nothing (the badge). The words in doc_text/notifications.py beside `feedback_answered`, with `{company}`, four languages, `REVIEW_PENDING`. Logs: email.py:127 → the status and the JSON's `name`; :153-154 → `type(exc).__name__`. Its settings card shows the kit's entry with no change (the `types` list already spreads `useFeedbackNotificationTypes()`; add `feedback_received` to any `groups`). |
| Kurvenschmiede | The type (e-mail on); every active non-demo ADMIN but the actor (`User.is_person`) through `_tell` / `send_after_commit`; report and rework mailed; a crash → nothing (the badge); `feedback_loop.file_report` builds `FeedbackService(alerts=None)`. The receivable filter on the settings read and PATCH (above). |

## Pre-push checks every pushed commit message with the shared script (ui-kit repo only)

ui-kit's `.husky/pre-push`, for a tree that already passed `npm run check`, now runs the
shared `scripts/check-pushed-commits.cjs` over every commit the push sends (as server-kit's
hook does), instead of `check:commits` per pushed tip. The shared rules are pinned as a
`files[]` list in scripts/shared-commit-rules.json (`check-commit-msg.cjs`,
`check-pushed-commits.cjs`), at **shared-workflows v1.3.1 (pending tag)**: `npm run
check:commit-rules` says so and passes until the tag exists, then `npm run sync:commit-rules
-- v1.3.1` pins it (`-- --from ../shared-workflows` copies a local checkout, pin untouched).
`check:commits` stays in `npm run check` and CI. shared-workflows v1.3.1 also resolves a
hook's exported `GIT_DIR` after a `cd` into a subdirectory (the top-level `.versionrc` still
applies) and warns when it leads nowhere. Apps: nothing; each app's hook already vendors
the shared script (or takes v1.3.1 with its next sync).

## Sync engine and offline scopes (`@eifi1/ui-kit/sync`; local-first P3 + P4)

docs/local-first-harmonization.md §2 (settled 2026-10-19). A new subpath, `@eifi1/ui-kit/sync`:
`createSyncDb(name, { extraStores?, upgrades? })` (one Dexie database: `rows`, `outbox` with a
`scope` index, `meta`, plus the app's tables), `createSyncEngine({ db, scopes, send, isOffline?,
planCode?, holdCodes?, paged?, steps?, paused?, pollMs?, soonMs?, backoffMs? })` (one request per
scope in `scopes()` order, read every round; `client_now` fresh per request; the paged pull's
cursor written with the last page only; `refused` per change by `holdCodes` → `waiting`, any
other code → `blocked` (sent on `retryBlocked()`); `rejections[]` → `rejected`, never re-sent; a
lost scope's 403 rejects its queue "Not allowed to sync <scope>"; errors back off 5 s, 15 s,
60 s, then every 5 min, reset by a good round, `online` or "Sync now"; offline sets no timer;
`forget({ keepQueue })` bumps the generation first, and every apply and every step checks it;
one engine per database; `start()` does nothing on a computer marked shared),
`useSyncWorker(engine | null)`, `useSyncStatus(engine | null)` → `{ status, onSync }` for
`SyncStatusIndicator`, `useSyncQuery(db, query, deps)` (Dexie `liveQuery`). `@eifi1/ui-kit/sync/testing`:
`createFakeSyncTransport()` for the app's tests. **`dexie` (^4) is an optional peer of `/sync`
only.** The leaf utilities `stampAfter`, `isOfflineError`, `readLocalFirst`, `writeLocalFirst`
come from `/sync` or `/offline` (one module, no Dexie, no TanStack). No new words.

| App | Change |
| --- | --- |
| keksdose | Nothing (the engine is not for kk, §1.8 7). Optional: `stampAfter` / `isOfflineError` from `@eifi1/ui-kit/offline` in place of sync-client.ts:639-643 / net.ts:20 (kk's `isOfflineError` counts any non-axios `Error` as offline; the kit's only fetch's `TypeError`). |
| kastlan | See below. |
| Kurvenschmiede | Nothing (online-only, §1.4). |

**kastlan, server (BE `kastlan`)**
- Take the server-kit 0.16.0 wheel's `sync.scopes`; `domain/services/sync_scopes.py`: `HANDOVER`
  onto `SyncScope`/`EntityRule`, its checks (finalised protocol, reading in the protocol's unit,
  signature before finalising) as `guard`s, finalising in `after_apply`.
- **QR-IBAN withholding:** `withheld=frozenset({"estates.qr_iban"})` on every scope; the pull runs
  rows through `withhold`; a test that the handover pull holds no `qr_iban` and a push naming it is
  rejected.
- Paging: `collect_delta` (domain/services/sync_service.py:224-255) on the kit's `page_of`, 2000
  rows a page; the router honours `paged`.
- Four new scopes, rules per §2.5, roles as online: `MEETINGS`, `METERS`, `MAINTENANCE` (costs and
  schedules included; `after_apply`: `ASSIGNED` on a work order's create, `next_due` via
  `calc_next_due` when `last_performed` changes), `CONTACTS` (`FINANCE_WRITE`; phone, mobile,
  email, notes only). The router (adapters/api/sync_router.py) resolves `scope` among the five and
  answers 403 to a role without it.
- **Completed meetings online:** owner_meeting_service.py `add_agenda_item` (:109),
  `update_agenda_item` (:113), `delete_agenda_item` (:117) refuse a COMPLETED meeting (409), and
  `update_meeting` (:79) a `notes` change on one; the `meetings` scope's guard refuses the same.
- **Idempotent creates (D16):** the P4 REST create schemas (schemas/maintenance.py, meter.py,
  owner_meeting.py) take an optional `sync_uuid`; a create whose `sync_uuid` already names a row of
  the company answers that row.
- Tests: tests/api/test_sync_handover.py stays green; one `test_sync_<scope>.py` per new scope
  (allowed, each rejection, a completed meeting refused, `next_due` recomputed, the withheld
  field); the completed-meeting REST checks; a duplicate REST create with the same `sync_uuid`.

**kastlan, client (FE `frontend/src`; HO = features/handover/offline)**
- `@eifi1/ui-kit/sync`; `dexie` stays ^4.4.6. The handover copy onto the engine: HO/db.ts →
  `createSyncDb("kastlan-handover-<user>-<company>", { extraStores: { photos: "id, roomId, status" },
  upgrades: [{ version: 2, upgrade: (tx) => … }] })`, where v2 sets `scope = "handover"` on every
  outbox row **and moves `meta.lastKnowledge` to `lastKnowledge:handover`** (the engine keeps a
  cursor per scope; without the move the first round pulls everything again, harmless but slow).
  Outbox statuses: ka's `waiting` rows keep their meaning; the engine adds `blocked`. HO/repo.ts
  `write()` → `engine.write("handover", …)` (stamped with `stampAfter`); HO/sync.ts and
  HO/sync-controller.ts → `createSyncEngine({ send, scopes, planCode, holdCodes: ["billing_read_only",
  "plan_limit"], paged: true, steps: [photoUpload], paused: deviceSyncPaused })`; the 422 parser
  and its loop deleted; HO/offline.test.ts is the parity suite (`createFakeSyncTransport` or the
  mocked `apiClient`).
- **One engine per account and company:** built from the signed-in user and company;
  `useSyncWorker(engine)` in app/app-layout.tsx:92 replaces `useHandoverSyncLoop`; a company switch
  builds a new one and stops the old.
- **The guarded sign-out:** features/auth/stores/auth-store.ts:74 calls `engine.forget({ keepQueue:
  true })` instead of `forgetHandoverCopy`; the photo step writes only while `ctx.isCurrent()`.
- **Shared computer:** `isSharedComputer()` → no engine (`useSyncWorker(null)`), the queueing
  controls locked "Needs a connection", the handover pages and the meeting recording page not
  offered.
- Indicator: app/top-bar.tsx:177 `SyncStatusIndicator` always shown (no `hideWhenIdle`, no handover
  `scope` words), fed by `useSyncStatus(engine)` plus the legacy queue's count. **The legacy
  `kastlan-offline` queue and `syncManager` drain stay** (D17; prod is on v0.11.0).
- **All five scopes**, in the round's order handover, meetings, meters, maintenance, contacts;
  `scopes()` from the company role.
  - **The meeting page:** a new recording page under features/owner-meetings ("meeting mode"): per
    agenda item the three counts, the resolution and `minutes_text` as the chair announces them,
    and the meeting's `notes`; reads and writes the copy only; no outcome computed (ZGB 712m double
    majority later); "Complete" online only ("Needs a connection"); a completed meeting read-only;
    invitations read-only.
  - meters, maintenance, contacts: the online pages on `readLocalFirst`/`writeLocalFirst`; creates
    mint `sync_uuid` once and send it on both paths; queued controls take
    `commit={COMMIT_EXCEPT_OFFLINE}`; a meter reading's scope from its row.
  - maintenance costs (`cost_estimate`, `actual_cost` on the detail page) and a schedules list with
    "Done" write through the copy (no online writer exists today).
- Words for the new page and the schedules list in all seven languages.
