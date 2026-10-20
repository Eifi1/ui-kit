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
diff: `TypeSwitches.push`, `InboxItem.company`, the auth zone field (`device_timezone` on
`UserResponse`, `ProfileUpdate` and `RegisterRequest`; no `timezone`: the zone is automatic
only, notifications §10.3 amended 2026-10-20), `SyncRequest.client_now`
and the new `legacy_rework_append` code.

## 0.46.1: every actions column has a visible "Actions" heading (keksdose dev#598 rework)

Marcel, 2026-10-20: a VISIBLE "Actions" heading on every table with an actions column. In
0.46.0 the kit's actions columns named themselves for a screen reader only; the feedback
inbox's new desktop column was the one in keksdose that showed nothing (keksdose B1). From
0.46.1 each of them shows the word on a plain bump, end-aligned over the buttons:

- **`DataTable rowActions`**: the provider's `dataTable.actions`. New prop
  **`rowActionsHeader?: ReactNode | false`**.
- **The column derived from `mobileSwipeActions`**: the same word. New option
  **`desktopSwipeActions: { header?: ReactNode | false }`**.
- **`rowActionsColumn`**: `headerText`, else the provider's `rowActions.actions`. New option
  **`header?: ReactNode | false`** (`column: { header }` still wins, as before).
- **`TranslationReviewPanel`**: its actions column (with `swipe`) and its approve column
  (without) both say `rowActions.actions`.
- **`userRosterColumns` / `useUserRosterColumns`**: the menu column says `userRoster.actions`.
  New option **`actionsHeader?: ReactNode | false`**.

Each option: a node replaces the word; **`false` keeps the 0.46.0 heading** (the word in an
`sr-only` span, so the column keeps its name for a screen reader). No new label keys: the
words are the ones the columns were already named by, in all seven languages.

Width: the heading is one word under the header row's `whitespace-nowrap`, so the column
(still `w-px`, hugging its content) is as wide as the wider of the word and the buttons.
Beside two icon buttons that is the same width; beside a single icon or the roster's "⋯" it
grows by the word's width less one button (about 30 px for "Actions", 45 px for
"Műveletek" at Normal). The column stays hidden on the phone where it was
(`mobileHidden`); a `rowActionsColumn` kept on the phone card now labels its line too.

**`swipePlanRowActions`** is public (`/data-table` and the barrel; keksdose N3): a swipe
plan as `RowActions`' actions, the derivation the desktop column uses, for an app's own
actions column built from the same plan.

| App | Tables that gain the heading on the bump |
| --- | --- |
| keksdose | The feedback inbox (features/feedback/feedback-page.tsx:266-286, the kit's column from `mobileSwipeActions`); translations (features/translations/translations-page.tsx:291, the panel's actions column); the users roster (features/admin/users-panel.tsx:803-809, `actions: rowActions`). `swipeActionsColumn` (shared/components/swipe-row-actions.tsx:130-152) already shows its header by overriding `header` (:151); it now gets the kit's `text-end` head too, so its heading moves over the buttons. Optional: drop the override and its comment (:126-128) and keep `headerText`, the kit shows that word now. budget-table.test.tsx:157 (no `sr-only` under the budget table's actions heading) is the app's own column, unchanged. Accounts (accounts-page.tsx:906, `desktopSwipeActions={false}`): no kit column, unchanged. |
| kastlan | The feedback inbox (features/feedback/pages/feedback-page.tsx:179-185); every `ResourceListPage` with actions (shared/components/data-table/resource-list-page.tsx:226, `rowActions`); meters (features/meters/pages/meters-page.tsx:41, `rowActions`); each `rowActionsColumn`: journal entries (features/accounting/components/journal-entry-columns.tsx:134), leases (features/tenancy/components/lease-columns.tsx:219), invoices (features/finance/pages/invoice-list-page.tsx:103), dunning (features/finance/pages/dunning-list-page.tsx:125), service charges (features/service-charges/pages/service-charges-list-page.tsx:46), distribution keys (features/service-charges/components/distribution-key-columns.tsx:79), signup invitations (features/platform/pages/platform-signup-invitations-page.tsx:113, which shows its own `signups.col.actions`); translations (features/translations/pages/translations-page.tsx:234); the users roster (features/settings/components/users-panel.tsx:337-339). The `rowActionsColumn` calls show their `headerText`, `common:actions.title`. |
| Kurvenschmiede | The feedback inbox (features/feedback/feedback-page.tsx:221-229); translations (features/translations/translations-page.tsx:276-288, the panel's actions column); the users roster (features/admin/users-panel.tsx:414-416). |

To keep the old hidden heading on one table, pass `false` at that call site and say why:
`rowActionsHeader={false}` on a `DataTable` with `rowActions`, `desktopSwipeActions={{ …,
header: false }}` on one with `mobileSwipeActions`, `header: false` to `rowActionsColumn`,
`actionsHeader: false` to `useUserRosterColumns`. `TranslationReviewPanel` has no option:
its column follows the rule. A test that asserts the `sr-only` class on an actions heading
(the kit's own did, row-actions.layout.test.tsx) fails on the bump; one that finds the
column header by its name (`getByRole("columnheader", { name: "Actions" })`) still passes.

### server-kit 0.16.1: the admin row drops the device zone; the profile PATCH drops an unknown zone (KS round 048)

Two fixes on a plain wheel bump (0.16.0 → 0.16.1), nothing renamed:

- **`AdminUserRow` no longer carries `device_timezone`** (KS 1). It inherited the field from
  `UserResponse`, so the roster answered where each person's device last was — their own data,
  a location signal the roster has no use for. From 0.16.1 the row reads an account that has
  the field and never answers it (not in the dump, not in the schema). `UserResponse`, `/auth/me`
  and the export keep it. `AdminUserRow` was the only admin-facing model built on `UserResponse`.
- **`PATCH /auth/me` drops an unknown zone, as sign-up does** (KS 2, kastlan N1). A browser
  whose tzdata is newer than the server's names a zone `zoneinfo` doesn't know. In 0.16.0
  `ProfileUpdate.device_timezone` refused it with a 422, so `useDeviceZoneReport` failed on every
  start, and silently, because it swallows the error. From 0.16.1 such a name, or any value that
  is not a name (`42`, `""`, longer than 64), is **dropped**: left unset, so `apply_zone_update`
  writes nothing and the rest of the PATCH still applies (200). This mirrors
  `RegisterRequest`. An explicit `null` stays a 422. `ZoneName` itself is unchanged, so an
  app's own field typed with it still refuses an unknown zone.

| App | Touch points |
| --- | --- |
| keksdose | Nothing to change: the 0.16 adoption hasn't landed on main yet. Adopt 0.16.1 directly, and don't write a 422 test for an unknown zone on `PATCH /auth/me`. |
| kastlan | tests/api/test_device_timezone.py:24-29 `test_an_unknown_zone_is_refused_and_the_stored_one_kept`: `Mars/Olympus` now answers 200 (not 422), and the stored `Europe/Zurich` is kept. Rename the test and fix the module docstring (:3, "PATCH an unknown zone is a 422"). `KastlanAdminUserRow` (domain/schemas/user_admin.py:29) loses `device_timezone` with the kit's row, so there is nothing to code. |
| Kurvenschmiede | backend/tests/api/test_account.py:291-293 (`test_the_device_zone_is_a_report_never_a_pick`, from :281): `Mars/Olympus_Mons` answers 200, and the stored `America/New_York` stays. Reword the docstring (:283-285, "is the kit's 422"). The admin row (backend/kurvenschmiede/domain/schemas/admin.py:74-77) drops its always-null `device_timezone` and the comment. The frontend's `device_timezone?` (frontend/src/shared/types/admin.ts:41) and `test_admin_schemas` follow. **Two 0.16 touch points the 0.16.0 rows missed** (KS 3): (a) vulture: `AdminAlerts.filed` is called only through the port, so it goes in backend/.vulture-baseline:37 (with its comment at :12-14, beside `completions` at :38). (b) backend/tests/api/test_notifications.py: the 422 case `{"types": {}, "timezone": …}` answers 200 in 0.16, because `NotificationSettingsUpdate` drops `timezone` for this release. It is replaced by an unknown field, `{"types": {}, "digest": "daily"}` (:166, docstring :173-175), plus a `push` refusal (`push_channel=False`, :165). |

### 0.46.1 / 0.16.1: kastlan's 0.46 adoption (round 048, N1–N9)

All additive, on a plain bump; nothing in 0.46.0 code stops compiling.

- **`SyncStep<D extends SyncDb = SyncDb>`** (N2). `SyncEngineOptions<D>`, `createSyncEngine<D>`
  and `syncEngineFor<D>` take the app's database type from `db: D`, and `steps` are
  `SyncStep<D>[]`, so a step's `run(db)` / `counts(db)` reach the app's own tables without a
  cast. The default keeps an untyped `SyncStep` as before.
- **`useSyncStatus(null)`** (N3, docstring): with no engine, `status.online` follows
  `navigator.onLine` and its events, and an app may lean on it for its offline lock.
- **`rowByPk(db, entity, pk)` and `SYNC_DB_PK_INDEX`** (N4, `/sync`). The `[entity+pk]` index
  is **opt-in**, not added to `SYNC_DB_STORES`: changing the engine's own schema would change
  version 1 of every app's database under the versions the app declares (kastlan's devices are
  on its v2), so an app adds it in a version of its own:
  `upgrades: [..., { version: 3, stores: SYNC_DB_PK_INDEX }]` (a database new to the devices:
  `extraStores: { ...SYNC_DB_PK_INDEX }`). `rowByPk` uses the index when the database has it and
  scans the entity's rows otherwise, so it works before and after the upgrade.
- **`uuid5(namespace, name): Promise<string>`** (N5, `/sync` and `/offline`, beside
  `stampAfter`): RFC 4122 v5 on `crypto.subtle` SHA-1, equal to Python's
  `uuid.uuid5(uuid.UUID(namespace), name)` (tested against Python's values, a non-ASCII name
  included). Lower case, hyphenated; a namespace that is not a UUID is a `TypeError`.
- **`InboxItem.company_id: int | str | None`** (N7, server-kit 0.16.1) and
  **`NotificationInboxItem.company_id?: number | string | null`** (ui-kit): the row's company by
  id beside its name, so the bell's and the inbox's `onOpen` switch to it exactly. The kit's
  `inbox_router` validates rows into `InboxItem`, so an `InboxStore.page` that sets it now
  reaches the wire. `InMemoryInboxStore` answers its rows' `company_id`. `NewInboxItem` is
  unchanged (`company_id: int | None`).
- **Docs:** feedback/alerts.py says kastlan awaits the alert inside `filed`, after the commit
  (N8); D16 asks for each queued write's REST twin, or a copy-only page (N6); notifications
  §10.1's kastlan row keeps the poller on its live counts (N9).

| App | Touch points |
| --- | --- |
| kastlan | **N1:** done in server-kit 0.16.1 (the profile PATCH drops an unknown zone, above); flip tests/api/test_device_timezone.py's 422 test. **N2:** drop the two `db as HandoverDb` casts in frontend/src/features/handover/offline/sync.ts: type the step `SyncStep<HandoverDb>` (the engine's `db` is a `HandoverDb` already). **N3:** nothing; app/app-layout.tsx's offline write lock reading `status.online` is the documented use. **N4:** optional; to use the index add `{ version: 3, stores: SYNC_DB_PK_INDEX }` to the database's `upgrades` (after its v2 `scope` step), then replace `copyRowByPk` (frontend/src/shared/offline/device-copy.ts) with the kit's `rowByPk`; without the version step `rowByPk` scans, as `copyRowByPk` does today. **N5:** `voteId` (frontend/src/features/owner-meetings/offline/meeting-copy.ts) calls the kit's `uuid5(namespace, "<item>:<invitation>")`; meeting.test.ts's pin to the server's `vote_id` stays. **N6:** nothing; `PATCH /work-orders/{id}` and the copy-only schedules page are what D16 now asks. **N7:** the `InboxStore.page` sets `company_id` beside `company`, and the bell's `onOpen` switches by `item.company_id` instead of matching the name among the person's companies; the frontend's inbox type follows. **N8:** nothing (the docstring now says what kastlan does). **N9:** nothing; the poller keeps its live `invoices_overdue` count (contract amended). **Deviation, noted:** §2.5's maintenance row lists unit defects (create, `status`, `description`) as offline writes; kastlan's D16 build offers requests, work orders (status, costs, completion day), meter readings and contact fields offline, not unit-defect edits (the handover's defects queue as before). |
| keksdose | Nothing required. `company_id` stays `None` on its rows. |
| Kurvenschmiede | Nothing required. |

