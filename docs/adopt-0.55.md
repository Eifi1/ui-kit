# Adopting `@eifi1/ui-kit` 0.55 (and server-kit 0.21)

ui-kit 0.55 closes every open point the kit carried: kastlan's reuse-audit proposals 1–8, the
parts held back from 0.53, the old "later" list, Kurvenschmiede's and keksdose's notes since
0.54, and keksdose's register fit. server-kit 0.21 is its backend half (proposals 9–12, the
TOTP replay rule, keksdose's F-63, the dependency audit). The places are from keksdose,
kastlan and Kurvenschmiede (KS) on 2026-11-04 (`frontend/src`, `backend/`).

**From 0.52, adopt 0.53 and 0.54 first:** their notes apply (docs/adopt-0.53.md,
docs/adopt-0.54.md). An app on 0.52's must-change list can go straight to `^0.55.0`.

**Legal wording:** none. No `legal.*` sentence changed; the new consent and footer words are
outside the legal namespace.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:**

- `ServerWakeWatcher`: `start()` returns a `ServerWakeToken` (a number) where it returned
  `true`, still `false` otherwise, so `end(token)` ends exactly that request. keksdose:
  `shared/api/server-wake-store.ts:75` widens `noteRequestStart(): boolean` to
  `ServerWakeToken | false`, `noteRequestEnd(token?)` calls `wakeWatcher.end(token)`, and
  `client.ts` types `_wake?: ServerWakeToken | false` (`:186`, `:202`:
  `if (_wake) noteRequestEnd(_wake)`); `server-wake-store.test.ts:32, :79, :92` and
  `client.test.ts:456` assert `toBeTruthy()` instead of `toBe(true)`. kastlan and KS: nothing
  (`attachServerWake` and `track` end their own request).
- `SyncState` can be `"waitingForTab"`: a switch over it that must be exhaustive adds the case.
  No app has one (none imports `SyncState`, `syncState` or `SyncEngineState`).
- The four `--status-synced` / `--status-pending` / `--status-edited` / `--status-error` tokens
  are gone. Nothing in the kit or the apps reads them.
- The npm package ships `dist` only (−2 MB packed, −6.8 MB installed): an `@source` that still
  points at `@eifi1/ui-kit/src` scans nothing, silently. Use 0.52's pair,
  `@source "…/@eifi1/ui-kit/dist";` and `@source not "…/@eifi1/ui-kit/dist/**/*.{map,d.ts}";`.
  keksdose and KS have it; kastlan has it on its kit branches (`feat/kit-0.51` on).
- **keksdose tests:** the Treemap no longer renders recharts' `<Treemap>`, so
  `category-treemap.test.tsx`, `spending-tab.test.tsx` and `food-group-tiles.test.tsx`, which
  mock it to read the props the kit handed it, assert the drawn tiles instead (a
  `ResponsiveContainer` stand-in handing its child 800×300, then `[aria-label]` groups, rect
  fills, label text, and `.recharts-tooltip-wrapper` on hover), as the kit's own suite does.

The rest is additive: each part replaces app code that can go when the app gets to it.

## Feedback

