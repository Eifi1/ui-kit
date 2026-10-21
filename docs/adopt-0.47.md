# Adopting `@eifi1/ui-kit` 0.47 and `eifi1-server-kit` 0.18

ui-kit 0.47 removes what 0.46 deprecated for removal in 0.47 (the zone is automatic only,
notifications §10.3 amended 2026-10-20), so a bump can break a build that still names one of
them; none of the three apps does (checked 2026-10-20, below). Two changes show on a plain
bump of a table: an expanded `DataTable` row is pinned to the width the table's scroller
shows (keksdose S4), and nothing else moves. `RowActionsHead` and `ROW_ACTIONS_CELL_CLASS`
are new, for a hand-built table's actions column (keksdose N17). server-kit 0.18 refuses a
sent `timezone`, as 0.16 announced (its own section; S18). The new reply and comment files
(§12) are opt-in: a plain bump shows no new file field (`replyAttachments`, below). After the
bump, regenerate the API types (`npm run generate:api` or the app's own; kastlan has none: its
types are hand-written in shared/types).

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
| kastlan | Its `RowActions` outside a `DataTable` are in lists, not tables (room-inspector, unit-rooms-tab, unit-defects-tab). Four hand-built tables have an EMPTY icon-button actions header that `<RowActionsHead hideLabel />` names for a screen reader: features/contacts/components/contact-addresses-tab.tsx:81, contact-bank-accounts-tab.tsx:95, contact-roles-tab.tsx:95 (each `<TableHeaderCell></TableHeaderCell>`) and features/budgets/pages/budget-detail-page.tsx:167 (`<TableHeaderCell className="w-12.5" />`: keep the width, `<RowActionsHead hideLabel className="w-12.5" />`). No test asserts the header text |
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
| keksdose | The inline editors this was for: accounts-page.tsx:798 (`renderEditor`), transactions-page.tsx:983 (`renderRow`), invoice-lines-table.tsx:1923; also payees-page.tsx:175, users-panel.tsx:929, feedback-page.tsx:234, jobs-panel.tsx:239; and the kit's `TranslationReviewPanel` (features/translations/translations-page.tsx:291) |
| kastlan | feedback-page.tsx:158 (FeedbackRowDetail); the kit's `TranslationReviewPanel` (features/translations/pages/translations-page.tsx:234) |
| kurvenschmiede | feedback-page.tsx:195 (FeedbackRowDetail); the kit's `TranslationReviewPanel` (features/translations/translations-page.tsx:276) |

`TranslationReviewPanel` is a `DataTable` whose `expandedRow` is the `TranslationReviewEditor`
with Save / Clear (src/components/translation-review.tsx:986): the inline-editor case
the pinned width is for, in every app that mounts it (kastlan build review S1).

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

Install the wheel by URL, pinned by hash:

```
eifi1-server-kit @ https://github.com/Eifi1/server-kit/releases/download/v0.18.0/eifi1_server_kit-0.18.0-py3-none-any.whl
sha256: SHA256_AT_RELEASE
```

- **A sent `timezone` is a 422 (BREAKING, as announced: ignored in 0.16 and 0.17).** The notifications settings
  PATCH (`NotificationSettingsUpdate`), the `/push/settings` shim (`QuietHoursUpdate`) and `PATCH /auth/me`
  (`ProfileUpdate`) refuse it like any unknown field. Only a stale ≤ 0.45 bundle sends it.
- **`documented_body(model)`** puts a push route's body back into OpenAPI (the routes take the body untyped so
  `parse_push_body` can refuse without echoing). keksdose can replace its own `_inline_defs` + `_documented_body`.
- **Two 422 shapes on a push route** (documented): a body that isn't valid JSON is refused by FastAPI first, in the
  redacted `{type, loc, msg}` shape (`json_invalid`); a body the model refuses gets `push_body_invalid`. Neither
  echoes what was sent.
- **Attachments on replies and comments** (§12): see "Attachments on admin replies and public comments" below.
- **A deleted comment's file: the app decides** (§12.3). `FeedbackService.delete_comment` answers the bare key of the
  comment's file when nothing else names it any more (`urls_named_except` over every report, after the delete), and a
  comment store that also has `purge_files(keys)` (`FeedbackCommentFilePurge`, new) is handed those keys before the
  commit, never empty. A store without it keeps the file, as before.
