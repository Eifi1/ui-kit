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

