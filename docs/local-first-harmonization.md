# Local-first — harmonisation plan

**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.
**§1 (round 0.45) settled 2026-10-19** (Marcel, after the kastlan and keksdose reviews in
audits/round-046/reviews.md; §1.8–§1.9). Phases 1 and 2 are built for ui-kit 0.45 / server-kit 0.15;
phases 3 and 4 follow in later rounds.

| § | What | Status |
|---|---|---|
| 1 | kastlan local-first like keksdose; KS stays online-only; what the kits lift | **SETTLED (round 0.45)**: P1+P2 in ui-kit 0.45 / server-kit 0.15 |

## 1. kastlan becomes local-first — SETTLED (round 0.45)

**Settled 2026-10-19** (Marcel, after the kastlan and keksdose reviews in
audits/round-046/reviews.md; §1.9 records where each answer went, and the reviews' corrections
are folded into §1.2, §1.3 and §1.5–§1.7). **Phases 1 and 2** (§1.7: the persisted offline cache
with its scrub list, and the shared sync protocol) are built for **ui-kit 0.45 / server-kit 0.15**.
Phases 3 and 4 follow in later rounds. Drafted at kk `feat/feedback-loop-80-424-434` deaf428d, ka
`feat/kit-0.44` 6c2a0c4, KS `main` b54c16e, ui-kit `feat/0.45.0`, server-kit `feat/0.15.0`; the
reviews' corrections re-checked at the same kk and ka commits. In kk, FE = `frontend/src` and
BE = `backend/keksdose`. In ka, FE = `frontend/src` and BE = `kastlan`.

Marcel, 2026-10-19:
- "kastlan becomes local-first like keksdose."
- "Kurvenschmiede stays online-only (its sync indicator shows only its honest states: offline, saving)."
- "keksdose is canon for local-first."

It follows top-bar §2.6, which says: "Making more of kastlan, or any of KS, work offline is a
round of its own, later". The inputs are audits/round-043/topbar-kastlan.md §7 and
topbar-kurvenschmiede.md §7.

**A correction to the brief.** keksdose does **not** replay its writes with versions or
`If-Match`.
- Nothing in kk or ka sends or checks `If-Match`, an ETag, a 412 or a 428 (grep over both repos).
- Both apps' `/sync` decide concurrency **whole row, last write wins**, with tombstones for deletes.
- `If-Match` with a `version` per row is **KS's** online contract (KS
  backend/alembic/versions/0031_a_version_on_every_shared_row.py:4). KS stays online-only, so
  nothing here builds on it.

### 1.1 Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| **Offline reads** | everything: the persisted query cache, plus the Dexie mirror of 11 entities | handovers only: a Dexie copy per account and company; every other page is online, with an in-memory query cache | none, by design |
| **Offline writes** | everything synced: outbox → `POST /sync` | handover scope only (protocols, rooms, defects, photo captions, meter readings) | none |
| **Concurrency** | upserts: whole-row LWW on `updated_at` (client-stamped when queued, server-now on REST); deletes tombstone **unconditionally** | whole-row LWW, **the last to arrive** wins (no `updated_at` on the wire; the server stamps it) | `version` + `If-Match`, 409/428, online |
| **Sync protocol** | `knowledge` per household, paged pull, `refusals: true` | `knowledge` database-wide, scope `"handover"`, `SyncRefusal` | — |
| **Indicator** | `SyncStatusIndicator`, always shown, 7 states | the floating pill + `HandoverSyncBanner` (top-bar §6.10: into the bar, `hideWhenIdle`, words for handovers) | `SyncStatusIndicator storage="none" hideWhenIdle` |
| **Service worker** | custom `sw.ts`, `registerType: "prompt"`, push, share target | Workbox `autoUpdate`, shell only | none |
| **At rest on the device** | plaintext (decided); E2EE on the wire for 3 entities | plaintext | session and conveniences only |

### 1.2 keksdose's mechanism, as it is (canon)

**Persisted query cache** (FE shared/state/query-client.ts)
- It persists TanStack Query through `createAsyncStoragePersister` on `idb-keyval`, under the key
  `"keksdose-query-cache"` with `throttleTime` 1000 (:61-72).
- `maxAge` is 24 h (`PERSIST_MAX_AGE` :14), and `gcTime` matches it (:37). The `buster` is the app
  version (:76), so a deploy drops the cache.
- `networkMode: "offlineFirst"` applies to queries (:34) and mutations (:54).
  - kk uses no `onlineManager` or `resumePausedMutations`.
  - **A TanStack mutation is not the outbox.**
- Everything persists except a deny-list:
  - roots: reports, scan blobs, admin, translations, dev switch (:109-118);
  - the key `accounts.fxContext` (:130-132);
  - any key whose second segment is `"admin"` (:142).
- Only plain JSON is persisted (`isCacheSafe` :165). The guard runs on write
  (`shouldDehydrateQuery` :322) and again on restore (`sanitizePersistedCache` :264). The options are at
  :338-343, mounted with `PersistQueryClientProvider` (FE main.tsx:149).
- The key is the same for every user. `clearPersistedQueryCache()` (:302) runs on every `auth.clear()`.
- Reads go through `readLocalFirst` (FE shared/offline/net.ts:58).
  - It tries the server first and falls back to the mirror only on a network error (`isOfflineError`
    :20).
  - It waits 300 ms on a cold start (:34).
  - A sealed household always reads locally (:74).

