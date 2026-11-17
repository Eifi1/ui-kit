# Adopting `@eifi1/ui-kit` 0.65

ui-kit 0.65 lifts the sort a hand-built table had to copy: keksdose's budget page (dev #679,
Marcel 2026-11-15) sorts every category by Available on a static `Table`, and copied
DataTable's sortable header and its phone "Sort by" row to do it.

**From 0.64, nothing else first.** No new words, no breaking change.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

## New

- **`TableHeaderCell sort={{ dir, onToggle }}`** — the header becomes DataTable's sort button:
  the header, then its arrow (both ways at 40 % while `dir` is `null`, up or down while
  sorted), and the cell says the sort with `aria-sort` (`none` while unsorted). The button is
  inline, so `numeric` and `align` still place it. The caller holds the sort and orders the
  rows; `onToggle` is the press (it gets the click, so a Shift-press can add a second key).
- **`SortStrip`** — DataTable's phone sort row for any list: a labelled "Sort by" select and a
  direction button. `options` (`{ value, label }`), `value` (`null` = the rows' own order),
  `dir`, `onPick(value | null)`, `onFlip()`; `offerDefault` adds "Default order", `compact`
  the smaller controls. Its words are the provider's `dataTable` ones (`sortBy`,
  `sortDefault`, `sortAscending`, `sortDescending`), over which `labels` writes. DataTable's
  `mobileSort` is now this strip on the table's own sort; it looks and behaves as before.
  The select takes the strip's free width: over a wide container cap the strip with
  `className` (`md:max-w-sm`), or the select reads as a text field.

## What an app does

**keksdose:** the budget page's copies go — the phone's `MobileSort` copy becomes
`<SortStrip options={…} value={key} dir={dir} onPick={…} onFlip={…} />` (its own
`useKitLabels("dataTable", …)` call goes with it), and the desktop heading's copied button
becomes `<TableHeaderCell numeric sort={{ dir: key === "available" ? dir : null, onToggle }}>`.

**Kurvenschmiede, Staunlabor:** nothing.

## 0.65.1 — the dependency audit

picomatch's GHSA-fc5q-39xc-vjpf (ReDoS, high, `<=4.0.7`, no patched version; 2026-11-17)
reaches every repo through vite, vitest and typescript-eslint — build and test tools only —
and a bare `npm audit --audit-level=high` stops every push. Marcel: accept it until it is
fixed. The kit ships the tool for that: the bin **`eifi1-npm-audit`** (README → The
dependency audit), with server-kit's rule `--ignore-until-fixed ID=reason`.

**Every app:** replace `npm audit --audit-level=high` in `check:security:frontend` and in
CI's security step (`npm run check:security:frontend`) with

```json
"check:security:frontend": "eifi1-npm-audit --ignore-until-fixed \"GHSA-fc5q-39xc-vjpf=picomatch ReDoS; build and test tools only; no fix yet\""
```

Staunlabor's interim `scripts/npm-audit.mjs` goes with it. When picomatch ships a fix, the
gate says so: bump, then drop the exception.
