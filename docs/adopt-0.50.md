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
| Kurvenschmiede | `features/dynamics/exercise.tsx:32` `formatSig` (its own `Intl.NumberFormat`, significant digits) prints the exercises' inputs and answers (`:74`, `:75`) and the estimate and its deviation (`:140`, `:174–175`) into `t()` text; answers can be negative. `features/landing/landing-visuals.tsx:190–191` formats positive constants only. | **In the bump:** `formatSig`: `return formatWithMinus(new Intl.NumberFormat(…), value)` — plain text, not TeX (`tex.tsx` keeps its own sign handling from 0.49). It prints the estimate and its deviation too (`:140`, `:174–175`), so today a page shows the kit's "−" beside its own hyphen. `parseEntry` (`:38`) already reads a leading "−", so a figure copied back still parses. |

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

**An app's list-like `extra` column can make the roster WIDER than on 0.49** (Kurvenschmiede
S1). Beside the `grow` column every other cell keeps one line at Normal (the grow-peer rule,
`GROW_PEER_CELL_CLASS`), so a column holding a list — counts joined by " · ", e.g. "7
sessions · 2 gears · 6 transmissions · …" — no longer wraps: it becomes the widest column,
and the fit leaves out Created and Last login while the table still scrolls. The opt-out is
`className: "not-large:whitespace-normal"` on that column (it wraps as before), optionally
with a `fitPriority` so it leaves before Name reaches 10rem. Check every `extra` column of
your roster for this.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/admin/users-panel.tsx:806` (`useUserRosterColumns`), the `name` cell replaced from `:820` with `className="md:max-w-[14rem]"` (`:828`) on `UserIdentityCell`. | Keep `...column` in the replacement (it does): Name then grows. The `md:max-w-[14rem]` cap leaves Name at 14rem inside a growing cell — drop it so the name and address use the room, or keep it on purpose. Check the admin page at 1280px. |
| kastlan | `features/settings/components/users-panel.tsx:81–85` `ROSTER_FIT` (the same values), applied at `:382`. | Delete `ROSTER_FIT` and the `map` at `:381–384` (the kit's columns carry it). The extra columns (`companies`, `reviews`, `:350–375`) stay without a priority unless you want them to leave too. |
| Kurvenschmiede | `features/admin/users-panel.tsx:418`; the `extra` column `owned` (`:442–446`, `<OwnedSummary>`: "7 sessions · 2 gears · 6 transmissions · …"); the admin page widened its area to `7xl` for the roster (`features/admin/admin-page.tsx:87`, the comment above it). | On the bump the kit's columns fit, but `owned` is one line beside Name's `grow` and keeps the table scrolling. Measured on `/admin/users` (sidebar open, Normal, three seed accounts): 0.49 at 1280px, table 975px in a 631px scroller, 9/9 columns, Name 207px, Owns 100px; 0.50, table **1112px** in the same 631px, "Columns (7/9)" (Created and Last login left out), Name 160px (its 10rem floor), **Owns 511px** — the same table width at 1100, 1440 and 1920px. **Give `owned` `className: "not-large:whitespace-normal"`** so the summary wraps as before, **and** `fitPriority` on the extra columns above the kit's own (Created is 1, Last login 2; on a tie the later column leaves first) — Reviews 3, Plan 4, Owns 5 — or it still scrolls at 1280 (701px in 631, +70) and 1100 (+250): Measured on the adoption (2026-10-23, sidebar open): it then fits with no sideways scroll at 1100 (4/9), 1280 (6/9), 1440 (7/9) and 1920 (8/9). Keep `7xl`: at 1920 it shows Last login again (8/9 against 6xl's 7/9). |

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
| kastlan | `features/contacts/components/contact-columns.tsx:50–62` (email, phone, text today), lists through `shared/components/data-table/resource-list-page.tsx:239` (`onRowClick`). | Render the links in the cells (`<a href={`tel:${phone}`} dir="ltr">`, `<a href={`mailto:${email}`}>`) and mark both columns `noRowLink: true`: the contact card keeps "tap to open" (the title becomes its button) and the links take their own taps. **A link only for a value; an empty cell still returns `EMPTY_VALUE`**: `row.phone ? <a href={`tel:${row.phone}`} dir="ltr">{formatPhone(row.phone)}</a> : EMPTY_VALUE` (and so for the email). Since #23 email and phone are the card's `mobile: "secondary"` fields, and the card drops a field that reads "—"; an empty `<a>` is not that, so it would stay on the card. Check at 390px, LTR and RTL, Normal and Large. Phone tests that find a contact card by its whole text: by the name now. |
| Kurvenschmiede | `rowHref` on `features/setpoint/sessions-page.tsx` and the feedback inbox. Since 0.49 the bin (`deleteColumn`, `role: "actions"`, `shared/lib/table-columns.tsx:80`) is on every default card: the steering and generic sessions lists and the four gear tabs. | Nothing. The bin makes each of those cards a stretched card: a tap on the card opens the row (the title is the link with `rowHref`, e.g. `/steering/curves`; a button with `onRowClick` only, e.g. `/steering/transmissions`, which selects the row), and the bin keeps its own question. Checked at 390px on touch on 0.50; no KS test finds a card by its whole text. The feedback inbox as keksdose's. |

## Guided form tours (keksdose round 054)

A tour can now walk a person through a real form and end in a saved record
(docs/tours-harmonization.md §11; the contract is `audits/round-054/tour-contract.md`). All
additive; a 0.49 tour runs unchanged except for two visible fixes, below.

**The form's side, one line per field:**

```tsx
import { TourGuideButton, useTourGate, useTourGateRelease } from "@eifi1/ui-kit";

