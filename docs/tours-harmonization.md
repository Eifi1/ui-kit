# Guided tours — harmonisation plan

**Settled 2026-10-17** (Marcel, in the ui-kit session, after the three app reviews in
audits/round-044/tours-reviews.md; §6 wins over §2–§4). Built for ui-kit 0.43. §9 (round 0.44) settled 2026-10-17 with §9.6. §10 (round 0.45) settled 2026-10-19 with §10.6.

Marcel, in kastlan's session, 2026-10-17, relayed by kastlan-d1: "Massively increase the
number of tours and also have them grouped and similar filtering as in keksdose. Is that
already taken from the ui kit package? If not forward it there. The tours shall also look
similar." It answers kastlan's prod feedback #12, "Harmonize the tours with Keksdose" ("They
appear vastly different in template", /help/tours). The top bar's `TourMenu` (top-bar §2.4)
is the way in; this is the page behind it. **kk** = keksdose, **ka** = kastlan, **KS** =
Kurvenschmiede.

## 1. Where each one stands (2026-10-17)

- **In the kit already, used by kk and ka:** the engine (`TourProvider`, `useTour`,
  `TourStep`, the spotlight and the step popover, `@eifi1/ui-kit/tour`) and, since 0.42,
  the top bar's `TourMenu`. A running tour looks the same in both apps.
- **keksdose's `/tours` page, its own** (`features/tour/tours-page.tsx`, 368 lines;
  `tour-topics.ts`):
  - **Topics:** sections from `TOUR_TOPICS`: start, budgeting, import, reports, wealth,
    trust and app. Each is an h2 with an icon and a help line over a `sm:2 / xl:3` card
    grid. An empty topic is hidden.
  - **The filter bar:** a `SearchField`, a topic `Select` with counts, and an
    all / to do / done `ToggleGroup`, each count cross-filtered. The state is in the URL
    (`?q`, `?topic`, `?state`). Below it, "showing X of Y", and an `EmptyState` with
    "Clear filters".
  - **The card:** the state icon, the tour's icon, a NEW pill, the one-liner and the
    "about" paragraph, a points chip, the step count, the completed-on date, "Mark undone"
    and Start / Replay.
  - **Progress and NEW:**
    - progress is a device-stored store (`tour-progress-store`);
    - a tour is NEW when its `since` is after the account's `created_at` and it isn't
      taken yet (`useIsNewTour`);
    - completing a tour awards its points with a toast, and a points `StatTile` sits in
      the header;
    - `?tour=<id>&tourStep=<n>` launches a tour and mirrors where it is
      (`tour-url-sync.tsx`).
- **kastlan:** a flat card grid (`features/tours/pages/tour-catalog-page.tsx`) with no
  groups, filters, NEW pill or step count, and two tours. Its URL resume is
  `?tour=&ts=`.
- **Kurvenschmiede:** a first tour, "Your first curve", and the `TourMenu` without a tours
  page (0.42).

## 2. Decisions

