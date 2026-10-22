# Adopting `@eifi1/ui-kit` 0.49 and `eifi1-server-kit` 0.19

ui-kit 0.49 is the design-review round (KIT-1 … KIT-15). This guide lists, per change, what
each app does, with the places found in keksdose, kastlan and Kurvenschmiede on 2026-10-22
(`frontend/src`, production code; line numbers at that date).

**Compatibility: ui-kit 0.49 ↔ server-kit 0.19.** Two packages with their own versions and
changelogs, tested together: this release's Server kit pages and
`showcase/src/__tests__/server-kit-vocabularies.test.ts` (KIT-15) check the kit against
server-kit 0.19.0's API export. Pin `@eifi1/ui-kit` `^0.49` beside the `eifi1-server-kit`
0.19.0 wheel.

**Switch the deprecated names in the 0.49 bump commit.** `primary` / `brand` (KIT-5),
`mobileBarMax` and `DEFAULT_MOBILE_BAR_MAX` (KIT-6) and `IMPRINT_PRESET` are removed in
**0.51** — the kit's deprecation test fails a release two minors past a deprecation, so 0.51
cannot ship with them, and at the current pace 0.51 is days away, not months. The codemod
below takes 5–20 minutes per app; doing it in the bump keeps 0.51 a non-event.

## KIT-1: one minus sign, U+2212 (`minus: "ascii"` for exports)

BREAKING (on a bump, no code): `formatNumber`, `formatMoney`, `formatPercent` (compact notation
included), `useKitFormat`, and the kit components' own number formatting (StatTile, Sparkline,
SeriesChart, Treemap, PieChart, CalendarHeatmap, ProgressBar parts, ChartTooltipContent's bare
value) print a negative with the typographic minus **U+2212** ("−CHF 5.00", "−12%"), as
`SignedAmount` always has; `Intl` writes a hyphen in en, de-CH, fr, it, es, hu and zh. Only
the parts `Intl` marks as a minus are swapped. Editable fields (AmountInput, NumberInput,
MeasuredGrid drafts) keep the typable "-".

- `minus: "ascii"` (type `MinusStyle`) gives U+002D for text a machine reads back — a CSV, a
  clipboard string built in code. A copy by hand needs nothing since KIT-1b (below).
- Tests that pin a formatted negative must expect "−": write `"−CHF 5.00"` or paste the
  character; a test that parses formatted output passes `minus: "ascii"` or reads the number.

