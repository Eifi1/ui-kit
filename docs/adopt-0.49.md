# Adopting `@eifi1/ui-kit` 0.49 and `eifi1-server-kit` 0.19

ui-kit 0.49 is the design-review round (KIT-1 … KIT-15). This guide lists, per change, what
each app does, with the places found in keksdose, kastlan and Kurvenschmiede on 2026-10-22
(`frontend/src`, production code; line numbers at that date).

## KIT-5: Button variants `default` and `accent` (`primary` and `brand` deprecated)

`variant="primary"` drew the quiet warm chip and `variant="brand"` the solid brand call to
action, so the name promised the opposite of the look. 0.49 adds the names for what they draw:

| Look | New name | Deprecated alias (same look) |
|---|---|---|
| warm filled chip with a hairline border; a Button with no `variant` | `default` | `primary` |
| solid `--brand` with `--brand-contrast` text, the one strong call to action | `accent` | `brand` |

`secondary`, `ghost`, `danger` and `link` do not change. Nothing changes on screen: the aliases
draw exactly the new names. The defaults now carry the new names and never warn: Button,
`Button href`, `buttonClasses()` → `default`; `FormActions.submitVariant` and the wizard's
`finishVariant` → `accent`; `ConfirmDialog` / `DangerConfirm` with `tone="warning"` and the
ErrorBoundary retry → `default`.

`FloatingActionButton.variant` is now `"accent" | "surface"` (default `accent`) and
`FloatingAction.variant` `"default" | "accent"`. Their `"primary"` was always the **solid brand
fill**, so there it is an alias of `accent`, not of `default`.

DEPRECATED: `variant="primary"` and `variant="brand"` on every prop typed `ButtonVariant`
(`variant`, `submitVariant`, `cancelVariant`, `confirmVariant`, `finishVariant`,
`buttonVariant`, `attachmentButtonVariant`, `buttonClasses(…)`) and `variant="primary"` on
`FloatingActionButton` / `FloatingAction`. A development build warns once per component and
name (`[ui-kit] Button variant="brand" is deprecated: use "accent" (same look)`); production
and vitest stay silent. They are removed no earlier than 0.51, and `primary` will not come back
with another meaning: a forgotten site then becomes a type error, never a silent change of look.

### The codemod (component-aware)

A blind `sed` is wrong for one case: `FloatingAction(Button) variant="primary"` must become
`accent`, not `default`. Change those by hand first, then run the rest.

Quick (sed), in `frontend/`:

```sh
# 0) the FAB sites that must NOT become "default" — fix these by hand to variant="accent"
rg -n -U '<FloatingAction(Button)?\b[^>]*variant="primary"' src
# 1) the button-variant props, literal attributes
rg -l --glob '*.tsx' '(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="(primary|brand)"' src \
 | xargs sed -i -E \
   -e 's/\b(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="primary"/\1="default"/g' \
   -e 's/\b(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="brand"/\1="accent"/g'
# 2) what is left (ternaries, objects, local types): tsc does not flag the aliases, rg does
rg -n '"(primary|brand)"' src | rg -i 'variant'
```

Read the `git diff`: step 1 also rewrites a `variant="brand"` on a component that is not a
button. None of the three apps has one today (Chip and Badge take `tone=`), but check.

Robust (ts-morph, rewrites only button-like tags and the FAB, ternaries included):

