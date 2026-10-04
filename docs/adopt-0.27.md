# Adopting `@eifi1/ui-kit` 0.27

The feedback harmonization (Marcel, 2026-10-04): everything feedback-related looks and is
named the same in keksdose, kastlan and Kurvenschmiede. The contract — API, every string,
every behaviour, and each app's checklist — is `docs/feedback-harmonization.md`; this note
is the kit side. `CHANGELOG.md` → `0.27.0` has the release notes.

## Everyone

1. Bump to `^0.27.0` by hand; a caret below 1.0 locks the minor version.
2. **Changes you may see on the bump:**
   - **The feedback dialog's defaults are keksdose's wording:** `feedbackAttachment`
     "Add attachment" (was "Attach image"), the longer paste hint ("…so you can show one
     corner rather than the whole page"), `attachmentLimit(1)` "remove it", and the
     single-mode heading `feedbackDialog.attachment` "Attachment" (was "Screenshot") —
     in every catalogue. An app that overrides these keeps its own words.
   - **`FeedbackStatusBadge`, `FeedbackCategoryBadge`, `FeedbackStatusTransitions`:**
     `label` is optional — without it they show the kit's word for the status or
     category in the provider's language (new `feedbackStatus` / `feedbackCategory`
     namespaces), so your `STATUS_LABEL` / `CATEGORY_LABEL` maps can go.
   - **`FeedbackNoteEditor`:** its text box is named by the line above it, and its
     attachment field is held while a save is in flight; new opt-in `required` and
     `commit`. `FeedbackStatusTransitions` takes `commit` / `disabledReason`.
   - New tokens `--info-contrast` (text on an `--info` fill).
3. **`modern-screenshot`** is an optional peer (`^4.7.0`): install it if you call
   `captureAppScreenshot` (keksdose and Kurvenschmiede have it; kastlan installs it or
   passes `capture: false`).
4. **New label namespaces** `feedbackStatus`, `feedbackCategory`, `feedbackToast`,
   `feedbackMenu`, `feedbackContext`, `feedbackPage`, `feedbackDetail` — in every
   catalogue.

## New

| Part | API |
|---|---|
| Record | `FeedbackRecord` / `FeedbackContext` types (§3.1/§3.2); constants `FEEDBACK_ATTACHMENT_ACCEPT`, `FEEDBACK_PICKABLE_CATEGORIES`, `FEEDBACK_REWORKABLE_STATUSES`, `FEEDBACK_AUTHOR_EDITABLE_STATUSES`, `FEEDBACK_AWAITING_STATUSES`; body helpers `appendRework` (one file, UTC stamp, required note), `reworkCount` (REWORK blocks only — kastlan's COMMENT blocks never count), `splitDescription` / `replaceDescription`, `isImageAttachment`, `attachmentName` (any key shape) |
| Top bar | `FeedbackMenu` — the four category rows, `extraEntries`, "My feedback" for everyone and "View feedback" for admins (`isAdmin`), `iconBadge`, `onFile(category)` |
| Submit | `useFeedbackSubmit({ upload, create, user, environment, version, onSubmitted, errorMessage, capture })` → `{ open(category?), close, dialog }` — multiple attachments (a screenshot + 5 files, images/PDF/text, 10 MB), every file uploaded before `create`, the context box, the toasts, CRASH never pickable; `FeedbackContextBox` + `feedbackContext()`; `captureAppScreenshot({ rootId })` |
| Pages | `useFeedbackColumns({ mine, canEdit, onStatus, renderDate })` (the contract's nine columns), `FeedbackMobileCard` (draws the environment and Rework chips itself), `feedbackMobileGroupBy`, `FeedbackAwaitingToggle`, `FeedbackEmptyState`, `isFeedbackAwaiting` |
| Detail | `FeedbackRowDetail` (the expanded row: "What happened?" with the author's Edit description — the original text only —, URL with a route fallback, attachments, outcome, status pills, Rework) and `FeedbackReworkSection` |
| Status | `useFeedbackStatusUndo(update.mutate)` → `change(row, status)` — every status change with the 8-second Undo toast (cell, pills, swipes); `feedbackSwipePlan(binding, row, …)` with `FEEDBACK_SWIPE_ACTIONS` (`advance`, `done`, `wont_do`) and `DEFAULT_FEEDBACK_SWIPE` |
| Crashes | `createCrashReporter({ endpoint, getToken, allowParams, storageKey, suppress, environment, … })` → `{ onReport, redact, flushPending, noteHotUpdate }` — filed only when the server answers `stored === true`; buffered (3, deduped) while there is no token, offline or on 401/5xx; `flushPending()` at start-up and when a token appears |

A page, in short:

```tsx
const fb = useFeedbackSubmit({ upload: api.upload, create: api.create, user, environment, version });
<FeedbackMenu onFile={fb.open} isAdmin={isAdmin} />{fb.dialog}

const change = useFeedbackStatusUndo(update.mutate);
const renderDate = useFeedbackRenderDate();
const columns = useFeedbackColumns<Feedback>({ mine, canEdit, onStatus: change, renderDate });
<DataTable rows={rows} columns={columns} urlSync
  mobileCard={(r) => <FeedbackMobileCard row={r} showSubmitter={canEdit} />}
  mobileGroupBy={feedbackMobileGroupBy(renderDate)}
  expandedRow={(r) => <FeedbackRowDetail row={r} canEdit={canEdit} viewerId={user.id}
    onUpdate={update.mutate} statusChange={change} onUpload={api.upload} fetcher={fetcher} />} />
```

## Per app

The full checklists — backend first where needed — are §6 of
`docs/feedback-harmonization.md`. In brief:

- **keksdose:** swap `use-feedback-dialog.tsx`, `capture-screenshot.ts`, the crash
  reporter, the label maps and the page's columns / row / rework for the kit parts; the
  admin menu gains "My feedback"; submit "Send", "What happened?", empty "No feedback
  yet", German "Nacharbeit"; the tour copy and the help-assistant corpus follow; the
  backend validates `screenshot_url`.
- **kastlan:** backend first (the two statuses, CRASH and `/feedback/crash`, multiple
  attachments, comments folded and dropped, inbox for admins only); then
  `FeedbackButton`, Ctrl+Shift+F and the comment thread go, the kit parts come in.
- **Kurvenschmiede:** backend and frontend on ONE branch (context JSON, the two-step
  upload, `/feedback/crash`, rework per the contract); the page splits into `/feedback`
  and `/my-feedback` (`?row=`); "That is it, done" and the account-menu entry go.
