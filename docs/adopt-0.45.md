# Adopting `@eifi1/ui-kit` 0.45

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
resolving to `{completed}`. Remembered per key like `migrate` (first wins): define the
options once at module level. The device key becomes the account's cache; writes also go
to `<storageKey>:pending` (`{synced, completed, forget}`), sent as one PATCH. A failure with
no answer (offline, 5xx, 401) keeps it; a 403/422 drops it and logs. `awarded` is unchanged.
`signOutTourProgress(storageKey)` on every end of a session removes the cache only and keeps
`:pending` (no request). `resetTourProgress` with an account clears the cache only. The
pending record stays out of any "N waiting" count and sign-out guard. **Without `account`,
nothing changes from 0.44.** New: `signOutTourProgress`, types `TourProgressAccount`,
`TourProgressAdopt`, `TourProgressBody`.

| App | Change |
| --- | --- |
| keksdose | Nothing (stays on the device, §10.2.10). |
| kastlan | Table + migration (no `company_id`), store, server-kit 0.15's `tour_progress_router`; in `TOUR_PROGRESS` (use-tours.tsx:19-31) the key per account `kastlan.tours.completions:<id>`, `account: {load, save, adopt: {storageKey: "kastlan.tours.completions", discard: true}}`; `signOutTourProgress(key)` in `logout()` (features/auth/stores/auth-store.ts:68-80); `tour_progress` in `GET /me/export` (account_router.py:101-102). In either mode: delete the device-reset registration (use-tours.tsx:26-27) and its imports (:7-8). |
| Kurvenschmiede | Table + migration, store adapter, `tour_progress_router`; `not_in_the_demo` (403 `demo_refused`) in tests/api/test_demo.py; `tour_progress_conflict` / `tour_progress_full` in `domain/refusals.py` with rows in tests/api/test_refusals.py and seven catalogues; `account` in `tourProgressOptions` (app-tours.ts:27, key unchanged, no `adopt`); `signOutTourProgress` in `clear()` (shared/state/auth-store.ts:64-73); export key in account_export.py:125; the privacy line "tours" (storage-keys.ts:114) reworded in seven languages, kind stays `never` (:150-151). |

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
  `group_rename` entry may carry `renamed: {from, to}` (kastlan's company rename logs both):
  with both it reads "Company renamed from A to B"; a team rename logging `{}` reads "Team
  renamed" as before.

| App | Change |
| --- | --- |
| keksdose | `MailTestCard` in `messaging` beside the push test (admin-index.ts:128, admin-page.tsx:1123), over `POST /admin/mail/test` through `send_email(…, kind="mail_test")` (infrastructure/email.py:62). |
| kastlan | `MailTestCard` in the platform console (superuser, `POST /platform/mail/test`); `AdminWaitingBadge` on the top-bar platform button (top-bar.tsx:178-183) with `waitingLabel` as its name, deletion requests only; Activity = `AdminActionLog groupNoun="company"` on `GET /platform/actions`, mapping `detail.{from, to}` of `group_rename` to `renamed` (admin-actions-card.tsx:19-33 `logEntry`). |
| Kurvenschmiede | `MailTestCard` in a new "System" section, `after: "teams"` (frontend/src/features/admin/admin-catalogue.tsx:26-31). Team renames keep `detail: {}`: nothing to map. |

## Offline, phase 1: `@eifi1/ui-kit/offline` (local-first §1.6)

A new subpath. `@tanstack/react-query`, `@tanstack/react-query-persist-client`,
`@tanstack/query-async-storage-persister` (`^5`) and `idb-keyval` (`^6`) are **optional
peers of `/offline` only**; the main entry does not need them.

- **`createQueryPersistence({app, user, company?, shouldPersistKey?, denyRoots?,
  scrubFields?, onUnsafe?, buster, maxAge, storage?})`** → `{key, persistOptions, clear,
  removeStale}`. The key is `<app>-query-cache-<user>[-<company>]`. Before a query is written,
  `DEFAULT_SCRUB_FIELDS` (`iban`, `qr_iban`, `default_qr_iban`, `/^signature_/`) are removed
  at any depth; the in-memory cache keeps them. Data that is not plain JSON is skipped and
  goes to `onUnsafe` (default `console.error`). On restore, denied or unsafe entries are
  dropped and paused mutations kept. `clear(queryClient)` empties memory and deletes the key;
  `removeStale()` deletes the app's other keys older than `maxAge`.
- **`SignOutPendingDialog`** `{open, queued, waitingForPlan, onSyncNow, onSignOutAnyway,
  onDiscardWaiting?, keepsChanges, extra?, onClose, labels?}`: keksdose's words.
  `keepsChanges` picks "they stay on this device for you" or "it is the only copy". "Sync
  now" is busy while it runs, then calls `onClose` without signing out. "Discard waiting
  changes" shows only with `onDiscardWaiting` and `waitingForPlan > 0`, and signs out
  afterwards. Namespace `signOutPending`.
- **`PwaUpdatePrompt`** `{needRefresh, onReload, onDismiss?, hold?, labels?}`: keksdose's
  toast with Reload (needs a mounted `<Toaster>`). While `hold` is set it shows nothing,
  and a hold that starts takes the toast down without calling `onDismiss`. Namespace
  `pwaUpdate`.
- **`SharedComputerChoice`** + `isSharedComputer()` / `setSharedComputer(on)`, kept in
  `sessionStorage` (`false` when storage is blocked). Namespace `sharedComputer`.

| App | Change |
| --- | --- |
| keksdose | Install nothing new (it has all four peers). `shared/state/query-client.ts:61-76, :109-165, :264-343` → `createQueryPersistence({app: "keksdose", user, shouldPersistKey, onUnsafe, buster: PERSIST_BUSTER, maxAge: PERSIST_MAX_AGE})`. `shouldPersistKey` is today's `shouldPersistQueryKey` (:134) with its roots and the `"admin"` segment; `onUnsafe` is `cacheSafeOrWarn`'s message. The key becomes per user, so the old `keksdose-query-cache` is dropped once. `main.tsx:149` takes `persistence.persistOptions`, and `clearPersistedQueryCache` → `persistence.clear(queryClient)`. `scrubFields: []` unless it wants the default (kk has no IBAN fields). `app/account-menu.tsx:247-317` → `SignOutPendingDialog keepsChanges={false}` with `queued` (pending + blocked), `onSyncNow = runSync`, `onDiscardWaiting = discardWaitingChanges`, `extra = billing.waitingChanges(waitingForPlan)`, `onSignOutAnyway = logOut`. `app/pwa-update-prompt.tsx:9-28` → `PwaUpdatePrompt` over `useRegisterSW`, with `hold` while a tour runs; the `offlineReady` toast (:30-34) stays the app's. The `nav.logout_queued_*`, `nav.logout_sync_now`, `nav.logout_anyway` and `pwa.updateAvailable`/`pwa.reload` keys can go. No shared-computer choice (kk keeps its wipe). |
| kastlan | Add the four peers. `frontend/src/app/providers.tsx:75` → `PersistQueryClientProvider` with `createQueryPersistence({app: "kastlan", user, company, denyRoots: ["admin", "platform", "billing", "translations", "assistant", "reports", "bank-accounts"], buster: __APP_VERSION__, maxAge: 24h})` (use its real roots); keep the plain `QueryClientProvider` when `isSharedComputer()`; set `gcTime >= maxAge`. The company switch (use-auth.ts:24-30, :78-83) changes the key, with no `queryClient.clear()` for the persisted part. `logout()` (features/auth/stores/auth-store.ts:68-80) calls `persistence.clear(queryClient)`; `removeStale()` at sign-in. `SharedComputerChoice` on the sign-in form (features/auth/components/auth-page.tsx). `SignOutPendingDialog keepsChanges` only on the explicit callers (top-bar.tsx:104, sessions-card.tsx:38), with `queued` from the handover outbox; never in `onEnded` (auth-store.ts:170-174), and the tour `:pending` record is not counted. `frontend/vite.config.ts:31` `registerType: "prompt"` (drop `clientsClaim`, :62) + `PwaUpdatePrompt` with `hold` while a handover is open or a tour runs. Online-only actions say "Needs a connection" offline (local-first D4). |
| Kurvenschmiede | Nothing (online-only, local-first §1.4). |
