# Adopting `@eifi1/ui-kit` 0.50

ui-kit 0.50 is the form-tour round plus a handful of smaller items. This guide lists, per
change, what each app does, with the places found in keksdose, kastlan and Kurvenschmiede on
2026-10-22 (`frontend/src`; line numbers at that date). The form tours have their own section,
written with that work.

**server-kit: no change.** Pin `@eifi1/ui-kit` `^0.50` beside the `eifi1-server-kit` 0.19.0
wheel, as for 0.49.

## `@eifi1/ui-kit/testing/react`: `rowMenuAction` opens a row's "⋯"

New entry, for an app's own tests: `rowMenuAction(row, action, labels?)` opens the row's "⋯"
(the button "Actions for `<row>`"; with `row` `undefined`, the first "⋯" on the page, named
or a plain "Actions") and returns the action's entry **unclicked**, so a test can check it
(locked, described) before it clicks. It is keksdose's `test/row-menu.ts`, with one addition:
a third argument `{ actions, actionsFor }` for a suite that renders translated kit labels
(the defaults are the kit's English ones, which most test setups render).

```ts
import { rowMenuAction } from "@eifi1/ui-kit/testing/react";

fireEvent.click(await rowMenuAction("Ada Example", "Delete"));
fireEvent.click(await screen.findByRole("button", { name: "Confirm" })); // the KIT-12 question
```

- **The entries are buttons in a dialog popover, not menu items.** `getByRole("menuitem")`
  finds nothing; the popover is a `dialog` named like the "⋯" button, and each entry is a
  `button` (Kurvenschmiede's 0.49 note). The helper does that lookup.
- A sibling of `@eifi1/ui-kit/testing`, not part of it: `/testing` stays pure (it reaches no
  package), `/testing/react` imports `@testing-library/react`, now an **optional peer**
  (`>=16`) that only a test suite needs. All three apps have it as a devDependency already.
  Neither entry is in the barrel, so no production bundle carries Testing Library.

| App | Where | Steps |
|---|---|---|
| keksdose | Its own helper `test/row-menu.ts:9`, used by 8 test files (`features/rules/__tests__/rules-page.test.tsx:445`, `features/budgets/__tests__/budgets-page.test.tsx:406`, `:451`, `features/accounts/__tests__/loan-payment-panel.test.tsx:283`, `asset-loan-panel.test.tsx:265`, `:272`, `:297`, and `holdings-panel`, `accounts-page`, `admin/admin-page`, `admin/support-panel-canned` tests). | Optional: import `rowMenuAction` from `@eifi1/ui-kit/testing/react` instead and delete `test/row-menu.ts`. Same signature and result; drop-in. |
| kastlan | No test opens a row's "⋯" by name today. | Nothing required; use the helper for the next one. |
| Kurvenschmiede | Its own `openActions(name)` in `features/admin/admin-page.test.tsx:196`; inline "Actions for …" clicks in `features/setpoint/segment-cards.test.tsx:99`, `features/setpoint/pages.test.tsx:505`, `features/teams/teams-page.test.tsx:95`, `:136`, `features/projects/projects-page.test.tsx:39`, `:62`, `:80`. | Optional: `rowMenuAction(name, action)` replaces the open-then-find pair. `pages.test.tsx:505` scopes the button `within(chip)`; keep that one as it is. |

## KIT-1 follow-up: an app's own number wrappers, and `formatWithMinus`

Found on the 0.49 adoption (keksdose): the kit's formatters print "−" (U+2212), but an app's
OWN `Intl.NumberFormat` wrapper still writes `Intl`'s hyphen, so one cell read
"-€150.00 (−13.0%)". **Check every number wrapper your app keeps**, and either

- route it through `formatMoney` / `formatNumber` / `formatPercent` (the usual case: the
  wrapper only picks a locale and digits, which those take as options), or
- where it needs its own `Intl.NumberFormat` (options the kit's formatters do not take),
  call `formatWithMinus(formatter, value, minus?)` instead of `formatter.format(value)`.
  **New export** (main barrel, 0.50): the kit's own helper, the one every kit formatter and
  chart uses; `"ascii"` as the third argument for text a machine reads back.

A wrapper that pulls the sign out and formats the magnitude (`Math.abs`) needs nothing, and a
string that goes into a parser (KaTeX, a CSV) keeps the hyphen (`minus: "ascii"`).

| App | Where | Steps |
|---|---|---|
| keksdose | Done in the 0.49 bump (f9e8f387): `formatCurrency` (`shared/components/ui.tsx:313`), `formatBareAmount` (`:306`) and `formatQuantity` (`:288`) call the kit. Left: the `catch` fallback `${n.toFixed(2)} ${currency}` at `ui.tsx:337` (only for an unknown currency code). `features/transactions/transaction-cells.tsx:298` formats the magnitude through `shared/lib/intl-cache.ts:40` `numberFormat` — no sign, nothing to do. | Optional: the fallback at `ui.tsx:337` as `formatNumber(n, { digits: 2 })` + the code. |
| kastlan | The wrappers `shared/utils/formatters.ts:26` (`formatNumber`) and `:50` (`formatCurrency`) call the kit already. `features/dashboard/components/revenue-chart.tsx:56–59` (`abbreviateTick`) builds "-1.2M" / "-5k" with `toFixed`, a hyphen on a negative tick. | Optional: `abbreviateTick` through `formatNumber(value, { options: { notation: "compact" } })` (the kit's compact notation already carries "−"). |
| Kurvenschmiede | `features/dynamics/exercise.tsx:32` `formatSig` (its own `Intl.NumberFormat`, significant digits) prints the exercises' inputs and answers into `t()` text (`:74`, `:75`, `:140`, `:174`); answers can be negative. `features/landing/landing-visuals.tsx:190–191` formats positive constants only. | `formatSig`: `return formatWithMinus(new Intl.NumberFormat(…), value)` — plain text, not TeX (`tex.tsx` keeps its own sign handling from 0.49). |
