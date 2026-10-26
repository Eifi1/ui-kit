# Adopting `@eifi1/ui-kit` 0.51

ui-kit 0.51 removes the names 0.49 deprecated, brings the dev switchers together in one
`DevMenu`, adds `PublicPage` (the general frame for a public page) and fixes a handful of smaller
things. This guide lists, per change, what each app does, with the places found in keksdose,
kastlan and Kurvenschmiede on 2026-10-26 (`frontend/src`).

**server-kit:** the dev switch learns a "today" override (see the DevMenu section). Pin
`@eifi1/ui-kit` `^0.51` beside the server-kit release named there.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show):
it keeps serving the old kit from `node_modules/.vite/deps` until it restarts.

## Removed: the 0.49 deprecations (breaking)

| Removed | Use |
|---|---|
| `Button` / `buttonClasses` / `IconButton` `variant="primary"` | `variant="default"` (same look) |
| `Button` / `buttonClasses` / `IconButton` `variant="brand"` | `variant="accent"` (same look) |
| `FloatingActionButton` / `FloatingAction` `variant="primary"` | `variant="accent"` (same look) |
| `IMPRINT_PRESET` | `DEFAULT_PRESET` (Imprint is the default) |
| `AppShell` `mobileBarMax` | `mobileMaxItems`, which counts the bar's cells with "More": `mobileBarMax={4}` is `mobileMaxItems={5}` |
| `DEFAULT_MOBILE_BAR_MAX` | `DEFAULT_MOBILE_MAX_ITEMS` (cells, "More" included: one more per size) |

**All three apps: nothing to do.** None of the names is used in keksdose (9dff22b0), kastlan
(1f9b16d) or Kurvenschmiede (8ad43f9), tests included: the apps switched in their 0.49 bump
commits. The development warnings for these names are gone with them.

A JavaScript caller that still passes `variant="primary"` gets no class for the variant (no
error at run time); TypeScript reports it.

## `TourLauncher`'s `engine` stays required (keksdose's 0.50.1 note)

0.50.1 gave `TourLauncher` a required fourth parameter, `engine`, and code that CALLS a
launcher with `(id, opts, start)` stopped compiling (TS2554) in a patch release. That was the
kit's mistake. 0.51 keeps the parameter required anyway: the kit always passes it, and an
optional `engine` would make every launcher that uses it check for `undefined`. Code that
forwards a launcher passes the engine on, as keksdose's AppTourProvider already does:

```ts
const launch = useCallback<TourLauncher>((id, opts, start, engine) => launcher.current?.(id, opts, start, engine), []);
```

**Apps:** nothing to do. keksdose forwards the engine (app-tour-provider.tsx:27); kastlan and
Kurvenschmiede never call a launcher themselves.

## `StatTile` `projection` takes several rows (keksdose #633)

`projection` accepts a list as well as one row: `projection={[committed, projected]}`. The rows
are drawn in order, tight under the headline like the single one (at Large: at the top of the
stacked figures), and each keeps its own `tone`. One row as before still works.

```tsx
<StatTile label="Net worth" value={today} projection={[
  { label: `Committed ${date}`, value: committed },
  { label: `Projected ${date}`, value: projected },
]} subValues={history} />
```

The tile draws the rows it is given. Which to leave out is the app's rule; keksdose's (feedback
#51 for two rows): a row only when its PRINTED figure differs from the row above it. The
showcase's Stats page shows it.

**keksdose:** your shared tile's interim (`projection` = Committed, `subValues` = [Projected,
…history]) becomes `projection={[committed, projected]}` at the marked switch point.
**kastlan, Kurvenschmiede:** nothing to do.

## Server wake: "slow" is timed from the oldest request still out (keksdose live #454)

The watchdog behind `ServerWakeNotice` used to time the stage from the FIRST request since its
count was last zero. On a busy page whose reads overlap — one going out before the last came
back — the count never reached zero, so reads that were each fast chained past 2 s and showed
"Still loading — this is taking longer than usual". Now the stage is the age of the OLDEST
request still out: when it settles, the next oldest's age decides, which can put the notice
away again (the server answered, so it is not asleep). A request joining others still does not
restart the clock.

`end()` names no request, so it retires the oldest start; when a newer request comes back
first, the notice can come a little LATE for the older one, never falsely.

**Apps:** nothing to do (`createServerWake`, `attachServerWake`, `wrapFetch` and keksdose's own
`start`/`end` calls work as they are). A legitimately heavy read longer than 2 s on a warm
server still shows "slow"; a per-request opt-out (`slowOk`) is a question for the 0.51 review.

## New: `PublicPage`, the frame of a public page (Marcel 2026-10-26)

For a public page that is neither the landing nor a legal page
(docs/landing-demo-harmonization.md §4.4): your `PublicHeader`, a column at the landing's width,
and `PublicFooter` (the three legal links) by default, as `LegalPage` draws its frame.

```tsx
<PublicPage
  header={<LandingHeader session={session} />}
  title={t("prices.title")}
  description={t("prices.lead")}
  actions={<RegionPicker />}
  seo={{ canonicalPath: "/prices", title: t("prices.seo.title"), description: t("prices.seo.description") }}
>
  <StatTileGrid>…</StatTileGrid>
</PublicPage>
```

- `seo` has no default: an object for a page to be found (it calls `usePageSeo`), `"noindex"`
  for a page to keep out (it calls `useNoIndex`), `null` only for a preview inside another
  page. A page to be found also goes into `sitemap.xml` and its copy into your SEO test.
- `width="prose"` for a reading column (the legal pages' `max-w-3xl`); `footer` takes your own
  `PublicFooter` (a tagline) or `null`; `back` is your "← Back" link; `headingAs` and
  `landmark={false}` for a preview.
- New type `PageSeo`, the argument `usePageSeo` always took (named now; the hook is unchanged).

**keksdose:** draw `/prices` (price pool v2) in it instead of composing the header, column,
footer and `usePageSeo` by hand. **Kurvenschmiede:** for the next public page outside the
shell; `/control`, `/steering` and the 404 stay as they are (in the shell, for signed-in readers
too). **kastlan:** nothing to do.
