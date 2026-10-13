# MOD: module structure, file size and bundle (ui-kit-034, feat/0.34.0 @ d6212d6)

**Summary.** 10 findings: no sev 4 or 3, seven sev 2 and three sev 1.
**Top 3:** MOD-1: every app's entry chunk carries the feedback dialog stack (~11 KB gzip, PROVEN), plus the command palette in kk/ka (~5.5 KB). MOD-2: `ui.tsx` should be split along a DAG that already exists. MOD-3: `DataTable` is one function of about 1,740 lines.
**Clean:** there are 0 runtime import cycles across 402 modules. Every module is reachable from an entry, and the only new dead code is `floating-stack`'s two exports, already "Open" in adopt-notes. `sideEffects` and `bundle:false` work: `formatMoney` costs 752 B and `seriesKey` 147 B under Rollup.
**Measured how:** I ran Rollup 4.63 (the apps run Vite 7, which uses Rollup) over `ui-kit-034/dist` (built 17:35), with bare imports external and `moduleSideEffects:false` standing in for the `sideEffects` field, then minified with esbuild. I also searched the three apps' fresh `dist` builds (0.33.1, 2026-10-12) for strings unique to each kit module. Scripts are in `scratchpad/MOD/probe/` and `MOD/chunkmap.mjs`.
**Not re-reported:** C9 (done), Q1, T1 and floating-stack (Open). Earlier audits: the 09-22 "tree-shaking assertion can't detect the regression" item is still open (MOD-6). The 09-22 stage-1 subpath plan was replaced by required peers (CHANGELOG.md:893), but the docs still describe the old plan (MOD-7). `data-table.tsx` was 1,449/1,614 lines then and is 3,052 now (MOD-3).

### MOD-1 · sev 2 · efficiency · M · PROVEN · touches: `src/feedback/feedback-submit.tsx`, `src/feedback/feedback-attachment.tsx`, `src/feedback/feedback-record.ts`, `src/feedback/feedback-menu.tsx`, `src/feedback/feedback-inbox.tsx`, `src/search/global-search.tsx`
- What: kit chrome that every app mounts in its top bar statically imports panels that render only when opened. `useFeedbackSubmit` renders `FeedbackDialog` only while `isOpen` (feedback-submit.tsx:195), but imports it at module top (:7), along with `DEFAULT_MAX_ATTACHMENTS` from feedback-attachment.tsx (:4). `FeedbackMenu` pulls the whole inbox module for one constant: `import { FEEDBACK_CATEGORY_META } from "./feedback-inbox"` (feedback-menu.tsx:5). Rollup assigns whole modules to chunks, so all of this lands in each app's entry chunk.
- Evidence:
  - Rollup measurement, the kit's share of a top-bar entry: shell set + `useFeedbackSubmit` is 131,620 B min / 43,110 B gzip. Without it, 99,131 / 32,129. That is Δ 32.5 KB min / **11.0 KB gzip**, mostly feedback-attachment.js (25.8 KB rendered), file-button and modal.
  - `GlobalSearch` adds Δ 14.6 KB min / 5.5 KB gzip (command palette). It imports `CommandPalette` and `useCommandKey` statically (global-search.tsx:9), and the palette returns null while closed (command-palette.tsx:408).
  - All three entry chunks contain feedback-attachment.js (6/8 sampled unique strings), feedback-dialog.js (2/2), feedback-capture.js, feedback-context.js and feedback-inbox.js (6/8): kk `index-LBRVYs8L.js` (331 KB gzip), ka `index-6rVkUQuk.js` (335 KB), KS `index-Bqupo0hh.js` (176 KB). command-palette.js is 8/8 in kk and ka.
  - App wiring: kk top-bar.tsx:5/132 plus use-feedback-submit.ts:26; ka top-bar.tsx:65/126; KS top-bar.tsx:55 plus use-feedback-submit.ts:24.
  - So the feedback stack is about 3% of kk/ka first load and about 6% of KS's.
