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

## Tabs' `overflowCue`: a ‹ and a ›, each only while its side hides tabs (keksdose live #410 r4)

The 0.40 caret was ONE › at the strip's end that turned into "back to the first tab" (‹) once
the strip was scrolled through — read as an arrow pointing the wrong way. Now a › sits OVER the
strip's end while tabs lie past it and a ‹ over its start while tabs lie before it (start/end
follow the reading direction); each steps three quarters of the width toward its own side and
never turns round. Positioned over the strip, so its width never changes as they come and go.
Same prop, no code change for a caller of `overflowCue`. Labels: `tabs.more` stays; new
`tabs.previous` ("Previous tabs", all seven catalogues); `tabs.backToFirst` is deprecated —
accepted, ignored, removed in 0.48 (an override that sets it: delete the line).

| App | Change |
| --- | --- |
| keksdose | Its own `ScrollEdgeCues` can go: delete frontend/src/shared/components/scroll-edge-cues.tsx; in features/reports/reports-page.tsx drop the import (:6) and the wrapper (:371-375, :383), and give the `Tabs` (:376) `overflowCue labels={{ more: t("reports.tabs_more"), previous: t("reports.tabs_previous") }}`; refresh the round-4 comment (:367-369) |
| kastlan | Nothing: no `overflowCue` |
| kurvenschmiede | Nothing to change; gear/sheet-tabs.tsx:76-78's comment ("a ‹ back to the first at it") is out of date |

## `color-scheme` follows the theme (keksdose dev #600)

The theme store toggled `html.dark` but never told the browser, so what it paints itself — a
native `<select>`'s open list, a date input's popup, scrollbars, autofill — stayed light on
the dark theme. `useApplyTheme` and the pre-paint `applyPersistedTheme` now set
`color-scheme: light | dark` inline on `<html>` with the class. All three apps call both
(keksdose main.tsx:44, kastlan main.tsx:22, kurvenschmiede main.tsx:39): nothing to do.

| App | Change |
| --- | --- |
| keksdose | frontend/src/app.css:31-42 (the comment and the `:root` / `:root.dark` `color-scheme` rules) can go |
| kastlan | Nothing |
| kurvenschmiede | Nothing |

## server-kit 0.18

(S18 — the sent `timezone` refused on the settings PATCH, the `/push/settings` shim and
`PATCH /auth/me`; the push bodies documented in OpenAPI again; the two-422-shapes note.)

## Attachments on admin replies and public comments, pictures inline (keksdose run 82 R1, live #447)

Feedback contract §12 (settled by Marcel 2026-10-21; review it in the build review, §12.6).
The admin's reply composer takes one file exactly as the rework note does — a screenshot
pasted into the box, a capture, a pick; the contract's types and 10 MB — and so does the
comment box. **server-kit 0.18:** `FeedbackReplyCreate` and `FeedbackCommentCreate` gain an
optional `attachment_url` (your policy, else 422), stored in the existing
`feedback_replies.attachment_url` and a NEW `feedback_comments.attachment_url`;
`FeedbackCommentResponse.attachment_url` is shown to whoever reads the comment's body (null
when hidden from them); a reply's file stays with the admin and the author.
`FeedbackCommentRow` now needs the column, `urls_named_except` counts every entry's and
comment's file on every report, and an erased person's comment loses its file (purged with
the keys). **ui-kit 0.47:** `onReply(body, status?, attachmentUrl?)`,
`onComment(body, attachmentUrl?)` — the extra argument only with a file, so a text reply or
comment calls exactly as before; `onUpload` / `onCaptureScreenshot` / `attachment` /
`fetcher` on `FeedbackReplyComposer`, `FeedbackCommentThread` and `FeedbackPublicDetail`
(`FeedbackRowDetail` hands its own on). Every entry's and comment's picture is drawn inline
(`FeedbackEntryFile`), a tap opens it full size. The row detail's Attachment section keeps
the report's own files; a rework's file now shows under its entry in the timeline. A
text-only body is unchanged on the wire, so no existing test of `/replies` or `/comments`
breaks (checked: none asserts a 422 on an extra field there, none pins an exact key set).

Migration (the comment column, nullable, no backfill; downgrade drops it):

```python
# keksdose: after 0133_notification_queue — Text, as 0130's feedback_replies.attachment_url
op.add_column("feedback_comments", sa.Column("attachment_url", sa.Text(), nullable=True))
# Kurvenschmiede: after 0056 — String(500), plaintext like feedback_replies.attachment_url
op.add_column("feedback_comments", sa.Column("attachment_url", sa.String(500), nullable=True))
```

