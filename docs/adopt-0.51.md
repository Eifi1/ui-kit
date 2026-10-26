# Adopting `@eifi1/ui-kit` 0.51

ui-kit 0.51 removes the names 0.49 deprecated, brings the dev switchers together in one
`DevMenu`, adds `PublicPage` (the general frame for a public page) and fixes a handful of smaller
things. This guide lists, per change, what each app does, with the places found in keksdose,
kastlan and Kurvenschmiede on 2026-10-26 (`frontend/src`).

**server-kit 0.20.0:** the dev switch learns a "today" override, the dev clock (see the
DevMenu section). Pin `@eifi1/ui-kit` `^0.51` beside the `eifi1-server-kit` 0.20.0 wheel. Two
things move on the wheel bump even for an app that does not use the clock:
- **`DevSwitchAnswer` carries `today`**, so the dev switch's answer is
  `{"role": …, "plan": …, "today": null}`. A test that compares it WHOLE breaks: kastlan
  `tests/api/test_dev_switch.py:56` and `:68`, keksdose `backend/tests/api/test_dev_switch.py:127`
  (add `"today": None`). Kurvenschmiede's reads single fields and is unaffected.
- **A body naming `today` is refused, 422 `dev_switch_no_clock`,** unless the route passes
  `validate_dev_switch(…, clock=True)`. An app that has not wired the clock refuses the field
  as 0.19's `extra="forbid"` did, instead of answering 200 to a switch it ignores.

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
  body that leaves it out) once the route says `validate_dev_switch(…, clock=True)`, answers it
  in `DevSwitchAnswer.today`, and every server path that asks for today reads
  `effective_today(override, gate=…, today=…)`, which gives the real date whenever the gate is
  shut. `today=` is required: your real "today" in your time zone (kastlan's
  `clock.local_today()`, Europe/Zurich), since the server's own date is UTC on Cloud Run and
  in a deployment that is all it would read. Only the date moves: timestamps (tokens,
  `expires_at`, a trial's end) stay on real time. While one is set, the client takes today from the answer, not
  from its own clock, so the dates it works out itself agree with the server's — and it reads
  the answer BEFORE the first render, in a dev-only hook at boot outside the lazy menu chunk
  (rule 2): otherwise a reload starts on the device clock until the menu loads and its probe
  answers, and a month end or a "Committed <date>" worked out in that window disagrees with
  the server's (keksdose N2). Each app keeps the override its own way, as it keeps the role.

**The dev-only rules (§2.7.1).** They are the app's to keep; the kit cannot check them.
1. Render the menu only with `enabled = import.meta.env.DEV` AND the probe of the dev route
   (`GET /dev/switch`), as all three apps already do.
2. Put the section DEFINITIONS in a module imported only behind `import.meta.env.DEV`.
   `enabled={false}` hides the menu but leaves the sections' code in the production bundle.
   The constant is what drops it: a static import used only in an `import.meta.env.DEV && …`
   slot is enough (kastlan's `top-bar.tsx:201`, whose production build carries no dev-switch
   code), as long as the sections are defined in that module; or a lazy one:
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
| keksdose | `app/dev-switchers.tsx:67`: `TopBarDevSwitchers` renders `DevSwitchers<UserRole, DevPlan>`; its slot is `app/top-bar.tsx:166` (`import.meta.env.DEV && user ? … : undefined`), imported statically at `:13`. Its tests `app/__tests__/top-bar.test.tsx:66–67`, `:74–75`, `:85` and `:93` find the triggers by "Switch role · Role: ADMIN" and "Switch plan · Plan: standard" / "Plan: pro". | **In the bump:** those four tests look up the one flask: `/^Dev tools/`, or "Dev tools · Role: ADMIN · Plan: standard" (`:74–75` become one lookup, `:93` is "… · Plan: pro"); `:66–67` become one `queryByRole("button", { name: /^Dev tools/ })`. Then `DevSwitchers` → `DevMenu` (same props). For the budget role, the "today" override and the resets: move `TopBarDevSwitchers` with their definitions into a module loaded by `import.meta.env.DEV ? lazy(…) : null` in `top-bar.tsx` (rule 2), set `active` while "today" is overridden, and route each server-backed row behind `KEKSDOSE_DEV_SWITCH_ENABLED` and the local-run check (rule 3). **The dev clock is the bigger half of the bump** (keksdose N1): the server has no "today" seam yet — 61 `date.today()` calls in 28 files under `backend/keksdose`, plus `datetime.now()` reads that mean today (no database-side clock reads in queries) — so one `app_today()` over `effective_today` replaces them; a process-wide override fits a one-user local server, reaching background paths without the user in every signature. The client's seam is `todayIso()` (`shared/ledger/dates.ts:30`), reading the answer at boot (above). |
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

The tile draws the rows it is given; which rows to give is the app's rule. keksdose shows both
on every tile (live #455, Marcel: "Always show both, on every tile"), also where Committed
equals the figure so far. The showcase's Stats page shows both cases.

**keksdose:** your shared tile's interim (`kpi-card.tsx:163` `projection` = Committed,
`:144–147` the estimate leading `subValues`) becomes `projection={[committed, projected]}` at
those lines.
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

**keksdose:** draw `/prices` (price pool v2, `prices-page.tsx:172–250`) in it instead of
composing the header, column, footer and `usePageSeo` (`:107`) by hand: `header={<LandingHeader />}`,
`footer={<SiteFooter />}` (yours), the canonical `/prices` as `seo`. The region and month
pickers stay inside the snapshot section (they belong to a snapshot), not in `actions`. It
changes the look a little — the column `max-w-5xl` → `max-w-6xl`, `py-8` on a phone → `py-12`,
the h1 `text-2xl sm:text-3xl font-semibold` → `text-3xl font-bold`, the lede `max-w-3xl` →
`text-lg max-w-2xl` — so check the de-CH and French titles at 390px. **Kurvenschmiede:** for the next public page outside the
shell. Nothing moves: `/dashboard`, `/control`, `/dynamics` with its lessons, `/steering` and the
404 are working screens in the shell (signed-in readers use them too, and the course needs the
shell's nav), with `VisitorLegalFooter` for a visitor's three links. **kastlan:** nothing to do.

## kastlan K1: a clamped strip keeps "Send again" on its line (`clampMobile`)

Marcel kept the strip for kastlan's `EmailVerificationBanner` (2026-10-23), so the fix is the
strip's: with `clampMobile`, below `md`, the strip's message claims **7rem** instead of 12rem
before the action wraps. The message is one clamped line either way (the rest is behind
"More"), and the 12rem only pushed the action under it. Any `AlertBanner variant="strip"
clampMobile` gets it; from `md` up, and without `clampMobile`, nothing changes. The `box`
variant keeps `actionPlacement` (0.50).

Measured in Chromium at 390 × 844, kastlan's banner (`mx-4`, `clampMobile`, with the ×),
Normal text: **43px, one line before a resend** (glyph, message, More, "Send again", ×) in all seven catalogues,
with Roboto (Android) and with the wider DejaVu Sans; **71px** on 0.50 (the button on a line
of its own). French ("Envoyer à nouveau", the longest) keeps 8px. At 360px French, and
Spanish in DejaVu Sans, still drop the button to a second line. At Large the button drops a
line sooner, as before.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/auth/verify-email-banner.tsx:28`, the strip, without `clampMobile`. | Nothing. |
| kastlan | `features/auth/components/verify-email-banner.tsx:20`, the strip with `clampMobile` (KX-5). | Nothing: the banner is 43px on a 390px phone after the bump, until a resend. After one, "Send again in 60 s" and "Confirmation email sent" can't sit beside the message, so it is two lines for the rest of the visit, as it should be: the answer to the press must show. Check it once at 390 × 844. |
| Kurvenschmiede | `app/layout.tsx:79`, the strip, without `clampMobile`. | Nothing. |

## Kurvenschmiede N5: the roster's role select shows its value whole

The user roster's role **select** (`useUserRosterColumns` / `userRosterColumns` with
`editableRole` + `onRoleChange`) no longer clips its value. Beside the `grow` Name every other
column is squeezed to its min-content, and a `w-full` `<select>` has none (a select with a
percentage width counts as zero there), so the Role column was its header's width and the
select read "Meml…" / "Admi…" on 0.49 and 0.50. The cell now carries an invisible,
zero-height floor of the vocabulary's role words in the select's own type, padding and
chevron room, so the column keeps room for the longest **role word** in the app's language
(every role of `roles`, offered or not, plus a held key it does not know). An option's reason
("Customer (owns work)") is not counted: it is never the selected value, and the open list
is as wide as it needs. The words are generated content (`::before`), not text: a test's
`getByText("Member")` still finds only the option.

Measured in Chromium at 1280px, the kit's preset in a 900px pane with Kurvenschmiede's four
roles: on 0.50 the Role column was 92px and the select 68px (30px for the value: every role
but Hungarian's "Tag" clipped); now the column is 109px (de-CH, "Prüfer/in") to 114px (en,
"Customer"), 138px (es, "Administrador") and 141px (hu, "Adminisztrátor"), every value whole,
and Name gives the room back (the table stays 851px, nothing leaves for width). The phone
card is unchanged (the select fills its 240px field). That 900px pane is Kurvenschmiede at
about 1536px; in its narrower panes a `fitPriority` column can now leave where it stayed
before (see the KS row).

| App | Where | Steps |
|---|---|---|
| keksdose | `features/admin/users-panel.tsx:807`, `editableRole` (`:752`): the role select. | Nothing. The Role column widens to its longest role word; check the admin page at 1280px once. |
| kastlan | `features/settings/components/users-panel.tsx:341`: no `editableRole` (its roles are a "Manage roles" action), so chips. | Nothing. |
| Kurvenschmiede | `features/admin/users-panel.tsx:418`, `editableRole` with `offered` and `optionDisabledReason` (`:421–426`). | Nothing to change in code, but one column more can leave. KS's review measured the role whole in all seven languages at 1100–1536px (cut everywhere on 0.50.1), with the Role column at 1280 going 92 → 114 (en) … 145 (it). KS's pane, with the sidebar and the admin nav open, is 466px at 1100, 646 at 1280, 732 at 1366, 902 at 1536, and there one `fitPriority` column now leaves at some widths: Plan (fp 4) at en 1280, Reviews (fp 3) at en/es/fr 1366, Last login (fp 2) at de-CH/es/fr/it 1536 (no change at 1100, nor in zh and hu). What leaves is in the Columns menu; re-measure the order at `users-panel.tsx:440–445` at the bump. |

## keksdose N2: under `virtualize`, a column the fit brings back stays when it fits

From keksdose's 0.49 review 3 (B2's guard held). With `virtualize`, a `fitPriority` column
the table left out and brought back was estimated at 606 + 93 = 699 ≤ 757 but drawn needed
778–812, so it went again and B2's guard kept it out although it fitted. The cause:
`virtualize` locks the columns' widths in a `<colgroup>` under a signature that names the
columns, and only ever grows them while rows scroll. Leaving the column out changes the
signature, so the fit measures that table afresh (606); bringing it back in the same frame,
before `virtualize` measures anything, restored the old signature, and with it the OLD lock,
whose widths had ratcheted up while rows scrolled. The lock now goes as soon as the signature
changes, so the table the column comes back to is drawn as the fit measured it (the next
frame locks that).

Visible effect: such a column comes back (and stays) once there is room by the fresh
measure; the columns' ratcheted widths reset to the rows in view when it does, as they
already did on any other column change. B2's guard is unchanged for a column whose cells
are wider than its header.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/transactions/transactions-page.tsx:1114` (`virtualize`, on since 0.4.69), the columns' `fitPriority` in `use-transaction-columns.tsx` (Memo 1, Account 2, Status 3, Category 4). | Nothing. Status no longer stays out at a width where it fits; re-check it once in the bump's production build at 1124×1162 (the run 637 harness). |
| kastlan | No `virtualize`. | Nothing. |
| Kurvenschmiede | No `virtualize`. | Nothing. |

## `AlertBanner`: the message's box is a `<div>`; `clampMobile` is for a one-line message

The box around a banner's `children` was a `<span>`, so a list or a `Disclosure` inside a
banner (keksdose's agree-again notice, price pool v2) put block elements in phrasing content.
It is a `<div>` now in every mode but the whole-row one (`href` / `onClick`), whose `<a>` /
`<button>` takes phrasing content only and keeps the `<span>`. The look does not change: the
box was a flex item either way.

`clampMobile`'s doc now says what it is for: a one-line MESSAGE. On a body with a list or a
control in it, the clamp clips a trigger past the first line out of sight while it still takes
the keyboard's focus. For such a banner, shorten it instead: one sentence, its action, and the
rest behind a `Disclosure variant="bare"` in the banner.

**Apps:** nothing to do. A test that finds the message's box by `span` (none found in the three
apps' `frontend/src`) finds a `div` now.