### 0.46.1 / 0.16.1: keksdose's 0.46 adoption (round 048, S1, S2, N1–N10)

All additive, on a plain bump. Already in 0.46.1 above: the visible "Actions" heading (B1), the
FeedbackRowDetail row (N1: kk's feedback-row-link.test.tsx:114-129 stayed green on the bump,
the URL cell's sr-only "Open page" kept it) and `swipePlanRowActions` (N3).

- **`parse_push_replace(body)` / `parse_push_body(model, body)`** (S1, server-kit
  `notifications`): FastAPI's own 422 echoes each error's `input`, so a bad
  `POST /notifications/devices/replace` body came back with `old_auth`. Take the body untyped
  (`body: Annotated[Any, Body()]`) and parse it: a bad one raises **`PushBodyInvalidError`**
  (422, `push_body_invalid`, `fields: ["old_auth", …]`, no value, no chained
  `ValidationError`), answered by `install_contract_error_handlers`. The same holds for every
  kit model with a secret in a body: `PushSubscriptionIn` (`keys.auth`, `p256dh`) and
  `PushUnregisterIn` (the endpoint, a capability) through `parse_push_body`. The unsubscribe
  token rides the path as plain `str`: give it no pattern or length, so a bad one reaches
  `read_unsubscribe_token`'s 400, which echoes nothing.
- **The unsubscribe secret is a dedicated one** (S2): unsubscribe.py's docstrings said "derived
  from the JWT secret, nothing new provisioned"; they now say what this guide says — pass a
  dedicated unsubscribe secret (keksdose `KEKSDOSE_UNSUBSCRIBE_SECRET`; none means no
  notification mail). The code always derived the key from whatever the app passes.
- **`NotificationInbox describeError(error, action)`** (N4): `"read"`, `"readAll"` or
  `"clear"`; type `NotificationInboxAction`. An existing one-argument function still fits.
- **`labels.timeZone` is `@deprecated 0.46`** (N5; removed in 0.47): only the deprecated
  `TimeZoneSelect` reads it.
- **`deviceTimeZone()` lives in notifications/device-zone-report** (N6), beside
  `useDeviceZoneReport`; the barrel name is unchanged, and the deprecated time-zone-select
  module re-exports it until 0.47. Sign-up keeps calling it.
- **`FlushPort.still_wanted(…, *, now=None)`** (N8, server-kit): a port whose `still_wanted`
  takes a keyword `now` gets the flush's `now` (quiet hours judged at the claimed moment, for a
  retried or late tick and in tests); a port without it is called as before.
  `RecordingFlushPort.checked_at` records it.
- **`useFeedbackNotificationTypesLabels(labels?)`** (N9): the `feedbackNotificationTypes`
  words resolved (English, provider, `labels`), so an app heads its own group with
  `adminGroup`. The generic `useKitLabels` stays internal: its key is the kit's whole
  `UiKitLabels` namespace map, and the kit's pattern is one hook per namespace
  (`useAdminAreaLabels`, `useSettingsLabels`).
