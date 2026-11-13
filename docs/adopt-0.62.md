# Adopting `@eifi1/ui-kit` 0.62

ui-kit 0.62 ships with **server-kit 0.27**. Its centre is the shared computer, after kastlan's
and keksdose's findings that a closed tab comes back WITH its sessionStorage (Chrome's reopen
and session restore): the session lives in page memory, the server gives a shared sign-in a
short life (15 minutes idle, 4 hours at most), every sign-out ends the session on the server,
an abandoned tab signs itself out, and push is not offered there (Marcel, 2026-11-12 and 13).
Beside it: the kit's tables and crash buffer in a storage the app names (page memory on a shared
computer), a `keyFilter` set said on the phone, the feedback URL column sorted by what it shows,
a trackpad pinch that zooms a chart, the mouse band kept on the plot, the top page row's height
for anchors, the showcase on server-kit 0.26 (the object store), and the kit's texts brought in
line with Kurvenschmiede's plain feedback and its roles without customers.

**From 0.61, nothing else first.**

**Legal wording:** the **Privacy Policy**, for an app that uses the standard browser entries:
`standardEntries.sharedComputer` now says the flag is kept with the tab and the sign-in itself is
not stored, and both standard lines lose their closing full stop (no app's list has one). Move
the /privacy `updated` date the day you ship them. An app that keeps its own lines (keksdose's
`recent_data`, with its map-tile clause) changes nothing for the kit.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change** (server-kit 0.27, breaking in the type): `MailMarker.idempotency_key(day, *,
app_base_url)` and `QueueService(queue, port, *, app_base_url)` require the app's base URL. All
three apps' code passes it already; an app test that builds one without it adds it. In ui-kit:
nothing.

**New words** (all seven catalogues; **es, hu and zh need native review**, and de-CH, fr and it
are new sentences, not yet reviewed): `sharedComputer.idleWarning`, `.staySignedIn`,
`notifications.sharedComputer`, the reworded `standardEntries.sharedComputer`, and one more
sentence in `seriesChart.zoomHint`.

## Notes from the apps' 0.61 adoptions

- **keksdose:** `settings.swipe_help` stays in the app's catalogue though the kit's swipe card no
  longer reads it: the help corpus reads `settings.<id>_help` by name (`build_help_corpus.py
  --check`). Moving the thread to `useFeedbackCommentsQuery` leaves the app's own
  `queryKeys.feedback.comments` unused (its guard test refuses an unused key); point the
  persistence test at `feedbackCommentsQueryKey`. Moving the swipe store leaves stale ts-prune
  baseline entries.

## A shared-computer sign-in has a short life (`useSharedComputerIdleSignOut`, `shared_device`, `DELETE /auth/sessions/current` at every sign-out, no push)

Ships with **server-kit 0.27**. Marcel decided this on 2026-11-12 and 2026-11-13.

**What changed.**

- **The guidance, corrected.** While "This is a shared computer" is ticked, the session (the
  tokens, the profile and the person's traces) lives in **page memory only**: a Map-backed
  `Storage` behind the app's storage accessor. keksdose's
  `frontend/src/shared/lib/shared-session.ts` (eba87635) and Kurvenschmiede's
  `frontend/src/shared/state/session-place.ts` already work this way.
  - **Not in `sessionStorage`**, which 0.61 said. It holds only markers that are not the
    person's data, such as the kit's `eifi1-shared-computer` flag.
  - The price: a reload or a reopened tab lands on the sign-in, and the app says so.
  - Where it is written: `SharedComputerChoice`'s doc, and docs/local-first-harmonization.md D6
    and §1.6.
- **`useSharedComputerIdleSignOut({ onSignOut, idleMinutes = 15, enabled = isSharedComputer(),
  warn = true, labels? })`** in `@eifi1/ui-kit/offline`. After 15 minutes without input it
  calls the app's sign-out.
  - Input is a press, a key, a touch, a wheel, a moving pointer, or the tab shown again.
  - A minute before, a toast says "Nothing has happened here for a while. You will be signed
    out in a minute." and offers "Stay signed in".
  - It keeps one timer and counts on the wall clock. A tab whose timers slept signs out at once
    when it is shown or touched past the limit: a machine asleep, a frozen background tab, a page
    back from the back-forward cache.
  - Input counts per tab. It signs out once per run and cleans up on unmount.
  - The toast needs a mounted `<Toaster>`.
  - Why the client needs this too: the server ends the session, not what an open tab shows.
- **`shared_device`** on the sign-in (docs/auth-harmonization.md §5.1). The kit's `SignInForm`
  sends no request, so the app adds `shared_device: isSharedComputer()` to two requests:
  - `POST /auth/login`, which takes it in server-kit's `LoginRequest.shared_device`;
  - the passkey finish, whose app model takes the mixin `SharedDeviceChoice`.

  The 2FA and set-password steps need nothing: their challenge carries it in its
  `shared_device` claim.
- **The server's short life** (server-kit 0.27 `SessionPolicy`, auth §6.2). A shared session
  ends after 15 minutes idle and 4 hours at most. Its access token lives 5 minutes, so a busy
  person renews about every 5 minutes. An abandoned tab's session ends 10 to 15 minutes after
  its last request.
- **Every sign-out ends this session on the server**, shared or not (auth §6.3). The order
  matters, because both of the first two steps need the token:
  1. `await dropPushSubscription(unregister)`;
  2. `DELETE /auth/sessions/current` (204, also when the session had already ended), with
     `.catch(() => undefined)`. Not `POST /auth/logout`, which stays "Sign out everywhere";
  3. drop the tokens and the device's copy, then go to the sign-in.

  A failed revoke does not stop the sign-out. A session that ended on its own (the refresh
  refused, or ended in another tab) calls no revoke.
- **No push on a shared computer.** `PushDeviceSetting` refuses "Turn on notifications" while
  `isSharedComputer()` is true, or while its new optional `sharedComputer` prop is. It shows the
  line "Not available on a shared computer: this browser would keep getting your notifications
  after you leave." A subscription the browser already holds can still be turned off.
- **`dropPushSubscription(unregister)`** in `@eifi1/ui-kit`. It is `releaseThisDevicePush` that
  never rejects:
  - it tells the server through the app's `unregister` (`POST /notifications/devices/unregister
    {endpoint}`);
  - it unsubscribes the browser even when the server refused;
  - it resolves `true` only when both let go.

**Why.** kastlan found the gap and keksdose confirmed it in a real browser (Chromium 156,
2026-11-12). Chrome and Firefox bring a closed tab back WITH its sessionStorage, keeping it on
disk to do so: on Ctrl+Shift+T, and on "Continue where you left off" after a restart. With the
tokens there, the next person at a library PC reopened the tab signed in, with a refresh token
good for 30 days. Each part closes one gap:

| Part | The gap it closes |
|---|---|
| The session in page memory | the restored tab |
| The short life and the revoke | a session the client gave up but the server still honoured |
| The idle hook | a tab simply left open |
| No push | a browser that kept showing payees, amounts and names after the person left |

**Must change:** nothing compiles differently. The additions are a new hook in `/offline`, a new
export `dropPushSubscription`, the optional `sharedComputer` prop and new label keys. An app that
builds its own full `UiKitLabels` adds three keys, and none of the three apps does. But the
corrected rule asks each app to act. The per-app list follows.

**Order: server first.** `shared_device`, the session rows and `DELETE /auth/sessions/current`
come with server-kit 0.27 in each backend. Kurvenschmiede's passkey request `PasskeySignIn`
(`backend/kurvenschmiede/domain/schemas/auth.py:288-289`) refuses unknown fields
(`extra="forbid"`). It answers 422 to `shared_device` until it takes `SharedDeviceChoice`. Every
app's `/auth/login` model ignores unknown fields.

**New words** (all seven catalogues; **es, hu and zh need native review**; de-CH, fr and it are
new too):
- `sharedComputer.idleWarning` and `sharedComputer.staySignedIn` (the idle toast);
- `notifications.sharedComputer` (the push card's line).

None is a function label, so there is no new review sample.

**Legal wording:** **Privacy Policy**, for an app that shows
`legal.sections.privacy.browser.standardEntries.recentData` or `.sharedComputer` (all three do).
The app moves its /privacy `updated` date to the day it ships the bump. Two changes:
- **The flag line** said the choice was kept "for as long as that session lasts". But the flag
  sits in the tab's storage and comes back with a reopened tab. It now reads "Whether you chose
  “This is a shared computer” at sign-in, kept with the tab; your sign-in itself is not stored".
- **Both standard lines lose their closing full stop**, in all seven languages (Marcel
  2026-11-13). They are items in the app's own list, and no entry in keksdose's, kastlan's or
  Kurvenschmiede's lists ends with one, in any language. The new fingerprints are in
  `legal-wording.test.ts`.

**keksdose** (read at `eba87635`)

- **Session in memory:** done in eba87635 (`frontend/src/shared/lib/shared-session.ts:65-96`).
- **Server:** keksdose has no session table. Revocation is the per-user cut-off
  `sessions_invalid_before`. With server-kit 0.27 it adds:
  - `user_sessions` (kastlan's shape, plus `shared_device` and `expires_at`);
  - a `sid` claim on both tokens;
  - the per-request row check;
  - `DELETE /auth/sessions/current`.

  `POST /auth/logout` (`backend/keksdose/adapters/api/auth_router.py:977-1001`) stays "Sign out
  everywhere".
- **`shared_device`:** read `isSharedComputer()` when the request is built, as
  `features/auth/use-login-success.ts:29` already does. Add it in two places:
  - `authApi.login` (`frontend/src/shared/api/endpoints.ts:272-273`, called at
    `features/auth/login-page.tsx:82`);
  - `passkeyLoginFinish` (`endpoints.ts:404-405`, called from `features/auth/passkey-actions.ts:65`
    and `:90`). Its backend model `PasskeyLoginFinishRequest`
    (`backend/keksdose/domain/schemas/auth.py:510`) takes `SharedDeviceChoice`.

  The `X-Shared-Computer: 1` header (`client.ts:140`) stays, for its no-store answers.
- **Sign-out:** `useSignOut`'s `signOutNow` (`features/auth/use-sign-out.tsx:52-57`) becomes
  `dropPushSubscription(pushApi.unsubscribe)`, then `DELETE /auth/sessions/current`, then
  `clear()`.
  - It replaces `releaseThisDevicePush(...).catch(...)`, which still works.
  - `endSession` (`shared/api/client.ts:65-84`) stays local.
- **The idle hook:** mount it in `ProtectedRoute` (`frontend/src/app/protected-route.tsx`), after
  the `!token` redirect at `:241-243`. Not in `AppLayout`: `ProtectedRoute` also covers the
  unlock screen (`:256`), a signed-in state where `AppLayout` is not mounted.
  - Pass `enabled={sharedSession()}`, which is keksdose's own page mode.
  - `onSignOut` is the same path as the account menu's sign-out, without the pending question,
    because nobody is there to answer. keksdose wipes the queue as "Log out anyway" does.
- **Push:** `PushDeviceCard` (`features/auth/notification-settings-cards.tsx:132`) passes
  `sharedComputer={sharedSession()}` to `PushDeviceSetting`. An app card that calls
  `usePushDevice().enable()` itself (the check-up) checks `sharedSession()` first, because the
  hook does not refuse.

**kastlan** (read at `7baea132`)

- **Session in memory:** still to do. `setTokens` (`frontend/src/shared/api/client.ts:94-108`)
  puts the refresh token in `sessionStorage` while the box is ticked. 0.61 asked for that
  placement, and this note withdraws it. Keep the refresh token in memory, as the access token
  already is (`:60`), and drop the `sessionStorage` restore at module load (`:85-88`) for a
  shared session. The price: a reload lands on the sign-in.
- **Server:** kastlan already has session rows and a `sid` claim. It adds `shared_device` and
  `expires_at` to `UserSession` (`kastlan/domain/models/session.py:12-20`, set in `issue_session`,
  `kastlan/adapters/api/auth_helpers.py:85-88`). It also adds `DELETE /auth/sessions/current`,
  **declared before** `DELETE /auth/sessions/{session_id}` (`auth_router.py:572-579`), which
  would otherwise take `current` for an id.
- **`shared_device`:**
  - `use-auth.ts:56` forwards the kit's `SignInCredentials` as they are
    (`loginApi(credentials)`). Send `{ ...credentials, shared_device: isSharedComputer() }`.
  - `loginWithPasskey` (`features/auth/api/passkey-api.ts:70-77`): its backend
    `PasskeyLoginFinishRequest` (`kastlan/domain/schemas/auth.py:429-431`) takes
    `SharedDeviceChoice`.
  - 2FA and set-password need nothing.
- **Sign-out:** the explicit sign-out (`app/top-bar.tsx:113-116`) calls
  `DELETE /auth/sessions/current` before `logout()`.
  - Not inside the store's `logout()` (`features/auth/stores/auth-store.ts:72-90`): `endSession`
    (`:191-199`) also runs it after a refused refresh, when the token can no longer ask.
  - kastlan has no push, so it has no `dropPushSubscription` step.
- **The idle hook:** in `AppLayout` (`frontend/src/app/app-layout.tsx`), under `ProtectedRoute`.
  `onSignOut` is the top bar's `signOut`. Skip `useSignOutGuard`'s question on an idle sign-out:
  the outbox stays for its owner anyway (D6).
- **Push:** kastlan has no Web Push, so there is nothing to do.

**Kurvenschmiede** (read at `efde0f5`)

- **Session in memory:** done (`frontend/src/shared/state/session-place.ts`, in 1049185).
- **Server:** Kurvenschmiede has no session table. With server-kit 0.27 it adds the same as
  keksdose:
  - `user_sessions` (plus `shared_device` and `expires_at`);
  - a `sid` claim;
  - the per-request row check;
  - `DELETE /auth/sessions/current`.

  `POST /auth/logout` (`backend/kurvenschmiede/adapters/api/auth_router.py:429-442`) stays "Sign
  out everywhere".
- **`shared_device`:** add it in two places:
  - `authApi.login` (`frontend/src/shared/api/endpoints.ts:213-214`, called at
    `features/auth/login-page.tsx:68`);
  - `passkeySignInFinish` (`endpoints.ts:293-294`). Its backend `PasskeySignIn` forbids extras
    until it takes `SharedDeviceChoice`, so the server goes first.

  Set-password needs nothing. There is no 2FA step.
- **Sign-out:** the account menu's sign-out (`frontend/src/app/account-menu.tsx:93-99`) calls
  `DELETE /auth/sessions/current` before `clear()`. Not inside `clear()`
  (`shared/state/auth-store.ts:84-100`): the refused refresh (`shared/api/client.ts:140-154`)
  runs that too.
- **The idle hook:** `AppLayout` (`frontend/src/app/layout.tsx`) also wraps public pages, so gate
  the hook as `useLastVisitedPage` is gated (`:39`):
  `useSharedComputerIdleSignOut({ onSignOut, enabled: user !== null && isSharedComputer() })`.
- **Push:** Kurvenschmiede has no Web Push, so there is nothing to do.

**Still open:**

- **A push subscription another account left in a shared browser.** `PushDeviceSetting` warns
  "another account", but the person signed in cannot unregister it on the server.
- **`usePushDevice().enable()` itself does not refuse on a shared computer.** Only the kit's card
  refuses, so an app's own card on the hook checks the mode before it calls `enable`.

**Two more from the lead, after the builder:** `usePushDevice({ sharedComputer })`'s `enable()`
refuses too (answers `false`, asks the browser nothing), so an app's own push control cannot
subscribe a shared browser; and a page brought back from the back-forward cache (`pageshow` with
`persisted`) ends a shared session at once, as a reload ends it. **Registration** carries
`shared_device` too (server-kit 0.27's `RegisterRequest`, Marcel 2026-11-13): a new account made
on a shared computer gets the same short session.

## A shared computer's table views and crash buffer in page memory (`createMemoryStorage`, `tableStorage`, crash `storage`)

**What changed.** keksdose's shared-computer session (a ticked "This is a shared computer")
keeps the person's session and traces in the page's memory, because Chrome brings a closed
tab back WITH its sessionStorage (Chromium 156, 2026-11-12). Two kit parts kept what the
person leaves in `localStorage` whatever the app did: a `DataTable`'s saved view
(`storageKey`: sort, filters — payee names among them — page size, widths, hidden columns)
and `createCrashReporter`'s buffer of undelivered reports. Both now take a `Storage`:

- **`createMemoryStorage()`** (main barrel, `lib/safe-storage`): a Map-backed `Storage` in
  the page's memory — gone with the page, a reload included. One store per call: make one
  per page at module scope and hand the same one to everything. It is keksdose's
  `PageMemoryStorage`.
- **`<UiKitProvider tableStorage={…}>`**: the `Storage` every kit table below keeps its view
  in — `DataTable`, `TranslationReviewPanel`'s table and its groups (`useSharedTableView`).
  A table's own **`storage`** prop wins over it; left out, `localStorage`, as before. The
  key is unchanged (prefix + `storageKey`). Keep the value stable (it is in the context
  value). `useKitTableStorage()` reads it, like `useKitTableStorageKeyPrefix()`.
- **`createCrashReporter({ …, storage })`**: where the undelivered reports wait — a
  `Storage`, or a function answering one, asked at each read and write (for an app whose
  mode is chosen while the page lives). Default `localStorage`. A function that throws reads
  as "no storage": nothing is buffered. The flush reads the same place, so a page-memory
  buffer is flushed under that page's sign-in, and the device's own buffer in
  `localStorage` is left for the device's own session.
- **`readStored` / `writeStored` / `removeStored`** take an optional last `storage`
  argument (default `localStorage`, guarded as before).
- Not changed: "Reset this device's settings" clears the table views in `localStorage`
  only (the provider still joins with its prefix); a page-memory view goes with the page.

Nothing has to change: every new option is optional and defaults to `localStorage`. No new
labels. No legal wording.

**keksdose** (the requester):
- `frontend/src/shared/lib/shared-session.ts`: `PageMemoryStorage` can become
  `createMemoryStorage()` (`const pageMemory = loadedShared ? createMemoryStorage() : null`);
  `accountStorage()` stays.
- `frontend/src/shared/i18n/kit-labels.tsx` (the `<UiKitProvider tableStorageKeyPrefix>` at
  :116): add `tableStorage={sharedSession() ? accountStorage() : undefined}` (the mode is
  fixed per page load, so the value is stable).
- `frontend/src/shared/components/data-table.tsx`: drop
  `storageKey={sharedSession() ? undefined : props.storageKey}` — a shared-computer table
  keeps its view for the page's life now, and reads none of the device's. This also covers
  the table the wrapper never reached: `TranslationReviewPanel` on
  `features/translations/translations-page.tsx:271` still wrote its view to `localStorage`
  in a shared-computer session.
- `frontend/src/shared/state/table-views.ts` `clearTableViews()`: unchanged (it clears the
  device's views; in a shared session there are none of the page's there).
- `frontend/src/shared/lib/crash-report.ts`: pass `storage: accountStorage()` to
  `createCrashReporter`; then `fileCrash` can be `reporter.onReport` (the read-and-restore
  of `PENDING_CRASH_REPORTS_KEY` around the filing goes), and `flushPendingCrashReports`
  can flush in a shared session too (it flushes the page's own buffer, under the page's own
  sign-in) — or keep the skip, if a shared session should file only what it can at once.
- `frontend/src/shared/lib/pending-crash-reports.ts` `clearPendingCrashReports()`: may
  become `removeStored(PENDING_CRASH_REPORTS_KEY, accountStorage())` without the
  `sharedSession()` early return (it then clears the page's buffer on a shared sign-out,
  the device's otherwise).
- In the browser: sign in with "This is a shared computer", sort and filter the register,
  navigate away and back — the view is kept; DevTools › Application › Local storage shows no
  new `keksdose-table:` write. Reload: the view is gone with the session.

**kastlan** (optional; its shared-computer session keeps the refresh token in the tab,
`frontend/src/shared/api/client.ts:98`):
- `frontend/src/shared/feedback/crash-reporter.ts`: to keep a shared session's crash
  buffer off the device, `storage: () => (isSharedComputer() ? PAGE_MEMORY : localStorage)`
  with `const PAGE_MEMORY = createMemoryStorage()` (the function form, since the mode is
  chosen at sign-in while the page lives).
- `frontend/src/app/providers.tsx` (`<UiKitProvider>` at :73): `tableStorage={shared ?
  PAGE_MEMORY : undefined}` from a value that re-renders with the session (the auth store),
  so its tables (`storageKey="trial-balance"`, `"owners"`, `"translations"`, …) keep a
  shared session's view in memory.

**Kurvenschmiede** (optional; its shared session already lives in memory,
`frontend/src/shared/state/session-place.ts:39`):
- `frontend/src/shared/lib/crash-reporter.ts` (:51): `storage: () => (isSharedComputer() ?
  PAGE_MEMORY : localStorage)`, the same `PAGE_MEMORY` as above.
- `frontend/src/main.tsx` (`<UiKitProvider tableStorageKeyPrefix={STORAGE.tables}>` at :62):
  `tableStorage={…}` as kastlan, from a value that re-renders with the session; its tables
  (`"gear-kinematics"`, `"translations"`) then keep a shared session's view in memory.

**Tests:** `src/lib/__tests__/safe-storage.test.ts` (createMemoryStorage as a Storage, one
store per call, the local trio with a `storage`, the guard on a throwing one);
`src/components/__tests__/data-table-storage.test.tsx` (the prop, the provider, the prop
winning, a nested provider, a Storage swapped mid-life, `TranslationReviewPanel` and
`useSharedTableView` under the provider, `localStorage` without either);
`src/feedback/__tests__/feedback-crash.test.tsx` "storage, the page's memory on a shared
computer (0.62)" (buffered and flushed from the given Storage with the device's buffer
untouched, the function form, a throwing function).

---

## A `keyFilter` set on a column the table lacks is said above the phone's cards

**What changed.** The phone's Filters sheet has a section per column in `columns`, so a
`keyFilter` set on a column the table does not have (an app whose `columns` drop `id`)
narrowed the cards with no section, no count and — with no other filterable column — no
Filters bar. The desktop's line (0.60) now stands above the cards in that case: the set's
words and its **Clear filter**, which calls the owner's `onClear`; the focus goes to the
card list when it leaves. A column that is there keeps its sheet section and draws no line.
No new labels.

**keksdose, kastlan, Kurvenschmiede:** nothing to change. In the browser (phone width): a
table whose columns leave out the set's column, opened with its set (the feedback inbox
with `id` dropped from its columns, `?ids=…`), shows "Only these N reports" with Clear
filter above the cards.

**Tests:** `src/components/__tests__/data-table-key-filter.test.tsx` "DataTable keyFilter on
the phone, its column not among the columns (0.62)".

---

## The feedback URL column sorts and filters by what its cell shows

**What changed.** Since 0.61 the URL cell shows the page's link with the app's
`pageLinkParams` (`/curves/2?profile=5`), but sorted and filtered by the path alone: a text
filter on `profile=5` found nothing, and two profiles of one curve sorted as one. Both now
read what the cell shows — the link's target, or a one-shot page's bare path. Without
`pageLinkParams`, the path, as before.

**keksdose, kastlan, Kurvenschmiede:** nothing to change. All three pass `pageLinkParams`
(`keksdose/frontend/src/features/feedback/feedback-page.tsx:202`,
`kastlan/frontend/src/features/feedback/pages/feedback-page.tsx:98`,
`kurvenschmiede/frontend/src/features/feedback/feedback-page.tsx:165`), so each inbox's URL
column sorts and filters by the kept params with the bump. In the browser: widen the inbox
until the URL column shows, filter it by a kept param (`tab=`, `profile=`): the rows whose
cell shows it remain.

**Tests:** `src/feedback/__tests__/feedback-page-link-params.test.tsx` "the table's URL
column sorts and filters by what its cell shows, the kept params included".

## Charts: a trackpad pinch, and the band kept on the plot (`SeriesChart`'s zoom)

**What changed.** Follow-ups to 0.61's chart zoom (Marcel, 2026-11-13). Every zoomable
`SeriesChart` gets them, and so every `LegendedSeriesChart` with lines or areas. Bar charts zoom
nothing by default and are unchanged. `StaticSeriesChart` does not zoom and is unchanged.

- **A trackpad pinch zooms the chart, not the page.** Chrome, Edge and Firefox send a trackpad
  pinch as Ctrl + wheel; Safari sends WebKit gesture events. Over a chart whose zoom names x
  (`zoomAxes` "both" or "x", so every line and area chart by default), the pinch now zooms x
  about the cursor and the page does not zoom. Ctrl (⌘ on a Mac) + mouse wheel does the same.
  The whole chart takes it, axes and strip included. A **plain wheel still scrolls the page**.
  A chart that zooms only y, or nothing, leaves the pinch to the browser.
  - One Back step per pinch. A wheel pinch ends after 300 ms without a wheel event; a Safari
    pinch ends at `gestureend`. Pinching out to the whole range ends the zoom, as two fingers do.
  - One pinch arriving both ways (gesture events and Ctrl + wheel) zooms once.
  - On iOS, the gesture events Safari sends beside a two-finger touch pinch are only prevented.
    The touch pinch zooms, as before.
- **A mouse band stops at the plot's edge.** A drag carried past the plot used to zoom into a
  window outside the data, and the overview handle then stood past the end of its track. The
  band is now kept on the plot, on both axes, both while it is drawn and when it is let go.
- **A category chart's last slot names the end of its range.** At the right end of a category
  chart (End on the strip, a pinch or a band to the end), the handle used to say "Jul to "
  with the kit's words or "Jul to undefined" with an app's `x.format`. An app's `x.format` /
  `x.label` was also handed `index` 8 on eight rows. It now names the last slot (index 7).
- **The overview strip still pushes the page down when the reader zooms** (Marcel, 2026-11-13).
  Reserving its 1.5rem under every zoomable chart, as tried in this round, left blank space under
  every unzoomed chart; the shift a zoom causes is the reader's own, which browsers do not count
  as layout jank. Nothing changes from 0.61 here.

**Must change:** nothing. No prop or type changed.

**New words** (all seven catalogues; **es, hu and zh need native review**):
`seriesChart.zoomHint`, the chart's spoken description, gains one sentence on the trackpad
pinch and Ctrl + wheel ("On a trackpad, pinch to zoom; with a mouse, hold Ctrl and turn the
wheel."). No new key. An app that overrides `zoomHint` keeps its own text.

**Legal wording:** none.

**Kurvenschmiede** (every chart is a line chart, through `frontend/src/shared/charts/series-chart.tsx`):

- Nothing to change. On a laptop: pinch on the trackpad over a curve, then press Back.
- Please report what a real Safari on a Mac does with a trackpad pinch over a chart: the
  kit's tests send synthetic gesture events in jsdom.

**keksdose** (zoomable: the line charts `features/reports/charts/networth-line.tsx`,
`investments-line.tsx`, `paper-price-chart.tsx`, `features/reports/tabs/price-history-tab.tsx`,
`features/admin/metrics-panel.tsx`; the area charts `features/reports/charts/cash-buffer-chart.tsx`
and `wide-series-chart.tsx` when it draws areas; the bar charts are unchanged):

- Nothing to change.
- A Ctrl + wheel over one of these charts now zooms the chart instead of the page.

**kastlan** (the occupancy area chart in `frontend/src/features/reporting/components/charts-tab.tsx`
zooms; `features/dashboard/components/revenue-chart.tsx` is bars and is unchanged):

- Nothing to change. The occupancy chart zooms with a trackpad pinch.

**Tests:** no app test changes. No app test sends a wheel event to a chart. The kit's tests: `src/components/__tests__/chart-zoom.test.tsx` and
`chart-zoom-touch.test.tsx`, plus `src/lib/__tests__/zoom-window.test.ts`.

## The top page row's height, `--app-subnav-h`, and anchors that clear it (AppShell)

**What changed.** With `mobileSubNavPlacement="top"` (0.60), the row of a group's pages sticks
under the top bar on a phone (about 43px at Normal text). An anchor jump lands its target
`scroll-margin` below the top of the screen, and the kit's offsets counted only the 3rem
TopBar. So a jump landed partly under the row.

- **New CSS variable `--app-subnav-h`:** the row's measured height, published by AppShell the
  way it publishes `--app-nav-h` for the bottom bar:
  - on the shell's root, and on `<html>` for the outermost shell (embedded: on the shell only);
  - floored to a whole pixel, and updated as the row resizes or changes group;
  - `0px` while there is no row at the top: at the bottom placement (where `--app-nav-h`
    counts the row), on a page outside every group, with `mobileSubNav={false}`, or from `md`
    up;
  - removed on unmount, and undefined outside an AppShell. Read it with a fallback:
    `var(--app-subnav-h,0px)`.
- **`LegalSection`** lands at `calc(5rem + var(--app-subnav-h,0px))` (was `scroll-mt-20`).
- **`?focus=`** (`useSettingsFocus`, `useFocusParam`, `SettingsLayout`) centres the card in the
  screen below the row. During the scroll only, the card gets a top scroll margin of
  `var(--app-subnav-h, 0px)`; its own margin is back right after.
- **`undeclaredCssVariables`** (`@eifi1/ui-kit/testing`) accepts `var(--app-subnav-h, …)` under
  `checkFallbacks` as it accepts `--app-nav-h`, and reports a bare use.
- **An app's own anchor** adds it the same way, e.g. `scroll-mt-[calc(4rem+var(--app-subnav-h,0px))]`.
  **A page element stuck under the row** uses `top-[calc(3rem+var(--app-subnav-h,0px))]`.

**Must change:** nothing.

**New words:** none. **Legal wording:** none (the legal pages' text is unchanged; only where a
link to a section lands).

- **kastlan** (`mobileSubNavPlacement="top"` in `frontend/src/app/app-layout.tsx`): nothing to
  change.
  - Neither the legal pages (`features/legal/*-page.tsx`) nor `/settings`, `/admin` and
    `/platform` (SettingsLayout's `?focus=`) are in a nav group. The row is absent there,
    `--app-subnav-h` is 0px, and they land as before.
  - A grep found no `scroll-mt-*` and no sticky page element in `frontend/src`, so there is
    nothing of the app's own to offset.
  - Not covered: the tours (`features/tours/tours/*.ts`) scroll their target to the centre of
    the whole screen through the kit's tour overlay, which does not count the row yet (see the
    open question).
- **keksdose:** nothing. Its row stays at the bottom, so `--app-subnav-h` is 0px.
- **Kurvenschmiede:** nothing. Its row stays at the bottom, and its legal pages render outside
  the shell.

**Tests:** no app test changes. The kit's tests:
`src/shell/__tests__/app-shell-subnav-placement.test.tsx`, `src/components/__tests__/legal.test.tsx`,
`src/settings/__tests__/use-settings-focus.test.tsx`, `src/__tests__/token-vars-declared.test.ts`.

## The showcase on server-kit 0.26, and the kit's texts about Kurvenschmiede

**What changed.** The showcase is pinned to server-kit 0.26.0's API export. Its new module,
`eifi1_server_kit.objects`, is documented on the Server kit **Feedback & uploads** page, after
`uploads` (https://eifi1.github.io/ui-kit/server-feedback#objects). It holds `ObjectStore`,
`LocalObjectStore`, `GcsObjectStore`, `S3ObjectStore`, `purge_objects`, `ObjectStoreError` and
`ObjectNotFoundError`. The kit page it links back to is **Feedback — compose**, the page with the
attachment field whose files it keeps. The page's blurb says so in all seven languages, and the
search finds the module and its members.

The kit's texts no longer give Kurvenschmiede sealed feedback or a CUSTOMER role. Since its
migrations 0059 and 0060 (Marcel, 2026-11-12) neither is true. The changes are in TSDoc,
comments and the contracts:

- `useFeedbackPublicPage`'s `search` and `FeedbackPublicList`'s `onSearchChange` no longer name
  Kurvenschmiede as the app with sealed titles. keksdose and Kurvenschmiede both pass `search`.
- FeedbackMenu's `publicHref`, RoleSelect, RoleChip, InvitationsPanel's `invitableRoles`,
  WriteLockKind and ReviewerScopeEditor name no customer.
- Contracts:
  - the rules and decisions are amended in feedback §3.2, §3.5, §9.2 (decision 7), §9.7–§9.9,
    §10.2, §10.8, §11.2 and §14.2; user-admin §4.1 and §6.4; auth §4.3; billing §3.2 and
    §12 item 36; top-bar §2.7; server-services §4.3;
  - a dated survey or per-app record keeps its cells and gets one dated line.

**Kept for now, used by no app:** `TransferUnavailable`'s `"customer"` and
`TransferOwnershipLabels.customer`, with its entry in the seven catalogues. Removing either is a
breaking change, so a later minor deprecates them. If an app still passes `unavailable:
"customer"`, it should stop. None of the three does today.

**Every app:** nothing to change. There is no runtime or type change, and no legal wording
changes.

## server-kit 0.27

### A shared computer's session ends on the server; every sign-out ends the session there

**What changed** (`eifi1_server_kit.auth`, commit d9012a0):

- **The sign-in carries the choice.** `LoginRequest` gains `shared_device: bool = False`
  (from the new mixin `SharedDeviceChoice`). The kit has no passkey schema, so each app
  mixes `SharedDeviceChoice` into its own passkey finish request.
- **A challenge carries it to the step that starts the session.**
  `challenge_claims(..., shared_device=True)` and
  `two_factor_challenge_claims(..., shared_device=True)` write
  `SHARED_DEVICE_CLAIM = "shared_device"`, but only when it is ticked, so a normal
  sign-in's challenge stays byte for byte what it was. `shared_device_of(claims)` reads
  it back. A missing claim, `null` or `false` means a normal session, and a challenge
  minted before 0.27 reads as one. Any other value means shared, the shorter life.
- **`auth.sessions`**:
  - `SessionPolicy`, a frozen dataclass with these defaults: `access_lifetime` 24 h,
    `refresh_lifetime` 30 d, `shared_idle` 15 min, `shared_absolute` 4 h,
    `shared_access_lifetime` 5 min.
  - Four functions: `session_expired`, `session_expires_at`, `refresh_lifetime`,
    `access_lifetime`.
  - Constants: `SHARED_IDLE`, `SHARED_ABSOLUTE`, `SHARED_ACCESS_LIFETIME`.
  - A shared session ends 15 min after its last refresh, or 4 h after it started.
  - A normal session ends 30 d after its last refresh, which is when its refresh token
    would end today. It never ends for its age.
  - A session counts as ended exactly AT the limit.
  - If `now` is behind `last_active` or `started_at` (clocks a little apart), nothing
    ends except through the absolute limit.
- **Contract:** every sign-out, shared or not, ends the session on the server. The client
  calls the revoke for its own session BEFORE it drops its tokens.

**Why.** ui-kit 0.61 keeps a shared computer's tokens in `sessionStorage`. Chrome and
Firefox restore a closed tab together with its `sessionStorage` (Ctrl+Shift+T, session
restore). So on a library PC the next person can reopen the tab and be signed in, holding
a refresh token that every refresh renews for 30 days (kastlan's finding). Marcel decided
on 2026-11-12 that the server ends such a session on its own clock.

**One deviation from the brief, needed by the design: a shared session's ACCESS token
lives at most 5 minutes.** The refresh token is exactly as Marcel asked: `shared_idle`
ahead, and never past the absolute end. But the client refreshes only on the first 401
after its access token has ended (ui-kit's `attachSessionRefresh`; nothing refreshes
early). An access token as long as the idle limit therefore ends together with its
refresh token, and the refresh that follows is refused. kastlan's 15-minute access token
would sign a busy person out every quarter of an hour, and so would keksdose's or
Kurvenschmiede's 24 h token capped to 15 min.

With a 5-minute access token:
- a busy person refreshes about every five minutes and stays signed in until the 4 h
  limit;
- a session left alone ends 10 to 15 minutes after its last request, because the idle
  limit counts from the last refresh;
- no request has to write to the database: only the refresh stamps `last_active`, as
  kastlan's `touch_session` already does.

The test `test_somebody_at_work_stays_signed_in_until_the_absolute_limit` replays a
timeline through all three call sites to show this. `SessionPolicy` refuses a shared
access lifetime that is not shorter than `shared_idle`.

#### The same in every app

1. **Migration on the session table:**
   - `shared_device BOOLEAN NOT NULL DEFAULT false`;
   - `expires_at TIMESTAMP` with an index. Backfill existing rows as
     `last_active + refresh_lifetime`; for kastlan that is 30 days.
   - Write `created_at` from the app's own clock, the same `now` as `last_active`. Do not
     use the database's `now()`: Postgres `timestamp without time zone` takes the server
     session's zone.
2. **At sign-in, the field is passed through to the session it starts:**
   - `/login` with no 2FA starts the session with `shared_device=body.shared_device`.
   - `/login` with 2FA mints
     `two_factor_challenge_claims(..., shared_device=body.shared_device)`.
   - `/login/2fa` reads `shared = shared_device_of(claims)`. It either starts the session
     with `shared` or mints the password-change challenge with `shared_device=shared`.
   - A passkey finish (its request mixes in `SharedDeviceChoice`) starts the session with
     `body.shared_device`, or mints the password-change challenge with it.
   - `/login/set-password` reads `shared_device_of(claims)` and starts the session with
     it.
3. **The three policy call sites.** Each uses the row's `shared_device`, `created_at`
   and `last_active`, with
   `policy = SessionPolicy(access_lifetime=<setting>, refresh_lifetime=<setting>)`:
   - (a) **Minting a pair**, at sign-in and at every refresh:
     `access_claims(..., lifetime=access_lifetime(policy, ...))` and
     `refresh_claims(..., lifetime=refresh_lifetime(policy, ...))`.
   - (b) **`/auth/refresh`**:
     - if `session_expired(...)`, answer `AuthError(AuthErrorCode.SESSION_ENDED)`;
     - otherwise set `last_active = now` and
       `expires_at = session_expires_at(..., last_active=now)`.
   - (c) **Every request** (`get_current_user`): answer the route's 401 when the row has
     ended. Add `expires_at > now` to the row query, or call `session_expired`.
4. **Every token that is minted again for a live session keeps its row.** A refresh, a
   company or role switch, or a password change that keeps the caller's session all
   reload the row and mint through (a). So a shared session stays shared, and keeps its
   `created_at`, across a password change.
5. **A route that ends the caller's own session.** Proposed:
   `DELETE /auth/sessions/current`. It ends the session named by the access token's
   `sid` and answers 204, also when that session has already ended. The client calls it
   before it drops its tokens, and a sign-out that cannot reach the server still signs
   out on the device. `POST /auth/logout` stays "sign out everywhere" in all three apps.
6. **Rollout order: the server first, then the client.** kastlan's and keksdose's login
   schemas ignore unknown fields. Kurvenschmiede's passkey body (`PasskeySignIn`)
   forbids them, so a client that sends `shared_device` before its backend has the
   field gets a 422 there.

#### kastlan

kastlan has a session table and its row check already. It needs the two columns, the
field passed through, the policy, and a route for its own session.

- **Migration:** `user_sessions.shared_device` and `user_sessions.expires_at` (model at
  `kastlan/domain/models/session.py:12`; new revision in `alembic/versions/`, after
  `c8e0a2b4d6f8`). The repository's `list_active_for_user` and `get_active_for_user`
  (`adapters/persistence/session_repository.py:23`, `:54`) add `expires_at > now`, so the
  sessions card stops listing dead rows. `SessionResponse` (`domain/schemas/auth.py:329`)
  may show `shared_device`.
- **The field passed on sign-in:**
  - `LoginRequest` (`domain/schemas/auth.py:21`) subclasses the kit's, so it receives
    `shared_device` automatically.
  - `/login` (`adapters/api/auth_router.py:134`) passes it into
    `create_2fa_challenge_token` (`domain/services/tokens.py:76`, which then takes
    `shared_device` and hands it to `two_factor_challenge_claims`). Otherwise it passes
    it to `sign_in` (`auth_router.py:136`).
  - `sign_in` (`adapters/api/auth_helpers.py:106`) takes `shared_device`. It hands it to
    `create_password_change_token` (`tokens.py:85`, via
    `challenge_claims(..., shared_device=)`) at `auth_helpers.py:111`, or to
    `issue_session` at `:112`.
  - `/login/2fa` (`auth_router.py:168`): `sign_in(..., shared_device=shared_device_of(payload))`.
  - `/login/set-password` (`auth_router.py:185`):
    `issue_session(..., shared_device=shared_device_of(payload))`.
  - Passkey finish: `PasskeyLoginFinishRequest` (`domain/schemas/auth.py:429`) mixes in
    `SharedDeviceChoice`, and `adapters/api/passkey_router.py:78` passes
    `payload.shared_device` to `sign_in`.
- **(a) Minting.** `issue_session` (`auth_helpers.py:63`):
  - It creates the row with `shared_device` and `expires_at` (`create_user_session` at
    `:88` → `SessionService.create_session`, `domain/services/session_service.py:51`).
  - When a `session_id` is given (refresh `auth_router.py:215`, switches `:272`, `:288`,
    `:305`, `:319`, `dev_router.py:90`), it loads the row.
  - It passes `access_lifetime(...)` to `create_access_token` (`tokens.py:30`, already
    takes `lifetime`) at `auth_helpers.py:93`.
  - It passes `refresh_lifetime(...)` to `create_refresh_token` (`tokens.py:56`, which
    must take `lifetime`; today it is fixed at `refresh_token_expire_days`) at
    `auth_helpers.py:100`.
  - Policy: `SessionPolicy(access_lifetime=timedelta(minutes=settings.access_token_expire_minutes), refresh_lifetime=timedelta(days=settings.refresh_token_expire_days))`.
- **(b) Refresh.** `touch_session` (`session_service.py:76`, called at
  `auth_router.py:213`):
  - It returns False (→ `session_ended`) when `session_expired(...)`.
  - Otherwise it stamps `last_active` and `expires_at`.
- **(c) Every request.** `authenticate_access` (`infrastructure/dependencies.py:102`):
  the live query at `:122-131` adds `UserSession.expires_at > utc_now()`.
- **Sign-out.**
  - Add `DELETE /auth/sessions/current` before `DELETE /auth/sessions/{session_id}`
    (`auth_router.py:572`); otherwise "current" is read as an id. It revokes
    `current_user.current_session_id` (`domain/models/auth.py:117`).
  - The frontend's `logout` (`frontend/src/features/auth/stores/auth-store.ts:72`) calls
    it before `clearTokens` (`shared/api/client.ts:149`), and never waits on a failure.

#### keksdose

keksdose has NO session table today: a session is a JWT pair plus the per-account cutoff
`sessions_invalid_before`. Ending one device's session on the server needs a row. So
keksdose adds kastlan's table shape, which is the biggest piece of this adopt.

- **Migration:** a new `user_sessions` table in `backend/alembic/versions/` (after
  `20261110_0186`) with columns `id` (`String(64)`, `secrets.token_urlsafe(32)`),
  `user_id` (FK, cascade), `created_at`, `last_active`, `expires_at` (indexed),
  `shared_device`, `is_active`, and optionally `device`. If RLS applies, it follows
  `user_key_wraps`: the anonymous sign-in endpoints bind `set_current_user`, as
  `password_change_challenge` does (`adapters/api/auth_router.py:297`).
- **Tokens carry `sid`:**
  - `issue_access_token` / `issue_refresh_token`
    (`domain/services/auth_service.py:202`, `:224`) take the row and pass
    `extra={"sid": row.id}`.
  - They also pass `lifetime=access_lifetime(...)` / `refresh_lifetime(...)` with
    `SessionPolicy(access_lifetime=timedelta(minutes=settings.access_token_expire_minutes), refresh_lifetime=timedelta(minutes=settings.refresh_token_expire_minutes))`
    (`infrastructure/settings.py:43-44`; 24 h and 30 d are the kit's defaults).
  - `record_login` (`auth_service.py:178`) is the natural place to create the row.
- **Tokens minted before the deploy have no `sid`.** Choose one:
  - Refuse sid-less access tokens (401). `/auth/refresh` then turns a sid-less refresh
    token that the cutoff has not revoked into a new normal row, so nobody is signed out
    by the deploy.
  - Or stamp everyone's cutoff once, so everyone signs in again.
- **The field passed on sign-in:**
  - `UserLogin` (`domain/schemas/auth.py:114`) mixes in `SharedDeviceChoice` (or
    subclasses the kit's `LoginRequest`).
  - `/login` (`auth_router.py:723`) passes it to `issue_2fa_challenge`
    (`auth_service.py:307`, `two_factor_challenge_claims(..., shared_device=)`) at
    `:747`, to `password_change_challenge` at `:753`, or to the session at `:756-757`.
  - `/login/2fa` (`:763`) reads `shared_device_of(claims)` and passes it on at `:829` or
    `:833-834`.
  - `password_change_challenge` (`:297`) and `issue_password_change_challenge`
    (`auth_service.py:324`) take `shared_device`.
  - `/login/set-password` (`:840`) reads it at `:915-916`.
  - Passkey: `PasskeyLoginFinishRequest` (`domain/schemas/auth.py:510`) mixes in
    `SharedDeviceChoice`, and `adapters/api/passkey_router.py:125` and `:131-132` pass
    it.
  - Register (`auth_router.py:461`) starts a normal session.
  - The demo (`:580`) mints no refresh token and needs no row. Its access token is
    already refused by `refused_for_demo`, and it is never shared.
- **(a) Minting:** every `issue_*_token` pair above, plus refresh (`:963-964`) and the
  password change (`:1381-1382`).
  - The password change follows kastlan's rule: mark every OTHER row inactive and keep
    the caller's.
  - Its cutoff (`end_sessions` at `:1377`) refuses every token minted before it, so the
    caller's new pair is minted after the cutoff with the same `sid`. That is today's
    order already.
  - The same applies to `/login/set-password`, with its cutoff at `:910`.
- **(b) Refresh** (`auth_router.py:930`): after `refresh_token_is_revoked` (`:949`):
  - load the row by `sid`;
  - refuse with `_session_ended` (`:922`) when it is missing, inactive or
    `session_expired`;
  - otherwise stamp `last_active` and `expires_at`.
- **(c) Every request:** `get_current_user` (`infrastructure/dependencies.py:82`), after
  the cutoff check at `:131`. Load the row by the access token's `sid` and answer 401
  when it has ended. Personal API tokens (the branch before `:113`) have no session.
- **Optional:** the `X-Shared-Computer` no-store middleware
  (`adapters/api/shared_computer.py:19`) could read the row's `shared_device` instead of
  the client's header.
- **Sign-out:**
  - Add `DELETE /auth/sessions/current`.
  - `useSignOut` (`frontend/src/features/auth/use-sign-out.tsx:54`) already calls the
    server "while the token still holds, and never stops a sign-out" (push unsubscribe).
    The revoke goes next to it, before `useAuth.getState().clear()` at `:55`.
  - `POST /auth/logout` (`auth_router.py:977`) stays "sign out everywhere": the cutoff,
    plus marking every row inactive.

#### Kurvenschmiede

Kurvenschmiede also has NO session table (the cutoff alone) and no 2FA. It needs the same
table as keksdose.

- **Migration:** `user_sessions` in `backend/alembic/versions/` (after
  `0061_feedback_files_in_the_store`), the same columns as keksdose's.
- **Tokens carry `sid`:**
  - `create_access_token` / `create_refresh_token`
    (`kurvenschmiede/infrastructure/security.py:398`, `:422`) take the row's `sid` and
    the policy's lifetimes.
  - Policy: `SessionPolicy(access_lifetime=timedelta(minutes=settings.access_token_expire_minutes), refresh_lifetime=timedelta(minutes=settings.refresh_token_expire_minutes))`
    (`infrastructure/settings.py:145-146`, 24 h and 30 d).
  - `issue_tokens` (`domain/services/auth_service.py:146`) and `token_response`
    (`adapters/api/auth_router.py:103`) take the row.
  - Legacy sid-less tokens: as for keksdose.
- **The field passed on sign-in:**
  - `UserLogin` (`domain/schemas/auth.py:41`) mixes in `SharedDeviceChoice`.
  - `sign_in_answer` (`auth_router.py:135`) takes `shared_device`. It passes it to
    `create_password_change_challenge` (`security.py:432`,
    `challenge_claims(..., shared_device=)`) at `:143`, or to the session at `:145`.
  - `/login` (`:148`) passes `payload.shared_device`.
  - `/login/set-password` (`:171`) reads `shared_device_of(...)` from the challenge's
    claims. `account_for_token` (`auth_service.py:199`) answers the user only, so it
    needs to hand back the claims too. The session is started at `:191`.
  - **Passkey:** `PasskeySignIn` (`domain/schemas/auth.py:288`, `extra="forbid"`) MUST
    mix in `SharedDeviceChoice` BEFORE the client sends the field.
    `adapters/api/passkey_router.py:128` passes `payload.shared_device` to
    `sign_in_answer`.
- **(a) Minting:** `token_response` for register (`:132`), sign-in (`:145`),
  set-password (`:191`), refresh (`:216`), and the password change (`:299`, which keeps
  the caller's row and its `shared_device`; `set_password` → `end_sessions` at
  `auth_service.py:169` stamps the cutoff, so the caller's row must be (re)minted after
  it).
- **(b) Refresh** (`auth_router.py:194`): `account_for_token(..., REFRESH_TOKEN_TYPE)`,
  then load the row by `sid`. A missing, inactive or `session_expired` row is
  `AuthError(AuthErrorCode.SESSION_ENDED)` (`:215`). Otherwise stamp the row.
- **(c) Every request:** `get_current_user` (`infrastructure/dependencies.py:27`) →
  `account_for_token` (`auth_service.py:199`). The access token's `sid` row must be live,
  and refusals use `TokenRefusal.ENDED`.
- **Sign-out:**
  - Add `DELETE /auth/sessions/current`.
  - The frontend's `clear` (`frontend/src/shared/state/auth-store.ts:84`) or its caller
    calls it before dropping the tokens.
  - `POST /auth/logout` (`auth_router.py:429`; `shared/api/endpoints.ts:264`) stays
    "sign out everywhere".

### The object store: `exists`, `check`, and `ensure_bucket` (commit b036fc7)

**What changed** (`eifi1_server_kit.objects`):

- **`exists(key) -> bool`**, on the `ObjectStore` port and all three backends.
  - It reads the object's metadata, never its bytes: a stat locally, `blob.exists()` on
    Cloud Storage, `stat_object` on S3.
  - `False` means absent and nothing else. A store that cannot answer raises
    `ObjectStoreError`. S3's absent codes (`NoSuchKey`, `NoSuchBucket`, `NotFound`) give
    `False`.
- **`check()`**, on the port and all three backends: one cheap request for a readiness
  probe or an admin page. It raises `ObjectStoreError` unless the store is reachable and
  its bucket is there, and it creates nothing.
  - **Local:** passes when the root, or the directory above it before the first save has
    made it, is a directory this process can write to.
  - **Cloud Storage:** lists at most one object. `roles/storage.objectUser` allows that,
    but it does not allow reading the bucket's own metadata.
  - **S3:** uses keksdose's `bucket_exists`, and a missing bucket now FAILS the check.
- **`ensure_bucket()`**, on `LocalObjectStore` and `S3ObjectStore` only, and opt-in.
  - It creates the root or the bucket when the app asks. A bucket another process created
    first is not a failure.
  - No save ever creates a bucket, so production never does. `GcsObjectStore` has no
    `ensure_bucket`: a Cloud Storage bucket is created by its deploy.
- `ObjectStore` gains two members. Any app with its own implementation of the port must
  add them. None of the three apps has one.

**Why.** keksdose needs these before it can move onto the kit's store; Marcel approved
them for 0.27.

- **keksdose** (when it moves onto the store; `backend/keksdose/adapters/external/invoice_file_store.py`):
  - `object_exists` (`:127`, `:349`) becomes `store.exists(key)`. Its one caller is
    `adapters/api/support_router.py:185`.
  - `healthcheck` (`:143`, `:204`, `:387`) becomes `store.check()`. Its callers are
    `adapters/api/upload_guards.py:125`, `domain/services/system_health_service.py:223` and
    `seed.py:3238`. Two differences:
    - The local check no longer creates `uploads_dir` (`:204-207` did).
    - The S3 check fails on a missing bucket (`:389` ignored `bucket_exists`'s answer).
  - The bucket that `save_object` created on the first upload (`_ENSURED_BUCKETS`,
    `:299-307`) becomes `await store.ensure_bucket()`, called once at the app's start in
    development only (the dev MinIO, the local root). Production keeps its deploy-made
    bucket.
- **Kurvenschmiede:** no change needed. `infrastructure/object_store.py:61` may add
  `await object_store().check()` to a readiness probe; its runtime account's
  `roles/storage.objectUser` is enough for it.
- **kastlan:** nothing (it does not use the store).

### Stale notes about Kurvenschmiede (commit 5e2ae4e)

**What changed:** docs and comments only.
- Kurvenschmiede's feedback has been plain text since its migration 0059, so its titles
  are searchable, and the `public_search` note no longer names it.
- It has had no CUSTOMER role since 0060, so the `FeedbackActor.role` note and the README
  now say that keksdose and Kurvenschmiede let every signed-in account in.
- The dev switch's example refusal is now keksdose's demo account and Kurvenschmiede's
  "plan for a role without one".
- The audit note lists what Kurvenschmiede still encrypts: project name, description and
  inputs, gear, and translation text and note.
- The translation review's note about Kurvenschmiede's sealed rows stays, because those
  rows are still sealed.

**Adopt:** nothing, in any app.

### The app's base URL is required in every mail key (commit a2b1dad, BREAKING in the type only)

**What changed:**
- `MailMarker.idempotency_key(day, *, app_base_url)` has no default any more.
- `QueueService(queue, port, *, app_base_url, limit=QUEUE_FLUSH_LIMIT)` has no default
  either, and `app_base_url` now comes first among the keywords.
- Leaving it out raises Python's own `TypeError`.
- `None` raises a `TypeError` saying the base URL is required. `QueueService` raises it
  when it is built.
- The 0.22 key without the host is gone from both.
- The feedback notice links (`feedback_inbox_href(..., app_base_url=None)` and the others)
  keep their optional base. There `None` means a relative path for a push or an inbox row;
  it is not an idempotency key.

**Why.** 0.23 put the app's host into Resend's `Idempotency-Key`, so two apps on one
Resend team stop colliding: before, the second app got a 409 and its mail was dropped
after three tries. But the parameter stayed optional, so a new call site that left it out
silently brought the collision back. Marcel approved the change on 2026-11-13.

- **keksdose:** its code already passes it
  (`backend/keksdose/domain/services/notification_queue_service.py:125`, with
  `app_base_url=get_settings().app_base_url`, a `str` setting with a default). Its tests
  call neither (`grep -rn "QueueService(\|idempotency_key(" backend/tests` finds only a test
  name, `tests/unit/test_infrastructure.py:217`). Nothing to do.
- **kastlan:** its code already passes it (`kastlan/domain/services/overdue_mail.py:158`,
  `app_base_url=settings.frontend_base_url`, a `str` with a default). Its tests call
  neither (`grep -rn "QueueService(\|idempotency_key(" tests` finds nothing).
  `kastlan/infrastructure/email.py:146`'s docstring still writes
  `MailMarker(…).idempotency_key(today)`; it could name `app_base_url` (a doc fix only).
- **Kurvenschmiede:** uses neither. Nothing to do.

- **Registration** (Marcel 2026-11-13): `RegisterRequest` takes `shared_device` too, through the
  same `SharedDeviceChoice`; the session created at the end of registration uses the policy as a
  sign-in's does.