- Fix:
  - (a) Move `DEFAULT_MAX_ATTACHMENTS` into feedback-record.ts, with feedback-attachment re-exporting it.
  - (b) Move the vocabulary out of feedback-inbox.tsx into a pure `feedback/feedback-vocabulary.ts`: `FeedbackStatus`, `FeedbackCategory`, `*_META`, `*_ORDER`, the transition helpers (lines 66–290). feedback-inbox re-exports them.
  - (c) In useFeedbackSubmit, render `isOpen ? <Suspense fallback={null}><LazySubmitDialog …/></Suspense> : null`. `LazySubmitDialog` is a new `feedback-submit-dialog.tsx` that composes `FeedbackDialog` and `FeedbackContextBox`, loaded by a literal relative `import()`. This package already ships that pattern: the i18n loaders, languages.ts:231.
  - (d) Optionally do the same for `CommandPalette` inside `GlobalSearch`, after moving `useCommandKey` out of command-palette.tsx. Check first that no palette state must survive while it is closed (the hooks above command-palette.tsx:408). Treat this part as PLAUSIBLE.
  - Blast radius: no public API change. Kit tests in feedback-submit.test.tsx (289 lines) and keksdose's feedback-submit-wiring.test.tsx / feedback-environment-badge.test.tsx move from `getBy` to `findBy` after opening. Write an adoption line.
- Order: independent. Re-measure with the MOD-6 probe.

### MOD-2 · sev 2 · structure · L · CONFIRMED · touches: `src/components/ui.tsx`, `src/components/field-parts.tsx`, `src/components/chip.tsx` (+ new modules)
- What: `ui.tsx` holds ten components in 4,295 lines (about 2,470 of code), and 101 kit modules import it. It is the hottest component file: 43 commits in the last 30 days, of 55 total, edited by parallel round agents. Its sections already form a DAG apart from one knot. Splitting it pays most of the giants: maintainability first, plus a small entry-chunk win.
- Evidence:
  - Sections, with bytes in the built dist/components/ui.js:

    | Component | Lines | dist bytes |
    |---|---|---|
    | Button | 49–650 | 9.3 KB |
    | IconButton | 651–1576 | 16.5 KB |
    | field base (FIELD_*, FloatingField, Label, FieldGroup, CharacterCount) | 1577–2290 | 9.0 KB |
    | Input | 2291–2524 | 6.2 KB |
    | Select | 2525–2846 | 5.1 KB |
    | Textarea | 2847–3111 | 6.0 KB |
    | Card | 3112–3482 | 6.7 KB |
    | Spinner | 3483–3558 | 1.1 KB |
    | EmptyState | 3559–3694 | 2.2 KB |
    | Tabs | 3695–4295 | 13.2 KB |

  - Cross-section use is a DAG except one knot: Button uses `ICON_BUTTON_PRESSED` and IconButton uses Button's look maps, `ReasonFrame`, `hasContent` and `RenderedButtonLink`. Spinner, Card and EmptyState are leaves. Input, Select and Textarea depend only on field base. Tabs depends only on IconButton plus lib/strip-fade.
  - Tabs code (the `TABLIST_CLASSES` string) is in all three entry chunks and nowhere else, yet no app shell uses Tabs (kk app/layout.tsx:4, app/top-bar.tsx:5). It rides in on Button. Measured, Tabs adds +5.7 KB min / +1.7 KB gzip to a shell entry.
  - Duplicates the split would absorb: `ChipReasonFrame` (chip.tsx:1045) is a subset of `ReasonFrame` (ui.tsx:604). `hasContent` exists ten times (ui.tsx:379, field-parts.tsx:464 exported, chip.tsx:1078 `hasReason`, danger-confirm.tsx:76, line-items.tsx:220, inline-edit-field.tsx:144, rhf/fields.tsx:168, …).