- **Guide notes** (N2, N7, N10): above, in the `AmountInput` section, the Notifications
  section's keksdose row and its tick.
- **Behaviour the guide didn't name:** with `plan_delivery`, a deactivated or demo account no
  longer gets **inbox rows** either (notifications §3.3 step 1: `active` gates every channel,
  the inbox included), not only push and mail. A test that expected a demo's inbox row fails.

| App | Touch points |
| --- | --- |
| keksdose | **S1:** the replace route (adapters/api/notifications_router.py, beside `/devices/unregister` :87) takes `body: Annotated[Any, Body()]` and calls `parse_push_replace(body)`; the hand parse goes, the request-log scrub of `old_auth` stays. Optionally the register and unregister routes through `parse_push_body`. **S2:** nothing (`KEKSDOSE_UNSUBSCRIBE_SECRET` is what the kit now says). **N4:** `describeError={(_e, action) => action === "clear" ? t("notifications.inbox_clear_failed") : undefined}`, and the last-action ref goes. **N6:** nothing (the barrel import is unchanged). **N8:** optional: the port's `still_wanted` takes `*, now: datetime | None = None` and the constructor's `now` goes. **N9:** `useFeedbackNotificationTypesLabels().adminGroup` for the admin group; `notifications.group_admin` can go from the app's seven catalogues. **N2, N7, N10, the inbox note:** nothing to code; kk already tests the deactivated/demo case. |
| kastlan | Nothing required (no push, no queue). `describeError`, if it passes one, may use `action`. |
| Kurvenschmiede | Nothing required. |

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

### TranslationReviewPanel: an open row swipes (keksdose live #416)

An open row's top line swipes as a closed one does, as DataTable's open card has since 0.40
(Marcel: "faster than scrolling down to the buttons"). A swipe acts on the stored string and
leaves the editor open with its draft; "Needs a change" puts the cursor back in the wording.
No swipe while the editor's own write is out.

| App | Change |
| --- | --- |
| keksdose | Nothing to do but bump. Optional: the comment at features/translations/translations-page.tsx:307-309 ("An OPEN card does not swipe") is out of date. |
| kastlan, Kurvenschmiede | Nothing to do but bump. |

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

## keksdose run 81: the tour's number pad, one page link, the caret, A− / A+

### Tours: a step on a field is usable (`interactive`, `awaitInput`; keksdose live #436)

A step's overlay sat at `z-[60]`, over every kit layer, so an `AmountInput` it spotlit
opened its number pad (`z-50`) under the shields: on a phone nothing could be typed.
`TourStep.interactive: true` drops the overlay to `z-[45]` (still over the top bar and the
page, under every `z-50` layer the target opens: number pad, popovers, select menus, picker
sheets); keys pressed in the target or its layers are theirs, and the overlay is not
`aria-modal` then (`data-tour-interactive` marks it). `awaitInput: true` implies it and
advances once the target's field holds a new value when focus leaves it (the pad's Done)
or Enter is pressed — `awaitClick` for a field; the card shows `tour.awaitInputHint`
(new, seven languages) instead of Next. A picker whose value is no field's (the kit's
`Select`) calls `useTour().next()` from its `onChange`. Checked in Chromium (Pixel 7):
the pad's keys are the topmost element under the tour, "42" + Done advances.

| App | Change |
| --- | --- |
| keksdose | features/tour/tours.tsx:493 (`txn-amount`, the create-transaction tour) and features/tour/feature-tours.tsx:767 (foreign amount): add `interactive: true`, or `awaitInput: true` if typing the amount should be the step's action (then the body says "enter an amount"). |
| kastlan, Kurvenschmiede | Optional: any step on a field, select or popover trigger. |

### FeedbackRowDetail: no "Open page" button (keksdose live #449)

The Replies section's "Open page" button repeated the URL section's link a section above it,
same href; it is gone (keksdose's call; dropped rather than put behind a `showOpenPage`
prop, since the URL link is there whenever the button was — both read the same
`context` — so no app has a case for two). `feedbackDetail.openPage` is deprecated, removed
in 0.47. This shows on a plain bump.

| App | Change |
| --- | --- |
| keksdose | Nothing breaks (keksdose N1; an earlier draft of this guide said features/feedback/__tests__/feedback-row-link.test.tsx:114-129 would): the test finds links named "Open page", and the URL column's cell link carries that name in `sr-only` text, so it stays green without the button. Optional: point it at the URL section's link (named by its path, `/budget`) and assert the button is gone, as keksdose did. |
| kastlan, Kurvenschmiede | Nothing, unless a test looks for the button. Drop an `openPage` override from `feedbackDetail` labels when convenient. |

### Tabs: the `overflowCue` caret at every width (keksdose live #410)

The caret wrapper's `md:hidden` is gone: it renders only while the strip overflows, and a
wide strip overflows from `md` up too.

| App | Change |
| --- | --- |
| keksdose | features/reports/reports-page.tsx:55-58 `REPORT_TABS_CUE_EVERY_WIDTH` and its use at :373 can go; reports-tab-picker.test.tsx:183 then asserts the caret without the class. |
| kastlan, Kurvenschmiede | Nothing: a strip with `overflowCue` that overflows on a laptop now shows the caret there too. |

### `AccountMenuTextSize`: A− / A+ beside the language (keksdose live #426)

From `@eifi1/ui-kit` and `/shell`: `<AccountMenuTextSize value={textSize} onPick={pick} />`
in `TopBarActionMenu`'s `children`, after `AccountMenuLanguage`. The row names the size in
force (a polite live region) and steps Normal → Large → Extra large; A− is disabled at
Normal, A+ at Extra large; the menu stays open. `value` defaults to the size on `<html>`;
`onPick` is the app's (`useAccountAppearance`'s `pickTextSize`, with `appearance.saveFailed`
as its toast). New words `appearance.textSmaller` / `textLarger`, seven languages.

| App | Change |
| --- | --- |
| keksdose | app/account-menu.tsx:67-119 `TextSizeRow` → `<AccountMenuTextSize value={textSize} onPick={(s) => void pickTextSize(s).catch(() => toast.error(labels.saveFailed))} />` at :216; drop the `AArrowDown`/`AArrowUp`/`ALargeSmall`, `IconButton`, `TEXT_SIZES` imports (:6-8, :24, :28) if unused, and `topbar.text_smaller` / `text_larger` from the four catalogues. app/__tests__/top-bar.test.tsx:156-177 then finds the rows by the kit's words ("Smaller text" / "Larger text"). |
| kastlan, Kurvenschmiede | Optional: the quick switch in their account menus. |

### `AmountInput` and `NumberInput` take `help` (keksdose live #446)

Nothing new in the kit: both have taken `help` since 0.36 (`FieldHelpProps`, the "?" on the
label line named "About “<label>”", the hint as the caption), and the field-help sweep
(src/components/__tests__/field-help.test.tsx:169-173) covers them, `MoneyField` and
`NumberField` too.