- **`check_repository(…, replies=, comments=)`** (keksdose S4): with the app's two stores it checks 0.18's
  `urls_named_except` rule too: a rework entry's file and a comment's file on a report among `row_ids` are still
  named. A repository that kept 0.17's `not_in(row_ids)` on the entries, or reads no comments, fails it.

| App | Change |
| --- | --- |
| keksdose | Tests that pinned "timezone ignored" now expect 422: `test_auth_full.py:230-233`, `test_notification_settings.py:87`, `:93`, `:100-102`, `:129-143`, `test_push_preferences.py:105`, `:113-115`, `:138-141`; the first PATCH at `test_notification_settings.py:80-89` checks no status, so its 422 shows only at `:98`. Out-of-date comments: domain/schemas/push.py:88-90 ("a 422 from 0.17") and so the generated openapi-schema.d.ts:12506, auth_router.py:1189-1190 (now in force). `_inline_defs` + `_documented_body` (`notifications_router.py:85-102`, used `:113`, `:139`, `:169`) → the kit's `documented_body`. |
| kastlan | No test sends a `timezone`; nothing for the refusal. |
| Kurvenschmiede | `test_notifications.py:173-175`'s docstring says "a 422 from 0.17": it is 0.18. |

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
(each new there, so no page passes them yet). `FeedbackRowDetail` hands its own on to the
reply composer **only with `replyAttachments`** (new, off by default): its `onUpload` is the
rework note's too, and all three apps pass it already with an `onReply(body, status)` that
would drop the file without a word (build reviews, keksdose and kastlan B1). Every entry's and comment's picture is drawn inline
(`FeedbackEntryFile`), a tap opens it full size. The row detail's Attachment section keeps
the report's own files; a rework's file now shows under its entry in the timeline. A
text-only body is unchanged on the wire, so no existing test of `/replies` or `/comments`
breaks (checked: none asserts a 422 on an extra field there, none pins an exact key set).

