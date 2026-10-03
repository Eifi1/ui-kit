# Adopting `@eifi1/ui-kit` 0.25

keksdose's feedback run 72 (live, Marcel on a phone) and the polish list the apps left on
0.24, in one release (Marcel). `CHANGELOG.md` → `0.25.0` has the release notes, and the
showcase (⌘K) has every part live.

## Everyone

1. Bump to `^0.25.0` by hand; a caret below 1.0 locks the minor version.
2. **Fixes you will see:**
   - **A tap leaves no tooltip behind (keksdose live #379):** on touch and pen the
     emulated `mouseenter` and the focus a tap gives no longer show the bubble, and any
     outside press closes an open one — the top-bar icons, the sync indicator and row
     actions kept "Synced at 03:05 PM — Tap to sync now…" up until the next tap
     elsewhere. Keyboard focus still shows it; after a mouse press focus follows
     `:focus-visible` (a clicked button's bubble goes when the pointer leaves, a clicked
     text field keeps it). A tap on something that activates nothing — a locked or
     disabled control, plain text — toggles its bubble, since that is the only answer
     to the tap (`tap="auto"`); FieldHint's "?" toggles too.
   - **The in-place bubble never widens the page (keksdose live #381):** it is clamped
     against the page's own width and slid by margin — the stuck bubble had grown a
     406px phone page to 426px and pushed the help assistant's panel 17px off the glass.
   - **The scroll lock holds under a clipped `<html>`:** an app with `html, body {
     overflow-x: clip }` (keksdose's guard) kept a scrollable page behind every Modal,
     sheet and palette; the lock now takes `<html>` too in that case. **keksdose:** the
     guard can go — the tooltip that needed it no longer overflows.
   - **`useSearchParamState` setters compose (keksdose live #378):** react-router (7 and
     8) hands `setSearchParams`' updater the params of the last RENDER, so setters
     called in a row each wrote back the others' old values — four filter setters in
     one `onFilterChange` and no select had any effect. Writes now build on each other
     (in one handler or across hooks), a handler adds at most one history entry (push if
     any changing write asked to), a write that changes nothing no longer navigates, and
     a functional updater runs once. If you worked around it with one raw
     `setSearchParams`, that keeps working; `useSearchParamsState` (below) is the
     intended form.
   - **Textarea:** a line half hidden under the floated label's strip is covered to its
     end (the comma tails Kurvenschmiede saw); a mostly visible one gets a 3px soft
     edge; nothing at rest.
   - **ColumnMapper / ColumnRoleTable:** a required role reads "Name \*" (still
     "Name (required)" to a screen reader), and a role select takes its own width up to
     14rem, so a phone no longer cuts the name. The edge fade is Table's own now
     (`data-overflow` moved from the slot `<div>` to Table's scroll wrapper).
   - **DataTable's page-size select** shows an off-step size (a `defaultPageSize` of 5
     showed "10"); **SwipeableRow** no longer animates its snap-back under reduced
     motion.
   - **TranslationReviewPanel:** `onSave` and `onClear` get a second argument
     `{ origin, toasted }`; a `toHaveBeenCalledWith(writes)` on them now fails.
3. **New label keys** `translationReview.approvedToast`, `groupCount`, `approveGroup`,
   `confirmGroup` (required — an app spreading its own complete `translationReview`
   object must add them) and the optional `columnMapper.requiredRoleShort`
   (`missingKitLabels` lists it for a catalogue made before 0.25) — in every catalogue.

## New, opt-in

| Area | API |
|---|---|
| URL state (keksdose #378) | `useSearchParamsState({ status: { default: "all" }, ns: { param: "area", default: "" }, … })` → `[values, set]`: one setter for several keys, `set(partial)` or `set((prev) => partial)`, one navigation; each field takes the single hook's options plus `default` and `param`. Types `SearchParamField`, `SearchParamFields`, `SearchParamsUpdate`. For TranslationReviewPanel: `filter={filter} onFilterChange={setFilter}` |
| Translation review (keksdose #377) | `swipe` — on the phone cards toward the end approves, toward the start opens the editor in the wording (none under a lock, read-only, an open editor or a write in flight; writes run one at a time); `groupBy="namespace"` (or `"source"`, or a function) — a disclosure per area with "n unreviewed / total" and "Approve unreviewed (n)" (one write, one Undo, a confirm above a page's worth; folded on a phone when there are several), `groupLabel`, `groupHeadingAs`; `undo` — every approval offers the kit's Undo toast (default on with `swipe` or `groupBy`; the clearing half needs `onClear`); helpers `groupTranslationRows`, `unreviewedRows`, `reviewUndo` |
| Tables | `edgeFade` on Table and DataTable (desktop table): a table that scrolls sideways fades at the cut edge — measured, RTL-aware, a focused control scrolls clear, scrollbars stay opaque |
| Feedback | FeedbackDialog `attachmentButtonVariant` / `attachmentButtonSize`; FeedbackNoteEditor's `attachment.buttonVariant` / `buttonSize` (0.24's field props, passed through) |
| Tooltip | `tap="auto" \| "toggle" \| "ignore"` (type `TooltipTap`): what a touch tap on the trigger does — `"auto"` (default) toggles only on a trigger a tap cannot activate; `"toggle"` for a button that exists to explain (your own "?" or info icons); `"ignore"` never shows on touch |

## keksdose

- The translation review page: `<TranslationReviewPanel … swipe groupBy="namespace"
  filter={filter} onFilterChange={setFilter} onSave={(writes, { toasted }) =>
  save.mutateAsync({ items: writes.map(toApiWrite), quiet: toasted })} onClear={(keys) =>
  clear.mutateAsync(keys)} />` with `const [filter, setFilter] = useSearchParamsState({
  … })` — and the mutation's `onSuccess` skips its own `toast.success` when `quiet` is set,
  or each approval toasts twice. Your one-call `setSearchParams` workaround can go.
- `html, body { overflow-x: clip }` can go (see "Everyone"); if you keep it, 0.25's
  scroll lock copes with it. An explain-only icon button of yours gets `tap="toggle"`.

## kastlan and Kurvenschmiede

- If an `onFilterChange` (or any handler) of yours calls several `useSearchParamState`
  setters in a row, it was losing all but the last write before 0.25; it works now —
  `useSearchParamsState` is the tidier form.

## 0.25.1

- **TranslationReviewPanel `groupBy` on a wide screen (keksdose):** every group used to
  start open — keksdose's 122 areas drew ~2,000 rows and ~44k elements (2.9s to appear,
  2s per filter click; a page test went from 4s to 146s). Groups now start open only
  while that renders at most `max(100, pageSize)` rows, else folded, and a folded group's
  body is not rendered (2,147 elements, 0.36s, 0.13s). `defaultGroupsOpen` (`true` /
  `false` / `"auto"`, the default) chooses. **kastlan:** your desktop review now starts
  folded; `defaultGroupsOpen` restores all-open. keksdose can pass `groupBy` on every
  screen again.
- **A filter not written back:** development builds warn once per field when
  `onFilterChange` changed a field the app passes in `filter` but never wrote back (the
  control snapped back silently — Kurvenschmiede's `placeholdersOnly`). Write back every
  field `onFilterChange` reports, in one update, or leave a field out of `filter` and the
  panel keeps it.
- **`useSearchParamsState<YourInterface>(…)`** works (the constraint is `object`, not
  `Record<string, unknown>` — TS2344 before, Kurvenschmiede).
- **Test mocks of react-router (keksdose):** a `vi.mock("react-router", () => ({ … }))`
  without the original module threw at import ("No `UNSAFE_DataRouterContext` export is
  defined on the mock") since 0.25.0; the kit reads that context defensively now. A
  partial mock (`importOriginal`) was and stays the safer pattern.
