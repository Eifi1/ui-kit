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
  `mutateAsync`, or keep kastlan's split (open in `mutate`, set the location in
  `onSuccess`, close it in `onError`).
- **`useCancelRequest(cancelAtPeriodEnd)`** → `{ requested, cancelScheduled, waiting,
  noteAsked }`, plus the type `CancelRequested` (`"cancel" | "resume" | null`): see the
  fixes below (kastlan 5).

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
| kastlan | Replace `usePortal`'s hand-made tab (`features/billing/hooks/use-billing.ts`, the `mutate` wrapper from `72c3177`) with `openProviderPage`, or keep it: it has the same behaviour. Drop the own note under `SubscriptionActions` (`subscription-section.tsx:162-165`, `subscription.portalNewTab` in 4 locale files) and pass `providerName="Paddle"` and `appName="Kastlan"`. The kit's words are kastlan's minus "our payment provider"; to keep that phrase, override `billing.portalOpensNewTab` in kastlan's catalogue. Both payment-failed banners (`billing-banners.tsx:34`, `subscription-section.tsx:127`) get the mark by themselves (they use `onAction`). |
| keksdose | `features/billing/provider-page.ts:10` (`window.location.assign(url)`) → `openProviderPage`. Its callers are `subscription-cards.tsx:339` (`portal.mutate(target, …)`) and `billing-banner.tsx:92` (`portal.mutate("payment_method")`): open the tab in the click, as above. `SubscriptionActions` (`subscription-cards.tsx:351`): `appName="keksdose"` (or its display name). |
| Kurvenschmiede | `features/billing/subscription-settings.tsx:51` (`window.location.assign(url)`) and `:147` (`portal.mutate(target)`) → `openProviderPage`. `SubscriptionActions` (`:194`): `appName="Kurvenschmiede"`. `billing.test.tsx:69` stubs `location.assign`: mock `window.open` too, and expect the tab's `location.href` (`:113`, `:126`). |

## Fixes from the 0.42 adoptions

### Per app

| App | Change |
| --- | --- |
| keksdose | **1. DevSwitchers** now reads `DEV_ORIGINAL_ROLE_KEY` again when `enabled` turns true, so "Back to {role}" survives a reload under the async GET probe (`app/dev-switchers.tsx:70`); drop the workaround noted at `:64`. **2.** `GlobalSearch` and `FeedbackMenu` forward `data-*` to their trigger: pass `data-tour="feedback-menu"` (`features/tour/feature-tours.tsx:663`) straight to `FeedbackMenu` and drop the wrapping `<span>`. On `GlobalSearch` it lands on the kit's button (`trigger="button"`); a function trigger stays the app's. **3.** `adminSections`' type leaves out the `leaveOut` sections when TypeScript infers the type arguments. keksdose writes them (`admin-index.ts:219`, `adminSections<AdminOwnSectionId>`), so write `adminSections<AdminOwnSectionId, "billing">(…)` to drop the cast. `ADMIN_SECTION_ORDER` (`admin-index.ts:77`) → `adminSectionOrder<AdminOwnSectionId, "billing">(own, { leaveOut: ["billing"] })`: ids, no labels. **4.** `AdminOverview` (`admin-page.tsx:1136`): pass `error={attention.error}` and `onRetry={() => attention.refetch()}`. The words are `adminArea.overviewError` and `adminArea.retry`. **5.** `RoleDefinition.icon` shows in the roster's `RoleChip` too. That is intended and now documented; hand the roster a second vocabulary without `icon` if it should not. **6.** The invitations help line is now "Invite people by e-mail, and see who hasn't joined yet." in 7 languages, so drop the override. |
| kastlan | **1.** The Overview shows with no entry (`adminSections` sets `standalone: true` on it, and `SettingsGroup.standalone` is new): drop the Overview entry in `features/settings/admin-catalogue.tsx:58-67`, unless you want it in search. **2.** `adminMenuEntry` is a plain function and reads no provider. `app/top-bar.tsx:226` already passes `labels: adminLabels`, so it is right. `useAdminMenuEntry({ badge })` (new) reads the provider itself. `AdminMenuRow` reads the provider through `useAdminAreaLabels`. **5.** Replace the `asked` state in `subscription-section.tsx:71-90` with `const request = useCancelRequest(data?.cancel_at_period_end ?? false)`: `useBillingOverview({ waiting: request.waiting })`, `standingLine({ ...data, cancel_at_period_end: request.cancelScheduled })`, and on `SubscriptionActions` keep `cancelAtPeriodEnd={data.cancel_at_period_end}` and add `cancelRequested={request.requested}`. Call `request.noteAsked` as the cancel's and the resume's `onSuccess`. While `"cancel"` is requested without `onResume`, no second "Cancel subscription" shows. |
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
`isTourReset`, `useTourProgress`, `useTourUrlSync` and `useTourCatalogueUrlState`, all from
`@eifi1/ui-kit/tour` (and the barrel). Each app keeps its route, its page header, its topic
words, its step lists and `prepare()`.

**Points everywhere (Marcel, §6.1).** Every tour carries `points`, in every app: the card
shows the chip, and each app adds a points `StatTile` in its page header (the catalogue's
`header` slot) and a toast when `complete(tour)` returns `true`. kastlan and Kurvenschmiede
had answered "no points"; Marcel settled it the other way so the tours look the same.