1. **The kit ships keksdose's page body**: the topic sections, the filter bar and the
   card, with the same look and behaviour in every app. Each app keeps its route
   (`/tours`, kastlan's `/help/tours`) and its page header.
2. **Tours come in as data**: `{id, title, description, about?, icon?, group, route?,
   since?, steps?, points?, duration?}`. Progress comes in as `completed: Record<id,
   ISO date>`. The engine's step lists stay the app's own.
3. **Groups are per app, in one shape**: `{id, title, help?, icon?}[]`, in the app's
   order. An empty group is hidden. The words are the app's own: a finance app's topics
   aren't a property manager's.
4. **The NEW rule is shared**: `isTourNew({since, joined, completed})`. A tour is NEW
   when it shipped after the account was opened, compared by calendar day, and isn't
   taken yet. The same rule feeds `TourMenu`'s dot and pill.
5. **Points are shared and optional**: the card shows the chip, and the header shows a
   points tile, when tours carry `points`. keksdose has them; kastlan and KS may add
   them (review question 1).
6. **Progress stays on the device**, as both apps keep it today. The kit ships a small
   `useTourProgress(storageKey)`: completed tours with their date, "mark undone", and
   wrapped storage access. Syncing it to the account is a later round (review
   question 2).
7. **URL resume is a kit hook with keksdose's names**: `useTourUrlSync` reads and writes
   `?tour=<id>&tourStep=<n>`. kastlan's `?ts=` keeps working as an alias for one minor.
8. **The filter state is controlled** (`query`, `group`, `state`, `onChange`), so the app
   keeps it in its URL as keksdose does (`?q`, `?topic`, `?state`). The kit offers a
   `useTourCatalogueUrlState()` for apps on React Router.
9. **"Massively more tours"** is each app's own work, on its own data. kastlan adds
   groups and many tours now, with the fields of decision 2, so its adoption is a swap
   of the page body.

## 3. What the kit adds (ui-kit 0.43)

- `TourCatalogue`: the page body (decisions 1, 3, 8), with a `header` slot for the points
  tile.
- `TourCatalogueCard`: keksdose's card. Points, the step count and the duration are
  optional.
- `isTourNew`, `useTourProgress`, `useTourUrlSync` and `useTourCatalogueUrlState`.
- Labels in seven languages: the filter bar, the states, "showing X of Y", "Clear
  filters", Start / Replay / "Mark undone", "Completed on {date}", "{n} steps", "{n}
  points", and NEW.
- `TourMenu` takes the same tour data, so an app keeps one list.

## 4. Per app

- **keksdose:** `tours-page.tsx`'s body becomes `TourCatalogue` over `TOUR_TOPICS`.
  `useIsNewTour` becomes `isTourNew`, and the progress store and the URL sync become the
  kit's hooks. The words stay keksdose's own where they are domain words.
- **kastlan:** `tour-catalog-page.tsx` becomes `TourCatalogue` with its own groups;
  `?ts=` becomes `?tourStep=`; many more tours, on its own data.
- **Kurvenschmiede:** a `/tours` page with the catalogue once there is more than one
  tour (review question 3). `TourMenu` then gets an `href`.

## 5. Questions for the reviews

1. Points in your app, yes or no?
2. Progress on the device (the draft), or on the account now?
3. KS: a tours page now, or once there are three or more tours?
4. Anything in keksdose's page the kit should leave to the app.

## 6. The reviews and Marcel's settle (2026-10-17)

### 6.1 Points everywhere (Marcel)

kastlan and Kurvenschmiede had asked for no points. Marcel: **"Points everywhere"**, so the
tours look the same in all three apps. Every tour carries `points`, the card shows the
chip, and each app shows a points tile in its page header and a toast on completion. The
tile and the toast stay app-side (kk Q4, KS Q4): the moment is `complete(tour)` returning
`true` in the tour's `onFinish` (the engine has no completion hook of its own), and the
tile sums `earnedPoints(tours, completed)`, by `isTourDone`. The kit still draws no gap and
no "0 points" for a tour passed without points (KS).

### 6.2 Progress on the device, the key the app's own

- Progress stays on the device (kk Q2, ka Q2, KS Q2). `useTourProgress({storageKey,
  migrate?})` always takes the key as an argument, so an app can scope it per account
  (KS: shared bench PCs).
- `migrate(raw)` reads an existing store, so nobody loses their done marks at adoption:
  keksdose's zustand `keksdose-tour-progress` (version 1), and kastlan's id array under
  `kastlan.tours.completions` (kk, ka F2). A completion may have no date: the card then
  says "Completed" without "on {date}".
- The store notifies: through the `storage` event across tabs and an in-tab emitter, so
  the page and `TourMenu` agree without a reload (ka F3).

### 6.3 What the kit takes, and what stays with the app

- The kit takes finished strings, never i18n keys (kk K-1).
- Role- and data-gated tours are filtered by the app. The counts and "showing X of Y"
  count the filtered list (kk K-2, ka F6).
- `prepare()` stays app-side, and the kit awaits it. The step lists, the topic words, the
  page header and the points tile are the app's own (kk Q4, ka Q4, KS Q4).

### 6.4 The URL and the NEW rule

- `useTourUrlSync` starts a tour whenever `?tour=` appears, in-app navigation included
  (ka F4: kastlan's assistant links to it). While a tour runs it mirrors the step
  (`&tourStep=`), and at the end it strips only its own parameters (kk K-3).
- `isTourNew`: no `since`, or no `joined` date, is never NEW (KS, ka F7).

### 6.5 The card

- **Duration:** `duration?: number` in minutes, worded by the kit ("About {n} min").
  kastlan maps its `durationKey` to minutes (ka F5).
- **Badge:** an optional `badge?: ReactNode` chip beside NEW, for kastlan's practice mode
  ("Practice: nothing is saved", in the app's words) (ka F1).
- **Groups:** the Select stays for up to ten or more groups (ka F8).

### 6.6 Kurvenschmiede

A `/tours` page comes once there are three or more tours. Until then, `TourMenu` without
an `href` stays supported (KS Q3).


## 7. What shipped (ui-kit 0.43)

All in `@eifi1/ui-kit/tour` beside the engine, and so in the barrel too. The two URL hooks
need react-router, which is a required peer already.

- **The data** (§2.2, §8): `TourInfo` `{id, title, description?, about?, icon?, group,
  route?, since?, updated?: {date, reason}, steps?, points?, duration?, badge?}`, finished
  strings only; `TourGroup` `{id, title, help?, icon?}`; `TourCompletions`
  (`Record<id, ISO | null>`). `TourMenuTour` is now a subset of `TourInfo`, so one list
  feeds both.
- **`TourCatalogue`** (§2.1, §2.3, §2.8): `tours`, `groups`, `completed`, `joined`, the
  controlled `query` / `group` (`null` is every group) / `state` (`"all" | "todo" |
  "done"`) with `onChange(patch)`, `onLaunch`, `onReset`, a `header` slot, `formatDate`,
  `labels`. keksdose's body as it was: the filter bar (SearchField, the group Select, the
  ToggleGroup, each count cross-filtered), "Showing X of Y tours" while a filter is on,
  the EmptyState with "Clear filters", and an h2 section per group with its icon and help
  line over a `sm:2 / xl:3` grid; an emptied group is hidden. A tour whose `group` is not
  in `groups` is not listed and not counted; an unknown group or state from an old link
  is no filter. The search folds case and accents (`foldForSearch`).
- **`TourCatalogueCard`**: keksdose's card. The points chip, the step count and the
  duration ("About {n} min") are each drawn only when given: no gap, no "0 points" (§6.1,
  KS). "Completed on {date}", or "Completed" for a `null` date. The title is an h3; Start /
  Replay and "Mark as not done" are described by it.
- **`isTourNew({since, joined, completed})`** (§6.4), **`isTourReset(tour, completedAt)`**
  and **`isTourDone(tour, completedAt)`** (§8). A completion with no date predates any
  update, so it is reset; a completion ON the update's day counts. A reset tour is not
  NEW again: the card shows "Updated" and "Reset on {date}: {reason}".
- **`useTourProgress({storageKey, migrate?})`** → `{completed, complete, reset}`
  (§6.2). The kit's shape is the record itself (`""` reads as `null`, so kastlan's 0.42
  record needs no `migrate`). `migrate(raw)` gets the parsed JSON and returns a record for
  a shape it knows, `undefined` otherwise; the next write stores the kit's shape under the
  same key. `complete(idOrTour)` keeps the first completion and returns `true` only when
  the completion counts anew: that is the app's moment for the points and the toast
  (§6.1). Passed the tour, a completion reset by `updated` is replaced (§8). Blocked
  or full storage keeps the marks for the page's life. Readers on the same key agree
  through an in-tab emitter and the `storage` event, and share one snapshot cached by the
  stored text; `migrate` runs once per text, only on a shape that is not the kit's, and its
  identity is ignored — define it once, at module level (build review, kastlan B1).
  `resetTourProgress(key)` clears the key and the page's memory and notifies, for the
  device reset (optional per app; keksdose keeps usage out of it). `doneCount` and
  `earnedPoints` count by `isTourDone`, for the header's x-of-y and points tile.
- **`useTourUrlSync({launch, ready?, stepAliases?})`** (§2.7, §6.4): keksdose's
  `TourUrlSync` on `useTourOptional()`. `launch(id, {startIndex})` is the app's launcher
  (its steps, its `prepare()`, its `onFinish`). A tour starts whenever `?tour=` changes to
  an id, on in-app navigation too, after `ready`; `&tourStep=` is 1-based. While a tour
  runs, the URL mirrors it (never during a navigation in flight — read off the history of a
  declarative router, off the data router's state under `createBrowserRouter` — never touching other
  parameters or the hash); at the end only `tour`, `tourStep` and the aliases go.
  `stepAliases: ["ts"]` reads kastlan's 0-based `ts` for one minor.
- **`useTourCatalogueUrlState(params?)`** → `{query, group, state, onChange}`, spread onto
  the catalogue: `?q`, `?topic`, `?state`, written with `replace`. `params` renames them
  (kastlan's `?group`).
- **`TourMenu`** takes `completed` and `joined` and works out ✓, NEW and "Updated"
  itself; with the record passed its ✓ and "Updated" win over a tour's own `completed` /
  `reset`, with `joined` its NEW over `isNew` (the booleans serve a menu with neither). A reset tour is listed
  with the "Updated" chip among the new ones (newest news first, by `updated.date`), the
  heading then reads "New and updated", and it lights the dot ("Updated tours" when only
  updates do).
- **Words**, in 7 languages: the `tourCatalogue` namespace (keksdose's reviewed words where
  it had them) and `topBarParts.tours.badgeUpdated`, `.updatedDot`, `.newAndUpdated`.
- **Left to the app**, as settled: the page header, the points tile and the toast, the
  topic words, the step lists and `prepare()`, role and data filtering, and the storage key.

## 8. A tour that is updated or fixed (Marcel, 2026-10-17)

Marcel: "Reset both with indication why it was reset". A tour's steps are each app's own data,
so a fix or a rework is an app code change. How the change reaches people is the kit's
rule:

1. **Every update resets the tour, a fix as much as a rework.** The app gives the tour an
   `updated: {date, reason}` (ISO day, and a short sentence in the app's words: "The import
   screen moved; the tour follows it now."; the reason is for display only and may be left
   out). A completion from before `updated.date` began on the device no longer counts as
   done: instants compared, the completion's timestamp against the start of that day in
   local time, so one taken at 00:30 in Zurich on the update day counts (build review,
   keksdose K-S2).
   - The tour is "to do" again, and the "done" filter and the counts follow.
   - Completing it again awards its points again.
   - The reset itself deletes nothing: the kit compares the dates, so the old completion
     date stays readable until the tour is completed again. Then `complete(tour)`
     overwrites it with the new date (the first completion is no longer kept).
2. **The reason is shown.** A reset tour's card carries an "Updated" pill and the line
   "Reset on {date}: {reason}". `TourMenu` lists it with the same pill and lights its dot,
   as for NEW.
3. **A tour that was never completed** shows no reset line: for that person there is
   nothing to reset. A tour updated after a person's account was opened isn't NEW because
   of the update; `since` stays its first ship date.
4. **One update at a time**: a later update replaces `updated`, and the newest date counts.

## 9. Round 0.44: completion in one place, and a writer outside a page

**Settled 2026-10-17** (Marcel: "Settle and build", after the three app reviews in audits/round-045/reviews.md;
§9.6 wins over §9.1–§9.3). Marcel: "0.44 with everything", the 0.43 adoptions' notes (audits/round-045/candidates.md) and these two features.

1. **The engine reports a completion** (kk 2). `TourProvider` takes `onComplete(tour,
   {awarded})`, called once when a tour's last step is finished. `awarded` is `true` when
   the completion counts anew: the first time, or the first time after an update (§8). The
   app shows its points toast there; no app wires `onFinish` and `complete()` by hand.
   - The provider needs the progress to know `awarded`, so it takes the same
     `{storageKey, migrate?}` as `useTourProgress`, plus the app's `TourInfo` list.
   - Without these, `onComplete` still fires, with `awarded: undefined`.
   - **A skip (Skip, Esc) or `stop()` records nothing**: a skipped tour is not finished, so
     no write, no `onComplete`, no points (KS 3).
2. **A writer outside a page** (kk 1): `completeTour(storageKey, tour, at?)` beside
   `resetTourProgress`. It writes the kit's shape and notifies every reader in the tab, for
   tests, seeds and scripts.
3. **The stored shape is documented** (KS 4): `{[id]: ISO instant | ""}` under the app's key.
   An empty string is a completion without a date (a migrated record); the hooks and
   callbacks give `null` for it (§9.6.6). So `completeTour(…, null)` stores `""`, and every
   reader gets `null` for it (KS 4).
4. **keksdose's reviewed words** are the kit's defaults where they differ (kk 5), taken from
   keksdose's locale files: `noMatchesHint` with the singular filter in en, fr and it ("clear
   the filter", "effacez le filtre", "cancelli il filtro"), `stateTodo` "Not taken" / "Non
   suivies", and the de points as keksdose writes them, "+{n} Pkt". (The draft's "plural" and
   "written out" had them backwards; the build follows keksdose's files.)
5. **The guide** gains these notes:
   - the portal's accessible names include "(opens in a new tab)", so tests match by regex
     (kk 6, KS 1);
   - "All topics" has the value `""` (kk 4);
   - app tests see the kit's English unless they load the kit's labels (ka 1);
   - a per-account key is a prefix plus the user id (KS 2);
   - `options.window` is `openProviderPage`'s test seam (kk 7);
   - `migrate` is defined once at module level, because all readers share one snapshot
     (kk 3).

Questions for the reviews: does `onComplete` on the provider fit your tour setup (keksdose's
`useTours`, kastlan's `ToursRoot` and mock mode, KS's single tour)? And should the provider
own the progress, or keep taking it from the app?

### 9.6 The reviews (2026-10-17) and what they change

All three are in audits/round-045/reviews.md. Where they differ from §9.1–§9.3, these win:

1. **The finished tour travels with its start** (keksdose: the provider sits above the
   layout where no tour list exists). `start(steps, {tour, …})` carries the one `TourInfo`.
   The provider takes `progress?: {storageKey, migrate?}` and `onComplete?(tour,
   {awarded})`, never the list. That also removes kastlan's full-list concern.
2. **`onComplete` comes in addition to the start's own callbacks** (kastlan). It fires
   after the progress write, before `start()`'s `onFinish`, and never on a skip or
   `stop()`. Exactly one write per completion, so `awarded` equals what `complete(tour)`
   answered before. **The app removes its own `complete()` call** from `onFinish`, or the
   second write answers `false`. The adopt guide names the lines.
3. **The progress stays the app's** (all three). The provider reads and writes through the
   same `{storageKey, migrate}` as `useTourProgress`, so there is one shared snapshot and
   never a second copy. The options type `UseTourProgressOptions` is exported, so an app
   declares the options once.
4. **The provider follows a `storageKey` change without a remount** (KS: an account switch
   on a shared PC), tested.
5. **`completeTour` notifies the readers in the same tab directly** (keksdose: the
   `storage` event reaches only other tabs).
6. **One written form** (KS): stored `{[id]: ISO instant | ""}`, where `""` is a
   completion without a date. Hooks and callbacks give `null` for it. The code's comments,
   §9.3 and `completeTour` agree.
7. **Both new provider props are optional** (keksdose's test render mounts it bare).

### 9.7 What shipped (ui-kit 0.44)

Built 2026-10-17 on feat/0.44.0, as §9.1–§9.5 with §9.6 winning. The adoption is
docs/adopt-0.44.md.

1. **`TourProvider`** takes `progress?: UseTourProgressOptions` and
   `onComplete?(tour, {awarded})` (`TourCompletion`); both optional, so a bare test render
   still mounts it. `start(steps, {tour, …})` carries the one `TourInfo`, and `activeId`
   falls back to `tour.id`. On the last step's finish the provider writes once, through
   the same module store and snapshot as `useTourProgress` (`completeStored`, internal),
   then calls `onComplete(tour, {awarded})`, then the start's `onFinish`. A skip or
   `stop()` calls neither and writes nothing; a second "Done" before the overlay goes is
   ignored. Without `progress` or `tour` it still fires, `awarded: undefined` (and `tour`
   as given). Props are read at the finish, so a new `storageKey` needs no remount (tested).
2. **`completeTour(storageKey, tour, at?)`** beside `resetTourProgress`, in the barrel and
   `/tour`: always writes over a readable text (item 8) (`at` an ISO string or `Date`, default now; `null` = without a
   date), keeps the other marks, and notifies this tab's readers directly (tested without
   a `storage` event).
3. **One written form**: every write stores `{[id]: ISO | ""}`; a `null` from storage or
   `migrate` is read as before and written back as `""`. `completed` gives `null` for `""`.
   `useTourProgress`'s docstring states the shape and the module-level `migrate` reason.
4. **`UseTourProgressOptions`** was already exported (barrel and `/tour`).
5. **Words**, keksdose's exactly (§9.4):
   - en `stateTodo` is "Not taken ({n})" and fr "Non suivies ({n})";
   - `noMatchesHint` takes the singular: en "…clear the filter.", fr "…effacez le filtre.",
     it "…cancelli il filtro.", and de-CH "Anderes Wort versuchen oder Filter
     zurücksetzen.";
   - the de `points` is "+{n} Pkt".
6. **Docs**: `openProviderPage`'s docstring names `options.window` as the test seam, with a
   stub. The showcase's tours page runs the 0.44 pattern (a provider with `progress` and
   `onComplete`, `start(steps, {tour})`) and seeds with `completeTour`.
7. **A key's `migrate` is remembered** (keksdose B-2, build review): the first `migrate`
   any reader, the provider or `completeTour` passes for a key is kept in a module
   registry (`rememberMigrate`, internal), so the snapshot no longer depends on which
   reader came first. A snapshot parsed before the key had a `migrate` is re-parsed, and
   the key's readers are told after the render. The guide makes one shared options object
   for the provider and every reader a MUST. Tested (a bare reader first, then one with
   `migrate`; the provider's `migrate` serving a bare reader).
8. **No write over an unread record** (keksdose B-1): `completeTour(storageKey, tour, at?,
   {migrate?})` reads through the given `migrate`, else the key's registered one. When the
   stored text is neither empty nor the kit's shape and no `migrate` reads it,
   `completeTour` and `complete` THROW and write nothing; the provider's finish catches it,
   logs it (`console.error`), writes nothing and reports `awarded: false`, and the tour
   still ends. Tested on keksdose's zustand-v1 envelope: the registry path keeps the old
   completions; no migrate throws with the stored text unchanged.
9. **A dev warning** (keksdose nit): in development (not under vitest), the provider warns
   once when it has `progress` but a finished tour's start carried no `tour`, so `awarded`
   stays `undefined`. Tested.

### 9.8 Recipes from the 0.44 adoptions (ui-kit 0.45)

The three 0.44 adoptions found no kit fix, only these guide and test notes
(audits/round-046/candidates.md). Every snippet runs in the kit's
`src/tour/__tests__/tour-recipes.test.tsx`.

1. **One tour's `TourInfo`, and the list as its map** (keksdose 4). `start(steps, {tour})`
   takes ONE `TourInfo`, the catalogue and the menu take the list. Write the single mapper
   and derive the list from it, rather than `tourInfos([def], t)[0]` at the launch:

       export function tourInfo(def: TourDef, t: TFunction): TourInfo {
         return { id: def.id, title: t(def.titleKey), group: def.group, points: def.points, updated: def.updated, … };
       }
       export const tourInfos = (defs: readonly TourDef[], t: TFunction) => defs.map((def) => tourInfo(def, t));

       engine.start(steps, { tour: tourInfo(def, t), onFinish });   // the launch

2. **"The toast shows only when awarded", through the real provider** (keksdose 2). No
   mock of the kit's `TourProvider`: render the app's provider wrapper (the one holding
   `progress` and `onComplete`) around a two-line component that captures `useTour()`,
   start a tour with its `TourInfo`, and step past its last step with `next()`. The
   provider records, then calls the app's `onComplete`. No overlay click and no target
   element are needed (a step without `target` is centred):

       let engine: ReturnType<typeof useTour>;
       function Engine() { const e = useTour(); useEffect(() => { engine = e; }); return null; }
       const finish = (def: TourDef) => {
         act(() => engine.start([{ title: "Only", body: "One step." }], { tour: tourInfo(def, t) }));
         act(() => engine.next());               // past the last step: record, then onComplete
       };

       beforeEach(() => act(() => resetTourProgress(TOUR_PROGRESS_KEY)));   // see 4.

       it("toasts the first finish only", () => {
         render(<AppTourProvider><Engine /></AppTourProvider>);
         finish(BUDGET);
         expect(toast.success).toHaveBeenCalledTimes(1);   // awarded: true
         finish(BUDGET);
         expect(toast.success).toHaveBeenCalledTimes(1);   // a replay: awarded false
       });

   `completeTour(KEY, id, "2026-09-01T10:00:00Z")` seeds an earlier completion, and a def
   with `updated: {date}` after it is awarded again (§8). `engine.stop()` is a skip: no
   write, no `onComplete`. The kit ships no helper for this: the engine is the app's
   provider in the app's tree, and the recipe is the test. (A helper in
   `@eifi1/ui-kit/testing` would need React and Testing Library there; that subpath stays
   framework-free.)
3. **A file that mocks the kit's barrel loses the setup's `toast` spy** (keksdose 3).
   `vi.mock("@eifi1/ui-kit", factory)` in a test file replaces the setup file's mock of the
   same module for that file, so the spies the setup put on `toast` are gone and
   `toast.success` is whatever the file's factory returns. Either keep the barrel unmocked
   (recipe 2 needs no mock) and assert on the setup's spy, or, where a file must mock the
   barrel, build its `toast` from the same factory the setup uses (export it from a test
   module, and `await import()` it inside the hoisted `vi.mock` factory), or spy in the
   file: `vi.spyOn(toast, "success")` on the real `toast` (its methods are plain
   properties).
4. **One localStorage, and one kit store, per test file** (KS). jsdom keeps one
   `localStorage` for a whole test file, and the kit's progress store is per key at module
   level. A test that expects `awarded: true` (a toast, points) after another test in the
   file finished the same tour gets `false`. Start each such test clean:
   `beforeEach(() => act(() => resetTourProgress(KEY)))`. `resetTourProgress` also clears
   what the page kept in memory and tells the mounted readers; `localStorage.clear()` does
   neither.
5. **`formatDate` on the catalogue gets a bare day for the update** (N9, build review
   round 0.44). The card hands the app's `formatDate` the completion's ISO instant and
   `updated.date` as `"YYYY-MM-DD"`. Read the bare day on its calendar (the kit's
   `formatDate`, `parseIsoDate`), never through `new Date(day)`, which is UTC midnight and
   so the day before west of UTC. keksdose's `renderDate` (UTC for a date-only string) and
   kastlan's `formatDate` (the kit's) already do. The kit's own `formatDate` now keeps a
   bare day on its day under any `timeZone` too (before, `{timeZone}` west of the device
   showed the day before).
