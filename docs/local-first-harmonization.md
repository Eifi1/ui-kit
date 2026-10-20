# Local-first — harmonisation plan

**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.
**§1 (round 0.45) settled 2026-10-19** (Marcel, after the kastlan and keksdose reviews in
audits/round-046/reviews.md; §1.8–§1.9). Phases 1 and 2 are built for ui-kit 0.45 / server-kit 0.15;
phases 3 and 4 follow in round 0.46. **§2 (round 0.46) settled 2026-10-19** (Marcel, "As reviewed", after the
kastlan and keksdose reviews in audits/round-047/reviews.md; §2.9): the sync engine (P3) and all five offline
scopes (P4), for ui-kit 0.46 / server-kit 0.16.

| § | What | Status |
|---|---|---|
| 1 | kastlan local-first like keksdose; KS stays online-only; what the kits lift | **SETTLED (round 0.45)**: P1+P2 in ui-kit 0.45 / server-kit 0.15 |
| 2 | The sync engine in ui-kit (kastlan the user); `SyncScope`/`EntityRule` in server-kit; kastlan's meetings, meters, maintenance and contacts scopes | **SETTLED (round 0.46)**: P3+P4 in ui-kit 0.46 / server-kit 0.16 |

## 1. kastlan becomes local-first — SETTLED (round 0.45)

