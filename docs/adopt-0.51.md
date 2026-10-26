# Adopting `@eifi1/ui-kit` 0.51

ui-kit 0.51 removes the names 0.49 deprecated, brings the dev switchers together in one
`DevMenu`, adds `PublicPage` (the general frame for a public page) and fixes a handful of smaller
things. This guide lists, per change, what each app does, with the places found in keksdose,
kastlan and Kurvenschmiede on 2026-10-26 (`frontend/src`).

**server-kit 0.20.0:** the dev switch learns a "today" override, the dev clock (see the
DevMenu section); nothing else changes. Pin `@eifi1/ui-kit` `^0.51` beside the
`eifi1-server-kit` 0.20.0 wheel.

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

## `DevMenu`: one dev flask, with the app's own sections (top bar §2.7.1)

New in `@eifi1/ui-kit/shell` (and the barrel): `DevMenu`, with the types `DevMenuProps` and
`DevMenuSection`. It is one `TopBarActionMenu` behind the amber flask. The kit's Account
section comes first: the role group, with "Back to {role}", then the plan group, with the
billing-off note. The app's `sections` follow, each a group under its `title`, in the order
given. It takes every `DevSwitchers` prop unchanged, plus `sections` and `active`. The
contract is docs/top-bar-harmonization.md §2.7.1.

```tsx
<DevMenu<UserRole, DevPlan>
  enabled={import.meta.env.DEV && probe.isSuccess}
  roles={DEV_ROLES}
  currentRole={probe.data?.role}
  onRole={(role) => apply.mutate({ role })}
  plans={DEV_PLANS}
  currentPlan={probe.data?.plan ?? undefined}
  onPlan={(plan) => apply.mutate({ plan })}
  billingOff={!billingEnabled}
  sections={[
    { key: "budget", title: "Budget", entries: BUDGET_ROLES.map((r) => ({ key: r, label: r, checked: r === budgetRole, onSelect: () => pickBudgetRole(r) })) },
    { key: "time", title: "Time", entries: [...timePresets, { key: "custom", label: "Custom…", checked: isCustomDay, onSelect: openDayDialog }] },
    { key: "resets", title: "Resets", entries: [{ key: "tours", label: "Reset tours", onSelect: resetTours }] },
  ]}
  active={todayOverridden}
/>
```

- **The rows are `TopBarMenuEntry`s; there is no dev item type.** A select is radio rows
  (`checked`), a toggle is a `checkable: "checkbox"` row, an action is a plain row. A row's
  key need be unique only within its section.
- **`active`** puts a dot on the flask while an override the developer could forget is on (a
  "today" that is not today, a simulated slow server), and its words join the trigger's name:
  "Dev tools · Role: ADMIN · Plan: free Overrides on". The app decides what counts.
- **The panel scrolls.** Some 25 dev rows ran off a 390×844 phone. The cap is
  `TopBarActionMenu`'s new opt-in, `scrollable` (`100dvh − 4rem`), which any other tall
  menu may use too; without it nothing changes.
- **New words** in all seven catalogues: `topBarParts.dev.menu` ("Dev tools") and
  `topBarParts.dev.overridesOn` ("Overrides on"). An app that writes its own
  `topBarParts.dev` tree gets English for them until it adds them.
- **server-kit 0.20: the dev clock.** The menu's Account section is server-kit 0.14's
  `POST /dev/switch`, as before. For a "Time" section the switch now also takes
  `{today: "2026-10-31"}` (and `{today: null}` to take it back; `sets_today` tells that from a
  body that leaves it out), answers it in `DevSwitchAnswer.today`, and every server path that
  asks for today reads `effective_today(override, gate=…, today=…)`, which gives the real date
  whenever the gate is shut. While one is set, the client takes today from the answer, not
  from its own clock, so the dates it works out itself agree with the server's. Each app keeps
  the override its own way, as it keeps the role.

**The dev-only rules (§2.7.1).** They are the app's to keep; the kit cannot check them.
1. Render the menu only with `enabled = import.meta.env.DEV` AND the probe of the dev route
   (`GET /dev/switch`), as all three apps already do.