- Fix:
  - New modules: `spinner.tsx`, `card.tsx`, `empty-state.tsx`, `button-look.ts` (BUTTON_*/ICON_BUTTON_PRESSED/HOVER_INK/buttonClasses/TOUCH_TARGET_LARGE, which breaks the knot), `button.tsx`, `icon-button.tsx`, `field-base.tsx` (FIELD_* constants, FieldChevron, FloatingField, Label, FieldGroup, useFieldError, CharacterCount, password-reveal labels), `input.tsx`, `select.tsx`, `textarea.tsx`, `tabs.tsx`.
  - Move `ReasonFrame` into field-parts and let chip.tsx use it. Drop the local `hasContent` copies in favour of field-parts'.
  - `ui.tsx` becomes a re-export shim (`export * from "./button"` …). The barrel's `export * from "./components/ui"` and the 65 tests that import `../ui` keep working: none mocks it. Then codemod internal imports to the specific module.
  - Blast radius: no public API change, no app change.
- Order: do MOD-4 inside this (the three forwardRef sites are here). It can come before or after MOD-5.

### MOD-3 · sev 2 · structure · L · CONFIRMED · touches: `src/components/data-table.tsx` (+ new modules)
- What: `DataTable` is a single function component from data-table.tsx:1111 to 2850, about 1,740 lines. The file was 1,449 lines (module-audit-2026-09-22.md:358) and 1,614 (refactor-plan-2026-08-24.md:49). It is now 3,052, with 27 commits in 30 days. The state is already out (`useTableState`, use-table-state.ts). What remains is behaviour and JSX that close over about 60 locals.
- Evidence, the self-contained regions:
  - Row actions: 644–719 and 1199–1258.
  - Row keyboard nav and RowLink: 976–1110.
  - Column resize and auto-size: 1557–1688. Only `headRefs`, `widths`, `setWidths`, `columns` and `hiddenCols` come in.
  - Shift-range selection: 1770–1830.
  - Phone card renderer: 1837–2051.
  - Phone branch JSX: 2092–2252.
  - `<thead>`: 2295–2471. `<tbody>`: 2472–2732. Column-settings panel: 2756–2843.
  - The top-level helpers `StackedFields` (835), `MobileSort` (906) and `MobileFilters` (2889–3052) already sit outside.
  - Kit tests import only `DataTable`, `DataTableColumn` and `DEFAULT_DATA_TABLE_SORT_LABELS`, across 28 test files. Of the 13 kit modules that import data-table, 12 do so type-only. The one runtime importer is translation-review.tsx (it renders a DataTable). No runtime SCC.
- Fix, in steps, each one green on its own:
  1. `data-table-row-actions.ts` (resolve/run/toRowAction plus the actions column).
  2. Hook `useColumnResize({headRefs, widths, setWidths, columns, hiddenCols}) → {startResize, moveResize, finishResize, autoSizeAll}`.
  3. Hook `useRangeSelection`.
  4. `data-table-mobile.tsx` (renderMobileRow → `MobileRow`, `MobileSort`, `MobileFilters`, `StackedFields`).
  5. `DataTableHead` and `ColumnSettingsPanel` components.
  - Target: data-table.tsx under ~1,200 lines. Blast radius: none public.
- Order: after MOD-2 if both are done in one round (data-table imports `Card`, `IconButton`, `Select` and `Spinner` from ./ui, data-table.tsx:17).

### MOD-4 · sev 2 · efficiency · M · PROVEN · touches: `src/components/ui.tsx`, `src/components/checkbox.tsx`, `src/components/switch.tsx`, `src/components/chip.tsx`, `src/components/choice-card.tsx`, `src/components/list.tsx` (+14 more)
- What: 25 `forwardRef(...)` calls at module scope (none annotated pure) and 23 `X.displayName = …` assignments stop Rollup from shaking unused components out of a module that is used. Importing `Spinner` keeps Input, Select, Textarea, IconButton and Tooltip.
- Evidence:
  - Rollup, kit code only:
    - `{ Spinner }`: 27,564 B min / 9,728 B gzip, 17 modules.
    - `{ Card }`: 28,435 / 9,936.
    - `{ EmptyState }`: 27,958 / 9,732.
  - forwardRef calls marked `/* @__PURE__ */` only: unchanged. displayName lines removed only: unchanged.
  - Both together: **Spinner 4,298 B / 1,664 B gzip (−85 %)**, Card 4,759 / 1,633, EmptyState 4,243 / 1,448.
  - Sites: forwardRef at ui.tsx:2291, 2595, 3028; chip.tsx:741; checkbox.tsx:151; … (25 in all). displayName at ui.tsx:1301, 2523, 2806, 3110; … (23).
  - React ≥ 19 is the peer floor (package.json peerDependencies). No app uses `ElementRef`/`ComponentRef<typeof X>` (grep of all three apps: 0).
  - For the three apps today the win is close to 0 bytes, because they use these components anyway. It matters per chunk and for small consumers: the landing build, property-management, a pay or landing site.
  - Side note: esbuild also keeps `const ZoomablePlot = withChartZoom(SeriesPlot)` (series-chart.tsx:2012), so `{ seriesKey }` costs 141 KB gzip with recharts there. Rollup drops it (147 B), so no current app is hit.
