# Adopting `@eifi1/ui-kit` 0.50

ui-kit 0.50 is the form-tour round plus a handful of smaller items. This guide lists, per
change, what each app does, with the places found in keksdose, kastlan and Kurvenschmiede on
2026-10-22 (`frontend/src`; line numbers at that date). The form tours have their own section,
written with that work.

**server-kit: no change.** Pin `@eifi1/ui-kit` `^0.50` beside the `eifi1-server-kit` 0.19.0
wheel, as for 0.49.

**Restart the Vite dev server after the bump.** Vite pre-bundles dependencies into
`node_modules/.vite/deps` and keeps serving that copy while the dev server runs, so after
`npm install` of a new kit the open dev server still runs the OLD kit (no error; the new
props simply do nothing). Stop it and start it again; if a change still does not show, start
it once with `vite --force` (or delete `node_modules/.vite`). Tests and `vite build` are not
affected.

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

## `AmountInput` and `NumberInput` keep `data-*` (keksdose)

Additive. `data-tour`, `data-testid` and any other `data-*` prop now reach the field's root, as on
`Input`, `Select`, `Combobox`, `DatePicker`, `IbanInput` and `Checkbox`. Before, both dropped them
without a type error (TypeScript does not check hyphenated JSX attributes), so a tour step anchored
on one silently fell back to the centre. `AmountInput`'s root is its `w-full` box; a bare
`NumberInput` gains a plain root `div` only when it is given a `data-*` prop.

| App | What changes on a bump | Steps |
|---|---|---|
| keksdose | Nothing breaks. Its `w-full` wrappers around AmountInput / NumberInput (holding quantity, goal amount, loan rate, asset worth, the transfer `AmountRow`) exist only to carry `data-tour`. | Optional: move `data-tour` onto the field and drop the wrapper. |
| kastlan | Nothing. | — |
| Kurvenschmiede | Nothing. | — |

## `CurrencySelect` locks like `Select` (keksdose)

Additive. `CurrencySelect` takes `Select`'s lock props: `disabled`, `disabledReason`,
`disabledReasonDisplay` and `commit` (so a locked `WriteLockProvider` locks it too, with the
lock's reason winning over its own). It behaves as `Select` does:

- With a reason the trigger is `aria-disabled`, never the `disabled` attribute, so it stays
  in the tab order. It keeps its flag and code, wears the settled look of a disabled field,
  drops its chevron, and does not open. `onChange` is not called.
- The reason is the trigger's accessible description (after a text `hint`, before an
  `error`). It shows as a line under the field at Large and on a touch screen, and in the kit
  Tooltip otherwise (`disabledReasonDisplay` overrides this).
- `disabled` with no reason is the native kind (out of the tab order), as on `Select`. A
  reason wins over `disabled`.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/reports/budget-currency-field.tsx`: while locked (viewer, guest, offline), loading or converting, it renders a one-option `Select` with `disabledReason` instead of the `CurrencySelect`. | Drop the swap. Render the one `CurrencySelect` with `disabled={!active \|\| change.isPending}` and `disabledReason={lockedReason ?? undefined}` (keep `data-tour`, `label`, `className`), and update the doc comment's "no disabled state" note. In `__tests__/budget-currency-field.test.tsx`, `lockedSelect()` expects a `SELECT`: it now finds the `BUTTON` trigger (the one `picker()` finds) with `aria-disabled="true"`, and `toHaveValue("EUR")` becomes `toHaveAccessibleName(/EUR/)` (the trigger's name is "label: code"). |
| kastlan | No `CurrencySelect`. | Nothing. |
| Kurvenschmiede | No `CurrencySelect`. | Nothing. |

## kastlan K1: `EmailVerificationBanner` takes `actionPlacement`

`actionPlacement?: "own-line" | "flow"` is passed through to the banner's `AlertBanner` (0.48):
with `variant="box"`, `"flow"` keeps "Send again" on the message's line while the message keeps
10rem, else at the end of the next line, instead of a line of its own on a phone. Works with
`clampMobile` (the resend's outcome stays after the button, in the same row). Default
`"own-line"`: no change on a bump.

**The `strip` variant (the default) ignores it**, as `AlertBanner` does: a strip already flows,
its message keeping 12rem before the action wraps. So the prop only moves a `box` banner.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/auth/verify-email-banner.tsx:28`, the strip at the top of the shell. | Nothing. |
| kastlan | `features/auth/components/verify-email-banner.tsx:20`: no `variant`, so the **strip**, with `clampMobile`. The K1 report ("Send again keeps its own line", banner ≤ 56px on 390 × 844, KX-5) is the strip's 12rem rule, which `actionPlacement` does not change. | To use it: `variant="box" actionPlacement="flow"` (keeps `clampMobile`), then measure at 390 × 844. If the strip should stay, say so in the 0.50 adoption: the strip's 12rem basis would be a kit change of its own. |
| Kurvenschmiede | `app/layout.tsx:79`, the strip. | Nothing. |

## kastlan K2: the user roster fits by default (`grow` / `fitPriority`)