- **The inbox, assembled once:** `useFeedbackInbox(options)` and `FeedbackInbox` (feedback §13).
  The app passes its TanStack mutation results as they are (`update`, `reply`, `rework`; the kit
  reads `mutateAsync` and `isPending`), its rows and its slots (`votes`, `publicSwitch`,
  `comments`, `columns`, `swipe`, `commit`, `renderDate`, `renderDetail`, `header`, `table`,
  `detail`, `phoneActions`). `?row=` takes digits only (`?row=1e2` no longer opens #100), every
  row's link opens that row, and `loading` shows "Loading…" in the table.
  - kastlan: `<FeedbackInbox rows loading mine canEdit={isAdmin} viewerId update reply rework commit onUpload fetcher header={…} renderDetail={(_, d) => <div data-tour="feedback-row-detail">{d}</div>} />`; about 105 lines of pages/feedback-page.tsx go (`:98-119`, `:134-145`, `:151-204`). Its editors now also wait while a rework sends.
  - keksdose: rename the reply's `url` → `attachmentUrl` and the rework's `body`/`url` → `note`/`attachmentUrl`; pass `votes publicSwitch commit comments={(fb) => <RowComments …/>} swipe={{ end: prefs.right, start: prefs.left }} renderDate onCaptureScreenshot={captureForRework}`; about 130 lines go. With `commit`, the status cell is under the write lock too, as the actions column was: your call.
  - KS: rename `url` → `attachmentUrl` in reply and rework; `votes={publicReader} publicSwitch renderDate comments={…} table={{ edgeFade: true, mobileExpandAsDialog: true, locale }}`; about 85 lines go. The `?report=` rewrite and `ReportComments` stay.
- **Modal `onDismissRefused(via)`** (`"backdrop" | "escape" | "back" | "close"`), once per
  refused press under `busy` or `held`. keksdose's recovery-code-pane brings its banner back:
  `onDismissRefused={() => setCloseRefused(true)}` (the string `privacy.recovery_close_refused`
  is in 2882bf66's parent); guard with `code !== null` to stay quiet while busy.

## Sync, session and shell

- **`HeldChangesBanner`** (`count`, `message`, `extra`, `onSwitchBack`, `onDiscard`,
  `formatError`, `variant`): the warning banner for changes that can't be sent from here; Discard
  asks first with the count; a failure stays visible.
  - keksdose: app/held-changes-banner.tsx shrinks to `<HeldChangesBanner variant="strip" count={…} message={…} onSwitchBack={heldBudget ? () => activateAsync(heldBudget.id) : undefined} onDiscard={discardWaitingChanges} />`; keep the budget wording in the confirm with `labels={{ confirmTitle, confirmBody }}` or drop `sync.discard_held_*`.
  - kastlan: handover-sync-banner.tsx:57-68 becomes `<HeldChangesBanner count={refused.length} message={…} extra={<ul>…</ul>} onDiscard={…} />`. Discard now asks, a failure shows, the tone goes from danger to warning, and the count sentence shows (its `title=` was only a hover tooltip).
- **"Waiting for another tab":** the sync indicator shows an hourglass while a round waits for
  another tab's lock (`SyncStatus.waitingForTab`, filled by `useSyncStatus`). kastlan: nothing
  to change (`use-sync-status.ts` spreads the status). keksdose and KS: nothing.
- **`watchSessionElsewhere({ ended, onEnded, checkRestored })`**: a sign-out in another tab, and
  a page restored from the back/forward cache.
  - keksdose: shared/state/auth-store.ts `endSessionChangedElsewhere`, `endSessionChangedWhileCached` and the two listeners go; `ended` reads the mirror owner through `readStored`.
  - kastlan: features/auth/stores/auth-store.ts `:200-205` becomes the watch; `ended` replaces `isSessionEndedElsewhere` (shared/api/client.ts:88-99). New: a restored tab ends its session too.
  - KS: add the watch after the store, `ended` keyed on the persisted user's id (as KS adopted it).
  - **`ended` reads whose session the storage holds, not only whether a token is there**
    (corrected after the release, Kurvenschmiede): another tab may sign out and then in as
    someone else, so a page restored from the back/forward cache finds a token and would keep
    showing the old account while sending the new one's. Compare the stored owner with this
    tab's user (keksdose's mirror owner, KS's persisted user id); "no token" is only the
    simplest case of "not mine".
- **AppShell `pageFallback`**: a Suspense round the content area, so the bar and nav stay while
  a lazy page loads. keksdose: `pageFallback={<PageSkeleton />}` and drop `PageSuspense` round
  the `<Outlet />` (its banners then wait with the page; keep `PageSuspense` if they must not).
  kastlan and KS: optional.
- **`PageHeaderSkeleton`** at PageHeader's metrics. keksdose: app/page-skeleton.tsx's header row
  becomes `<PageHeaderSkeleton size="compact" mobileLayout="inline" className="mb-4 px-4 md:px-0" />`.
- **Dev clock reaches the dates:** `setToday`, `todayOverride`, `subscribeToday`, `currentDate`
  in `@eifi1/ui-kit/dates`; `todayIso` and every preset, MiniCalendar's today and the month
  pickers follow it; DevMenu shows its dot while a day is set. keksdose: shared/lib/dev-today.ts
  and the `todayIso` override in shared/ledger/dates.ts:37-44 go; app/dev-boot.ts:49 calls
  `setToday(data.today)`. kastlan and KS: nothing.
- **server-wake `slowOk`** on a request: a heavy read under 7 s never shows "slow".

## Billing (Marcel's decisions, 2026-11-04)

- **`SubscriptionStanding`** / `subscriptionStanding`: one line, in this order: ended; past due
  ("Payment failed — we're retrying. Your plan stays active meanwhile.", no date); trial; free;
  ends on; renews on. **`UsageMeter`**: neutral below the limit, warning at it, danger past it,
  digit-grouped.
  - kastlan: subscription-section.tsx `standingLine` (:285-299) and usage-progress-bar.tsx go. Users see the new past-due and ended lines, "Ends on" for "Cancels on", medium dates, and meters grey below the limit (amber from 80 % before).
  - keksdose: subscription-cards.tsx's `UsageMeter` (:52-69) and `standingLine` (:71-94) go (`size="sm"` keeps the 4px track). Past due no longer says "Renews on"; past the limit is red.
  - KS: add `<SubscriptionStanding overview={now} />` and replace "Curves: 3 of 10" with `<UsageMeter … />`.

## Components and fields

- **`refused`** on Button and IconButton: stays focusable (`aria-disabled`), swallows the
  activation, says why. KS's `shared/lib/table-columns.tsx` DeleteButton drops its Tooltip round a
  disabled IconButton (`refused={t("sharing.delete_owner_only")}`).
- **One focus-restore rule** in `useFocusTrap` and the overlays (Popover, Dropdown, HoverMenu,
  the pickers, FloatingPanel, the column drawer, AlertBanner's ×, Treemap, DangerConfirm,
  InlineConfirm): a gone or disabled opener sends focus to the next stop, never to `<body>`, and
  a focus the app places in its own close handler stays. Nothing to drop.
- **One editable-content rule** for hotkeys, the tour, BulkActionBar, the clipboard minus and the
  Lightbox: `plaintext-only` counts, a `contenteditable="false"` island does not.
- **`CameraButton`, `CameraCapture`, `useHasCamera`**: an in-page viewfinder on `getUserMedia`,
  the `capture` input as fallback.
  - kastlan: room-inspector.tsx:200-212 and unit-rooms-tab.tsx:96-99 use `<CameraButton variant="ghost" size="sm" noCamera="hide" onFiles={…} />`; defects-step.tsx:295-304 adds one beside its multiple FileButton.
  - keksdose: shared/hooks/use-has-camera.ts and features/invoices/camera-capture.tsx go (pass `fileName="receipt"` and its `invoices.*` words through `labels`).
- **`FieldSuggestion`** as a field's `hint`: "suggested from" with a Clear. keksdose:
  transaction-fields.tsx:494 (`from={t("transactions.last_used")}`) and split-editor.tsx's
  hand-drawn caption.
- **`useDebounce(value, ms, { key })`**: settles on a key. KS: shared/lib/use-debounced.ts goes;
  corner-motion.tsx:48, load-command-dialog.tsx:455, use-dynamics.ts:35 and
  control-page.tsx:112 pass `{ key: JSON.stringify(…) }`.
- **`ConsentAgainNotice`** (card or banner). keksdose: shared/components/consent-again-notice.tsx
  goes; pool-reconsent.tsx drops the chrome props (the kit's words are the same) and keeps
  `wording`, `wordingLink`, `note`, `agreePending`; the title is an `h3` (`headingAs="div"` keeps
  a div).
- **`siteLinks`** on LegalFooter / PublicFooter: a row for public pages that aren't legal.
- **`USER_ROSTER_PAGE_SIZE` (25) and `USER_ROSTER_MAX_PAGE_SIZE` (200)**, server-kit's roster
  page sizes, held to its 0.21 export. keksdose: features/admin/users-panel.tsx:386-388's
  `DEFAULT_PAGE_SIZE` and `MAX_PAGE_SIZE` copies go.

## Charts

- **SeriesChart is named after its axes** when it has no `aria-label`
  (`seriesChart.nameFromAxes`). KS: shared/charts/series-chart.tsx's `useAxesName` and the
  `aria-label` plumbing go, and `common.chart_name` leaves the seven locale files; every
  announced name stays the same. keksdose and kastlan: nothing.
- **`LegendedSeriesChart`** in `@eifi1/ui-kit/chart`. keksdose: reports/charts/legended-series-chart.tsx
  goes; its six callers switch (same props); the GroupedBar/StackedArea test cases stub
  `LegendedSeriesChart`. kastlan: charts-tab.tsx's financial chart and revenue-chart.tsx drop
  their hidden state and `ToggleLegend`.
- **Treemap** draws itself (−239 kB from `{ Treemap }` with recharts bundled); see Must change
  for keksdose's tests. **SeriesChart** no longer redraws on a page render or a keyboard step when
  its props are stable (memoise `rows`, `series`, `axes`, `x`, the formatters). **More contrast**
  edges a low-contrast bar or area in its own darker shade instead of ink.

## Tables, release notes and the rest

- **The register fit** (keksdose, 0.51.2 leftovers). A virtualized DataTable now draws a
  screenful of rows in the render they arrive in, where it drew one row and the rest a frame
  later, so the fit measures the same table on every load before the first paint. In the kit's
  Chromium fixture (`scripts/register-fit-frames.mjs`, 20 loads per width) the final column set
  went from two per width to one at 1124, 1280 and 1440, and the too-wide frame (7–11 of 20 loads,
  50–120 ms) to none. c53c692 is back: the lock goes when its signature moves on, so a column that
  fits comes back after a scroll and a refetch (10 of 18 runs lost Accounts without it).
  keksdose: re-measure with `.feedback-live/kit0512-run.sh`, `kit0512-frames.mjs` and
  `kit0512-analyse.py`, ten loads at each width: one final set per width, 0 too wide, 0
  overflowing, and about 50 rows in the first frame with rows; then once by hand, sort or filter
  so a column leaves, edit a transaction, and see a fitting column come back. One edge stays by
  design: after scrolling down and back, the top window holds the visible rows plus overscan, so
  a later lock reset there can still change the columns (drawing more rows while scrolling would
  cost every scroll).
- **`parseChangelog`, `parseChangelogItem`, `changelogSectionKey`, `groupByScope`** and
  **`ReleaseNotes`**.
  - keksdose: features/changelog/changelog-format.ts and its test go; /changelog and the what's-new dialog render `<ReleaseNotes release={v} />` (`frame="plain"` in the dialog); "Faster" via `labels={{ sections: { changed: t("changelog.section_perf") } }}`. The leftover "closes #639" in 0.4.72 goes.
  - kastlan: utils/parse-changelog.ts and its test go; pages/changelog-page.tsx uses `parseChangelog` (the result is the array) and `<ReleaseNotes release={r} />`; breaking-change notes appear whole.

## server-kit 0.21

Bump the `[tool.uv.sources]` URL to the v0.21.0 wheel and run
`uv lock --upgrade-package eifi1-server-kit` (README "Install"). Nothing breaks for an app that
does nothing; `UserResponse.role` is `str | None` and still required.

- **TOTP, one step accepted once:** `totp_matched_step`, `totp_step_accepted`, `TOTP_STEP_CLAIM`,
  `two_factor_challenge_claims`, `two_factor_challenge_is_spent`. kastlan: drop `_matched_step`,
  `_require_pyotp` and the step comparison in two_factor_service.py (pyotp can become a dev
  dependency), and `TOTP_STEP_CLAIM` in domain/services/tokens.py. keksdose: drop `_matched_step`
  and `TOTP_STEP_CLAIM` (infrastructure/security.py:74-77); `two_factor_challenge_is_spent`
  replaces its own (auth_service.py:310-320). KS: none yet (no 2FA).
- **`database_is_local(url, *, ports)`:** local means loopback on 5432 or a known unix socket,
  so a cloud-sql-proxy tunnel on 127.0.0.1:5433+ is not local. kastlan: `is_local_run`
  (config.py) closes the feedback-db.sh hole. keksdose: its Docker Postgres on 5433 is not local
  unless it passes `ports={5432, 5433}` (after moving its feedback tunnel off 5433). KS:
  local_run.py's host parsing goes.
- **`secret_problems(value, *, name, min_length, placeholders)`:** replaces
  `INSECURE_JWT_SECRETS` and the placeholder checks in all three (kastlan passes its seal-key
  template line in `placeholders=` or renames it).
- **WebAuthn challenge kinds** and `challenge_claims(extra=)`: keksdose passkey_service.py,
  kastlan domain/services/tokens.py; KS's `_SIGN_IN` becomes `"webauthn_auth"` (a ceremony in
  flight across the deploy fails once).
- **`ThrottledError(detail, retry_after)` and `charge(limiter, key, detail)`:** 429 with
  Retry-After, no code. kastlan auth_helpers.py:64-72 (13 call sites), keksdose `_throttle`
  (about 10), KS `_hold` and its copies (pass `lambda s: f"… {s} seconds."`).
- **Mail:** `ResendClient` logs no response body; kastlan can move `_send_resend` to it.
  `AccountNoticeKind.PASSKEY_ADDED_NOTICE` for keksdose's `_announce_added`.
- **`parse_sort`** accepts `name.` as keksdose's register does.
- **The dependency audit:** each backend's `check:security:backend` becomes
  `uv run --no-sync python -I -m eifi1_server_kit.dependency_audit` (keksdose and KS from
  `backend/`, kastlan from the root), replacing `pip-audit`: it blocks on high and critical
  only, as the frontends' `npm audit --audit-level=high` does. Exceptions:
  `--ignore-until-fixed ID=reason`. Rename the CI step; the Dependabot check before a push stays.

## Dependencies

The kit's own updates within their ranges, and tsup 9 (esbuild 0.28 without the override). The
peer ranges are unchanged: nothing to do in the apps.

## 0.55.1

**Must change:** nothing in the three apps. `SubscriptionStandingOverview`'s three dates are
optional now: code that READS them from a value of that type sees `| undefined` beside `null`;
the apps only pass one to `SubscriptionStanding` / `subscriptionStanding`.

- **A refused or pending Button / IconButton keeps its press out of a clickable row around
  it**, as a natively disabled button's click never reached one. `stopPropagation` is no
  longer needed for that (Kurvenschmiede's owner-only delete opened its row without it).
- adopt-0.55's `watchSessionElsewhere` lines: `ended` compares whose session the storage
  holds with this tab's (above). keksdose keys on its mirror owner, KS on its persisted user
  id, and kastlan on the server session's `sid` (stricter: the same person signing in again
  elsewhere also reloads a restored page, which kastlan wants), each with a test for a restored
  page after a sign-in elsewhere.
- **`SubscriptionStandingOverview`'s three dates are optional** (`trial_ends_at`,
  `comped_until`, `current_period_end`; left out reads as `null`): an app whose generated
  overview has them optional passes the overview as it is (keksdose's subscription-cards.tsx
  stops naming them).
- **`LegendedSeriesChart` `legendAlign: "center" | "start"`** (centre by default, as before):
  keksdose's cash-buffer key passes `legendAlign="start"` to stay under the plot's edge.
- **For the apps' own guards:** `FeedbackInbox` owns the phone's swipe actions and the desktop
  actions column, so a test that reads the page's source for them (keksdose's parity test)
  looks for the component instead.
- **server-kit 0.21, said louder** (keksdose's adoption):
  - `database_is_local` reads every port in `ports` as local, so a tunnel to a LIVE database
    must not listen on one of them (keksdose moved its feedback tunnel from 5433 to 5439 when it
    passed `ports={5432, 5433}`);
  - an app that refuses to start on `secret_problems` stops its DEPLOY at boot when a deployed
    secret is under 32 characters: check the deployed secrets' length before the bump goes out
    (keksdose's are 64);
  - the dependency audit runs `uv audit`, a preview in uv 0.12; CI installs the latest uv, and a
    change to the preview fails the step with exit 2, never silently.
