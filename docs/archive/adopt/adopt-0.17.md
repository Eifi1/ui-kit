# Adopting `@eifi1/ui-kit` 0.17

Built from kastlan's 54–58 and keksdose's Q1–Q9 on 0.16.1. Everything is opt-in API
except the two visible changes listed first. `CHANGELOG.md` → `0.17.0` has the release
notes, and the showcase (⌘K) has every prop live.

## Everyone

1. Bump to `^0.17.0` by hand; a caret below 1.0 locks the minor version.
2. **Visible changes:**
   - **LineItems `fieldLabels="floating"`:** the remove button is now centred against the
     row (`removeAlign` defaults to `"center"` when a column floats its label). It sat
     high next to the taller floating fields. A row whose fields show a message under
     themselves should pin `removeAlign="start"`.
   - **LineItems `summary.tone` without a `value`** now colours the label. Before, the
     tone did nothing in that case.

## New, opt-in

| Area | API |
|---|---|
| DataTable (kastlan 54) | `column.footer: (rows, page) => ReactNode` and `footerLabel` — a `<tfoot>` totals row (sticky at the bottom of the scroller, follows hidden, reordered and resized columns), a labelled summary card under the list on phones. `rows` is every filtered row in sort order, not the page. Under `serverPagination` return your server's totals: `footer: () => fmt(resp.totalDebit)`. `footer={false}` hides it |
| GlobalSearch (kastlan 56) | `source.groups: (string \| { key, label })[]` — one request fills several groups. Each entry names its `group` by key; declared order wins, `limit` caps each group, an undeclared group falls into `source.group`. One "Searching…" line, one error line |
| i18n (kastlan 58) | `@eifi1/ui-kit/i18n/en` → `uiKitLabelsEn(numberLocale = "en-US")`: the English defaults with every count grouped through `Intl.NumberFormat`. `labels={uiKitLabelsEn("en-CH")}` gives `12'345` (the apostrophe is whatever your ICU prints for en-CH). `DEFAULT_UI_KIT_LABELS` is unchanged and still prints raw counts |
| LineItems (kastlan 55, Q1, Q2) | `summary.status` (a chip beside the value), `summary.tone` `"income"` / `"expense"`, `summary.action.variant="link"`, `removePlacement="inline"` (the remove button beside the last field on the phone card; the last column's `narrowSpan` carries over), `removeAlign` |
| Card (Q3) | `density="compact"` (smaller title and description, tighter header; a class on a part still wins), `toneFill` (the tone's wash over the surface, on soft, strong and outline; opaque in dark mode) |
| Delta / SignedAmount (Q4) | `ratio={false}` with `unit="percent"`: the value and `flatWithin` are percent points, no dividing by 100 |
| ProgressBar (Q6) | `sensitive` — `data-private` on every figure it prints (value, legend values, overage); names, swatches and `aria-valuetext` stay |
| FormActions (Q7) | `placement={{ base: "sticky", md: "inline" }}` (per breakpoint, mobile first), `bleed` (the sticky row reaches the padded pane's edges, only while sticky) |

Docs only: ListItem `renderRow` receives the row box, not the target, so a guard that
clones props can't disable the button; pass `disabled` to the ListItem (Q5). `content`
spans the text column only. AmountInput `digits`: set it for any scale finer than the
currency's (`digits={4}` for a 4dp ledger), or a tab through the field rounds and commits
(Q8). Both are pinned by tests.

Q9 (does the kit's no-native-title guard catch the 0.16.0 FileButton?): yes. The guard
reads the whole opening tag, nested `{…}` included, and flags `file-button.tsx:584` on
0.16.0's code.

## kastlan

- Trial balance: drop the strip under the table for `footer` on Debit, Credit and Balance
  plus `footerLabel="Total"`.
- Search: `buildEntitySources` / `createSharedSearch` can become one source with
  `groups: ENTITY_TYPES.map((k) => ({ key: k, label: groupLabels[k] }))` and
  `group: r.entity_type` on each entry.
- Journal: `summary.status` for the balanced/unbalanced chip.
- Labels: `labels={uiKitLabelsEn("en-CH")}`, or merge your overrides over it.
- §7 of the module audit (charts) is marked superseded for kastlan's charts (57).
