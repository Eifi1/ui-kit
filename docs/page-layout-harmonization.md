# Page layout — harmonisation plan

Marcel, 2026-10-16, relayed by keksdose: "I want to have it harmonized across the apps" —
the list page whose table fills the window (DataTable `fillHeight`). kastlan fills every
list page, Kurvenschmiede one, keksdose one and only from `md`. This contract says which
pages fill, how the shell lets them, and what each app changes.

Drafted from a read-only survey on 2026-10-16 (kk `6473cef0`, ka `4997d49`, KS `228cfe1`,
all on ui-kit 0.39.1; ui-kit `75aadd2` plus round 0.40's uncommitted DataTable change).
**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.

## Status

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | The list page fills the window | — (DRAFT for review, round 0.40; to be built for ui-kit 0.40) | |

## 1. The list page fills the window (DRAFT for review, round 0.40)

**DRAFT for review (round 0.40)**: the apps review it, Marcel settles what the reviews
leave open, then it is built for **ui-kit 0.40** (no server-kit part).

### 1.1 Where each one stands

**The kit.** `<main>` is the scroller from `md` up (`src/shell/app-shell.tsx:537-545`:
`flex-1 … md:min-h-0 md:overflow-y-auto`); below `md` the document scrolls. DataTable's
default cap is `maxBodyHeight = calc(100dvh - 12rem)` (`src/components/data-table.tsx:258-287`):
the body scrolls inside a page that scrolls too, the two scrollbars of round 0.34 C14.
`fillHeight` (`:240-257`) makes the table a flex column that takes its parent's room
(`:1388`), the body the only scroller under a pinned header (`:1592-1609`). The wiring
above it is each app's own; the prop's note names kastlan's classes (`:276-282`).
**Round 0.40 (uncommitted):** below `md`, the card list scrolls itself only while its
parent bounds it — measured, `scrollHeight > clientHeight` (`:1213-1235`, `:1481-1482`);
under AppShell's phone layout it stays in the page's flow and the page scrolls. So
`fillHeight` is safe at every width, and `fillHeight={useBreakpoint("md")}` is no longer
needed.

**ka** — every list page fills. The shell's content column becomes a flex column of the
main area's height when a child page asks: `app-layout.tsx:141`
`md:has-[>[data-fill-height]]:flex …:h-full …:flex-col` (comment `:136-140`). 20 page roots
carry `data-fill-height className="md:flex md:min-h-0 md:flex-1 md:flex-col"` and pass
`fillHeight`: `resource-list-page.tsx:218/:222` (the CRUD scaffold behind 4 pages:
`contact-list-page.tsx:40`, `insurance-page.tsx:21`, `meters-page.tsx:26`,
`mortgage-page.tsx:22`) and 19 named pages (§1.4). Not filled: 2 list pages
(`handover-list-page.tsx:46`, `platform-signup-invitations-page.tsx:138`) and 7 embedded
tables.

**KS** — one page fills: `features/feedback/feedback-page.tsx:166`
`cn(PAGE_SHELL, "md:h-full md:min-h-0")`, `fillHeight` at `:216`. No shell wiring:
`<Outlet />` is `<main>`'s child through the kit ErrorBoundary, which renders no element
(`app/layout.tsx:97-103`; kit `error-boundary.tsx:544`). The sessions / curves list
(`setpoint/sessions-page.tsx:168`, table `:204`) keeps the cap.

**kk** — one page fills, from `md` only: `features/feedback/feedback-page.tsx:203`
`md:flex md:flex-col md:h-full md:min-h-0`, `fillHeight={fillsPage}` at `:218` with
`fillsPage = useBreakpoint("md")` (`:164-168`, the workaround for live #420 that 0.40 makes
unnecessary). No shell wiring (`app/layout.tsx:158-161`). Accounts, payees and
transactions keep the cap.

**A defect in all three (read from the code, not tried):** the fill uses `h-full`
(100 % of `<main>`), but the shell's banners are `<main>`'s children too, above the page:
ka's demo, tour, billing and verify banners (`app-layout.tsx:122-135`, beside the `:141`
column), KS's demo, verify, deletion and billing strips (`app/layout.tsx:60-87`), kk's
guest-key banner and what's-new notice (`app/layout.tsx:141`, `:147`). With one showing,
the page is the banner's height taller than `<main>`, and `<main>` scrolls by that much:
the two scrollbars again, small. A flex column on `<main>` itself (§1.3) ends it.