| App | Change |
| --- | --- |
| keksdose | (keksdose N2: visually a no-op, since a `HelpPopover` passed as `hint` already rode the label line through `useFieldHint`'s `labelHint`; the change only moves it to the documented prop.) features/transactions/fx-estimate-row.tsx:123 passes its HelpPopover through `hint`: make it `help={<HelpPopover label={t("transactions.fx_help_label")}>{hint}</HelpPopover>}`, or `help={hint}` for the kit's "About “<label>”" name (then `transactions.fx_help_label` can go). |

## server-kit 0.16.0

Install the wheel by URL, pinned by hash (0.16.0, not 0.15.1: it adds names, which server-kit's
patches never do; and it removes the legacy rework append, BREAKING for a tab open across
the deploy, see its section):

```
eifi1-server-kit @ https://github.com/Eifi1/server-kit/releases/download/v0.16.0/eifi1_server_kit-0.16.0-py3-none-any.whl
sha256: bda3430942b6ef465f5aa38c1355a506e6477f39c649551213c85d725e3297ae
```

Four changes show on the bump itself:

- **The legacy rework append is a 422** (`code: "legacy_rework_append"`): each app has a
  backend test that still expects the conversion (its section, further down, names it).
- **The tours export spells `completed_at` as the wire does:** `2026-10-18T07:00:00Z`, not
  `isoformat()`'s `+00:00` (`TourProgressService.export`). A test that pins the export's value
  fails until it is re-pinned.
- **`test_mail_message` returns `HtmlMailMessage`**, a `MailMessage` whose `html` is a `str`.
- **The notification settings answer gains `push`** (`TypeSwitches.push`): `null` where the
  registry says `push_channel=False` (kastlan, KS), else answered from the stored switch, or
  the type's default where none is stored. An app that stores one switch per type must
  land its channel migration IN the bump, not after it (keksdose below).

| App | Change |
| --- | --- |
| keksdose | Drop `message.html or ""` and its comment after `test_mail_message` (backend/keksdose/adapters/api/admin_router.py:495-496). No tours export (tours stay on the device). **The channel migration lands in the bump's commit** (keksdose B1): with `push_channel=True` (the default) `resolve_switches` answers `push` from the type's DEFAULT, because `_stored` sets only `app=row.enabled` (domain/services/notification_preferences_service.py:49-50), so a type turned off still shows Push on; and the 0.46 card's Push click sends `{push}`, which `patch_switches` drops (it writes only `row.enabled = switches.app`, :84-86). So in the same commit: `notification_preferences` gains `app` and `push` (`migrate_enabled_to_channels`: app = push = enabled, a missing row stays missing), `_stored` reads both, `patch_switches` writes both, and **delivery splits by channel** (keksdose B3-B1): the gate `eligible_user_ids` (domain/services/notification_preferences_service.py:92-110) reads only `enabled` and blocks the inbox row AND the push together, for about ten callers (push_notifications.py:433, 478, 532, 627, 654, 814, 1037, 1282, 1349); it splits into an `app` gate (the inbox row) and a `push` gate (`send_to_user_detailed`); `explicitly_enabled_user_ids` (:113-127, `enabled IS TRUE`; the digest :1084 and the announcements :1168, :1207) starts the opt-in broadcasts from `app` OR `push`; `_deliver_to_user` (push_notifications.py:368-412) always writes the inbox row, then pushes, and must handle a push without a row (`PushData.inbox=False`) and a row without a push. **Every test the bump breaks** (keksdose B3-S1): tests/api/test_notification_settings.py:18-30 (`_DEFAULT_TYPES`, no `"push"`), :103 (`{"digest": {"app": True, "push": True}}` expects a 422, valid once `push_channel=True`); the zone: test_notification_settings.py:36 (`_DEFAULT`'s `"timezone"`), :79-91 (the answer has no `timezone`), :105 (`{"timezone": "Mars/Olympus"}` is ignored in 0.16, a 200, no longer a 422); tests/api/test_push_preferences.py:44, :106-114, :137 (the shim ignores a `timezone` in 0.16: a 200), :190-193; tests/unit/test_notification_preferences_service.py:171-182 (`row.timezone`). |
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
| kastlan | Bump to the 0.16.0 wheel, then log the names again. **Validate a new name by the kit's rule** (kastlan S1): `PlatformCompanyUpdate.name` (domain/schemas/platform.py:37, a bare `str \| None`: a rename to `"  "` succeeds today) and `CompanySettingsUpdate.name` (domain/schemas/property.py:45, `min_length=1` lets `"   "`, a tab or a soft hyphen through) each get a `field_validator` on `group_name_problem` → 422. The log no longer 500s either way; this keeps bad names out of the table. In domain/services/platform_service.py:195-198, pass `detail={**VIA_PLATFORM, "from": company.name, "to": data.name}` before the name is set, and drop the comment at :196-197. In adapters/api/company_router.py:43-46, pass `detail={"from": renamed_from, "to": company.name}` and drop the comment at :44-45. The frontend already maps them: settings/components/admin-actions-card.tsx:37 turns `detail.from` / `detail.to` into the entry's `renamed`, so the row reads "Company renamed from A to B". Add a test that records a rename with spaced names, e.g. "Test AG" → "Test AG Bern". **Two tests pin the nameless detail and change with it** (kastlan 2): tests/api/test_platform_follow_ups.py:41 (`{"via": "platform"}`) and :53 (`{}`) gain `from` / `to`. |
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
| keksdose | **The bump fails a backend test**: tests/api/test_feedback.py:186-225 (`test_the_author_can_rework_a_settled_entry_by_appending_to_it`) expects 200 and a rework entry; it becomes the 422 with `code == "legacy_rework_append"` and an unchanged row. So does :309-350 (`test_an_admins_rework_reopens_the_entry_without_being_told_to`, an ADMIN's append from NEEDS_LIVE_TEST: `plan_update` refuses an admin's too, before any write); :353 and :470 hold, and the FE sends no appends (its only rework call is `onRework`, feedback-page.tsx:244). The PWA keeps an old bundle for days (`registerType: "prompt"`), so expect the toast until its users accept the update prompt. |
| kastlan | **The bump fails two backend tests**: tests/api/test_feedback_workflow.py:391 (`test_author_rework_append_reopens_server_side`, five parametrized statuses) and :410 (`test_admin_rework_append_goes_to_rework`) → the 422 (`code == "legacy_rework_append"`, the row unchanged); :422 (an admin's note with a status) and :433 (an append while OPEN stays a body edit) hold. Update the module docstring (:9-10, "still turned into such an entry for one release") and CLAUDE.md, which says the same twice: :86 ("an old client's body append is still converted for one release") and the PATCH row at :198 → "an old client's rework append is a 422 (`legacy_rework_append`)". **Deploying straight from 0.11** (production): a tab open across the deploy gets the 422 on a rework until it reloads. Zero risk: deploy a release on a ≤ 0.15 wheel first, then this one. |
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
  keksdose runs no vulture. kastlan does (package.json:26, `check:deadcode:backend`), at
  `--min-confidence 80`, where an unused method (60 %) is not reported, so it needs no baseline
  line for this (kastlan 2).

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
| Kurvenschmiede | features/feedback/feedback-page.tsx:220-224: the same line as kastlan, `name: (row) => row.title` (status cell from `useFeedbackColumns`, :153). Translations (translations-page.tsx:276-288) passes `swipe` and `onClear`, so its approve column (key `approve`) becomes the actions column (key `actions`) with Approve, "Flag for a change…" / "Add a translation…" and Clear, as in kastlan (an earlier draft said it passed no `swipe`). |

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
| keksdose | frontend/src/sw.ts: `import { handlePushSubscriptionChange } from "@eifi1/ui-kit/push-worker"` (the worker-safe subpath, never the barrel, which reaches React), `handlePushSubscriptionChange(self, { pushKey, replace })` beside the `push` listener (:229), both requests with plain `fetch` (the worker has no token). The checkup card (features/auth/push-checkup-card.tsx:196) listens only for the window event, but a rotation arrives as the worker's `postMessage`: relay it to `PUSH_SUBSCRIPTION_CHANGED` in app/use-sw-messages.ts (keksdose N3). Backend: the route beside `POST /notifications/devices/unregister` (adapters/api/notifications_router.py:87), on `PushReplaceIn`, rate-limited by the per-instance `SlidingWindowRateLimiter` as the other unauthenticated routes (auth_router.py:82). §10.6's rules: **`push_subscriptions` is FORCE RLS and the route has no session**, so the lookup by `old_endpoint`, **the 409's lookup of `subscription.endpoint` on another account** (keksdose S5: under FORCE RLS another user's row is invisible, the move then hits `UNIQUE(endpoint)` and answers 500, not 409) and the update all run inside `async with bypass_rls_for(session)` (infrastructure/tenancy.py:130) with explicit `PushSubscription.endpoint == …` filters (the only unauthenticated route that takes the bypass); **proof before the 409**: `push_auth_matches(row.auth, body.old_auth)` first, and only a proven device learns the new endpoint is taken; an **inactive or demo** account → the same 404, and its row deleted; push rows **deleted on sign out everywhere** (auth_router.py:916), **on deactivation** (`request_deletion`, account_deletion_service.py:199) and **on erasure** (`erase_one`, :337). **The reaper's race**: a 404/410 marks the row `gone_at` and stops sending to it instead of deleting it (domain/services/push_service.py:294-298 → a migration adds `push_subscriptions.gone_at`); the replace may claim a gone row within `PUSH_GONE_GRACE` (7 days, server-kit), and the daily reap deletes gone rows older than that. Never log the route's body; its 422 is a plain detail, never the input (`old_auth`): from server-kit 0.16.1 take the body as `body: Annotated[Any, Body()]` and parse it with `parse_push_replace(body)`, whose `PushBodyInvalidError` is a coded 422 naming fields only (keksdose S1; the hand parse can go). A test per answer (200 in place, 200 claiming a gone row inside the grace and 404 past it, 404 unknown or wrong auth, 404 inactive and demo, 409 another account's endpoint only after the proof). |
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
  `formatDate`, `title`, `describeError(error, action)` (0.46.1: `action` is `"read"`, `"readAll"`
  or `"clear"`, the request that failed; keksdose N4), `labels`. **`INBOX_BADGE_INTERVAL = 60_000`** for the badge's poll.
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
- **The zone is automatic only** (notifications §10.3, amended 2026-10-20, Marcel): the
  account's zone is the device last used, else Zurich; **no picker and no time-zone row in any
  app**, and screens keep showing device time. **`useDeviceZoneReport({ stored:
  me.device_timezone, report, isDemo, account: me.id })`** once at app start (`report` = `PATCH
  /auth/me {device_timezone}`, and it **puts the answer in the session's user** (`setUser`, as the
  language PATCH does), or `stored` stays stale until the next `/auth/me`; only when the device's
  zone differs, once per start and account, never for a demo: pass `isDemo`, as keksdose's
  `demo_guard` refuses a demo's `PATCH /auth/me` and every demo start would fire a refused
  request). `stored` is `undefined` while signed out, which clears the guard, so the next person
  on a shared PC is reported in the same start. Sign-up sends `device_timezone` too. A stale 0.45
  bundle's `timezone` (its picker, its quiet hours' first entry) is ignored by server-kit 0.16 on
  `PATCH /auth/me` and `PATCH /notifications/settings` (refused from 0.17).