```ts
import { Project, SyntaxKind, Node } from "ts-morph";
const BUTTONLIKE = new Set(["Button", "IconButton", "FileButton", "ResendButton", "CopyButton", "ButtonGroup"]);
const FAB = new Set(["FloatingAction", "FloatingActionButton"]);
const PROPS = new Set(["variant", "submitVariant", "cancelVariant", "confirmVariant", "finishVariant", "buttonVariant", "attachmentButtonVariant"]);
const MAP: Record<string, string> = { primary: "default", brand: "accent" };
const p = new Project({ tsConfigFilePath: "tsconfig.app.json" });
for (const sf of p.getSourceFiles("src/**/*.tsx")) {
  sf.getDescendantsOfKind(SyntaxKind.JsxAttribute).forEach((a) => {
    const prop = a.getNameNode().getText();
    if (!PROPS.has(prop)) return;
    const tag = a.getFirstAncestor((n) => Node.isJsxOpeningElement(n) || Node.isJsxSelfClosingElement(n));
    const name = tag && (tag as any).getTagNameNode().getText().split(".").pop();
    const fab = FAB.has(name);
    if (!fab && !BUTTONLIKE.has(name) && prop === "variant") return; // another component's `variant`
    a.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach((s) => {
      const v = s.getLiteralValue();
      if (fab && v === "primary") s.setLiteralValue("accent");
      else if (!fab && MAP[v]) s.setLiteralValue(MAP[v]);
    });
  });
}
p.saveSync();
```

Afterwards the check is the dev console (no `[ui-kit] … is deprecated` line) or the `rg` of
step 2. Implicit buttons (no `variant`) and FormActions without `submitVariant` need nothing.

| App | `variant="primary"` | `submitVariant="primary"` | `variant="brand"` | ternaries / local types | FAB `primary` (→ `accent`!) | Effort |
|---|---|---|---|---|---|---|
| keksdose | 2 Button: `features/translations/kit-showcase-handoff.tsx:67`, `features/reports/tabs/matching-tab.tsx:517` | 18: `budgets/flag-names-card.tsx:84`, `rules/rule-editor.tsx:475`, `accounts/loan-payment-panel.tsx:333`, `accounts/accounts-page.tsx:1130`, `:1163`, `transactions/convert-transfer-control.tsx:186`, `:270`, `invoices/image-cropper.tsx:242`, `invoices/invoice-attach-panel.tsx:188`, `payees/payee-editor.tsx:136`, `admin/support-panel.tsx:730`, `payees/merge-payees-dialog.tsx:94`, `support/support-page.tsx:454`, `payees/transfer-cleanup-modal.tsx:93`, `reports/product-merge-modal.tsx:452`, `assistant/assistant-handoff.tsx:175`, `reports/tabs/matching-tab.tsx:845`, `payees/payee-backfill-modal.tsx:136` (+ the comment at `invoices/image-cropper.tsx:237`) | 9: Button `budgets/budgets-page.tsx:623`, `budgets/guest-key-control.tsx:135`, `budgets/budget-share-card.tsx:224`, `admin/admin-page.tsx:703`, `:782`, `:920`, `admin/users-panel.tsx:240`; IconButton `transactions/mobile-bulk-bar.tsx:91`, `invoices/invoice-lines-bulk-bar.tsx:276` | 0 | **1**: `features/transactions/transactions-page.tsx:860` (FloatingAction) | ≈ 30–45 min; the 51 Buttons without `variant` and 4 FormActions without `submitVariant` stay |
| kastlan | 1: `features/platform/pages/platform-signup-invitations-page.tsx:173` | 0 | 51 (50 Button, mostly the "New" action in `PageHeader actions`, e.g. `accounting/pages/journal-entries-page.tsx:37`; 1 FileButton `property/components/unit-document-gallery.tsx:45`) | 0 | 0 | ≈ 15–20 min, sed is enough |
| Kurvenschmiede | 0 | 0 | 14 Button (e.g. `gear/kinematics-tab.tsx:186`, `setpoint/sessions-page.tsx:182`, `dynamics/exercise.tsx:154`) | 2: `features/dynamics/lesson-valve.tsx:132`, `features/dynamics/lesson-vacuum.tsx:280` | 0 | ≈ 10–15 min (ts-morph or by hand) |

No app uses `buttonClasses(…)`, `FloatingActionButton`, `ConfirmDialog tone="warning"` or
`DangerConfirm tone="warning"`. The `tone="brand"` on Chip, StatTile, Sparkline and friends is a
colour role, not a button variant, and does not change.