### 1.2 The rule

**Rec:** a page **fills** when all four hold; otherwise it keeps the cap.

1. **It is a route of its own** — not a tab, a detail page's section, a settings or admin
   section, a dialog or a sheet.
2. **It has one DataTable**, and that table is the page's point (the list the page is
   named for).
3. **Nothing of the page's own content follows the table.** Dialogs, sheets, toasts and
   floating bars do not count; a detail pane, a chart, a second card do.
4. **What sits above it is a header:** the title and its actions, a toolbar or search,
   filter chips, a notice or banner, an inline create form, at most one row of stat tiles
   or one summary card.

The test an app applies page by page: *"If the table were twice as long, would I want
only its rows to scroll, with everything above it held still?"* Yes for a list page; no
when anything below the table would then be out of reach.

**The phone (below `md`): never a fill.** The page scrolls as one, the card list in its
flow; the header scrolls away. This is what 0.40's DataTable does on its own under
AppShell, so a page passes `fillHeight` unconditionally and does nothing per width.

**Keeps the cap:** reports and their tables (kk's price book, aggregated tables), detail
pages and their tabs (ka's estate detail, KS's gear tabs with a detail pane below),
settings and admin sections (the user lists: SettingsLayout owns that page), dialogs.
A short table last on such a page may use `maxBodyHeight="none"` (the prop's note).

**Empty and loading:** a page that shows a LoadingState or an EmptyState in place of the
table does not fill then; §1.3's wiring keys off the table, so that is automatic.

### 1.3 The kit owns the wiring

**Rec:** the wiring moves into the kit; the apps keep only the page's own padding.

1. **DataTable** marks itself: under `fillHeight` its root carries `data-fill-height=""`
   (`data-table.tsx:1388`), at every width.
2. **AppShell's `<main>`** becomes a flex column from `md` up while it holds a filling
   table: `md:has-[[data-fill-height]]:flex md:has-[[data-fill-height]]:flex-col`
   (`app-shell.tsx:539`). The banners then take their own height, the page the rest. No
   prop: a page asks by passing `fillHeight`, as kastlan's pages ask today.
3. **`FillHeight`**, a new wrapper in `src/shell/fill-height.tsx`, exported from
   `@eifi1/ui-kit/shell` and the main barrel:

   ```tsx
   export const FILL_HEIGHT_CLASS =
     "md:has-[[data-fill-height]]:flex md:has-[[data-fill-height]]:min-h-0 " +
     "md:has-[[data-fill-height]]:flex-1 md:has-[[data-fill-height]]:flex-col";
   export type FillHeightProps = ComponentPropsWithRef<"div">;
   /** A wrapper between AppShell's <main> and a `fillHeight` DataTable: from md, a
    *  flex column that takes the rest of its parent — only while such a table is
    *  inside. Below md, and around anything else, a plain div. */
   export function FillHeight({ className, ...props }: FillHeightProps): JSX.Element;
   ```

   Every element between `<main>` and the table is a `FillHeight` (the page's root, and
   any wrapper on the way: kk's `id` holder, ka's shell column). `FILL_HEIGHT_CLASS` is
   for a wrapper that is another component or needs other classes merged. Conditional on
   the table being inside, so a shell column can carry it for every route.
4. DataTable's `fillHeight` and `maxBodyHeight` notes (`data-table.tsx:240-287`) point here
   instead of naming kastlan's classes; a showcase example: a list page in an AppShell,
   one banner on, the body the only scroller.

**What the apps delete:** ka's `md:has-[>[data-fill-height]]:…` column (`app-layout.tsx:141`
→ `FILL_HEIGHT_CLASS`), its 20 `data-fill-height className="md:flex md:min-h-0 md:flex-1
md:flex-col"` roots (→ `<FillHeight>`); KS's `"md:h-full md:min-h-0"`; kk's
`md:flex md:flex-col md:h-full md:min-h-0` and `fillsPage`.

Not chosen: an AppShell prop (`fillContent`) set per route — the app would mirror the
route table in the shell; a `ListPage` page component with a header slot — the three
apps' headers, paddings and toolbars differ, and the wrapper is all they share.

### 1.4 Per app: the checklist

Marcel reviews each page after the adoption: on a wide window the header holds still and
only the rows scroll (with a banner showing, too); on a phone the page scrolls as one.

**kastlan** (`frontend/src/…`; 25 fill — 23 rewired, 2 new; 9 cap, unchanged)

- [ ] `app/app-layout.tsx:141` shell column: `md:has-[>[data-fill-height]]:…` → `cn("p-4 md:p-6", FILL_HEIGHT_CLASS)`.
- [ ] `shared/components/data-table/resource-list-page.tsx:218` → `<FillHeight>`; covers:
  - [ ] contacts `features/contacts/pages/contact-list-page.tsx:40`
  - [ ] insurance `features/insurance/pages/insurance-page.tsx:21`
  - [ ] meters `features/meters/pages/meters-page.tsx:26`
  - [ ] mortgages `features/mortgages/pages/mortgage-page.tsx:22`
- [ ] Fill today, root → `<FillHeight>` (keep `space-y-6` where it is), `fillHeight` stays (`features/…`):
  - [ ] `accounting/pages/account-ledger-page.tsx:102` (stat tiles above)
  - [ ] `accounting/pages/journal-entries-page.tsx:33`
  - [ ] `accounting/pages/trial-balance-page.tsx:165`
  - [ ] `budgets/pages/budgets-page.tsx:48`
  - [ ] `deposits/pages/deposit-list-page.tsx:30`
  - [ ] `documents/pages/document-list-page.tsx:52`
  - [ ] `feedback/pages/feedback-page.tsx:124`
  - [ ] `finance/pages/dunning-list-page.tsx:183`
  - [ ] `finance/pages/invoice-list-page.tsx:146` (four stat tiles above)
  - [ ] `finance/pages/payment-list-page.tsx:91`
  - [ ] `maintenance/pages/maintenance-list-page.tsx:33`
  - [ ] `owner-meetings/pages/meeting-list-page.tsx:97`
  - [ ] `owners/pages/owners-page.tsx:124`
  - [ ] `platform/pages/platform-companies-page.tsx:156`
  - [ ] `property/pages/building-list-page.tsx:139`
  - [ ] `property/pages/estate-list-page.tsx:73`
  - [ ] `property/pages/unit-list-page.tsx:121`
  - [ ] `service-charges/pages/service-charges-list-page.tsx:76`
  - [ ] `tenancy/pages/lease-list-page.tsx:57`
- [ ] New fill:
  - [ ] `handover/pages/handover-list-page.tsx:46` root → `<FillHeight>`, `fillHeight` on `:61`.
  - [ ] `platform/pages/platform-signup-invitations-page.tsx:138` root (`space-y-6`) → `<FillHeight>`, `fillHeight` on `:185` (the invite form above is a header).
- Cap, no change: `property/pages/estate-detail-page.tsx:282`, `property/components/unit-leases-tab.tsx:33`,
  `service-charges/components/service-charges-costs-tab.tsx:131`, `…-distribution-tab.tsx:195`,
  `service-charges/components/settlement-table.tsx:84`, `communication/components/sent-emails-section.tsx:108`,
  `settings/components/users-panel.tsx:388` (admin `settings/pages/admin-page.tsx:67`, and
  `platform/pages/platform-users-page.tsx:47`: a card shared with the admin page).

**Kurvenschmiede** (`frontend/src/…`; 3 fill — 1 rewired, 2 new routes; 5 cap)

- [ ] feedback `features/feedback/feedback-page.tsx:166` → `<FillHeight className={PAGE_SHELL}>`, drop `"md:h-full md:min-h-0"` (the header keeps `shrink-0`, `:167`); `fillHeight` stays (`:216`).
- [ ] sessions and curves `features/setpoint/sessions-page.tsx:168` → `<FillHeight className={PAGE_SHELL}>`, `fillHeight` on `:204`. One component, two routes (`app/routes.tsx:457` `/curves`, `:474`): check both.
- Cap, no change: the gear tabs (a hint row above, a detail or candidates below):
  `features/gear/assemblies-tab.tsx:221`, `transmissions-tab.tsx:167`, `hystereses-tab.tsx:226`,
  `kinematics-tab.tsx:202`; admin `features/admin/users-panel.tsx:518` (a SettingsSection).

**keksdose** (`frontend/src/…`; 4 fill — 1 rewired, 3 new; 6 cap)

- [ ] feedback `features/feedback/feedback-page.tsx:203` → `<FillHeight className="py-4 md:p-6">`; delete `fillsPage` and its comment (`:164-168`), `fillHeight` plain at `:218`.
- [ ] accounts `features/accounts/accounts-page.tsx:626` → `<FillHeight className="py-4 md:p-6">`; the `id` wrapper `:769` → `<FillHeight id={accountListId}>`; `fillHeight` on `:770`.
- [ ] payees `features/payees/payees-page.tsx:70` → `<FillHeight className="py-4 md:p-6">`; `fillHeight` on `:147`.
- [ ] transactions `features/transactions/transactions-page.tsx:516` → `<FillHeight className="py-4 md:p-6">`; the desktop wrapper `:841` `hidden md:block` → `cn("hidden", FILL_HEIGHT_CLASS)`; `fillHeight` on `:846`. The phone list is `MobileTransactionList` (`:745`), unchanged.
- Cap, no change: admin `features/admin/users-panel.tsx:888` (`admin-page.tsx:1036`); reports
  `features/reports/price-book-table.tsx:173`, `price-pool-panel.tsx:248`,
  `tables/aggregated-table.tsx:196`, `tabs/price-history-tab.tsx:503`; invoice lines
  `features/invoices/invoice-lines-table.tsx:1714`.

### 1.5 What ui-kit 0.40 ships

Size **S**: `FillHeight` + `FILL_HEIGHT_CLASS` (`src/shell/fill-height.tsx`, both barrels);
`data-fill-height` on DataTable's root under `fillHeight`; the two `has-` classes on
AppShell's `<main>`; the props' notes; a showcase example; tests (the marker present only
under `fillHeight`; `<main>`'s classes; `FillHeight` merges `className` and forwards
`ref`). The phone half is already built (§1.1). Nothing breaks on the bump: ka's
`:141` column still works inside a flex `<main>` (with today's banner overflow) until it
switches.

### 1.6 Per-app steps

1. Bump to `^0.40.0`.
2. Work §1.4's list: the shell column (ka only), each page root, each inner wrapper, each
   `fillHeight`.
3. Grep: no `data-fill-height` and no `md:h-full` page root left in the app; kk: no
   `useBreakpoint("md")` feeding `fillHeight`.
4. Look at each page as §1.4 says, once with a banner showing (a demo session shows one in
   every app).

### 1.7 For the reviews

1. **All:** the rule (§1.2) — does any page of yours fall on the wrong side of it?
2. **All:** a minimum body height under the fill? On a short window ka's invoices (four
   stat tiles) or kk's accounts (create form, totals card) leave few rows; the kit could
   give the body a floor (e.g. `min-h-48`) past which `<main>` scrolls again. **Rec:** no
   floor in 0.40; add one if a page shows the need.
3. **ka:** the two new fills (handover, sign-up invitations), and the platform user list
   staying capped because its card is shared with the admin page — agreed?
4. **KS:** sessions / curves fill, the gear tabs keep the cap — agreed?
5. **kk:** transactions on a wide screen fill while the inline create form (`:693`) is open
   above, so the rows' room shrinks while it is open — acceptable, or cap while it shows?