- **`QuietHoursSetting`**: pass `zone={me.device_timezone ?? null}` (`null` names `fallbackZone`,
  Zurich): the card names the zone read-only ("In your time zone (Europe / Zurich), which
  follows the device you last used.") and a time never sends a zone. **`timezone` is
  deprecated** (shown read-only without `zone`, no picker any more; removed in 0.47), as are
  `NotificationSettingsPatch.timezone`, `TimeZoneSelect`, `timeZoneOptions` and the labels
  `deviceZone` / `useDeviceZone`. `held` (an app that runs the notifications tick) says a held
  push arrives when the window ends.
- **`<UiKitProvider timeZone>`** stays in the kit (`formatDate` / `formatRelativeTime` show
  timestamps in it when a call names none; a bare `"YYYY-MM-DD"` is never shifted), but no app
  passes it this round: screens keep device time.
- New words in all seven languages (`notifications.channel*`, `inbox*`, `bell*`, `deviceTypes*`,
  `quietZone`; `quietDescription(inbox, held?)`); an app's `notifications` overrides keep
  type-checking.

| App | Change |
| --- | --- |
| keksdose | **Inbox:** features/auth/notification-inbox.tsx:67-179 → `<NotificationInbox items={inbox.data?.items} unreadCount={inbox.data?.unread_count ?? 0} loading={inbox.isPending} onMarkRead={(ids) => markRead.mutateAsync(ids)} onClear={() => clear.mutateAsync()} icon={(type) => TYPE_ICONS[type as NotificationTypeId]} formatDate={(iso) => formatDateTime(iso, locale)} describeError={(_error, action) => (action === "clear" ? t("notifications.inbox_clear_failed") : undefined)} />` (0.46.1 passes the failed action, so a failed mark-read keeps the kit's `failed` line instead of "could not be cleared"; the last-action ref can go, keksdose N4) **replacing the whole `<Card>` wrapper** at features/auth/settings-page.tsx:177-179 (the kit's inbox draws its own Card; keksdose N1), in the device's zone as today (no provider `timeZone`); drop `useClearInbox`'s toast (shared/push/use-inbox.ts:114), so a failed clear shows one message, the kit's line (N2). `TYPE_ICONS` (:44-56) stays and gains `feedback_received`. **Only four `notifications.inbox_*` keys go** (keksdose S6): `clear_all`, `clear_confirm`, `empty`, `mark_all_read`; `inbox_title` and `inbox_unread` (app/account-menu.tsx:162, :169, :375), `inbox_heading` (features/auth/settings-index.ts:170) and `inbox_clear_failed` (above) stay. Keep the avatar dot (app/account-menu.tsx:365-378) and the menu row's count (:146-171): **no `NotificationBell`**. **Switches:** the migration `notification_preferences.enabled` → `app` and `push` (a missing row stays missing; `migrate_enabled_to_channels`) lands IN the bump, with the storage and delivery change (server-kit section, keksdose B1); `push_subscriptions.muted_types` (FORCE RLS as today); `PATCH /notifications/devices/{id}`. **Couple only in the legacy shim** (keksdose S1): the `/push/preferences` shim (adapters/api/push_router.py:77-89) passes `couple_push_to_app=True` and so writes both, since old bundles send `{app}` alone; `PATCH /notifications/settings` never couples, or the new card's "In the app" column (it sends `{app}` alone) would flip Push too. features/auth/notification-settings-cards.tsx:165 passes the answer as is (now with `push`); :231 `PushDevicesSetting` gains `types`, `typeSwitches={settings.data?.types}` and `onMutedTypesChange`. `PushData.inbox=False` when no inbox row is written, and frontend/src/sw.ts:256 shows the notification when `data.inbox === false` even with a focused window. **Zone (automatic only, amended 2026-10-20; supersedes decision 6 and build review 2's B3):** a migration adds `users.device_timezone`, seeded from `notification_settings.timezone` where set (a start value; the next app start reports the device's), then drops that column (domain/models/push_subscription.py:203); `/auth/me` answers `device_timezone`, `PATCH /auth/me` writes it with `apply_zone_update(user, payload, is_demo=user.is_demo)` in `update_profile` beside the text size and contrast (adapters/api/auth_router.py:1178-1181; `update_profile` copies its fields by hand; `ProfileUpdateRequest` inherits the field from `kit.ProfileUpdate`; a stale bundle's `timezone` is ignored in 0.16, a 422 from 0.17), and sign-up stores `RegisterRequest.device_timezone`; `useDeviceZoneReport({ stored: token && user ? (user.device_timezone ?? null) : undefined, isDemo: user?.is_demo === true, account: user?.id, report: (zone) => authApi.updateProfile({ device_timezone: zone }).then(setUser) })` beside `AccountLanguageProvider` (frontend/src/shared/i18n/account-language.tsx:79-96, mounted once in `Root`): **pass `isDemo`**, as `demo_guard` refuses a demo's `PATCH /auth/me` (auth_router.py:1176-1177) and every demo start would otherwise fire a refused request; **no time-zone row**. Quiet hours read `effective_zone(user.device_timezone)`: `should_push_now(settings, now)` (domain/services/notification_preferences_service.py:187-200, now `resolve_zone(settings.timezone)` at :199) gets only the settings row, so it takes the zone (or the user) from `_deliver_to_user` (push_notifications.py:396-399); **the digest** computes its zone at push_notifications.py:1102 (`resolve_zone(settings.timezone if settings else None)`), which goes with the column → `effective_zone(user.device_timezone)` (keksdose B3-S4). The knobs stop answering `timezone` (:171). The `/push/settings` shim (adapters/api/push_router.py:101-115; `LegacyNotificationSettingsUpdate(DigestUpdate, QuietHoursUpdate)`, domain/schemas/push.py:135) and `PATCH /notifications/settings` accept and **ignore** a `timezone` an old 0.45 bundle sends (its `QuietHoursSetting` sends `patch.timezone` the first time quiet hours are entered, the picker sends `{timezone}`): server-kit 0.16's `QuietHoursUpdate` and `NotificationSettingsUpdate` drop it, for this release only (a 422 from 0.17), nothing to code (keksdose B3-S2/S3). features/auth/notification-settings-cards.tsx:205-209 `QuietHoursSetting`: `timezone=` → `zone={me.device_timezone ?? null}`, plus `held` **only once the queue and the tick (below) run**: until then a quiet push is still dropped, and `held` would promise a later delivery that never comes (keksdose N7). The UTC writers through `effective_zone(user.device_timezone)`: billing_notice_service.py:181-188 (`_zone_of`, its UTC fallback goes), account_deletion_service.py:268, :274 and feedback_publish_notice_service.py:124. **Not** the scheduled-due sweep (push_notifications.py:938-960; keksdose N7): its ledger records ONE decision per transaction and a budget's members can be in different zones, so it keeps the app zone. **Queue:** the table and store; `_deliver_to_user` (push_notifications.py:396-399) holds a quiet push instead of dropping it; the 15-min product-metrics Cloud Run Job carries the tick (keksdose S4) — an extension, not a rename: the Job and its Scheduler trigger keep their names (the Cloud Run Job's name derives from the job id, and the trigger's URI targets it), and the tick writes a second receipt, `job_name="notifications_tick"` (keksdose N10): run `notifications_tick` apart from `run_product_metrics` (infrastructure/scheduler.py:364-374, which re-raises), so a broken metrics collect never skips the tick; move `send_queued_replies` (scheduler.py:248) into it; and give the job the mail settings, the VAPID keys and `APP_BASE_URL` (deploy/gcp/cloudbuild.yaml:640-642 sets none of them): without them, since 23c18e71, console mail in prod answers `False` and `QueueService` drops a row "failed" after 3 attempts (about 45 min), so a crash bundle would be lost silently. The job runs with `--max-retries=1` (cloudbuild.yaml:643-645), so a retry after a metrics failure runs the tick again: `notifications_tick` is idempotent (a sent row is done, a claimed one waits out `QUEUE_CLAIM_TIMEOUT`, a resend carries the same `Idempotency-Key`; server-kit test `test_a_retried_tick_job_sends_nothing_twice`), so the retry may stay (keksdose B3-N3). |
| kastlan | **No push:** `NotificationTypes(..., push_channel=False)`; `StoredSwitches` takes the defaulted `push` (notification_settings_service.py:52, :71); the card shows two columns for `invoices_overdue` (features/settings/pages/settings-page.tsx:332). Without `push_channel=False` the two staff types answer `push: false` and the card draws a Push column. **The bump breaks tests/api/test_notification_settings.py** (kastlan B2): `TypeSwitches` gains `push`, serialized `null` here, so every exact-dict assert fails: `DEFAULTS` (:18-24) and :37, :44, :50, :57, :61, :78, :97 (the export), :120; and `feedback_received` (below) is a third type for `test_user`, an ADMIN (tests/api/conftest.py:67-77), which also breaks the order at :38, `DEFAULTS` and :127-130 (unsubscribe-all walks the registry, notification_settings_service.py:97). **Inbox for `invoices_overdue`:** the table (`user_id`, a plain `company_id` column, NOT `CompanyMixin`: infrastructure/rls.py:41-50 builds RLS from that mixin; "like `notification_mail_sent`" means no RLS only, that table has no `company_id`, domain/models/notification.py:43-48), `InboxStore` + `inbox_router`. **The inbox can't ride the overdue mail loop** (kastlan S10; overdue_mail.py:151-170): that loop walks `_recipients` (:95-116), which keeps only the e-mail switch and `email_verified`, skips events already mailed and `continue`s on a failed send, so someone with the app switch on and mail off (the inbox's own case) gets no row, and a failed mail drops the row. The 00:10 job writes the rows in a loop of its own: recipients by the app switch, active, non-demo, staff in the event's company; one row per (user, type, event), the table's unique key. **The inbox routes' writes** (kastlan S11; POST /notifications/inbox/read, DELETE /notifications/inbox): in the OWN_ACCOUNT sweep (tests/api/test_staff_only_routes.py:56-101; not staff-gated, the rows are the account's), in `BILLING_WRITES` (infrastructure/dependencies.py:203), and a `DEMO_WRITES` decision. The kit's routes don't commit: kastlan's `InboxStore` commits. **`NotificationBell` in `notifications=`** (app/top-bar.tsx:136), `onOpen` switching the acting company first when `item.company` is another's; the inbox's page or card for `href`. The poller stays on its live counts, `invoices_overdue` and `dunnings_pending` (amended 2026-10-20, notifications §10.1, kastlan N9: the poller is the desktop alert, the inbox lists events; not fed from the inbox rows). **Zone (automatic only, amended 2026-10-20):** `users.device_timezone`, `/auth/me` (`apply_zone_update`; a demo's ignored), sign-up's `device_timezone`; **`device_timezone` goes on kastlan's own `MeResponse`** (kastlan/domain/schemas/auth.py:32, not the kit's `UserResponse`) with the column and its migration, then regenerate the API types: without the field `/auth/me` has none, `useDeviceZoneReport` reads `undefined` as "still loading" and never reports, and nothing errors (kastlan B3-S2); **the export** lists the account's fields by hand (domain/services/account_service.py:220-262): add `"device_timezone"` beside `"locale"` (:258) (kastlan B3-S3); `useDeviceZoneReport` in the shell (`account: me.id`; `report` puts the answer in the session's user); **no time-zone row** (nothing beside `LanguageSetting`); an app-zone `today()` (Europe/Zurich) on the request paths (invoice_logic.py:39, :61; dunning_repository.py:86-87; journal_entry_service.py:474, :494, :518; accounting_router.py:373, :384, :459; deposit_service.py:143, :150); billing notices stay Zurich. Screens keep device time: no provider `timeZone`. **No queue in 0.46** (`notifications-flush` in `JOBS` with its first queued type). **Zone, two more points** (kastlan 2): the migration (`users.device_timezone`) lands in the bump's commit, since after the bump PATCH /auth/me accepts `device_timezone` and `apply_patch` sets it on a `User` with no column: a 200 and the value lost. The `today()` list also misses accounting_router.py:134, :351, :420, :486, :510, :554; invoice_service.py:54; finance_repository.py:340; dunning_service.py:207; rent_increase_service.py:137, :208; recurring_rent_service.py:114, :146, :176 (at 23:30 UTC on Oct 31 a recurring rent's start month comes out as October; kastlan B3-N4); tenancy_service.py:130; report_service.py:50, :519; financial_report_service.py:367; financial_report_pdf_service.py:92, :126; lease_pdf_service.py:199; schemas/tenancy.py:34. `local_today` takes an aware now, and kastlan's `clock.utc_now()` is naive (domain/services/clock.py:15-17): pass `datetime.now(UTC)`, or `utc_now().replace(tzinfo=UTC)`. |
| Kurvenschmiede | **No push, no inbox, no bell:** `NotificationTypes(..., push_channel=False)`; `settings_of` and the PATCH filter by `TYPES.receivable(lambda t: t.id != FEEDBACK_RECEIVED or user.role == ADMIN)` (notification_service.py:124-127); its e-mail-only rows keep their single switch (frontend/src/features/notifications/notifications-card.tsx:29). **Zone (automatic only, amended 2026-10-20):** the `users.device_timezone` column; `/auth/me` (ignored for a demo, as auth_router.py:249-262) in four places, since KS's answer is hand-written (KS N1): `UserResponse` (backend/kurvenschmiede/domain/schemas/auth.py:46, not the kit's `MeResponse`) gains `device_timezone`; `ProfileUpdate` (:154) inherits it from the kit, nothing to do; the frontend mirror (frontend/src/shared/types/auth.ts) and its mirror.test.ts follow; the export's `account` (domain/services/export_service.py:167) gains it. `useDeviceZoneReport` in the shell, with `stored: user?.device_timezone` (`undefined` signed out, which clears the once-per-start guard for the next engineer on a bench PC; KS B3-S1) and `account: user?.id`; **`report` updates the session's user with the answer** (`setUser`, as the language PATCH does), or the export and the billing day read a stale cache until the next `/auth/me` (KS B3-N1). A demo's zone: the kit's `ProfileUpdate` drops a zone it doesn't know and KS's (:154) inherits that; an old KS bundle never sent `timezone`, so nothing breaks (KS B3-N2); **no time-zone row** (nothing beside `LanguageSetting`); the billing notice's day in the recipient's zone (`NOTICE_ZONE` → `effective_zone(user.device_timezone)`) with a test. Screens keep device time: no provider `timeZone`. No queue, no flush route, no Scheduler job. |

## Feedback alerts for admins (`feedback_received`; feedback §11; server-kit 0.16.0)

docs/feedback-harmonization.md §11 (settled 2026-10-19). One type, `feedback_received`, for a new
report, a rework that lands OPEN, and a new crash; on by default in every channel the app offers,
`quiet`; never the actor, a demo or the platform superuser. **ui-kit:** `useFeedbackNotificationTypes()`
now returns a third entry, `feedback_received` ("New feedback and reworks", "When someone files a
report or sends one back." — a crash is mailed only inside keksdose's bundle, so the line names no crash, KS S1), drawn only where the server answers it (an admin);
`feedbackNotificationTypes.adminGroup` ("Admin") is a heading an app may put over it. **Type
change on the bump:** `FeedbackNotificationTypeId` gains `"feedback_received"`, so an app that
spreads the hook into a `NotificationTypeEntry<NotificationTypeId>[]` adds `feedback_received` to
its own id union (all three declare the type in this round; keksdose
features/auth/notification-settings-cards.tsx:145, kastlan
features/settings/hooks/use-notification-settings.ts:13, which already spreads
`FeedbackNotificationTypeId` and needs no edit, Kurvenschmiede
features/notifications/notification-types.ts:29). An app that passes `groups` puts
`feedback_received` in one (the card throws in development for a type the server answered in no
group).

| App | Change |
| --- | --- |
| keksdose | The type (in the app, push, e-mail on; `quiet`; `bundle` 15 min, which only crash mails use); `TYPE_ICONS.feedback_received`; a group for it in the card's `groups` (the kit's `adminGroup`, read with `useFeedbackNotificationTypesLabels().adminGroup` from 0.46.1; keksdose's own `notifications.group_admin` can go, N9). `FeedbackAlerts` over `admin_recipient_ids` minus the actor: an inbox row and a push for every kind, the mail at once (after commit) for a report or a rework, a crash's mail queued (the tick). **Marcel, 2026-10-20:** reports and reworks are mailed at once in every app, keksdose included; only crashes go through the bundle. Build review 2's B4 ("mail only through the bundle, every kind") is not his call: keep `mails_at_once` as is. Its **first notification mail**: `send_email(..., headers=)` (infrastructure/email.py:62) for RFC 8058, `POST /notifications/unsubscribe/{token}` (+ `/all`), the `/unsubscribe` page on `UnsubscribePanel`, a dedicated unsubscribe secret (not `jwt_secret`), the `User.email_verified` gate. The mail-kind guard (tests/unit/test_metrics.py:1057-1069) resolves enum kinds and type ids; observability §5.6 lists the billing kinds, `feedback_published`, `feedback_received`. Words: "New feedback report #123 (Bug)", "Report #123 was sent back for rework", "New crash report #123", link `/feedback?row=123`; no title, body or reporter. Support chat's admin push stays apart. |
| kastlan | The type (e-mail on, no app), receivable "ADMIN in some company"; `FeedbackAlerts` via `FeedbackDeps` (feedback_router.py:84-107): the ADMINs of the report's company, active, non-demo, verified, switch on, not the actor (as `_recipients`, overdue_mail.py:95-116); report and rework mailed at once; a crash → nothing (the badge). **The alert runs after the commit and never raises** (kastlan S12): the repository commits (adapters/persistence/feedback_repository.py:51-56) and kastlan has no `BackgroundTasks` (the request's session is closed by then), so the router awaits `filed` after the write, as `feedback_answered` is awaited after its commit (feedback_reply_store.py:71-78); kastlan's `filed` catches and logs everything, or a failed mail turns POST /feedback into a 500 with the report saved and the user sends a duplicate. The words in doc_text/notifications.py beside `feedback_answered`, with `{company}`, four languages, `REVIEW_PENDING`. Logs: email.py:127 → the status and the JSON's `name`; :153-154 → `type(exc).__name__`. Its settings card shows the kit's entry with no change (the `types` list already spreads `useFeedbackNotificationTypes()`; add `feedback_received` to any `groups`). |
| Kurvenschmiede | The type (e-mail on); every active non-demo ADMIN but the actor (`User.is_person`) through `_tell` / `send_after_commit`; report and rework mailed; a crash → nothing (the badge); `feedback_loop.file_report` (feedback_loop.py:360-375) is the one place that builds `FeedbackService(alerts=None)`; its `resolve` goes through the reply store, which never fires `feedback_received`. `_tell`'s plan already requires an active, verified person (notification_service.py:187-190), with the unsubscribe footer and headers. **Add a test** that the loop's `--file` mails nobody, with a second admin present (KS N2). The receivable filter on the settings read and PATCH (above). |

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
lost scope's 403 rejects its queue with the answer's `code` and `detail` ("Not allowed to sync
<scope>" when it names none); errors back off 5 s, 15 s,
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
  signature before finalising) as `guard`s, finalising in `after_apply`. `sort_changes` runs
  inside `include_deleted_scope`; `references` come from the registry's relations, so an unlisted
  key is a rejection, not a 500 on a NOT NULL FK. The cascade now refuses only from new rows; three
  reason texts change (none pinned by a client or test).
- **Exception types** (kastlan S6): `refuse_whole()` raises the kit's `SyncScopeError(ValueError)`,
  so for an old client (no `refusals`) adapters/api/sync_router.py catches it and re-raises
  `SyncRefusedError(exc.change_id, exc.detail)`, or the 422 becomes a 500
  (nine asserts pin the 422: tests/api/test_sync_handover.py:137, :143, :156, :170, :173, :178, :247, :264, :341; the re-raise covers all). **A guard returns the reason**,
  never raises: a ported guard that still raises kastlan's `SyncRefusedError`
  (sync_scopes.py:47) escapes `sort_changes` and refuses a `refusals` client's whole push.
- **`AfterApplyContext.found` is the live row** (kastlan S5): `rows.find` returns the
  identity-mapped ORM row (sync_scopes.py), which the apply mutates, so a "did `last_performed`
  change" read from `found` is always false. Compare against the kit's before-snapshot,
  `ctx.before[change_id]` (the sent fields as the row held them before any apply, in the row's
  types: compare `date.fromisoformat(data["last_performed"])` with it, as the wire's
  `"2026-10-01"` never equals a `date`; and two changes to one row in a push each see the row
  before the push); or, simplest and idempotent, recompute `next_due` from the stored row for every allowed schedule change that
  carries `last_performed` or `interval_months`.
- Widen `SyncRequest.scope` (domain/schemas/sync.py:25, `Literal["handover"]`) and `ScopeName`
  (domain/services/sync_scopes.py:227) to the five scopes.
- **QR-IBAN withholding:** `withheld=frozenset({"estates.qr_iban"})` on every scope; the pull runs
  rows through `withhold`; a test that the handover pull holds no `qr_iban` and a push naming it is
  rejected. `withheld` matches wire keys; for `estates.qr_iban` the key is the column name. Call
  `withhold` per dict on the final delta, the LWW losers included. A push naming it is refused as
  "estates cannot be written" (no scope writes estates).
- Paging: `collect_delta` (domain/services/sync_service.py:224-255) on the kit's `page_of`, 2000
  rows a page, `id_of=sync_uuid`, `ORDER BY knowledge, sync_uuid COLLATE "C"`, and `window_end`
  from the global counter read after the apply; the router honours `paged`.
- Four new scopes, rules per §2.5, roles as online: `MEETINGS`, `METERS`, `MAINTENANCE` (costs and
  schedules included; `after_apply`: `ASSIGNED` on a work order's create, `next_due` via
  `calc_next_due` for a change carrying `last_performed` or `interval_months`, S5 above), `CONTACTS` (`FINANCE_WRITE`; phone, mobile,
  email, notes only). The router (adapters/api/sync_router.py) resolves `scope` among the five and
  answers 403 to a role without it.
- **The double majority, per owner** (local-first §2.5, amended 2026-10-19; kastlan S7, S9): a
  migration adds attendance to `meeting_invitations` and a new vote model (`SyncMixin` with
  `updated_at`; references `agenda_item_uuid` and `invitation_uuid`; one row per owner per agenda
  item, unique on (item, invitation)). **Its id is deterministic**: `uuid5` over the item's and
  the invitation's `sync_uuid`s, minted on the device, so two devices recording the same owner
  write ONE row and LWW decides (random ids would 500 on the unique key, or make two votes). The
  `meetings` scope writes the vote rows and the invitation's attendance (item and invitation
  fixed); `votes_for/against/abstain` are derived from the vote rows, on the server and on the
  device, and are no longer writable. The completed-meeting guard walks vote → item → meeting.
  Tests in `test_sync_meetings.py`: a vote and an attendance written, the same owner's vote from
  two devices is one row (the later wins), the counts derived, a vote on a completed meeting refused.
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
  `useSyncWorker(engine)` in app/app-layout.tsx:92 replaces `useHandoverSyncLoop`. **One engine per db name, kept** (kastlan S3): build it with the kit's
  `syncEngineFor(options)` (`@eifi1/ui-kit/sync`, 0.46), which keeps one engine per database
  name, as HO/db.ts:78 keeps its databases (`open`), never rebuilt in a `useMemo`; the first
  call's options stand, so read changing values (scopes) through functions; a db reopened under
  the same name replaces the kept engine and stops the old. A switch A→B→A within one round would
  otherwise put a second A engine's queue beside the first's round on the same db, and an edit
  could leave the queue. The kit's `stop()` now aborts the round in flight (its queue goes back to
  pending), and rounds on one db name run one after another (an engine stopped while it waits for
  another's round runs none: kastlan B3-S1). **On sign-out call `releaseSyncEngine(name)`**
  (`@eifi1/ui-kit/sync`, 0.46) for each db the session opened: it stops the kept engine and closes
  its database, which otherwise stays open until a reload (kastlan B3-N3); two tabs on one db keep the same
  race until the kit takes Web Locks (a later candidate).
- **The server's stamp protects a device edit** (kastlan S1): the engine keeps a pulled change's
  `updated_at` (sent beside `data`) on the stored row (`SyncedRow.updated_at`) and stamps the
  next local edit after it, so a tablet 1 s slow no longer loses its edit to the server's write.
  Nothing for kastlan to do; a row pulled before the bump has no `updated_at` until the server
  changes it, so its next edit is stamped `Date.now()`, as today (kastlan B3-N1). `useSyncQuery` and `createSyncDb` are generic
  (`<D extends SyncDb>`), so `HandoverDb` queries type-check (use-handover.ts:53, :59, :72, :95,
  protocol-info-step.tsx:32/:38, rooms-step.tsx:34, new-handover-wizard-page.tsx:30,
  use-sync-status.ts:22, handover-sync-banner.tsx:18), and with no
  db yet `useSyncQuery` answers `isLoading: true`, as `useLive` did (features/handover/offline/use-copy.ts:34-39).
- **A 403 keeps the server's reason** (kastlan S4): a lost scope's queue is rejected with the
  answer's `code` and `detail` (e.g. `demo_read_only`), "Not allowed to sync <scope>" only when the
  answer names none. A waiting change's `reason` is now the refusal's `detail`, its code in
  `code`: HO/offline.test.ts:186 (`reason: "billing_read_only"`) changes to `code`.
- **Never send the whole row**: the narrow update schemas rely on the outbox's partial data (an
  update carries only the fields written). The photo step checks `ctx.isCurrent()` before each
  `db.photos` write; `discardRejected` leaves rejected photos, so the banner keeps its own photo
  delete. A write during backoff waits up to 5 min (or "Sync now"); a request replayed by the
  session refresh keeps its stale `client_now` (the clamp bounds it).