**One commit per app** for the reply file: `replyAttachments` on the detail, `onReply`
sending its third argument as `attachment_url` (the page's mutation and the API call), and
server-kit 0.18 (an older server answers `attachment_url` with a 422). The comment file is
the same with `onUpload` on the thread and `onComment`'s second argument. A two-argument
callback type-checks against the three-argument prop, so only a test catches a missing
step: add one that the admin's reply sends `attachment_url`.

**Erasure, both ways (§12.3):** the report's author erased, the admin's reply and its file
are KEPT (only the author's own entries are scrubbed), so a screenshot of the author's data
in an admin's reply survives; the admin erased, `anonymise_reply` takes the file off and it
is purged unless another entry or report names it, so the author loses the picture.

Migration (the comment column, nullable, no backfill; downgrade drops it):

```python
# keksdose: after 0133_notification_queue — Text, as 0130's feedback_replies.attachment_url
op.add_column("feedback_comments", sa.Column("attachment_url", sa.Text(), nullable=True))
# Kurvenschmiede: after 0056 — String(500), plaintext like feedback_replies.attachment_url
op.add_column("feedback_comments", sa.Column("attachment_url", sa.String(500), nullable=True))
```

| App | Migration and model | Reply route / store | Comment route / store | Erasure, files, client | Tests that pin the old bodies |
| --- | --- | --- | --- | --- | --- |
| keksdose | New step after `alembic/versions/20261020_0133_notification_queue.py` (model it on `20261014_0128_public_feedback.py:96-98`'s `add_column`); `FeedbackComment` gains `attachment_url` (domain/models/feedback.py:108-121, beside `FeedbackReply.attachment_url` :155) | Nothing to change: `FeedbackDeps` (adapters/api/feedback_router.py:108-129) mounts the kit's body; `SqlAlchemyReplyStore.add` already writes `attachment_url` (adapters/persistence/feedback_public_stores.py:76). Pass `reply_model=`/`comment_model=` subclasses with `FEEDBACK_ATTACHMENTS` (domain/schemas/feedback.py:46, subclasses :49-58) so the 422 names your keys | `SqlAlchemyCommentStore.add` (feedback_public_stores.py:135-140) writes `attachment_url=new.attachment_url` | `urls_named_except` (adapters/persistence/feedback_repository.py:119-135): drop the `not_in(row_ids)` on the replies query (:132-134) and add `FeedbackComment.attachment_url`; the purge (domain/services/budgets_service.py:1259-1267, :1393) takes the new keys as they are. Storage reads any key for any signed-in user (adapters/external/feedback_attachment_storage.py:32): no change. Client: frontend/src/shared/api/endpoints.ts:1287-1288 (reply `{body,status?}` + `attachment_url`) and :1301-1302 (comment); feedback-page.tsx:254 `onReply` passes the third argument (`(body, status, url) => replyMut.mutateAsync({ id: fb.id, body, status, url })`), `useFeedbackReply` (:78-86) takes the `url` and sends `attachment_url` as `useFeedbackRework` does (:95-96), and the detail gets `replyAttachments` (its `onUpload` :246 / `onCaptureScreenshot` :248 are passed already) — all in the bump commit; the comment threads at feedback-page.tsx:108-113 (`RowComments`, `onUpload`/`onCaptureScreenshot` when `canComment`) and all-feedback-page.tsx:142-147 (`FeedbackPublicDetail`) get `onUpload`, `onCaptureScreenshot`, `fetcher`; use-feedback-comments.ts:23 (the `comment` mutationFn) and :33 take `(body, attachmentUrl?)`, and `feedbackApi.comment(id, body)` (endpoints.ts:1301-1302) takes `attachment_url` and sends it only when set. A deleted comment's file: kept for 0.47 (keksdose's §12.6 answer); a `purge_files(keys)` on `SqlAlchemyCommentStore` that arms the after-commit purge (budgets_service.py:1259-1267's) adopts the purge later. Export: a count, never a key (account_export_service.py:352; §10.8's rule). Loop: feedback-live-setup.sh:51-52 grant unchanged; feedback-live-read.sh:81-84 may select the comment's `attachment_url` | Regenerate frontend/src/shared/api/openapi-schema.d.ts (FeedbackCommentCreate :10491, FeedbackCommentResponse :10507, FeedbackReplyCreate :10692). tests/api/test_account_export.py:290 pins the exported reply as exactly `{body,status,created_at}`: re-pin if you export the file. tests/integration/test_migration_data_passes.py:975-1047 (comment inserts) for the new column. Text-only posts in tests/api/test_feedback_public.py (:163, :197-204, :231, :338, :367, :449) and test_feedback_crash.py:135 stay green; add a file case next to the rework one (:235-245). **Fails until the migration and the store's `add` land:** the port check at test_feedback_public.py:78-84 (`check_comment_store` now writes a file and reads it back): pass `policy=FEEDBACK_ATTACHMENTS, attachment_url=<a URL of that policy>`. **New:** tests/unit/test_feedback_adapters.py:52 `check_repository(…, replies=SqlAlchemyReplyStore(session), comments=SqlAlchemyCommentStore(session))` (fails until the `not_in` goes); an erasure test: a file only the erased commenter named is purged, a key an admin reply on the erased person's report also names is kept, a key another user's comment names is kept. frontend `__tests__/feedback-page.test.tsx:284-286`'s `querySelector('input[type="file"]')` on `/my-feedback`: scope it to the rework section once `RowComments` gets `onUpload`. A frontend test that the admin's reply sends `attachment_url` |
| kastlan | None: no `feedback_comments` table (dropped in alembic/versions/b4d6f8a0c2e4_feedback_fold_comments.py:68), no comment routes (`FeedbackDeps` at kastlan/adapters/api/feedback_router.py:92-112 passes no `comments=`/`public_viewer`) | The reply takes a file at once; `feedback_reply_store.py:52-78` already writes `attachment_url` (:63) and copies `company_id`. Pass `reply_model=` a subclass with `ATTACHMENT_URL_POLICY` (domain/schemas/feedback.py:30; subclasses :44-53), as `rework_model` | — | `urls_named_except` (adapters/persistence/feedback_repository.py:121-142): drop the `row_ids` filter on the replies query (:136-140). Storage reads any key (adapters/filestorage/feedback_attachments.py:33): no change. Client, in the bump commit: features/feedback/api/feedback-api.ts:40-42 `replyToFeedback` sends `attachment_url`; pages/feedback-page.tsx:166 `onReply` takes the third argument, and the detail gets `replyAttachments` (`onUpload` :170 / `onCaptureScreenshot` :171 are passed already; without the prop the composer stays text only). Erasure: the shared-key rule matters here (S2): kastlan records no uploader and the reply policy checks the URL's shape only, so an admin may reply naming the report's own screenshot; with today's `not_in(row_ids)` the author's erasure purges that file while the reply still shows it. Export (domain/services/account_service.py:298-318): `attachments` (:317) counts the report's own files only; add the author's rework entries' files to the count; an admin reply's file stays out (another person's data, and a count, not a URL) | tests/api/test_feedback_workflow.py: replies with `{body,status}` at :207-228, :233-236, :245-246, :262-263, :311, :507-512 stay green; copy the rework's foreign-URL 422 (:522-525) for a reply. No OpenAPI snapshot. **New:** tests/api/test_feedback_adapters.py:58 `check_repository(…, replies=<the reply store>)` (fails until the `row_ids` filter on the replies goes); an erasure test beside tests/api/test_user_admin.py:311-375 (which asserts only `feedback_anonymised`): an admin replies naming the report's screenshot, the author is erased, the file is kept (not in the purged keys) and the reply still serves it |
| kurvenschmiede | New step after `alembic/versions/0056_device_timezone.py` (comments created in `0052_public_feedback.py:178-190`); `FeedbackComment` gains `attachment_url` (domain/models/feedback.py:346-372; the replies' :343); classify `feedback_comments.attachment_url` as `"lookup"` in tests/unit/test_encryption.py's PLAINTEXT map (beside `feedback_replies.attachment_url`, ~:267), or `test_every_plaintext_text_column_is_one_somebody_chose` (:319) fails | Nothing to change: `SqlFeedbackReplyStore.add` (domain/services/feedback_stores.py:82-112) already hangs any entry's file on the report (`hang_rework_file`, :92-97) and writes it (:105), so the author reads the admin's file through `readable_files`. Pass `reply_model=`/`comment_model=` with `ATTACHMENT_URLS` (domain/schemas/feedback.py:34-63) | `SqlFeedbackCommentStore.add` (feedback_stores.py:164-170): claim the file as the writer's own unfiled upload and write it, as a NEW `comment` kind tied to its comment (KS's §12.6 answer: `AttachmentKind.COMMENT` + `feedback_attachment.comment_id`, FK `feedback_comments.id` `ON DELETE CASCADE`, in the same migration); `delete` (:187) takes the file with the row by the cascade (KS purges a deleted comment's file; no `purge_files` needed); `apply` deletes the row when the erasure clears `attachment_url`; `readable_files` (domain/services/feedback_service.py:650-670) gains one clause: a `comment` kind file to whoever reads that comment's body (the comment not hidden and the viewer sees the report's comments), else its writer and an admin | `urls_named_except` (feedback_service.py:457-478): drop the `excluded` filter on `entries`, add the comments' `attachment_url`; erasure ignores the keys (erasure_service.py:437-442), which holds for a report's own files and its author's rework files, NOT for the two §12 adds (build review B1): an erased person's **comment** files on other people's reports (by `comment_id` of their comments) and the **reply** files an erased admin hung on other people's reports (`hang_rework_file`, kind `rework`, `user_id` the admin: by `user_id` before the SET NULL, on reports whose author is someone else — or a kind `reply` for them) must be DELETED by the erasure, or they stay readable by that report's author and every admin with nothing naming them. Test beside tests/api/test_deletion.py:306: an admin replies with a file on a member's report and is erased; the member's GET of the file is a 404 (and the same for a commenter's file on another's public report). Export (export_service.py:128-145 `feedback_comments`): add `attachment_url` beside `body` and `hidden` (the writer's own file; additive, test_account_export.py pins no key set there). Client: frontend/src/shared/api/endpoints.ts:638 (reply) and :663-664 (comment `{body}`); feedback-page.tsx:208 `onReply` (third argument) and `replyAttachments` on the detail, in the bump commit (`onUpload` at :204 is passed already), the threads at :261-265 and all-feedback-page.tsx:164-169 get `onUpload`, `onCaptureScreenshot`, `fetcher`; use-feedback-conversation.ts:56, :100. `feedback_loop.py:224-225` already prints an entry's file; `--show` (:212-234) may print a comment's | tests/api/test_feedback_public.py: `assert_public_view` over the comment list (:235) passes with the new field (a comment's own URL is allowed); comment `{body}` at :232, :269 and the shape at :233, :240-243 stay green. tests/api/test_feedback_ports.py:117, :128 (`check_comment_store` now writes a file: pass `attachment_url=` an upload the test made AS `author`: the check writes its file-carrying comment as `author` (`actor=author`), so a store that claims only the writer's own upload passes). :64 `check_repository(…, replies=, comments=)`: it uploads the rework entry's file as `author` and the comment's as `other`, each the writer. tests/api/test_migrations.py:2245-2249 (add the comment column). test_notifications.py:121-127, test_account_export.py:64, :73, test_deletion.py:317, test_feedback_loop.py:176-184 stay green |
