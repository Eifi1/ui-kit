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
