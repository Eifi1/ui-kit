# Guided tours — harmonisation plan

**Settled 2026-10-17** (Marcel, in the ui-kit session, after the three app reviews in
audits/round-044/tours-reviews.md; §6 wins over §2–§4). Built for ui-kit 0.43.

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
tile and the toast stay app-side (kk Q4, KS Q4), through `onComplete(tourId)`. The kit
still draws no gap and no "0 points" for a tour passed without points (KS).

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
  the completion counts anew: that is the app's `onComplete` moment for the points and the
  toast (§6.1). Passed the tour, a completion reset by `updated` is replaced (§8). Blocked
  or full storage keeps the marks for the page's life. Readers on the same key agree
  through an in-tab emitter and the `storage` event.
- **`useTourUrlSync({launch, ready?, stepAliases?})`** (§2.7, §6.4): keksdose's
  `TourUrlSync` on `useTourOptional()`. `launch(id, {startIndex})` is the app's launcher
  (its steps, its `prepare()`, its `onFinish`). A tour starts whenever `?tour=` changes to
  an id, on in-app navigation too, after `ready`; `&tourStep=` is 1-based. While a tour
  runs, the URL mirrors it (never during a navigation in flight, never touching other
  parameters or the hash); at the end only `tour`, `tourStep` and the aliases go.
  `stepAliases: ["ts"]` reads kastlan's 0-based `ts` for one minor.
- **`useTourCatalogueUrlState(params?)`** → `{query, group, state, onChange}`, spread onto
  the catalogue: `?q`, `?topic`, `?state`, written with `replace`. `params` renames them
  (kastlan's `?group`).
- **`TourMenu`** takes `completed` and `joined` and works out ✓, NEW and "Updated"
  itself; a tour's own `isNew` / `completed` / `reset` still wins. A reset tour is listed
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
   screen moved; the tour follows it now."). A completion from before `updated.date` no
   longer counts as done.
   - The tour is "to do" again, and the "done" filter and the counts follow.
   - Completing it again awards its points again.
   - Nothing is deleted from the device: the kit compares the dates, so the old completion
     date stays readable.
2. **The reason is shown.** A reset tour's card carries an "Updated" pill and the line
   "Reset on {date}: {reason}". `TourMenu` lists it with the same pill and lights its dot,
   as for NEW.
3. **A tour that was never completed** shows no reset line: for that person there is
   nothing to reset. A tour updated after a person's account was opened isn't NEW because
   of the update; `since` stays its first ship date.
4. **One update at a time**: a later update replaces `updated`, and the newest date counts.
