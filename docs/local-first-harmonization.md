# Local-first — harmonisation plan

**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.

| § | What | Status |
|---|---|---|
| 1 | kastlan local-first like keksdose; KS stays online-only; what the kits lift | **DRAFT (round 0.45)** |

## 1. kastlan becomes local-first — DRAFT (round 0.45)

**DRAFT for review (round 0.45)**, for ui-kit 0.46+ / server-kit 0.16+. Not settled: kastlan and
keksdose review it, KS checks the online-only note (§1.4), and then Marcel settles it
(audits/round-046/reviews.md). Read at kk `feat/feedback-loop-80-424-434` deaf428d, ka `feat/kit-0.44`
6c2a0c4, KS `main` b54c16e, ui-kit `feat/0.45.0`, server-kit `feat/0.15.0`. In kk, FE = `frontend/src`
and BE = `backend/keksdose`. In ka, FE = `frontend/src` and BE = `kastlan`.

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
| **Concurrency** | whole-row LWW on the **client-stamped** `updated_at` | whole-row LWW, **the last to arrive** wins (the server stamps `updated_at`) | `version` + `If-Match`, 409/428, online |
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
- `updated_at` is client-stamped (write.ts:178, :236). `stampAfter()` keeps it 1 ms past the previous
  value (sync-client.ts:639).

**Conflicts and refusals**
- The server merges whole-row LWW and keeps its copy only when strictly newer (BE
  domain/services/sync_service.py:523-550). A losing write comes back as the server's row in the same
  round (:1280-1295). A tombstone moves `updated_at` forward so an older upsert cannot revive it (:553).
- Two devices that create the same unique tuple get the rows merged. The duplicate gets a tombstone,
  and references are remapped in the push (`_UNIQUE_KEYS` :176-186, :1233-1262, `_apply_remaps` :1763).
- **There is no conflict dialog and no merge UI.**
- With `refusals: true` (sync-client.ts:1459, :1530-1540), the server answers `refused: SyncRefusal`:
  - `billing_read_only` holds the queue for a plan (meta `held_for_plan` :155) and shows it as
    `waitingForPlan`.
  - `releaseHeldChanges()` :974 sends the held queue after payment (FE features/budgets/use-budgets.ts:80).
  - `discardWaitingChanges()` :995 drops it and rewinds the cursor.
  - `read_only`/`demo_read_only` keep the changes and show "refused" (:1612). Any other code counts as
    blocked.
- A legacy 409 `tenant_key_missing` counts the whole queue as blocked (:1477-1479). Any other HTTP
  answer is `error`, and no answer at all is `offline` (:1480-1489).
- **Sign-out with work queued.** When `pending + blocked > 0`, a dialog offers "sync now", "log out
  anyway" and "discard waiting changes" (FE app/account-menu.tsx:102-108, :247-317).

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
  the mirror.
  - A 401 keeps the mirror and the outbox (`wipeMirror: false`).
  - Signing in as another user wipes everything first (`mirror_user_id`, :17, `forgetPreviousAccount`
    :47-66).
  - A wipe bumps `MIRROR_GENERATION` (db.ts:211), so a round in flight cannot write into a wiped
    mirror.
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
  - A 422 `"Change <id>: …"` rejects only that change (:76-83, :164-169).
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
  - The incoming `updated_at` is skipped (:44), so **the last to arrive wins**.
- The counter is one database-wide `knowledge_counter` row (infrastructure/sync.py:35-76). It is
  stamped in `before_flush` (:79-99).
- `SyncMixin` (domain/models/mixins.py:44-62) is already on **52 model classes**,
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

**A doc fix only.** Top-bar §2.6/§6.9 describe KS's two states, but top-bar §7's prop list never names
`storage`. This draft adds it there (top-bar §7, the `SyncStatusIndicator` props).

### 1.5 Decisions proposed

**D1 One sync protocol, keksdose's.**

Both apps already speak the same protocol: a `knowledge` cursor, `SyncMixin`, whole-row LWW,
tombstones and `SyncRefusal`. They differ in the details.

**Rec:**
- kk's shapes become the shared ones. That covers `SyncChange`, `SyncRequest` (`last_knowledge`,
  `changes`, `refusals`, `paged`/`page_cursor`), `SyncResponse` (`server_knowledge`, `changes`,
  `refused`) and `SyncPageCursor`.
- ka's `scope` is an optional field (kk has one scope).
- ka sends `refusals: true` and switches from 402/422 to the `refused` list. ka's per-change 422
  `"Change <id>: …"` becomes a `SyncRefusal{code: "rejected", detail, change_ids}`.

**D2 Merge rule: the client-stamped `updated_at` wins (kk), not the last to arrive (ka).**