| App | What changes on a bump | Steps |
|---|---|---|
| keksdose | Every negative from a kit formatter. About 156 test files hold a hyphen before a digit or currency in a string, mostly fixture inputs (API payloads such as `"-500"`, which stay); 88 asserting lines in 51 of them (`expect`, `getByText`, `toHaveTextContent`, …) have one, mostly fixtures or server text. Those touching kit output — a sample, not the list: `features/reports/__tests__/tax-tab.test.tsx:172` (`"-€2,000.00"`), `investments-tab.test.tsx:218–219` (`"-€150.00"`, `"-13.0%"`), `report-amount-tones.test.tsx:113`, `:114` (`"-€450.00"`, `toneOf("-€450.00")`), `features/transactions/__tests__/transaction-cells-fx.test.tsx:104`, `:106`, `:135` (`"(-€100.00)"` beside a U+2212), `:138` (the hint's `(-€100.00)`). The first suite run on the bump gives the real list. Already on U+2212 or hyphens in fixtures only: `features/reports/__tests__/reports-page.test.tsx` (`:56` fixture), `features/transactions/__tests__/use-transaction-columns.test.tsx:101`, `features/budget/__tests__/auto-assign-preview.test.tsx:154`. | Change the asserted hyphens to "−" where the first suite run fails. Exports: CSV goes through `shared/lib/download-csv.ts:50` with raw numbers (`String(v)`), not kit formatters — nothing to pass; no CopyButton copies a figure. |
| kastlan | Every negative from its wrappers `shared/utils/formatters.ts:26` (`formatNumber`) and `:50` (`formatCurrency`), which call the kit. No test pins a formatted hyphen. | Nothing required. No export or copy of formatted figures found. |
| Kurvenschmiede | Negatives from kit formatters. Tests pinning a hyphen from them: `features/corner/corner-page.test.tsx:444` (`"-75.0 mm"`), `features/gear/gear-page.test.tsx:604` (`"… · -30.0 mm"`) — 2 clear cases, not 4. Not kit output: `gear-page.test.tsx:504` (an input's value), `features/control/control-page.test.tsx:221` (server text), `features/steering/plan-view.test.tsx:90` (an SVG attribute). `shared/ui/checks-list.test.tsx:69` already expects U+2212. One place hands the kit's minus to a parser: `features/dynamics/tex.tsx:38–40` (`texNumber`) puts the formatted figure in KaTeX's `\text{…}`, which renders U+2212 there but warns on every render, in production too (`Unrecognized Unicode character "−" (8722) [unknownSymbol]`). Most call sites pull the sign out already (`lesson-laplace.tsx:127`, `:132`); `y₀`, `K·u₀` and the exercises' answers (`solutions.ts:51–53`) can be negative. | Change the two asserted hyphens to "−". In `texNumber`, write the sign in math mode and format the absolute value. No export or copy of formatted figures found. |

## KIT-2: numeric strings format; invalid values warn in development

`formatNumber`, `formatMoney`, `formatPercent` and their `useKitFormat` bindings take a
**numeric string** as well as a number (`"1850.00"`, `"-12.5"`, `"1e3"` — a Decimal as JSON
sends it) and format it like the number (read with `Number()`: more than ~15–17 significant
digits round to the nearest double). `null` / `undefined` still print `empty` ("—") silently.
Anything else (`"abc"`, `"12,50"`, an object, `NaN`, ±`Infinity`, a boolean) prints `empty`,
and a development build warns once per call site with the value and its type (never under
vitest, never in production). `0`, `"0"` and `-0` print zero, never "—" and never a minus.

BREAKING (small): a numeric string that printed "—" now prints the figure; `NaN` / `Infinity`
now warn in development (output unchanged).

| App | Where | Steps |
|---|---|---|
| keksdose | Decimals arrive as strings from the API; call sites that wrapped them in `Number(…)` before formatting keep working. | Optional: drop the `Number(…)` around kit formatter arguments; watch the dev console for "[ui-kit] formatMoney got … which is not a number" lines. |
| kastlan | 9 call sites pass `Number(…)` to its wrappers: `features/accounting/components/wizard/journal-entry-review-step.tsx:59`, `:60`, `features/insurance/components/wizard/insurance-dates-review-step.tsx:110`, `features/finance/components/wizard/payment-allocate-step.tsx:193`, `features/finance/pages/invoice-list-page.tsx:173`, `:181`, `features/service-charges/components/service-charges-costs-tab.tsx:76`, `features/meters/components/meter-readings-dialog.tsx:148`, `features/mortgages/components/wizard/mortgage-review-step.tsx:60`; two more parse with `parseFloat`: `features/tenancy/components/lease-columns.tsx:187`, `features/tenancy/utils/format.ts:14`. The wrappers hand the API's decimal strings on untouched (`shared/utils/formatters.ts:34`, `:65`, `:72`), so list amounts that print "—" on 0.48 print the figure on 0.49: the bump fixes prod #19 (KX-2) by itself. | The wrappers (`shared/utils/formatters.ts:26`, `:50`) are typed `number \| null \| undefined`: widen them to the kit's `FormattableNumber` (a typing fix; the behaviour is fixed by the bump), then the `Number(…)` can go. Keep it where the value can be `""` (an empty field): that now prints "—" with a warning instead of 0. |
| Kurvenschmiede | — | Nothing required. |

## KIT-3: a DataTable without `urlSync` needs no Router

`DataTable` (and `useTableUrlState`) no longer call react-router's hooks without a Router: the
table keeps sort, filters and page in local state. With `urlSync` and no Router a development
build throws "DataTable urlSync requires a Router: …"; production falls back to local state.

| App | Where | Steps |
|---|---|---|
| keksdose | No test wraps a DataTable in a `MemoryRouter` of its own: every DataTable test renders through `renderWithProviders`, whose Router is at `test/render.tsx:99` and serves the pages' links too. | Nothing to remove (the expected two table-only wrappers were not found). |
| kastlan | — | Nothing. |
| Kurvenschmiede | — | Nothing. |

## The anyplot palette: Imprint by default, eight hues, the same in dark

BREAKING (on a bump, no code): the default preset (`DEFAULT_PRESET`, id `"default"`) is anyplot's
**Imprint**: eight categorical hues in slot order — green `#009e73`, lavender `#c475fd`, blue
`#4467a3`, ochre `#bd8233`, matte red `#ae3030`, cyan `#2abccd`, rose `#954477`, lime
`#99b314` — the same in light and dark (amber left the pool). `PALETTE_SIZE` is 8 and
`paletteFor(i)` cycles eight (was nine); `--chart-9` repeats slot 1. New: `--chart-ink` /
`--chart-muted` and `CHART_ROLES` (other/rest/disabled/band → muted; total/baseline/outline →
ink), sequential green→blue and diverging red↔paper↔blue heat scales, and a 1px ink edge on
bars, areas and treemap tiles whose hue is under 3:1 on the surface (`chartEdge`; the fill keeps
its hue). Chart money keeps the money tokens. Paul Tol's "Muted" stays as `PAUL_TOL_PRESET` (id
`"paul-tol"`, now in `PALETTES` after the default); `IMPRINT_PRESET` is a deprecated alias of
`DEFAULT_PRESET`, removed in 0.51.

| App | What changes on a bump | Steps |
|---|---|---|
| keksdose | The chart-colour picker `features/auth/appearance-card.tsx:150–160` maps `PALETTES` (`:156`) and labels the default `t("settings.chart_palette_default")` (`:158`) = "Muted (default)" (`shared/i18n/locales/en.json:2030`; de-CH "Muted (Standard)", fr "Muted (par défaut)", it "Muted (predefinita)", same line) — now wrong: the default is Imprint, and Paul Tol appears as its own entry by `p.name` ("Paul Tol muted"). `features/reports/charts/income-expense-bar.tsx:89` `paletteFor(7)` is now lime `#99b314` (slot 8). | Relabel the key to "Imprint (default)" in the four locales and give `paul-tol` a translated label; fix the help text `settings.chart_palette_help` (`en.json:2031`) and `tour.mk.theme_body` (`:3976`, which contradicts "Both options"); `legal.impressum.credits.body` (`:97`) can stay. Check that lime suits the income/expense bar or pick a slot by meaning (`CHART_ROLES`). |
| kastlan | Charts recolour; no fixed slot found (both charts cycle `chartHex[i % chartHex.length]`). No palette picker (`shared/theme/palette-store.ts:5–9`), so every user moves to Imprint. | Look at the charts in light and dark. |
| Kurvenschmiede | `main.tsx:65` `usePalette.setState({ id: DEFAULT_PRESET.id })` now selects Imprint. Slot 8 no longer exists: `hex[8]` is `undefined` at `features/dynamics/colours.ts:22` `HUE.fourth: 8` (used by `features/dynamics/lesson-reduction.tsx:189`, the fifth line) and `features/control/comparison-panel.tsx:39` `OVERLAY_HUES = [2, 4, 8]` (the third overlay, `hex[overlay.hue]` at `tracking-chart.tsx:69`). The curve plot already wraps (`curve-chart-model.ts:322`, `palette[hue % palette.length]`), and that is the bug, not the fix: with eight hues `COMMANDED_HUES = [4, 6, 8]` (`:204`) draws the commanded sum, solid, in the position's colour (8 % 8 = 0, position is hue 0, `:29`), and `OVERLAY_HUES[0] = 8` (`:191`) the first overlay too. The plot holds eight fixed roles (motion 0/2/4/6, `:28–33`; segment index 7, join 3, commanded transition 1, road speed 5, `:93`); nine hues left one spare for overlays and commands, Imprint leaves none. Its test cannot see it: `curve-chart-model.test.ts:19` hands the model nine fake hues. The course's colours carry meanings its specification fixed (`colours.ts:1–13`: measuring chain blue, test object orange, poles coral, envelopes green); under Imprint the same indices give measuring green (0), object matte red (4) and envelope ochre (3). Fixed slots elsewhere change hue with the palette: `curve-chart-model.ts:29–32`, `:100`, `:112`, `:122`, `steering/ackermann-chart.tsx:37–42`, `gear/transmission-charts.tsx:151–170`, `setpoint/load-command-dialog.tsx:551`, `:676–677`, `control/tracking-chart.tsx:64–78`, `steering/plan-view.tsx:227–317`, the `hex[HUE.*]` uses in `features/dynamics/lesson-*.tsx`, `pole-plane.tsx`, `phase-portrait.tsx`. | **Imprint (Marcel, 2026-10-22)** — not a slot swap, and not `PAUL_TOL_PRESET`. In the bump commit: remap `HUE` (`colours.ts`) by meaning — measuring 2 (blue), measuringLight 5 (cyan), object 3 (ochre), pole 4 (matte red), envelope 0 (green), second/third/fourth 1/6/7 — so the course keeps what its specification means rather than the old hex values; give `comparison-panel.tsx:39` `OVERLAY_HUES` and the curve plot's `COMMANDED_HUES` (`:204`) / `OVERLAY_HUES` (`:191`) slots 0–7 whose fixed role sits on another axis, so nothing wraps onto a role; give `curve-chart-model.test.ts` an eight-hue fixture (it hands the model nine today) and a check that no overlay or `cmd_` axis shares a fixed role's hue; fix the comments that say nine: `curve-chart-model.ts:82`, `:185`, `:395`; `colours.ts:8`; `steering/ackermann-chart.tsx:32`. About an hour, with a look at the dynamics lessons and setpoint curves in light and dark. |

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
and vitest stay silent. They are removed in 0.51 (switch them in the 0.49 bump), and `primary`
will not come back with another meaning: a forgotten site then becomes a type error, never a
silent change of look.

### The codemod (component-aware)

A blind `sed` is wrong for one case: `FloatingAction(Button) variant="primary"` must become
`accent`, not `default`. Change those by hand first, then run the rest.

Quick (sed), in `frontend/`. Each step is given twice: with `rg`, and with `grep` for a shell
that has no `rg` on its PATH (`which rg` prints nothing):

```sh
# 0) the FAB sites that must NOT become "default" — fix these by hand to variant="accent".
#    The variant can come after other props (keksdose's "+" has icon={<Plus />} first), so
#    print the 15 lines after each tag and keep the variant lines; read each hit in its file.
rg -n -A15 '<FloatingAction(Button)?\b' src | rg 'variant="primary"'
grep -rn -A15 -E '<FloatingAction(Button)?\b' src | grep 'variant="primary"'
# 1) the button-variant props, literal attributes
rg -l --glob '*.tsx' '(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="(primary|brand)"' src \
 | xargs sed -i -E \
   -e 's/\b(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="primary"/\1="default"/g' \
   -e 's/\b(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="brand"/\1="accent"/g'
grep -rlE --include='*.tsx' '(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="(primary|brand)"' src \
 | xargs sed -i -E \
   -e 's/\b(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="primary"/\1="default"/g' \
   -e 's/\b(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="brand"/\1="accent"/g'
# 2) what is left (ternaries, objects, local types): tsc does not flag the aliases, a search does
rg -n '"(primary|brand)"' src | rg -i 'variant'
grep -rnE '"(primary|brand)"' src | grep -i variant
```

Run one form of step 1, not both. In keksdose (2026-10-22) step 0 prints
`src/features/transactions/transactions-page.tsx-860-            variant="primary"`, the "+" of
the phone's `FloatingActionGroup`; a step 0 that stops at the first `>` misses it, and step 1
then turns it into the quiet `default` member without a type error or a warning. Step 1 takes
test files too, since `*.tsx` under `src` includes them.

Read the `git diff`: step 1 also rewrites a `variant="brand"` on a component that is not a
button. None of the three apps has one today (Chip and Badge take `tone=`), but check.

Robust (ts-morph, rewrites only button-like tags and the FAB, ternaries included; it matches
the tag, so prop order does not matter). `tsConfigFilePath` is your app's tsconfig that
includes `src` (keksdose and Kurvenschmiede: `tsconfig.json`; kastlan: `tsconfig.app.json`):

```ts
import { Project, SyntaxKind, Node } from "ts-morph";
const BUTTONLIKE = new Set(["Button", "IconButton", "FileButton", "ResendButton", "CopyButton", "ButtonGroup"]);
const FAB = new Set(["FloatingAction", "FloatingActionButton"]);
const PROPS = new Set(["variant", "submitVariant", "cancelVariant", "confirmVariant", "finishVariant", "buttonVariant", "attachmentButtonVariant"]);
const MAP: Record<string, string> = { primary: "default", brand: "accent" };
const p = new Project({ tsConfigFilePath: "tsconfig.json" }); // kastlan: "tsconfig.app.json"
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

Afterwards the check is the dev console (no `[ui-kit] … is deprecated` line) or the search of
step 2. Implicit buttons (no `variant`) and FormActions without `submitVariant` need nothing.

| App | `variant="primary"` | `submitVariant="primary"` | `variant="brand"` | ternaries / local types | FAB `primary` (→ `accent`!) | Effort |
|---|---|---|---|---|---|---|
| keksdose | 2 Button: `features/translations/kit-showcase-handoff.tsx:67`, `features/reports/tabs/matching-tab.tsx:515` | 18: `budgets/flag-names-card.tsx:84`, `rules/rule-editor.tsx:475`, `accounts/loan-payment-panel.tsx:333`, `accounts/accounts-page.tsx:1048`, `:1081`, `transactions/convert-transfer-control.tsx:186`, `:270`, `invoices/image-cropper.tsx:242`, `invoices/invoice-attach-panel.tsx:188`, `payees/payee-editor.tsx:136`, `admin/support-panel.tsx:730`, `payees/merge-payees-dialog.tsx:94`, `support/support-page.tsx:454`, `payees/transfer-cleanup-modal.tsx:93`, `reports/product-merge-modal.tsx:452`, `assistant/assistant-handoff.tsx:175`, `reports/tabs/matching-tab.tsx:843`, `payees/payee-backfill-modal.tsx:136` (+ the comment at `invoices/image-cropper.tsx:237`) | 9: Button `budgets/budgets-page.tsx:623`, `budgets/guest-key-control.tsx:135`, `budgets/budget-share-card.tsx:224`, `admin/admin-page.tsx:703`, `:782`, `:920`, `admin/users-panel.tsx:240`; IconButton `transactions/mobile-bulk-bar.tsx:91`, `invoices/invoice-lines-bulk-bar.tsx:276` | 1: `features/ynab-import/ynab-import-panel.tsx:320` `finishVariant={replaceExisting ? "danger" : "brand"}` → `"accent"` (step 2 finds it) | **1**: `features/transactions/transactions-page.tsx:860` (FloatingAction; `icon` comes first, step 0 finds it) | **31 sites**. ≈ 10–15 min: the FAB and the ternary by hand, then step 1, then read the diff. Step 1 also takes the test `shared/components/__tests__/ui.test.tsx:163` (`<Button variant="primary">`). The 51 Buttons without `variant` and 4 FormActions without `submitVariant` stay |
| kastlan | 1: `features/platform/pages/platform-signup-invitations-page.tsx:173` | 0 | 51 (50 Button, mostly the "New" action in `PageHeader actions`, e.g. `accounting/pages/journal-entries-page.tsx:37`; 1 FileButton `property/components/unit-document-gallery.tsx:46`, the tag opens at `:45`) | 0 | 0 | **52 sites in 49 files**, none in a test. ≈ 15–20 min, step 1 is enough. Step 2 also prints a Chip's `tone={… ? "brand" : "neutral"}` (`tenancy/components/lease-overview-tab.tsx:113`), which stays |
| Kurvenschmiede | 0 | 0 | 14 Button (e.g. `gear/kinematics-tab.tsx:186`, `setpoint/sessions-page.tsx:182`, `dynamics/exercise.tsx:154`) | 2: `features/dynamics/lesson-valve.tsx:132`, `features/dynamics/lesson-vacuum.tsx:280` | 0 | **14 + 2 ternaries**, none in a test. ≈ 5–10 min: step 1 takes the 14, the two ternaries by hand |

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
`DEFAULT_MOBILE_MAX_ITEMS`. Both still work, the prop with a development warning; removed in
0.51 (switch them in the 0.49 bump).

| App | What changes on a bump | Steps |
|---|---|---|
| keksdose | Nothing visible: its 7 entries (`shared/lib/nav-items.ts:50`) already ran at `MOBILE_BAR_MAX = { normal: 4, large: 4, xlarge: 3 }` (`nav-items.ts:101`), which is the new default: `{4,4,3}` entries is `{5,5,4}` cells, exactly `DEFAULT_MOBILE_MAX_ITEMS`. No entry has `items`. The dev console warns for Transactions' `shortLabel` (`nav-items.ts:64`, passed with `shortLabelFrom: "large"` in `app/layout.tsx:58–59`) in all four languages: en "Activity" for "Transactions", de-CH "Umsätze" for "Buchungen", fr "Activité" for "Transactions", it "Movimenti" for "Transazioni". No test names `MOBILE_BAR_MAX` or `mobileBarMax`. | Delete `MOBILE_BAR_MAX` (`nav-items.ts:101`), `mobileBarMax={MOBILE_BAR_MAX}` (`app/layout.tsx:126`) and its import (`layout.tsx:22`); deleting is enough. Or, if Extra large's 3 + More (measured: Italian "Movimenti" needs 79px against the 74 a cell holds, `nav-items.ts:96–99`) should not follow a later kit default, pin it as `mobileMaxItems={{ normal: 5, large: 5, xlarge: 4 }}` and move the measurement note there. Pass `shortLabelIsAlias: true` beside `shortLabelFrom: "large"` in layout.tsx's mapping (`:58–59`); keksdose's `NavItem` has no flag of its own. ≈ 5 min. Optional: `mobilePriority` 1–4 on Budget, Accounts, Transactions, Reports instead of relying on the order, so Imports/Rules/Payees can move in the list without reaching the bar. |
| kastlan | Normal: its 6 entries (Dashboard + 5 groups, `app/nav.ts:78–145`) become 4 and "More" (was 6 cells). On the phone each group cell (`app/nav.ts:210`) opens a sheet of its pages, with "Overview" leading to `/overview/<group>`, instead of linking to the overview page. For an admin or manager Finance is the fifth entry, so at Normal it now sits behind More (at Large it already did), and the create-invoice tour's Finance step (`features/tours/tours/create-invoice.ts:27`) spotlights More. | Nothing required. `FIRST_GROUPS` (`app/nav.ts:156`) can become `mobilePriority` on the four leading groups if the sidebar order should differ from the bar's. No hand-rolled section pill row was found (`frontend/src`, 2026-10-22): a group's pages show in the shell's row above the bar (`mobileSubNav`, on by default, `app/app-layout.tsx:161`). For SectionNav under a page title instead — e.g. the finance pages `/invoices` … `/accounting/reports` (`app/nav.ts:114–125`) — render `<SectionNav label={t("nav.group.finance")} items=… current=…>` under the PageHeader and pass `mobileSubNav={false}`. |
| Kurvenschmiede | Nothing visible: 5 entries (`shared/lib/nav-items.ts:14–20`) fit five cells; Extra large stays 3 + More. In KS's default language all three short labels warn: de-CH "Regelung" for "Steuerung & Regelung", "DGL" for "Differenzialgleichungen", "Lenkung" for "Lenkgetriebe" (`nav-items.ts:16`, `:17`, `:19`); en "Equations", es "Dirección", fr "Direction", hu "Egyenletek", it "Sterzo" and zh "方程" one each. | `shortLabelIsAlias: true` on every entry with a `shortLabelKey`: one line in the map at `app/layout.tsx:42–50`, since each short label is a translator's choice. The rule recognises prefixes only (the short label's first word starts the label's first word, or the other way round), so it cannot tell an initialism from another word: "DGL" needs the flag too. The steering area's strip (`features/steering/steering-layout.tsx:56`, `NavPills size="sm"`) is a SectionNav candidate on the phone: `<SectionNav label={t("steering.area")} items={items} current={areaOf(pathname)} />` keeps it one line instead of wrapping. |

## KIT-7: the default phone card — a title, three fields, no empty ones, a status chip

BREAKING (on a bump, no code): a DataTable **without `mobileCard`** draws its phone card as its
`mobilePrimary` column (the title), then **at most three fields** — the first three visible
columns after the title — and **leaves out a field whose value is empty** (the cell returns
`null`, `undefined`, `""`, the formatters' "—", or `booleanColumn`'s unset mark). Until 0.48 every
visible column that was not `mobileHidden` was a line. With `mobileDetailsInRow` the columns the
card leaves out go into the opened row. `mobileCard` still replaces the card completely.

A status column past the third field leaves the card until it is marked `role: "status"`. A
column of buttons (e.g. a per-row delete) counts as a field, and past the third it leaves the
card with its action. A development build warns once per column key when the default card (no `mobileCard`, no column
marked `mobile: "secondary"`, no `mobileDetailsInRow`) drops a `noRowLink` column:
`[ui-kit] DataTable: column "actions" (noRowLink) is past the phone card's three fields and
leaves the card — mark it mobile: "secondary", or move its action to rowActions.` Production
and vitest stay silent. The kit's own `rowActions` column is not a field: on a phone its
actions are the card's swipes.

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
| keksdose | 4 tables keep their `mobileCard` (`features/invoices/invoice-lines-table.tsx:1789`, `features/reports/tables/aggregated-table.tsx:224`, `features/feedback/feedback-page.tsx:296`, `features/accounts/accounts-page.tsx:729`): unchanged. Of the others only price history (`features/reports/tabs/price-history-tab.tsx:317–348`: the label, then latest, range, change, count) has more than three phone fields: "count" leaves the card. Payees, jobs, price book and price pool already show three or fewer. The register's DataTable is desktop only (`hidden md:block`, `features/transactions/transactions-page.tsx:1030`); the phone shows `MobileTransactionList`. | `role: "status"` on `features/admin/jobs-panel.tsx:98`, the status column a phone shows. On the register's `features/transactions/use-transaction-columns.tsx:297` it changes nothing on screen. Price history: `mobile: "secondary"` on the three to keep if "count" matters more than one of them. The accounts columns marked `mobileHidden` (`accounts-page.tsx:891–949`) sit under its `mobileCard`; `mobile: "hidden"` is the same. |
| kastlan | Its list pages have no `mobileCard` except feedback (`features/feedback/pages/feedback-page.tsx:193`), so every phone card now stops at three fields and drops empty ones. kastlan curates its cards with `mobileHidden`; on a bump, tables with more than three phone fields stop at three — about eleven: units, dunning, buildings, insurance, meetings, mortgages, trial balance, budgets, the estate list, the estate's buildings tab, settlements. Four status columns sit past the third field and leave the card until they are marked: units (`property/pages/unit-list-page.tsx:105`, 6th field), dunning (`finance/pages/dunning-list-page.tsx:105`, 5th), budgets (`budgets/components/budget-columns.tsx:64`, 4th), owner meetings (`owner-meetings/pages/meeting-list-page.tsx:72`, 4th). The platform roster's `companies` column (`settings/components/users-panel.tsx:350`, an `extra` column) leaves the roster's card unless marked. | **In the bump commit:** `role: "status"` on the 12 `key: "status"` columns: `finance/components/invoice-columns.tsx:112`, `accounting/components/journal-entry-columns.tsx:122`, `budgets/components/budget-columns.tsx:64`, `handover/components/protocol-columns.tsx:61`, `finance/pages/dunning-list-page.tsx:105`, `owner-meetings/pages/meeting-list-page.tsx:72`, `communication/components/sent-emails-section.tsx:56`, `deposits/components/deposit-columns.tsx:59`, `tenancy/components/lease-columns.tsx:158`, `service-charges/components/period-columns.tsx:53`, `maintenance/components/request-columns.tsx:97`, `property/pages/unit-list-page.tsx:105`. Each cell already returns a kit element (11 `StatusBadge`, a Chip; the sent e-mails a `StatusDot`) and is drawn as it is. Choosing the three fields per table is kastlan's (prod #23, KX-6): `mobile: "secondary"` picks among the columns that are not `mobileHidden` and does not bring a hidden one back (invoices hide estate, type, issue date, due date and dunning level, `finance/components/invoice-columns.tsx:46–128`, so their card is the number, the amount and the status chip). Cells that print `formatCurrency(…)` of a missing value as "—" drop off by themselves; the 44 that print "-" (e.g. `insurance/components/insurance-columns.tsx:95`) or wrap the value in a span stay on the card (prod #27, KX-10: return `EMPTY_VALUE` or `null`). |
| Kurvenschmiede | One `mobileCard` (`features/feedback/feedback-page.tsx:221`): unchanged. Other tables stop at three fields. The bin (`deleteColumn`, `shared/lib/table-columns.tsx:62`: key `actions`, `noRowLink`) is a field: it is the 4th on the transmissions, hystereses, kinematics and steering-sessions cards (`features/gear/transmissions-tab.tsx:98–140`, `hystereses-tab.tsx:173–206`, `kinematics-tab.tsx:133–170`, `features/setpoint/sessions-page.tsx:116–166`) and leaves them; on a phone it is the only delete those four lists have. Assemblies and the `/curves` list keep it. No KS test sees it: jsdom draws the desktop rows too. | **In the bump commit:** make the bin a `rowActions` entry on those four lists (`kind: "delete"`, so `tone: "danger"`; `disabledReason` for a row the caller does not own; the kit's question in place of `DeleteButton`'s), as the KIT-12 row suggests. Then check the gear tabs' cards on a phone; add `mobile: "secondary"` where needed. |

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
| kastlan | One registry, `shared/enums/enum-meta.ts` (79 `tone:` entries; `StatusBadge` in `shared/components/feedback/status-badge.tsx:18` reads it). Statuses use semantic tones and hues side by side: invoices `OPEN: "blue"`, `PARTIALLY_PAID: "warning"`, `PAID: "success"`, `OVERDUE: "danger"`, `CANCELLED: "neutral"` (`enum-meta.ts:136–157`); units `VACANT: "success"`, `RENTED: "danger"`, `RENOVATION: "warning"` (`:77–89`). | Nothing on a bump (KIT-8 is additive). Units keep their current colours — vacant `success`, rented `danger`, renovation `warning` (`:77–89`, kastlan's standard since 2026-09-26, which the reporting dashboard's `occupancyTone`, the vacancy meter and the occupancy pie follow) — unless Marcel decides prod #20 (KX-3) otherwise. `status=` for the other status enums is optional: give them (invoice, lease `:105`, deposit `:175`, request `:225`, dunning `:335`, protocol, period, budget, journal entry) a `status: StatusKind` in `EnumMeta` instead of `tone`, and let `StatusBadge` pass `status=`, e.g. invoices open → `active`, partially paid → `attention`, paid → `good`, overdue → `problem`, cancelled → `inactive`. Categories that are not states (meter type, insurance type, invoice type) keep their hues. |
| Kurvenschmiede | No status chips with a semantic meaning found (`frontend/src`, 2026-10-22). | Nothing; use `status=` for new ones. |

## KIT-9: page titles — `useDocumentTitle`, `PageHeader.documentTitle`, `Breadcrumbs.hideCurrent`

BREAKING (on a bump, no code): a `PageHeader` that is the page's `h1` (the default `as`) with a
**string** `title` now writes the window's title while it is mounted and puts the old one back
when it unmounts. Without `appName` on the provider that title is the page alone ("Units"),
no longer the app's name from `index.html`. And a `Breadcrumbs` passed to a `PageHeader`'s
`breadcrumbs` hides its current entry (the title right below names it); the entry before stays
a link and no entry carries `aria-current`. No trail is drawn when only home entries
(`home: true`, or `href: "/"`) would be left: in a `PageHeader`, and wherever the current entry
is hidden (`hideCurrent`), so a trail the layout draws above the page shows no lone home link.

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
  `BreadcrumbItem.home`, the entry that does not count as a trail on its own.

| App | What changes on a bump | Steps |
|---|---|---|
| keksdose | Its 18 `PageHeader`s with a string title rename the tab to the page ("Budget"); none passes `breadcrumbs`. | Pass `appName={t("app.name")}` to the provider (`shared/i18n/kit-labels.tsx:108`), the name SettingsLayout's title already uses (`settings-page.test.tsx:338` expects `… · app.name`); check app tests that read `document.title`. |
| kastlan | Its pages' `PageHeader`s (65, through `shared/components/display/page-header.tsx:8`) rename the tab. Its trail is drawn by the layout above the page (`app/app-layout.tsx:184`, `shared/components/layout/breadcrumbs.tsx`), outside the header, so it keeps its current entry. | `appName="Kastlan"` on the provider (`app/providers.tsx:79`), which closes prod #21 (KX-4). To stop the trail repeating the title (prod #25, KX-8), either: in `shared/components/layout/breadcrumbs.tsx` pass `hideCurrent` (to both `KitBreadcrumbs`, `:30` and `:57`) **and** mark the root crumb `home: true` — the root route's crumb (`app/routes.tsx:53`) is rewritten to `/dashboard` (`breadcrumbs.tsx:53–54`), not `/`, so it is not home by itself, and with only `hideCurrent` /invoices shows a lone "Dashboard" link — or move the trail into the `PageHeader`'s `breadcrumbs`. A section can go in as `documentTitle={[title, t("nav.group.finance")]}`. |
| Kurvenschmiede | The `PageHeader`s with a string title rename the tab; the settings and admin titles ("Security · Settings · Kurvenschmiede") are `SettingsLayout`'s and do not change. Its two `breadcrumbs` are back links, not `Breadcrumbs` (`features/setpoint/session-page.tsx:340`, `features/corner/corner-page.tsx:315`): unchanged. | `appName={t("app.name")}` on the provider (`main.tsx:85`), as KS's other `appName`s (`settings-page.tsx:227`, `admin-page.tsx:61`). The `document.title` tests (`admin-page.test.tsx:291`, `settings-page.test.tsx:253`) pass on 0.49. |

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
| Kurvenschmiede | `app/chrome-controls.tsx:32` (`LanguageMenu`, no `aria-label`) and `:26` (`AccountMenuLanguage`). The trigger's name is now the kit's "Choose language, current: …". | Nothing in code. 11 tests name the trigger "Language" and take `/choose language/i`: `app/top-bar.test.tsx:38`, `features/auth/auth-shell.test.tsx:51` (×8, one per signed-out page) and `:69`, `features/auth/register-page.test.tsx:73`. `top-bar.test.tsx:54`'s `queryByRole(… "Language")` → `toBeNull()` still passes but proves nothing: it takes the new name too. |

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
| keksdose | `features/assistant/assistant-launcher.tsx:175` `<FloatingPanel hidden={covered}>`, with a MutationObserver over a `COVERING` selector (`:36–53`) for an open editor, modal or bulk bar; `features/transactions/transactions-page.tsx:846` `FloatingActionGroup`, unmounted while the form or the phone selection is open (`:843`). On a bump, from `md` up, `<main>` gets 72px of bottom padding on every route: the launcher mounts at every width on every route but `/assistant` (`assistant-launcher.tsx:146`, `:172`; `app/layout.tsx:173`), and `--app-float-clearance` is 1rem + 3.5rem at Normal, also while the launcher is `hidden`. So the five `fillHeight` tables lose about 72px of body on every desktop screen (about 2.5 compact rows on the register): `features/transactions/transactions-page.tsx:1036`, `features/accounts/accounts-page.tsx:692`, `features/payees/payees-page.tsx:151`, `features/feedback/feedback-page.tsx:230`, `features/feedback/all-feedback-page.tsx:107`. In return the launcher no longer sits over their bottom-end rows (the register's Amount). | On a bump the kit modals and sheets already hide both. Keep `covered` for what is not a kit overlay (the inline editor, the bulk bar), or shrink the `COVERING` selector to those. No app CSS reads `--app-float-clearance`. |
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
- The kit's `InvitationsPanel`: Revoke moves into the row's "⋯" menu (Resend stays an icon
  at Normal) and still asks nothing — its level is `none` (user admin §4.2, re-inviting undoes
  it), so the panel passes `confirm: false`. keksdose's own question in `onRevoke`
  (`features/admin/admin-page.tsx:484`) stays the only one; kastlan and Kurvenschmiede
  change no code, but a test that clicks Revoke opens "⋯" first (Kurvenschmiede's
  `features/admin/admin-page.test.tsx:615`, whose name "in one click" no longer holds).

Every danger row action found below already asks in its `onSelect` — pass `confirm: false`
there, or delete the app's own question and let the kit ask (then `confirm: { title, body }`
for its words). Otherwise the user is asked twice.

| App | Danger row actions (all ask already unless noted) | Steps |
|---|---|---|
| keksdose | 12: `features/accounts/loan-payment-panel.tsx:238`, `accounts/holdings-panel.tsx:661`, `accounts/asset-loan-panel.tsx:128`, `rules/rules-page.tsx:407`, `accounts/accounts-page.tsx:553`, `admin/support-panel.tsx:678`, `budgets/budgets-page.tsx:405` (a two-step confirm inside the row), `budget/group-admin-actions.tsx:94` (dialog), `budget/budget-cells.tsx:341` (`categoryDeleteAction`, dialog), `transactions/transactions-page.tsx:418` (the swipe plan through the app's own `shared/components/swipe-row-actions.tsx:88` `boundSwipeRowActions`, asking in `transaction-swipe-plan.ts:117`; also used by `budget/budget-table.tsx:227`), `admin/users-panel.tsx:732` (roster deactivate, dialog); **`budgets/budget-share-card.tsx:289` "Revoke" asks nothing today** — the kit's question is new there. | `confirm: false` on the ten that ask (once in `swipe-row-actions.tsx`'s `toRowAction` for the swipe-built ones, as the kit's `swipePlanRowActions` does); drop the row's two-step confirm at `budgets-page.tsx:405` for the kit's. `budget-share-card.tsx:289` "Revoke" (a guest's share; re-sharing undoes it) is the same kind of action as InvitationsPanel's Revoke: `confirm: false` there keeps the two alike at level `none` — keksdose's choice; without it the kit asks. Per-row bins outside RowActions: `invoices/vat-summary.tsx:320`, `invoices/invoice-lines-table.tsx:1146` (editing lines of a form: may stay). |
| kastlan | 11: DataTable `shared/components/data-table/resource-list-page.tsx:176` (`kind: "delete"` with `confirm:` — kept as the one question); `accounting/components/journal-entry-columns.tsx:153`, `service-charges/components/distribution-key-columns.tsx:92`, `service-charges/pages/service-charges-list-page.tsx:53`, `platform/pages/platform-signup-invitations-page.tsx:129`, `handover/components/room-inspector.tsx:192`, `property/components/unit-defects-tab.tsx:245`, `property/components/unit-rooms-tab.tsx:214`, roster `settings/components/users-panel.tsx:270`, `:290`, `:308`. | **In the bump commit:** `confirm: false` on the ten outside DataTable; each asks in `onSelect` (the roster's three through kastlan's own dialog, `settings/components/users-panel.tsx:166`), so without it every one asks twice. 9 per-row danger IconButtons that ask (e.g. `contacts/components/contact-addresses-tab.tsx:104`, `meters/components/meter-readings-dialog.tsx:160`) can become `RowActions` with the kit's question. |
| Kurvenschmiede | 7: `setpoint/profile-bar.tsx:171`, `setpoint/segment-parts.tsx:104`, `projects/projects-page.tsx:115`, `teams/team-card.tsx:143` (dialog), `teams/team-card.tsx:250`, roster `admin/users-panel.tsx:348`, `:366`. | **In the bump commit:** `confirm: false` on all seven. Each asks in `onSelect` (`profile-bar.tsx:171` and `segment-parts.tsx:104` through `confirmDelete`, `setpoint/session-page.tsx:299`, `:405`; the rest in place), so a plain bump asks twice. 11 tests click a delete, withdraw or revoke that now sits behind "⋯" and open the menu first: `features/admin/admin-page.test.tsx:366`, `:397` (both also wait for KS's question behind the kit's), `:615` (InvitationsPanel's Revoke), `:753`, `features/projects/projects-page.test.tsx:36`, `:59`, `:76`, `features/setpoint/pages.test.tsx:504`, `features/setpoint/segment-cards.test.tsx:98`, `features/teams/teams-page.test.tsx:95`, `:135`. The curve editor's copy + delete (`SegmentActions`, `segment-parts.tsx:80–110`, and the profile bar) is now a copy icon and a "⋯" holding Delete at Normal; the comment at `segment-parts.tsx:95` ("Two icons at Normal") goes stale. The per-row bin (`deleteColumn`, `shared/lib/table-columns.tsx:62`) becomes a `rowActions` entry in the bump on the four lists KIT-7 names. |

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