2. Put the section DEFINITIONS in a module imported only behind `import.meta.env.DEV`.
   `enabled={false}` hides the menu but leaves the sections' code in the production bundle.
   The constant in front of the `import()` is what drops the chunk:
   ```tsx
   const AppDevMenu = import.meta.env.DEV ? lazy(() => import("./dev-menu")) : null;
   // …
   dev={AppDevMenu && user ? <Suspense fallback={null}><AppDevMenu /></Suspense> : undefined}
   ```
3. Every server-backed dev row (a "today" override, a reset that writes) goes through a route
   behind the same gate as the switch (§6.1): the local flag AND the local-run check,
   otherwise a 404.
4. No form fields in the menu: a free day is a "Custom…" row that opens the app's own dialog.

**Deprecated (removed in 0.52):** `DevSwitchers` → `DevMenu`; `DevSwitchersProps` →
`DevMenuProps`; `DevSwitchersLabels.switchPlan`, which nothing reads now (the one flask is
named by `menu`). **On the bump, `DevSwitchers` draws ONE flask where it drew two.** It is a
`DevMenu` with no sections, so the role and the plan are groups of one menu, and the trigger
is named "Dev tools · Role: ADMIN · Plan: free" instead of "Switch role · Role: ADMIN" and
"Switch plan · Plan: free". The rows, "Back to {role}" and its `sessionStorage` are unchanged.
A test that finds a trigger by "Switch role" or "Switch plan" now finds nothing.

| App | Where | Steps |
|---|---|---|
| keksdose | `app/dev-switchers.tsx:67`: `TopBarDevSwitchers` renders `DevSwitchers<UserRole, DevPlan>`; its slot is `app/top-bar.tsx:166` (`import.meta.env.DEV && user ? … : undefined`), imported statically at `:13`. Its tests `app/__tests__/top-bar.test.tsx:66–67`, `:74–75`, `:85` and `:93` find the triggers by "Switch role · Role: ADMIN" and "Switch plan · Plan: standard" / "Plan: pro". | **In the bump:** those four tests look up the one flask: `/^Dev tools/`, or "Dev tools · Role: ADMIN · Plan: standard" (`:74–75` become one lookup, `:93` is "… · Plan: pro"); `:66–67` become one `queryByRole("button", { name: /^Dev tools/ })`. Then `DevSwitchers` → `DevMenu` (same props). For the budget role, the "today" override and the resets: move `TopBarDevSwitchers` with their definitions into a module loaded by `import.meta.env.DEV ? lazy(…) : null` in `top-bar.tsx` (rule 2), set `active` while "today" is overridden, and route each server-backed row behind `KEKSDOSE_DEV_SWITCH_ENABLED` and the local-run check (rule 3). |
| kastlan | `shared/components/dev/dev-role-switcher.tsx:56`: `DevRoleSwitcher` renders `DevSwitchers<UserRole, Plan>` with a per-company `storageKey`; its slot is `app/top-bar.tsx:201` (`import.meta.env.DEV && <DevRoleSwitcher />`). No test names the triggers. | `DevSwitchers` → `DevMenu`, same props; it draws one flask on the bump either way. No sections needed. Optional: the lazy import of rule 2. |
| Kurvenschmiede | `app/top-bar-parts.tsx:157`: `AppDevSwitchers` renders `DevSwitchers<UserRole, …>`; its slot is `app/top-bar.tsx:75` (`user ? <AppDevSwitchers user={user} /> : undefined`, **not** behind `import.meta.env.DEV`: only `enabled` is). Its test `app/top-bar.test.tsx:192` finds the trigger by `/Switch role/` (`:183`'s `/Dev/` still matches nothing while the gate is shut). | **In the bump:** `:192` looks up `/^Dev tools/`. Then `DevSwitchers` → `DevMenu`, same props. Optional: fill the slot only behind `import.meta.env.DEV` (`import.meta.env.DEV && user ? … : undefined`), as the other two do, so a production build drops the branch. |

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
