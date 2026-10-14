# Adopting `@eifi1/ui-kit` 0.38 and `eifi1-server-kit` 0.11

Round 0.38 is Marcel's request for **public feedback** (2026-10-14), drafted as feedback §9,
reviewed by all three apps and settled by Marcel in the ui-kit session ("as recommended",
kastlan's recommendation, option (b)):
- every report is readable by the app's signed-in users the app's predicate admits, minus
  attachments, screenshots, `context`, the crash fingerprint and the author's address;
  crash reports stay private; a demo is treated as not signed in (404);
- an upvote only ("I want this too"), one per person, the author's cast on filing;
- others are named by first name only, "A user" while a name is incomplete;
- comments by others as rows (the admin hides, the writer deletes), and the admin's
  answers as a timeline of replies that `outcome` migrates into;
- every existing report becomes public (option (b)): another author gets one notice and may
  opt out; each report carries a `public` flag.

Per app: keksdose all users; Kurvenschmiede ADMIN, MEMBER and REVIEWER (never a CUSTOMER);
kastlan the public part off, replies only. The contract (feedback §9.16) is the checklist.

## 1. What's new

### ui-kit 0.38

- **Thread parts:** `FeedbackVoteButton`; `FeedbackCommentThread` (comments as rows,
  replies merged in, oldest first; hide and delete; delete asks through `useConfirm`, so a
  `ConfirmProvider` is needed where a deletable comment shows); `FeedbackReplyTimeline` and
  `FeedbackReplyComposer` (the status picker lives here; a decided status nudges toward a
  reply: `feedbackReplyNudge`, `FEEDBACK_DECIDED_STATUSES`).
- **`FeedbackRowDetail`:** the timeline and composer replace the Outcome section (`onReply`,
  `replying`, `comments`, `onPublicChange`); without `row.replies` the outcome is read-only.
  `feedbackColumns` gains `votes`; `FeedbackMobileCard` takes `votes` (a count; the vote is
  in the opened report).
- **Public pages:** `FeedbackPublicList` (titles only; sort by votes, newest or updated;
  search only through `onSearchChange`), `FeedbackPublicDetail`, `FeedbackPublicSwitch`
  (`feedbackPublicSwitchAllowed`); `FeedbackMenu` `publicHref` ("All feedback");
  `FeedbackDialog` / `useFeedbackSubmit` `publicNotice` ("Other users will see the title and
  text (never your screenshots or files)"); `useFeedbackNotificationTypes` for
  `feedback_answered` and `feedback_comment`. Words in seven languages.

### server-kit 0.11

- **Layer 1:** `public_body` / `public_text` (every attachment URL stripped, anywhere),
  `is_public` (never a CRASH), `feedback_recipients`, `auth.first_name_of`, `plan_reply`,
  `DECIDED_STATUSES`, the `public` lane in `plan_update`; the reply, comment, vote and public
  schemas; `FEEDBACK_COMMENTS_PER_HOUR` (20) and `FEEDBACK_VOTES_PER_HOUR` (60) on
  `FeedbackLimiters`; `AccountNoticeKind.FEEDBACK_PUBLISHED`.
- **Layer 2:** the ports `PublicFeedbackRepository`, `FeedbackReplyStore`,
  `FeedbackCommentStore`, `FeedbackVoteStore`, `PeopleLookup`; the service's reply, comment
  and vote flows and page views; nine routes behind `FeedbackDeps.public_viewer` and the reply
  store; the erasure covers comments, votes and replies. `feedback.testing`: in-memory
  stores, `check_*_store`, `check_public_repository`, `assert_public_view`.
- `FeedbackActor.role`, `NewFeedback.public`, `ErasedFeedback.comments/votes/replies`.

## 2. Breaking and must-change, every app

- **`outcome` is frozen** (server-kit, BREAKING): a PATCH naming it, null too, is a 422; an
  answer is a reply. **Bump both kits together**: ui-kit 0.37's Outcome editor wrote it.
- **The repository's `add` maps `NewFeedback.public`.** Don't name a mapped relationship
  `replies`, `votes` or `mine` on the feedback model: the kit's views read attributes.
- **A PATCH with `public`** is a 422 where the app has no `public_viewer` (kastlan).
- **The migration** (§9.12): the replies, comments and votes tables; `feedback.public`
  (true on every existing report but crash reports, `filed_private` marking those by another
  author for the notice); `outcome` into the first reply; one vote per report for its author.
  `created_at` needs a database default where a loop writes raw SQL.

## 3. Per app

### keksdose

- `adapters/api/feedback_router.py:76`: the reply, comment and vote stores, `people`, and
  `public_viewer=lambda a: True`; the repository gains `public_page` / `get_public`.
- Erasure: drop the comment scrub at `domain/services/budgets_service.py:1250-1263`; the
  comment store passed to `FeedbackService` does it. Export: `account_export_service.py:324-325`
  drops the `"from"` key; the person's comments and votes, other people's reports by id.
- The 14 `feedback_comments` rows migrate per row (§9.8): an admin writer's become staff
  comments.
- The loop (§9.13): `scripts/feedback-live-setup.sh` grants SELECT on feedback, replies and
  comments, INSERT (feedback_id, body, status_from, status_to) on replies with USAGE on
  `feedback_replies_id_seq`, UPDATE (status) on feedback; no BEGIN/COMMIT in the template
  (`psql -1`); the jobs runner sends `feedback_answered` from the `notified_at` queue.
- Frontend: `top-bar.tsx:156` `<FeedbackMenu publicHref="/all-feedback">`;
  `useFeedbackSubmit({ publicNotice: true, … })`; a new `/all-feedback` page
  (`FeedbackPublicList` with `onSearchChange`, `FeedbackPublicDetail` in `renderDetail`);
  `FeedbackRowDetail` gets `onReply`, `replying`, `comments={<FeedbackCommentThread …/>}`,
  `onPublicChange`; `useFeedbackColumns({ votes: true })`, `<FeedbackMobileCard votes>`;
  spread `useFeedbackNotificationTypes()` into the settings card's types.

### kastlan

- `adapters/api/feedback_router.py:68`: `replies=` and `people=` only (no `public_viewer`).
- `domain/services/account_service.py:300`: export replies instead of `outcome`; pass the
  reply store at `admin_user_service.py:377`.
- The loop (§9.13): the Claude session's raw SQL becomes an INSERT into the replies table,
  copying `company_id` from the report (under the bypass); update CLAUDE.md's "Processing
  feedback" and `scripts/feedback-prod-migrate.sql`. A loop reply sends no notice yet.
- `feedback_answered` e-mail only (`app=None`), on by default; `feedback_comment` not
  declared.
- Frontend: `FeedbackRowDetail` `onReply` only; no menu entry, no notice, no public pages.

### Kurvenschmiede

- `domain/services/feedback_service.py:97-102`: `FeedbackActor(role=user.role.value, …)`;
  `adapters/api/feedback_router.py:74`: the stores, `public_viewer` (ADMIN, MEMBER, REVIEWER,
  not a demo), `public_search=False` (sealed titles).
- `domain/schemas/feedback.py:66`: `outcome` is refused by the kit's validator now.
- `feedback_loop.py --resolve` goes through `FeedbackService.reply`;
  `notification_service.py:224`: `feedback_answered` fires on a reply.
- Files: `AttachmentStorage.read` (`feedback_service.py:507`) narrows to the uploader, the
  author or an admin, apart from `visible_to`.
- Frontend: as keksdose without `onSearchChange`; `publicHref` and `publicNotice` only for
  ADMIN, MEMBER and REVIEWER outside the demo; the hook's words replace KS's own
  `feedback_answered` wording.

## 4. Versions

- **`@eifi1/ui-kit` `^0.38.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.11.0**, the release wheel by URL, extras as for 0.10, and the
  sha256 pinned in `uv.lock`:

  ```sh
  uv add "eifi1-server-kit[billing,fastapi,images,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.11.0/eifi1_server_kit-0.11.0-py3-none-any.whl"   # kastlan
  uv add "eifi1-server-kit[billing,fastapi,images] @ https://github.com/Eifi1/server-kit/releases/download/v0.11.0/eifi1_server_kit-0.11.0-py3-none-any.whl"        # keksdose
  uv add "eifi1-server-kit[billing,fastapi,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.11.0/eifi1_server_kit-0.11.0-py3-none-any.whl"          # Kurvenschmiede
  ```

  sha256: `<at the release>`