## KIT-6: the phone bar holds five cells; groups open a sheet; SectionNav

BREAKING (on a bump, no code): the phone bar holds at most **five cells at Normal and Large,
four at Extra large, "More" included** (`AppShell.mobileMaxItems`, default
`DEFAULT_MOBILE_MAX_ITEMS`). Until 0.48 Normal showed every entry. Eight entries are now four and
"More"; the More sheet lists the rest, each group with its pages. And an entry **with `items`**
no longer links to its `to` on the phone: its cell opens a sheet of its pages, its own page first
as "Overview" (`appShellMore.overview`, 7 languages) when none of the pages is that page. Tours
keep finding it by `a[href]` and `dataTour` (an inert anchor over the cell, as on More).

New, opt-in:
- `AppShellNavItem.mobilePriority` (number, lower first): which entries keep a cell when they do
  not all fit; the bar still shows them in the list's order. Unset: the list's order.
- `AppShellNavItem.shortLabelIsAlias`: a development build now warns once when `shortLabel` does
  not start with the label's first word (an abbreviation, "Trans." for "Transactions", counts).
  The warning names the text size the bar uses it from (`shortLabelFrom`). Pass
  `shortLabelIsAlias: true` when the other word is meant.
- `SectionNav` (root entry): a section's pages on the phone as one sideways-scrolling row of
  pills under the page title, the open one scrolled into view, 44 px targets, 48 px tall;
  `NavPills` with the new `layout="scroll"`. Phone only by default (`phoneOnly`). Use it or the
  shell's own row above the bar (`mobileSubNav`) for the same pages, not both.
- `pickMobileBar(entries, maxItems, priority?)` (/shell, root): the split the bar uses.

DEPRECATED: `AppShell.mobileBarMax` (entries before "More") → `mobileMaxItems` (cells, "More"
included; `mobileBarMax={4}` is `mobileMaxItems={5}`), and `DEFAULT_MOBILE_BAR_MAX` →
`DEFAULT_MOBILE_MAX_ITEMS`. Both still work, the prop with a development warning; removed no
earlier than 0.51.