`useUserRosterColumns` / `userRosterColumns` now set what kastlan mapped by hand (its
`ROSTER_FIT`): **Name `grow`** (takes the rest of the row, ellipsises at Normal, keeps 10rem
before the table scrolls), **Created `fitPriority: 1`**, **Last login `fitPriority: 2`** — a table
narrower than its columns leaves out Created, then Last login (the Columns button counts them),
as the kit's feedback columns have since 0.48. The 0.48 rules hold: the role and state chip rows
still wrap in their cells (kastlan S1), the other cells keep one line at Normal (`not-large:whitespace-nowrap`).
The phone card is unchanged.

BREAKING (layout only, on a bump): every roster becomes a fitting table. To keep the 0.49
layout: `columns.map((c) => ({ ...c, grow: undefined, fitPriority: undefined }))`. An `extra`
column joins with a `fitPriority` of its own; one `grow` per table (the first one wins).

| App | Where | Steps |
|---|---|---|
| keksdose | `features/admin/users-panel.tsx:804` (`useUserRosterColumns`), the `name` cell replaced at `:818–826` with `className="md:max-w-[14rem]"` (`:826`) on `UserIdentityCell`. | Keep `...column` in the replacement (it does): Name then grows. The `md:max-w-[14rem]` cap leaves Name at 14rem inside a growing cell — drop it so the name and address use the room, or keep it on purpose. Check the admin page at 1280px. |
| kastlan | `features/settings/components/users-panel.tsx:81–85` `ROSTER_FIT` (the same values), applied at `:382`. | Delete `ROSTER_FIT` and the `map` at `:381–384` (the kit's columns carry it). The extra columns (`companies`, `reviews`, `:350–375`) stay without a priority unless you want them to leave too. |
| Kurvenschmiede | `features/admin/users-panel.tsx:418`; the admin page widened its area to `7xl` for the roster (`features/admin/admin-page.tsx:87`, the comment above it). | On the bump the roster fits; check whether the `7xl` widening is still needed (1280px and 1100px). The extra columns (`planColumn`, `owned`) can take a `fitPriority` (e.g. 3) if the roster should give them up before Name reaches 10rem. |

## kastlan K4: a tel: / mailto: field on a card that still opens the row

**Built (option A of the 2026-10-22 options, Marcel's choice): the stretched title.** A
default phone card (no `mobileCard`) that draws a cell keeping its own clicks — a `noRowLink`
column (a tel: / mailto: link), or the row's actions (`role: "actions"`, `rowActionsColumn`)
— keeps opening the row:

- The card is a plain box. Its **title** is the control: the row's `<a href>` with `rowHref`,
  a `<button>` with only `onRowClick`. The control's `::after` covers the whole card, so a tap
  anywhere on it (a field, the chevron, the padding) opens the row, and a long press on it is
  the link's own ("open in new tab").
- The own-click cells are drawn above that overlay and take their own taps: a lifted field
  is only as wide as its content (a tap beside the link still opens the row); the actions
  keep their buttons, and "⋯" at Large.
- No control nests in another; Tab goes title → the fields' links → the actions, in reading
  order. The keyboard frame is the card's (the kit's ring, inside the card) while the title
  has the focus.
- `aria-expanded`, Space (on the link), the long press into selection mode, the swipe and
  `mobileDetailsInRow` work as before. In selection mode the card is the toggle, as on every
  card.
- **The trade-off:** the control's accessible name is the **title alone**; the fields read
  as text after it. A test that finds such a card by its whole text
  (`getByRole("button", { name: /Ada.*Example AG/ })`) finds it by the title now
  (`getByRole("button", { name: "Ada Example" })`, or `"link"` with `rowHref`).
- Unchanged: a card **without** own-click cells (still the one link, or the one
  `role="button"`, named by its whole text); a `mobileCard` renderer and a card whose title
  column is itself `noRowLink` (both keep the 0.49 fallback, `div role="button"`); the
  desktop table.

The 0.49 test "the card is no link" (`data-table-phone-card-049.test.tsx`) now pins one link,
the title's, outside the actions; `data-table-phone-card-stretched-050.test.tsx` has the rest.
Showcase: "Data table: server, URL & phone" → "A contact card: own links, and tap to open".

A phone number in an RTL page needs `dir="ltr"` on its link (or `<bdi>`), or "+41 44…" is
drawn as "…44 41+"; the kit does not touch the cell's content.

| App | Where | Steps |
|---|---|---|
| keksdose | `rowHref` only on the feedback inbox (`features/feedback/feedback-page.tsx`). | Nothing: the kit's feedback inbox and public list draw a `mobileCard` (and the inbox's `url` column is `mobileHidden`), so their cards do not change. A default card with a `noRowLink` or actions column, if one is added later, becomes the stretched card. |
| kastlan | `features/contacts/components/contact-columns.tsx:50–62` (email, phone, text today), lists through `shared/components/data-table/resource-list-page.tsx:239` (`onRowClick`). | Render the links in the cells (`<a href={`tel:${phone}`} dir="ltr">`, `<a href={`mailto:${email}`}>`) and mark both columns `noRowLink: true`: the contact card keeps "tap to open" (the title becomes its button) and the links take their own taps. Check at 390px, LTR and RTL, Normal and Large. Phone tests that find a contact card by its whole text: by the name now. |
| Kurvenschmiede | `rowHref` on `features/setpoint/sessions-page.tsx` and the feedback inbox. | Nothing, unless the sessions page's phone card draws a `noRowLink` or `rowActionsColumn` column: then it becomes the stretched card (a phone test that finds the card by its whole text finds it by the title). The feedback inbox as keksdose's. |
