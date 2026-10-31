# Adopting `@eifi1/ui-kit` 0.44

## Tours: completion in one place, and a writer outside a page

Settled 2026-10-17 (docs/tours-harmonization.md §9, with §9.6 from the three reviews; what
shipped is §9.7). The engine now records a finished tour itself and reports it, so no app
wires `onFinish` + `complete()` by hand any more.

### New names and props

- **`<TourProvider progress={…} onComplete={(tour, { awarded }) => …}>`**. `progress` is
  the same `UseTourProgressOptions` (`{storageKey, migrate?}`) the app's
  `useTourProgress` readers use. **MUST: declare it once, at module level, and hand the
  same object to the provider and every reader of the key** (keksdose B-2). The kit
  remembers the first `migrate` it sees for a key, but a reader without it that renders
  first still shows the old marks as missing for that render. The provider never keeps
  its own copy; it writes through the store the readers share. Both props are optional
  (a bare `<TourProvider>` in a test render still works).
- **`start(steps, { tour, … })`** carries the tour's `TourInfo`. When its last step is
  finished, the provider:
  1. writes the completion ONCE (`awarded` is what `complete(tour)` answered before:
     `true` the first time, and the first time after the tour's `updated.date`, §8);
  2. calls `onComplete(tour, { awarded })`: the app's points toast goes here;
  3. calls the start's own `onFinish` (teardown, redirect, practice mode off).

  A skip (Skip, Esc) or `stop()` writes nothing and calls neither. Without `progress`, or
  without `tour` on the start, `onComplete` still fires with `awarded: undefined`. `id`
  may be left out: `activeId` falls back to `tour.id`.
- **Remove the app's own `complete()` from `onFinish` (keeping it records twice).** The
  provider has already written, so a second `complete(tour)` answers `false` and the
  toast would never show.
- **The provider follows a `storageKey` change** (sign-out, sign-in as someone else on a
  shared PC) without a remount: the key is read when the tour finishes.
- **`completeTour(storageKey, tour, at?, { migrate? })`**, beside `resetTourProgress`:
  writes a completion from outside a page, for tests, seeds and scripts. `tour` is an id
  or `{id}`; `at` an ISO string or a `Date` (default now), `null` for a completion without
  a date (stored as `""`, read back as `null`). It keeps the other tours' marks, and every
  reader in the same tab moves at once (no `storage` event needed). It replaces writing
  localStorage and dispatching `storage` by hand:

      completeTour(TOUR_KEY, "budget", "2026-09-01T10:00:00Z");
      completeTour(TOUR_KEY, "budget", undefined, { migrate: fromZustand }); // old shape

- **The write guard** (keksdose B-1): an old-shape text is read through `completeTour`'s
  `{migrate}`, or else the `migrate` a reader or the provider registered for the key. If
  the stored text is neither empty nor the kit's shape and no `migrate` reads it,
  `completeTour` and `useTourProgress().complete` THROW and overwrite nothing; the
  provider's finish writes nothing, logs the error, and reports `awarded: false`.

- **`TourCompletion`** (type): `{ awarded: boolean | undefined }`, `onComplete`'s second
  argument.

### The stored shape (one written form)

Under the app's key the kit stores the JSON record `{ [id]: ISO instant | "" }`. `""` is a
completion without a date (a migrated record). The hooks and callbacks give `null` for it
(`completed[id] === null`). A `null` already in storage, or returned by `migrate`, still
reads as before and is written back as `""` on the next write. A test that reads the
stored value expects `""`, not `null`, for a dateless mark.

### New words (defaults, all apps)

keksdose's reviewed words are the kit's defaults now (§9.4): en `stateTodo` "Not taken
({n})", fr "Non suivies ({n})", it "Da fare ({n})"; `noMatchesHint` de-CH "Anderes Wort
versuchen oder Filter zurücksetzen.", fr "…ou effacez le filtre.", it "…o cancelli il
filtro."; `points` de-CH "+{n} Pkt", fr "+{n} pts", it "+{n} pt". An app test that
matches "To do (2)" in English now matches "Not taken (2)".

### Per app

| App | Change |
| --- | --- |
| keksdose | **Provider:** `<TourProvider>` at `main.tsx:98` gets `progress` (the `OPTIONS` of `shared/state/tour-progress.ts:40`: export it, so the reader and the provider share the one object with `fromZustand`) and `onComplete`, the 🏆 toast: `(tour, { awarded }) => { if (awarded) toast.success(t("tour.earned", { points: tour?.points }), { icon: "🏆" }); }`. `main.tsx:98` sits inside `KitI18nProvider`/`AccountLanguageProvider`, so a small wrapper component with `useTranslation` holds `t`. **Launch:** `launch` (`features/tour/tours.tsx:657-688`) passes `tour` to `start` (the def mapped to its `TourInfo`, as for the page, with `points` and `updated`), and its `onFinish` (`:679-684`, the comment and `complete(def)`) goes; drop `complete` from `useTourProgress()` (`:58`) and from the deps (`:687`). `prepare()` stays before `start` as it is. **Words:** drop the three overrides in `features/tour/tours-page.tsx:73-79` (`stateTodo`, `noMatchesHint`, `points`); the kit says them now, in keksdose's own words (fr/it "le filtre" / "il filtro", de "+{n} Pkt"). **Write guard:** export `OPTIONS` is a MUST (B-2), and a test or seed on an old zustand key passes `completeTour(…, { migrate: fromZustand })`, or it throws. **Tests:** `test/render.tsx:100` keeps its bare `<TourProvider>`; `test/tour-progress.ts` can write with `completeTour` instead of localStorage plus a `storage` event. |
| kastlan | **Start:** `startAppTour` (`features/tours/tours-root.tsx:103-124`) takes kastlan's own `Tour` type, not a `TourInfo`, so `AppTourProvider` builds the FULL `TourInfo` list once, `const infos = useTourInfos(listTours())` (every tour, not the role-filtered list), and passes `tour: infos.find((x) => x.id === tour.id)` to `start` (with `title`, `points` and `updated`) (F2). **Remove `complete()` from `onFinish`:** the `if (complete(tour)) { toast.success(…) }` at `:113-117` (with its comment, `:111-112`) goes, with `useTourCompletions()` at `:65` and `complete` in the deps (`:123`). **What stays in `onFinish`:** `endTour(true)` (`:118`), i.e. the practice-mode switch-off (`setTourMockActive(false)`) and the redirect to the catalogue; `onSkip` stays as it is. **Provider:** `ToursRoot`'s `<TourProvider>` (`:159`) gets `progress={{ storageKey: STORAGE_KEY, migrate: fromIdList }}` (export one options object from `use-tours.tsx:18-31` and use it in `useTourCompletions` too) and `onComplete={(tour, { awarded }) => { if (awarded && tour) toast.success(t("catalog.earned", { title: tour.title, count: tour.points })); }}`, with `t` from `useTranslation` in `ToursRoot`. Mock mode is untouched: it is switched on in `startAppTour` and off in `endTour`. |
| Kurvenschmiede | **Provider:** the `<TourProvider>` in `App` (`main.tsx:93`) gets the per-account key, read where `App` already reads the account (`:71`): `` progress={{ storageKey: `${STORAGE.tourProgress}${account?.id ?? "visitor"}` }} ``, the same key `useAppTours` reads (`features/tours/app-tours.ts:50`; spell it once, e.g. a `tourProgressOptions(userId)` helper both call). It follows an account switch without a remount. `onComplete={(tour, { awarded }) => { if (awarded && tour?.points) toast.success(t("tours.completed", { title: tour.title, count: tour.points })); }}` (an `if`, not an expression: KS's `no-unused-expressions`, KS 1). **Launch:** `engine.start(chosen.steps, { id, tour: chosen.info })` (`app-tours.ts:91`); **remove the app's own `complete()` in `onFinish` (keeping it records twice)**: the per-tour `onFinish` with `progress.complete(chosen.info)` and the toast (`:93-98`) goes (KS 2). `useAppTours` keeps `progress.completed` for the menu. **Tests:** `app/top-bar.test.tsx` seeds with `completeTour` instead of reading and writing localStorage. |

### Every app

- **The portal's accessible names include "(opens in a new tab)"**, so tests match them by
  regex (`getByRole("button", { name: /Payment and invoices/ })`), not the bare label
  (kk 6, KS 1).
- **"All topics" has the value `""`** in the catalogue's topic select, not `"all"` (kk 4).
- **App tests see the kit's English** unless they load the kit's labels for their
  language: expect the kit's English words in a test, or render under the app's
  `KitI18nProvider` / `UiKitProvider` with its locale (ka 1).
- **A per-account key is a prefix plus the user id** (`${prefix}${userId}`, KS 2). A
  "keys spelt once" test must allow a prefix that leads a template literal.
- **`options.window` is `openProviderPage`'s test seam** (kk 7): pass a stub with `open`
  (a fake tab, or `null` for a blocked pop-up) and `location.assign`, instead of patching
  the global `window`. The docstring has an example.
- **Define the options (with `migrate`) once, at module level** (kk 3), and give the
  provider and every reader of the key the same object: a MUST (keksdose B-2). All
  readers share one snapshot, and the first `migrate` seen for a key is the one that runs.
- **`useTourProgress`'s docstring states the stored shape** (`{[id]: ISO | ""}`), for an
  app's tests and seeds (KS 4).