**Mirror and outbox** (FE shared/offline/)
- One Dexie database, `"keksdose-mirror"` (db.ts:106). It holds the 11 `SYNC_ENTITIES` (:13-28),
  `outbox "++seq, entity, id"` (:117), `meta` and `fx_rates`. Its schema versions run v1–v6 (:107-162).
- An outbox row is `{seq, entity, id, op: "upsert"|"delete", data: whole row, ts}` (db.ts:33-40). It
  carries no patches, versions or idempotency keys: the client's UUID is final and makes a re-push
  harmless (FE shared/lib/uuid.ts; write.ts:171). There are no temporary ids.
- The writes:
  - `writeLocalFirst` (write.ts:111) tries REST first and queues only on a network error (:134-137).
    A sealed household always queues (:125-129).
  - The other writers are `createLocalFirst` :163, `writeManyLocalFirst` :198 and `mergeRow` :225.
  - `enqueueChange`/`enqueueUpserts`/`enqueueChanges` (sync-client.ts:535, :564, :599) apply a change
    to the mirror and the outbox in one transaction.
  - `refuseIfLocked` (write.ts:36) stops a phantom save while the budget is locked.
- The round (sync-client.ts):
  - It drains the outbox in `seq` order (:1372). A held earlier write holds every later write for the
    same row (:1391-1412).
  - It deletes only the pushed `seq`s, inside the pull's transaction (:1546, :1578).
  - The cursor `last_knowledge` moves only after a complete paged pull (:1292, :1572), with a rewind
    guard (:139, :255).
  - Only one round runs at a time (:1318).
- The worker runs a round on mount, on `online` and every 30 s (use-sync-worker.ts:13-40), plus
  `kickSync()` after each write (sync-client.ts:1183). It has no backoff.
- A queued write is stamped `new Date().toISOString()` (write.ts:178, :236 and about 13 more
  sites). `stampAfter()` (sync-client.ts:639), which keeps it 1 ms past the previous value, is used
  only by re-seal and the payee restate (sync-client.ts:781; payee-restate.ts:85, :171).
- **Most online writes carry the server's clock** (review correction). `writeLocalFirst` tries REST
  first (write.ts:111-137), and REST, import and job writes are stamped server-now by the
  `before_flush` hook unless `updated_at` was set (BE infrastructure/sync.py:178-186). A row pushed
  with no `updated_at` also falls back to server-now (sync_service.py:1288). So "the client's stamp"
  holds for queued (offline or sealed) upserts only.

**Conflicts and refusals**
- The server merges **upserts** whole-row LWW and keeps its copy only when strictly newer (BE
  domain/services/sync_service.py:523-550). A losing write comes back as the server's row in the same
  round (:1279-1295). A tombstone is stamped `utcnow()` and moves `updated_at` forward so an older
  upsert cannot revive it (:553-558).
- **Deletes are not LWW** (review correction). A pushed `delete` tombstones a live row
  unconditionally, with no `updated_at` comparison (sync_service.py:1129-1180), so an older offline
  delete beats a newer edit.
- Two devices that create the same unique tuple get the rows merged. The duplicate gets a tombstone,
  and references are remapped in the push (`_UNIQUE_KEYS` :182-190, :1235-1271, `_apply_remaps` :1763).
- **There is no conflict dialog and no merge UI.**
- **Per-row server rejections** exist beside the refusals: coercion drops, category scope, revival
  rules and the trade reversal echo a repair row (sync_service.py:1150-1158, :1183-1229); a push onto
  another tenant's id is dropped silently (:1199-1214).
- With `refusals: true` (sync-client.ts:1459, :1530-1540), the server answers `refused: SyncRefusal`,
  **one** refusal for the **whole** push (BE domain/schemas/sync.py:162):
  - `billing_read_only` holds the queue for a plan (meta `held_for_plan` :155) and shows it as
    `waitingForPlan`.
  - `releaseHeldChanges()` :974 sends the held queue after payment (FE features/budgets/use-budgets.ts:80).
  - `discardWaitingChanges()` :995 drops it and rewinds the cursor.
  - `read_only`/`demo_read_only` keep the changes and show "refused" (:1612). Any other code counts as
    blocked, and stays blocked (:1530-1546): a new code in `refused` would block kk's queue.
- A legacy 409 `tenant_key_missing` counts the whole queue as blocked (:1477-1479). Any other HTTP
  answer is `error`, and no answer at all is `offline` (:1480-1489).
- **Sign-out with work queued.** When `pending + blocked > 0`, a dialog offers "sync now", "log out
  anyway" and, only while `waitingForPlan > 0`, "discard waiting changes" (FE
  app/account-menu.tsx:102-108, :247-317, :262). "Log out anyway" **destroys** the queued writes
  (below), which is why the dialog exists.

**The indicator**
- It reads zustand `useSyncStatus`, whose fields are `phase`, `online`, `pendingWrites`,
  `blockedWrites`, `waitingForPlan`, `sealed` and `lastSyncedAt` (FE shared/offline/sync-status-store.ts:9,
  :56-75).
  - `lastSyncedAt` lives in memory only, so it is lost on a reload.
  - `runSync` writes the store (sync-client.ts:1353-1431, :1609), as do the worker's `online`/`offline`
    listeners.
