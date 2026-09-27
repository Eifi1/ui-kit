# Adopting `@eifi1/ui-kit` 0.14 — per repository

Built from keksdose's notes on adopting 0.13 (G3b–G8). Everything is additive. There
is one visible change, and it is marked. `CHANGELOG.md` → `0.14.0` has the release notes,
and the showcase (⌘K) has every prop live.

## Everyone

1. Bump to `^0.14.0` by hand; a caret below 1.0 locks the minor version.
2. **Visible change:** a tooltip bubble shown in place (not portalled), including a
   `lazy` one, now slides back inside the viewport when it opens and would hang off an
   edge. It moves on its cross axis only, and a bubble that fits is untouched. jsdom has
   no layout, so app tests see no difference.
3. **New label key** (only if you type a complete `UiKitLabels`):
   `feedbackComposer.sendHintEnter`. Every `@eifi1/ui-kit/i18n/<code>` catalogue has it.

---

## keksdose

| Gap | Use | Notes |
|---|---|---|
| G3b placement passed to `onReport` through a closure | `<ErrorBoundary placement="app" \| "page">` | in `CrashReport.placement`, the copied report and the dedupe fingerprint |
| G4 support-thread event lines | `FeedbackThread` items with `kind: "event"` | centred, no author; `body` is a ReactNode and is **not** tagged `data-private`, so wrap a name in your own `<span data-private>` |
| G4 day groups and HH:MM times | `daySeparators`, `timeFormat="clock"` | "Today" / "Yesterday" come from `Intl`; the full-date Tooltip stays |
| G5 Enter sends, Shift+Enter breaks the line | `FeedbackComposer sendOn="enter"` | never sends during IME composition; Ctrl/⌘+Enter still sends |
| G5 up to N files uploaded ahead | `attachmentSlot={…}` + `canSend` | `canSend` true lets an empty draft send (`onSend("", null)`), false blocks it (upload running); the refs stay in your state |
| G6a payees-page truncating span | `PageHeader truncateTitle` | |
| G6b budget-page two phone rows | `PageHeader secondaryActions={toggles} actions={monthNav}` | a row of its own below `sm` (640px), joining the actions row from `sm` up. Your page switched at `md`, so between 640 and 767px it is now one row |
| G7 `portal` pins for long labels at a row's edge (jobs-panel gcloud command, canned replies) | drop them | in-place bubbles clamp to the viewport |
| G8 reports-page centred CurrencySelect | `PageHeader actionsAlign="center"` | from 0.14.1 it aligns the whole row, title included (H2) |
| K1 (0.14.2) title-only feedback reports | `FeedbackDialog requireBody={false}` | the body's label becomes `feedbackDialog.bodyOptional` ("What happened? (optional)") unless you pass `labels.body`; a subject of spaces is never sendable |
| (0.14.2) budget header three rows at 390px | nothing to do | once the actions have wrapped below the title, `secondaryActions` shares their row if it fits; while the actions sit beside the title, it keeps a row of its own |
| H1 (0.14.1) budget header split "Monatsbudg" / "et" at 390px | nothing to do | in `inline` without `truncateTitle`, the title keeps its longest word and the actions wrap to their own line instead |

## kastlan

| Gap | Use | Notes |
|---|---|---|
| 51 building-step construction year, document-upload entity id: `NumberField digits={0} calculator={false}` | `IntegerField` | the plain preset `RhfIntegerField` applies to a form field; each default overridable |
| 52 new-budget-page per-row CHF amount on `NumberField` | `MoneyField value={row.amount} onCommit={(amount) => …} currency="CHF"` | number in, number out; `onCommit` only on a settled figure (blur, Enter, calculator result), rounded to the minor unit and clamped to `min`/`max`, never twice for the same amount |
| any AmountInput host that needs settled figures only | `AmountInput onCommit={(text) => …}` | the settled dot-decimal text; `onChange` still reports every keystroke |