**Settled 2026-10-19** (Marcel, after the kastlan and keksdose reviews in
audits/round-046/reviews.md; §1.9 records where each answer went, and the reviews' corrections
are folded into §1.2, §1.3 and §1.5–§1.7). **Phases 1 and 2** (§1.7: the persisted offline cache
with its scrub list, and the shared sync protocol) are built for **ui-kit 0.45 / server-kit 0.15**.
Phases 3 and 4 are §2, built for ui-kit 0.46 / server-kit 0.16. Drafted at kk `feat/feedback-loop-80-424-434` deaf428d, ka
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
- **The device clock's skew is corrected** (amendment, round 0.46, Marcel 2026-10-19; server-kit
  0.16.0). The clamp caught a FAST clock only past the server's now; a SLOW clock's edits counted as
  older than they were, so a colleague's earlier edit that arrived first silently replaced a later
  one (ka's handover tablets). Every push now carries `SyncRequest.client_now`, the device's clock
  when it SENDS the push (an instant with a zone, spelt as `updated_at`), and the server shifts
  every change's stamp of that push by `server_now - client_now` before LWW and the clamp
  (`clock_skew`, once per push; `merge_lww(…, skew=)`, `clamp_stamp(…, skew=)`). Slow and fast
  clocks are both corrected, on the assumption that the device's clock did not change between the
  edit and the push. Skew within 2 s is latency and ignored (`CLOCK_SKEW_TOLERANCE`); the
  correction is capped at 24 h either way (`MAX_CLOCK_SKEW`: a clock off by more likely changed in
  between, and the clamp still applies). **The client's duty:** send `client_now` on every
  `/sync` push, read fresh for each request, retries included. A push without it is corrected not
  at all (0.15.0's clamp alone). The server's stored `updated_at` is already corrected and is
  never shifted. Handover tablets should still set their time automatically (network time): the
  correction cannot see a clock that was changed between the edit and the push.
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
  **0.16.0** (amendment, round 0.46): `SyncRequest.client_now`, `clock_skew(client_now, *, now)`,
  `correct_stamp(stamp, *, skew)`, `CLOCK_SKEW_TOLERANCE` (2 s), `MAX_CLOCK_SKEW` (24 h), and an
  optional `skew=` on `merge_lww` and `clamp_stamp` (default none: 0.15.0's behaviour).
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
  `isSharedComputer()`/`setSharedComputer(on, {storage?})`. The choice lives as long as the
  session it governs: `sessionStorage` by default, `localStorage` (`storage: "local"`, cleared
  with `setSharedComputer(false)` at every end of the session) for an app whose refresh token
  outlives the tab (kastlan; round-046 B3). Seven languages.
- **0.46, from the 0.45 adoptions (kastlan K1–K4):**
  - `createQueryPersistence({ …, persistMutations? })`: default `true` (kk: paused mutations wait
    in TanStack's queue across a reload). `false` writes no mutation and drops any an older build
    wrote on restore — for an app whose offline writes go through its own outbox (ka's Dexie
    outbox), instead of overriding `persistOptions.dehydrateOptions` by hand.
  - `removeStaleQueryCopies(app, maxAge, { storage?, keep? })`: `removeStale` without a
    persistence, for the sign-in page. A session that ends with no user known (ka: the refresh
    token refused at boot) cannot name its key for `clear`; the sign-in page sweeps that copy
    once it is older than `maxAge`, instead of waiting for someone's next sign-in.
    `persistence.removeStale()` is this with `keep` = its own key.
  - `createServiceWorkerUpdates(registerSW)` → `{ start, needRefresh, subscribe, reload, dismiss }`
    and `useServiceWorkerUpdate(updates)` → `PwaUpdatePrompt`'s `{ needRefresh, onReload,
    onDismiss }` (D8). The app passes `registerSW` from `virtual:pwa-register` and calls `start()`
    once in `main.tsx`, before the router: an app whose prompt sits in the signed-in shell
    (`useRegisterSW` registers when that component mounts) would otherwise register only after
    sign-in, and a first visit's sign-in page would have no offline shell (ka's
    `shared/pwa/sw-update.ts`, now the kit's).
  - The write lock's `"offline"` kind (main barrel): `OFFLINE_LOCK`, `COMMIT_EXCEPT_OFFLINE` and
    `useOfflineWriteLock(offline, labels?)` → a `combineWriteLocks` source with
    `writeLock.offline` ("Needs a connection.", seven languages). The online-only actions above
    are commits under it; a control that writes to the device's copy takes
    `commit={COMMIT_EXCEPT_OFFLINE}`. The app reads the connection itself.
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
| P2 amendment (0.46) | server-kit 0.16.0: `client_now`, the clock-skew correction (S) | optional: its queued upserts carry device stamps too; sends `client_now` once its merge uses the kit's (S) | sends `client_now` on every `/sync` push; passes the skew to `merge_lww` / `clamp_stamp` (S) | none |
| P3 engine (0.46, §2) | ui-kit `/sync`: `createSyncEngine`, `useSyncWorker` (L) | — | the handover copy onto the kit engine; `lastSyncedAt`; the indicator always shown; legacy outbox drained one more release (D17) (M) | none |
| P4 more scopes (0.46, §2) | server-kit `sync.scopes`: `SyncScope`/`EntityRule` (M) | not for keksdose unless proven | `meetings`, `meters`, `maintenance`, `contacts` (L) | none |

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

## 2. The sync engine and more offline scopes — SETTLED (round 0.46)

**Settled 2026-10-19** (Marcel, "As reviewed", after the kastlan and keksdose reviews in
audits/round-047/reviews.md "Local-first §2"; §2.9 records Marcel's answers and where each review
point went, and the reviews' corrections are folded into §2.1–§2.7, re-checked at ka
`feat/kit-0.45` 26a2eaa and kk `feat/feedback-loop-80-424-434` 2cb460c1). **P3 and all five P4
scopes** are built for **ui-kit 0.46 / server-kit 0.16**.

As drafted: Marcel, 2026-10-19 (audits/round-047/brief-047.md "Scope
extension"; postponed.md D1, D2): "Local-first P3 (the shared sync engine in ui-kit, kastlan the
user; keksdose won't adopt) and P4 (more offline scopes: `SyncScope`/`EntityRule` into
server-kit; owner meetings (votes, minutes) IN) go into 0.46." It builds on §1 as settled: D1–D9,
P1/P2 as shipped in ui-kit 0.45 `/offline` (+ the 0.46 additions, §1.6) and server-kit `sync`
0.15 + 0.16.0's clock-skew correction (D2 amendment). Drafted at ka `feat/kit-0.45` 26a2eaa
(its 0.45 adoption, not pushed), kk as in §1, ui-kit `feat/0.46.0` d9b8779, server-kit
`fix/0.15.1` a264f7f (0.16.0, not tagged). In ka, FE = `frontend/src`, BE = `kastlan`, HO =
FE `features/handover/offline`.

Nothing here changes the `/sync` wire except new `scope` values in ka and ka opting into
`paged` (both already in the kit's shapes, §1.6). kk and KS change nothing.

### 2.1 Where kastlan stands (what the engine replaces)

**The client** (HO, about 1020 lines; FE shared/offline about 375)
- **Store:** one Dexie database per account and company, `kastlan-handover-<user>-<company>`
  (HO/db.ts:81-89): `rows [entity+id]` (a row is `{entity, id, pk, data}`, :16-21), `outbox
  ++seq, [entity+id], status` (:24-40, status `pending|sending|rejected|waiting` + `reason`),
  `photos` and `meta` (:68-74). The outbox has **no scope** field: one scope exists.
- **Writes:** `write()` (HO/repo.ts:157-185) puts the row and queues it in one transaction. A new
  edit merges into the row's last `pending` upsert (not into one `sending`); deleting a row that
  never reached the server just forgets its queue (:164-170). Each change is stamped
  `new Date().toISOString()` (:171, :177): **not** `stampAfter`, so a clock stepping back can stamp
  a merged edit earlier than the one it replaces.
- **The round** (HO/sync.ts): `takeQueue` resets a stale `sending`, takes `pending` + `waiting`
  in `seq` order and marks them `sending` (:152-160). `pushAndPull` posts `{scope: "handover",
  last_knowledge, changes, refusals: true}` (:170-182). It sends **no `client_now`** yet (the
  0.46 adoption adds it, adopt-0.46.md:126) and **no `paged`**. `applyAnswer` (:107-147) in one
  transaction: deletes the applied `seq`s, marks `refused.change_ids` `waiting` and each
  `rejections[]` entry `rejected` with its `detail`, puts the pulled rows, lays the unsent changes
  back over them, and writes `meta.lastKnowledge` (:144). The 422 parser and its 20-attempt loop
  (:88-95, :166) serve a server that no longer answers that way (ka's server reads `refusals`,
  BE adapters/api/sync_router.py:57-58).
- **Errors:** no answer or a transient refresh 401 = offline (:81-85); a 402 with a plan code =
  every change `waiting` (:68-74, :188-192); anything else throws, and the controller shows
  `failed` (HO/sync-controller.ts:55-56). No backoff: the next try is the 30 s poll.
- **Photos** are a second step: uploaded once their room (and defect) has a `pk`, `PUT
  /handover-photos/by-uuid/{id}`, then a second push/pull if any went up (HO/sync.ts:205-263).
- **The controller** (HO/sync-controller.ts) is a module singleton: a round on target change, every
  30 s (:20), on `online`, 800 ms after a change (`requestSync` :92-98); one at a time, a request
  during a round runs once more (:42-45, :59-62); paused while a practice tour runs
  (`deviceSyncPaused`, :41; FE shared/offline/sync-pause.ts:8-16).
- **No generation guard.** `run()` captures `target` (:50) and finishes its round after the target
  changes; `forgetHandoverCopy` (HO/db.ts:94-100) clears `rows` and `meta` at sign-out, so a round
  in flight at sign-out can write the pulled rows and `lastKnowledge` back into the cleared copy.
  kk guards this with `bumpSessionEpoch` + `MIRROR_GENERATION` (§1.2). The engine fixes it.
  (Confirmed by ka's review: the company's data then stays on the device until the next
  sign-out; no other account reads it, the database being per account and company.)
- **The shared computer does not stop the copy.** Only the query cache checks
  `isSharedComputer()` (FE shared/offline/query-persistence.ts:46); the handover copy and its
  queue run on a computer marked shared too. D15 changes that.
- **Status:** FE shared/offline/use-sync-status.ts:18-53 adds the handover outbox and photos
  (`useLive` counts) to the legacy photo queue's (`syncManager`, FE shared/offline/sync-manager.ts)
  into the kit's `SyncStatus`; `lastSyncedAt` is not kept (D9). The legacy queue is only
  drained since v0.12.0 (ac5f542, tagged 2026-10-08), and **prod runs v0.11.0** (the last Deploy,
  run 37601185934, about 2026-10-07): a v0.11.0 device may still hold photos in `kastlan-offline`
  (D17). The top bar shows it with
  `hideWhenIdle` and the handover `scope` words (FE app/top-bar.tsx:177-185).
- **Sign-out** asks through the kit's dialog with `keepsChanges` (FE
  shared/offline/use-sign-out-guard.tsx:13-37).
- **Reads:** `useLive` (HO/use-copy.ts:29-49) wraps Dexie `liveQuery`. The handover pages read the
  copy only; every other page reads the server through the persisted query cache (P1).

**The server** (BE about 940 lines)
- `SyncScope {name, roles, readable, writable: {entity: EntityRule}}` and `EntityRule {model,
  create, update, deletable, fixed_parents, fixed_fields}` (BE domain/services/sync_scopes.py:151-175);
  one scope, `HANDOVER` (:178-224), roles `MANAGER_WRITE` (BE infrastructure/roles.py:21).
- `sort_changes` (:254-274) turns each `SyncRefusedError` of `check_changes` (:277-335) into a
  `SyncRejection`, and refuses a change whose parent was refused. `check_changes` mixes the
  generic checks (writable, deletable, the create/update schema, references in the company, fixed
  parents and fields) with handover's own (a finalised protocol, a reading in the protocol's unit,
  a signature before finalising). `after_apply` (:418-430) runs what finalising runs online.
- The pull is `collect_delta(session, last_knowledge, scope.readable)` (BE
  domain/services/sync_service.py:224-255): **every changed row at once, unpaged**, every column
  but `_SKIP_COLUMNS` (:44, registry :78-117).
- **Finding: the handover copy holds an estate's QR-IBAN in plaintext.** `estates` is readable in
  `HANDOVER` (sync_scopes.py:192), and `Estate.qr_iban` (BE domain/models/property.py:137,
  `EncryptedText`, decrypted on load) is a plain column to the registry, so every estate's QR-IBAN
  is pulled into the device's Dexie copy. D7 keeps the scrub list out of the query cache only;
  nothing withholds a field from `/sync`. (Confirmed by ka's review through the ORM registry:
  `_specs()["estates"].fields` holds `qr_iban` with the account holder and address.) The two
  other IBAN columns do not reach the copy
  (`bank_accounts` is not readable in the scope; `management_companies` is not `SyncMixin`).
  §2.4 D14 closes it.

### 2.2 Decisions (settled)

**D10 The engine is kastlan's handover client, generalised; keksdose's SERVER rules and wire
shapes are canon, its client policies stay its own.** (Narrowed at the settle, kk's review.)
- ka's client is the starting point: it already speaks the D1 shapes, keeps a reason per row,
  keeps `waiting` changes and lays unsent changes over a pull. From kk it takes what has no
  conflict: the server rules (§1.2: deletes unconditional, `merge_lww` with the server copy kept
  only when strictly newer, a pushed stamp clamped to the server's now, REST server-stamped), the
  wire shapes (`paged`, `page_cursor`, `refusals: true`, D1), the generation guard, `stampAfter`,
  the paged pull with its cursor moved only at the end, `isOfflineError`.
- **kk's client policies are not the engine's and are not options of it**; kk keeps them in its
  own client, and the engine's are ka's:

  | Policy | keksdose (its client) | the engine (ka's) |
  |---|---|---|
  | a new write to a queued row | append-only, every write its own `db.outbox.add` (FE shared/offline/sync-client.ts:546) | merged into the row's last `pending` upsert; a never-synced row's delete forgets its queue |
  | a stuck change | an earlier held write holds the row's tail (:1428-1440) | per change (`waiting`/`blocked`/`rejected`), later changes to the row go out |
  | `refused` | one refusal for the whole push, nothing applied, the whole queue kept (:1551-1567); no per-change status (FE shared/offline/db.ts:32-39) | per change, by code (`holdCodes`) |
  | billing hold | `HELD_FOR_PLAN`: nothing sent, rounds only pull, until `releaseHeldChanges` (:1002) or `discardWaitingChanges` (:1023) | `waiting`, re-sent each round |
  | other refusal codes | `read_only`/`demo_read_only` kept, phase error, not counted blocked; any other code counted blocked and re-sent on the next kick or 30 s tick; no `retryBlocked()` | `blocked`, kept, sent on `retryBlocked()` |
  | after a write | `kickSync()` at once | `requestSync()`, 800 ms debounce |
  | sign-out | warn and wipe the outbox (FE shared/offline/db.ts:339-349) | `forget({keepQueue: true})`, a deliberate exception (D15, D6) |
  | errors | no backoff (30 s worker plus `kickSync`) | capped backoff (D13, additive) |
  | `lastSyncedAt` | in memory only (zustand `markSynced`, FE shared/offline/sync-status-store.ts:14, :72-73) | in `meta` (D9) |
- **Rec (settled):** the engine owns a **generic store** (`rows`, `outbox`, `meta`; the app adds its
  own tables, such as ka's `photos`), not kk's per-entity tables. kk does not adopt (§1.8 7).
- **Keep the wire additive** (kk's review): kk's own `SyncRequest` (BE domain/schemas/sync.py:57-90)
  has no `scope` or `client_now` and ignores extra fields; its `SyncResponse` keeps `refused` and
  `rejected`. §2 adds `scope` values, the optional `client_now` and the server-only `withheld`,
  renames nothing and makes nothing required. If kk ever takes server-kit's response model,
  `rejected` stays.

**D11 One request per scope, a cursor per scope, all in one round.** (Q1; ka agreed.)
- A round sends one `POST /sync` per scope the person's role holds, in a fixed order, each with
  its own `last_knowledge` (`meta` key `lastKnowledge:<scope>`; ka's existing `lastKnowledge`
  becomes handover's). An outbox row carries the scope it was written in.
- **The order (ka's): handover, meetings, meters, maintenance, contacts**: the two where the
  connection is worst first, contacts (the least urgent writes) last.
- **The caller names the scope.** `write(scope, …)` never infers it from the entity: a meter
  reading's scope comes from its row (`handover_protocol_uuid` set: `handover`; null: `meters`). A
  reading moved into or out of a protocol is a delete in one scope and a create **with a new id**
  in the other, never an update across them: reusing the id makes the create find the tombstone
  (`find` includes tombstones), validate as an update, and the fixed `handover_protocol_uuid`
  refuses it (kastlan build review 2, S8).
- Why not one request with several scopes: that is a wire change (`scope: str`, D8's one-release
  rule) and needs a per-change scope on the server anyway, because one entity can have different
  rules per scope (`meter_readings`).
- Cost: up to five requests a round. A scope with nothing queued and nothing new answers with an
  empty pull; the counter is database-wide (D5), so rows another scope already pulled are pulled
  again (an idempotent `put`).
- A scope the role gained starts at cursor 0 (one full pull). A scope the role lost answers 403:
  its queued changes become `rejected` with "Not allowed to sync <scope>", and the scope leaves the
  round. `scopes()` is read per round, since roles are per company.
- Keep ka's one database and its name; Dexie v2 adds the `scope` index to `outbox` and sets
  `scope = "handover"` on every existing row. No outbox moves between databases (kk's warning, D5).

**D12 Paging: ka's server pages its pull now; the engine follows the cursor.** (Q2.)
- Contacts, maintenance and meetings make a first pull far bigger than handovers. ka's
  `collect_delta` takes server-kit's `paging` helpers (`page_of`, the (entity, knowledge, id)
  cursor with `window_end`), 2000 rows a page as kk.
- The engine sends `paged: true` (opt-in per app); the push goes with the first page only; each
  page is applied in its own transaction; the cursor is written **only with the last page**; an
  interrupted walk restarts from the old cursor (re-applying a page is harmless). Unsent changes are
  laid back over every page. (kk does the same: the cursor moves only at the end of the walk,
  sync-client.ts:1599, :1606-1618.)

**D13 Retries: a capped backoff on errors; offline waits for the connection.** (An engine policy,
ka's; kk has none and keeps none, D10.)
- `offline` (no answer, or `isTransientRefreshFailure`): no retry timer; the next round is the
  `online` event or the poll (`navigator.onLine` can lie).
- `error` (5xx, an unknown 4xx, a thrown step): the next attempt at 5 s, 15 s, 60 s, then every
  5 min; reset by a good round, `online`, or "Sync now". The queue is never dropped on an error.
- **A `rejected` change is never retried**: only `discardRejected` or a new edit to the row moves it.
- **`client_now` is read fresh for every request**, retries and every page and scope included
  (D2 amendment).

**D14 Per-scope fields the server never sends (the sync store's scrub list).** (Q3: now, in 0.46.)
- `SyncScope.withheld: frozenset[str]` of `"<entity>.<field>"`: the pull leaves them out of `data`,
  and a push that names one is rejected (`<field> cannot be written in the <scope> scope`).
- ka: **`estates.qr_iban` withheld in every scope, in 0.46** (§2.1 finding). `bank_accounts` stays
  unreadable in every scope (its `iban` is the registry's only other plaintext-sensitive field;
  ka's review). `handover_protocols.signature_*` stays in `handover` by design (D7) and is withheld
  in every other scope that reads protocols (none).
- The device copy stays plaintext at rest (D7); D14 decides what reaches it.

**D15 Sign-out, company switch and the shared computer, through the engine.**
- `engine.forget({ keepQueue })` bumps the generation, then clears `rows` and `meta` (and the
  `outbox` and app tables unless `keepQueue`).
- **The generation guards every step**, not only the push/pull: a round's apply transaction and
  every `SyncStep` (ka's photo upload too) check it before they write, and drop their result when
  it changed. A photo upload in flight at sign-out does not mark its row uploaded.
- **One engine per database.** ka's database is per account AND company: a company switch builds
  a new engine on the new database and stops the old one (`useSyncWorker(engine)` keyed on it).
- ka: `keepQueue: true` (D6: the queue and photos wait for their owner); the dialog keeps
  `keepsChanges`. This is a deliberate difference from kk, which warns and wipes on purpose
  (FE shared/offline/db.ts:339-349), pushes the queue before a budget switch and asks before
  discarding (`pushBeforeBudgetSwitch`, sync-client.ts:947; `useBudgetSwitchGuard`,
  features/budgets/use-budgets.ts:184), and keeps the mirror and outbox on a definitive 401
  (sync-client.ts:1473-1475). kk does not adopt.
- **On a computer marked shared the engine does not start** (ka's review, settled): no copy, no
  queue. `useSyncWorker` gets `null`, and the controls that would queue are locked "Needs a
  connection" like every other online-only action. The copy-only pages (handover, the meeting
  recording page, D16) are not offered there: field work is done on a device that is never marked
  shared. The handover copy loses the run it has on shared computers today (§2.1).

**D16 How P4 pages read and write: online pages stay online, the copy offline; one id for a
create.**
- **Maintenance, meters, contacts** keep their online pages and REST writes while online. Offline,
  reads fall back to the copy (`readLocalFirst(online, offline)`, kk FE shared/offline/net.ts:58)
  and writes queue (`writeLocalFirst(rest, queue)`: REST first, the outbox only on an
  `isOfflineError`). Online writes stay server-stamped (D2). Only the order matches kk's
  `writeLocalFirst`: kk's takes `{online, entity, id, op, data, buildOffline, optimistic}`
  (FE shared/offline/write.ts:111-137), waits on the sealing `gate()` first and queues a sealed
  budget even online (`mustNotUseRest`); the kit's is the plain two-callback form.
- **Creates: the device mints one id.** Before a create, the page mints the `sync_uuid` once and
  both paths send it: the REST create and the queued change. So a REST create that times out after
  the server applied it, then queued, is not created twice. ka's REST create schemas in the P4
  scopes take an optional `sync_uuid` (none does today: BE domain/schemas/maintenance.py, meter.py,
  owner_meeting.py) and are **idempotent on it** as `/sync` is: a create whose `sync_uuid` already
  names a row of the company answers that row (no second row, no 409). kk mints its create ids the
  same way (write.ts:108: "Creates mint the id with randomUUID() before calling"). Updates are
  safe as drafted.
- **The owner meeting's recording page** is new (§2.5) and reads and writes the copy only, as the
  handover pages do: it is used where the connection is worst.
- The write lock: a control that queues takes `commit={COMMIT_EXCEPT_OFFLINE}` (§1.6); everything
  else stays "Needs a connection".
- **Check each queued write also has its REST twin, or make the page copy-only** (amended
  2026-10-20, kastlan's 0.46 adoption N6). `writeLocalFirst(rest, queue)` needs an online
  write for every change the scope queues. kastlan's work-order costs (§2.5 "costs offline") had
  only `/work-orders/{id}/status` online, so kastlan added `PATCH /work-orders/{id}`
  (`WorkOrderProgressUpdate`); schedules had no route at all, so their page reads and writes the
  copy only (as the handover and recording pages do). A page starts from a server id (`/meters/7`):
  its copy row is `rowByPk(db, entity, pk)` (ui-kit 0.46.1, by the opt-in `SYNC_DB_PK_INDEX`).

**D17 The indicator (D9, now); the legacy photo queue is kept in 0.46.** ka shows the kit's
`SyncStatusIndicator` always, without `hideWhenIdle` and without the handover `scope` words, fed by
the engine's `useSyncStatus`. **The legacy `"kastlan-offline"` photo queue and its `syncManager`
drain stay in 0.46** (Q4, changed at the settle): prod runs v0.11.0 and has never run a release
that only drains it (§2.1). The status adds its count as today. Its removal waits for the release
after the first deployed one that drains.

### 2.3 The engine: `@eifi1/ui-kit/sync` (ui-kit 0.46)

**A new subpath `/sync`, settled** (rather than `dexie` as an optional peer of `/offline`). `dexie`
(^4; ka has ^4.4.6, FE package.json:31) becomes an optional peer imported **only** by `/sync`
(`createSyncDb`, `createSyncEngine`, the hooks), so `/offline` (the query cache, the dialogs,
`SharedComputerChoice`) stays importable by an app without Dexie, and kk's and KS's builds never
resolve it. The leaf utilities that need no Dexie (`stampAfter`, `isOfflineError`,
`readLocalFirst`, `writeLocalFirst`) live in one module (`src/offline/local-first.ts`) that both
`/offline` and `/sync` export, so kk may take them from `/offline` and `/sync` never loads
`/offline`'s TanStack and idb-keyval peers (the build keeps every module its own file).

```ts
// The store: one Dexie database; the engine's tables plus the app's own.
createSyncDb(name: string, opts?: {
  extraStores?: Record<string, string>;            // ka: { photos: "id, roomId, status" }
  upgrades?: { version: number; stores?: Record<string, string>; upgrade?(tx): Promise<void> }[];
}): SyncDb;   // tables rows "[entity+id], entity", outbox "++seq, [entity+id], status, scope", meta "key"

type OutboxStatus = "pending" | "sending" | "waiting" | "blocked" | "rejected";
interface OutboxChange { seq?: number; scope: string; entity: string; id: string;
  op: "upsert" | "delete"; data: Record<string, unknown>; updated_at: string;
  status: OutboxStatus; reason?: string; code?: string }

createSyncEngine(opts: {
  db: SyncDb;
  scopes: () => readonly string[];                 // the scopes this session's role holds, in order
  send: (body: SyncRequestBody, signal: AbortSignal) => Promise<SyncResponseBody>;
  isOffline?: (err: unknown) => boolean;           // default: no response, or isTransientRefreshFailure
  planCode?: (err: unknown) => string | null;      // a whole-request 402 → every change "waiting"
  holdCodes?: readonly string[];                   // ka's policy (D10, not kk's): refused.code kept as
                                                   // "waiting" and re-sent each round; default
                                                   // ["billing_read_only"]; any other code →
                                                   // "blocked", kept, sent on retryBlocked()
  paged?: boolean;                                 // D12
  steps?: SyncStep[];                              // after push/pull (ka: the photo upload)
  paused?: () => boolean;                          // ka: deviceSyncPaused (a practice tour)
  pollMs?: number; soonMs?: number;                // 30_000, 800 (ka's)
  backoffMs?: readonly number[];                   // D13: [5_000, 15_000, 60_000, 300_000]
}): SyncEngine;

interface SyncStep { name: string; run(db: SyncDb, ctx: { signal: AbortSignal; isCurrent(): boolean }): Promise<
  { offline?: boolean; changed?: boolean; counts?: Partial<SyncCounts> }> }
  // changed → one more push/pull in the same round (ka's second pass after photos)
  // isCurrent() → false once forget() bumped the generation: the step writes nothing more (D15)

interface SyncEngine {
  write(scope: string, entity: string, id: string, op: "upsert" | "delete",
        data?: Record<string, unknown>): Promise<void>;   // ka's repo.write, stamped with stampAfter;
                                                          // the caller names the scope (D11)
  start(): void; stop(): void;
  requestSync(): void;                     // soon (debounced)
  syncNow(): Promise<SyncRoundResult>;     // "Sync now"; resets the backoff
  retryBlocked(): Promise<void>; discardRejected(scope?: string): Promise<void>;
  rejected(): Promise<OutboxChange[]>;     // reasons for the app's banner
  forget(opts: { keepQueue: boolean }): Promise<void>;   // D15
  getState(): SyncEngineState; subscribe(listener: () => void): () => void;
}
interface SyncEngineState { phase: "idle" | "syncing" | "offline" | "error"; online: boolean;
  counts: SyncCounts; lastSyncedAt: string | null; nextRetryAt: number | null }
interface SyncCounts { pending: number; waiting: number; blocked: number; rejected: number }

useSyncWorker(engine: SyncEngine | null): void;           // start/stop with the session (ka's useHandoverSyncLoop);
                                                          // keyed on the engine (one per database, D15);
                                                          // null on a shared computer
useSyncStatus(engine: SyncEngine | null): { status: SyncStatus; onSync: () => Promise<void> };
useSyncQuery<T>(db: SyncDb | null, query: (db: SyncDb) => Promise<T>, deps: unknown[]):
  { data: T | undefined; isLoading: boolean };            // ka's useLive
readLocalFirst<T>(online, offline, onOnline?): Promise<T>; isOfflineError(err): boolean;
writeLocalFirst<T>(rest: () => Promise<T>, queue: () => Promise<T>): Promise<T>;
stampAfter(previous: unknown): string;                    // kk sync-client.ts:639-643
```

**The round**, per scope in `scopes()` order:
1. Unless `paused()`: take the scope's `pending` + `waiting` (+ `blocked` only on `retryBlocked`) in
   `seq` order, mark them `sending` (a `sending` left by a closed tab goes back first).
2. Send `{scope, last_knowledge, changes, refusals: true, client_now, paged?, page_cursor?}`;
   `client_now` = `new Date().toISOString()` as the body is built.
3. Apply in one transaction, **if the generation is unchanged**: delete applied `seq`s;
   `refused.change_ids` → `waiting` (a `holdCodes` code) or `blocked`, with `code`; each
   `rejections[]` → `rejected` with `detail`; put pulled rows (a delete removes); lay the unsent
   changes back; on the last page write `lastKnowledge:<scope>` and `lastSyncedAt`.
4. Follow `page_cursor` with pull-only requests until it is `null` (D12).
Then the `steps` (each checks `isCurrent()` before it writes), then one more pass if a step
`changed`. One round at a time; a request during a round runs once more after it (ka's rule).
`scopes()` is read at the start of every round. `write()` keeps ka's merge (into the last
`pending` upsert only; a never-synced row's delete forgets its queue; ka's policy, D10) and stamps
with `stampAfter(previous)`. A `rejected` change is never re-sent (D13).

**Status to the indicator:** `pending` = `pending` + `sending` (+ the steps' pending); `waitingForPlan`
= `waiting`; `blocked` = `blocked` + `rejected`; `phase` and `online` from the engine;
`lastSyncedAt` from `meta`. `onSync` = `syncNow`.

**Not in the engine:** E2EE, re-seal, kk's per-entity mirror and engines, ka's photo upload (a
step), the rejection banner's words (the app's; `rejected()` gives the reasons), the online-only
list (the write lock, §1.6). Seven languages: no new words (the indicator and the dialog have them).

### 2.4 `SyncScope` and `EntityRule` in server-kit (`eifi1_server_kit.sync.scopes`, 0.16.0)

Lifted from ka's sync_scopes.py, with the ka-specific checks as hooks. Layer 1 + a port.

```python
@dataclass(frozen=True)
class EntityRule:
    model: type
    create: type[BaseModel] | None            # None: not created through sync
    update: type[BaseModel]
    deletable: bool = False
    fixed_parents: tuple[str, ...] = ()       # relation wire keys whose target never moves
    fixed_fields: tuple[str, ...] = ()        # may be re-sent unchanged (a lost answer's re-send)
    guard: Callable[[RuleContext], Awaitable[str | None]] | None = None
        # an app rule: a reason refuses the change (ka: a finalised protocol, a completed meeting,
        # a reading in the protocol's unit)

@dataclass(frozen=True)
class SyncScope:
    name: str
    roles: frozenset[str]                     # the app's role values; the router checks them
    readable: frozenset[str]
    writable: Mapping[str, EntityRule] = field(default_factory=dict)
    withheld: frozenset[str] = frozenset()    # "<entity>.<field>": never pulled, never written (D14)
    after_apply: Callable[[AfterApplyContext], Awaitable[None]] | None = None   # ka: finalise

class ScopeRows(Protocol):                    # the port: how the app finds rows
    async def find(self, entity: str, row_id: str) -> object | None: ...   # tombstones included
    async def parent_id(self, row: object, wire_key: str) -> str | None: ...
    references: Mapping[str, str]             # wire key → entity, for "names no row of this company"

async def sort_changes(scope, changes, rows: ScopeRows) -> SortedChanges   # (allowed, rejections, context)
def withhold(scope, change: dict) -> dict                                  # strips `withheld` from a pulled row
SyncScopeError                                                             # ka's SyncRefusedError, generic
```
- `sort_changes` is ka's (sync_scopes.py:254-274, :277-335) minus the handover rules, which move
  into `guard`s. A change pointing at a refused new row of the same push is refused with it ("its
  parent was refused").
- The router stays the app's (ka: billing, demo, roles, the company pin; sync_router.py:28-76).
- kk does not use it (one scope, its own rules). **Rec:** lift it with one app using it, as
  Marcel's P4 decision says; it is small, and a second app with scopes would start from it.

### 2.5 The P4 scopes (kastlan)

Each scope is a `SyncScope` over models that are already `SyncMixin` (§1.3); `estates.qr_iban` is
withheld in all of them (D14). The readable sets include what the pages show next to the rows
(units, buildings, the contact's name).

| Scope | Roles (as online) | Readable | Writable (create / update / delete) | Rules, and what stays online |
|---|---|---|---|---|
| `handover` (today) | `MANAGER_WRITE` | as today (sync_scopes.py:181-198) | as today (:200-223) | unchanged; its checks become `guard`s |
| `meetings` | `MANAGER_WRITE` (owner_meeting_router.py:195) | `owner_meetings`, `agenda_items`, `meeting_invitations`, `contacts`, `estates` | `agenda_items`: create (`title`, `sort_order`), update `resolution`, `minutes_text`; the vote rows (one per owner per item): create, update; `meeting_invitations`: update attendance only; `owner_meetings`: update `notes`, `status` → `in_progress` only | `meeting_uuid` fixed, a vote's `agenda_item_uuid` and `invitation_uuid` fixed; `votes_for/against/abstain` derived from the vote rows, never written (amendment below); a **completed** meeting's rows refused ("the minutes are approved; reopen it online first"), by the guard (a vote via its item to the meeting) and online (below); completing and reopening online; the invitations' other fields read-only (they send mail) |
| `meters` | `MANAGER_WRITE` (meter_router.py:54, :133) | `meters`, `meter_readings`, `units`, `floors`, `buildings`, `estates` | `meter_readings`: create, update, delete, `handover_protocol_uuid` must be null; `meter_uuid` fixed | a reading inside a protocol is `handover`'s (and the reverse, `_check_reading` :370-390); a move across is a delete plus a create (D11); meters themselves (create, number, type) online |
| `maintenance` | `MANAGER_WRITE` (maintenance_router.py:85, :116) | `maintenance_requests`, `work_orders`, `maintenance_schedules`, `unit_defects`, `units`, `unit_rooms`, `floors`, `buildings`, `estates`, `contacts` | `maintenance_requests`: create, update (`unit_uuid` fixed); `work_orders`: create (assign), update `status`, `completed_date`, `description`, `cost_estimate`, `actual_cost`; `maintenance_schedules`: update `last_performed`, `task_description`, `interval_months`, `responsible_contact_uuid`; `unit_defects`: create, update `status`, `description` | **costs and schedules offline** (Q6, settled): `after_apply` sets the request's `ASSIGNED` on a work order's create, as `assign_work_order` does online (maintenance_service.py:121-150), and recomputes a schedule's `next_due` from `last_performed` + `interval_months` (`calc_next_due`, :48-53) for every allowed change carrying `last_performed` or `interval_months`, from the stored row (idempotent; `found` is the live, already-applied row, so compare against the kit's before-snapshot or don't compare; kastlan build review 2, S5); schedules' create and delete online |
| `contacts` | `FINANCE_WRITE` (contact_router.py:99, :130; roles.py:23) | `contacts`, `contact_roles`, `addresses`, `units`, `estates` | `contacts`: update only `phone`, `mobile`, `email`, `notes` (the scope's `update` schema narrows the online superset `ContactUpdate`, BE domain/schemas/contact.py:55-65) | create, addresses, roles online (duplicates, the tenant's lease); `bank_accounts` never readable |

Rows in the round's order (D11). **Finding (settle check): costs and schedules have no online
writer today.** Online, the assign `POST` takes no cost (`AssignWorkOrderRequest`, BE
domain/schemas/maintenance.py:105-108) and the status `PATCH` sets only `status`
(maintenance_router.py:147, maintenance_service.py:155-158): nothing writes `cost_estimate` or
`actual_cost`, though the detail page shows them (FE
features/maintenance/pages/maintenance-detail-page.tsx:227-229); and `create_schedule` /
`update_schedule` (maintenance_service.py:174-180) have no route and no FE page. So in 0.46 the
cost fields and the schedules are written **through the copy** (queue, then sync, as the meeting
page; D16's REST-first seam does not apply), and ka adds a schedules list with "Done" (sets
`last_performed`) to the maintenance pages.

**Owner meetings: votes and minutes** (BE domain/models/owner_meeting.py)
- **What a vote is.** A vote is three counts and a resolution on the agenda item
  (`votes_for/against/abstain`, `resolution`, :121-127), not a ballot per owner; the minutes are
  `AgendaItem.minutes_text` (:128) and `OwnerMeeting.notes` (:93). Weighted votes
  (`MeetingInvitation.ownership_share`, :154-156) and attendance are not recorded today.
- **The double majority is recorded per owner** (amended 2026-10-19, Marcel: in kastlan's 0.46
  adoption, not a later round). A Stockwerkeigentümer resolution often needs both majorities, by
  head and by value quota (ZGB 712m with 647b ff.). kastlan records attendance on the
  `MeetingInvitation` (which already carries `ownership_share` and `proxy_contact_id`) and one
  vote row per owner per agenda item (SyncMixin, `updated_at` for LWW); the head and quota tallies
  are derived from those rows, on the server and on the device, and the plain counts become
  derived. The meetings scope's writable set gains the vote rows and the invitation's attendance
  (`meeting_uuid` / invitation fixed). App model and scope only: no kit change.
- **A vote's id is deterministic** (kastlan build review 2, S7): "latest wins" needs ONE row per
  owner per item, but two devices can create the same owner's vote. The id is `uuid5` over the
  agenda item's and the invitation's `sync_uuid`s, minted on the device, so both devices write
  the same row and whole-row LWW decides. (Random ids would give two votes, or a 500 on a unique
  (item, invitation) key.) The vote model is `SyncMixin` with `updated_at`; its references are
  `agenda_item_uuid` and `invitation_uuid`; the completed-meeting guard goes vote → item →
  meeting.
- **Conflicts on a vote: whole-row LWW, no merge (D2).** Each owner's vote on one item is its own
  row (since the 2026-10-19 amendment above), so two devices recording different owners never
  conflict, and the tallies are derived, never stored as a second truth; the latest edit to the
  same owner's vote wins and the other device gets the winner back in the same round. Two
  recorders entering the same owner's vote is the only real conflict. **Rec:** no lock and no dialog: one recorder per meeting by convention, the losing
  device shows the winner. A per-meeting "recorder" claim would be an online lock, which the
  meeting room cannot take.
- **Who may edit minutes offline:** whoever may online, `MANAGER_WRITE` (ADMIN, MANAGER;
  owner_meeting_router.py:195). Owners have no account in kastlan (TENANT is the only non-staff
  role, domain/models/auth.py:17-21). An accountant cannot.
- **Approved minutes are final.** Completing sets `status = COMPLETED` and `minutes_approved_at`
  (owner_meeting_service.py:87-95); the scope refuses any change to a completed meeting or its items,
  as a finalised protocol. **Finding (wider than drafted, ka's review):** online, none of
  `add_agenda_item` (owner_meeting_service.py:109-111), `update_agenda_item` (:113-115) and
  `delete_agenda_item` (:117-119) checks a completed meeting, so approved minutes can be added to,
  edited and deleted online. ka refuses all three on a completed meeting (409, "the minutes are
  approved; reopen it first"), and `update_meeting` (:79) refuses a change to `notes` there too.
- **Completing is online only.** It approves the minutes (a legal record, ZGB 712m) with the
  server's time; an offline "complete" would stamp the device's clock and could lose to an office
  edit. The button says "Needs a connection". (Q7, settled.)
- **There is no page to record votes and minutes today.** The agenda form has title and
  description only (FE features/owner-meetings/components/agenda-item-form.tsx:4-40); the agenda tab
  shows the counts and the minutes (meeting-agenda-tab.tsx:73-93) but nothing writes them; the
  schema accepts them (BE domain/schemas/owner_meeting.py:78-86). P4 includes a **recording page**
  ("meeting mode": per item the three counts, the resolution and the minutes as the chair
  announces them), on the copy only (D16), not on a shared computer (D15). This is the largest
  single part of P4 in ka.

### 2.6 Plaintext and scrubbing, per store

| Store | At rest | Never in it |
|---|---|---|
| Persisted query cache (P1) | plaintext, 24 h, per account and company | `DEFAULT_SCRUB_FIELDS` (`iban`, `qr_iban`, `default_qr_iban`, `signature_*`), the deny roots (FE shared/offline/query-persistence.ts:17-34), files, mutations (`persistMutations: false`) |
| Sync copy (engine) | plaintext, per account and company, no `maxAge` (the queue must survive); none on a computer marked shared (D15) | the scope's `withheld` (D14; `estates.qr_iban` in every scope), `bank_accounts` (no scope reads it), everything no scope reads (invoices, payments, journal, leases' money beyond the rent shown on the lease row) |
| Sync copy, by design | `handover_protocols.signature_*` (D7), owner-meeting minutes and counts, contacts' phone/e-mail/notes, maintenance notes and costs | — |
| Photos (ka's own table) | the blob until uploaded | — |

- The copy's `rows` and `meta` go at sign-out; the queue stays (D15). The shared-computer choice
  keeps the query cache in memory, and **the engine does not start there** (D15, settled): no copy,
  no queue, so an office PC never holds contacts, minutes or notes.
- **Q8 (settled):** minutes and notes **may** be stored unencrypted on the device, like kk's data
  and ka's protocols today. They can hold personal data about owners and tenants; nothing more is
  done.

### 2.7 Sizes and the build in 0.46

**Sizes**
- **ui-kit** (`/sync`, plus the leaf utilities in `/offline`): **L**. `createSyncDb`,
  `createSyncEngine` (round, scopes, paging, refusals, rejections, backoff, the generation over
  every step, steps), `useSyncWorker`, `useSyncStatus`, `useSyncQuery`,
  `readLocalFirst`/`isOfflineError`/`writeLocalFirst`, `stampAfter`; a fake transport for tests
  (`sync/testing`). About 900–1200 lines with tests; `dexie` an optional peer of `/sync` only.
- **server-kit** (`sync.scopes`): **M**. `SyncScope`, `EntityRule`, `ScopeRows`, `sort_changes`,
  `withhold`, `SyncScopeError`; tests on an in-memory `ScopeRows`. About 300–400 lines. Additive to
  0.16.0 (not tagged yet).
- **kastlan**: **L+**. Server: handover onto the kit's scopes (S), `withheld` (XS), paging (S), four
  scopes with their rules and tests (M), the completed-meeting checks online (XS), idempotent
  `sync_uuid` on the P4 REST creates (S). Client: the handover copy onto the engine (M;
  HO/offline.test.ts is the parity suite), the P4 page sets on `readLocalFirst`/`writeLocalFirst`
  (M), the meeting recording page (M), maintenance costs and the schedules list on the copy (S–M),
  the indicator (S), the shared-computer stop (XS).
- **keksdose**: none (it may take `stampAfter`/`isOfflineError` from `/offline`; not asked). **KS**:
  none.

**The build, in order** (each step reviewable alone; nothing ships until the release)
1. **server-kit** `sync.scopes` + `withheld` (M). ka moves `HANDOVER` onto it and withholds
   `estates.qr_iban` (the fix stands on its own, step 1 in ka).
2. **ui-kit** the leaf utilities (`stampAfter`, `isOfflineError`, `readLocalFirst`,
   `writeLocalFirst`) (S), then `/sync`: the store, the engine with its generation guard, and the
   hooks (L).
3. **kastlan** the handover copy onto the engine: Dexie v2 (`scope` on the outbox), `client_now`,
   paging, `lastSyncedAt`, the indicator always shown, the guarded sign-out, one engine per
   account and company, no engine on a shared computer; the legacy photo queue's drain kept (M).
4. **kastlan** **all five scopes in 0.46** (Q5, settled), in the round's order: `meetings` with its
   recording page and the online completed-meeting checks, then `meters`, `maintenance` (costs and
   schedules included), `contacts` (L in all).

### 2.8 For the reviews (as asked; answered in §2.9)

**kastlan**
1. §2.1: is anything wrong about the handover client or the server? Confirm the in-flight round at
   sign-out (HO/sync-controller.ts:50, HO/db.ts:94-100) and the QR-IBAN in the copy
   (sync_scopes.py:192, property.py:137).
2. D11: one request per scope in one round, or one request for all scopes (a wire change)? Is the
   scope order handover, meters, contacts, maintenance, meetings right?
3. §2.3: does the engine's API cover the handover client (photos as a `step`, `paused`, the
   banner from `rejected()`)? Anything it must not do?
4. D17: has prod run a build that only drains the legacy `"kastlan-offline"` queue for a release, so
   it can go in your 0.46 adoption?
5. D16: are the online pages with `readLocalFirst`/`writeLocalFirst` right for maintenance, meters
   and contacts, or should any read the copy only?
6. §2.5 maintenance: costs and schedules online? Should marking a schedule done (`last_performed`,
   with `next_due` recomputed in `after_apply`) be offline?
7. §2.5 meetings: one recorder by convention, completing online only, invitations read-only, a
   completed meeting refused (and checked online too)? Attendance or weighted votes in this round?
8. §2.5 contacts: update of phone, mobile, e-mail and notes only, for `FINANCE_WRITE`?
9. §2.7: the sizes and the order; which P4 scopes fit 0.46?

**keksdose**
1. The engine is not for kk (§1.8 7). Do the leaf utilities (`stampAfter`, `isOfflineError`,
   `readLocalFirst`, `writeLocalFirst`) match yours closely enough to share, or should the kit's
   differ (kk's sealed-household branch stays yours)?
2. D13 backoff and D11's per-scope cursors: anything kk's experience says against them?
3. `holdCodes` / `blocked`: the engine keeps an unknown `refused.code` as `blocked` and sends it
   again only on `retryBlocked()`, as your client does (sync-client.ts:1530-1546). Right? (No:
   kk refuses the push whole, D10; the right range is :1551-1567.)

**Kurvenschmiede:** nothing (online-only, §1.4).

**For Marcel**
- Q1 D11: per-scope requests (no wire change) or one request with all scopes?
- Q2 D12: paging in ka now (recommended), or only when a pull grows?
- Q3 D14: withhold `estates.qr_iban` from `/sync` now, in 0.46 (recommended).
- Q4 D17: retire the legacy photo queue in ka's 0.46 adoption?
- Q5 §2.5: which P4 scopes must land in 0.46; may `meetings` slip a round if steps 1–3 are ready?
- Q6 §2.5: maintenance costs and schedules offline or online?
- Q7 §2.5: completing a meeting (approving the minutes) online only?
- Q8 §2.6: minutes and notes on the device in plaintext, like protocols?

### 2.9 Reviews and settle (2026-10-19)

**Marcel's answers** ("As reviewed")
1. **D10 narrowed:** the engine copies kk's SERVER rules and wire shapes only; kk's client
   policies (merge into the pending upsert, per-change blocked, `holdCodes`, the 800 ms debounce,
   `keepQueue`, backoff) are named as the engine's own (ka's), and kk's five corrections about its
   client are folded in.
2. **Q4/D17:** keep ka's legacy photo-queue drain in 0.46 (prod v0.11.0 never drained it).
3. **D16 creates:** the device mints one `sync_uuid`, sent by the REST and the offline path; the
   REST creates are idempotent on it.
4. **D15:** the engine guards every step (the photo upload too) with the sign-out generation; one
   engine per database (ka: per account and company).
5. **D15/Q8:** on a shared computer the engine does not start.
6. **Owner meetings:** attendance and one vote per owner per item, the head and quota tallies
   derived (ZGB 712m double majority; amended 2026-10-19 into kastlan's 0.46 adoption); add, update and delete of agenda items and the
   approved minutes are refused online after approval.
7. **Q5:** all five scopes in 0.46: handover, meetings, meters, maintenance, contacts (ka's order).
8. **Q3/D14:** withhold `estates.qr_iban` from `/sync` in 0.46 (`SyncScope.withheld`).
9. **Q6:** maintenance costs and schedules are offline. **Q8:** minutes and notes may be stored
   unencrypted on the device, like kk's data.
10. **Q1:** one request per scope (D11 as drafted). **Q2:** page ka's pull now (D12). **Q7:**
    completing a meeting is online only.

**Where each review point went** (each re-checked at ka 26a2eaa / kk 2cb460c1)

| Review | Point | Where |
|---|---|---|
| ka 1 | in-flight round at sign-out and the QR-IBAN confirmed; the draft's `:50` stands (sync-controller.ts:50, the review's `:49`); the legacy queue drained only since v0.12.0 | §2.1, D17 |
| ka 1 | add/update/delete agenda items unchecked on a completed meeting | §2.5 |
| ka 2 | per scope agreed; the order; `write()` given the scope; a reading's move is delete + create | D11 |
| ka 3 | the generation guards the steps; one engine per database; `scopes()` per round; never retry `rejected` | D13, D15, §2.3 |
| ka 4 | prod on v0.11.0 (Deploy run 37601185934, before v0.12.0): keep the drain | D17 |
| ka 5 | a timed-out REST create duplicated: one device-minted `sync_uuid`, REST idempotent | D16 |
| ka 6 | costs and schedules online, schedule done next round; overruled (Q6): offline in 0.46, and no online writer exists today | §2.5 |
| ka 7 | meetings agreed; the double majority (ZGB 712m) out of this round; the page records announced results | §2.5 |
| ka 8 | contacts agreed; citation contact.py:79-86 → :55-65 | §2.5 |
| ka 9 | meetings and meters first, the rest may slip; overruled (Q5): all five in 0.46 | §2.7 |
| ka + | no engine on a shared computer | D15, §2.6 |
| kk 1 | `refused` is one batch, no per-change status, billing hold sends nothing, no `retryBlocked()`; range :1551-1567 | D10 table, §2.8 |
| kk 2 | kk's `lastSyncedAt` is in memory only | D10 table |
| kk 3 | kk's `writeLocalFirst` shape (`gate()`, `mustNotUseRest`); only the order matches | D16 |
| kk 4 | D15: the budget-switch push and guard; a definitive 401 keeps mirror and outbox | D15 |
| kk 5 | kk's outbox append-only; the tail hold | D10 table |
| kk | the six engine defaults vs kk's client: narrow D10 | D10 (settled as narrowed) |
| kk | shared `/sync` shapes: additive only; `rejected` kept | D10 |
| KS | nothing asked (online-only, §1.4) | — |