- **The guarded sign-out:** features/auth/stores/auth-store.ts:74 calls `engine.forget({ keepQueue:
  true })` instead of `forgetHandoverCopy`.
- **Shared computer:** `isSharedComputer()` → no engine (`useSyncWorker(null)`), the queueing
  controls locked "Needs a connection", the handover pages and the meeting recording page not
  offered.
- Indicator: app/top-bar.tsx:177 `SyncStatusIndicator` always shown (no `hideWhenIdle`, no handover
  `scope` words), fed by `useSyncStatus(engine)` plus the legacy queue's count. **The legacy
  `kastlan-offline` queue and `syncManager` drain stay** (D17; prod is on v0.11.0).
- **All five scopes**, in the round's order handover, meetings, meters, maintenance, contacts;
  `scopes()` from the company role.
  - **The meeting page:** a new recording page under features/owner-meetings ("meeting mode"): per
    agenda item each present owner's vote (one row per owner, its id `uuid5(item, invitation)`
    minted here) and the tallies by head and by value quota derived from them (ZGB 712m double
    majority, local-first §2.5 amendment), the resolution and `minutes_text`, attendance per
    invitation, and the meeting's `notes`; reads and writes the copy only; "Complete" online only
    ("Needs a connection"); a completed meeting read-only; the invitations' other fields read-only
    (they send mail).
  - meters, maintenance, contacts: the online pages on `readLocalFirst`/`writeLocalFirst`; creates
    mint `sync_uuid` once and send it on both paths; queued controls take
    `commit={COMMIT_EXCEPT_OFFLINE}`; a meter reading's scope from its row, and a reading moved
    into or out of a protocol is a delete in one scope and a create **with a new id** in the other
    (local-first D11; kastlan S8).
  - maintenance costs (`cost_estimate`, `actual_cost` on the detail page) and a schedules list with
    "Done" write through the copy (no online writer exists today).
- Words for the new page and the schedules list in all seven languages.