| App | What changes on a bump | Steps |
|---|---|---|
| keksdose | Nothing visible: its 7 entries (`shared/lib/nav-items.ts:50`) already ran at `MOBILE_BAR_MAX = { normal: 4, large: 4, xlarge: 3 }` (`nav-items.ts:101`), which is the new default. No entry has `items`. The dev console warns once for `shortLabel` "Activity" on "Transactions" (`nav-items.ts:65`, passed with `shortLabelFrom: "large"` in `app/layout.tsx:58–59`). | Delete `MOBILE_BAR_MAX` and `mobileBarMax={MOBILE_BAR_MAX}` (`app/layout.tsx:126`), or rename it to `mobileMaxItems={{ normal: 5, large: 5, xlarge: 4 }}`. Pass `shortLabelIsAlias: true` for Transactions (or a shortening such as "Trans."; the budget's "Activity" column is the other "Activity", `nav-items.ts:53–60`). Optional: `mobilePriority` 1–4 on Budget, Accounts, Transactions, Reports instead of relying on the order, so Imports/Rules/Payees can move in the list without reaching the bar. |
| kastlan | Normal: its 6 entries (Dashboard + 5 groups, `app/nav.ts:78–145`) become 4 and "More" (was 6 cells). On the phone each group cell (`app/nav.ts:209`) opens a sheet of its pages, with "Overview" leading to `/overview/<group>`, instead of linking to the overview page. | Nothing required. `FIRST_GROUPS` (`app/nav.ts:156`) can become `mobilePriority` on the four leading groups if the sidebar order should differ from the bar's. No hand-rolled section pill row was found (`frontend/src`, 2026-10-22): a group's pages show in the shell's row above the bar (`mobileSubNav`, on by default, `app/app-layout.tsx:161`). For SectionNav under a page title instead — e.g. the finance pages `/invoices` … `/accounting/reports` (`app/nav.ts:114–125`) — render `<SectionNav label={t("nav.group.finance")} items=… current=…>` under the PageHeader and pass `mobileSubNav={false}`. |
| Kurvenschmiede | Nothing visible: 5 entries (`shared/lib/nav-items.ts:14–20`) fit five cells; Extra large stays 3 + More. The dev console warns once for `shortLabel` "Equations" on "Differential equations" (`nav-items.ts:17`, `nav.dynamics_short`). | `shortLabelIsAlias: true` for Dynamics (or a shortening). The steering area's strip (`features/steering/steering-layout.tsx:56`, `NavPills size="sm"`) is a SectionNav candidate on the phone: `<SectionNav label={t("steering.area")} items={items} current={areaOf(pathname)} />` keeps it one line instead of wrapping. |

## KIT-7: the default phone card — a title, three fields, no empty ones, a status chip

BREAKING (on a bump, no code): a DataTable **without `mobileCard`** draws its phone card as its
`mobilePrimary` column (the title), then **at most three fields** — the first three visible
columns after the title — and **leaves out a field whose value is empty** (the cell returns
`null`, `undefined`, `""`, the formatters' "—", or `booleanColumn`'s unset mark). Until 0.48 every
visible column that was not `mobileHidden` was a line. With `mobileDetailsInRow` the columns the
card leaves out go into the opened row. `mobileCard` still replaces the card completely.

New column options:
- `mobile: "primary" | "secondary" | "hidden"`: the title (as `mobilePrimary`), one of the
  fields (the columns marked `"secondary"` are the fields when any is), or not on the card (as
  `mobileHidden`).
- `role: "status"`: on the card the value sits as a chip beside the title instead of a
  "Status" line, and takes none of the three fields. Text is drawn in a neutral `Chip`; a cell
  that already returns a `Chip`/`StatusDot` is drawn as it is. Desktop unchanged.

A cell that renders an element for "no value" (`<Amount value={null} />`) cannot be seen as
empty: return `null` or "—" for it (the table shows "—"; the card drops the field).

| App | What changes on a bump | Steps |
|---|---|---|
| keksdose | 4 tables keep their `mobileCard` (`features/invoices/invoice-lines-table.tsx:1789`, `features/reports/tables/aggregated-table.tsx:224`, `features/feedback/feedback-page.tsx:296`, `features/accounts/accounts-page.tsx:729`): unchanged. Other tables lose fields past the third. | `role: "status"` on the status columns `features/transactions/use-transaction-columns.tsx:297` and `features/admin/jobs-panel.tsx:98`; `mobile: "secondary"` on the three that matter where the first three are not them. Check the accounts columns marked `mobileHidden` (`accounts-page.tsx:973–1031`) — `mobile: "hidden"` is the same. |
| kastlan | Its list pages have no `mobileCard` except feedback (`features/feedback/pages/feedback-page.tsx:193`), so every phone card now stops at three fields and drops empty ones. 12 status columns become chips beside the title once marked. | `role: "status"` on the 12 `key: "status"` columns: `finance/components/invoice-columns.tsx:112`, `accounting/components/journal-entry-columns.tsx:122`, `budgets/components/budget-columns.tsx:64`, `handover/components/protocol-columns.tsx:61`, `finance/pages/dunning-list-page.tsx:105`, `owner-meetings/pages/meeting-list-page.tsx:72`, `communication/components/sent-emails-section.tsx:56`, `deposits/components/deposit-columns.tsx:59`, `tenancy/components/lease-columns.tsx:158`, `service-charges/components/period-columns.tsx:53`, `maintenance/components/request-columns.tsx:97`, `property/pages/unit-list-page.tsx:105` (its `StatusBadge` is a Chip and is kept as it is). Then `mobile: "secondary"` where the three fields should not be the first three (e.g. invoices: tenant, due date, amount). Cells that print `formatCurrency(…)` of a missing value as "—" drop off by themselves. |
| Kurvenschmiede | One `mobileCard` (`features/feedback/feedback-page.tsx:221`): unchanged. Other tables stop at three fields. | Check the gear tabs' cards (`features/gear/{assemblies,transmissions,hystereses}-tab.tsx`) on a phone; add `mobile: "secondary"` where needed. |

## KIT-8: status tones — `statusTone(kind)` and `status=` on Chip and StatusDot

New, additive: five domain-free status kinds and the tone each takes — `good` → `success`,
`attention` → `warning`, `problem` → `danger`, `active` → `info`, `inactive` → `neutral`
(`statusTone(kind)`, `STATUS_KINDS`, types `StatusKind`, `StatusTone`). `Chip` and `StatusDot`
take `status="good"` etc. instead of `tone`; an explicit `tone` still wins. `brand` is not a
status tone (it is the app's colour), nor are `income`/`expense` (direction of money). The
showcase's Colour roles page opens with "Which tone for which status", one sentence per kind.

| App | Where its statuses are coloured today | Steps |
|---|---|---|
| keksdose | `features/admin/jobs-panel.tsx:258` `VERDICT_TONE` (StatusDot, `ok: "success"`, …); the transaction status column (`features/transactions/use-transaction-columns.tsx:297`) draws its own indicators. | Replace `VERDICT_TONE` with a verdict → `StatusKind` map and `<StatusDot status=…>`; any `tone="brand"` on a status chip becomes the kind it means. |
| kastlan | One registry, `shared/enums/enum-meta.ts` (79 `tone:` entries; `StatusBadge` in `shared/components/feedback/status-badge.tsx:18` reads it). Statuses use semantic tones and hues side by side: invoices `OPEN: "blue"`, `PARTIALLY_PAID: "warning"`, `PAID: "success"`, `OVERDUE: "danger"`, `CANCELLED: "neutral"` (`enum-meta.ts:136–157`); units `VACANT: "success"`, `RENTED: "danger"`, `RENOVATION: "warning"` (`:77–89`). | Give the *status* enums (invoice, lease `:105`, deposit `:175`, request `:225`, dunning `:335`, unit, protocol, period, budget, journal entry) a `status: StatusKind` in `EnumMeta` instead of `tone`, and let `StatusBadge` pass `status=`: invoices open → `active`, partially paid → `attention`, paid → `good`, overdue → `problem`, cancelled → `inactive`. Decide units: a rented unit is not a problem — `rented → active` (or `good`), `vacant → attention`, `renovation → inactive`. Categories that are not states (meter type, insurance type, invoice type) keep their hues. |
| Kurvenschmiede | No status chips with a semantic meaning found (`frontend/src`, 2026-10-22). | Nothing; use `status=` for new ones. |

## KIT-9: page titles — `useDocumentTitle`, `PageHeader.documentTitle`, `Breadcrumbs.hideCurrent`

BREAKING (on a bump, no code): a `PageHeader` that is the page's `h1` (the default `as`) with a
**string** `title` now writes the window's title while it is mounted and puts the old one back
when it unmounts. Without `appName` on the provider that title is the page alone ("Units"),
no longer the app's name from `index.html`. And a `Breadcrumbs` passed to a `PageHeader`'s
`breadcrumbs` hides its current entry (the title right below names it); the entry before stays
a link and no entry carries `aria-current`. The header draws no trail when only the home entry
(`home: true`, or `href: "/"`) would be left.

New:
- `UiKitProvider appName="Kastlan"` (the `{app}` part) and `documentTitleFormat` (default
  `DEFAULT_DOCUMENT_TITLE_FORMAT`, `"{page} · {section} · {app}"`). A missing part drops with
  its separator: "Units · Kastlan", never "Units ·  · Kastlan".
- `useDocumentTitle([page, section?, app?])` for a page without a `PageHeader`;
  `formatDocumentTitle(format, { page, section, app })`, `useKitDocumentTitle()`.
- `PageHeader.documentTitle`: a string (for a title that is not a string, such as a name with
  a chip), `[page, section]`, or `false` to leave the window alone. An `h2`/`h3` header writes
  nothing unless given one. `SettingsLayout` keeps writing its own title (its headers pass
  `false`).
- `Breadcrumbs.hideCurrent` (default `true` inside a `PageHeader`, `false` elsewhere);
  `hideCurrent={false}` keeps the current entry as text with `aria-current="page"`;
  `BreadcrumbItem.home`.

| App | What changes on a bump | Steps |
|---|---|---|
| keksdose | Its 18 `PageHeader`s with a string title rename the tab to the page ("Budget"); none passes `breadcrumbs`. | Pass `appName="Keksdose"` to the provider (`shared/i18n/kit-labels.tsx:108`); check app tests that read `document.title`. |
| kastlan | Its pages' `PageHeader`s (65, through `shared/components/display/page-header.tsx:8`) rename the tab. Its trail is drawn by the layout above the page (`app/app-layout.tsx:184`, `shared/components/layout/breadcrumbs.tsx`), outside the header, so it keeps its current entry. | `appName="Kastlan"` on the provider (`app/providers.tsx:79`). To stop the trail repeating the title: pass `hideCurrent` in `shared/components/layout/breadcrumbs.tsx` (the route trail), or move it into the `PageHeader`'s `breadcrumbs`. A section can go in as `documentTitle={[title, t("nav.group.finance")]}`. |
| Kurvenschmiede | The `PageHeader`s with a string title rename the tab; the settings and admin titles ("Security · Settings · Kurvenschmiede") are `SettingsLayout`'s and do not change. Its two `breadcrumbs` are back links, not `Breadcrumbs` (`features/setpoint/session-page.tsx:340`, `features/corner/corner-page.tsx:315`): unchanged. | `appName="Kurvenschmiede"` on the provider (`main.tsx:85`). |

## KIT-10: the language trigger shows the flag and the code

On a bump, no code: `LanguageMenu`'s trigger shows the active flag **and the language code in
capitals** ("DE", "FR", "IT"), so de-CH, fr-CH and it-CH — one Swiss flag each — differ without
opening the menu. It is as tall as the other top-bar triggers and as wide as it needs (about
60 px instead of 36). `trigger="code"` or `trigger="flag"` keeps one of the two;
`trigger="flag"` is the 0.48 look. The trigger is named by the new `topBar.languageCurrent`
("Choose language, current: Deutsch", seven catalogues) unless the app passes its own
`aria-label`, which still names menu and trigger as given. `AccountMenuLanguage`'s row shows the
code beside the flag too, and its name carries the language's own name.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/landing/landing-header.tsx:51` (`LanguageMenu`, `aria-label={t("topbar.language")}`); `app/account-menu.tsx:172` (`AccountMenuLanguage`). Languages `shared/i18n/languages.ts:33–36`: de-CH (ch) shows "DE". | Drop the `aria-label` so the trigger says which language is on (or keep it: then it stays "Language"). |
| kastlan | `shared/components/language-switcher.tsx:11` (auth pages, `aria-label={t("nav.language")}`); `app/top-bar.tsx:226` (`AccountMenuLanguage`). | As keksdose: drop the `aria-label`, keep `heading`. |
| Kurvenschmiede | `app/chrome-controls.tsx:32` (`LanguageMenu`, no `aria-label`) and `:26` (`AccountMenuLanguage`). | Nothing; the name is the kit's. |

## KIT-11: the floating inset and `hideWhenOverlay`

0.48 already publishes `--app-float-clearance` (the room the launchers take **above the nav**,
on `<html>`, while any `FloatingActionButton`, `FloatingPanel` or `FloatingActionGroup` is
mounted) and `FloatingPanel.hidden`. 0.49 adds:

- `--kit-floating-inset`: the same room measured from the screen's bottom edge — the phone's
  bottom nav (`--app-nav-h`, 0px from `md` up) or the home indicator, plus
  `--app-float-clearance`. For a page's own fixed footer or last row:
  `padding-bottom: var(--kit-floating-inset, var(--app-nav-h, 0px))`. Unset while no launcher
  is mounted. `--app-float-clearance` stays as it is.
- On a bump: from `md` up `AppShell` pads `<main>` by `--app-float-clearance` too (was 0), so
  the last row scrolls clear of a corner button on a desktop as well. Only while a launcher is
  mounted.
- `hideWhenOverlay` (default `true`) on all three: while a kit dialog, sheet, popover, hover
  menu or list is open, the launcher steps aside (as `hidden`: off screen, room and open state
  kept) and comes back when it closes. A tooltip does not count; an OPEN `FloatingPanel` stays
  (what opens inside it is its own content). `false` keeps it on screen. Only the kit's
  overlays are seen (they share its Escape stack); an app's own hand-built dialog is not.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/assistant/assistant-launcher.tsx:175` `<FloatingPanel hidden={covered}>`, with a MutationObserver over a `COVERING` selector (`:36–53`) for an open editor, modal or bulk bar; `features/transactions/transactions-page.tsx:846` `FloatingActionGroup`, unmounted while the form or the phone selection is open (`:843`). | On a bump the kit modals and sheets already hide both. Keep `covered` for what is not a kit overlay (the inline editor, the bulk bar), or shrink the `COVERING` selector to those. No app CSS reads `--app-float-clearance`. |
| kastlan | No floating launchers. | Nothing. |
| Kurvenschmiede | No floating launchers. | Nothing. |

## KIT-12: a delete is in the row's menu, and it asks first

BREAKING (on a bump, no code): in `RowActions` (and so in DataTable `rowActions`,
`desktopSwipeActions` and `UserRowActions`) an action with `tone: "danger"` no longer draws an
icon in every row: it goes into the row's "⋯" menu, the other actions stay inline
(`dangerPlacement`, default `"menu"`; `"inline"` keeps the 0.48 strip; `collapse="inline"` keeps
every action inline). And choosing it **opens a confirmation first**: a `ConfirmDialog`
through the app's `ConfirmProvider` (or one of the row's own when there is none), titled
"Delete “Ada Example”?" (`rowActions.confirmTitle`, the action's label and the row's `name`),
"This cannot be undone." under it (`rowActions.confirmBody`), the action's label on the
danger button, focus on Cancel; `onSelect` runs only on a yes. Seven catalogues.

- `RowAction.confirm`: `false` when the app asks in `onSelect` itself or offers an undo;
  `{ title, body, confirmLabel }` for its own words; on another tone it makes that action ask.
  A link action never asks.
- Not doubled where the kit already asks the app: a DataTable `rowActions` entry with its own
  `confirm` keeps only that one; `swipePlanRowActions` / `desktopSwipeActions` pass
  `confirm: false` (a swipe commits as the plan says).
- IconButton and RowActions docs: destructive actions belong in the row menu or the
  selection bar ("2 selected" → Delete) and confirm through `useConfirm`.

Every danger row action found below already asks in its `onSelect` — pass `confirm: false`
there, or delete the app's own question and let the kit ask (then `confirm: { title, body }`
for its words). Otherwise the user is asked twice.