6. **An old tab still on a pre-0.43 bundle** (K-S9, build review round 0.44). The 0.44
   write guard (B-1) stops the KIT from writing over a text no `migrate` reads. It does
   not stop an old bundle's zustand store from writing its envelope over the kit's record:
   that text is readable through `fromZustand`, so the kit then reads only the old tab's
   marks. The loss is the completions the old tab never knew of, on that device, for a tab
   left open across the 0.43 deploy. keksdose accepts it in code
   (`shared/state/tour-progress.ts:27-30`); the window closes once no pre-0.43 bundle
   runs. The kit changes nothing; a new storage key is the only full fix (not taken).
   **Accepted** (Marcel, 2026-10-19, round 0.45): no code, in the kit or the apps.

## 10. Tour progress on the account

**Settled 2026-10-19 (round 0.45)** (Marcel: "As reviewed", after the three app reviews in
audits/round-046/reviews.md; §10.6 records where each answer went, and the answers and
corrections are folded into §10.1–§10.4). Built for **ui-kit 0.45 / server-kit 0.15**.
Parked on 2026-10-17 ("on the account later is welcome", KS,
audits/round-044/tours-reviews.md:64). §6.2 settled progress on the device; this section
adds an optional account record behind the same hook. **Kurvenschmiede and kastlan move
to the account; keksdose stays on the device.** An app that does nothing stays exactly as
in 0.44.