Under ka's rule, an edit made offline in the morning and synced at night overwrites an office edit made
at noon. Once ka syncs more than handovers, that is no longer rare.

**Rec:**
- Whole-row LWW on the client's `updated_at`, with kk's `stampAfter`.
- A tombstone moves `updated_at` forward.
- The losing write is echoed back in the same round.
- **No conflict dialog** (kk has none). Instead, the server's per-scope rules refuse what must not be
  overwritten: ka's `EntityRule` fixed fields, and a finalised protocol.

**D3 No `If-Match` on the outbox.**

A queued write carries the whole row and the client's `updated_at`, not a version. **Rec:** ka's
online REST writes stay as they are (no ETags). KS's version contract stays KS's.

**D4 kastlan's offline scope.**

**Rec:** offline reads are broad, and offline writes cover field work only.

- **Reads offline: everything a staff role has opened**, through the persisted query cache (kk's
  policy). That gives estates, buildings, units, leases, tenants and contacts, meters, maintenance,
  documents (the list, not the files), the invoice and payment lists, and the dashboard. The cache holds
  only what the role was allowed to fetch, so roles need no extra rule.
  - The deny-list adds: admin, platform, billing, translations, the assistant, report bodies, and any
    payload holding an IBAN or a signature.
- **Writes offline** (new sync scopes beside `handover`, all `MANAGER_WRITE`):
  - `handover`, as today;
  - `maintenance`: tickets, unit defects, notes;
  - `meters`: readings outside a protocol;
  - `contacts`: phone, e-mail, notes.
  - Each is a `SyncScope` entry over models that are already `SyncMixin`.
- **Online only**, where the button says "Needs a connection" and nothing is queued:
  - anything that **numbers or moves money**: invoices (the gapless per-company number), payments,
    QR bills, dunning, journal entries, deposits, service-charge statements, rent increases, mortgages;
  - anything that **makes a PDF or sends mail**: invoice, lease and dunning PDFs, `/send`;
  - **lease** create, end and change (the one-active-lease 409, deposits);
  - **units** create (the `plan_limit` 402);
  - users, roles, invitations, company settings, billing, the platform console, translation review and
    feedback;
  - **switching company**, which mints tokens on the server. Offline, the switcher says "Needs a
    connection" and the app stays on the current company's copy.
- Already-issued PDFs are **not** cached offline in phase 1 (Q3).

**D5 One device store per account and company (ka), not one per device (kk).**

**Rec:** ka's naming becomes the kit's rule. The Dexie database and the persisted query cache key both
carry `<app>-<kind>-<user>-<company>`. kk's household plays the part of ka's company, and kk keeps its
single mirror until it adopts the kit engine (phase 4). This makes the company switch a change of
database, with no wipe and no cross-company leak.

**D6 Sign-out and the shared PC.**

**Rec:**
- On sign-out, clear the persisted query cache and the mirror rows. The outbox (and photos) **stay for
  their owner**, which is ka's rule and kk's 401 rule.
- Before signing out, show kk's dialog when anything waits: "Sync now" / "Sign out anyway" / "Discard
  waiting changes". The kit ships it.
- Signing in as someone else does **not** wipe another account's outbox (it lives in that account's
  own database). It does wipe every stale persisted cache older than `maxAge`.
- No "shared computer" switch in phase 1 (Q4).