**Updated tours (§8).** When an app fixes or reworks a tour, it sets
`updated: {date, reason}` on it. Completions from before that day stop counting: the tour
is to do again, the card says "Reset on {date}: {reason}", and `TourMenu` shows "Updated".
Pass the tour (`complete(tour)`, not `complete(id)`) so the new completion replaces the old
one and awards the points again.

### Per app

| App | Change |
| --- | --- |
| keksdose | **Page:** `features/tour/tours-page.tsx:142-267`'s body → `<TourCatalogue header={<PageHeader … actions={<StatTile …/>} />} …/>`. Keep `PageHeader` and the tile (`:146-178`). Map `TOUR_TOPICS` (`tour-topics.ts:35-43`) to `TourGroup`s (`title: t(titleKey)`, `help: t(helpKey)`, `icon: <x.icon />`). Map each `TourDef` (`tour-types.ts:8-69`) to `TourInfo` at the boundary, so the help-corpus line rule keeps its own field order: `title: t(titleKey)`, `description: t(descKey)`, `about: t(aboutKey)`, `group: topic`, `steps: build().length` (today `stepCounts`, `:98-101`), `icon: <tour.icon />`. The card (`:278-368`) goes. **Filters:** `useSearchParams`/`setParam` (`:64-86`) → `useTourCatalogueUrlState()`: same `?q`, `?topic`, `?state`. **NEW:** `useIsNewTour` (`tour-topics.ts:60-68`) → `isTourNew`, or simply pass `joined={user?.created_at}` to the catalogue and `TourMenu`. **Progress:** the zustand store (`shared/state/tour-progress-store.ts:16-38`) → `useTourProgress({ storageKey: "keksdose-tour-progress", migrate: (raw) => raw?.state?.completed })`, so nobody loses a done mark. In `launch`'s `onFinish` (`tours.tsx:678-684`), `if (complete(def)) toast.success(…)` replaces the `firstTime` read. **URL:** `TourUrlSync` (`tour-url-sync.tsx:49-158`, mounted at `app/layout.tsx:126`) → `useTourUrlSync({ launch, ready })` in a small component at the same place; keksdose's names, so no link changes. **Menu:** `features/tour/tour-menu.tsx:30-37` can hand the kit's `TourMenu` the same `TourInfo` list with `completed` and `joined` instead of building `isNew` / `completed` rows. |
| kastlan | **Page:** `features/tours/pages/tour-catalog-page.tsx:79-154`'s body → `TourCatalogue` under its `PageHeader` (`:81`), with `TOUR_GROUPS` as `TourGroup`s; the card (`:160-230`) goes. Map each `Tour` (`types.ts`) to `TourInfo`: `title`/`description`/`about` through `t()`, `steps: tour.steps.length`, `duration` in minutes in place of `durationKey`, and `badge: tour.mockMode ? <Chip size="sm" tone="warning" icon={FlaskConical}>{t("catalog.practice")}</Chip> : undefined` (`:190-194`). Add `points` to every tour, a points tile in the header and a toast (§6.1). Roles stay filtered app-side, before the list goes in (`use-tours.ts`). **Filters:** `:41-58` → `useTourCatalogueUrlState({ group: "group" })` to keep today's `?group=` links, or drop the argument and move to `?topic=`. **Progress:** `utils/completions.ts:1-49` and `use-tours.ts:10-16` → `useTourProgress({ storageKey: "kastlan.tours.completions", migrate: (raw) => Array.isArray(raw) ? Object.fromEntries(raw.map((id) => [id, null])) : undefined })`; today's record with `""` dates is read without `migrate`. `onFinish` (`tours-root.tsx:110-113`) calls `complete(tour)`. **NEW:** `use-tours.ts:36-41` → `isTourNew({ since, joined, completed })`. **URL:** the two effects at `tours-root.tsx:127-167` → `useTourUrlSync({ launch: (id, { startIndex }) => { const def = getTour(id); if (def) startAppTour(def, startIndex); }, stepAliases: ["ts"] })`. `tourStep` becomes 1-based (kastlan wrote it 0-based): an old link resumes one step early, which is harmless; `ts` keeps its 0-based meaning. **Menu:** `components/tour-trigger.tsx:18` can take the same list with `completed` and `joined`. |
| Kurvenschmiede | Nothing to do for the page yet. A `/tours` page with `TourCatalogue` comes once there are three tours (§6.6), likely with "Control loop basics" (`/control`) and "A gear from its parts" (`/steering/gears`). `TourMenu` without `href` stays supported until then. Add `points` to "Your first curve" now (§6.1). When progress lands, use `useTourProgress({ storageKey })` with a key per account (bench PCs), spelt in `shared/lib/storage-keys.ts` with its privacy-policy line. Give `useAppTours` (`features/tours/app-tours.ts:27-56`) the `TourInfo` fields (`description`, `group`, `since`) so the menu and the later page share one list. |

### Every app

- New words in every catalogue: the `tourCatalogue` namespace and
  `topBarParts.tours.badgeUpdated`, `.updatedDot` and `.newAndUpdated`. An app with its
  own full label catalogue must add them.
- The kit takes finished strings: map i18n keys to text before the tours go in (§6.3).
- **Register the progress key with "Reset this device's settings"** (settings §11): the tour
  progress lives on the device, so the app adds its `storageKey` to the registry the reset
  card clears.
- **Points:** `complete(tour)` answers `true` only when a completion counts anew, which is
  the first time or the first time after an update (§8). That is the moment to award the
  tour's points and show the app's toast. The engine has no completion hook of its own:
  call it from the tour's `onFinish`.
