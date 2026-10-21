# Adopting `@eifi1/ui-kit` 0.47 and `eifi1-server-kit` 0.18

ui-kit 0.47 removes what 0.46 deprecated for removal in 0.47 (the zone is automatic only,
notifications §10.3 amended 2026-10-20), so a bump can break a build that still names one of
them; none of the three apps does (checked 2026-10-20, below). Two changes show on a plain
bump of a table: an expanded `DataTable` row is pinned to the width the table's scroller
shows (keksdose S4), and nothing else moves. `RowActionsHead` and `ROW_ACTIONS_CELL_CLASS`
are new, for a hand-built table's actions column (keksdose N17). server-kit 0.18 refuses a
sent `timezone`, as 0.16 announced (its own section; S18). After the bump, regenerate the
API types (`npm run generate:api` or the app's own).

## Removed in 0.47 (deprecated in 0.46)

| Removed | Instead |
| --- | --- |
| `notifications/time-zone-select`: `TimeZoneSelect`, `TimeZoneSelectProps`, `timeZoneOptions`, and its `deviceTimeZone` alias | No picker: the zone is the account's, the device last used. `deviceTimeZone` from the package root (notifications/device-zone-report, since 0.46.1) — same function |
| `QuietHoursSetting`'s `timezone` prop | `zone` (`/auth/me`'s `device_timezone`); left out or `null`, the card names `fallbackZone` |
| `NotificationSettingsPatch.timezone` | Nothing: no card sends a zone, and server-kit refuses one |
| `NotificationsLabels.timeZone`, `.deviceZone`, `.useDeviceZone`, `.byEmail` | Nothing: unused since 0.46 (the channel columns are `channelApp` / `channelPush` / `channelEmail`). `regions` stays: `quietZone` names the zone with it |
| `FeedbackDetailLabels.openPage` (`feedbackDetail.openPage`) | Nothing: the Replies section's "Open page" button went in 0.46 (keksdose live #449). `feedbackTable.openPage` stays |

The keys are gone from all seven catalogues. An app override that still sets one is now a
TypeScript error (an excess property in `LabelOverride<…>`): delete the line, and the app's
own catalogue key if nothing else reads it.

| App | Uses of a removed name |
| --- | --- |
| keksdose | None. `QuietHoursSetting` passes `zone` (frontend/src/features/auth/notification-settings-cards.tsx:225-229); its `notifications` override (`:43-90`) sets none of the four keys. The stale worktree under `.claude/worktrees/` is not the app |
| kastlan | None |
| kurvenschmiede | None |

## A hand-built table's actions column (keksdose N17)

`rowActionsColumn` gives a `DataTable` a visible, end-aligned "Actions" heading over a cell
that hugs its buttons (0.46.1). A table built from `Table` / `TableRow` had no kit way to
match it. New in the barrel:

- **`RowActionsHead`** — the `<th>`: the provider's `rowActions.actions` ("Actions"), or its
  children; `align="end"`, `w-px`. Every `TableHeaderCell` prop passes on (`size`, the app's
  `className` merged last); `hideLabel` names it for a screen reader only (the column's
  `header: false`).
- **`ROW_ACTIONS_CELL_CLASS`** (`"w-px whitespace-nowrap text-end"`) for the `<TableCell>`
  around each row's `RowActions`, and **`ROW_ACTIONS_HEAD_CLASS`** (`"w-px text-end"`).
  `rowActionsColumn` reads the same two, so the columns cannot drift apart.

```tsx
<RowActionsHead size="sm" className={TH}>{t("common.actions")}</RowActionsHead>
…
<TableCell className={ROW_ACTIONS_CELL_CLASS}>
  <RowActions actions={actions} name={actionsName} collapse={actionsCollapse} tooltipSide="start" />
</TableCell>
```

| App | Change |
| --- | --- |
| keksdose | budget-table.tsx:434-436: the `TableHeaderCell` with `cn(TH, "w-px whitespace-nowrap")` becomes `<RowActionsHead size="sm" className={TH}>{t("common.actions")}</RowActionsHead>` (or no children for the kit's word) — the heading is end-aligned over the buttons now. budget-row.tsx:186: `className="w-px whitespace-nowrap"` becomes `className={ROW_ACTIONS_CELL_CLASS}` (adds `text-end`) |
| kastlan | Nothing: its `RowActions` outside a `DataTable` are in lists, not tables (room-inspector, unit-rooms-tab, unit-defects-tab) |
| kurvenschmiede | Nothing: the same (team-card, projects-page, profile-bar, segment-parts) |

## An expanded row stays in view on a wide table (keksdose S4)

An expanded `DataTable` row spanned the TABLE, so on a table wider than its scroller an
inline editor's Save / Cancel sat past the visible edge (keksdose at 1440x900: table 1389 px,
scroller 1073 px, the buttons at x 1577-1633). From 0.47 the expansion's content is pinned
to what the scroller shows: `sticky start-0` (the right edge in RTL) and a width from a
ResizeObserver on the scroller's `clientWidth` (`--dt-visible-w`). The `w-0 min-w-full`
cell wrapper stays, so an expansion still never resizes the columns above it (feedback
#104). A table no wider than its scroller looks as before. Checked in headless Chromium,
LTR and RTL: a 1400 px table in a 685 px scroller, scrolled to either end, the panel covers
exactly the visible 685 px and a Save at its end stays on screen.

On a plain bump; nothing to change. What to look at: an expansion that relied on being as
wide as the table (content meant to scroll sideways with the columns) now stays put and
wraps within the visible width; give that content its own `overflow-x-auto` if it must
scroll.

| App | Expanded tables to look at after the bump |
| --- | --- |
| keksdose | The inline editors this was for: accounts-page.tsx:798 (`renderEditor`), transactions-page.tsx:983 (`renderRow`), invoice-lines-table.tsx:1923; also payees-page.tsx:175, users-panel.tsx:929, feedback-page.tsx:234, jobs-panel.tsx:239 |
| kastlan | feedback-page.tsx:158 (FeedbackRowDetail) |
| kurvenschmiede | feedback-page.tsx:195 (FeedbackRowDetail) |

## server-kit 0.18

(S18 — the sent `timezone` refused on the settings PATCH, the `/push/settings` shim and
`PATCH /auth/me`; the push bodies documented in OpenAPI again; the two-422-shapes note.)