**D7 Encryption at rest: none on the device (kk's decision).**

**Rec:** follow record-crypto.ts:32-58, plus:
- never persist bank details, signatures or files;
- the 24 h `maxAge`;
- the wipe on sign-out.

kastlan's server-side encryption (at_rest.py) is unchanged.

**D8 Service worker: the update prompt (kk), not autoUpdate.**

**Rec:**
- ka moves to `registerType: "prompt"` with the kit's update toast. An auto-reload mid-handover loses
  no data, but it does lose the screen.
- ka keeps Workbox `generateSW` (it has no push yet; notifications decision 9).
- No API caching in either app: offline data comes from Dexie and the persisted cache.

**D9 The indicator.**

**Rec:**
- Once ka syncs more than handovers (phase 3), its indicator drops the handover `scope` words
  (top-bar §6.10). It drops `hideWhenIdle` too, and is always shown as in kk.
- Both apps store `lastSyncedAt` in `meta` after a good round, so it survives a reload. Today kk keeps
  it in memory only, and ka has none (sync.ts:122).
- The legacy `"kastlan-offline"` photo outbox is retired once it has drained.

### 1.6 What each kit ships

**server-kit `eifi1_server_kit.sync`** (layer 1 + a small layer 2). Size **M**: about 500 code lines and
800 test lines.
- `schemas`: kk's `SyncChange`/`SyncRequest`/`SyncResponse`/`SyncPageCursor`, with `scope` optional.
  `SyncRefusal` moves here and stays re-exported from `billing`.
- `mixin`: the `SyncMixin` columns (`sync_uuid`/`id`, `knowledge`, `deleted_at`, a client-owned
  `updated_at`), the `before_flush` stamping hook, and the tombstone filter. The counter is a port: kk
  counts per tenant, ka database-wide (Q5).
- `merge`: `merge_lww(row, data, incoming_updated)` and the tombstone rule.
- `scopes`: ka's `SyncScope`/`EntityRule` (readable set, writable rules, fixed fields, roles).
- **It stays in the apps:**
  - kk: the entities, E2EE and re-seal, fx, the unique-key merge, valuations, the budget switch;
  - ka: the ORM-derived registry and `sync_uuid` foreign keys, the photo upload, finalising.

**ui-kit `@eifi1/ui-kit/offline`** (new subpath, `dexie` and the TanStack persist packages as optional
peers). Size **L**: about 1200 code lines and 1500 test lines.
- `createQueryPersistence({ app, user, scope, denyRoots, buster, maxAge })`: kk's deny-list, `isCacheSafe`,
  the guard on write and on restore, and the per-account key (D5).
- `createSyncEngine({ dbName, entities, endpoint, scope })`: the outbox (seq-ordered, a held row holds its
  successors, edits merging into the pending upsert as ka does), the round (push, then a paged pull, the
  cursor moving only after a complete pull, unsent changes laid back over pulled rows), the
  wipe-generation guard and the refusal handling (`waitingForPlan`, `releaseHeld`, `discardWaiting`,
  `rejected` with the reason).
- `useSyncWorker`: mount, `online`, 30 s, an 800 ms debounce, one round at a time, `pause()` for tours.
- `useSyncStatus()` → the existing `SyncStatus`.
- `readLocalFirst`/`isOfflineError`.
- `SignOutPendingDialog` and `PwaUpdatePrompt`, with words in seven languages.
- **It stays in the apps:** entity tables and indexes, local engines, crypto, and kk's `sw.ts` (push,
  share target).

### 1.7 Per app, and the phases

| Phase | ui-kit / server-kit | keksdose | kastlan | KS |
|---|---|---|---|---|
| P1 offline reads | ui-kit `createQueryPersistence`, `PwaUpdatePrompt`, `SignOutPendingDialog` (S–M) | moves its policy onto the kit helper (S) | persisted cache + deny-list; "Needs a connection" on online-only actions; prompt SW (M) | none |
| P2 protocol | server-kit `sync` (M) | imports the schemas, mixin and merge (S–M) | D1 shapes, D2 merge rule, `refusals: true` (M) | none |
| P3 engine | ui-kit `createSyncEngine`, `useSyncWorker` (L) | — | the handover copy onto the kit engine; `lastSyncedAt`; the indicator always shown; legacy outbox retired (M) | none |
| P4 more scopes | — | kk's mirror onto the engine, when it suits (L, optional) | `maintenance`, `meters`, `contacts` scopes (M) | none |

**Removes** about 400 lines of kastlan sync code (repo/sync/controller, the legacy outbox) and about
150 lines of kk persistence code. kk's sync-client mostly stays until P4.

### 1.8 Open questions for Marcel

1. **D2:** the client's `updated_at` wins in kastlan too? (It changes who wins today for handovers.)
2. **D4:** the offline write set: handover, maintenance, meters, contacts? Should a lease's or tenant's
   details be writable offline too?
3. **D4:** cache already-issued invoice/QR-bill PDFs for offline viewing, or never (size, personal data)?
4. **D6:** a "This is a shared computer" choice at sign-in that keeps nothing on the device (memory
   only), for kastlan's office PCs? Or does per-account storage plus the wipe on sign-out suffice?
5. **D1/§1.6:** the knowledge counter: per company in ka (as kk per household), or keep ka's
   database-wide row? A per-company counter means a migration of the cursor (a full re-pull once).
6. **D7:** stay plaintext on the device for kastlan's tenant data (names, addresses, meter readings),
   with IBANs and signatures kept off it?
7. Does keksdose adopt the kit engine at all (P4), or only the persistence helper and the shared
   protocol?

### 1.9 For the reviews

- **kastlan:** Is §1.3 right? Is the D4 scope right (which pages your staff use offline)? What does D2
  cost your handover tests? Can D1's `refused` list replace your 422 path (sync.ts:76-83)? What does a
  lease/tenant edit offline need?
- **keksdose:** Does §1.2 match your code? Can `createQueryPersistence` and `SignOutPendingDialog` take
  your policy and your dialog unchanged? Should the per-account database key (D5) apply to you too?
  Which parts of sync-client are generic enough for P3?
- **Kurvenschmiede:** Confirm §1.4: online-only, `storage="none"`, nothing further.