- Fix:
  - Convert the 25 components to React 19 ref-as-prop (`function Input({ ref, ...props }: InputProps & { ref?: Ref<HTMLInputElement> })`) and delete the displayName lines. The functions are already named.
  - Fallback if that is too wide for one round: `/* @__PURE__ */ forwardRef(...)` plus `Object.assign(/* @__PURE__ */ forwardRef(...), { displayName })`.
  - Blast radius: public types change from `ForwardRefExoticComponent` to function components. That is source-compatible for JSX and `ComponentProps<typeof X>`. CHANGELOG note.
- Order: with MOD-2 (same lines in ui.tsx). Add the MOD-6 cost probe first so the 85 % is pinned.

### MOD-5 · sev 2 · consistency · S · CONFIRMED · touches: `src/index.ts`, `src/data-table.ts`, `src/shell.ts`, `src/chart.ts`, `src/feedback.ts`, `src/__tests__/public-surface.test.ts`
- What: index.ts (921 lines, 149 `export *` statements, 46 commits in 30 days, the hottest file) re-types every subpath list by hand instead of re-exporting the subpath files. The copies have already drifted. Its sections also follow release history, not folders.
- Evidence:
  - Duplicated lists:
    - index.ts:357–373 = feedback.ts:6–22, line for line.
    - index.ts:308–338 ≈ data-table.ts.
    - index.ts:341–348, 676–706 and 740–758 = shell.ts.
    - index.ts:389–395 = wizard.ts. index.ts:398 = tour.ts. index.ts:401–403 = search.ts. index.ts:181–190 and 216 ≈ chart.ts.
  - Drift: `DataTableCellProps` and `DataTableHeadProps` are exported from the barrel (index.ts:319–320) but not from `/data-table` (data-table.ts:15–25). public-surface.test.ts's "strict subset" check compares runtime keys only, so type drift is invisible.
  - Misfiled sections: auth, account and admin sit under the "i18n" header (index.ts:405, 526–672), and the 0.22/0.23 input rounds sit at the bottom (875–921).
  - App use of the alias entries: `/data-table`, `/feedback`, `/search` and `/tour` have **0 imports** in all three apps. `/shell` has 2 (kk), `/wizard` 2 (kk), `/chart` 13 (kk) and 3 (ka). Everything else comes from the barrel (kk 401, ka 372, KS 178 import lines).
- Fix:
  - In index.ts replace each duplicated block with `export * from "./chart"`, `"./data-table"`, `"./feedback"`, `"./shell"`, `"./wizard"`, `"./tour"`, `"./search"`. The same binding from the same origin is not an ESM ambiguity.
  - Regroup the rest by folder: lib, hooks, theme, i18n, components, auth, account, admin, billing, settings, landing, demo.
  - Add the two types to data-table.ts.
  - Optionally have public-surface compare the `.d.ts` names too.
  - Blast radius: public surface counts unchanged except /data-table +2 types. Not breaking.
- Order: independent. Before MOD-10 if the aliases are ever pruned.