### 10.1 Where each one stands (2026-10-19)

- **The kit** (ui-kit 0.44): `useTourProgress({storageKey, migrate?})` keeps
  `{[id]: ISO | ""}` under the app's key (src/tour/use-tour-progress.ts:33-43). One snapshot
  per key, an in-tab emitter and the `storage` event (:68-203). `complete` decides
  `awarded` synchronously against that snapshot (:225-236), and the provider writes through
  the same path (src/tour/tour.tsx:247). A precedent for "device first, account behind
  it" exists already: `useAccountAppearance` takes the app's `save` and `isDemo` and never
  writes the account for a demo (src/settings/use-account-appearance.ts:63-77, :124).
- **keksdose**: one device key for every account, `keksdose-tour-progress`, with
  `fromZustand` (frontend/src/shared/state/tour-progress.ts:17, :31-42). Not part of the
  device reset ("usage", :14-15). Account preferences are columns on `users` (`locale`,
  `text_size`, `contrast`: backend/keksdose/domain/models/user.py:71, :157-158), written
  by `PATCH /auth/me` with server-kit's `ProfileUpdate` (domain/schemas/auth.py:272).
  keksdose is local-first: a Dexie mirror and an outbox reconciled through `/sync`
  (frontend/src/main.tsx:15-18, :85; shared/offline/write.ts), with the sync chip
  (`SyncStatusIndicator`, "N waiting") and a logout guard that warns before discarding
  unsynced writes (shared/state/auth-store.ts:38-47); the service worker never caches
  `/api/*` (src/sw.ts:57). On a 401 it keeps unsynced writes, and on sign-out or a
  different sign-in it forgets the previous account (auth-store.ts:38-47, :83-85). Its
  in-app privacy list "What we can still see" (`privacy.proof_see_*`: ids and routing,
  row counts and change times, blind equality tokens) is meant to be exhaustive. The
  review: account sync is "low value next to the risk of a migration"
  (tours-reviews.md:39).
