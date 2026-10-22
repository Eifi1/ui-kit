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