| App | Migration and model | Reply route / store | Comment route / store | Erasure, files, client | Tests that pin the old bodies |
| --- | --- | --- | --- | --- | --- |
| keksdose | New step after `alembic/versions/20261020_0133_notification_queue.py` (model it on `20261014_0128_public_feedback.py:96-98`'s `add_column`); `FeedbackComment` gains `attachment_url` (domain/models/feedback.py:108-121, beside `FeedbackReply.attachment_url` :155) | Nothing to change: `FeedbackDeps` (adapters/api/feedback_router.py:108-129) mounts the kit's body; `SqlAlchemyReplyStore.add` already writes `attachment_url` (adapters/persistence/feedback_public_stores.py:76). Pass `reply_model=`/`comment_model=` subclasses with `FEEDBACK_ATTACHMENTS` (domain/schemas/feedback.py:46, subclasses :49-58) so the 422 names your keys | `SqlAlchemyCommentStore.add` (feedback_public_stores.py:135-140) writes `attachment_url=new.attachment_url` | `urls_named_except` (adapters/persistence/feedback_repository.py:119-135): drop the `not_in(row_ids)` on the replies query (:132-134) and add `FeedbackComment.attachment_url`; the purge (domain/services/budgets_service.py:1259-1267, :1393) takes the new keys as they are. Storage reads any key for any signed-in user (adapters/external/feedback_attachment_storage.py:32): no change. Client: frontend/src/shared/api/endpoints.ts:1287-1288 (reply `{body,status?}` + `attachment_url`) and :1301-1302 (comment); feedback-page.tsx:254 `onReply` passes the third argument and the detail already has `onUpload` (:246) / `onCaptureScreenshot` (:248); the comment threads at feedback-page.tsx:108-113 and all-feedback-page.tsx:142-147 (`FeedbackPublicDetail`) get `onUpload`, `onCaptureScreenshot`, `fetcher`; use-feedback-comments.ts:33 `onComment(body, attachmentUrl?)`. Loop: feedback-live-setup.sh:51-52 grant unchanged; feedback-live-read.sh:81-84 may select the comment's `attachment_url` | Regenerate frontend/src/shared/api/openapi-schema.d.ts (FeedbackCommentCreate :10491, FeedbackCommentResponse :10507, FeedbackReplyCreate :10692). tests/api/test_account_export.py:290 pins the exported reply as exactly `{body,status,created_at}`: re-pin if you export the file. tests/integration/test_migration_data_passes.py:975-1047 (comment inserts) for the new column. Text-only posts in tests/api/test_feedback_public.py (:163, :197-204, :231, :338, :367, :449) and test_feedback_crash.py:135 stay green; add a file case next to the rework one (:235-245) |
| kastlan | None: no `feedback_comments` table (dropped in alembic/versions/b4d6f8a0c2e4_feedback_fold_comments.py:68), no comment routes (`FeedbackDeps` at kastlan/adapters/api/feedback_router.py:92-112 passes no `comments=`/`public_viewer`) | The reply takes a file at once; `feedback_reply_store.py:52-75` already writes `attachment_url` (:63) and copies `company_id`. Pass `reply_model=` a subclass with `ATTACHMENT_URL_POLICY` (domain/schemas/feedback.py:30; subclasses :44-53), as `rework_model` | — | `urls_named_except` (adapters/persistence/feedback_repository.py:121-142): drop the `row_ids` filter on the replies query (:136-140). Storage reads any key (adapters/filestorage/feedback_attachments.py:33): no change. Client: feedback-api.ts:40-42 `replyToFeedback` sends `attachment_url`; pages/feedback-page.tsx:166 `onReply` takes the third argument (`onUpload` is passed at :170, so the composer shows the field) | tests/api/test_feedback_workflow.py: replies with `{body,status}` at :207-228, :233-236, :245-246, :262-263, :311, :507-512 stay green; copy the rework's foreign-URL 422 (:522-525) for a reply. No OpenAPI snapshot |
| kurvenschmiede | New step after `alembic/versions/0056_device_timezone.py` (comments created in `0052_public_feedback.py:178-190`); `FeedbackComment` gains `attachment_url` (domain/models/feedback.py:346-372; the replies' :343); classify `feedback_comments.attachment_url` as `"lookup"` in tests/unit/test_encryption.py's PLAINTEXT map (beside `feedback_replies.attachment_url`, ~:267), or `test_every_plaintext_text_column_is_one_somebody_chose` (:319) fails | Nothing to change: `SqlFeedbackReplyStore.add` (domain/services/feedback_stores.py:82-112) already hangs any entry's file on the report (`hang_rework_file`, :92-97) and writes it (:105), so the author reads the admin's file through `readable_files`. Pass `reply_model=`/`comment_model=` with `ATTACHMENT_URLS` (domain/schemas/feedback.py:34-63) | `SqlFeedbackCommentStore.add` (feedback_stores.py:164-170): claim the file as the writer's own unfiled upload (`hang_rework_file` or a new `comment` kind, §12.6) and write it; `readable_files` (domain/services/feedback_service.py:650-670) lets anyone who sees a visible comment naming the file read it | `urls_named_except` (feedback_service.py:457-478): drop the `excluded` filter on `entries`, add the comments' `attachment_url`; erasure ignores the keys (erasure_service.py:437-442), the file goes with its report row. Client: frontend/src/shared/api/endpoints.ts:638 (reply) and :663-664 (comment `{body}`); feedback-page.tsx:208 `onReply` (third argument; `onUpload` at :204), the threads at :261-265 and all-feedback-page.tsx:164-169 get `onUpload`, `onCaptureScreenshot`, `fetcher`; use-feedback-conversation.ts:56, :100. `feedback_loop.py:224-225` already prints an entry's file; `--show` (:212-234) may print a comment's | tests/api/test_feedback_public.py: `assert_public_view` over the comment list (:235) passes with the new field (a comment's own URL is allowed); comment `{body}` at :232, :269 and the shape at :233, :240-243 stay green. tests/api/test_feedback_ports.py:117, :128 (`check_comment_store` now writes a file: pass `attachment_url=` an upload the test made, as for `check_reply_store`). tests/api/test_migrations.py:2245-2249 (add the comment column). test_notifications.py:121-127, test_account_export.py:64, :73, test_deletion.py:317, test_feedback_loop.py:176-184 stay green |