| App | Danger row actions (all ask already unless noted) | Steps |
|---|---|---|
| keksdose | 12: `features/accounts/loan-payment-panel.tsx:238`, `accounts/holdings-panel.tsx:661`, `accounts/asset-loan-panel.tsx:128`, `rules/rules-page.tsx:407`, `accounts/accounts-page.tsx:553`, `admin/support-panel.tsx:678`, `budgets/budgets-page.tsx:405` (a two-step confirm inside the row), `budget/group-admin-actions.tsx:94` (dialog), `budget/budget-cells.tsx:341` (`categoryDeleteAction`, dialog), `transactions/transactions-page.tsx:418` (the swipe plan through the app's own `shared/components/swipe-row-actions.tsx:88` `boundSwipeRowActions`, asking in `transaction-swipe-plan.ts:117`; also used by `budget/budget-table.tsx:227`), `admin/users-panel.tsx:732` (roster deactivate, dialog); **`budgets/budget-share-card.tsx:289` "Revoke" asks nothing today** — the kit's question is new there. | `confirm: false` on the ten that ask (once in `swipe-row-actions.tsx`'s `toRowAction` for the swipe-built ones, as the kit's `swipePlanRowActions` does); drop the row's two-step confirm at `budgets-page.tsx:405` for the kit's. Per-row bins outside RowActions: `invoices/vat-summary.tsx:320`, `invoices/invoice-lines-table.tsx:1146` (editing lines of a form: may stay). |
| kastlan | 11: DataTable `shared/components/data-table/resource-list-page.tsx:176` (`kind: "delete"` with `confirm:` — kept as the one question); `accounting/components/journal-entry-columns.tsx:153`, `service-charges/components/distribution-key-columns.tsx:92`, `service-charges/pages/service-charges-list-page.tsx:53`, `platform/pages/platform-signup-invitations-page.tsx:129`, `handover/components/room-inspector.tsx:192`, `property/components/unit-defects-tab.tsx:245`, `property/components/unit-rooms-tab.tsx:214`, roster `settings/components/users-panel.tsx:270`, `:290`, `:308`. | `confirm: false` on the ten outside DataTable. 9 per-row danger IconButtons that ask (e.g. `contacts/components/contact-addresses-tab.tsx:104`, `meters/components/meter-readings-dialog.tsx:160`) can become `RowActions` with the kit's question. |
| Kurvenschmiede | 7: `setpoint/profile-bar.tsx:171`, `setpoint/segment-parts.tsx:104`, `projects/projects-page.tsx:115`, `teams/team-card.tsx:143` (dialog), `teams/team-card.tsx:250`, roster `admin/users-panel.tsx:348`, `:366`. | `confirm: false` on all seven, or let the kit ask. The per-row bin of `shared/lib/table-columns.tsx:124` (`deleteColumn`) can become a `RowActions` entry. |

## KIT-1b: copying a negative puts "-" in the clipboard

On a bump, no code: while a person copies a selection in the page, `UiKitProvider` (the part
every app mounts, signed-out pages included) writes every U+2212 that stands **before a
number** — also after a currency code or symbol and spaces: "−CHF 1,250.50", "(−€100.00)",
"−12%" — as the ASCII "-" into the clipboard, in `text/plain` **and** `text/html` (Excel pastes
the HTML flavour, as cells; table parts stay a table). The screen keeps "−". A copy with no such
minus is left to the browser, and so is any copy out of an input, a textarea or an editable
element. Checked in Chromium: "−CHF 1,250.50" copied from a table cell reads "-CHF 1,250.50"
in both flavours.

- `UiKitProvider copyAsciiMinus={false}` (on the outermost provider) turns it off.
- `asciiMinusInNumbers(text)`: the same rule for an app's own text (a "copy" button handing
  formatted figures to `CopyButton`).
- A file export still passes `minus: "ascii"` to the formatters (or writes raw numbers).

| App | What to check |
|---|---|
| keksdose | Nothing to change: CSV goes through `shared/lib/download-csv.ts:50` with raw numbers (`String(v)`), and no CopyButton copies a figure. Optional: `features/reports/tabs/tax-tab.tsx:431`, `:437` format a step's "value" with `formatPct`/`formatCurrency` — if that text is ever copied by code, wrap it in `asciiMinusInNumbers`. |
| kastlan | Nothing: no export or copy of formatted figures found. |
| Kurvenschmiede | Nothing: no export or copy of formatted figures found. |
