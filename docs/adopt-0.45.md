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
| keksdose | Optional, test and tidy only. **Mapper:** `features/tour/tour-info.ts:21` gains a single `tourInfo(def, t, opts)` that `tourInfos` maps, and `launch` passes `tour: tourInfo(def, t)` (`features/tour/tours.tsx:683`, now `tourInfos([def], t)[0]`). **Test:** `features/tour/__tests__/app-tour-provider.test.tsx` can drop its barrel mock (`:11-23`, the `TourProvider` capture and the file's own toast spy) and drive the real `AppTourProvider` (§9.8.2), asserting on the setup's `toast.success` spy (`test/setup.ts:14-33`), with `resetTourProgress(TOUR_PROGRESS_KEY)` in `beforeEach`. The "same options object" check can stay as a plain `expect(TOUR_PROGRESS_OPTIONS)…` on the module or go. **Date:** `formatDateFor` (`shared/components/ui.tsx:58-80`) already formats a date-only string in UTC: nothing to do. |
| kastlan | Nothing. `tour-catalog-page.tsx:75` formats through `shared/utils/formatters.ts:91-108`, the kit's `formatDate`, which reads a bare day right. |
| Kurvenschmiede | Nothing. `app/top-bar.test.tsx:259` already resets the key with `resetTourProgress` before its awarding test (the §9.8.4 note). |