- On screen it is the kit's `SyncStatusIndicator` (FE app/sync-status-indicator.tsx:4, :46-65), with
  `onSync` = a round plus `invalidateQueries()`.

**Service worker** (frontend/vite.config.ts:166-187, FE sw.ts)
- It uses `injectManifest` and `registerType: "prompt"`. The precache has a 4 MiB limit and leaves
  out pdf.js.
- `sw.ts` handles:
  - `precacheAndRoute` (:53) and a navigation fallback (:56-79);
  - the share target (:92-122);
  - `clientsClaim` (:208), with `skipWaiting` only on `SKIP_WAITING` (:212-216);
  - `push` (:229) and `notificationclick` (:298).
- It caches no API calls.
- The update shows as a toast with "Reload" (FE app/pwa-update-prompt.tsx:9-37).

**Privacy**
- The mirror, the outbox and the persisted cache are **plaintext at rest**. This is decided in FE
  shared/offline/record-crypto.ts:32-58: encryption happens at the wire, because writes have one choke
  point and reads have many.
- Three entities are E2EE on `/sync` (record-crypto.ts:277). Unlocked keys sit in `"keksdose-keys"`
  with a 12 h TTL, bound to the user (FE shared/crypto/key-store.ts:1-49).
- Sign-out (FE shared/state/auth-store.ts:123-145) locks the keys, clears the persisted cache and wipes
  the mirror **and the outbox, on purpose** (db.ts:339-349: "The OUTBOX goes too, and that is a
  decision"; auth-store.ts:57, :141-144).
  - A 401 keeps the mirror and the outbox (`wipeMirror: false`), but still clears the persisted cache
    and locks the keys (auth-store.ts:133-139).
  - Signing in as another user wipes everything first (`mirror_user_id`, :17, `forgetPreviousAccount`
    :47-66).
  - **A budget switch wipes the mirror and the outbox** (`onActiveBudgetChanged` →
    `clearMirrorForBudgetSwitch`, sync-client.ts:858-930, db.ts:355). It waits out a round in flight
    but does not push the queue first. kk treats the loss of queued, held or blocked writes on a
    switch as its own defect and fixes it in place (push first, or hold the switch while anything is
    queued). **The kit does not copy it.**
  - The stale-round guard has two layers: `bumpSessionEpoch()` within a tab (auth-store.ts:132,
    sync-client.ts:1495) and `MIRROR_GENERATION` across tabs (db.ts:211, `mirrorMoved`
    sync-client.ts:1206), so a round in flight cannot write into a wiped mirror.
  - The tenant comes from the server's active budget (BE sync_router.py:108), not from the request.
  - The persister keeps paused mutations on restore (query-client.ts:290).
  - The SW caches no `/api`, but answers `/local-api/*` from an open window (sw.ts:171-203).
- **One database for every user**, and no "shared computer" switch.

**Server** (BE)
- `POST /sync` is at adapters/api/sync_router.py:22, :85-170. `_refusal` (:40-82) builds the refusals,
  and without `refusals` the legacy 409/403/402 apply (:128-135).
- The schemas are in domain/schemas/sync.py:
  - `SyncChange` :10;
  - `SyncPageCursor` :20;
  - `SyncRequest` :57-89;
  - `SyncResponse` :122-162.
- The counter is `households.knowledge` per tenant (domain/models/household.py:24).
- `SyncMixin` (domain/models/base.py:42) carries `knowledge` (:65) and a client-owned `updated_at`
  (:68).
- A `before_flush` hook stamps `knowledge` under `FOR UPDATE` (infrastructure/sync.py:1-63, :207-208).
  `tombstone`, `bulk_tombstone` and a tombstone filter are at :42, :66 and :92.
- The paged pull is `pull_changes_page` with 2000 rows a page (sync_service.py:1401-1404). The round
  itself is `run_sync` (:1840).

**Already shared.**
- ui-kit: `SyncStatusIndicator` (src/shell/sync-status-indicator.tsx) and `isTransientRefreshFailure`.
- server-kit: `SyncRefusal` (billing/schemas.py:622).

**Sizes.**
- FE shared/offline is 6885 lines. Of that, sync-client is 1642, record-crypto 619, db 370 and
  write 238; the rest is entity readers and engines. FE shared/crypto adds 2162 lines.
- BE sync is 2526 lines, of which sync_service.py is 1986.

### 1.3 What kastlan has today

**Handover copy** (FE features/handover/offline/)
- It is one Dexie database per account and company, `kastlan-handover-<user>-<company>` (db.ts:78-86).
  The reasoning is at db.ts:3-12: "on a shared tablet nobody reads or sends another account's
  protocols, and signing out loses nothing: the queue waits for its owner".
- Its tables are `rows "[entity+id]"`, `outbox "++seq, [entity+id], status"`, `photos` and `meta`
  (db.ts:65-71).
- An outbox row carries `status: pending|sending|rejected|waiting` and `reason` (db.ts:24-37). Edits to
  one row merge into its last pending upsert (repo.ts:157-182).
- The round (sync.ts) sends `POST /sync {scope: "handover", last_knowledge, changes}` (:148-152).
  - `applyAnswer` lays the unsent changes back over the pulled rows (:94-125). The cursor is
    `meta.lastKnowledge` (:64, :122).
  - A 422 `"Change <id>: …"` refuses **the whole request** (review correction): `SyncRefusedError`
    (BE sync_scopes.py:44) aborts the round (sync_router.py:7). The client marks only the named
    change `rejected` and puts the rest back to `pending` (:155-170), so they go in the next round:
    one round per bad change.
  - The client sends **no `updated_at`**: `SyncChange` has no such field (BE
    domain/schemas/sync.py:11-21), and nothing in repo.ts, sync.ts or types.ts sets one.
  - The copy **keeps signatures on the device**: `signature_tenant`/`signature_inspector` are fields
    of the synced protocol (BE sync_scopes.py:72-73; FE types.ts:59-60). Signing at move-out without
    a connection is the point of the copy.
  - A 402 or a `refused` answer marks the changes `waiting` (:53-62, :95-99, :158-162).
  - Photos upload after their parents get a pk (:175-233).
- The controller (sync-controller.ts) polls every 30 s (:20), runs on `online`, and runs 800 ms after a
  change (:21, :92-98). Only one round runs at a time (:39-64), and practice tours pause it (:41). It is
  mounted at app/app-layout.tsx:85.
- The legacy `"kastlan-offline"` photo outbox (FE shared/offline/db.ts:31, sync-manager.ts) is only
  drained now. Nothing adds to it (the only `photos.add` is repo.ts:275).

**Elsewhere**
- The query client is in memory, with `staleTime` 30 s and `retry` 1. Its MutationCache sends a 402
  to the billing dialog (FE shared/api/query-client.ts:6-16).
- The PWA is Workbox `autoUpdate`, with the shell and locales precached and `/api` on the deny-list
  (frontend/vite.config.ts:28-67).

**Server sync** (BE)
- `POST /sync` (adapters/api/sync_router.py:28-63) is staff-only (:25). Within the route:
  - the scope's roles are checked (:38-39);
  - a demo may pull but not push (:35-37);
  - the company is pinned (:43);
  - a lapsed company's changes come back as a `SyncRefusal` while the pull still runs (:47-50).
- Scopes (domain/services/sync_scopes.py) hold **only `HANDOVER`** (:173, `SCOPES` :221), with the
  roles `MANAGER_WRITE`.
  - It reads 16 entities (:176-193).
  - Its write rules are per entity, with fixed parents and fields (`EntityRule` :147-160, :195-224).
  - A finalised protocol is refused (:249-307).
- The engine (domain/services/sync_service.py, docstring :1-23):
  - Its registry is **derived from the ORM**: every `SyncMixin` model syncs, with foreign keys
    translated through `sync_uuid` (:76-115).
  - `collect_delta` is at :219-264 and `apply_incoming` at :299-373.
  - `updated_at` is not a sync field (`_SKIP_COLUMNS` :44), and `TimestampMixin.updated_at` has
    `onupdate=func.now()` (domain/models/mixins.py:33), so **the last to arrive wins**.
- The counter is one database-wide `knowledge_counter` row (infrastructure/sync.py:35-76). It is
  stamped in `before_flush` (:79-99).
- `SyncMixin` (domain/models/mixins.py:44-62) is already on **51 model classes** (the draft's 52
  counted `class SyncMixin` itself),
  invoices, payments, leases, units, contacts, documents, journal entries and meters among them.
  Making them syncable costs no schema work.

**Versions and ETags.** There are none. 409 is used only for business conflicts:
- a second rent invoice for a month (invoice_service.py:163-164);
- a unit's second active lease (tenancy_service.py:102);
- an account number that exists (accounting_service.py:83).

**Companies and roles**
- RLS policy `tenant_isolation` on `app.current_company`, `FORCE`d (infrastructure/rls.py:37, :65-82).
  The `after_begin` hook sets it, and makes a demo's transaction `READ ONLY` (:142-161).
- The company comes from the JWT and is checked against membership (dependencies.py:136-141,
  :161-171).
- Switching companies (`POST /auth/switch-company`, adapters/api/auth_router.py:249-264) **mints new
  tokens**. The client clears the query cache (FE features/auth/hooks/use-auth.ts:24-30, :78-83), and the
  handover database changes by name (use-copy.ts:9-16).
- The roles are ADMIN, MANAGER, ACCOUNTANT and TENANT (domain/models/auth.py:17-21), held per company.
  The groups are in infrastructure/roles.py:13-23.

**Numbers, PDFs, QR bills, plans**
- Invoice numbers are `INV-YYYY-NNNNN` (domain/services/invoice_logic.py:68-70).
  - The next number is `MAX+1` per year under RLS, which makes it per company
    (adapters/persistence/finance_repository.py:228-246). It is unique on `(invoice_number, company_id)`
    (domain/models/finance.py:66).
  - The docstring wrongly says "global UNIQUE", and two creates at once can race.
  - **A number must come from the server, and without gaps.**
- PDFs are made on the server: LaTeX through `pdflatex` (domain/services/latex_renderer.py:59-103).
  - QR bills use segno and reportlab (domain/services/qrbill_service.py:71, :138-163).
  - The routes are `/invoices/{id}/qr-bill`, `/pdf` and `/send` (adapters/api/finance_router.py:227,
    :257, :275).
- Plan limits on units, seats and storage answer 402 `plan_limit` (billing_service.py:263-273). A
  lapsed company gets 402 `billing_read_only` (dependencies.py:273-284).

**Sign-out** (FE features/auth/stores/auth-store.ts:68-81)
- `forgetHandoverCopy` clears `rows` and `meta`. **The outbox and the photos stay for their owner.**
- The tokens, the remembered language, the appearance and the last page are cleared, and so is the
  query cache (use-auth.ts:85-88).
- Nothing on the device is encrypted. The refresh token is in localStorage (FE shared/api/client.ts:37).
- The server encrypts bank details, signatures and files at rest (BE infrastructure/at_rest.py:1-20).

**Sizes.**
- FE handover offline is about 1020 lines (repo 422, sync 244, sync-controller 113, db 97). FE
  shared/offline is about 375.
- BE sync is about 940 lines (scopes 401, service 373, infrastructure/sync 99, router 63).
- kastlan has 33 feature folders and 42 routers.

### 1.4 Kurvenschmiede stays online-only (confirmed)

**The online-only preset exists and KS uses it.**
- ui-kit 0.42 shipped `SyncStatusIndicator storage="none"` (src/shell/sync-status-indicator.tsx:101-108,
  :161-166; adopt-0.42.md:109).
  - It drops `pending`, `blocked` and `waitingForPlan`.
  - Offline reads "Offline — changes can't be saved until you reconnect".
  - A round reads "Saving…".
- KS's `AppSyncStatus` (frontend/src/app/top-bar-parts.tsx:104-121) passes `storage="none"
  hideWhenIdle` with no `onSync`, fed `{ phase: useIsMutating() ? "syncing" : "idle", online:
  navigator.onLine, pending: 0 }`.
- So it shows only offline and saving. (`error` cannot occur, because KS never sets that phase.)

**Nothing to build for KS.**
- KS keeps no content on the device: no persister, no outbox, no service worker
  (topbar-kurvenschmiede.md §7).
- Its `If-Match` versions stay its online concurrency.

**A doc fix only.** Top-bar §2.6/§6.9 describe KS's two states; top-bar §7's `SyncStatusIndicator`
props now name `storage` (`"device"` | `"none"`, the online-only preset). KS left no answer in the
reviews; re-checked at KS b54c16e (top-bar-parts.tsx:104-121: `storage="none" hideWhenIdle`, no
`onSync`), nothing in §1 asks anything of KS.

### 1.5 Decisions (settled)

**D1 One sync protocol, keksdose's; per-change rejections as a new field.**

Both apps already speak the same protocol: a `knowledge` cursor, `SyncMixin`, whole-row LWW for
upserts, tombstones and `SyncRefusal`. They differ in the details.

- kk's shapes become the shared ones: `SyncChange`, `SyncRequest` (`last_knowledge`, `changes`,
  `refusals`, `paged`/`page_cursor`), `SyncResponse` (`server_knowledge`, `changes`, `refused`,
  `page_cursor`) and `SyncPageCursor` (entity, knowledge, id). ka's `scope` is an optional field
  (kk has one scope). The models are open to subclassing, so kk keeps its extras (`fx_*`,
  `valuation_*`, `tenant_sealed`, `tenant_can_seal`) and ka its `pk`.
- **`refused` stays as it is**: one `SyncRefusal | None` for the whole push (`billing_read_only`,
  `read_only`, `demo_read_only`, …). kk's client reads it that way and blocks for good on an unknown
  code (sync-client.ts:1530-1546), so no per-change code goes into it.
- **Per-change refusals are a NEW field**: `rejections: list[SyncRejection]`, one
  `SyncRejection {change_id, code, detail}` per change (ka's outbox keeps a `reason` per row,
  db.ts:24-37; one `detail` for many ids would not fit). Codes: `rejected` (a scope rule: a fixed
  field, a finalised protocol, an entity not writable in the scope) and `plan_limit` (ka's photos
  over the plan, today's 402 `planRefusal`, sync.ts:158-162). It defaults to `[]`, so kk's client
  is untouched; kk may later move its silent drops and repair echoes onto it.
- ka sends `refusals: true` and reads `rejections`. A scope-rule violation no longer aborts the
  round (`SyncRefusedError`, sync_scopes.py:44): the other changes apply, each bad one comes back
  with its own `detail`, and the one-round-per-bad-change loop goes.
- **The old `/sync` shape stays accepted for one release** (D8 keeps old bundles alive longer): a
  request without `refusals` or `updated_at` gets ka's 422 and server-now as today. The release
  after 0.45's adoption removes it.

**D2 Merge rule: the latest edit time wins; deletes tombstone unconditionally.**

Under ka's rule an edit made offline in the morning and synced at night overwrites an office edit made
at noon; "last to arrive" is wrong as soon as a second scope exists.

- **Upserts:** whole-row LWW on the device's edit time. `SyncChange.updated_at` (optional, an
  instant with a zone) is a **wire change** for ka, which sends none today (§1.3). The server keeps
  its copy only when strictly newer and echoes the loser in the same round.
- **A future stamp is clamped** to the server's now (tablets' clocks drift; tours §10.2.3 clamps
  the same way).
- **An older client** that sends no `updated_at` falls back to server-now, today's ka rule, for one
  release (D1).
- **Deletes tombstone unconditionally** (keksdose's correction, sync_service.py:1129-1180): no
  comparison, the tombstone is stamped server-now and moves `updated_at` forward, so an older upsert
  cannot revive it. An older offline delete beats a newer edit; that is accepted.
- ka's client stamps `updated_at` on each local edit, including an edit merged into the pending
  upsert (repo.ts:157-182), so the latest keystroke's time wins. ka's server sets `updated_at`
  explicitly on every synced write, or `onupdate=func.now()` (mixins.py:33) stamps server time again.
- kk changes nothing: its queued upserts carry the client stamp, and its REST, import and job writes
  stay server-now. The kit never requires a client stamp on every write.
- **No conflict dialog** (kk has none). The server's per-scope rules refuse what must not be
  overwritten: ka's `EntityRule` fixed fields, and a finalised protocol (sync_scopes.py:249-307). A
  signed protocol is never overwritten by either rule.
- The cost in ka is **S–M**: nothing in tests/integration/test_sync.py or
  tests/api/test_sync_handover.py asserts `updated_at`; `applyAnswer` (sync.ts:94-125) already lets a
  losing echo replace the row.

**D3 No `If-Match` on the outbox.**

A queued write carries the whole row and the edit time, not a version. ka's online REST writes stay as
they are (no ETags). KS's version contract stays KS's.

**D4 kastlan's offline scope.**

- **Reads offline (P1, 0.45): everything a staff role has opened**, through the persisted query
  cache (kk's policy). That gives estates, buildings, units, leases (who, since when, the rent),
  tenants and contacts, meters, maintenance, documents (the list, not the files), the invoice and
  payment lists, and the dashboard. The cache holds only what the role was allowed to fetch.
  - Denied keys: admin, platform, billing, translations, the assistant, report bodies, bank
    accounts.
  - **A scrub list, not a dropped root** (ka's correction): IBANs sit inside payloads that are
    wanted offline. Before a query is persisted the fields `iban`
    (`ContactDetailResponse.bank_accounts[]`, BE domain/schemas/contact.py:161, :184-188),
    `qr_iban` (schemas/property.py:68, :83, :94), `default_qr_iban` (:24) and `signature_*`
    (the protocol's online detail, schemas/handover.py:232, :241) are removed. A page restored
    offline shows such a field as "Needs a connection".
- **Writes offline:** `handover` as today. `maintenance` (tickets, unit defects, notes), `meters`
  (readings outside a protocol) and `contacts` (phone, e-mail, notes) come in P4, each a `SyncScope`
  over models that are already `SyncMixin`. **Owner meetings** (votes and minutes in the meeting
  room, domain/models/owner_meeting.py:72-137, already `SyncMixin`) are a **P4 candidate**, for
  Marcel to decide in that round.
- **Online only**, where the button says "Needs a connection" and nothing is queued (agreed by ka,
  lease edits included):
  - anything that **numbers or moves money**: invoices (the gapless per-company number), payments,
    QR bills, dunning, journal entries, deposits, service-charge statements, rent increases,
    mortgages, bank accounts (IBAN);
  - anything that **makes a PDF or sends mail**: invoice, lease and dunning PDFs, `/send`;
  - **lease** create, end and change (the one-active-lease 409, tenancy_service.py:102; deposits;
    the lease is signed and numbered in the office);
  - **units** create (the `plan_limit` 402);
  - users, roles, invitations, company settings, billing, the platform console, translation review
    and feedback;
  - **switching company**, which mints tokens on the server. Offline, the switcher says "Needs a
    connection" and the app stays on the current company's copy.
- **Issued PDFs are not cached offline** (decided by default: no review asked for them).

**D5 Device stores: per account and company in ka; kk keeps its single mirror.**

- **ka:** the Dexie database and the persisted query cache key carry
  `<app>-<kind>-<user>-<company>`, as the handover copy already does (db.ts:78-86). The company switch
  changes the persister's key: no wipe and no cross-company leak, and the persisted part needs no
  `queryClient.clear()` (use-auth.ts:24-30).
- **kk keeps its single mirror and `mirror_user_id`.** Per-household databases would not cure the
  switch loss (the server pins the tenant to the active budget, so household A's outbox drains only
  in A); a guest's mirror is the host's household, so they would multiply copies on shared devices;
  the sealing-gate hold and `MIRROR_GENERATION` are built around one database; and moving an outbox
  between databases is the riskiest migration kk could ship. Revisit only with a tenant field on
  `/sync`. kk does take **the per-account persisted-cache key** (one dropped cache).
- The **knowledge counter** stays ka's **database-wide row** (Q5). Under RLS the pull filters by
  company anyway; a per-company counter would cost a migration and a full re-pull on every device.
  Accepted leak: a jumping cursor shows other companies' write volume. The kit's counter is a port
  (§1.6): kk counts per household.

**D6 Sign-out and the shared computer: per app.**

- **ka:** sign-out clears the persisted query cache and the mirror rows; the outbox and photos
  **stay for their owner** (auth-store.ts:68-80). The kit's `SignOutPendingDialog` shows only on an
  **explicit** sign-out (top-bar.tsx:104, sessions-card.tsx:38), never in the session-ended hook
  (auth-store.ts:170-174), which can't ask anyone. Its words say the changes stay on this device for
  their owner. Signing in as someone else does not touch another account's outbox (it lives in that
  account's own database); persisted caches older than `maxAge` are removed at sign-in.
- **kk keeps its warn-and-wipe:** "Log out anyway" destroys the queue (db.ts:339-349), and the
  persisted cache is always cleared (auth-store.ts:139). kk's copy must **not** say "your changes
  stay on this device".
- **"This is a shared computer"** (ka, P1): a choice at sign-in that **persists nothing**: the query
  persistence is not mounted and the cache lives in memory only, as today. The handover copy is
  ka's field tool on tablets and keeps its own rule (rows go at sign-out, the outbox waits for its
  owner).
- **The tour `:pending` record** (tours §10.2.4, `<storageKey>:pending`) is not the app's outbox: it
  stays out of any "N waiting" count and out of the sign-out guard, in kk and in ka, on purpose
  (losing a tour mark is acceptable). `signOutTourProgress` keeps it for its owner.

**D7 Plaintext at rest, with a scrub list (kk's decision).**

- Follow record-crypto.ts:32-58: plaintext on the device, encryption at the wire where an app has it.
- The **query cache** never persists the scrub list: `iban`, `qr_iban`, `default_qr_iban`,
  `signature_*` (D4), and never files.
- **Signatures in ka's handover copy stay, by design**: signing at move-out without a connection is
  the point of the copy, and they leave the device once synced. The scrub applies to the query
  cache, not to the sync store.
- The 24 h `maxAge`, the wipe on sign-out, and the shared-computer choice.
- kastlan's server-side encryption (at_rest.py) is unchanged.

**D8 Service worker: the update prompt (kk), not autoUpdate.**

- ka moves to `registerType: "prompt"` with the kit's `PwaUpdatePrompt`. `autoUpdate` with
  `clientsClaim` (vite.config.ts:31, :62) can reload in the middle of a drawn signature or a tour.
- **The prompt waits while a handover is open or a tour runs** (`hold`), as the sync controller
  already pauses for tours (sync-controller.ts:41). It never shows mid-handover or mid-tour.
- ka keeps Workbox `generateSW` (it has no push yet; notifications decision 9). No API caching in
  either app.
- Because old bundles live longer, every `/sync` shape change keeps the previous shape for one
  release (D1, D2).

**D9 The indicator (P3).**

- Once ka syncs more than handovers, its indicator drops the handover `scope` words (top-bar §6.10)
  and `hideWhenIdle`, and is always shown as in kk.
- Both apps store `lastSyncedAt` in `meta` after a good round, so it survives a reload (a small
  change in kk; ka has none, sync.ts:122).
- The legacy `"kastlan-offline"` photo outbox is only drained (FE shared/offline/sync-manager.ts); P3
  deletes it after one release of draining.

### 1.6 What each kit ships

**server-kit 0.15 `eifi1_server_kit.sync`** (P2; layer 1 + a small layer 2). Size **M**.
- `schemas`: `SyncChange` (+ optional `updated_at`), `SyncPageCursor`, `SyncRequest` (`scope`
  optional), `SyncResponse` (`refused` unchanged, `rejections` new), `SyncRejection`. `SyncRefusal`
  moves here and stays re-exported from `billing`. All open to subclassing.
- `mixin`: the `SyncMixin` columns (`knowledge`, `deleted_at`, a client-owned `updated_at`; the key
  column is the app's: kk `id`, ka `sync_uuid`), kk's `before_flush` loop (infrastructure/sync.py:
  141-186: stamp server-now only when `updated_at` was not set), `tombstone`, `bulk_tombstone`,
  `bulk_restamp` and the `INCLUDE_TOMBSTONED` filter.
- **The counter is a port**: `KnowledgeCounter.bump(session, tenant_id) -> int`, synchronous, called
  inside `before_flush` under `no_autoflush` with a row lock (kk :45-63), plus `tenant_of(obj)`. ka
  ignores the tenant (one row).
- `merge`: `merge_lww(existing_updated, incoming_updated, *, now) -> bool` (strictly newer keeps the
  server's, a future stamp clamped, none → now) and `merge_delete`, which always tombstones (D2).
- `paging`: the (entity, knowledge, id) page cursor (kk's LP-3 fix).
- **Stays in the apps:** kk's household tenancy and FORCE RLS, E2EE and re-seal, key custody, billing
  refusals (`_refusal`), `_UNIQUE_KEYS`/remaps, revival rules, transfer cascades and trades, fx and
  valuations, the budget switch; ka's ORM-derived registry and `sync_uuid` foreign keys, the photo
  upload, finalising, and `SyncScope`/`EntityRule` (they move to the kit with P4's second scope, if a
  second app wants them).

**ui-kit 0.45 `@eifi1/ui-kit/offline`** (P1; a new subpath, with `@tanstack/react-query`,
`@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister` and `idb-keyval`
as optional peers). Size **S–M**.
- `createQueryPersistence({ app, user, company?, shouldPersistKey, denyRoots?, scrubFields?,
  onUnsafe?, buster, maxAge })` → `{ key, persistOptions, clear(queryClient), removeStale() }`:
  - `shouldPersistKey(key)` beside `denyRoots` (kk denies one whole key, `accounts.fxContext`, and
    any key whose second segment is `"admin"`, query-client.ts:130-142);
  - the scrub list applied before a query is persisted (`DEFAULT_SCRUB_FIELDS`: `iban`, `qr_iban`,
    `default_qr_iban`, `signature_*`), recursively;
  - `isCacheSafe` with a pluggable warn hook (`onUnsafe`, kk :165-191), the guard on write
    (`shouldDehydrateQuery`) and the restore-side sanitizer that keeps paused mutations (kk :264-298);
  - the per-account key (D5); `clear()` = `queryClient.clear()` plus `removeClient` (kk :302);
    `removeStale()` drops other keys of the app older than `maxAge` (ka, at sign-in).
- `SignOutPendingDialog({ open, queued, waitingForPlan, onSyncNow, onSignOutAnyway,
  onDiscardWaiting?, keepsChanges, extra?, labels? })`: `queued` = pending + blocked; `onSyncNow`
  is async, closes and re-evaluates without signing out; "Discard waiting changes" only with
  `onDiscardWaiting` and `waitingForPlan > 0`; `keepsChanges` picks the words (ka: they stay for
  you; kk: they will be lost); `extra` is room for the billing kit's `waitingChanges` line. Seven
  languages.
- `PwaUpdatePrompt({ needRefresh, onReload, onDismiss?, hold?, labels? })`: kk's toast with
  "Reload"; while `hold` it waits (D8). Seven languages.
- `SharedComputerChoice` (a labelled checkbox for the sign-in form) with
  `isSharedComputer()`/`setSharedComputer(on)`, held in `sessionStorage`, so the choice itself
  outlives no tab. Seven languages.
- **P3, later:** `createSyncEngine`, `useSyncWorker`, `useSyncStatus()`, `readLocalFirst`/
  `isOfflineError`, and leaf utilities both apps can share (`stampAfter`, the generation guard).
  kk does not adopt the engine ("not for keksdose unless proven", P4).
- **Stays in the apps:** entity tables and indexes, local engines, crypto, and kk's `sw.ts` (push,
  share target).

### 1.7 Per app, and the phases

| Phase | ui-kit / server-kit | keksdose | kastlan | KS |
|---|---|---|---|---|
| **P1 offline reads (0.45)** | ui-kit `createQueryPersistence`, `SignOutPendingDialog`, `PwaUpdatePrompt`, `SharedComputerChoice` (S–M) | moves its policy onto the kit helper, per-account key, dialog with `keepsChanges={false}` (S) | persisted cache + scrub list; "Needs a connection" on online-only actions; shared-computer choice; prompt SW (M) | none |
| **P2 protocol (0.45)** | server-kit `sync` (M) | imports the schemas, mixin, counter port and merge (S–M) | D1 shapes, `rejections`, D2 edit time (wire), `refusals: true`; old shape kept one release (M) | none |
| P3 engine (later) | ui-kit `createSyncEngine`, `useSyncWorker` (L) | — | the handover copy onto the kit engine; `lastSyncedAt`; the indicator always shown; legacy outbox retired (M) | none |
| P4 more scopes (later) | `SyncScope`/`EntityRule` into server-kit if shared | not for keksdose unless proven | `maintenance`, `meters`, `contacts`; owner meetings a candidate (M) | none |

kk also fixes its budget-switch outbox loss in place (§1.2), outside the kit.

### 1.8 Marcel's answers (2026-10-19)

1. **D2:** yes, the latest edit time wins, sent by the device (a wire change); older clients fall
   back to server-now for one release; future stamps clamped; deletes tombstone unconditionally.
2. **D4:** offline writes: handover now; maintenance, meters, contacts in P4; owner meetings a P4
   candidate. Lease and tenant edits stay online (a tenant's phone/e-mail is `contacts`).
3. **D4:** issued PDFs are not cached (decided by default).
4. **D6:** yes, a "shared computer" choice at sign-in that persists nothing. Sign-out stays per app.
5. **Counter:** ka keeps its database-wide row.
6. **D7:** plaintext like kk, with the scrub list; signatures in the handover copy stay.
7. **kk and the engine:** P1 and P2 only; no `createSyncEngine`, no per-household databases.
8. **Scope of 0.45:** phases 1 and 2; later phases in following rounds.

### 1.9 Where each review answer went

| Review | Point | Where |
|---|---|---|
| ka 1 | 51 classes; no `updated_at` on the wire; the 422 refuses the whole request; signatures in the copy | §1.3, D2, D7 |
| ka 2 | offline pages; owner meetings; lease edits online; scrub fields, not roots | D4 |
| ka 3 | the cost of D2; clamp; old clients | D2 |
| ka 4 | per-change reasons as a list; `plan_limit` | D1 (`rejections`) |
| ka 5 | per-company key; outbox kept; dialog on explicit sign-out only; shared computer; `signature_*` | D5, D6, D7 |
| ka 6 | the prompt; old `/sync` shape one release; wait during handover/tour | D8, D1 |
| ka 7 | database-wide counter | D5 |
| ka 8 | the legacy outbox retired after draining | D9 |
| kk 1 | deletes unconditional; server clock online; `stampAfter`; sign-out wipes the outbox; the budget switch; per-row rejections; smaller points | §1.2, D2, D6 |
| kk 2 | the helper's and the dialog's props | §1.6 |
| kk 3 | single mirror + `mirror_user_id` | D5 |
| kk 4 | what moves; the counter port; `merge_lww` with unconditional deletes | §1.6, D2 |
| kk 5 | P1+P2 only; the engine not for kk | §1.6, §1.7 |
| kk D1 | `refused` unchanged, a new field | D1 |
| KS | no answer; online-only re-checked at b54c16e | §1.4 |
| tours §10.2.4 | the `:pending` record outside "N waiting" and the sign-out guard | D6 |
