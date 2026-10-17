# Adopting `@eifi1/ui-kit` 0.43

## Billing: the portal in a new tab

Settled 2026-10-17 (docs/billing-harmonization.md §17, Marcel: "Portal only"). Every portal
target opens in a new tab: "Payment and invoices", "Cancel subscription" where it still
goes to the portal, and the payment-failed banner's "Update payment method". The app stays
open where it was. **The checkout stays in the same tab**: the page waits for the payer's
return (`useCheckoutProcessing`).

### New names

- **`openProviderPage(fetchUrl, { window? })`**: call it in the click handler itself,
  before any `await`. It opens `about:blank` synchronously and sets `opener = null`, then
  awaits `fetchUrl()` (the app's `POST /billing/portal` with its target, which answers the
  `url`) and points the tab there. On a refusal it closes the tab and rethrows, so the app
  shows its error. If the browser refused the tab (a pop-up blocker), or the tab was closed
  in the meantime, the app's own page goes there instead. It resolves with `"new-tab"` or
  `"same-tab"`. kastlan's `usePortal` (`72c3177`) is the reference.

      onPortal={(target) => {
        openProviderPage(() => api.billingPortal({ target }).then((r) => r.url)).catch(showError);
      }}

  With TanStack Query, open the tab in `mutate`, not in `mutationFn`: `mutationFn` runs a
  tick later, outside the click. Hand `openProviderPage` a `fetchUrl` that calls
  `mutateAsync`, and keep the mutation for its `isPending`:

      const m = useMutation({ mutationFn: ({ target }) => api.billingPortal({ target }) });
      const portal = {
        mutate: (target) => openProviderPage(() => m.mutateAsync({ target }).then((r) => r.url)).catch(() => {}),
        isPending: m.isPending,
      };

  No `onSuccess` that navigates: the app's tab would follow the new one. A mutation whose
  `onError` already shows the error swallows it in the `.catch`, so it is not shown twice.
  kastlan's split (open in `mutate`, set the location in `onSuccess`, close it in
  `onError`) behaves the same.
- **Only the portal moves.** An app whose one "go to the provider" helper also carries the
  checkout keeps that helper for the checkout (same tab, §17.4, so `useCheckoutProcessing`
  sees the payer come back) and calls `openProviderPage` for the portal only.
- **The "opens in a new tab" mark is on by default** (`portalNewTab`, `actionNewTab`):
  land the bump and the new click handler in one commit, or the buttons say "new tab"
  while they still leave this one. Pass `portalNewTab={false}` / `actionNewTab={false}`
  for the meantime otherwise.
- **`useCancelRequest()`** → `{ waiting, view(rowScheduled) }`; `view` answers
  `{ requested, cancelScheduled, noteAsked }`. Types `CancelRequest`, `CancelRequestView`
  and `CancelRequested` (`"cancel" | "resume" | null`). It takes no overview data, so it
  goes BEFORE the overview query and the overview is read once:

      const request = useCancelRequest();
      const { data } = useBillingOverview({ waiting: request.waiting });
      const view = request.view(data?.cancel_at_period_end);

  `waiting` is true from the 204 until the row moves: the query's poll (kastlan's
  `waiting`, a `refetchInterval` inside). `view` is called during render; when the row has
  moved, it drops the request. See the fixes below (kastlan 5).

### New props