### MOD-6 · sev 2 · tests · S · CONFIRMED · touches: `scripts/check-module-graph.mjs`, `src/__tests__/packaging-contract.test.ts`, `src/__tests__/public-surface.test.ts`
- What: the graph check guards the shape, not the regression it was written for (recharts in every app's entry chunk). Its numeric floor is stale, and nothing measures what an import costs. The 09-22 item "CI's tree-shaking assertion cannot detect the regression it exists to prevent" (module-audit-2026-09-22.md:425) is still open.
- Evidence:
  - check-module-graph.mjs:18–22 only asserts that `dist/components/chart.js` imports recharts itself.
  - :31 fails only at `files <= 50`, while dist now has one module per each of the 402 sources. A partial bundling regression would pass.
  - packaging-contract.test.ts:197 asserts the barrel *does* reach recharts. No rule says only the /chart modules may import it, so `import … from "recharts"` added to tooltip.tsx (closure of every component through ui.tsx) would pass CI. Today it is clean: only chart, chart-zoom, pie-chart, series-chart and treemap import recharts, and only facing-pair (also on /chart) reaches them.
  - No cycle guard, although there are 0 runtime cycles today.
  - `/dates` (kastlan 8 import lines, keksdose 2) is in neither public-surface.test.ts `ENTRIES` (:115–263) nor a purity check, unlike `/table-text` and `/testing`.
- Fix:
  - (a) A packaging-contract rule mirroring the rhf one: recharts is imported only by modules exported from src/chart.ts.
  - (b) check-module-graph: floor = the number of non-test `src` modules; plus a runtime-cycle check over dist.
  - (c) Pin `@eifi1/ui-kit/dates` (21 runtime names) in public-surface and assert it reaches no package.
  - (d) A cost budget in `check:build` (dist exists by then): Rollup over dist for `{Button}`, `{Spinner}`, `{cn}` and the shell set, with a byte ceiling. Seed it from MOD/probe/rollup-var.mjs, ~40 lines.
  - Blast radius: CI only.
- Order: first. It measures MOD-1, MOD-2 and MOD-4.

### MOD-7 · sev 2 · docs · XS · CONFIRMED · touches: `README.md`, `src/chart.ts`, `src/index.ts`
- What: the dependency contract in the docs contradicts the manifest and the CHANGELOG. A new consumer, or a maintainer "restoring" an optional peer, reads the wrong thing.
- Evidence:
  - README.md:63: recharts "peer, `>=3` … Only that subpath needs it — the main barrel no longer reaches it". In fact package.json declares `>=3.8` as a REQUIRED peer, the barrel re-exports the whole chart kit (index.ts:181–190, 216), packaging-contract.test.ts:197 asserts the barrel reaches recharts, and CHANGELOG.md:893 says required.
  - src/chart.ts:8: "the only entry point in the package that requires `recharts`". Same error.
  - src/index.ts:384–388 says `use-rhf-wizard-step` was removed "for a hook neither consumer called". It is back, under /rhf (src/rhf.ts:10, src/rhf/use-rhf-wizard-step.ts).
  - README.md:64: lucide "Icons, in 33 modules". It is 94.
  - public-surface.test.ts:59: "the zoom maths is exported because Kurvenschmiede's … own tests use it". KS has no use left (see MOD-10).
- Fix: correct the five sentences. Docs only.
- Order: any time. Fold into the 0.34 docs pass.

### MOD-8 · sev 1 · structure · S · CONFIRMED · touches: `src/components/account-settings.tsx`, `src/components/passkeys-setting.tsx`, `src/hooks/use-file-drop.ts`, `src/components/file-button.tsx`, `src/account/account-parts.ts`, `src/settings/settings-heading.tsx`
- What: there is no file cycle, but four back-edges make folder-level cycles: a few modules live one layer too low.
- Evidence:
  - components/account-settings.tsx:9, 19, 28 import auth/form-rules, settings/settings-heading and auth/auth-errors. components/passkeys-setting.tsx imports settings/settings-heading. Both are account setting cards, siblings of account/email-change-setting.tsx and the others.
  - hooks/use-file-drop.ts:3 imports `useFilePicker` (a hook) from components/file-button.tsx.
  - account/*-setting.tsx → settings/settings-heading.tsx → account/account-parts.ts (`CARD_TITLE_CLASS`, settings-heading.tsx:4 and settings-section.tsx:5).
- Fix:
  - Move account-settings.tsx (ProfileSetting, PasswordSetting, TwoFactorSetting) and passkeys-setting.tsx to account/. That touches 8 test files' import paths; the barrel line is updated.
  - Move `useFilePicker` and the screening helpers to `hooks/use-file-picker.ts`, with file-button re-exporting them.
  - Move the card title/description classes from account-parts to settings/ (or components/), the owner of the card look.
  - Blast radius: none public.
- Order: independent. Cheap to do after MOD-2.

### MOD-9 · sev 1 · structure · M · CONFIRMED · touches: `src/components/series-chart.tsx`, `src/components/date-picker.tsx`, `src/components/combobox.tsx`, `src/components/chip.tsx`, `src/rhf/fields.tsx`
- What: the other files over about 1,200 lines (code lines in brackets). Each has one clear seam. None pays like MOD-2 or MOD-3.
- Evidence:
  - series-chart.tsx, 2,046 (1,293): `SeriesPlot` is one function (1264–2012). The pure axis/series helpers (677–1050: `paddedDomain`, `padBand`, `mergeSeries`, `seriesKey`, `xModel`, …) are what KS imports in non-chart files (curve-chart-model.ts:1).
  - date-picker.tsx, 1,719 (1,233): the shared `DateField`/`DateFieldTrigger` (227–582) and `JumpCalendar` (707–1003), then `DatePicker` (1004–1253) and `DateRangePicker` (1254–1719).
  - combobox.tsx, 1,508 (960): `Combobox` (294–785) and `InlineEntityCombobox` (786–1508).
  - chip.tsx, 1,431 (970): module-level edge-snap engine with mutable state (328–500), `Chip` (741), `ChipInput` (1092–1431).
  - rhf/fields.tsx, 2,161: 20 flat adapters behind the optional /rhf entry, used only by kastlan. **Leave it.**
  - app-shell.tsx (1,271), feedback-attachment.tsx (1,250) and tooltip.tsx (1,166) are cohesive. Leave them.
  - The i18n locale files (~1,600 lines each) are data.
- Fix:
  - `series-chart-axes.ts`: pure, with series-chart re-exporting it.
  - `date-field.tsx` and `jump-calendar.tsx`, plus `date-range-picker.tsx`.
  - `inline-entity-combobox.tsx`.
  - `lib/chip-edge-snap.ts` and `chip-input.tsx`.
  - Every one keeps re-exports from the old module. No public change.
- Order: after MOD-2. Do them opportunistically, when a round touches the file anyway.

### MOD-10 · sev 1 · structure · S (decision) · CONFIRMED · touches: `src/index.ts`, `src/components/chart-zoom.tsx`, `src/lib/translation-review.ts`, `src/feedback/feedback-record.ts`
- What: `export *` over modules whose helpers exist for the kit has grown the public surface to 886 runtime names (barrel). 440 are imported by no app (production or tests), and 214 of those are not even in the showcase. Each one is pinned by public-surface and owed docs and semver.
- Evidence:
  - Counted from the three apps' import clauses and the showcase.
  - Largest app-unused groups: chart-zoom.tsx (13: `fitXToY`, `fitYToX`, `selectionFromDrag`, `zoomAfter`, `zoomDomains`, `NO_ZOOM`, `ZOOM_MIN_DRAG`, …), whose public rationale is stale (MOD-7). lib/translation-review.ts (13 pure helpers that only TranslationReviewPanel consumes). feedback-record.ts (12). feedback-row-detail.tsx (7). feedback-table.tsx (5).
  - The four alias entries with 0 app imports are listed in MOD-5.
  - The barrel already names some modules on purpose ("Named, not `*` … internal", index.ts:130, 169, 247, 262, 272). The policy exists but is applied unevenly.
- Fix: for the next breaking round, switch the groups above to named exports and drop the app-unused, non-showcased helpers (or mark them `@internal` and stop pinning them). Decide then whether to keep the alias entries. Breaking, so it needs a CHANGELOG entry. Today there are 0 app call sites to migrate for the names listed.
- Order: after MOD-5. In a breaking release only.
