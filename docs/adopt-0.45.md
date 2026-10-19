# Adopting `@eifi1/ui-kit` 0.45 and `eifi1-server-kit` 0.15

ui-kit 0.45 adds nothing an app must take: every new part is optional. server-kit 0.15 has one
breaking change, `FeedbackRepository.count_by_status()` (the section on feedback counts), so
bump server-kit together with that row. The commit check at the end is the shared one.

## server-kit 0.15

Install the wheel by URL, pinned by hash:

```
eifi1-server-kit @ https://github.com/Eifi1/server-kit/releases/download/v0.15.0/eifi1_server_kit-0.15.0-py3-none-any.whl
sha256: 60a6f2af027ba6bc5830e9ab688100a0d2e9978f1ea8b44a0631245b567334a6
```

New: `tours` (+ `tours.router`, `tours.testing`), `sync` (the `sync` extra: `eifi1-server-kit[sync]`),
`feedback.feedback_attention`, the test mail parts in `mail`, `AdminAction.GROUP_DEACTIVATE` /
`GROUP_REACTIVATE`. `billing.SyncRefusal` is now `sync.SyncRefusal`, re-exported unchanged.

## Tours: the 0.44 adoption notes, as recipes

The three 0.44 adoptions found no kit fix, only guide and test notes
(audits/round-046/candidates.md). They are docs/tours-harmonization.md §9.8 now; every
snippet there runs in the kit's `src/tour/__tests__/tour-recipes.test.tsx`. Nothing in the
tours API changes, and no app has to change anything to take 0.45.

- **One tour's `TourInfo`, and the list as its map** (§9.8.1, keksdose 4): write
  `tourInfo(def, t)` and derive `tourInfos = (defs, t) => defs.map((d) => tourInfo(d, t))`,
  so the launch passes `tour: tourInfo(def, t)` instead of `tourInfos([def], t)[0]`.
- **Test "the toast shows only when awarded" through the real provider** (§9.8.2,
  keksdose 2): render the app's provider wrapper around a component that captures
  `useTour()`, `start(steps, {tour})`, then `next()` past the last step. No mock of the
  kit's `TourProvider`, no overlay clicks. The kit ships no testing helper for it:
  `@eifi1/ui-kit/testing` stays framework-free, and the recipe is a few lines.
- **A file that mocks the kit's barrel loses the setup's `toast` spy** (§9.8.3,
  keksdose 3): keep the barrel unmocked and use the setup's spy, or give the file's
  factory the setup's toast factory, or `vi.spyOn(toast, "success")` in the file.
- **One localStorage per test file** (§9.8.4, KS): a test that expects `awarded: true`
  resets its key first, `beforeEach(() => act(() => resetTourProgress(KEY)))`.
- **An old tab on a pre-0.43 bundle** (§9.8.6, K-S9): the 0.44 write guard does not cover
  an old bundle writing its envelope over the kit's record. Accepted (keksdose says so at
  `shared/state/tour-progress.ts:27-30`); no kit change, no new key.

## `formatDate`: a bare day is the day it names in every zone (N9)

`formatDate("2026-10-10", style, { timeZone })` showed 9 October for a `timeZone` west of
the device: the bare day was read as the device's local midnight, then shown in the other
zone. A bare `"YYYY-MM-DD"` is a calendar day now, formatted on its own day whatever
`timeZone` (in the options or the style) says. Timestamps are unchanged. Without a
`timeZone` nothing changes: the kit already read a bare day on the local calendar.