- **`SubscriptionActions`**:
  - `portalNewTab` (default `true`): the portal actions carry the `ExternalLink` mark, and
    a reader hears "(opens in a new tab)". `manageHref` and `cancelHref` links get
    `target="_blank"`. A muted note shows under the actions while a way to the portal
    shows: "Payment and invoices open at {provider} in a new tab; {app} stays open here."
    (`billing.portalOpensNewTab(provider, app?)`, in 7 languages). The in-app cancel and
    "Keep subscription" stay unmarked. There is no note under `buyer_only` or before the
    provider. Pass `portalNewTab={false}` only while the handler still opens the portal in
    the same tab.
  - `providerName` (default `"Paddle"`) and `appName` (without it the note says "this
    page stays open"). The kit has no app name in its context, so pass it.
  - `cancelRequested`: see below.
- **`BillingBanner`**: `actionNewTab`. The default is `true` for `kind="payment-failed"`
  with `onAction` (the portal's card page), and `false` for an `actionHref`, which usually
  points at the app's own subscription page.
- **Tests**: a portal action's accessible name now ends in "(opens in a new tab)". Match it
  with a regex (`/^Payment and invoices/`). Mock `window.open` (`vi.spyOn(window, "open")`
  returning a fake tab with `location`, `opener`, `closed` and `close`), and test the
  refusal (the tab is closed) and the blocked path (`open` returns `null`, so
  `location.assign` is called).

### Per app

| App | Change |
| --- | --- |
| kastlan | Replace `usePortal`'s hand-made tab (`features/billing/hooks/use-billing.ts`, the `mutate` wrapper from `72c3177`) with `openProviderPage`, or keep it: it has the same behaviour. With the kit's: `mutate: (target) => openProviderPage(() => m.mutateAsync({ target }).then((r) => r.url))`, keeping `isPending` (above). Drop the own note under `SubscriptionActions` (`subscription-section.tsx:166-169`, `subscription.portalNewTab` in 4 locale files) and pass `providerName="Paddle"` and `appName="Kastlan"`. The kit's words are kastlan's minus "our payment provider"; to keep that phrase, override `billing.portalOpensNewTab` in kastlan's catalogue. Both payment-failed banners (`billing-banners.tsx:34`, `subscription-section.tsx:127`) get the mark by themselves (they use `onAction`). |
| keksdose | **The checkout keeps its helper.** keksdose's own `openProviderPage(url)` (`features/billing/provider-page.ts:10`) also carries the checkout (`subscription-cards.tsx:192`): rename it (e.g. `leaveForProvider`) and keep it for the checkout only, same tab. It also frees the name for the kit's `openProviderPage(fetchUrl)`. **The portal:** `useProviderPortal` (`subscription-cards.tsx:319-327`) navigates in `onSuccess`, after the await, which a pop-up blocker stops. It becomes a function called in the click: `openProviderPage(() => portal.mutateAsync(target).then((r) => r.url)).catch(() => {})`. Drop `onSuccess` (else this tab navigates too); the hook's `onError` already toasts, so the `.catch` swallows; `isPending` and `which` keep working. Its callers: `PaymentCard.open` (`:337-340`) and the banner (`billing-banner.tsx:92`). **Tests:** `billing-banner.test.tsx:118` and `subscription-group.test.tsx:280` move to a `window.open` stub. `SubscriptionActions` (`subscription-cards.tsx:351`): `appName="Keksdose"`. The bump and the handler land together (the mark is on by default, above). |
| Kurvenschmiede | **Only the portal moves.** `goTo` (`features/billing/subscription-settings.tsx:49-52`, `window.location.assign`) stays for the checkout (`checkout.onSuccess`): same tab, §17.4. The portal calls `openProviderPage` synchronously inside `openPortal` (`:145-148`), in place of the mutation whose `onSuccess` navigates after the await: `openProviderPage(() => billingApi.portal(target).then((r) => r.url))`, with `setOpening` before it, `.finally` (today's `onSettled`) after, and the error to `failed`. `SubscriptionActions` (`:194`): `appName="Kurvenschmiede"`. **Tests** (`billing.test.tsx`): the two portal tests (`:117-128` and the cancel one before it) mock `window.open` and expect the tab's `location.href`; the checkout tests keep asserting `location.assign`. |

## Fixes from the 0.42 adoptions

### Per app

| App | Change |
| --- | --- |
| keksdose | **1. DevSwitchers** now reads `DEV_ORIGINAL_ROLE_KEY` again when `enabled` turns true, so "Back to {role}" survives a reload under the async GET probe (`app/dev-switchers.tsx:70`); drop the workaround noted at `:64`. **2.** `GlobalSearch` and `FeedbackMenu` forward `data-*` to their trigger: pass `data-tour="feedback-menu"` (the step's selector, `features/tour/feature-tours.tsx:663`) straight to `FeedbackMenu` and drop the wrapping `<span>` (`app/top-bar.tsx:113`). On `GlobalSearch` it lands on the kit's button (`trigger="button"`); the search span (`:96`) can go once keksdose's own `GlobalSearch()` (`features/search/global-search.tsx:45`) forwards `data-tour` to the kit's (`:197`). **3.** `adminSections`' type leaves out the `leaveOut` sections when TypeScript infers the type arguments. keksdose writes them (`admin-index.ts:219`, `adminSections<AdminOwnSectionId>`), so write `adminSections<AdminOwnSectionId, "billing">(…)` to drop the cast. `ADMIN_SECTION_ORDER` (`admin-index.ts:77`) → `adminSectionOrder<AdminOwnSectionId, "billing">(own, { leaveOut: ["billing"] })`: ids, no labels. **4.** `AdminOverview` (`admin-page.tsx:1136`): pass `error={attention.error}` and `onRetry={() => attention.refetch()}`, and pass `attention.data` as it is (drop `attention.isError ? null : …`, `:1134`): a failed poll keeps the last good tiles, with the error box above them. The words are `adminArea.overviewError` and `adminArea.retry`. **5.** `RoleDefinition.icon` shows in the roster's `RoleChip` too. That is intended and now documented; hand the roster a second vocabulary without `icon` if it should not. **6.** The invitations help line is now "Invite people by e-mail in their language; resend or revoke what's still open." in 7 languages (keksdose's meaning), so drop the override. |
| kastlan | **1.** The Overview shows with no entry (`adminSections` sets `standalone: true` on it, and `SettingsGroup.standalone` is new): drop the Overview entry in `features/settings/admin-catalogue.tsx:58-67`, unless you want it in search. **2.** `adminMenuEntry` is a plain function and reads no provider. `app/top-bar.tsx:226` already passes `labels: adminLabels`, so it is right. `useAdminMenuEntry({ badge })` (new) reads the provider itself. `AdminMenuRow` reads the provider through `useAdminAreaLabels`. **5.** Replace the `asked` state (`subscription-section.tsx:74-75`) with `const request = useCancelRequest()`, in the same place, before the query: `useBillingOverview({ waiting: request.waiting })`. After `data` (`:87-92`, the derivation and `flipAsked` go): `const view = request.view(data?.cancel_at_period_end)`, then `standingLine({ ...data, cancel_at_period_end: view.cancelScheduled })`, and on `SubscriptionActions` keep `cancelAtPeriodEnd={data.cancel_at_period_end}` and add `cancelRequested={view.requested}`. Call `view.noteAsked` as the cancel's and the resume's `onSuccess`. While `"cancel"` is requested without `onResume`, no second "Cancel subscription" shows. |
| Kurvenschmiede | **7.** An `AdminOverview` extra tile may leave out `href`: it is then a quiet count with no link (`AttentionTile`'s `href` is optional too). Put back a count that has no page of its own this way. **TourProvider** comes from `@eifi1/ui-kit/tour`: the tour engine is not in the barrel. |

### Every app

- **Vite keeps the old prebundled kit** after a bump in a running dev server ("does not
  provide an export named …"). Clear `node_modules/.vite`, or restart with `--force`.
- **Apps whose `Settings` read `.env` should blank the billing and dev flags in tests**
  (a root `conftest.py`), or a developer's local `.env` turns routes on in the suite.
- **Put `POST /dev/switch` in the demo-allowed writes** (`DEMO_WRITES` or the app's
  equivalent), so the route's own `409 dev_switch_refused` reaches a demo account rather
  than the demo guard's 403.
- **A window `offline` event in a test also pauses TanStack's `onlineManager`**: restore
  it with an `online` event (or `onlineManager.setOnline(true)`) in `afterEach`, or later
  tests' queries never run.
- New words in every catalogue: `billing.portalOpensNewTab`, `adminArea.overviewError`
  and `adminArea.retry`, plus a changed `adminArea.sections.invitations.help`. An app with
  its own full label catalogue must add them.

## Tours

Settled 2026-10-17 (docs/tours-harmonization.md §6, §8; §7 lists what shipped). keksdose's
/tours body is the kit's now: `TourCatalogue` and `TourCatalogueCard`, with `isTourNew`,
`isTourReset`, `isTourDone`, `doneCount`, `earnedPoints`, `useTourProgress`,
`resetTourProgress`, `useTourUrlSync` and `useTourCatalogueUrlState`, all from
`@eifi1/ui-kit/tour` (and the barrel). Each app keeps its route, its page header, its topic
words, its step lists and `prepare()`.

**Points everywhere (Marcel, §6.1).** Every tour carries `points`, in every app: the card
shows the chip, and each app adds a points `StatTile` in its page header (the catalogue's
`header` slot) and a toast when `complete(tour)` returns `true`. kastlan and Kurvenschmiede
had answered "no points"; Marcel settled it the other way so the tours look the same.
The header counts with the kit: "x of y" is `doneCount(tours, completed)` of
`tours.length`, the tile `earnedPoints(tours, completed)`. Both count by `isTourDone`, so
a tour reset by an update counts again only once it is taken again, as on its card; a
count by `completed[id]` alone would not.

**Updated tours (§8).** When an app fixes or reworks a tour, it sets
`updated: {date, reason}` on it (`date` an ISO day; `reason` optional, for display only).
Completions from before that day began on the device stop counting: the tour is to do
again, the card says "Reset on {date}: {reason}" ("Reset on {date}" without a reason),
and `TourMenu` shows "Updated". Pass the tour (`complete(tour)`, not `complete(id)`) so the
new completion replaces the old one's date and awards the points again. `complete` reads
`updated.date` alone, so a definition that keeps a reason KEY (`{date, reasonKey}`) goes in
as it is; map the key through `t()` only for the catalogue's `TourInfo`. **Each app's
conventions doc gets the line "changing a tour's steps sets `updated: {date, reason}`"**:
tours are code, so no test can enforce it.

**`TourMenu` takes the record, not booleans.** Hand it the same tour list with
`completed={progress.completed}` and `joined`, and drop app-built `completed` / `isNew` /
`reset` rows: with the record and `joined` passed, the kit's ✓, NEW and "Updated" win, so a
row built as `completed: !!completed[id]` would otherwise show ✓ on a reset tour.

**Define `migrate` once, at module level**, and give every reader of the key the same
options. Readers of one key share one snapshot (cached by the stored text), and `migrate`
runs once per stored text, only when it is not the kit's shape already. `raw` is `unknown`:
narrow it.

### Per app

| App | Change |
| --- | --- |
| keksdose | **Page:** `features/tour/tours-page.tsx:142-267`'s body → `<TourCatalogue header={<PageHeader … actions={<StatTile …/>} />} …/>`. Keep `PageHeader` and the tile (`:146-178`). Map `TOUR_TOPICS` (`tour-topics.ts:35-43`) to `TourGroup`s (`title: t(titleKey)`, `help: t(helpKey)`, `icon: <x.icon />`). Map each `TourDef` (`tour-types.ts:8-69`) to `TourInfo` at the boundary, so the help-corpus line rule keeps its own field order: `title: t(titleKey)`, `description: t(descKey)`, `about: t(aboutKey)`, `group: topic`, `steps: build().length` (today `stepCounts`, `:98-101`), `icon: <tour.icon />`. The card (`:278-368`) goes. **Filters:** `useSearchParams`/`setParam` (`:64-86`) → `useTourCatalogueUrlState()`: same `?q`, `?topic`, `?state`. **NEW:** `useIsNewTour` (`tour-topics.ts:60-68`) → `isTourNew`, or simply pass `joined={user?.created_at}` to the catalogue and `TourMenu`. **Header:** the numbers at `:91-93` → `doneCount(tours, completed)` and `earnedPoints(tours, completed)`. **Dates:** pass `formatDate={(iso) => formatDate(iso, locale)}` to the catalogue, so "Completed on" keeps the user's date format (`shared/components/ui.tsx:142-150`). **Progress:** the zustand store (`shared/state/tour-progress-store.ts:16-38`) → `useTourProgress({ storageKey: "keksdose-tour-progress", migrate: fromZustand })`, with `fromZustand` at module level: `const fromZustand = (raw: unknown) => (raw as { state?: { completed?: Record<string, string> } } \| null)?.state?.completed;`, so nobody loses a done mark. A tab still on the old bundle during a deploy can write the zustand shape back once; accept it or have `migrate` merge. In `launch`'s `onFinish` (`tours.tsx:678-684`), `if (complete(def)) toast.success(…)` replaces the `firstTime` read. **§8:** `TourDef` gains `updated?: { date: string; reasonKey: string }`, declared after `since` (`tour-types.ts:53`, never between `id`, `titleKey` and `descKey`: `_TOUR_RE` in `scripts/build_help_corpus.py:204-206` needs them adjacent), the reason as a `reasonKey: "…"` string, never `t("…")` in the definition (the corpus would harvest it as a step key). Replace `tour-types.ts:50-51`'s "Bump it [`since`] when a tour is rewritten…": `since` stays the first ship date, a rework sets `updated`. Add the §8 line to the conventions doc, and pin `updated.date` as ISO beside the `since` list in `tours.test.tsx`. **URL:** `TourUrlSync` (`tour-url-sync.tsx:87-196`, mounted at `app/layout.tsx:126`) → `useTourUrlSync({ launch, ready })` in a small component at the same place; keksdose's names, so no link changes. **Menu (must, once a tour has `updated`):** `features/tour/tour-menu.tsx:30-37` hands the kit's `TourMenu` the same `TourInfo` list with `completed` and `joined`, and drops its `isNew` / `completed` rows (`:36-37`). |
| kastlan | **Page:** `features/tours/pages/tour-catalog-page.tsx:82-172`'s body → `TourCatalogue` under its `PageHeader` (`:84`), with `TOUR_GROUPS` as `TourGroup`s; the card (`:179-252`) goes. Map each `Tour` (`types.ts`) to `TourInfo`: `title`/`description`/`about` through `t()`, `steps: tour.steps.length`, `duration` in minutes in place of `durationKey`, and `badge: tour.mockMode ? <Chip size="sm" tone="warning" icon={FlaskConical}>{t("catalog.practice")}</Chip> : undefined` (`:209-213`). Add `points` to every tour, a points tile in the header (`earnedPoints(tours, completed)`; the x-of-y with `doneCount`) and a toast (§6.1). Roles stay filtered app-side, before the list goes in (`use-tours.ts`). **Filters:** `:42-59` → `useTourCatalogueUrlState({ group: "group" })` to keep today's `?group=` links, or drop the argument and move to `?topic=`. **Progress:** `utils/completions.ts:1-49` and `use-tours.ts:10-16` → `useTourProgress({ storageKey: "kastlan.tours.completions", migrate: fromIdList })`, with `fromIdList` at module level (`const fromIdList = (raw: unknown) => Array.isArray(raw) ? Object.fromEntries(raw.map((id) => [String(id), null])) : undefined;`) and the same options in all three readers; today's record with `""` dates is read without `migrate`. The kit's store notifies every reader in the tab, so `tours:completed-changed` goes. The device reset: `registerDeviceSetting({ key: "kastlan.tours.completions", kind: "view", reset: () => resetTourProgress("kastlan.tours.completions") })`, which also clears the page's memory and tells every reader at once. `onFinish` (`tours-root.tsx:110-113`) calls `complete(tour)`. **§8:** `updated: { date, reasonKey }` on a tour, mapped through `t()` for the catalogue's `reason`; create-estate and create-invoice carry `updated: { date: "2026-10-17", … }` at adoption (fixed that day). Add the §8 line to the conventions doc. **NEW:** `use-tours.ts:36-41` → `isTourNew({ since, joined, completed })`. **URL:** the two effects at `tours-root.tsx:170-210` (both go) → `useTourUrlSync({ launch: (id, { startIndex }) => { const def = getTour(id); if (def) startAppTour(def, startIndex); }, stepAliases: ["ts"] })`. `tourStep` becomes 1-based (kastlan wrote it 0-based): an old link resumes one step early, which is harmless; `ts` keeps its 0-based meaning. Under `createBrowserRouter` the mirror waits while a navigation is loading (the data router's state), so a step's `go()` is not undone. **Menu:** `components/tour-trigger.tsx:18` takes the same list with the `completed` record and `joined`, not booleans. |
| Kurvenschmiede | Nothing to do for the page yet. A `/tours` page with `TourCatalogue` comes once there are three tours (§6.6), likely with "Control loop basics" (`/control`) and "A gear from its parts" (`/steering/gears`). `TourMenu` without `href` stays supported until then. **Progress now**, so points work from the first tour: `useTourProgress({ storageKey })` with a key per account (bench PCs), spelt in `shared/lib/storage-keys.ts` with its privacy-policy line in 7 languages; `TourMenu` gets `completed={progress.completed}` (and `joined` once tours carry `since`). Add `points` to "Your first curve" (§6.1) and toast when `complete(tour)` returns `true` in its `onFinish`. Give `useAppTours` (`features/tours/app-tours.ts:27-56`) the `TourInfo` fields (`description`, `group`, `since`) so the menu and the later page share one list; it already sets `updated: {date, reason}` when steps change, so add the §8 line ("changing a tour's steps sets `updated: {date, reason}`") to `docs/conventions.md`. |

### Every app

- New words in every catalogue: the `tourCatalogue` namespace and
  `topBarParts.tours.badgeUpdated`, `.updatedDot` and `.newAndUpdated`. An app with its
  own full label catalogue must add them. `tourCatalogue.resetOn(date, reason?)` gets no
  `reason` when the update carries none: say the day alone then.
- The kit takes finished strings: map i18n keys to text before the tours go in (§6.3).
- **Optional: the progress key in "Reset this device's settings"** (settings §11). An app
  that counts tour progress as a device setting registers it with
  `reset: () => resetTourProgress(storageKey)`, which clears the key and the page's memory
  and tells every reader at once (removing the key alone leaves a stale "done" until a
  reload). An app that keeps usage out of the reset (keksdose,
  `shared/state/device-settings.ts:30-33`) leaves it out.
- **Points:** `complete(tour)` answers `true` only when a completion counts anew, which is
  the first time or the first time after an update (§8). That is the moment to award the
  tour's points and show the app's toast. The engine has no completion hook of its own:
  call it from the tour's `onFinish`.
- **The Overview is not a `SettingsSection`** (kastlan; Kurvenschmiede already renders it
  bare; keksdose keeps its `admin-overview-card` entry and `card(…)`, no change). It is
  `standalone`, with no catalogue entry, and a `SettingsSection` without an entry throws in
  development. Render `AdminOverview` on its own in `renderGroup` for the `overview` section.