useTourGate(mode === "create" ? "txn.amount" : null, amount !== "");   // beside each field
useTourGate("txn.transfer", entryMode === "transfer");                 // a fact for `when`
const gates = useTourGateRelease();
create.mutate(data, {
  onSuccess: () => gates.release("txn.saved"),
  onError: (e) => gates.refuse("txn.saved", errorText(e)),
});
<TourGuideButton tour="create-transaction" at="txn-entry-mode" />     // the form's "Guide me"
```

**The tour's side:** `gate: "txn.amount"` (Next locked until filled), `optional: true` ("Leave
empty"), `when: (c) => c.gate("txn.transfer") === true`, `awaitGate: "txn.saved"` on Save
(advances only on `release`; `refuse` shows the reason and offers "Back to …"). `beforeStep`
gets `ctx.via`: an in-form step that opens the form leaves it alone when `via === "at"`. Give
`TourProvider` the app's launcher as `launch` (the function `useTourUrlSync` already takes,
plus `at`), so `start(id, { at })` and `TourGuideButton` work. The provider calls it as
`launch(id, opts, start)` with its own `start` (keksdose N4), and `useTourUrlSync` does the
same, so the launcher needs no ref and may sit above the provider:
`launch={(id, { at, startIndex }, start) => start(build(id), { id, at, startIndex, … })}`. A
two-argument launcher keeps working. A "Guide me" run counts and
awards points like a full run.

**What changes for 0.49 tours (on the bump, no code):**

- **Field steps over a sheet are visible now.** An `interactive`, `awaitInput`, `gate` or
  `awaitGate` step inside a kit layer (a phone's `FullBleedDialog`) shows its card and ring
  above that layer; inside a full-screen one with no scrim, only the ring. 0.49 painted them
  under the sheet (`z-[45]`). The overlay is `z-50` in its own container now; a test that
  asserted `z-[45]` asserts `z-50` (the kit's own did).
- **On a phone, field steps dock** (Marcel's Q1): a field step with no `placement` pins its
  card to the top or bottom edge, clear of the field, keyboard and number pad.
  `TourProvider dockOnPhones={false}` keeps 0.49's placement; `placement: "dock"` opts any
  step in.
- **A field step's ring frames the field's own lines** (keksdose S1): the lines its
  `aria-describedby` names that sit right under (or over) the field are inside the frame,
  not crossed by it. An app line outside the `data-tour` box joins once the field names it
  in `aria-describedby` (§11.6.6).
- On an `awaitInput` step the field takes focus on arrival with a mouse (the card on touch),
  and Tab cycles field and card.
- Escape from the card skips the tour without also closing the sheet under it.
- An app's own body-level overlay that holds tour targets adds `data-kit-layer`; its own
  bottom layers (a custom pad) add `data-tour-obstruction`.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/tour/tours.tsx:91-92` (`guidedFields = !usePhoneLayout()`) and `tour-types.ts:179`; the nine create tours that read it — `create-account` and `create-transaction` (tours.tsx), `transfers-splits`, `budget-goals`, `sharing-a-budget`, `loans-assets`, `rules-automation`, `recurring-money`, `depot-investing` (feature-tours.tsx). | **Drop `guidedFields`** (the layer rule makes field steps work in the phone sheet). Per field step: `gate: g("…")` instead of `interactive`/`awaitInput`, `optional` where the field may stay empty (the account: an empty account books to cash), `when` on the branch facts; `useTourGate` beside each field, create mode only (`transaction-fields.tsx`, `transaction-transfer-form.tsx`, …). `awaitGate` on the saves that complete what a guide creates: transaction and transfer Create (`txn-create`, feature-tours.tsx:548, :851; tours.tsx's), recurring Create, account Create, rule Save and goal Save, each with `release`/`refuse` in its mutation's onSuccess/onError — `transaction-create-card.tsx:353` has an `onSuccess` (`keepOpen` included); `:380` is `transfer.mutate(data)` with no callbacks yet, so add `onSuccess`/`onError` there. These four stay Next by design: Depot Buy, the loan's rate Create and "Record value" (those tours explain more than they create; no tour makes spending the condition to go on), and sharing's Invite (it emails a real person). (`awaitClick` held Next on those FormActions submits only because it counted an `aria-disabled` click; `awaitGate` fixes exactly that.) Pass the launcher as `TourProvider launch` (`app-tour-provider.tsx`); it is called as `launch(id, opts, start)` with the provider's `start` (as `useTourUrlSync` calls it), so `tours.tsx:739`'s `launch` can start through that argument instead of `useTour().start`, with no ref. Add `<TourGuideButton tour="create-transaction" at="txn-entry-mode" />` to the create card's header. The account step's warning line (`transaction-fields.tsx:1124`, "No account chosen — saved to …") sits outside the `data-tour` box, so the ring crossed it: give the `accountMissingNote` `<p>` a `useId` id; add `"aria-describedby"` to `AccountCombobox`'s `Pick<InlineEntityComboboxProps, …>` (`shared/components/account-select.tsx:171–186`; its `rest` is typed `data-*` only, `:187`, and lands on the wrapper `div`, where a screen reader would hear nothing) and pass it explicitly to `InlineEntityCombobox` (`:209`), which merges it onto the input (`inline-entity-combobox` `:238`, `:490`). The ring reads `aria-describedby` from the target and its descendants, so it then frames field and line, and the warning becomes part of the field's description too. Contract §9 is the worked example. |
| kastlan | **30 steps in 13 wizard tours** use `awaitClick: true` on `[data-tour="wizard-next"]` (`features/tours/tours/*.ts`): new-lease 4; create-invoice, create-mortgage, handover-protocol 3 each; create-estate, insurance-policy, manual-journal-entry, owner-meeting, record-payment, rent-deposit, repair-work-order, yearly-budget 2 each; service-charge-settlement 1. The other 46 `awaitClick` steps (a button that opens a dialog, a tab) stay. The adapter: `tours-root.tsx:77–90` (`buildSteps`, passing `awaitClick` at `:82`) and `types.ts:28`. Each of the 13 has a `review` step on `[data-tour="wizard-finish"]` that does not await it (e.g. create-invoice:51, record-payment:59, manual-journal-entry:36). | Add `awaitGate?: string` to the app's step type and pass it through in `buildSteps`. On each of the 30 `wizard-next` steps replace `awaitClick: true` with `awaitGate: "wizard-next"` (StepperNav releases it when Next moved and refuses it when a validator held the wizard; `awaitClick` advanced on a refused Next). Optionally `awaitGate: "wizard-finish"` on those `review` steps: StepperNav releases it once `onComplete` resolved. All 13 wizard tours run with `mockMode: true` (the API mock interceptor), so the Finish resolves against the mock and the gate releases; a finish gate under mocks does not hang. Fields on a wizard step may publish `useTourGate` like a form. Check that a validator's refusal keeps the tour on its step. |
| Kurvenschmiede | `features/tours/app-tours.ts` | Nothing. Its tours have no `interactive`, `awaitInput` or `awaitClick` steps, so neither the layer rule nor the phone dock touches them. |

## 0.50.1

A plain bump for all three apps: no code to change.

- **The tour's focus on a picker field no longer opens its list** (keksdose B1). On a fine
  pointer a field step focuses the field's first control on arrival (§11.8); a Combobox
  (and the category pickers built on it), an Autocomplete or an InlineEntityCombobox opened
  its list on that focus, and the list, a later layer (§11.6), covered the whole card, Next
  and "Leave empty" included. The tour now focuses the field *quietly*: it is focused and
  described by the card's body (set before the focus, so a screen reader reads name and
  step together), and the list stays closed until the person opens it with ArrowDown,
  typing or a click. A click or Tab of the person's own opens the list on focus as before. The
  locked Next's "focus the field" is quiet too. Phones are unchanged (the card takes the
  focus on touch). Pickers that open only on a click (Select, EntityCombobox, CountrySelect,
  CurrencySelect, MultiSelect, the date pickers) were never affected.
- A list the person opens while a field step is up still paints above the card (§11.6: a
  layer the field opens comes after the card), and on desktop it may cover it until a pick
  or Escape closes it. That is unchanged.
- **`launch` gets the whole engine as its fourth argument** (keksdose N1, additive).
  `TourProvider launch` and `useTourUrlSync` call `launch(id, opts, start, engine)`;
  `engine` (`TourEngine`) is what `useTour()` returns — `stop`, `next`, `prev`, `goToStep`,
  `active`, `activeId`, `index`, … — as one object whose fields read the latest render, so
  a launcher above the provider can stop its run mid-way. keksdose: the callback that
  registers `useTours()` from below the provider can go; take `engine` in `tours.tsx`'s
  `launch` and call `engine.stop()` where the tours stop today. Launchers taking two or
  three arguments are unchanged (§11.5).