- **kastlan**: one device key for every account, `kastlan.tours.completions`, with
  `fromIdList` (frontend/src/features/tours/use-tours.tsx:19, :23-24). Production runs
  v0.11.0, where the record is still the old id list: ids with no dates, for a handful of
  live users. It **registers the key with the device reset** as a "view"
  (use-tours.tsx:26-27, imports :7-8), so "Reset this device's settings" wipes the tours,
  although settings §11.2.2 lists "tours done" under what a reset never clears. One
  `logout()` (features/auth/stores/auth-store.ts:68-80) serves four callers: the sign-out
  button (app/top-bar.tsx:104), the sessions card (settings/components/sessions-card.tsx:38),
  the account deletion (delete-account-card.tsx:25) and the session-ended hook on a
  refused refresh (auth-store.ts:170-174). It already treats the device as shared (it
  drops the account language, the appearance and the last page "so the next person on
  this device does not start in this account's…") and keeps what waits to be sent for its
  owner (the handover outbox, :71-72). Preferences are columns on `User` (`text_size`,
  `contrast`: kastlan/domain/models/auth.py:57-61) through `PATCH /auth/me`
  (adapters/api/auth_router.py:236-247). Demo accounts are throwaway and read-only
  (models/auth.py:44-46); every demo write outside `DEMO_WRITES` is refused at the
  dependency (infrastructure/dependencies.py:291-310, 403 `demo_read_only`). The backend
  suite runs on Postgres.
- **Kurvenschmiede**: a key **per account**, `kurvenschmiede.tours:<id>` (`"visitor"`
  signed out, the public pages' tours only), because bench PCs are shared
  (frontend/src/features/tours/app-tours.ts:27-29; shared/lib/storage-keys.ts:79-83). Kind
  `never` for the device reset (:150-151), and its own privacy-policy line "tours" (:114).
  The provider follows the account's key (features/tours/app-tour-provider.tsx:16-31).
  KS has **one** `clear()` for every end of a session, a 401 nothing could renew included
  (shared/state/auth-store.ts:64-73); it clears the tokens, the query cache and the last
  page, not the tour keys, so every engineer's record stays on the PC. Preferences are
  columns on `users` (backend/kurvenschmiede/domain/models/user.py:132-139),
  `PATCH /auth/me` (adapters/api/auth_router.py:227). KS's refusals are coded
  (`domain/refusals.py`, each with a row in `tests/api/test_refusals.py` and a sentence in
  seven catalogues), and `tests/api/test_demo.py` makes every route declare its demo
  stance. KS is online-only (Marcel, 2026-10-19); its backend suite runs on Postgres.

### 10.2 Decisions (settled)

1. **A table per app, rows per tour; not a column on `users`.** `tour_completions
   (user_id FK users ON DELETE CASCADE, tour_id varchar(64), completed_at timestamptz
   NULL, PRIMARY KEY (user_id, tour_id))`. One row per tour lets two devices write
   different tours without a read-modify-write of one JSON value (and, in KS, without an
   `If-Match` for its version rule on shared rows); erasure is the cascade, the export
   one select. Not on `/auth/me`, which every page reads. KS withdrew its
   `tours_completed` column idea. The progress belongs to the person, not a company: no
   `company_id`, outside kastlan's forced RLS, so a person in two companies has one
   record. In KS the columns stay plaintext (an id and a date are keys, not content). The
   migration imports nothing from the app.
2. **The endpoint, under the settings rule (settings §6.1):**
   - `GET /tours/progress` → `{completed: {[id]: ISO | ""}}`, the stored shape of §9.6.6
     on the wire too (`""` = completed without a date; no `null`, so the PATCH rule's
     "null clears" never meets it).
   - `PATCH /tours/progress` with `{completed?: {[id]: ISO | ""}, forget?: [id]}`
     (`extra="forbid"`) → the whole resource. An id in both is a 422
     (`tour_progress_conflict`). `forget` is "Mark as not done".
   - Validation: an id matches `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$` (kastlan's ids are
     camelCase, `addBuilding`); an instant carries a zone; at most 500 entries per body and
     500 tours per account (422 `tour_progress_full`). The server knows no tour list, so it
     takes any well-formed id.
   - **Auth:** the session's own account only; no admin route reads or writes someone
     else's. A demo session is refused by the app's own demo gate (403), which the
     router's `guards` pass through: kastlan's `DEMO_WRITES` gate already refuses the
     PATCH (`demo_read_only`), KS declares the route `not_in_the_demo` (403
     `demo_refused`) in `tests/api/test_demo.py`. A demo session passes no `account` on
     the client anyway (decision 6). The app's limiter and CSRF as for its other writes.
   - **The two refusal codes** are server-kit constants. An app with coded refusals (KS)
     maps each to its catalogue: a row in `tests/api/test_refusals.py` and a sentence in
     all seven catalogues.
3. **The merge rule: per tour, the later completion wins.** For each sent id: an instant
   beats `""`, `""` beats no row, and between two instants the later is kept; an instant in
   the future is stored as now. The later, not the first, keeps §8 right without the
   server knowing `updated`: a tour is done (`isTourDone`) on the account when it is done
   on any device, and a completion taken again after an update replaces the old one, as
   `complete(tour)` does on the device (§8.1). All three cards' "Completed on" read as when
   the tour was last taken (kastlan formats it with the kit's `formatDate`). The cost: two
   devices that each took a tour for the first time show the later date. The merge runs
   in Python in the kit's service, not as `GREATEST`, so the one rule is tested once in
   the kit and `InMemoryTourProgressStore` and every backend agrees. (KS's and kastlan's
   suites run on Postgres, so the SQL difference, Postgres's `GREATEST` ignoring a NULL
   where SQLite's `max()` does not, matters only to keksdose's SQLite tests and to the
   in-memory store; it is not the reason.) A forget is a delete; a completion sent later
   (an offline device) brings the tour back. Accepted: it was taken.
4. **The device record becomes the account's cache.** With an account, the hook reads the
   device key as today, so the page paints at once and offline; it loads the account on
   the first reader of a key, on `online`, and after each save, and replaces the cache
   with the answer. Writes (`complete`, the provider's finish, `reset`) go to the cache at
   once and into a **pending** record beside it (`<storageKey>:pending`: `{synced,
   completed, forget}`), which is sent as one PATCH and cleared by its answer. A failure
   with no answer (offline, 5xx, 401) keeps it; a 403 or 422 drops it and logs.
   `awarded` stays the device's answer against the cache, so the provider and §9.6.2 do
   not change (two devices both offline may each toast; the points tile counts the
   record, so no points are counted twice). **The pending record is not the app's
   outbox:** it stays out of any "N waiting" count and any sign-out guard on purpose
   (losing a tour mark is acceptable), in keksdose and in kastlan once it is local-first
   (local-first §1 states the same).
5. **Migration of today's records.** A device key never synced (no `:pending` with
   `synced: true`) is uploaded whole on its first load, by the merge rule.
   - KS: its keys are per account already, so the record goes to its owner exactly.
   - kastlan: the account mode needs a key per account (decision 6), and **the old
     device-wide record is DROPPED, not adopted**: office PCs may be shared (a
     Verwaltung's reception or part-time desk), giving one person another's marks is
     worse than losing a few, the production record is ids without dates, and every tour
     can be taken again. The kit's option is **`adopt: {storageKey, discard: true}`**:
     on the first load of an account key, the kit removes `adopt.storageKey` from
     `localStorage` and drops its in-memory snapshot (its readers are told), and uploads
     nothing. Removing an absent key is a no-op, so it runs on every first load.
   - `adopt: {storageKey, migrate}` (without `discard`) is the other form, kept for an app
     whose device is never shared: the old key is read once through its `migrate`,
     uploaded to **the first account that signs in on that device**, then removed, so no
     second account gets it. No app takes it in 0.45 (keksdose stays on the device).
   - One `adopt` option, not a separate `forgetDeviceRecord(key)`: the kit knows the old
     key in both forms, so the dev warning (decision 6) still catches an account key
     equal to it.
6. **Sign-out and the shared PC.** With an account, the key must be per account (a prefix
   plus the user id, as §9.5 and KS have it); in development the kit warns when the
   account's key equals `adopt.storageKey`. On every end of a session the app calls
   **`signOutTourProgress(storageKey)`**: it removes **the cache only** (the device key
   and the kit's in-memory snapshot, readers told), synchronously and with no request,
   and **keeps `<storageKey>:pending`**. The pending record sits under the per-person key,
   so nobody else on the PC reads it; it holds tour ids and dates only (the class of
   kastlan's handover outbox, which it already leaves for its owner) and goes out on that
   person's next sign-in. So the call is safe on every path, a 401 included: kastlan puts
   it in `logout()` itself (auth-store.ts:68-80, all four callers), KS in its one
   `clear()` (auth-store.ts:64-73), and **a 401 no longer drops an unsent completion**
   (KS's case, where the 2 s send of the draft would fail with the token gone). What
   stays on a shared PC after a sign-out: at most one person's unsent ids and dates under
   their own key, never a readable record (better than KS today, where each engineer's
   whole record stays). A pending record whose owner never signs in again stays until a
   browser clean. Signed out, and in a demo, no `account` is passed: the device record
   works as in 0.44 (KS's `visitor` key).
7. **Offline (keksdose, should it ever move).** No outbox entry and no `/sync` entity:
   progress is the account's, not the budget's, and the pending record is the kit's own
   small outbox. `/tours/progress` must not be answered by keksdose's local API host (it
   is not one of its routes), so offline the request fails and the pending record waits
   for `online` or the next load. Several tabs may send the same pending record; the
   merge makes that harmless. keksdose's logout guard (auth-store.ts:38-47) and sync chip
   leave the pending record out on purpose (decision 4).
8. **The reset rules.**
   - §8 (an updated tour) is unchanged and stays on the client: the server stores dates
     only, and decision 3 keeps "done anywhere" true. Nothing is deleted by an update,
     on the device or the account.
   - "Mark as not done" (`reset(id)`) sends `forget`.
   - "Reset this device's settings" (settings §11) never writes the account (§11.2). With
     an account, `resetTourProgress(key)` clears the cache only; the pending record stays
     ("anything waiting to be sent", §11.2.2) and the next load refills the cache.
   - **Tour progress is never registered with the device reset** (settings §11.2.2:
     "tours done" is never cleared). kastlan drops its registration (use-tours.tsx:26-27
     and the imports :7-8) in either mode; nothing else reads it.
9. **Export and erasure.** Each app's account export gains `tour_progress: [{tour_id,
   completed_at}]` (by `tour_id`, `completed_at` null for `""`); erasure is the cascade
   (kastlan's erasure deletes the `users` row, admin_user_service.py:387).
10. **keksdose stays on the device**, in 0.45 and after unless Marcel asks. Two reasons:
    - **Privacy:** "which features this person learned, and when" is a new category on
      the exhaustive "What we can still see" list: usage data tied to the account, not
      routing, and unlike `locale`/`text_size` nothing the server acts on. Moving it would
      need a new `proof_see_*` line in four languages, a privacy-policy line, the export
      key, and arguably leaving it off while a household is Private: a lot of promise
      surface for a points tile.
    - **A second outbox:** the kit's pending record would be a queue outside `/sync`, the
      sync chip and the logout guard (decision 7).

### 10.3 What each kit ships

- **server-kit 0.15, `eifi1_server_kit.tours`.** Layer 1: `TourProgressResponse`,
  `TourProgressPatch`, `TOUR_ID_PATTERN`, `TOUR_PROGRESS_LIMIT` (500), `merge_completions
  (stored, patch, *, now)` → the rows to write, the ids to delete and the answer (pure),
  the two refusals (`TOUR_PROGRESS_CONFLICT = "tour_progress_conflict"`,
  `TOUR_PROGRESS_FULL = "tour_progress_full"`). Layer 2: the port `TourProgressStore`
  (`completions(user_id)`, `write(user_id, upserts, deletes)`), `TourProgressService`,
  `tour_progress_router(TourProgressDeps(store, current_user_id, guards))` (the `fastapi`
  extra; the kit never commits; `guards` pass the app's demo refusal through) and
  `testing.InMemoryTourProgressStore`. **M** (~250 code, ~400 test lines).
- **ui-kit 0.45.** `UseTourProgressOptions` gains `account?: {load, save, adopt?}`: `load()`
  is the app's `GET`, `save(body)` its `PATCH`, each returning the parsed answer, as
  `useAccountAppearance`'s `save` does; `adopt` is `{storageKey, migrate?}` or
  `{storageKey, discard: true}` (decision 5). Remembered per key like `migrate` (the first
  one wins), so it is defined once at module level and the provider needs nothing new.
  `signOutTourProgress(storageKey)` beside `resetTourProgress`: the cache only, the
  pending record kept (decision 6). `completeTour` stays a device write (tests and seeds),
  marked pending when the key has an account. Without `account`, 0.44's behaviour byte
  for byte (the existing tests stay). **M**.

### 10.4 Per app

| App | Change | Size |
|---|---|---|
| Kurvenschmiede | Asked for it. Table + migration (plaintext columns, imports nothing), a store adapter, mount the router; the demo declaration `not_in_the_demo` (403 `demo_refused`) in `tests/api/test_demo.py`; `tour_progress_conflict` and `tour_progress_full` as coded refusals (`domain/refusals.py`, a row each in `tests/api/test_refusals.py`, a sentence in all seven catalogues); `account` in `tourProgressOptions` (app-tours.ts:27, key unchanged, no `adopt`); `signOutTourProgress` in `clear()` (auth-store.ts:64-73, the 401 path included); export key in account_export.py:125; the privacy line "tours" (storage-keys.ts:114) reworded (a copy of the account's, removed at sign-out) in 7 languages; the kind stays `never` (:150-151). | S–M |
| kastlan | Table (no `company_id`, outside RLS), store, router (the `DEMO_WRITES` gate refuses a demo's PATCH as it is); a key per account `kastlan.tours.completions:<id>` with `adopt: {storageKey: "kastlan.tours.completions", discard: true}` (use-tours.tsx:19, :23-24: the old record is dropped, not adopted); `signOutTourProgress` in `logout()` itself (auth-store.ts:68-80); export (`GET /me/export`, account_router.py:101-102). In either mode: drop the device-reset registration (use-tours.tsx:26-27 and its imports :7-8). | S–M |
| keksdose | **Stays on the device** (decision 10). Nothing in 0.45. If it ever moves: a key per account with `adopt: {storageKey: "keksdose-tour-progress", migrate: fromZustand}`, `signOutTourProgress` in `forgetPreviousAccount` (auth-store.ts:47), the pending record left out of the sync chip and the logout guard, a `proof_see_*` line, the privacy-policy line, export in `build_export` (account_export_service.py:404), a check that the local API host does not answer `/tours/progress`. | 0 |

### 10.5 For the reviews

Answered in audits/round-046/reviews.md; §10.6 says where each answer went.

- All: does a table per app fit, or should it be an account-settings JSON value (KS's
  alternative)? Is "the later completion wins" right for your cards' "Completed on"?
- KS: is removing the cache at sign-out right on the bench PCs, given a visitor's record
  stays under `visitor`?
- kastlan: are office PCs shared, so that "the first account to sign in takes the old
  device record" would give one person another's marks? Then drop the old record instead.
- keksdose: stay on the device? If not, does tour progress on the server fit privacy
  mode's promise (ids and dates in plain text, like `locale`)?

### 10.6 The reviews (2026-10-19) and Marcel's settle

The draft (ui-kit `870b916`) was reviewed on 2026-10-19 by kastlan (at `feat/kit-0.44`
6c2a0c4), keksdose (keksdose-83, at `feat/feedback-loop-80-424-434`) and Kurvenschmiede
(at `main` b54c16e). Marcel settled it the same day in the ui-kit session ("As
reviewed"). Every correction was checked against the app's code before it went in. Where
each point went:
- **Marcel:** KS and kastlan use the account table, keksdose stays on the device →
  §10 head, decision 10; kastlan drops its old record through `adopt: {storageKey,
  discard: true}` → decision 5, §10.3; `signOutTourProgress` removes the cache only and
  keeps `:pending` → decision 6; the later completion wins → decision 3.
- **kastlan:** the table, no company, the cascade → decision 1, decision 9; its suite on
  Postgres too → decision 3; shared office PCs, `logout()` already treats the device as
  shared, drop rather than adopt (a kit option that still lets the dev warning know the
  old key) → §10.1, decision 5; the device-reset registration (use-tours.tsx:26-27,
  imports :7-8) dropped in either mode, settings-harmonization.md's stale path fixed →
  decision 8, §10.4; one `logout()` with four callers, keep the pending record for its
  owner → §10.1, decision 6; the demo already refused by `DEMO_WRITES` → decision 2;
  the row's `adopt` replaced and the reset line added → §10.4; the pending record out
  of local-first's "N waiting" and sign-out guard → decision 4.
- **keksdose:** stay on the device, privacy list and second-outbox reasons → decision 10,
  decision 7; the table right, the later completion right → decisions 1, 3; §10.1's
  paragraph accurate.
- **Kurvenschmiede:** the table, KS's alternative withdrawn, plaintext columns, nothing
  imported → decision 1; the later completion right → decision 3; removing the cache on
  the bench PCs right, one `clear()` for every end of a session including a 401 →
  §10.1, decision 6 (the 401 loss it pointed out is gone with the pending record kept);
  "the apps' tests run SQLite" wrong for KS → decision 3; the demo declaration, the coded
  refusals, the privacy line at storage-keys.ts:114 → decision 2, §10.4.