`TourCatalogue` / `TourCatalogueCard`'s `formatDate` prop now says what it gets: the
completion's ISO instant and the update's bare `updated.date`. An app formatter must read
the bare day on its calendar (the kit's `formatDate`, `parseIsoDate`), never through
`new Date(day)` (UTC midnight, the day before west of UTC). keksdose's and kastlan's
formatters already do.

### Per app

| App | Change |
| --- | --- |
| keksdose | Optional, test and tidy only. **Mapper:** `features/tour/tour-info.ts:21` gains a single `tourInfo(def, t, opts)` that `tourInfos` maps, and `launch` passes `tour: tourInfo(def, t)` (`features/tour/tours.tsx:683`, now `tourInfos([def], t)[0]`). **Test:** `features/tour/__tests__/app-tour-provider.test.tsx` can drop its barrel mock (`:11-23`, the `TourProvider` capture and the file's own toast spy) and drive the real `AppTourProvider` (§9.8.2), asserting on the setup's `toast.success` spy (`test/setup.ts:14-33`), with `resetTourProgress(TOUR_PROGRESS_KEY)` in `beforeEach`. The "same options object" check can stay as a plain `expect(TOUR_PROGRESS_OPTIONS)…` on the module or go. **Date:** `formatDateFor` (`shared/components/ui.tsx:164`) calls `renderDate` (`:58-80`), which already formats a date-only string in UTC: nothing to do. |
| kastlan | Nothing. `tour-catalog-page.tsx:75` formats through `shared/utils/formatters.ts:91-108`, the kit's `formatDate`, which reads a bare day right. |
| Kurvenschmiede | Nothing. `app/top-bar.test.tsx:259` already resets the key with `resetTourProgress` before its awarding test (the §9.8.4 note). |

## DataTable phone cards: a control in a cell keeps its tap (keksdose live #428)

A tap on a select, button or input inside a phone card's cell bubbled to the card and
opened the row (`onRowClick`), so a cell's picker brought up the detail sheet instead. The
card now leaves its cells' own controls alone, as the desktop `<tr>` already did: the plain
card, the card that is a link (`rowHref`), the toggle in selection mode, and the long press
into it (a press that starts on a control no longer enters the mode). Swipe was not
affected: it opens nothing.

- **keksdose:** the `onClick={(e) => e.stopPropagation()}` wrapper round the role cell
  (`features/admin/users-panel.tsx:837-851`) can go, with its comment; the column's `cell`
  passes through unchanged.
- **kastlan, Kurvenschmiede:** nothing to do. A `stopPropagation` wrapper written for the
  same leak can go the same way.

## Tour progress on the account (tours §10)

`useTourProgress` / `TourProvider`'s `progress` take an optional `account: {load, save,
adopt?}`: `load()` is the app's `GET /tours/progress`, `save(body)` its `PATCH`, each
resolving to `{completed}`. Remembered per key like `migrate` (first wins). The key is per
account, so build the options per account and keep ONE stable object per key: memoise
them in a `Map` by user id (`tourProgressFor(user)`), with `load`/`save` reading the current
token when they run, never capturing one. Pass no `account` (and a fixed key) when signed
out and in a demo: a demo would PATCH into a 403 and leave one orphan key per demo id. The
device key becomes the account's cache; writes also go
to `<storageKey>:pending` (`{synced, completed, forget}`), sent as one PATCH. A failure with
no answer (offline, 5xx, 401) keeps it; a 402 (a lapsed plan) keeps it but sends it no more
on that page (the next session or page load tries again); a 403/422 drops the whole record
and logs (one malformed id drops the valid ones with it: keep ids to `TOUR_ID_PATTERN`).
`awarded` is unchanged.
`signOutTourProgress(storageKey)` on every end of a session removes the cache only and keeps
`:pending` (no request). `resetTourProgress` with an account clears the cache only. The
pending record stays out of any "N waiting" count and sign-out guard. **Without `account`,
nothing changes from 0.44.** New: `signOutTourProgress`, types `TourProgressAccount`,
`TourProgressAdopt`, `TourProgressBody`.

| App | Change |
| --- | --- |
| keksdose | Nothing (stays on the device, §10.2.10). |
| kastlan | Table + migration (no `company_id`), store, server-kit 0.15's `tour_progress_router` with `guards=(get_current_user,)` (its `demo_read_only` covers the demo); `PATCH /api/v1/tours/progress` added to `BILLING_WRITES` (dependencies.py:203-284, beside `PATCH /auth/me` :217 and `/notifications/settings` :219): the progress is the person's, and a lapsed company would otherwise answer it 402. `TOUR_PROGRESS` (use-tours.tsx:19-31) becomes `tourProgressFor(userId)`, memoised per id: the key `kastlan.tours.completions:<id>`, `account: {load, save, adopt: {storageKey: "kastlan.tours.completions", discard: true}}`; the provider's `progress={TOUR_PROGRESS}` (tours-root.tsx:21, :158) and the test's `KEY = "kastlan.tours.completions"` (tours.test.tsx:44) follow. A demo (`endDemo`, client.ts:108-111; the rehydrate "ended" path, auth-store.ts:114-116) gets no `account` and the fixed key. `signOutTourProgress(key)` in `logout()` (features/auth/stores/auth-store.ts:68-80); `tour_progress` in `AccountService.export` (domain/services/account_service.py:218-323; account_router.py:101-102 is only the route). If `tour_completions.completed_at` stays a naive `timestamp`, the store writes `value.replace(tzinfo=None)` (the kit reads naive as UTC). In either mode: delete the device-reset registration (use-tours.tsx:26-27) and its imports (:7-8). |
| Kurvenschmiede | Table + migration, store adapter, `tour_progress_router`; `not_in_the_demo` (403 `demo_refused`) in tests/api/test_demo.py, and one API test for the 422; `tour_progress_conflict` / `tour_progress_full` in `domain/refusals.py` with rows in tests/api/test_refusals.py and seven catalogues only if test_refusals.py covers kit codes (the hook drops a 422, no reader sees them); `tourProgressOptions(userId)` (app-tours.ts:27-29) also takes `isDemo` (or the user): `account` only for a signed-in non-demo account, the key unchanged, no `adopt`, one stable options object per key; `signOutTourProgress(key)` in `clear()` (shared/state/auth-store.ts:69-73), reading the id BEFORE `set({ user: null })`; export key in account_export.py:125; the privacy line "tours" (storage-keys.ts:114) reworded in seven languages to "a record of finished tours not yet sent may stay until that person next signs in here", kind stays `never` (:150-151). |

## Admin follow-ups (admin §9)

- **`MailTestCard`** (§9.2.4): `{mailBackend, send, address, anchor?, labels?}`; `send()` is
  the app's `POST /admin/mail/test` answering `{sent, mail_backend}`. The line reads
  `mail_backend` first (`console` → "nothing was sent"), masks the address
  (`maskMailAddress`), says the limiter's line on a 429. Labels namespace `mailTestCard`
  (seven languages); default anchor `MAIL_TEST_ANCHOR` for the catalogue entry.
- **`AdminWaitingBadge`** (§9.3.4): the menu row's waiting pill for `IconButton`'s `badge`;
  name the button with `adminArea.waitingLabel(label, n)` ("Platform, 2 waiting").
- **`AdminActionLog`** (§9.1, §9.4): `group_deactivate` / `group_reactivate` worded per
  `groupNoun` ("Company deactivated"); `ADMIN_ACTION_KINDS` ends with them. A
  `group_rename` entry may carry `renamed: {from, to}` (kastlan's company rename is to log both):
  with both it reads "Company renamed from A to B"; a team rename logging `{}` reads "Team
  renamed" as before.

| App | Change |
| --- | --- |
| keksdose | `MailTestCard` in `messaging` beside the push test (admin-index.ts:128, admin-page.tsx:1123) with `anchor="admin-mail-test-card"` (kk's `admin-…-card` convention; the kit default is `admin-mail-test`), over `POST /admin/mail/test` with `MAIL_TEST_LIMIT` on the route, through `send_email(…, kind="mail_test")` (infrastructure/email.py:62). kk's guard `test_every_mail_kind_is_in_the_docstring_and_the_catalogue` (tests/unit/test_metrics.py:1097) needs `mail_test` in the `record_email` docstring (infrastructure/metrics.py:799) and in docs/observability.md §5.6; pass the literal `kind="mail_test"` or extend the scan, which may not see `kind=MAIL_TEST_KIND`. |
| kastlan | Frontend: `MailTestCard` in the platform console (superuser); `AdminWaitingBadge` on the top-bar platform button (top-bar.tsx:178-183) with `waitingLabel` as its name, deletion requests only, its count from the new `GET /platform/attention` (today it comes from the company's `/admin/attention`, top-bar.tsx:81); Activity is a NEW platform card, `AdminActionLog groupNoun="company"` on `GET /platform/actions`, mapping `detail.{from, to}` of `group_rename` to `renamed` (only admin-actions-card.tsx:19-33 `logEntry` is reused: that card is the company admin's `GET /admin/actions`, :37). Backend (kastlan's work): `POST /platform/mail/test` with `MAIL_TEST_LIMIT`, `GET /platform/attention`, `update_company` (platform_service.py:176-188, logs nothing today) logging `group_rename` (`{from, to}`) / `group_deactivate` / `group_reactivate` with `detail.via="platform"`, and the `list_actions` filter for them. |
| Kurvenschmiede | `MailTestCard` in a new "System" section, `after: "teams"` (frontend/src/features/admin/admin-catalogue.tsx:26-31). Team renames keep `detail: {}`: nothing to map. |

## Feedback counts on the attention page (admin §9.5, server-kit 0.15)

`FeedbackRepository.count_by_status() -> Mapping[FeedbackStatus, int]` (one `GROUP BY
status` in the request's scope: crash reports in, demo authors out, an erased author's
report in) and `feedback_attention(counts)` → `FeedbackAttention(to_triage,
awaiting_verdict, released_for_work)`. `to_triage` is `AdminAttention.of`'s
`feedback_waiting`; the other two are `extra` keys (`"awaiting_verdict"`,
`"released_for_work"`). `feedback.testing.check_repository(…, demo=<a demo account>)` now
checks the app's SQL: a report and a crash report count, an erased author's still counts,
a demo's does not.

| App | Change |
| --- | --- |
| keksdose | `count_by_status` in adapters/persistence/feedback_repository.py (beside `inbox`, :56), with the demo-author OUTER join; domain/services/admin_attention_service.py:95-96 (`_feedback_count` ×2, `VERDICT_STATUSES` :35) → `feedback_attention(counts)`: `feedback_waiting=to_triage`, `extra["awaiting_verdict"]`. Run `check_repository(…, demo=…)` against it. |
| kastlan | `count_by_status() -> Mapping[FeedbackStatus, int]` replaces `counts_by_status() -> dict[str, int]` (kastlan/adapters/persistence/feedback_repository.py:154; its caller feedback_router.py:117). Not on a bypass session (platform routes). |
| Kurvenschmiede | `FeedbackRepository.count_by_status()`: one `GROUP BY status` in backend/kurvenschmiede/domain/services/feedback_service.py (the class at :343), with `_not_by_a_demo()` moved in from attention_service.py:53-56. attention_service.py:66-86: `feedback_attention(counts)` gives `feedback_waiting=to_triage`, `extra["released_for_work"]` and `extra["awaiting_verdict"]`; `EXTRA_KEYS` (:47) gains `"awaiting_verdict"`, so `for_demo` keeps its shape; the two feedback `_count` calls go. Frontend: the overview's awaiting-verdict tile (href: the feedback inbox). **Badge:** the tile only; `"awaiting_verdict"` stays out of KS's badge list, which keeps `feedback_waiting` and `deletion_requests` (Marcel, 2026-10-19: awaiting a verdict is the reporter's turn). KS's check is ruff, not a type checker, so the Protocol addition breaks nothing until attention_service calls it. |

## Offline, phase 1: `@eifi1/ui-kit/offline` (local-first §1.6)

A new subpath. `@tanstack/react-query`, `@tanstack/react-query-persist-client`,
`@tanstack/query-async-storage-persister` (`^5`) and `idb-keyval` (`^6`) are **optional
peers of `/offline` only**; the main entry does not need them.

- **`createQueryPersistence({app, user, company?, shouldPersistKey?, denyRoots?,
  scrubFields?, onUnsafe?, buster, maxAge, storage?})`** → `{key, persistOptions, clear,
  leave, removeStale}`. The key is `<app>-query-cache-<user>[-<company>]`. **Mount it per
  key:** `PersistQueryClientProvider` subscribes once and ignores a changed
  `persistOptions`, so render `<PersistQueryClientProvider key={persistence.key} …>`,
  create the persistence once the account (and company) is known (`useMemo` on them), and
  mount the plain `QueryClientProvider` before sign-in. On a company switch call
  `old.leave(queryClient)` before the new key mounts, never a bare `queryClient.clear()`:
  `leave` stops every write under the old key (a throttled save already scheduled
  included) and empties memory; the old copy stays for the way back, and mounting that
  persistence again re-arms it. `clear` stops the writes the same way. Before a query is written,
  `DEFAULT_SCRUB_FIELDS` (`iban`, `qr_iban`, `default_qr_iban`, `/^signature_/`) are removed
  at any depth; the in-memory cache keeps them. Data that is not plain JSON is skipped and
  goes to `onUnsafe` (default `console.error`). On restore, denied or unsafe entries are
  dropped and paused mutations kept. A paused mutation whose variables carry a scrubbed
  field is never written (a scrubbed one would send something else) and is dropped on
  restore; with `scrubFields: []` every paused mutation is kept, as before.
  `clear(queryClient)` empties memory and deletes the key; `removeStale()` deletes the app's
  other keys older than `maxAge` (it matches `<app>-query-cache-` WITH the dash, so an
  older unsuffixed key needs one explicit delete). `isCacheSafe` is exported too.
- **`SignOutPendingDialog`** `{open, queued, waitingForPlan, onSyncNow, onSignOutAnyway,
  onDiscardWaiting?, keepsChanges, extra?, onClose, labels?}`: keksdose's words.
  `keepsChanges` picks "they stay on this device for you" or "it is the only copy". "Sync
  now" is busy while it runs, then calls `onClose` without signing out. "Discard waiting
  changes" shows only with `onDiscardWaiting` and `waitingForPlan > 0`, and signs out
  afterwards. `extra` shows only while `waitingForPlan > 0`. "Log out anyway" stays usable
  while a sync runs (the escape hatch); only a running discard holds it. Namespace
  `signOutPending`.
- **`PwaUpdatePrompt`** `{needRefresh, onReload, onDismiss?, hold?, labels?}`: keksdose's
  toast with Reload (needs a mounted `<Toaster>`). While `hold` is set it shows nothing,
  and a hold that starts takes the toast down without calling `onDismiss`. Namespace
  `pwaUpdate`.
- **`SharedComputerChoice`** `{storage?}` + `isSharedComputer()` / `setSharedComputer(on,
  {storage?})`. The choice must live as long as the session it governs: `"session"` (the
  default, `sessionStorage`) for a session that ends with the tab; `"local"` for an app whose
  refresh token is in `localStorage`, which then calls `setSharedComputer(false)` at every
  end of the session beside removing the token. `isSharedComputer()` reads both; `false`
  forgets both (`false` when storage is blocked). New type `SharedComputerStorage`.
  Namespace `sharedComputer`.

| App | Change |
| --- | --- |
| keksdose | Install nothing new (it has all four peers). `shared/state/query-client.ts:61-76, :109-165, :264-343` → `createQueryPersistence({app: "keksdose", user, shouldPersistKey, onUnsafe, buster: PERSIST_BUSTER, maxAge: PERSIST_MAX_AGE})`. `shouldPersistKey` is today's `shouldPersistQueryKey` (:134) with its roots and the `"admin"` segment; `onUnsafe` is `cacheSafeOrWarn`'s message; the query-client tests import `isCacheSafe` from `/offline`. The key becomes per user, so the old `keksdose-query-cache` is deleted once explicitly (`removeStale` does not match it: no trailing `-`). The module-scope `persistOptions` mounted at `main.tsx:149` before sign-in become per user: the plain `QueryClientProvider` while signed out, then `<PersistQueryClientProvider key={persistence.key}>` with `useMemo` on the user; the remount touches the query cache only, never the Dexie outbox the 401 path keeps. `clearPersistedQueryCache` → `persistence.clear(queryClient)`. `scrubFields: []` unless it wants the default (kk has no IBAN fields). `app/account-menu.tsx:247-317` → `SignOutPendingDialog keepsChanges={false}` with `queued` (pending + blocked), `onSyncNow = runSync`, `onDiscardWaiting = discardWaitingChanges`, `extra = billing.waitingChanges(waitingForPlan)` (the dialog hides it at 0), `onSignOutAnyway = logOut`. `app/pwa-update-prompt.tsx:9-28` → `PwaUpdatePrompt` over `useRegisterSW`, with `hold` while a tour runs; its tests need the real `<Toaster/>` (the kit's toast); the `offlineReady` toast (:30-34) stays the app's. The `nav.logout_queued_*`, `nav.logout_sync_now`, `nav.logout_syncing`, `nav.logout_anyway` and `pwa.updateAvailable`/`pwa.reload` keys can go, with the assertions on them in app/__tests__/top-bar.test.tsx:308-323 and features/billing/__tests__/waiting-changes.test.tsx:64. If kk takes the kit's `SyncChange`, narrow `id: uuid.UUID` (sync_service.py:1124 keys on UUIDs; a dict-validated id stays `str`), expect a `check:openapi` diff (`knowledge`/`updated_at` null on pulled rows, `rejections`), and note that `merge_lww` clamps future stamps and lets a stamp-less upsert lose to a stored future stamp (kk reads `data["updated_at"]`, :1191, unclamped). No shared-computer choice (kk keeps its wipe). |
| kastlan | Add the persist client, the async-storage persister and idb-keyval (`@tanstack/react-query` is there, ^5.104). `frontend/src/app/providers.tsx:75` → `<PersistQueryClientProvider key={persistence.key}>` with `createQueryPersistence({app: "kastlan", user, company, denyRoots, buster: __APP_VERSION__, maxAge: 24h})`, `denyRoots` derived from frontend/src/shared/api/query-keys.ts (the personal and operator roots: `platform`, `billing`, `translations`, `assistant`, `reports`, `users`, `invitations`, `emails`, the admin-actions/attention, dev-switch, auth-sessions, passkeys and operational-report roots as named there); bank accounts sit inside `["contacts","detail",id]` and are covered by the scrub. kastlan's offline writes go through Dexie, so it sets `persistOptions.dehydrateOptions.shouldDehydrateMutation = () => false` (the kit already keeps an IBAN-carrying mutation off the disk). Keep the plain `QueryClientProvider` when `isSharedComputer()`; set `gcTime >= maxAge`. The company switch (use-auth.ts:24-30, :78-83 → `startSession`) calls `persistence.leave(queryClient)` instead of `queryClient.clear()` (also auth-store.ts:164) before `signIn`, and the new key remounts the provider. `logout()` (features/auth/stores/auth-store.ts:68-80) calls `persistence.clear(queryClient)`; `removeStale()` at sign-in. `SharedComputerChoice storage="local"` on the sign-in form (features/auth/components/auth-page.tsx), since the refresh token is in `localStorage` (shared/api/client.ts:37); client.ts calls `setSharedComputer(false)` wherever it removes the token. `SignOutPendingDialog keepsChanges` only on the explicit callers (top-bar.tsx:104, sessions-card.tsx:38), with `queued` from the handover outbox; never in `onEnded` (auth-store.ts:170-174), and the tour `:pending` record is not counted. `frontend/vite.config.ts:31` `registerType: "prompt"` (drop `clientsClaim`, :62; `injectRegister: "auto"` today, :31-32) + `PwaUpdatePrompt` over a `useRegisterSW` call (`virtual:pwa-register/react` and its types) with `hold` while a handover is open or a tour runs. Online-only actions say "Needs a connection" offline (local-first D4). |
| Kurvenschmiede | Nothing (online-only, local-first §1.4). |

## Sync on the server: server-kit 0.15 `sync` (local-first §1.6, P2)

`SyncChange` / `SyncRequest` / `SyncResponse` / `SyncRefusal` / `SyncRejection`, the merge
(`clamp_stamp`, `merge_lww`, `merge_delete`), paging, the knowledge-counter port and, with
the `sync` extra, `install_sync_stamping`, `tombstone`, `bulk_tombstone`, `bulk_restamp`
and the tombstone filter. `SyncColumns` is optional: an app keeps its own column mixin and
takes the hook, the merge and the schemas. The hook checks each model's mapper: a synced
model **without `updated_at`** gets its knowledge and no stamp (and no LWW: `merge_lww(None,
…)` always lets the upsert win, and a tombstone cannot hold off an older upsert), and a
**naive** `timestamp` column is written naive UTC (the hook's now, an aware stamp the writer
set, `tombstone`, the bulk statements). `refused` is only ever `billing_read_only` for the
whole push; a create past the limit is a per-change `SyncRejection` (`plan_limit`).

| App | Change |
| --- | --- |
| keksdose | Nothing required (see its offline row for the notes if it takes `SyncChange` / `merge_lww`). |
| kastlan | `install_sync_stamping(Session, counter=…, tenant_of=lambda _o: 1, is_synced=lambda o: isinstance(o, SyncMixin))`, the counter's `bump` being `lambda s, _t: next_knowledge(s)` (one database-wide counter), and REMOVE its own `before_flush` listener (kastlan/infrastructure/sync.py:79-99), or the counter is bumped N+1 times per flush. Add `updated_at` by migration to at least the handover children (HandoverRoom, HandoverDefect, HandoverPhoto) so D2 holds there; the other eight models without it (DocumentLink, ListingImage, InvoiceLineItem, PaymentAllocation, DunningConfig, BudgetLineItem, JournalEntryLine, UnitDistributionValue) are stamped without it. The delete and revive paths (sync_service.py:326, :353-355) move to `tombstone` + `merge_lww`; the losing upsert is appended to the reply, since `collect_delta` (:237) returns only rows past the cursor. The `SyncChange` subclass keeps `data: dict = Field(default_factory=dict)` (`change.get("data", {})` at :331 would meet the kit's `None`). Paging later: `id_of` must be `sync_uuid` (ids compare as text). Dev only: pin the engine's `server_settings={"timezone": "UTC"}` (local Postgres runs Europe/Berlin, so `func.now()` writes Berlin time into naive columns read as UTC). |
| Kurvenschmiede | Nothing (online-only). |

## The pre-push commit check (Eifi1/shared-workflows v1.3.0)

Every commit a push would send must pass the shared Conventional Commits check, header ≤ 100
characters (keksdose hit it only in CI on 2026-10-18). Vendor
`actions/commit-check/check-commit-msg.cjs` and `check-pushed-commits.cjs` at v1.3.0 into
`scripts/`, and call it from the pre-push hook with git's stdin:
`node scripts/check-pushed-commits.cjs "$1" || exit 1` (pipe the captured stdin to it if the
hook reads stdin itself).

| App | Change |
| --- | --- |
| keksdose | Replace its own `scripts/check-pushed-commits.cjs` and `check-commit-msg.cjs` with the shared v1.3.0 files. One difference: an unknown remote sha now falls back to the default branch instead of failing. |
| kastlan | Add both files and the hook line in `.husky/pre-push`. |
| Kurvenschmiede | Add both files and the hook line (KS has no commit-msg hook, so this is its first local commit check). |
