# Feedback across the kit and the three apps — harmonisation plan

Led from ui-kit at Marcel's request, built from a read-only survey of each app's working
tree (2026-10-04). Marcel's decisions are in §2. It follows the pattern of the language
round ([i18n-harmonization.md](i18n-harmonization.md)): **one contract + kit parts**. The
contract is keksdose's, read off its code; the kit owns every visible word and every
part that three apps were building separately; each app keeps its data, API client,
auth and routes.

Paths below are relative to each repo: **kk** = keksdose, **ka** = kastlan,
**KS** = Kurvenschmiede.

## Status

The body says what the build does as of ui-kit 0.34.0 and server-kit 0.8.0; the settled
points and the 0.31 amendment are folded into the sections they amended, and the table
names them. The snapshot, the per-repo to-dos and the review records are in
[archive/feedback-history.md](archive/feedback-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | |
| 2 | Decisions | — | §7.2, §7.4, §7.7; §8.2 (READY, 0.31) |
| 3 | The API contract (A) | server-kit 0.1.0 (`feedback`); apps' backends | §7.1, §7.5–§7.9, §7.15, §7.16; §8.2 (server-kit 0.5); round 0.36 (§3.5, §3.6: the limiter is charged before the work, as the three apps do; [server-services §2.11](server-services-harmonization.md)) |
| 3.8 | What kastlan and Kurvenschmiede change | — (archived) | |
| 4 | The UI contract (B) | ui-kit 0.27.0 | §7.3, §7.4, §7.10–§7.14; §8.1, §8.2 (ui-kit 0.31) |
| 5 | What the kit adds, what stays app-side (C) | ui-kit 0.27.0, server-kit 0.1.0 | §8.1, §8.2 (ui-kit 0.31, server-kit 0.5) |
| 6 | Per repo (D) | — (archived) | |
| 7 | Settled points — the final canon | — | index; folded items point to their § |
| 8 | Amendment for 0.31 | ui-kit 0.31.0, server-kit 0.5.0 | index; folded into §2–§5 |
| 9 | Round 0.38: public feedback (votes, comments, replies) | **§9 settled 2026-10-14 (round 0.38)**, for server-kit 0.11 / ui-kit 0.38 | amends §3.1, §3.3, §3.4 (`public`), §4.4.4 (outcome → replies), §5; server-services §2.7, §4.5; notifications §2, §5 (two types, the notice) |
| 10 | Round 0.40: rework as a conversation entry, the feedback menu | **§10 settled 2026-10-16 (round 0.40)**, for server-kit 0.13 / ui-kit 0.40 | amends §2.1 (REWORK), §2.2, §3.4 (the rework), §4.1 (the menu), §4.3–§4.5, §5; §9.7, §9.11, §9.12, §9.13 |
| 11 | Round 0.46: admin alerts for new reports and reworks | **§11 settled 2026-10-19 (round 0.46)**, for server-kit 0.16 / ui-kit 0.46 | adds a notification type (notifications §10.2); amends §10.2 decision 10 (no admin mail) |

## 1. Where each one stands

Moved to [archive/feedback-history.md](archive/feedback-history.md): the three apps and
the kit (0.26) as surveyed on 2026-10-04.

## 2. Decisions (Marcel, 2026-10-04)

1. **All eight statuses everywhere**, in chain order: OPEN, READY, IN_PROGRESS,
   IN_EVALUATION, NEEDS_LIVE_TEST, POSTPONED, DONE, WONT_DO. READY, "Ready to implement",
   joined in 0.31 (keksdose live #396): **OPEN means "filed, not yet triaged"**, and
   nobody works on an OPEN row, agents included; an admin releases it for implementation
   by setting READY. An app whose status column is a database enum adds each value it
   lacks (Postgres: `ALTER TYPE feedbackstatus ADD VALUE 'READY' AFTER 'OPEN'`); existing
   OPEN rows stay OPEN, with no back-fill. **Categories** CRASH, BUG, IDEA, QUESTION,
   OTHER; CRASH is filed automatically and never pickable.
2. **One conversation model**: the team writes an **outcome**; the submitter can send
   an answered item back for **rework** (a note and at most one file; the server
   reopens it, §3.4). An answered item stays answered unless its author sends it back:
   there is no author verdict ("done") beside the rework.
   kastlan's comment thread goes: its comments were folded into their items' bodies as
   `--- COMMENT <YYYY-MM-DD HH:MM> · <name> ---` blocks, which never count as rework
   (§3.4), and its comments table and routes were dropped. keksdose's support chat stays
   keksdose-only and is out of scope (it keeps using the kit's `FeedbackThread` /
   `FeedbackComposer`).
3. **Routes**: `/feedback` (admin inbox) + `/my-feedback` (the user's own), in every
   app.
4. **Canon = keksdose's wording and behaviour**, owned by the kit in all 7 languages —
   except the submit button says **"Send"** (keksdose: "Save") and the dialog's body
   field asks **"What happened? (optional)"** (keksdose: "Description (optional)"), also
   the description editor's placeholder; the body stays optional.
   Multiple attachments + screenshot capture, crash auto-filing, Undo on status changes
   (swipes included), phone swipes on the inbox. **keksdose is the source** (Marcel,
   2026-10-04): where the kit's draft had made its own calls (the menu, the submit hint,
   the empty state, the detail heading, the crash payload's caps), keksdose's behaviour
   wins, except for Marcel's own decisions and keksdose's real defects, which the kit
   fixes (§4.3, §4.4, §4.6).

## 3. The API contract (A)

Derived from kk `backend/keksdose/adapters/api/feedback_router.py`,
`domain/schemas/feedback.py`, `domain/models/feedback.py`,
`domain/services/feedback_service.py`, `adapters/api/upload_guards.py`, and the client
in kk `frontend/src/shared/api/endpoints.ts` (`feedbackApi`). All paths under
`/api/v1`, bearer auth on every route, JSON unless stated.

### 3.1 The resource

`FeedbackResponse` (kk `schemas/feedback.py`; server-kit `feedback.FeedbackResponse`):

```jsonc
{
  "id": 412,
  "user_id": 7,                 // null = the author's account was erased (kk live #275)
  "user_email": "a@b.ch",       // admin list only (joined); null on /my, create, update
  "title": "Chart jumps on save",
  "body": "…",                  // "" when none; rework rounds are appended here (§3.4)
  "category": "BUG",            // CRASH | BUG | IDEA | QUESTION | OTHER
  "status": "OPEN",             // the 8 of §2.1
  "context": { … },             // §3.2; null on rows that have none
  "screenshot_url": "/api/v1/feedback/attachments/1ed84e1bc3c7.webp", // the ONE capture, or null
  "attachment_urls": ["/api/v1/feedback/attachments/…pdf"],           // ≤5, or null = none
  "outcome": null,              // the team's answer; null = none written
  "resolved_at": null,          // set on ENTERING DONE/WONT_DO, cleared on leaving
  "created_at": "2026-10-04T09:12:00Z",
  "updated_at": "2026-10-04T09:12:00Z"
}
```

- Extra fields are allowed and ignored by the kit (kastlan's `company_id`, `user_name`).
- **No rework counter field.** The count is read from the body's
  `--- REWORK <stamp> ---` lines (kk `frontend/src/features/feedback/body-attachments.ts`
  `reworkCount`), so nothing can forget to set it. The kit ships the reader (§5),
  anchored on `^---\s*REWORK\b` so kastlan's folded `--- COMMENT … ---` blocks (§2.2)
  never count.
- Storage (recommended, not wire): the same column names in all three
  (`feedback.title, body, category, status, context, screenshot_url, attachment_urls,
  outcome, resolved_at, crash_fingerprint`), so the outcome-writing loop tools
  (kk `scripts/feedback-live-*.sh`, KS `backend/kurvenschmiede/feedback_loop.py`) and
  one agent prompt work on every repo. The tools pick READY and IN_PROGRESS rows, never
  OPEN ones (§2.1).

### 3.2 The `context` object

Written by the dialog (the kit's `feedbackContext`) — every key
optional on read; readers treat a missing key as "unknown":

| Key | Value | Withheld when "Attach current page URL" is off? |
|---|---|---|
| `url` | full `location.href` at open time; readers also accept a path-only value (KS backfills old rows with path + search) | yes → `""` |
| `route` | its pathname | yes → `""` |
| `origin` | `location.origin` | no — which copy of the app, not personal |
| `environment` | `"prod"` / `"dev"` / `"local"` (kk `app/deploy-environment.ts`) | no |
| `user_id`, `user_email`, `user_display_name` | the submitter, snapshot | no |
| `viewport` | `"406x816"` | no |
| `ua` | `navigator.userAgent` | no |
| `version` | the app build (`__APP_VERSION__`) | no |

**Identity is the server's** (recommended for all three; Kurvenschmiede does it): the
server overwrites `user_id`, `user_email`, `user_display_name` from the session and
caps the object's size (server-kit `stamp_identity`, 8 KB), so a client cannot file in
someone else's name. Encrypting `context` at rest like the other reporter data is the
app's choice, and recommended (Kurvenschmiede does).

Crash rows add (server-written, kk `feedback_service.record_crash`): `fingerprint`,
`boundary` (`app`/`page`), `online`, `occurrences`, `first_seen_at`, `last_seen_at`,
`auto_reported: true` — and `origin` / `environment`, which the crash payload carries
(§3.6) and the server copies into `context` (keksdose does since 2026-10-04; older crash
rows have neither and read as prod). The admin list shows a non-`prod` `environment` as
a chip in the subject cell (kk `feedback-page.tsx` `environmentLabel`).

**On account erasure** (keksdose; kastlan has no erasure) the row stays and its
`context` keeps only an **allow-list** — `route`, `environment`, `viewport`, `version`,
`boundary`, `online`, `occurrences`, `first_seen_at`, `last_seen_at`, `auto_reported`
(kk `domain/services/budgets_service.py` `_FEEDBACK_CONTEXT_KEEP`). Everything else goes
— `url`, `ua`, `fingerprint`, `user_*`, and **`origin`** too: on a developer's machine it
is a LAN address or a name with an IP in it, and `environment` already says which copy
it was. The erased person's email written into the title or body (a crash body's `User:`
line) becomes `[erased]` (`_ERASED_MARK`), and the row's `crash_fingerprint` (derived
from the user id), `screenshot_url` and `attachment_urls` become NULL (the pictures are
purged unless another row names the same key). This is the contract for every app that
erases accounts.

### 3.3 Endpoints

| Method + path | Who | Request | Response |
|---|---|---|---|
| `POST /feedback/attachments` | any signed-in user | multipart `file` (one per call) | 201 `{ "url": "/api/v1/feedback/attachments/<key>" }` |
| `GET /feedback/attachments/{key}` | any signed-in user | — | the bytes; images `inline`, pdf/txt `attachment` |
| `POST /feedback` | any signed-in user | `FeedbackCreate` (§3.4) | 201 `FeedbackResponse` |
| `POST /feedback/crash` | any signed-in user | `CrashReportCreate` (§3.6) | **always 202** `CrashReportResponse` |
| `GET /feedback/my` | any signed-in user | — | `FeedbackResponse[]`, own rows, newest first |
| `GET /feedback?status_filter=` | **ADMIN** | optional status | `FeedbackResponse[]` all rows, newest first, with `user_email` |
| `PATCH /feedback/{id}` | ADMIN, or the author within the rules of §3.4 | `FeedbackUpdate` | `FeedbackResponse` |

"ADMIN" is each app's role, not "the product maintainer": in kastlan it is a
**company-scoped** ADMIN (feedback is company-scoped under forced RLS; the maintainer
works through the database), so no kit string may name "the developers" or "the team
behind the app". **The inbox is for admins only**: every other role, kastlan's MANAGER
included, lists its own reports through `GET /feedback/my`. A list is a plain array in
every app; the kit takes rows, and an envelope would be the app's to unwrap.

App-specific:

- **keksdose** demo sessions: `POST /feedback` → 403 `Demo sessions cannot submit
  feedback`, `POST /feedback/attachments` → 403 (`upload_guards.refuse_demo`),
  `POST /feedback/crash` → 202 `stored: false`. kastlan has no demo users.
- **kastlan**: its admin-only reach also covers `GET /feedback/{id}`,
  `GET /feedback/counts`, the overview tiles and the activity feed's "Feedback #x
  submitted" items (all app-side).

Not in the contract: `GET /feedback/{id}` (`?row=` deep links work off the list;
keksdose has none, and kastlan's admin-only one may stay as an app extension, the kit
never calls it), kastlan's `GET /feedback/counts` (app extension for its overview
tiles), Kurvenschmiede's `GET /feedback/categories` (the kit carries the limits), and
every comments route.

### 3.4 Writes

**Create** — `FeedbackCreate` (kk `schemas/feedback.py`; server-kit `feedback.FeedbackCreate`):

| Field | Rule |
|---|---|
| `title` | 1–255 chars, not blank |
| `body` | optional, default `""`; whitespace-only is stored as `""` |
| `category` | default `OTHER`; **`CRASH` → 422** for everyone (kk `_reject_manual_crash`) |
| `context` | object or null (§3.2) |
| `screenshot_url` | the captured screenshot's upload URL, or null; **MUST** match the app's own attachment URL pattern, like `attachment_urls` — the kit fetches it with the bearer token, so a foreign absolute URL would send the token off-origin. server-kit's `AttachmentUrlPolicy` checks both |
| `attachment_urls` | ≤ 5, each must match the app's own attachment URL pattern, deduplicated, order kept |

The client uploads every file **before** the create, so a row never names a file that
did not arrive (the kit's `useFeedbackSubmit`).

**The first status is the server's**: READY for an admin's own report (an admin filing
it has triaged it by writing it), OPEN for everyone else's, and OPEN for every crash
report, whoever's session it came from (server-kit `initial_status`). The client never
sends a status with a new row.

**Update** — `PATCH /feedback/{id}` with any of `status`, `title`, `body`, `category`,
`outcome` (`FeedbackUpdate`). Rules (kk `feedback_service.update_feedback`; server-kit
`plan_update`):

- **None means "not sent"**: an explicit `null` for `status`, `title`, `body` or
  `category` → 422; `outcome: null` clears the outcome (a real edit).
- **ADMIN**: any field, any status jump, any time. This is the status change and the
  outcome editor.
- **Author edit**: `title` / `body` / `category` only, and only while the row is OPEN,
  READY or IN_PROGRESS: nothing has been answered yet. Anything else → 403 naming the
  reason.
- **Rework** (admin or the author — anyone else gets the 403 above before the append
  is even looked at): a PATCH whose only field is `body` and whose new body strictly
  extends the old one is an append. On a row outside OPEN / READY / IN_PROGRESS the
  **server** sets the status: **READY when an admin sends the rework**, which is already
  triaged, and **OPEN otherwise**, new input for the triager (server-kit
  `rework_status`; kk `_is_rework_append`, live #331). The client never sends a status
  with it. The appended shape is fixed:

  ```text
  <old body>\n\n--- REWORK 2026-10-04 09:12 ---\n<note>\n[screenshot] /api/v1/feedback/attachments/<key>
  ```

  - the stamp is **UTC**, `YYYY-MM-DD HH:MM`
    (`new Date().toISOString().slice(0, 16).replace("T", " ")`, the kit's `appendRework`);
  - the note is **required** and trimmed — a file alone cannot be sent;
  - **one file per rework**, so at most one `[screenshot] <url>` line (the kit's
    `feedbackAttachmentLine`; the marker covers pdf/txt too despite its name);
  - `\n\n` is left out when the old body is `""`.

  Reading it back: the rework count anchors on `^---\s*REWORK\b` (whole line), so
  kastlan's folded `--- COMMENT <YYYY-MM-DD HH:MM> · <name> ---` blocks (§2.2) never
  count; the file line is `^\[screenshot\]\s+(/api/v1/feedback/attachments/[\w.-]+)\s*$`.
  Keys are opaque (§3.5), so no helper assumes `[a-f0-9]{12}`. Reworkable statuses, the
  answered ones: IN_EVALUATION, NEEDS_LIVE_TEST, POSTPONED, DONE, WONT_DO (READY is not
  among them).
- **`resolved_at`**: stamped only on a real transition **into** DONE/WONT_DO (a DONE→DONE
  re-PATCH keeps the date), cleared on leaving them (kk `update_feedback`, feedback #96).
- **Re-labelling to CRASH** → 422; CRASH → BUG stays an ordinary admin update.

### 3.5 Attachments

From kk `upload_guards.py` and `store_attachment_bytes`; server-kit `uploads.check_upload`
and `feedback.attachments`:

- Types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `application/pdf`,
  `text/plain` (no SVG/HTML). Type taken from the bare media type; anything else → 415.
- Size: **10 MB** per file (413), empty file → 400, an `image/*` that does not decode → 400.
- Count: **one screenshot + up to 5 other files** per report (kk `MAX_ATTACHMENT_URLS`).
- Key: **opaque**. keksdose content-addresses (`sha256(bytes)[:12].<ext>`, the same paste
  twice is one URL), Kurvenschmiede likewise with an HMAC-SHA256 under its data key
  (same shape); kastlan's `FileStoragePort` keys are `<uuid32>_<sha12>.<ext>` (the same
  paste twice is two URLs). Clients and kit helpers match `[\w.-]+` and never a fixed
  key shape; each server validates only its own pattern.
- Download: authenticated, so clients fetch through the authed client (`AuthedImage`
  for pictures, blob download for pdf/txt — kk `FeedbackFileDownload`); non-images are
  always served as `attachment`, never inline.
- Throttle: 20 uploads / hour / user → 429 with `Retry-After` (kk `throttle_attachment`),
  **charged before the file is read**, in all three apps (amended in round 0.36,
  [server-services §2.11](server-services-harmonization.md)): the window bounds the work a
  looping client makes the server do, and reading and sniffing 10 MB is that work. So a
  refused file uses a slot too, and one full report is up to 6 uploads. App-specific:
  keksdose's window is **shared with support-chat uploads**
  (`upload_guards._attachment_limiter`). kastlan has the same in-process limiter
  (20 uploads/h, 20 crashes/h per user); Kurvenschmiede's are per process (2 uvicorn
  workers → effectively 40/h).
- Storage is the app's: Kurvenschmiede keeps its own table and encryption. The two-step
  upload's orphans are the app's to clean (Kurvenschmiede: each upload sweeps unattached
  uploads older than 24 h, with no scheduler); the URL shape the client sees is this
  section's.

**Accepted variations** (Kurvenschmiede's; app-side and invisible to the client):

- an attachment is readable by its uploader and by anyone who can see the report that
  links it; anything else is a 404;
- the content key is an HMAC-SHA256 under the data key, same `[a-f0-9]{12}.<ext>` shape;
- a foreign report answers 404 (indistinguishable from a missing one), a rule break on
  one's own report 403;
- the type is detected from the bytes (magic numbers; pdf `%PDF-`, txt = UTF-8 without
  NUL) → 400/415, and the stored type is the detected one;
- `screenshot_url` / `attachment_urls` are derived from attachment rows (kind
  `screenshot` | `file` | `rework`), so old rows may list more than 5 `attachment_urls`;
- the limiters are per process (2 uvicorn workers → effectively 40/h).

### 3.6 Crash filing

`POST /feedback/crash`, kk `feedback_router.report_crash` + `feedback_service.record_crash`:

```jsonc
// CrashReportCreate — every string is truncated server-side, never refused
{ "name": "TypeError", "message": "x is undefined",          // message 1–2000, name ≤200
  "stack": "…", "component_stack": "…",                      // ≤8000 each
  "boundary": "page",                                        // "app" | "page"
  "url": "https://…/accounts?p=2", "route": "/accounts",     // ≤2000 / ≤500
  "version": "0.4.26", "viewport": "406x816", "ua": "…",     // ≤50 / ≤50 / ≤500
  "online": true, "occurred_at": "2026-10-04T09:12:00Z",
  "origin": "https://dev.keksdose.app", "environment": "dev" } // optional, ≤200 / ≤20 (§3.2)

// CrashReportResponse — always 202
{ "stored": true, "duplicate": false, "feedback_id": 512, "reference": "3fae6774" }
```

Server rules: suppressed (`stored: false`) above 20 reports / hour / user (and for
keksdose's demo users); **fingerprint** = `sha256(user id, version, route, name,
normalised message, first 3 normalised stack lines)[:32]`, normalising hex runs ≥ 6 and
digits to `#`; a fingerprint matching a row **not** in DONE/WONT_DO bumps
`context.occurrences` and `last_seen_at` (`duplicate: true`), a settled one files a new
row (a regression is news). New row: category CRASH, status OPEN, title
`[crash] <name>: <message>` (≤ 255), body a plain-text diagnostics block (kk
`_crash_body`), `crash_fingerprint` in its own indexed column. `reference` = the first 8
fingerprint characters, shown in the fallback so a user can quote it. The limiter is hit
**before** the dedupe, in all three apps (amended in round 0.36,
[server-services §2.11](server-services-harmonization.md)): the lookup and the write are
the work a page in a render loop makes the server do. So duplicates count too, and
`occurrences` stops rising after 20 in an hour.

### 3.7 Errors

FastAPI's `{"detail": "<sentence>"}` in all three (kastlan's `DomainError` handler emits
the same shape); validation errors are FastAPI's `{"detail": [ … ]}` list. Clients show
`detail` when it is a string, else their fallback toast (kk `extractApiErrorMessage`).

| Status | When |
|---|---|
| 400 | empty file; image that does not decode |
| 403 | not admin on `GET /feedback` (`Insufficient role`); not the author; author changing a forbidden field or a frozen row |
| 403 (keksdose only) | demo session on `POST /feedback` (`Demo sessions cannot submit feedback`) or `POST /feedback/attachments` |
| 404 | `Feedback not found`; `Attachment not found` |
| 413 / 415 | file over 10 MB / type outside §3.5 |
| 422 | CRASH set by hand; explicit null on a NOT NULL field; blank title; an `attachment_urls` or `screenshot_url` entry that is not the app's own (§3.4) |
| 429 | upload throttle (`Retry-After`) |

The kit only toasts `detail`, so an app may answer a foreign row with 404 rather than
403 (Kurvenschmiede does, §3.5) without the client noticing.

### 3.8 What kastlan and Kurvenschmiede change

Moved to [archive/feedback-history.md](archive/feedback-history.md): the two apps' changes
to reach the contract, all made. Kurvenschmiede's accepted variations are in §3.5.

## 4. The UI contract (B)

The canonical English is keksdose's (kk `frontend/src/shared/i18n/locales/en.json`,
`feedback.*`), the German its `de-CH.json` (ss, never ß), except the two decided
changes marked ★ and the wording of §2.4. The kit carries all seven languages (fr, it,
es, hu, zh translated). Key names in backticks are the kit's label paths (§5). No string
names "the developers" or "the team": "admin" means a different person per app (§3.3).

### 4.1 Top-bar feedback menu

The kit's `FeedbackMenu`, keksdose's menu on the kit's `TopBarActionMenu`. No heading.

| Part | Canon | EN | DE-CH |
|---|---|---|---|
| Trigger | `MessageSquare`, `aria-label` | Send feedback | Feedback senden |
| Rows | `Bug`, `Lightbulb`, `HelpCircle`, `MoreHorizontal` → opens the dialog on that category | Bug · Idea · Question · Other | Fehler · Idee · Frage · Sonstiges |
| Divider | always | — | — |
| Extra entries (app, optional) | keksdose: `Sparkles` Help assistant → `/assistant`, `MessagesSquare` Support chat → `/support` with unread chip | Help assistant · Support chat | Hilfe-Assistent · Support-Chat |
| List link, last | `Inbox`, ONE by role: **admins** → `/feedback`, **everyone else** → `/my-feedback` | View feedback / My feedback | Feedback ansehen / Mein Feedback |
| Trigger badge (optional) | `iconBadge` the app supplies (keksdose: support unread, `danger`) | app's words | app's words |

CRASH never appears as a row. Position in the bar stays each app's. The list link is
keksdose's (feedback #331): an admin reaches their own reports through the inbox. The
menu is the one entry point: no hotkey, event or account-menu item opens the dialog.

### 4.2 Submit dialog

The kit's `FeedbackDialog` in `attachments="multiple"`, `requireBody={false}`, wired by
`useFeedbackSubmit`. Default category when opened from a row: that row's.

| Part | EN | DE-CH |
|---|---|---|
| Title | Send feedback | Feedback senden |
| Category field | Category | Kategorie |
| Subject field (required, ≤ 255) | Subject | Betreff |
| Body field ★ | What happened? (optional) | Was ist passiert? (optional) |
| Attachments heading / list name | Attachments | Anhänge |
| Screenshot chip | Screenshot | Screenshot |
| Add button | Add attachment | Anhang hinzufügen |
| Capture button (only while no screenshot is held) | Capture screenshot | Screenshot aufnehmen |
| Paste hint | …or paste a screenshot straight from the clipboard, so you can show one corner rather than the whole page. | …oder einen Screenshot direkt aus der Zwischenablage einfügen — so lässt sich ein Ausschnitt zeigen statt der ganzen Seite. |
| Remove (generic / per file) | Remove attachment / Remove {{name}} | Anhang entfernen / {{name}} entfernen |
| Limit (plural) | Up to {{count}} attachment(s) — remove it/one to add another. | Höchstens {{count}} Anhang/Anhänge – entfernen Sie ihn/einen, um einen weiteren hinzuzufügen. |
| Submit hint (a function of the platform, `(apple) => …`, as `form.submitShortcut` is; Apple = a Mac, iPhone or iPad) | Ctrl+Enter to send — on Apple: ⌘ Enter to send | Strg+Enter zum Senden — on Apple: ⌘ Enter zum Senden |
| Buttons ★ | Cancel · **Send** | Abbrechen · **Senden** |

Attachments: accept png/jpeg/webp/gif/pdf/txt, 10 MB, 5 files + the one capture; paste
adds a file. **Context box** (the dialog's `contextSlot`, the kit's `FeedbackContextBox`):

| Line | EN | DE-CH |
|---|---|---|
| Submitter | **User:** {display name} ({email}) — "—" when unknown; the colon is the language's (`common.fieldValue`: fr "Utilisateur : " with a no-break space, zh "用户：") | **Nutzer:** … |
| Checkbox, on by default, URL beneath (struck through when off) | Attach current page URL | Aktuelle Seiten-URL anhängen |

Toasts:

| When | EN | DE-CH |
|---|---|---|
| Filed | Thanks for the feedback! | Danke für Ihr Feedback! |
| Create failed (server `detail` wins) | Could not submit feedback | Feedback konnte nicht gesendet werden |
| Wrong type | Only images, PDF or text files are allowed | Nur Bilder, PDF- oder Textdateien sind erlaubt |
| Too large | File is larger than 10 MB | Datei ist grösser als 10 MB |
| Too many picked | Only {{count}} attachments fit — the rest were left out. | Es passen nur {{count}} Anhänge – die übrigen wurden weggelassen. |
| Capture failed | Could not capture a screenshot | Screenshot konnte nicht aufgenommen werden |

### 4.3 The two pages

One page component, two routes: `/feedback` is the admin inbox (editable; a non-admin is
redirected to `/my-feedback`), `/my-feedback` the user's own: no status or outcome
editing there (also for an admin), but the author can send an answered item back for
rework **and** edit the description while it is OPEN, READY or IN_PROGRESS
(`FEEDBACK_AUTHOR_EDITABLE_STATUSES`; keksdose's `canAuthorEdit`), on either page.

| Part | EN | DE-CH |
|---|---|---|
| Title `/feedback` | Feedback | Feedback |
| Title `/my-feedback` | My feedback | Mein Feedback |
| Empty table, both pages, also when a filter leaves nothing; no hint beneath (keksdose `common.none`) | None | Keine |
| Erased author | <deleted user> | <gelöschter Nutzer> |

Columns, in order (kit `DataTable`, `urlSync`, `storageKey="feedback"`, newest first):

| # | Header EN / DE-CH | Cell | Filter | Phone |
|---|---|---|---|---|
| 1 | # | id, mono | number | hidden |
| 2 | Date / Datum | created date (app date cell, with weekday) | date | |
| 3 | Category / Kategorie | `FeedbackCategoryBadge`, sorted by `feedbackCategoryRank` | select, translated, CRASH first | |
| 4 | Subject / Betreff | title + env chip (non-prod `context.environment`, upper case) + **Rework** / **Rework ×{{count}}** chip (DE Nacharbeit / Nacharbeit ×{{count}}) | text (title + env) | card heading |
| 5 | User / Nutzer | display name → email → `user #id`; erased → <deleted user> | text | |
| 6 | Email / E-Mail | `user_email` → `context.user_email` | text | hidden |
| 7 | URL | link (`noRowLink`): text = pathname, `href` = path + query + hash (kk `localHref`); aria "Open page" / "Seite öffnen" | text | hidden |
| 8 | Status | `FeedbackStatusTransitions variant="icon"` with `visibleFeedbackStatuses` | select, chain order | |
| 9 | Resolved / Erledigt am | `resolved_at` date | date | hidden |

- **Deep link: `?row=<id>`** (kit `useSearchParamState`, `history: "replace"`); every row
  is a real link that keeps the table's other params. Kurvenschmiede's `?report=` is
  read once and rewritten.
- **Phone**: cards grouped by day header; card = title + env chip + rework chip +
  `FeedbackStatusBadge` on one line, compact category badge · date · (admin) submitter
  beneath. The kit's `FeedbackMobileCard` renders the two chips **itself**: `DataTable`
  (`src/components/data-table.tsx`) never renders the `mobilePrimary` cell when
  `mobileCard` is set, which is why keksdose's own cards showed neither. Admin only: a
  `FloatingActionGroup` (aria "Feedback actions" / "Feedback-Aktionen") with one `Eye`
  toggle, `FeedbackAwaitingToggle`, **"Only what is waiting for you" / "Nur was auf Sie
  wartet"**, narrowing to OPEN, IN_EVALUATION and NEEDS_LIVE_TEST
  (`FEEDBACK_AWAITING_STATUSES`; page state, not URL). An OPEN row waits on the
  triager; READY waits on the implementer.

### 4.4 Row detail

Expanded inline under its row, the kit's `FeedbackRowDetail` (on `FeedbackDetail` +
`FeedbackDetailSection`). It **opens with the subject**, `FeedbackSubject` (title and
category badge), so a scrolled table still says which entry is being answered
(keksdose live #395); `showSubject={false}` leaves it out for an app that already shows
the title beside the detail. Then the sections, in this order:

1. **Description** / **Beschreibung** — the body without its
   `[screenshot]` lines; "—" when empty. Action for the **author while OPEN, READY or
   IN_PROGRESS**, on either page: button **Edit** / **Bearbeiten**, aria **Edit
   description** / **Beschreibung bearbeiten** → `FeedbackNoteEditor` (placeholder =
   the dialog's body label, **Save** / **Speichern**, **Cancel** / **Abbrechen**);
   clearing it saves `""`. The editor holds **only the original description**
   (`splitDescription`, `replaceDescription`): editing the raw body, as keksdose's did,
   would let an author delete `--- REWORK … ---` blocks and `[screenshot] /api/…` lines
   and lose the history. The kit keeps the rework (and folded comment) blocks and the
   file lines out of the editable text and re-appends them unchanged on save.
2. **URL** — when `context.url` is set, else `context.route` (a path-only `url` is
   accepted — Kurvenschmiede's backfilled rows): the link's text and `href` are path +
   query + hash (kk `localHref`), and `CopyButton` **Copy URL** / **URL kopieren**
   copies the full `context.url`. keksdose's label is its shared `more.copy_url` key,
   which stays app-side; the kit carries the same words in its own namespace.
3. **Attachment** / **Anhang** — screenshot, then `attachment_urls`, then rework
   pictures from the body, in that order; images via `AuthedImage`, pdf/txt as a
   download button aria **Download {{name}}** / **{{name}} herunterladen**; failure
   toast **The attachment could not be downloaded.** / **Der Anhang konnte nicht
   heruntergeladen werden.**
4. **Outcome** / **Ergebnis** — action slot **Resolved: {date}** / **Erledigt am: {date}**
   when `resolved_at`. Body: the outcome prose ("—" when none) and a button row:
   - admin on `/feedback`: **Add outcome** / **Ergebnis hinzufügen**, or **Update** /
     **Aktualisieren** once one exists → `FeedbackNoteEditor`, placeholder **What was
     done, decided, or why this won't be addressed.** / **Was wurde umgesetzt,
     entschieden oder warum nicht.**; blank saves `null`;
   - admin or author, status reworkable (§3.4): `RotateCcw` **Rework** / **Nacharbeit**;
   - when the URL (or the route fallback above) is set: `ExternalLink` **Open page** /
     **Seite öffnen** (a real `href`, path + query + hash).
5. **Send for rework** / **Zur Nacharbeit senden** — only while reworking:
   `FeedbackNoteEditor` with a **one-file** attachment field (add, capture or paste;
   same types and size), placeholder **What still needs refinement? Any new
   constraints or change of direction.** / **Was muss noch angepasst werden? Neue
   Anforderungen oder Richtungswechsel.**, buttons **Send rework** / **Nacharbeit
   senden** and Cancel. The note is required (§3.4); the file is uploaded first, and if
   that fails nothing is sent: **The file could not be uploaded. The rework was not
   sent.** / **Die Datei konnte nicht hochgeladen werden. Die Nacharbeit wurde nicht
   gesendet.** (it fires for pdf/txt too, so it names a file, not a screenshot). German
   says **Nacharbeit** throughout.
6. **Status** — `FeedbackStatusTransitions variant="pill"`: admin on `/feedback` gets
   `selectableFeedbackStatuses` (all 8), everyone else the read-only
   `visibleFeedbackStatuses`.

Any failed PATCH toasts the server's `detail`, else **Could not save that change.** /
**Änderung konnte nicht gespeichert werden.**

### 4.5 Status changes

| Where | Control |
|---|---|
| Table cell | `FeedbackStatusTransitions variant="icon"`, `visibleFeedbackStatuses` (one step either way + the three off-chain) |
| Row detail | `variant="pill"`, `selectableFeedbackStatuses` for the admin |
| Phone card | swipe (admin, `/feedback` only) |

**Undo** (the kit's `useFeedbackStatusUndo`; keksdose's `changeStatusUndoably`): after
the PATCH lands, an 8 s success toast
**Set to “{{status}}”: {{title}}** / **Auf „{{status}}“ gesetzt: {{title}}** with action
**Undo** / **Rückgängig**, which PATCHes the previous status and confirms **Back to
“{{status}}”: {{title}}** / **Zurück auf „{{status}}“: {{title}}**. Fired from the page's
mutation, so it still arrives when a status filter has already removed the row.

**Swipes** (the kit's `feedbackSwipePlan`, `DEFAULT_FEEDBACK_SWIPE`): actions `advance`
(to `nextFeedbackStatus`, `ChevronsRight`, tone `info`, label = the next status), `done`
(`Check`, tone `success`, "Done"), `wont_do` (`Ban`, tone `danger`, "Won't do"); an
action the row cannot take drops out. Default binding: toward the end advance, then done
on the longer drag; toward the start won't do. keksdose lets the user rebind them
(Settings → Interaction) and stores **physical** `right` / `left` ladders with `"none"`
fillers over the ids `advance` | `done` | `wont_do`, mapping them to
`{ end: right, start: left }` as its translations page does. The kit's inbox binding
uses exactly those three ids on logical `start` / `end` ladders and drops `"none"` or
any unknown id, mirroring `TranslationReviewPanel`'s binding. The other two apps use the
default. **Every swipe commits through the same undoable change as a tap**: the 8 s
"Set to …" toast with Undo (`feedbackSwipePlan` takes `useFeedbackStatusUndo`'s
change).

### 4.6 Crash filing (client)

The kit's `createCrashReporter` (keksdose's `crash-report.ts`, lifted) as the boundary's
`onReport` + `redact`, on both placements (`app`, `page`):

- maps the kit's `CrashReport` to §3.6 (`placement` → `boundary`, anything but `app` is
  `page`), adds `origin` and `environment`, clamped to the server's caps;
- `redact` reduces the page to its path + an **allow-list** of query params (kk: `p ps
  sort tab g granularity month preset from to tstate future archived uncleared`) — the
  list is the app's, the mechanism the kit's; no `q`, no `f.*`, no ids;
- never files: chunk-load errors (the kit already withholds them), demo sessions, a
  crash within 10 s of a Vite hot update (dev only);
- posts with a bare `fetch` + `keepalive` and the bearer token — not the app's axios
  client, whose 401 handler would log the user out of a crashed page;
- never assumes a session token: offline or signed out → buffered in `localStorage`
  (newest 3), flushed at start-up and when a token appears (`flushPending`, wired by the
  app);
  401/5xx are retried, other 4xx dropped. A signed-out visitor's crash stays buffered
  until a sign-in (Kurvenschmiede's public pages; accepted — there is no
  unauthenticated crash endpoint);
- resolves "filed" **only when the server answered `stored === true`** —
  `{ reference }` when it gave one, `{}` otherwise; `stored: false` (limiter, demo) and
  every failure resolve `{ filed: false }`, so the fallback (`ErrorBoundary`,
  `src/components/error-boundary.tsx`) never claims a report that was not filed.
  keksdose's own reporter keyed on `res.ok` + `reference` and claimed a filing on a 202
  `stored: false`; the kit's doesn't;
- must never throw.

## 5. What the kit adds, what stays app-side (C)

**Kit** (all under `@eifi1/ui-kit/feedback`, re-exported from the main barrel):

- **Label namespaces**, all 7 languages, keksdose's text as the English defaults:
  `feedbackStatus` (8; READY is "Ready to implement" / „Bereit zur Umsetzung"),
  `feedbackCategory` (5), `feedbackMenu`, `feedbackContext`,
  `feedbackPage` (titles, columns, empty, deleted user, rework chip, awaiting filter,
  phone actions), `feedbackDetail` (sections, edit, outcome, rework, open page, copy URL,
  resolved, download), `feedbackToast` (§4.2 toasts, update failed, Undo trio).
  `feedbackDialog` / `feedbackAttachment` carry the canon (★; `submitHint` "Ctrl+Enter
  to send", ⌘ on Apple; `attachmentAdd` "Add attachment"; the longer paste hint).
- **Statuses and categories:** `FeedbackStatus` and `FeedbackCategory`,
  `FEEDBACK_STATUS_META` (an icon and a tone per status; READY has its own icon and the
  brand tint at full strength, so it reads as "go" beside NEEDS_LIVE_TEST's muted brand
  and OPEN's neutral fill), `FEEDBACK_STATUS_ORDER` (chain order),
  `nextFeedbackStatus`, `visibleFeedbackStatuses`, `selectableFeedbackStatuses`,
  `FeedbackStatusBadge`, `FeedbackCategoryBadge`, `FeedbackStatusTransitions`.
- **`FeedbackRecord`** type = §3.1, `FeedbackContext` type = §3.2: the apps share one
  shape.
- **Constants**: `FEEDBACK_ATTACHMENT_ACCEPT` (images + pdf + txt),
  `DEFAULT_MAX_ATTACHMENTS` (5) / `DEFAULT_MAX_ATTACHMENT_BYTES` (10 MB),
  `FEEDBACK_PICKABLE_CATEGORIES` (no CRASH), `FEEDBACK_REWORKABLE_STATUSES` (the five
  answered), `FEEDBACK_AUTHOR_EDITABLE_STATUSES` (OPEN, READY, IN_PROGRESS),
  `FEEDBACK_AWAITING_STATUSES` (OPEN, IN_EVALUATION, NEEDS_LIVE_TEST).
- **Body helpers** (from kk `body-attachments.ts`): `appendRework(body, note, url?, now)`
  (one file, UTC stamp), `reworkCount(body)` anchored on `^---\s*REWORK\b`,
  `feedbackAttachmentLine(url)`, `splitBodyAttachments(body)`, `splitDescription(body)`
  and `replaceDescription(body, description)` (the original description vs the appended
  rework/comment blocks, for §4.4.1's editor), `isImageAttachment(url)`,
  `attachmentName(url)` — every key match is `[\w.-]+` (kastlan's `<uuid32>_<sha12>`
  keys), never a fixed hex shape.
- **`FeedbackMenu`** — `TopBarActionMenu` preset: the four category rows, divider,
  `extraEntries`, then "View feedback" when `isAdmin`, else "My feedback"; `iconBadge`,
  `onFile(category)`.
- **`FeedbackContextBox`** + **`feedbackContext({ user, attachUrl, url, environment,
  version })`** — the box's wording and the §3.2 object, so the two cannot drift.
- **`useFeedbackSubmit({ upload, create, user, environment, version, onSubmitted,
  errorMessage })`** → `{ open(category?), close, dialog }` — the dialog with the canon
  props (`multiple`, accept, limits, error toasts, capture), taking `upload(file) → url`
  and `create(payload)` (a `FeedbackCreatePayload`) from the app; it uploads every file,
  then creates.
- **`captureAppScreenshot({ rootId = "root" })`** — keksdose's `capture-screenshot.ts`
  (style-property allow-list, viewport and `display:none` filter, WebP with PNG
  fallback). `modern-screenshot` becomes an **optional peer**
  (`peerDependenciesMeta.optional`, like `sonner`) loaded with a dynamic `import()`, so
  an app without it pays nothing and an app that calls the helper without it gets a
  rejected promise (→ the capture-failed toast).
- **`createCrashReporter({ endpoint, getToken, allowParams, storageKey, suppress,
  environment, origin?, version? })`** → `{ onReport, redact, flushPending }` — §4.6: filed only on
  `stored === true`, buffers while `getToken()` is empty, adds `origin` / `environment`;
  the endpoint, token source, allow-list and demo check come from the app.
- **`feedbackColumns({ canEdit, onStatus, renderDate, … })`** — §4.3's nine columns
  (`useFeedbackColumns` with the provider's words, memoised), plus
  `feedbackMobileGroupBy` and `FeedbackMobileCard`, which draws the env and rework chips
  itself (§4.3), and `FeedbackEmptyState`.
- **`FeedbackRowDetail`** — §4.4, taking the row, `canEdit`, `viewerId`, `onUpdate`,
  `onUpload`, a `fetcher` (`AuthedFetcher`) for pictures and downloads, and
  `showSubject`; opens with `FeedbackSubject` and owns the description editor (original
  text only), the URL/route fallback, the outcome editor and the **rework section**
  (`FeedbackReworkSection`, one file, exported for reuse).
- **`useFeedbackStatusUndo(mutate)`** — §4.5's toast trio around one status PATCH, used
  by the table, the detail and the swipes.
- **`FEEDBACK_SWIPE_ACTIONS` (`advance`, `done`, `wont_do`), `DEFAULT_FEEDBACK_SWIPE`,
  `feedbackSwipePlan(binding, row)`** — modelled on 0.26's `translationReviewSwipePlan`
  (logical `start`/`end` ladders, `"none"` and unknown ids dropped), returning what
  `DataTable mobileSwipeActions` takes.
- **`FeedbackAwaitingToggle`** — the phone `FloatingAction` of §4.3.

**server-kit** (`eifi1_server_kit.feedback`, since 0.1.0) carries §3 as code: the schemas
(`FeedbackCreate`, `FeedbackUpdate` with the explicit-null guard, `FeedbackResponse`,
`CrashReportCreate`, `CrashReportResponse`), `FeedbackStatus` and its sets
(`AUTHOR_EDITABLE_STATUSES`, `REWORKABLE_STATUSES`, `AWAITING_STATUSES`),
`plan_update` (the author lanes, the rework re-open, `resolved_at`, the CRASH refusal),
`initial_status(author_is_admin=, crash=)` and `rework_status(actor_is_admin=)` (0.5,
READY), the rework body helpers, crash filing (`crash_fingerprint`, `decide_crash`),
erasure (`FEEDBACK_CONTEXT_KEEP`, `anonymise_feedback`), `AttachmentUrlPolicy` and
`stamp_identity`. The tables, routes, limiters and storage stay the app's.

**App**: the API client and query keys; auth, roles and the admin check; route
registration and the `/feedback` → `/my-feedback` redirect; the upload/create calls
handed to the kit; `AuthedImage`'s fetcher; app version and deploy environment; the
crash endpoint, token source, demo check and query-param allow-list; swipe-binding
storage (keksdose's Settings → Interaction); tour anchors; keksdose's support chat and
help assistant entries; the outcome loop tooling; app-only extras (kastlan's counts
tiles).

## 6. Per repo (D)

Moved to [archive/feedback-history.md](archive/feedback-history.md): the kit's and each
app's steps to the contract, all shipped (ui-kit 0.27, server-kit 0.1, and the apps'
adoptions).

## 7. Settled points — the final canon (2026-10-04)

The points keep their numbers, which the code cites. Each one is folded into the section
it settled and points there; the wording is in
[archive/feedback-history.md](archive/feedback-history.md). (M) marks Marcel's own
decisions.

1. **(M) Rework** → §3.4.
2. **(M) The author's "done" goes** → §2.2.
3. **Detail heading** → §4.4.
4. **(M) The dialog's body field, and "Send"** → §2.4, §4.2, §4.4.
5. **kastlan's list envelope** → §3.3.
6. **(M) Inbox access: admins only** → §3.3.
7. **(M) kastlan's existing comments fold into the item** → §2.2, §3.4.
8. **Kurvenschmiede's attachment storage** → §3.5.
9. **Kurvenschmiede's `context` encryption** → §3.2.
10. **(M) Undo on swipes** → §4.5.
11. **Entry points** → §4.1.
12. **Submit hint** → §4.2.
13. **Empty states** → §4.3.
14. **(M) German rework wording** → §4.4.
15. **`GET /feedback/{id}`** → §3.3.
16. **Crash payload and erasure** → §3.2, §3.6.

keksdose's defects the kit fixed rather than copied (the crash reporter's "filed", the
phone cards' chips, the description editor) are in §4.6, §4.3 and §4.4.

## 8. Amendment for 0.31 (Marcel, 2026-10-07)

Two of Marcel's keksdose feedback rows, built in ui-kit 0.31 and server-kit 0.5. Both are
folded into the sections they amend; the wording is in the archive.

### 8.1 The subject in the expanded row (keksdose live #395)

→ §4.4 (`FeedbackSubject`, `showSubject`) and §5.

### 8.2 A triage step: READY, "Ready to implement" (keksdose live #396)

→ §2.1 (the eighth status, what OPEN means, the database enum), §3.1 (the loop tools),
§3.4 (the first status, the author's edits, where a rework goes), §4.3 and §4.4 (the
author's edit, the awaiting toggle), §5 (the colour, the constants, server-kit's
`initial_status` and `rework_status`).

## 9. Round 0.38: public feedback (settled 2026-10-14)

Round 0.38 (Marcel, 2026-10-14, relayed by keksdose) opens the reports to the app's other
users: the people the app lets in read the reports, say "I want this too", and comment;
the admin's answer becomes a list of replies instead of one `outcome` field. Built from a
read-only survey on 2026-10-14 (kk `f6acbc41`, ka `fe8bf78`, KS `7dc6985`, all on
`feat/kit-0.37`; server-kit 0.10.0 `2023006`; ui-kit `495d6b1`) and the three apps' reviews
of the same day (9.18). **Settled 2026-10-14 (Marcel, in the ui-kit session).** Built for
**server-kit 0.11** and **ui-kit 0.38**. keksdose's shape is the model. §1–§8 stand; where
this section changes them it says so (§3.1 `outcome`, §3.3 the routes, §4.4.4 the
Outcome section, §5 the kit's parts).

### 9.1 Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Others' reports, for a non-admin | none: `GET /feedback/my` only; the inbox is `admin_guard` (the kit's router, `router.py:215-235`; kk `adapters/api/feedback_router.py:75-87`, `require_role(ADMIN)` `:81`) | none: `/feedback`, `/feedback/{id}`, `/feedback/counts` are `ADMIN_ONLY` (`adapters/api/feedback_router.py:73`, `:86-103`); `/my-feedback` redirect `pages/feedback-page.tsx:106` | none: `visible_to` narrows a non-admin to `user_id = viewer` (`domain/services/feedback_service.py:112-122`); a foreign row is 404 (`:72`) |
| Scope of "every user" | the whole app | **one company**: `Feedback` is a `CompanyMixin` table under forced RLS (`domain/models/feedback.py:21`, `infrastructure/rls.py:65-82`), and the roles are per company, TENANT included (`domain/models/auth.py:17-21`, `:144-154`) | the whole app; roles ADMIN, MEMBER, CUSTOMER (an outside reader who may file, `adapters/api/feedback_router.py:56-60`), REVIEWER (`domain/models/user.py:41-58`) |
| The answer | `outcome` Text, one field, overwritten (`domain/models/feedback.py:72`) | `outcome` Text (`domain/models/feedback.py:56`); also read by the export (`domain/services/account_service.py:300`) | `outcome` sealed, `EncryptedText` (`domain/models/feedback.py:137`) |
| Comments | `feedback_comments`, **dormant**: model kept as "RETAINED DATA", routes deleted in refactor L2-8, 14 live rows of 2026-08-11 on #181–#194 (`domain/models/feedback.py:76-106`); created in `alembic/versions/20260430_0001_initial_schema.py:218-227` (`feedback_id` `ON DELETE CASCADE`), `user_id` nullable since `20260906_0098_feedback_anonymisable.py:56`. Still read by the export (`account_export_service.py:270-278`, `:324-325`, as `"from": "you" \| "keksdose"`), scrubbed by the erasure (`budgets_service.py:1255-1260`), reaped for demo users | **dropped**: folded into `body` as `--- COMMENT <stamp> · <First Last \| email \| user #id> ---` blocks (`alembic/versions/b4d6f8a0c2e4_feedback_fold_comments.py:1-22`, `:43-68`); none left to split (0 blocks: 62 rows local, 17 in prod) | none; the conversation is `body`'s rework blocks and `outcome` |
| Titles and bodies | plain | plain | **sealed** (`EncryptedText`, `domain/models/feedback.py:122`, `:127`; `context` `EncryptedJson` `:130`): no SQL search or sort on them; decrypting costs ~30 µs a value |
| Attachments, by key | any signed-in user who has the URL (the storage's `read` ignores the viewer) | the same | the uploader, or anyone who can see the report that links it (§3.5's accepted variation; `feedback_service.py:470-480`) |
| Votes | none | none (the only votes are owner-meeting tallies, `domain/models/owner_meeting.py:125-127`) | none |
| First names | `first_name` NOT NULL, `last_name` default `""`; **migration 0114 moved the old `display_name` whole into `first_name`** (`domain/models/user.py:51-58`); such an account is `name_incomplete` until it completes its name (`frontend/src/features/auth/complete-name-prompt.tsx`) | `first_name`, `last_name`, both NOT NULL (`domain/models/auth.py:30-31`); every non-demo account complete | `first_name` NOT NULL, `last_name`; the old `display_name` moved into `first_name` (`domain/models/user.py:67-74`) |
| The loop's write path | `keksdose_feedback` login: `SELECT` on `feedback`, `UPDATE (status, outcome)`; may not read `users` (`scripts/feedback-live-setup.sh:39-41`, `:54-56`); `feedback-live-write.sh` runs a file of `UPDATE`s under `psql -1`, one transaction, terminal status IN_EVALUATION (`:6-9`, `:18`) | the Claude session's raw SQL `UPDATE feedback SET status, outcome` through `scripts/feedback-db.sh`, as `kastlan_app` after `SET app.bypass_rls` (`:56-57`) | `feedback_loop.py --resolve` writes status and outcome through `feedback_service.save` as the first admin, on the app's own login (`feedback_loop.py:244-297`) |
| A feedback notification | none (`domain/models/push_subscription.py:38-63`: nine types, no feedback one) | none (`domain/services/notification_types.py:18-22`); its `app` channel is a company-wide poller | `feedback_answered`, e-mail, on (`domain/models/notification.py:40`, `:48-53`), fired from `save` → `notification_service.feedback_saved` when the status crosses into an answered one (`notification_service.py:224`, `:245-272`) |
| Erasure | the kit's `erase_author`, then the comments scrubbed and nulled (`budgets_service.py:1218-1262`) | `erase_author` (`admin_user_service.py:375-377`) | `erase_author` (`erasure_service.py:423-438`) |
| Export | own reports with `outcome` and every comment on them (`account_export_service.py:268-331`) | own reports with `outcome` (`account_service.py:244`, `:294-305`) | own reports (`export_service.py:89-92`) |
| Demo | refused on writes (§3.3) | throwaway `is_demo` accounts, minted at the gate (`domain/services/demo_session_service.py:119`, `last_name=""` `:129`), refused on writes at sign-in (`adapters/api/feedback_router.py:58-62`) | `is_demo` accounts, refused by `not_in_the_demo` (`feedback_router.py:78`); **the demo is public**: anyone may open `/demo`, no invitation (`frontend/src/features/demo/demo-pages.tsx:12`) |

The kit: `FeedbackResponse` has one `outcome` (server-kit `feedback/schemas.py:155-182`;
ui-kit `FeedbackRecord`, `src/feedback/feedback-record.ts:84-120`); `FeedbackRowDetail`'s
Outcome section is one editor (§4.4.4). A crash body carries the reporter's address
(`User: <email> (#<id>)`, server-kit `feedback/crash.py:142`). ui-kit already has a
conversation part, `FeedbackThread` with `own`, `staff` and event lines
(`src/feedback/feedback-thread.tsx:108-147`, `:187`).

### 9.2 Decisions

Marcel settled the round on 2026-10-14 in the ui-kit session: "as recommended", and "Add
kastlan recommended, option b where all the past ones can be seen. They are essentially
only mine." The five relayed decisions are confirmed. Each line below is the rule.

**The five (confirmed):**
1. **Visibility: all, minus attachments.** A report is visible to every person the app's
   predicate lets in (decision 7): title, the public body, category, status, replies,
   comments. **Never to others:** `screenshot_url`, `attachment_urls`, `context`,
   `crash_fingerprint`, the author's address.
2. **Rating: an upvote only** ("I want this too"), one per person per report, a count,
   sortable in the admin inbox. No down-votes, no stars.
3. **Names: others by first name only**, on reports, comments and replies (9.5). The
   admin still sees the whole account.
4. **Comments by others: each its own row** (author, date, body), a thread, never folded
   into a text field. The admin hides a comment. keksdose's `feedback_comments` is
   revived (9.8).
5. **Admin replies as a list:** each answer its own row (author, date, body, the status
   change it made, if any), a timeline in the admin row. Each existing `outcome`
   migrates in as the first reply. The loops write replies (9.13).

**The rest:**
6. **Existing reports become public (option b), with a per-report `public` flag** (9.3):
   - `feedback.public` (boolean, NOT NULL). **The migration sets it `true` on every
     existing report but a CRASH** (they are essentially Marcel's own) and marks those
     rows `filed_private = true`.
   - **A notice with an opt-out** goes once to each other author of such a report (9.12):
     the report numbers, what others now see and never see, and how to keep a report
     private.
   - **Who sets it:** an admin, any time; the author, while the report is open (OPEN,
     READY, IN_PROGRESS, the author's edit window), and **on a `filed_private` report at
     any status** (that is the opt-out).
   - **New reports are public by default** (a CRASH never). The dialog says so, under
     the body: **"Other users will see the title and text (never your screenshots or
     files)."** / **"Andere Personen sehen Titel und Text (nie Ihre Screenshots oder
     Dateien)."**
7. **Who sees the public parts is the app's predicate**, a callable on the viewer in
   `FeedbackDeps` (`public_viewer`). An admin always passes; a demo never does (8).
   keksdose: every signed-in user. Kurvenschmiede: ADMIN, MEMBER, REVIEWER, **never
   CUSTOMER** (a customer files and reads their own reports only). kastlan: **off**
   (`None`): the public routes are not mounted, no menu entry, no votes, no comments;
   **replies ship everywhere** (they are not public parts). Should kastlan switch it on
   later: per company (RLS), staff only (`ALL_EMPLOYEES`, never TENANT).
8. **A demo is treated as not signed in for the public parts:** the public GETs answer
   it 404, as to anyone outside the predicate; a vote or comment is the app's demo
   refusal (403 `demo_refused`, kastlan's sign-in refusal `demo_read_only`). KS's demo
   is open to anyone, so no public report may reach it.
9. **Crash reports are private** (P-a): a CRASH row is never public, whatever its flag;
   its body carries the reporter's address. It gets no votes and no comments; replies
   work. A crash re-labelled BUG keeps `public = false` until an admin sets it.
10. **The public body and every comment and reply body shown to others strip every
    attachment URL anywhere** (`/api/v1/feedback/attachments/<key>`, the app's prefix),
    not only the `[screenshot]` lines (P-b, P-e). 9.4.
11. **Names: `first_name_of(first, last)` = `first` trimmed when `last` is not blank,
    else `None`.** No guessing at a first word. `None` is shown as **"A user"** /
    **"Eine Person"**, as an erased author is (9.5). Demo throwaways keep `last_name ""`.
12. **Files: a predicate of their own**, separate from who sees the report: the
    uploader, the report's author, an admin. Never "anyone who sees the report". Written
    into the storage port's docs (9.10).
13. **Replies notify; a status alone does not.** `feedback_answered` fires on a reply,
    so a status-only move to a decided status (DONE, WONT_DO, POSTPONED) nudges the admin
    toward a reply, and the status picker lives in the reply composer (9.7, 9.15).
14. **Notifications:** `feedback_answered` (a reply) and `feedback_comment` (a visible
    comment), to the author and the earlier commenters, never the writer; on by default;
    no content in mail or push. kastlan: `feedback_answered` by e-mail only;
    `feedback_comment` not declared while public is off. 9.11.
15. **The loops write replies** (9.13): keksdose through its restricted login with a
    grant and a `notified_at` queue the jobs runner sends; kastlan by raw SQL that
    copies `company_id`, no notice yet; Kurvenschmiede through the kit's service.
16. **keksdose's 14 comments migrate per row by data** (admin writer → staff comment;
    the author → a comment; no writer → <deleted user>) and stay comments (K2). 9.8.
17. **Moderation:** the admin hides and unhides; the writer deletes their own comment;
    nobody edits a comment; no flags, bans or locks.
18. **Erasure:** reports and comments anonymised; votes deleted; an erased admin's
    replies kept without an author. **Export:** the person's own comments and votes;
    another person's report by its id only. 9.12.
19. **Rate limits:** comments 20 an hour, votes 60 an hour, per user; 429 with
    `Retry-After`, charged before the work (§3.5).
20. **The author's report is their vote**, cast on filing: the count starts at 1;
    existing reports are backfilled. 9.6.
21. **keksdose's menu:** a separate **"All feedback"** entry (`publicHref`); "My
    feedback" unchanged (K4). The page is `/all-feedback`, "All feedback" / "Alle
    Rückmeldungen".
22. **`outcome` read-only for one release, then dropped.**
23. **Cost (B4):** the public list carries titles only, no body; it sorts and searches
    on plaintext columns only; the vote and comment counts are SQL counts. The answer
    is read in the detail only (9.9).

### 9.3 The report: three views and the `public` flag

| Field | Admin (inbox) | Author (`/my`) | Public list | Public detail |
|---|---|---|---|---|
| `id`, `title`, `category`, `status`, `created_at`, `updated_at`, `resolved_at` | ✓ | ✓ | ✓ | ✓ |
| `body` | as stored | as stored | — | **public body** (9.4) |
| `user_id` | ✓ | ✓ | — | — |
| `user_email` | ✓ | — | — | — |
| `author_name` (new) | full name (`full_name`, reader's order) | their own full name | first name (9.5) | first name |
| `mine` (new) | ✓ | `true` | ✓ | ✓ |
| `public`, `filed_private` (new) | ✓ | ✓ | — | — |
| `context`, `screenshot_url`, `attachment_urls` | ✓ | ✓ | — | — |
| `votes`, `voted` (new) | ✓ | ✓ | ✓ | ✓ |
| `comment_count` (new) | ✓, hidden ones included | visible ones | visible ones | visible ones |
| `replies` (new) | ✓, with `status_from` | ✓ | — | ✓ |
| `outcome` | ✓, frozen (9.7) | ✓, frozen | — | — |

- The admin and author views are `FeedbackResponse` with the new fields, all optional, so
  an app without public parts sends none of them. **`FeedbackPublicListItem` and
  `FeedbackPublicResponse` are separate models**, so a field added to `FeedbackResponse`
  later never reaches the public by default. `crash_fingerprint` is in no view.
- **A report is public** when `public` is true and it is no CRASH:
  `is_public(category, public)`. Only a public report is in the public list, and only a
  public report's detail, comments and vote answer someone who is neither its author nor
  an admin; otherwise 404 "Feedback not found", whatever the app's `foreign_row`.
- **Switching `public`** is `PATCH /feedback/{id} {"public": false}` (§3.4's route).
  The admin sets it any time. The author sets it (both ways) while the status is in
  `AUTHOR_EDITABLE_STATUSES`, or at any status when `filed_private` is true; otherwise
  403, keksdose's wording ("Entry is in DONE; only OPEN / READY / IN_PROGRESS entries
  can be edited by the author"). `filed_private` is set by the migration only, never by
  the API.
- **Switched off**, the report leaves the public list; its comments and votes stay
  (the author and the admin still see them); its commenters lose the thread (404).
- An admin reading the public list gets the public view too; the files are in the inbox.

### 9.4 The public body

`public_body(body, *, policy) -> str` (server-kit, layer 1), applied by the server, never
the client:
- drops every `[screenshot] <url>` line (§3.4's pattern);
- **removes every other attachment URL anywhere** in the text (`policy.prefix` + a key the
  policy accepts, wherever it stands): a user may paste one into their own text or a
  rework note, and kk and ka serve a key to any signed-in user (P-b);
- rewrites kastlan's folded headers `--- COMMENT <stamp> · <name> ---` to
  `--- COMMENT <stamp> ---`: the name may be an address;
- keeps the `--- REWORK <stamp> ---` lines and the notes: the author's own words.

`public_text(text, *, policy) -> str` is the URL removal alone; it is applied to every
comment body and every reply body that leaves for someone other than its writer and an
admin (P-e). A removed URL leaves `[…]`.

### 9.5 Names

`first_name_of(first, last) -> str | None` (server-kit, `auth.accounts`, beside
`full_name` and `name_incomplete`): `first.strip()` when `last.strip()` is not empty,
otherwise `None`. **No first-word guessing** ("王小明", "Dr. Anna Muster", "Muster, Anna"
all break it). An account whose old display name moved whole into `first_name` (kk 0114,
KS) is `name_incomplete` and shows no name until it completes it; kk already asks it to
(`CompleteNameDialog`). `None` is drawn as **"A user"** / **"Eine Person"** (the kit's
label, `feedbackPublic.anonymous`), the same as an erased author. kastlan: every non-demo
account is complete; its demo throwaways keep `last_name ""` and so are never named (and
cannot write). The admin sees `full_name` and the address, as today. A name is the
server's: the client never builds one from an id.

### 9.6 Votes

Table `feedback_votes (feedback_id FK ON DELETE CASCADE, user_id FK users ON DELETE
CASCADE, created_at server_default now(), PRIMARY KEY (feedback_id, user_id))`; in kastlan
a `CompanyMixin` table.

- **`votes`**: the row count, an SQL count per page (`GROUP BY`), never per row;
  **`voted`**: whether the viewer has a row.
- **The author's vote is cast on filing** (the create adds the row; not on a CRASH), so
  the count reads "people who want this" and starts at 1. The author's button shows
  "voted", disabled, "Your report". `DELETE` by the author is 409 "Your report counts as
  your vote". The migration backfills one vote per existing non-CRASH report whose
  `user_id` is set (an erased author's report starts at 0).
- **Idempotent:** `PUT` twice is one row; `DELETE` with none is the same answer.
- **Any status:** a DONE or WONT_DO report may still be wanted.
- **The sort:** the inbox gains a sortable **Votes** column (client-side, as every
  column); the public list sorts on the server by `newest` (default), `votes` (most, then
  newest) or `updated`. Who voted never leaves the server.

### 9.7 Replies

Table `feedback_replies (id serial, feedback_id FK ON DELETE CASCADE, author_id FK users
nullable, body Text NOT NULL, status_from nullable, status_to nullable, created_at
server_default now())`; keksdose adds `notified_at timestamptz NULL` (9.13); KS seals
`body`; kastlan's is a `CompanyMixin` table. Both status columns use the app's status
type.

```jsonc
// FeedbackReplyResponse
{ "id": 31, "author_name": "Marcel",     // others: first name; admin: full name; null: "Admin"
  "body": "Fixed in 0.4.27.", "status_to": "IN_EVALUATION",  // null: no status change
  "status_from": "OPEN",                 // the admin view only
  "created_at": "2026-10-14T09:12:00Z" }
// FeedbackReplyCreate (admin only)
{ "body": "…", "status": "IN_EVALUATION" }  // body 1–8000 after trimming; status optional
```

- **Who writes:** an admin (`POST /feedback/{id}/replies`) and the loops (9.13). A reply
  with `status` moves the report through `plan_reply` (the same `resolved_at` rule as
  `plan_update`) and records `status_from`/`status_to`. A status `PATCH` alone writes no
  reply and sends nothing.
- **The nudge (B2):** the status picker is in the reply composer. A status-only change
  into a decided status (`DECIDED_STATUSES`: DONE, WONT_DO, POSTPONED) from the table,
  a swipe or the pills still works, and the detail then says "The author has not been
  told. Add a reply." above the composer, with that status chosen, until a reply with
  that `status_to` exists.
- **Null author:** a loop reply, a migrated outcome, or an erased admin. Shown as the
  app's word for its admin ("Admin"), never "the team" (§3.3).
- **No edit, no delete** in the API: a correction is a new reply.
- **The outcome migration** (each app, one Alembic step): one reply per row whose
  `outcome` is not blank: `body = outcome`, `author_id = NULL`, `status_from` and
  `status_to` NULL, `created_at = coalesce(resolved_at, updated_at)` (kk's raw `UPDATE`
  never bumped `updated_at`, so it is the last app write; fine), and in kk
  `notified_at = created_at` (never sent). KS seals the copy under the same key; kastlan
  runs it under `SET LOCAL app.bypass_rls` and copies `company_id`.
- **`outcome` is frozen for one release:** the column stays and is answered as stored
  (an old client still shows the last answer); nothing writes it any more, and nothing
  computes it from replies; `PATCH {outcome}` is 422 "outcome is read-only; post a
  reply". The release after drops the column, kk's `UPDATE (outcome)` grant with it.
- **Rework** is unchanged: the author's note is appended to the body (§3.4), not a reply
  or a comment, and it still reopens the row.

### 9.8 Comments

Table `feedback_comments (id serial, feedback_id FK ON DELETE CASCADE, user_id FK users
nullable, body Text NOT NULL, staff boolean NOT NULL default false, created_at
server_default now(), updated_at, hidden_at nullable, hidden_by FK users nullable)`:
keksdose's table plus `staff` and the two hide columns; KS seals `body`; kastlan's would
be a `CompanyMixin` table (not built while public is off).

```jsonc
// FeedbackCommentResponse
{ "id": 9, "author_name": "Anna", "mine": false, "staff": false,
  "body": "Same here on the iPad.",       // null when hidden, but for its writer and an admin
  "hidden": false, "created_at": "…" }
// FeedbackCommentCreate
{ "body": "…" }                           // 1–4000 after trimming; plain text, no files
// FeedbackCommentHide (admin only)
{ "hidden": true }
```

- **Who comments:** anyone who sees the report under 9.3 (its author included), on any
  status; not a demo; not on a CRASH. A comment never changes the status.
- **An admin's post is a reply** (9.7), so the answer is in one place. `staff` is true
  only on keksdose's migrated rows whose writer is an admin.
- **keksdose's 14 rows (K2)** stay comments, decided per row by data in the migration:
  writer an admin → `staff = true`; writer the report's author → an ordinary comment;
  `user_id` NULL → <deleted user> ("A user"). Marcel's check:
  `SELECT c.id, c.user_id = f.user_id AS by_author, u.role FROM feedback_comments c JOIN
  feedback f ON f.id = c.feedback_id LEFT JOIN users u ON u.id = c.user_id`.
- **Hide:** `PATCH /feedback/{id}/comments/{comment_id} {"hidden": true|false}`, admin
  only, sets or clears `hidden_at`/`hidden_by`. Hidden: others see "Hidden by an admin"
  with no body and no name; the writer sees their text with that line; the admin sees it
  struck through with **Unhide**. A hidden comment still counts for its writer's export
  and erasure, and not in `comment_count` for anyone but an admin.
- **Delete:** the writer's own, `DELETE /feedback/{id}/comments/{comment_id}`, a hard
  delete; an admin hides instead. **No edit.**
- **Order:** oldest first; the detail merges replies and comments by `created_at`.

### 9.9 Endpoints

Under `/api/v1/feedback`, bearer auth, the app's guards first in each route's
dependencies (server-services §2.8). keksdose's names (`list_*`, `create_*`):

| Method + path | Endpoint | Who (else) | Answer |
|---|---|---|---|
| `GET /public?sort=&status_filter=&category=&q=&limit=&offset=` | `list_public` | `public_viewer` (404) | `FeedbackPublicListItem[]`, public reports only |
| `GET /public/{feedback_id}` | `get_public` | the same; the report public (404) | `FeedbackPublicResponse` |
| `GET /{feedback_id}/comments` | `list_comments` | who sees the report (404) | `FeedbackCommentResponse[]` |
| `POST /{feedback_id}/comments` | `create_comment` | the same; demo guard | 201 `FeedbackCommentResponse` |
| `PATCH /{feedback_id}/comments/{comment_id}` | `hide_comment` | admin guard, demo guard | `FeedbackCommentResponse` |
| `DELETE /{feedback_id}/comments/{comment_id}` | `delete_comment` | the writer (404); demo guard | 204 |
| `PUT /{feedback_id}/vote` | `vote` | who sees the report (404); demo guard | `FeedbackVoteResponse` `{votes, voted}` |
| `DELETE /{feedback_id}/vote` | `unvote` | the same; not the author (409) | `FeedbackVoteResponse` |
| `POST /{feedback_id}/replies` | `create_reply` | admin guard, demo guard | 201 `FeedbackResponse`, `replies` included |

- **Mounted:** `create_reply` when the app passes the reply store (all three); the other
  eight only when `public_viewer` is set (kk, KS). They go before `PATCH /{feedback_id}`
  in the router, and `/public` before any `/{feedback_id}` GET of the app's own.
- **"Who sees the report":** an admin; its author (comments only when the author passes
  `public_viewer` too: a KS customer gets 404); anyone passing `public_viewer` when the
  report is public. A demo never passes (decision 8).
- **The list (B4):** titles only, no body; `q` searches `title` and only where it is a
  plaintext column (kk, ka; `FeedbackDeps.public_search=False` in KS, where `q` is a
  422); sort as 9.6; `limit` 1–100 (default 50); counts in SQL.
- **The detail** carries the public body and the replies; the comments are fetched
  with it (`list_comments`), since they may be many.
- **Replies ride on the report** on `GET /feedback`, `GET /feedback/my` and the create
  and PATCH answers (a report has few); `GET /feedback` and `/my` keep their shapes plus
  the new fields (9.3). The table shows no answer column: the answer is read in the
  detail.
- `PATCH /feedback/{id}` gains `public` (9.3). Routes added, none renamed; kk's
  `openapi-schema.d.ts` gains them.

### 9.10 Privacy rules

What leaves for anyone but the author and an admin, exactly. **A report:** `id`,
`title`, `category`, `status`, `created_at`, `updated_at`, `resolved_at`,
`author_name` (first name or null), `mine`, `votes`, `voted`, `comment_count`; in the
detail also the public body (9.4) and the replies (`id`, `author_name`, `body` through
`public_text`, `status_to`, `created_at`). **A comment:** `id`, `author_name`, `mine`,
`staff`, `body` (through `public_text`; null when hidden), `hidden`, `created_at`.
**Never:** user ids, addresses, last names, `context`, any attachment URL or key (the
columns, the body's file lines, a pasted URL), `crash_fingerprint`, `public`,
`filed_private`, `hidden_by`, `status_from`, who voted. A CRASH row, never.

- **The files predicate (decision 12)** is not the report's: a file is read by its
  uploader, the author of a report naming it, or an admin. kk and ka serve a key to any
  signed-in user; that stays safe only because no key reaches anyone else (above). KS's
  "anyone who can see the report that links it" narrows to the three. The rule is
  written into `AttachmentStorage.read`'s docstring (9.14).
- **Mail and push carry no content** (notifications §2.8): no title, no body, no comment.
- **The redaction** of ui-kit's thread (`data-private`, `feedback-thread.tsx`,
  "Redaction") covers comment and reply bodies and names, as it does now.
- `testing.assert_public_view` walks every public answer for a key outside these lists.

### 9.11 Notifications

Two types, declared by each app in its registry (notifications §2.1), with the ids in
the kit (`FEEDBACK_ANSWERED`, `FEEDBACK_COMMENT`) and their setting words in the kit,
since two apps declare them:

| Type | Fires on | To | Default | Quiet |
|---|---|---|---|---|
| `feedback_answered` | a reply (9.7), from the admin or a loop | the author and every earlier commenter, never the reply's writer | on | true |
| `feedback_comment` | a comment (9.8) | the author and the earlier commenters, never the comment's writer | on | true |

- Both on by §2.1's rule: they fire only on a report the person wrote or commented on.
  Voters are not told. A recipient must still see the report (9.9: an author always;
  a commenter while it is public and they pass `public_viewer`); never a deactivated,
  erased or demo account. `feedback_recipients(...)` (layer 1) computes the list.
- **Channels:** kk `app` (inbox + push); ka **e-mail only** (`app=None`: its poller
  carries company-wide counts, not a person's event) until push, and `feedback_comment`
  not declared while public is off; KS e-mail. The mail says "Your report has an answer"
  / "New comment on a report you follow", names the report by number and links
  `?row=<id>`; the words are the app's.
- **KS's `feedback_answered` changes its trigger** from "the status crosses into an
  answered one" (`notification_service.py:224`) to "a reply" (decision 13).
- **Hidden later** does not unsend.
- **Where it fires:** the reply and comment stores' `add`, which see the actor
  (server-services §2.16), sent after the commit (notifications §9.2.4). A request's
  reply is tried once (notifications decision 5).
- **keksdose's loop replies** run no app code: the jobs runner sends `feedback_answered`
  for `feedback_replies` rows with `notified_at IS NULL` and sets `notified_at` in the
  same transaction as the inbox write (the `digest_sent` pattern). The app's own writes
  set `notified_at` at once (K3). kastlan's loop replies send nothing yet (the author
  sees the answer on the next visit).

### 9.12 The notice to existing authors, erasure, export

**The notice (decision 6).** One mail per person, once, after the migration's deploy:
to each active, non-demo, non-admin author of at least one `filed_private` report that is
public. A new `AccountNoticeKind.FEEDBACK_PUBLISHED` (`"feedback_published"`): it is
about the person's own data, so it has no switch and no unsubscribe link. Sent by an app
job through the app's once-marker (notifications §3.4; event key
`feedback_published:<user_id>`), so a re-run sends nothing twice. It says, in the
recipient's language: from <date> other users of <app> see the title and text of your
reports #12, #31, … (numbers only, no titles); never your screenshots, files or address,
and only your first name; to keep one private, open it in "My feedback" and turn off
"Visible to others", at any status; link `/my-feedback`. keksdose and Kurvenschmiede
send it; kastlan has no public parts.

**Erasure** (`FeedbackService.erase_author` grows; the app calls it as today):
1. the reports, as now (§3.2, server-services §2.15);
2. **comments** by the person: body `scrub_text`'d with the identifiers, `user_id` NULL;
   kept, shown as "A user";
3. **votes** by the person: deleted;
4. **replies** by the person (an admin): `author_id` NULL, body scrubbed; kept;
5. `hidden_by` NULL where it was them.
`ErasedFeedback` gains `comments`, `votes`, `replies` counts (defaults 0). kk's own scrub
(`budgets_service.py:1255-1260`) goes into the kit's.

**Export:** `data.feedback[]` (own reports) gains `public`, `votes` (the count) and
`replies: [{ body, status, created_at }]` (no author name); `data.feedback_comments:
[{ report, body, hidden, created_at }]`, the comments the person wrote on any report,
and `data.feedback_votes: [{ report, created_at }]`, oldest first. **`report` is the id
only** (decision 18): another person's title is theirs. keksdose's `comments` key with
`"from": "you" | "keksdose"` (`account_export_service.py:324-325`) goes; others'
comments on the person's reports are not exported (user-admin §6.5).

### 9.13 The loops' write paths

**keksdose** answers with a reply, through `feedback-live-write.sh`, which runs the file
with `psql -1` (`:18`): one transaction already, so **the file has no `BEGIN`/`COMMIT`**
(a `COMMIT` inside would end it early, and a later failure would no longer roll back
what came before). Per row:

```sql
INSERT INTO feedback_replies (feedback_id, body, status_from, status_to)
  SELECT id, $$…$$, status, 'IN_EVALUATION' FROM feedback WHERE id = 412;
UPDATE feedback SET status = 'IN_EVALUATION' WHERE id = 412;
```

Grants for `keksdose_feedback` (`feedback-live-setup.sh:39-41`, re-run as
`keksdose_owner`), K1:
- **may:** `SELECT` on `feedback`, `feedback_replies`, `feedback_comments`; `INSERT
  (feedback_id, body, status_from, status_to)` on `feedback_replies`; `USAGE` on
  `feedback_replies_id_seq`; `UPDATE (status)` on `feedback`;
- **may not:** read `users` or `feedback_votes` (step 4 checks both and fails on
  either); set `author_id`, `created_at` or `notified_at` (the defaults fill them:
  `created_at` `server_default now()`, since kk's timestamps are Python-side,
  `models/base.py:35-39`; `notified_at` NULL, so a loop reply is always "Admin" and
  always queued); update or delete a reply; write or hide a comment; set `resolved_at`;
- `UPDATE (outcome)` stays for the one release and goes with the column; the loop no
  longer writes it.
- `feedback-live-read.sh` shows each report's replies (oldest first, with `status_to`)
  and its comments (body, `created_at`, hidden), without names.
The foreign key to `users` needs no grant: Postgres checks it as the table's owner.

**kastlan** answers with a reply by raw SQL through `scripts/feedback-db.sh` (as
`kastlan_app`, RLS bypassed): `INSERT INTO feedback_replies (company_id, feedback_id,
body, status_from, status_to) SELECT company_id, id, $$…$$, status, 'IN_EVALUATION' FROM
feedback WHERE id = N;` then the status `UPDATE`. `company_id` is copied from the report;
`created_at` has `server_default now()`. No notice yet (9.11). kastlan updates its
`CLAUDE.md` loop text and `scripts/feedback-prod-migrate.sql` at adoption.

**Kurvenschmiede**'s `feedback_loop.py --resolve` writes a reply through the kit's
`FeedbackService.reply` as the first admin, so `feedback_answered` fires in the store's
`add`.

### 9.14 What server-kit 0.11 ships

Additive: no name is removed or renamed; every new parameter has a default that keeps
0.10's behaviour. Paths from the server-kit repo's root.

**Layer 1**
- `src/eifi1_server_kit/feedback/enums.py`: `DECIDED_STATUSES = frozenset({DONE, WONT_DO,
  POSTPONED})`.
- `src/eifi1_server_kit/feedback/public.py` (new): `public_body(body, *, policy=
  DEFAULT_ATTACHMENT_URL_POLICY) -> str`, `public_text(text, *, policy=…) -> str`,
  `is_public(category, public) -> bool`, `feedback_recipients(*, author_id,
  commenter_ids, writer_id) -> list[int]` (author first, then commenters by first
  comment, no writer, no duplicates, no None), `FEEDBACK_ANSWERED = "feedback_answered"`,
  `FEEDBACK_COMMENT = "feedback_comment"`, `COMMENT_MAX = 4000`, `REPLY_MAX = 8000`,
  `PUBLIC_REPORT_FIELDS`, `PUBLIC_COMMENT_FIELDS`, `PUBLIC_REPLY_FIELDS` (frozensets,
  9.10's lists).
- `src/eifi1_server_kit/auth/accounts.py`: `first_name_of(first, last) -> str | None`.
- `src/eifi1_server_kit/feedback/rules.py`: `plan_update(…, filed_private: bool =
  False)`: `public` joins the author's fields, allowed at any status when
  `filed_private`; `ReplyPlan(changes, status_from, status_to)` and `plan_reply(*,
  status, new_status, now=None) -> ReplyPlan` (the `resolved_at` rule;
  `new_status=None` changes nothing; CRASH is no status, so no refusal is needed).
- `src/eifi1_server_kit/feedback/schemas.py`: `FeedbackUpdate.public: bool | None`;
  `FeedbackUpdate.outcome` refused with 422 "outcome is read-only; post a reply";
  `FeedbackResponse` gains, all optional with defaults: `author_name: str | None`,
  `mine: bool | None`, `public: bool | None`, `filed_private: bool | None`, `votes: int
  | None`, `voted: bool | None`, `comment_count: int | None`, `replies:
  list[FeedbackReplyResponse] | None`. New: `FeedbackReplyCreate {body, status}`,
  `FeedbackReplyResponse {id, author_name, body, status_from, status_to, created_at}`
  (`status_from` excluded in the public detail), `FeedbackPublicListItem {id, title,
  category, status, created_at, updated_at, resolved_at, author_name, mine, votes,
  voted, comment_count}`, `FeedbackPublicResponse(FeedbackPublicListItem) {body,
  replies}`, `FeedbackCommentCreate {body}`, `FeedbackCommentResponse {id, author_name,
  mine, staff, body, hidden, created_at}`, `FeedbackCommentHide {hidden}`,
  `FeedbackVoteResponse {votes, voted}`, `PublicSort = Literal["newest", "votes",
  "updated"]`. Bodies trimmed and bounded by `COMMENT_MAX` / `REPLY_MAX`.
- `src/eifi1_server_kit/limiter.py`: `FEEDBACK_COMMENTS_PER_HOUR = 20`,
  `FEEDBACK_VOTES_PER_HOUR = 60`; `FeedbackLimiters(…, comments_per_hour=20,
  votes_per_hour=60)` gains `.comment` and `.vote` (429 + `Retry-After`), reset too.
- `src/eifi1_server_kit/mail.py`: `AccountNoticeKind.FEEDBACK_PUBLISHED =
  "feedback_published"`.

**Layer 2**
- `src/eifi1_server_kit/feedback/ports.py`:
  - `FeedbackActor` gains `role: str | None = None` (the app's role name, for its
    predicate);
  - `NewFeedback` gains `public: bool = True` (the service passes False for a CRASH);
  - `PublicFeedbackRow(FeedbackRow, Protocol)`: adds `category`, `public`,
    `filed_private`, `updated_at`, `resolved_at`;
  - `FeedbackReplyRow`, `FeedbackCommentRow` (read-only protocols with 9.7's and 9.8's
    columns); `NewFeedbackReply(feedback_id, author_id, body, status_from, status_to)`,
    `NewFeedbackComment(feedback_id, user_id, body)`; `PublicListEntry(row, votes,
    voted, comment_count)`;
  - `PublicFeedbackRepository[RowT]` (Protocol; the app's repository may implement it
    too): `public_page(*, viewer_id, sort, status, category, q, limit, offset) ->
    Sequence[PublicListEntry]` (public rows only, counts in SQL), `get_public(
    feedback_id) -> RowT | None`;
  - `FeedbackReplyStore`: `for_reports(ids) -> Mapping[int, Sequence[ReplyRowT]]`,
    `add(new, *, actor: FeedbackActor | None) -> ReplyRowT` (fires
    `feedback_answered`), `by_author(user_id)`, `apply(reply, changes)`;
  - `FeedbackCommentStore`: `for_report(feedback_id) -> Sequence[CommentRowT]`,
    `counts(ids, *, include_hidden) -> Mapping[int, int]`, `commenters(feedback_id) ->
    Sequence[int]`, `add(new, *, actor) -> CommentRowT` (fires `feedback_comment`),
    `get(feedback_id, comment_id)`, `apply(comment, changes, *, actor)`,
    `delete(comment)`, `by_author(user_id)`, `clear_hidden_by(user_id) -> int`;
  - `FeedbackVoteStore`: `counts(ids, *, viewer_id) -> Mapping[int, tuple[int, bool]]`,
    `put(feedback_id, user_id) -> None`, `delete(feedback_id, user_id) -> None`,
    `delete_by_author(user_id) -> int`;
  - `PeopleLookup`: `names(user_ids) -> Mapping[int, tuple[str, str]]`, the one read of
    `users` (first, last; never a demo or system account);
  - every write flushes and none commits (server-services §2.7);
  - `AttachmentStorage.read`'s docstring states the files predicate (9.10).
- `src/eifi1_server_kit/feedback/service.py`: `FeedbackService.__init__` gains `replies
  = None`, `comments = None`, `votes = None`, `people = None`, `public_viewer:
  Callable[[FeedbackActor], bool] | None = None`, `public_search: bool = True`. New
  methods: `reply(actor, feedback_id, payload)`, `list_public(actor, *, sort, status,
  category, q, limit, offset)`, `get_public(actor, feedback_id)`, `comments(actor,
  feedback_id)`, `comment(actor, feedback_id, payload, *, limiter)`, `hide_comment(
  actor, feedback_id, comment_id, payload)`, `delete_comment(actor, feedback_id,
  comment_id)`, `vote(actor, feedback_id, *, limiter)`, `unvote(actor, feedback_id, *,
  limiter)`, `sees_public(actor) -> bool` (False for a demo, True for an admin, else
  the predicate); and the views `admin_view(row, address)`, `author_view(row)`,
  `public_item(entry)`, `public_view(row)`, each filling names, counts and replies in
  one call per store for a page. `create` adds the author's vote after the report;
  `update` passes `filed_private`; **one write per store, the report last** (a reply
  with a status adds the reply, then applies the row). `erase_author` gains steps 2–5 of
  9.12; `ErasedFeedback` gains `comments`, `votes`, `replies` (default 0).
- `src/eifi1_server_kit/feedback/router.py`: `FeedbackDeps` gains `replies`,
  `comments`, `votes`, `people` (the app's dependencies, default None), `public_viewer`
  (default None), `public_search: bool = True`, and the response models
  `reply_response_model`, `comment_response_model`, `public_item_model`,
  `public_response_model`. The nine routes of 9.9 with those endpoint names; when
  `public_viewer` is set and `comments` or `votes` or `people` is missing, a
  `ValueError` at build time.
- `src/eifi1_server_kit/feedback/testing.py`: `InMemoryReplyStore`,
  `InMemoryCommentStore`, `InMemoryVoteStore`, `InMemoryPeopleLookup`;
  `InMemoryFeedbackRepository` implements `PublicFeedbackRepository`;
  `check_reply_store`, `check_comment_store`, `check_vote_store`,
  `check_public_repository` (conformance, as `check_repository`); and
  `assert_public_view(payload)` (9.10).
- `src/eifi1_server_kit/feedback/__init__.py`: the new names exported.

**Tests** (100 % line and branch coverage kept): `tests/feedback/test_public.py`
(`public_body`: screenshot lines, a pasted URL mid-line, a URL in a rework note, two
URLs, a foreign prefix kept, kastlan's header rewritten, rework lines kept;
`public_text`; `is_public` for each category; `feedback_recipients`);
`tests/auth/test_accounts.py` (`first_name_of`: "Anna"/"Muster", "Anna Muster"/"",
"王小明"/"", whitespace, None); `tests/feedback/test_rules.py` (`plan_reply`, the
`public` lane, `filed_private` at DONE); `tests/feedback/test_schemas.py` (the new
models, the outcome 422, bounds); `tests/feedback/test_service_public.py` (each new
method; the author's vote; the 409; the demo and the predicate; a CRASH never public;
a switched-off report; hidden comments per viewer; one call per store per page);
`tests/feedback/test_router_public.py` (the routes mounted or not, the guards' order,
404 vs 403, the 429s, `assert_public_view` over every answer, the operation ids);
`tests/feedback/test_service.py` (the erasure's new steps and counts);
`tests/test_limiter.py`, `tests/test_mail.py` (the new kind);
`tests/feedback/test_testing.py` (the fakes pass the checks; a broken fake fails).

Size: **L** (~800 code, ~1 300 test lines).

### 9.15 What ui-kit 0.38 ships

Additive: every new prop is optional; an app without public parts changes nothing but
the Outcome section (9.7).

- `src/feedback/feedback-record.ts`: `FeedbackRecord` gains optional `author_name`,
  `mine`, `public`, `filed_private`, `votes`, `voted`, `comment_count`, `replies:
  FeedbackReply[]`; `outcome` documented as frozen; `FEEDBACK_DECIDED_STATUSES`,
  `FEEDBACK_COMMENT_MAX = 4000`, `FEEDBACK_REPLY_MAX = 8000`.
- `src/feedback/feedback-public-types.ts` (new): `FeedbackReply`, `FeedbackComment`,
  `FeedbackPublicListItem`, `FeedbackPublicRecord`, `FeedbackVoteState`,
  `FeedbackPublicSort` (`"newest" | "votes" | "updated"`).
- `src/feedback/feedback-vote-button.tsx` (new) **`FeedbackVoteButton`** `{votes, voted,
  own?, onVote(next: boolean): Promise<FeedbackVoteState>, disabled?, size?, labels?}`:
  `ThumbsUp`, the count, `aria-pressed`; "I want this too" / "Will ich auch"; on one's
  own report disabled with "Your report" / "Ihr Bericht"; optimistic with rollback.
- `src/feedback/feedback-comment-thread.tsx` (new) **`FeedbackCommentThread`** `{replies,
  comments, isAdmin, onComment?, onHide?, onDelete?, pending?, commit?, labels?}` on
  `FeedbackThread`: replies with the `staff` look and a "→ {status}" chip, comments
  with `own`, `null` names as "A user", the hidden line, **Hide / Unhide** for an
  admin, **Delete** for the writer (confirm), the composer (1–4 000, no files; left out
  when `onComment` is).
- `src/feedback/feedback-replies.tsx` (new) **`FeedbackReplyTimeline`** `{replies,
  renderDate?, labels?}` and **`FeedbackReplyComposer`** `{status, onReply(body,
  status?), pending?, suggestedStatus?, commit?, labels?}`: the status pick
  (`selectableFeedbackStatuses`, "No change" first), **Reply** / **Antworten**, and the
  nudge line when `suggestedStatus` is set (9.7).
- `src/feedback/feedback-row-detail.tsx`: **`FeedbackRowDetail`** replaces the Outcome
  section with the timeline and, when `canEdit`, the composer (new props `onReply?`,
  `replying?`); the nudge when the row's status is decided and no reply has that
  `status_to`; without `row.replies` it shows `outcome` read-only as before. New props
  `comments?: ReactNode` (the app's `FeedbackCommentThread`, under the timeline) and
  `onPublicChange?` (the **Visible to others** switch, `FeedbackPublicSwitch`, for the
  admin and, within 9.3's window, the author). `Resolved: {date}`, Rework and the
  page buttons stay.
- `src/feedback/feedback-public-switch.tsx` (new) **`FeedbackPublicSwitch`** `{row,
  isAdmin, viewerId, onChange, pending?, labels?}`; hidden on a CRASH; its own
  `feedbackPublicSwitchAllowed(row, {isAdmin, viewerId})`.
- `src/feedback/feedback-public-list.tsx` (new) **`FeedbackPublicList`** `{rows, total?,
  sort, onSortChange, search?, onSearchChange?, renderDetail(row), onVote, loading?,
  labels?}`: `DataTable` with #, Date, Category, Subject, Votes, Status, the sort
  toggle **Newest / Most wanted / Recently updated**, the search box only when
  `onSearchChange` is passed, the phone cards; and **`FeedbackPublicDetail`** `{row,
  comments, onVote, …}`: the public body, the timeline, the thread, the vote.
- `src/feedback/feedback-table.tsx`: `feedbackColumns` / `useFeedbackColumns` gain
  `votes?: boolean` (a sortable **Votes** column, hidden on the phone, a count chip on
  the card).
- `src/feedback/feedback-menu.tsx`: `FeedbackMenu` gains `publicHref?: string`: **All
  feedback** / **Alle Rückmeldungen** (`Users` icon, key `all-feedback`) above the list
  link, for everyone, when passed.
- `src/feedback/feedback-dialog.tsx` and `feedback-submit.tsx`: `FeedbackDialog` gains
  `publicNotice?: ReactNode` (a muted line under the body); `UseFeedbackSubmitOptions`
  gains `publicNotice?: boolean` (the label `feedbackDialog.publicNotice`, decision 6).
- `src/notifications/feedback-notification-types.ts` (new):
  `useFeedbackNotificationTypes(): NotificationTypeEntry<"feedback_answered" |
  "feedback_comment">[]` with the setting words ("Answers to your reports" / "Comments
  on reports you follow", with a line each).
- Labels in seven languages: new groups `feedbackPublic`, `feedbackComments`,
  `feedbackReplies`, `feedbackVote`, `feedbackNotificationTypes`; new keys
  `feedbackDialog.publicNotice`, `feedbackMenu.allFeedback`, `feedbackDetail.replies`,
  `.visibleToOthers`, `.nudge`; `src/i18n/kit-labels.tsx`, `src/i18n/en.ts`, the
  locales.
- Showcase: the Feedback pages gain the public list, the thread and the reply
  composer; the search index and the public-surface test list the new exports.

**Tests:** `src/feedback/__tests__/feedback-vote-button.test.tsx` (pressed, own,
rollback), `feedback-comment-thread.test.tsx` (hidden per viewer, Hide/Unhide, Delete
with confirm, null name, bounds), `feedback-replies.test.tsx` (status pick, nudge,
order), `feedback-row-detail.test.tsx` (the Outcome section replaced; the old row
without `replies`; the switch's window), `feedback-public-switch.test.tsx`,
`feedback-public-list.test.tsx` (sort, no search without the handler, phone cards,
axe), `feedback-menu.test.tsx` (`publicHref`), `feedback-dialog-body.test.tsx` (the
notice), `feedback-table.test.tsx` (Votes), `src/notifications/__tests__/
feedback-notification-types.test.ts`, the labels test for seven locales, and
`public-surface.test.ts`.

Size: **M–L** (~900 code, ~900 test lines, seven locales).

### 9.16 Per app

- **keksdose (canon), M:** migrations: `feedback.public` (true but CRASH) and
  `filed_private` (true on every existing row), `feedback_replies` (+ `notified_at`),
  the outcome copy, `feedback_votes` + the author backfill, `feedback_comments` +
  `staff`, `hidden_at`, `hidden_by` (the 14 rows per K2); the stores, `PeopleLookup`,
  `public_viewer = lambda a: True`; the two types in `NOTIFICATION_TYPES` and the job
  for `notified_at`; the notice job (9.12); the export and the erasure (its scrub moves
  into the kit); the grants, `feedback-live-read.sh`, the SQL template and the agent
  prompt (9.13); `/all-feedback` and `publicHref`; `publicNotice`.
- **kastlan, S:** `feedback_replies` as a `CompanyMixin` table under forced RLS with
  `server_default now()`; the outcome copy under bypass; the reply store; no
  `public_viewer`; `feedback_answered` by e-mail; the export (`account_service.py:300`
  → replies) and the erasure; the loop's SQL (9.13), `CLAUDE.md` and
  `scripts/feedback-prod-migrate.sql`. The kit's `FeedbackRowDetail` takes the
  timeline.
- **Kurvenschmiede, M:** `public` and `filed_private` on `feedback`, the three tables, comment
  and reply bodies sealed; the outcome copy sealed; the stores and `PeopleLookup` (no
  demo or system account named); `public_viewer` = not demo and role in ADMIN, MEMBER,
  REVIEWER (`FeedbackActor.role`); `public_search=False`; the files predicate narrowed
  (9.10); `feedback_answered` moves to "a reply", `feedback_comment` added, both in
  seven languages; the notice; `--resolve` writes a reply through the kit's service;
  export and erasure; `publicNotice`.
  Recorded at its adoption (2026-10-14): **no `server_default`** on `created_at` — KS's
  schema rule forbids database defaults (a test enforces it), and its loop writes through
  the ORM, so the model sets it; **a CUSTOMER's report is filed private**, and migration 0052
  left customers' existing reports private (a customer is never shown `publicNotice`, so
  is never told others read it); `filed_private` is set on exactly the rows 0052 made
  public; the feedback mails link the author to `/my-feedback?row=<id>`, everyone else to
  `/all-feedback?row=<id>`.

### 9.17 Shipped, amended elsewhere

- server-services §4 (layer 2: the ports, the service, the router) points here
  ([server-services-harmonization.md](server-services-harmonization.md) §4.5).
- notifications: the two types and the notice kind
  ([notifications-harmonization.md](notifications-harmonization.md) §2, §5).

### 9.18 Reviews and decisions

The draft (ui-kit `e09adf2`) was reviewed on 2026-10-14 by keksdose (keksdose-cb, at
`52fa9f6a`; full review in kk `.feedback-live/kit038-review.md`), kastlan (kastlan-d1,
at `fe8bf78`) and Kurvenschmiede (kurvenschmiede-1b, at `7dc6985`). Marcel settled it the
same day in the ui-kit session: "Add kastlan recommended, option b where all the past
ones can be seen. They are essentially only mine.", on top of "as recommended". Where
each point went:
- **Marcel:** the five relayed decisions confirmed → decisions 1–5; **existing reports:
  keksdose relayed option (a)** (only new reports public; older ones private unless
  marked), **Marcel chose option (b) in the ui-kit session** after seeing both: every
  existing report public at the migration, a notice with an opt-out to other authors →
  decision 6, 9.3, 9.12; kastlan off → decision 7; the demo's last name stays "" →
  9.5; the rest "as recommended" → decisions 7–23.
- **keksdose:** K1 the grant, `server_default`, `notified_at` NULL with no grant, no
  `BEGIN`/`COMMIT` in the template, the read script, step 4 refusing `feedback_votes` →
  9.13; K2 the 14 rows per row by data, kept as comments → decision 16, 9.8; K3 the
  `notified_at` queue → 9.11; K4 "All feedback" via `publicHref`, "My feedback" as it
  is → decision 21, 9.15; P-a crash reports private (required) → decision 9; P-b and P-e
  the URL strip anywhere, on comments too → decision 10, 9.4; P-c → decision 6; P-d the
  first name only for complete names → 9.5; the export label `:324-325` → 9.1, 9.12;
  "Admin" for a null author, both types quiet → 9.7, 9.11.
- **kastlan:** A1 off; if on, per company and staff only → decision 7; A2 the export
  reads `outcome` (`account_service.py:300`), and kastlan **has** a loop write path
  (raw SQL as `kastlan_app` under bypass, `company_id` copied, `server_default`, no
  notice yet) → 9.1, 9.13, 9.16; A3 nothing to split → 9.1; it **has** throwaway demo
  accounts → 9.1, 9.5; `CompanyMixin` at `feedback.py:21` → 9.1; `feedback_answered` by
  e-mail only, `feedback_comment` not declared while off, a reply tried once → 9.11.
- **Kurvenschmiede:** the public demo → decision 8; B1 the app's predicate, CUSTOMER
  never → decision 7, 9.9; B2 a reply notifies, the nudge and the picker in the
  composer → decision 13, 9.7; B3 no first-word guessing, "A user" → decision 11, 9.5;
  B4 titles only, plaintext sort and search, SQL counts → decision 23, 9.9; the files
  predicate in the storage port's docs → decision 12, 9.10; the outcome only in the
  detail → 9.9; the export by id → decision 18; global report numbers fine.

The cites in 9.1 were re-read at settling: kk at `52fa9f6a`, ka at `187ffe3` (two release
commits after `fe8bf78`, no code change in the cited files), KS at `a35d44c` (a
dependency bump after `7dc6985`).

## 10. Round 0.40: rework as a conversation entry, and the feedback menu (settled 2026-10-16)

Two of Marcel's keksdose rows, answered on 2026-10-16 in the replies to the loop's
proposals (kk live #418 "Yes", #419 with his own labels; relayed by keksdose run 79,
`.feedback-live/run79-replies.md`). Drafted from a read-only survey on 2026-10-16 (kk
`6473cef0`, ka `4997d49`, KS `228cfe1`, all on ui-kit 0.39.1; server-kit `c47106b` =
0.12.0; ui-kit `b99604b`), reviewed by the three apps and **settled 2026-10-16 (Marcel, in
the ui-kit session)** (10.10). Built for **server-kit 0.13** and **ui-kit 0.40**. §1–§9
stand; where this section changes them it says so (§2.1 the statuses, §2.2 and §3.4 the
rework, §4.1 the menu, §4.3–§4.5, §5; §9.7 "Rework is unchanged", §9.11, §9.12, §9.13 the
loops).

### 10.1 Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| A rework today | the kit's rework section appends `--- REWORK <stamp> ---` + the note (+ one `[screenshot]` line) to `body` by PATCH; the server re-queues it. Today's: #421, block `2026-10-16 06:12`, Marcel's (admin) → READY (`.feedback-live/queue-run79.txt`, run 79's read) | the same through the kit (`CLAUDE.md:85`, `:117`) | the same through the kit (`frontend/src/shared/api/endpoints.ts:603`); seeded example `seed/__init__.py:149-150` |
| Rows with REWORK blocks | live: 151 of 423 rows, 286 blocks, all in `body` and all `--- REWORK YYYY-MM-DD HH:MM ---`; 8 `[screenshot]` lines; 145 DONE, 4 NEEDS_LIVE_TEST, 1 WONT_DO, 1 IN_EVALUATION; none queued; most on one row #103 ×14. `outcome` holds 10 more `REWORK_RULE_RE` matches from old loop answers (`--- REWORK ANSWERED 2026-09-16 ---`, date-only `--- REWORK 2026-09-04 ---`, `(2)`): not blocks | local 19 of 62 rows, prod 0 of 17; no `user_id` NULL among them | the seed's REWORKED example; the rework file is already a `FeedbackAttachment` of kind `rework` (`domain/models/feedback.py:239`, `:242-282`) |
| Status column | Postgres enum `feedback_status` (`domain/models/feedback.py:58-59`); READY was added in an autocommit block (`alembic/versions/20261007_0119_feedback_ready.py:74-76`) | Postgres enum `feedbackstatus` (`domain/models/feedback.py:41-45`); READY was a bare `ALTER TYPE … ADD VALUE IF NOT EXISTS` (`alembic/versions/c5e7a9b1d3f4_feedback_ready.py:33`, `transaction_per_migration`) | `String(20)` (`domain/models/feedback.py:147`): no type change |
| Replies table | `feedback_replies` with `notified_at` (`domain/models/feedback.py:123-147`); the store's `add` (`adapters/persistence/feedback_public_stores.py:62-81`) | `feedback_replies`, `CompanyMixin` + forced RLS (`domain/models/feedback.py:68-86`); the store copies `company_id` (`adapters/persistence/feedback_reply_store.py:49-60`) and sends the mail in `add` (`:66-68`) | `feedback_replies`, body sealed (`domain/models/feedback.py:286-319`); no DB default for `created_at` |
| The loop's queue | READY, IN_PROGRESS (`scripts/feedback-live-read.sh:38`); reads replies and comments since 0128 (`:66-77`) | READY, IN_PROGRESS (`CLAUDE.md:92-96`); rework "now in the `body`" (`:117`) | OPEN, READY, IN_PROGRESS (`backend/kurvenschmiede/feedback_loop.py:99`); a `[rework ×N]` marker off the body (`:148-151`) |
| The loop's write | `INSERT (feedback_id, body, status_from, status_to)` on `feedback_replies` + `UPDATE (status)` under the restricted login (`scripts/feedback-live-setup.sh:46-53`) | raw SQL as `kastlan_app` under bypass, `company_id` copied (`CLAUDE.md:109-111`) | `--resolve` → the kit's `FeedbackService.reply` as the first admin (`feedback_loop.py:300-335`) |
| Feedback menu | `isAdmin`, `publicHref="/all-feedback"` (`frontend/src/app/top-bar.tsx:132-138`): admin 2 links, member 2 | `isAdmin` only (`frontend/src/app/top-bar.tsx:125`, comment `:120-121`): admin 1, member 1 | `isAdmin`, `publicHref` when `seesPublicFeedback` (`frontend/src/app/top-bar.tsx:59-63`; `shared/lib/roles.ts:13`, `:44-47`): admin 2, member 2, customer 1 |
| An admin's own list | `/my-feedback` works for an admin (`features/feedback/feedback-page.tsx:148`), but no menu link | the same (`features/feedback/pages/feedback-page.tsx:121`; `CLAUDE.md:86` says admins review their own there) | the same (`features/feedback/feedback-page.tsx:87-107`) |
| The PWA cache | `registerType: "prompt"` (`frontend/vite.config.ts:171`, `src/sw.ts:23`): an old bundle lives for days | — | — |

**What today's run shows.** Marcel answered nine of the loop's questions on his own
reports (#405–#419, 14:00–14:14) with the admin's **reply** composer, no status, then moved
each to READY by hand (`queue-run79.txt`: the replies with an empty `status_to`, the rows
READY). They are reworks in all but name: the author asks for more. Only #421 used the
Rework button, and its note sits in the body. With REWORK offered in the composer's status
(decision 6), the reply and the move become one step.

The kits: server-kit decides the rework in `plan_update` (`feedback/rules.py:161-202`, an
append is `is_rework_append`, `feedback/body.py:123`) and sends it to `rework_status`
(`rules.py:123-127`: READY for an admin, OPEN otherwise); the lanes are `enums.py:69-71`
(author-editable), `:81` (reworkable = the rest), `:86-88` (awaiting). Replies are
`FeedbackReplyRow`/`NewFeedbackReply` (`feedback/ports.py:210-226`, `:253-261`), written by
`FeedbackService.reply` (`feedback/service.py:657-683`); `outcome` answers as the newest
reply (`service.py:530-534`); `public_body` keeps the REWORK lines (`public.py:123`); the
erasure reads rework files off the body (`erasure.py:98`). ui-kit: `appendRework` /
`reworkCount` (`src/feedback/feedback-record.ts:295`, `:317`), the lanes (`:186-217`),
`canRework` for the admin or the author (`feedback-row-detail.tsx:359`), the composer shown
for `replies && canEditOutcome && onReply` (`:794`), `FeedbackReworkSection` (`:444`), the
chip (`feedback-table.tsx:295-306`), the timeline and composer (`feedback-replies.tsx:46`,
`:91-117`; its status list is `selectableFeedbackStatuses`, every status, `:250`), the
merged thread (`feedback-comment-thread.tsx:124-207`), the menu's one list link by role
(`feedback-menu.tsx:132-149`) and its words (`feedback-menu-labels.ts:7-12`,
`src/i18n/german.ts:120-125`, `locales/fr.ts:109`, `it.ts:111`, `es.ts:111`, `hu.ts:108`,
`zh.ts:101`).

### 10.2 Decisions

**Marcel's (kk #418, #419; confirmed at settle):**
1. **A rework is a conversation entry from the author**, like a reply: its own row, dated,
   in the report's timeline. Nothing is appended to `body` any more.
2. **A rework has its own status, "Rework requested"** (`REWORK`), so the queue shows
   reworks apart from new reports.
3. **The menu:** "All feedback" becomes **"Feedback discussion"** (the public list);
   **"My feedback" for everyone, admins included**; **"Feedback inbox"** for admins (the
   triage list, in place of "View feedback"). The menu and its words are the kit's, so all
   three apps get them.

**Settled 2026-10-16 (Marcel: "As recommended", then "Yes to both"):**
4. **The lane.** `REWORK` means "sent back, released for work again": in the loops' queue
   with READY and IN_PROGRESS (`QUEUE_STATUSES`), not in `AWAITING_STATUSES` (it waits on
   the implementer, as READY does), not author-editable (the description was answered;
   more goes in as another rework), and reworkable (a second rework adds an entry). It sits
   after READY in the order; `next(REWORK)` is IN_PROGRESS; "advance" from READY still goes
   to IN_PROGRESS. **Colour `bg-danger-soft` / `text-danger`, icon `RotateCcw`** (the
   Rework button's): `bg-warning-soft` is IN_PROGRESS's (with `Wrench`), the status a
   REWORK row moves to next; only WONT_DO shares the red tint, at the far end, with `Ban`.
5. **Who lands where (§8.2 kept).** A rework entry by an admin → `REWORK` (already
   triaged, as READY is today); anyone else's → `OPEN` (new input for the triager; in
   kastlan a tenant's rework reaches the company's admin, never the dev loop past them).
   The entry marks it: the inbox shows the Rework chip on that OPEN row, and the triager
   releases it to `REWORK`. `rework_status(actor_is_admin=)` answers REWORK / OPEN.
6. **The admin keeps the reply composer; the Rework button is for authors without it.**
   An admin answers on any report, their own included, with the composer, which offers
   **REWORK as a status** like every status: one reply that says what is wanted and moves
   the report. The **Rework button shows only to an author the composer is not shown to**
   (members, customers, tenants). A rework entry is the report's author's only: the server
   takes `POST /rework` from the author (an admin author too, for an API caller or a cached
   client: their entry lands REWORK) and refuses anyone else.
7. **Entry kind, not a comment flag.** `feedback_replies.kind` (`'reply'` | `'rework'`,
   NOT NULL, default `'reply'`) and `attachment_url` (nullable, the rework's one file). A
   rework moves the status as a reply does (`status_from`/`status_to`); comments never move
   one, can be hidden, exist only where public parts are on (kastlan has no comments
   table), and are public-gated. The table keeps its name, so grants, RLS and stores stay.
8. **Migration.** One Alembic step per app (kastlan: two, 10.4) turns every `--- REWORK
   <stamp> ---` block **in `body`** into a `rework` entry; `outcome` is never split. For
   **one release** (server-kit 0.13) the server still takes the old PATCH append and
   writes it as an entry: needed, since keksdose's PWA keeps an old bundle for days
   (`registerType: "prompt"`). ~~From server-kit 0.14 an append is a 422.~~ The conversion
   stayed through 0.15; **from server-kit 0.16 an append is a 422 with code
   `legacy_rework_append`** (Marcel 2026-10-19; kastlan and Kurvenschmiede agreed, 10.3).
9. **The loops** still write replies only; `kind` and `attachment_url` are not in their
   INSERT, so a loop can never write a rework. They read `REWORK` rows and each entry's
   kind (10.5). **Kurvenschmiede keeps OPEN in its loop queue** (OPEN, READY, REWORK,
   IN_PROGRESS): Marcel is its only admin and OPEN is how untriaged reports reach him; a
   documented KS difference from §8.2's queue.
10. **Notifications.** A rework entry sends nothing: no `feedback_answered` (the reply
    store's `add` fires it for `kind = 'reply'` only), commenters not told, and **no admin
    mail** (Kurvenschmiede mails no admin about any filing today, `notification_service.py`
    types `:280`, `:310`, `:336`, `:371`, `:385`). The REWORK status (or
    the chip on OPEN) is the signal in the inbox. Admin alerts for new reports and reworks
    are a later round's new notification type. An admin's reply with status REWORK is a
    reply: it fires `feedback_answered` as §9.11 says (never to its writer, so an admin on
    their own report tells only earlier commenters). keksdose's app write sets
    `notified_at` at once, as for any app reply.
11. **The menu by role:** three link rows under the divider, in this order: **Feedback
    discussion** (`Users`, when `publicHref`), **My feedback** (`User`, always), **Feedback
    inbox** (`Inbox`, when `isAdmin`). Keys `all-feedback`, `my-feedback`, `view-feedback`
    and routes `/all-feedback`, `/my-feedback`, `/feedback` unchanged. The page headings
    follow the menu: `/feedback` "Feedback inbox", `/all-feedback` "Feedback discussion".
12. **A migrated rework's author is the report's author** (`user_id`). Who pressed the
    button was never recorded; nearly all are the author's. Where the report's author is
    erased (`user_id` NULL), kastlan and Kurvenschmiede write `author_id` NULL, drawn as an
    unattributed rework ("A user"), never as "Admin". **Not in keksdose**, where a NULL
    reply author is the loop's team answer (`feedback_answered` by the jobs runner, the read
    script): its step leaves such a row's blocks in `body` and prints those ids (amended at
    keksdose's adoption, 0.40.1: not stopping the deploy; `feedbackReworkCount` still counts
    the blocks there, and no author-less entry reads as a team answer). Kurvenschmiede takes the uploader of a
    matching rework attachment first (10.4).

### 10.3 The rework entry

```jsonc
// FeedbackReworkCreate — POST /feedback/{feedback_id}/rework (the author)
{ "body": "Still cut off on the iPad.",            // 1–8000 after trimming, required
  "attachment_url": "/api/v1/feedback/attachments/<key>" }  // optional, one; under the app's attachment prefix
// FeedbackReplyResponse gains
{ "kind": "rework",                                // "reply" (default) | "rework"
  "attachment_url": "…" }                          // admin and author views only; null for a reply
```

- **Who:** the report's author, not a demo (demo guard → as today); anyone else 403 "Only
  the author sends a report back; an admin replies". Status must be reworkable (now six:
  IN_EVALUATION, NEEDS_LIVE_TEST, POSTPONED, DONE, WONT_DO, REWORK), else 403 with today's
  wording. A foreign row is the app's `foreign_row` answer (404 or 403), as for a read.
- **What it does:** adds the entry (`author_id` = the author, `kind = 'rework'`,
  `status_from` = the row's, `status_to` = `rework_status(actor_is_admin=)`), then applies
  the row (status, `resolved_at` cleared on leaving DONE/WONT_DO). One write per store, the
  report last (§9.14). Answers 201 with the report and its `replies` (the author's view).
- **An admin's REWORK reply:** `POST /feedback/{id}/replies` with `status: "REWORK"` is an
  ordinary reply (`kind = 'reply'`, §9.7); it is how an admin sends any report back.
- **Shown:** in the timeline, oldest first with the replies and comments, as the author's
  (`own` for them), with the **Rework** chip (`feedbackPage.reworkChip(1)`) and
  "→ {status}"; a migrated entry (`status_to` NULL) without the arrow; its file as the
  rework pictures are today (§4.4.3). An entry with `author_name` NULL and kind `rework`
  is "A user" (the comments' word), never the admin word. In the public detail through
  `public_text`, first name only, `kind` carried, no `attachment_url` (§9.10: the note was
  public in the body before; the file never).
- **The Rework chip** counts `kind = 'rework'` entries; without `replies` it falls back to
  `reworkCount(body)`.
- **`outcome`'s shim** (`service.py:530-534`) takes the newest entry of kind `reply`.
- **Erasure (amends §9.12 step 4):** a rework entry by the person: `author_id` NULL, body
  scrubbed, kept, shown as "A user"; its file joins the keys `erase_author` purges (in
  Kurvenschmiede it already goes with the report's attachments, 10.4). **Export:**
  `data.feedback[].replies[]` gains `kind`.
- **The legacy PATCH (server-kit 0.13–0.15):** an append (`is_rework_append`) is split by
  `split_rework_blocks` and written as the actor's rework entry when the actor is the
  author, or as a reply with status REWORK when an admin appended to someone else's
  report; `body` is not written; a log line `feedback.legacy_rework_append` per use.
  **From server-kit 0.16** (Marcel 2026-10-19) such an append, on a row outside OPEN /
  READY / IN_PROGRESS, by the author or an admin, is refused before anything is written:
  422 `{"detail": "This page is out of date: reload it, then send the report back
  again.", "code": "legacy_rework_append"}` (`LegacyReworkAppendError`). Only a tab left
  open across the deploy still sends it; it shows the detail (the kit's toast prefers a
  `detail`, §3.7) until it reloads. Nothing is lost silently. In the author's lane an
  append stays an ordinary body edit.

### 10.4 Migrating the REWORK blocks

Per app, with server-kit's `split_rework_blocks(body) -> tuple[str, list[ReworkBlock]]`
(`ReworkBlock(stamp: datetime, note: str, url: str | None)`). A block opens on a line that
matches `REWORK_BLOCK_RE` = `^--- REWORK (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) ---$` (exactly
`append_rework`'s rule, after trimming) and runs to the next `BLOCK_RULE_RE` line or the
end; its first `[screenshot]` line is `url`, the rest trimmed is `note`. A line that
matches `REWORK_RULE_RE` but not the stamp (`--- REWORK ANSWERED 2026-09-16 ---`,
`--- REWORK 2026-09-04 ---`, `(2)`) raises `ValueError`, so a step stops rather than guess.
**Only `body` is split, never `outcome`**: keksdose's `outcome` holds 10 such lines from
old loop answers, and `reworkCount` never reads it either.
- one `rework` entry per block: `author_id` per decision 12, `body` = the note,
  `attachment_url` = the block's `url`, `created_at` = the stamp **written explicitly**
  (UTC, to the minute; ties keep block order by id), `status_from`/`status_to` NULL;
- `body` = the description, plus kastlan's `--- COMMENT … ---` blocks as they are (0 rows
  today, §9.1);
- **statuses unchanged** (a READY row with a fresh block stays in the queue);
- the columns: `kind VARCHAR(12) NOT NULL DEFAULT 'reply'` and `attachment_url
  VARCHAR(500) NULL` on `feedback_replies`;
- **keksdose** (one step): the enum label `ALTER TYPE feedback_status ADD VALUE IF NOT
  EXISTS 'REWORK' AFTER 'READY'` in an autocommit block first (0119's pattern); the
  columns; the entries with `notified_at = created_at` (never sent); refuses on a NULL
  `user_id` with blocks (decision 12). Live: 151 rows, 286 entries, 8 with a file;
- **kastlan** (two steps; prod runs them through Alembic in the `kastlan-migrate` job):
  step 1 only `ALTER TYPE feedbackstatus ADD VALUE IF NOT EXISTS 'REWORK' AFTER 'READY'`,
  committed before any step writes the value (the same type serves `feedback.status` and
  the replies' `status_from`/`status_to`); step 2 the columns and the entries under
  `SET LOCAL app.bypass_rls`, `company_id` copied from the report;
- **Kurvenschmiede** (one step): no type change; `kind` added with
  `server_default='reply'` and the default dropped in the same step (the model sets it);
  decrypt the body, re-seal the body and each entry under their keys as 0052 does; nothing
  to copy for a file: the rework file already is a `FeedbackAttachment` of kind `rework`
  on the report, so the entry's `attachment_url` is its existing
  `/feedback/attachments/<key>` (the key the block's `[screenshot]` line names), no second
  copy, and erasure already purges it through the report's attachments. `author_id` is
  that attachment row's `user_id` (the uploader) when a block's key matches one, else
  decision 12's;
- **downgrade:** re-appends each entry in `append_rework`'s shape (oldest first), deletes
  the entries, drops the columns; a Postgres enum label cannot be dropped, so the label
  stays and every `REWORK` in `feedback.status`, `status_from` and `status_to` becomes
  READY (Kurvenschmiede the same on its string column).

### 10.5 The loops' write paths

The writes stay §9.13's. What changes is the read:
- **keksdose:** `feedback-live-read.sh:38` adds `'REWORK'` to the queue, guarded by
  `pg_enum` as READY was; the replies query (`:66-77`) selects `kind` and
  `attachment_url`. `feedback-live-setup.sh:51-52` unchanged: the table-level `SELECT`
  covers the new columns, the `INSERT` column grant stays without `kind` and
  `attachment_url`, so a loop row defaults to `'reply'`.
- **kastlan:** `CLAUDE.md:92-117`: the queue `status IN ('READY', 'REWORK',
  'IN_PROGRESS')`; "the rework note is the newest `kind = 'rework'` entry, or the newest
  reply with `status_to = 'REWORK'`"; the INSERT unchanged (`kind` defaults to `'reply'`).
- **Kurvenschmiede:** `feedback_loop.py:99` `QUEUE = (OPEN, READY, REWORK, IN_PROGRESS)`
  (decision 9); the `[rework ×N]` marker (`:148-151`) counts entries; `thread_of` shows the
  kind.
- Every loop reads what is asked from the newest rework entry or REWORK reply, and answers
  with a reply (status IN_EVALUATION or NEEDS_LIVE_TEST), as any queued row.

### 10.6 The words

| Key | EN | DE-CH | FR | IT | ES | HU | ZH |
|---|---|---|---|---|---|---|---|
| `feedbackMenu.discussion`, `feedbackPublic.title` | Feedback discussion | Feedback-Diskussion | Discussion des retours | Discussione sui feedback | Debate de comentarios | Visszajelzések megvitatása | 反馈讨论 |
| `feedbackMenu.myFeedback` (unchanged) | My feedback | Mein Feedback | Mes retours | I miei feedback | Mis comentarios | Visszajelzéseim | 我的反馈 |
| `feedbackMenu.inbox`, `feedbackPage.title` | Feedback inbox | Feedback-Eingang | Retours reçus | Feedback ricevuti | Comentarios recibidos | Beérkezett visszajelzések | 反馈收件箱 |
| `feedbackStatus.REWORK` | Rework requested | Nacharbeit angefordert | Reprise demandée | Rielaborazione richiesta | Corrección solicitada | Átdolgozás kérve | 已要求返工 |

All three apps found them fine. The rework words follow the kit's existing chip
(`Nacharbeit`, `Reprise`, `Rielaborazione`, `Corrección`, `Átdolgozás`, `返工`);
"retours" and "comentarios" follow each language's `feedbackMenu`. `allFeedback` and
`viewFeedback` stayed optional and unused for one minor and were removed in 0.41 (no app
overrode them).

### 10.7 What server-kit 0.13 ships

Additive but for two behaviour changes: `rework_status` for an admin (READY → REWORK) and
the PATCH append (written as an entry, 10.3). Paths under `src/eifi1_server_kit/`.

**Layer 1**
- `feedback/enums.py`: `FeedbackStatus.REWORK = "REWORK"` after READY;
  `REWORKABLE_STATUSES` gains it (derived); new `QUEUE_STATUSES: frozenset =
  {READY, REWORK, IN_PROGRESS}`; new `FeedbackEntryKind(str, Enum)`: `REPLY = "reply"`,
  `REWORK = "rework"`.
- `feedback/rules.py`: `rework_status(*, actor_is_admin)` → REWORK / OPEN;
  `plan_rework(*, status, is_author, actor_is_admin, now=None) -> ReplyPlan` (the 403s of
  10.3; `status_from`/`status_to` and `changes` with `resolved_at`); `UpdatePlan` gains
  `rework: ReworkBlock | None` (the appended block, split) and `plan_update` drops `body`
  from `changes` when it is set.
- `feedback/body.py`: `REWORK_BLOCK_RE`; `ReworkBlock(stamp, note, url)` (frozen
  dataclass); `split_rework_blocks(body, *, prefix=DEFAULT_ATTACHMENT_URL_PREFIX) ->
  tuple[str, list[ReworkBlock]]` (10.4); `append_rework`, `rework_count`,
  `is_rework_append` kept, documented as legacy (the PATCH conversion, the downgrade).
- `feedback/schemas.py`: `FeedbackReworkCreate {body: str (1–REPLY_MAX, trimmed),
  attachment_url: str | None}` (`extra="forbid"`; a URL outside the prefix → 422);
  `FeedbackPublicReplyResponse.kind: FeedbackEntryKind = REPLY`;
  `FeedbackReplyResponse.attachment_url: str | None = None`.
- `feedback/public.py`: `PUBLIC_REPLY_FIELDS` gains `kind`, never `attachment_url`.

**Layer 2**
- `feedback/ports.py`: `FeedbackReplyRow` gains `kind: FeedbackEntryKind | str` and
  `attachment_url: str | None`; `NewFeedbackReply` gains `kind = FeedbackEntryKind.REPLY`,
  `attachment_url = None`, `created_at: datetime | None = None` (the migration's explicit
  stamp); `FeedbackReplyStore.add` documented: fires `feedback_answered` for `reply` only.
- `feedback/service.py`: `FeedbackService.rework(actor, feedback_id, payload:
  FeedbackReworkCreate) -> RowT`; `update` turns an append into `rework` or a REWORK reply
  (0.13 only, logged `feedback.legacy_rework_append`); `_reply_view` carries `kind`, and
  `attachment_url` for the admin and author views; the outcome shim takes the newest
  `reply`; `erase_author` scrubs rework entries as replies and collects their files.
- `feedback/router.py`: `POST /{feedback_id}/rework` → `create_rework` (201,
  `response_model`, the report with `replies` via `answer`), mounted where
  `deps.replies` is set, dependencies `deps.demo_guard("feedback")` only (no admin guard).
- `feedback/erasure.py`: keys from entries' `attachment_url` too. `feedback/testing.py`:
  the in-memory reply store keeps `kind`/`attachment_url` and fires for `reply` only;
  `check_reply_store` covers both kinds and an explicit `created_at`.
- `feedback/__init__.py`: exports `FeedbackEntryKind`, `QUEUE_STATUSES`, `ReworkBlock`,
  `REWORK_BLOCK_RE`, `split_rework_blocks`, `plan_rework`, `FeedbackReworkCreate`.

**Tests:** `test_rules.py` (REWORK in the lanes and the queue, `rework_status`,
`plan_rework` 403s, `plan_update` with a legacy append), `test_body.py`
(`split_rework_blocks`: none, one, two, a file, a COMMENT block kept, a sentence with
"REWORK" not split, `--- REWORK ANSWERED 2026-09-16 ---` and a date-only rule raise),
`test_schemas.py`, `test_service.py` (rework by the author → OPEN, by an admin author →
REWORK, by an admin on another's 403, an admin's REWORK reply, the legacy append both
ways, no notification, the shim, erasure), `test_router.py` (201, demo refusal, no admin
guard), `test_testing.py`; 100 % coverage.

Size: **M** (~350 code, ~600 test lines).

### 10.8 What ui-kit 0.40 ships

- `src/feedback/feedback-vocabulary.ts`: `"REWORK"` in `FeedbackStatus` and
  `FEEDBACK_STATUS_META` after READY (`icon: RotateCcw`, `activeBg: "bg-danger-soft"`,
  `activeText: "text-danger"`); `FORWARD_CHAIN` unchanged, `nextFeedbackStatus("REWORK")`
  = IN_PROGRESS; `visibleFeedbackStatuses("REWORK")` adds IN_PROGRESS;
  `selectableFeedbackStatuses` (the composer's list) includes it by the order.
- `src/feedback/feedback-record.ts`: REWORK in `FEEDBACK_REWORKABLE_STATUSES`; new
  `FEEDBACK_QUEUE_STATUSES` (READY, REWORK, IN_PROGRESS); `feedbackReworkCount(row)` (the
  `rework` entries, else `reworkCount(row.body)`); `appendRework` kept for the fallback.
- `src/feedback/feedback-public-types.ts`: `FeedbackReply.kind?: "reply" | "rework"`,
  `.attachment_url?: string | null`; `author_name` null on a rework → "A user".
- `src/feedback/feedback-row-detail.tsx`: `canRework` = the author on a reworkable row;
  the Rework button shows only when the composer does not (`!(replies && canEditOutcome
  && onReply)`); new prop `onRework?: (note: string, attachmentUrl?: string) =>
  void | Promise<unknown>` (the POST); `FeedbackReworkSection` sends through it, and
  through `onUpdate`'s append only when `onRework` is missing (one minor).
- `src/feedback/feedback-replies.tsx`, `feedback-comment-thread.tsx`,
  `feedback-public-list.tsx` (`FeedbackPublicDetail`): rework entries drawn as the author's
  with the Rework chip, "→ {status}" only when `status_to` is set, and their file.
- `src/feedback/feedback-table.tsx`: the chip from `feedbackReworkCount`.
- `src/feedback/feedback-menu.tsx`, `feedback-menu-labels.ts`: decision 11 — rows
  `all-feedback` (`labels.discussion`, `Users`, `to: publicHref`, when set), `my-feedback`
  (`labels.myFeedback`, `User`, `to: myFeedbackHref`, always), `view-feedback`
  (`labels.inbox`, `Inbox`, `to: inboxHref`, when `isAdmin`); `FeedbackMenuLabels` gains
  `discussion`, `inbox`; `allFeedback`, `viewFeedback` optional and `@deprecated` (removed
  in 0.41).
  Rows per role: admin with public parts 3, member 2; kastlan admin 2, member 1; a KS
  customer 1.
- Labels in seven languages (10.6): `src/i18n/german.ts`, `src/i18n/locales/{fr,it,es,hu,
  zh}.ts`, the English defaults; `feedbackMenu.discussion`, `feedbackMenu.inbox`,
  `feedbackPage.title`, `feedbackPublic.title`, `feedbackStatus.REWORK`.
- Showcase and the search index: the menu by role, a REWORK row, a rework entry and an
  admin's REWORK reply in the timeline.

**Tests:** `feedback-menu.test.tsx` (three rows by role, order, keys, icons),
`feedback-row-detail.test.tsx` (`onRework`, no Rework button where the composer shows,
the button for a member author, the `onUpdate` fallback), `feedback-replies.test.tsx` (a
rework entry, a migrated one without the arrow, REWORK in the composer's list),
`feedback-table.test.tsx` (the chip from entries and from a body), the vocabulary test
(REWORK's meta, next and visible), the labels test for seven locales.

Size: **M** (~300 code, ~350 test lines, seven locales).

### 10.9 Per app

- **keksdose, S–M:** the migration (10.4); the reply store writes both kinds and fires for
  `reply` only (`adapters/persistence/feedback_public_stores.py:62-81`); `onRework` on its
  pages; the read script (10.5); the agent prompt and `feedback-live-write.sh` text name
  REWORK.
- **kastlan, S:** the two migration steps (10.4); the reply store copies `company_id` for
  both kinds (`adapters/persistence/feedback_reply_store.py:49-60`) and skips the mail for
  `kind = 'rework'` in `add` (`:66-68`); entries scoped as replies (`CompanyMixin`, forced
  RLS), so a tenant's rework is seen by its company's admin only; `onRework`;
  `top-bar.tsx:120-121` comment; `CLAUDE.md` §"Feedback Loop" (`:76-117`: nine statuses,
  the queue, the rework).
- **Kurvenschmiede, S–M:** the migration with the seals (10.4); the reply store
  (`domain/services/feedback_stores.py:76`) and `feedback_answered`
  (`notification_service.py:280`) skip reworks; `feedback_loop.py` (10.5, OPEN kept); the
  seed's REWORKED example (`seed/__init__.py:149-150`) written as a rework entry through
  `FeedbackService.rework`; `docs/feedback-loop.md` (the KS queue difference).
- **All:** nothing in the menu call changes (the kit draws the rows by role).

### 10.10 Reviews and decisions

The draft (ui-kit `75aadd2`) was reviewed on 2026-10-16 by keksdose (keksdose-cb), kastlan
(kastlan-d1, at `4997d49`) and Kurvenschmiede (kurvenschmiede-1b, at `228cfe1`). Marcel
settled it the same day in the ui-kit session ("As recommended"), then confirmed the
follow-up ("Yes to both"). Where each point went:
- **Marcel:** the admin keeps the reply composer, which offers REWORK → decision 6; the
  Rework button only for an author without the composer → decision 6, 10.8; REWORK's
  colour `bg-danger-soft` with `RotateCcw` → decision 4, 10.8; KS keeps OPEN in its loop
  queue → decision 9, 10.5; a migrated rework's author is the report's, NULL only where it
  does not mean a team reply → decision 12, 10.4; no admin mail, admin alerts a later
  round's type → decision 10.
- **keksdose:** the composer beside Rework → decision 6; the live numbers (151 rows / 286
  blocks) and the `outcome` trap (split `body` only, the "REWORK ANSWERED" test) → 10.1,
  10.4, 10.7; the one-release PATCH conversion needed (PWA prompt) → decision 8, 10.3;
  NULL = a team reply in kk → decision 12; migrated entries without "→ status" → 10.3,
  10.8; the colour objection → decision 4; the grants (table `SELECT`, column `INSERT`) →
  10.5; cites `feedback-live-read.sh:66-77`, `feedback_public_stores.py:62-81`,
  `.feedback-live/queue-run79.txt` → 10.1, 10.9.
- **kastlan:** a tenant's rework → OPEN, scoped like replies → decision 5, 10.9; menu admin
  2, others 1 → 10.8; words and colour fine; `scripts/feedback-prod-migrate.sql` dropped
  (historical; prod runs Alembic) → 10.4; REWORK's label in its own step first, the
  downgrade to READY with the label kept → 10.4; the cite `:41-45` → 10.1; the mail skip in
  the store's `add` (`:66-68`) → 10.9; the erased-author NULL → decision 12.
- **Kurvenschmiede:** OPEN kept → decision 9; no admin mail (KS mails none about any
  filing) → decision 10; customer menu 1 row → 10.8; the colour (IN_PROGRESS's
  tint) → decision 4; the author from a matching rework attachment → decision 12, 10.4; no
  file to copy, erasure via the report's attachments, `kind` with a dropped server
  default, `created_at` explicit, the re-seal like 0052, the seed via the service → 10.4,
  10.9; cites `endpoints.ts:603`, seed `:149-150` → 10.1.

## 11. Round 0.46: admin alerts for new reports and reworks — SETTLED (round 0.46)

**Settled 2026-10-19** (Marcel, after the keksdose, kastlan and Kurvenschmiede reviews in
audits/round-047/reviews.md "Feedback alerts §", and his decisions in the KS session).
§11.2 ends with a **Settled** block that overrides the proposal where they differ; the
reviews' corrections are folded into §11.1, re-checked at ka 26a2eaa, kk 23c18e71, KS
2b2bdab and server-kit 06c0848; §11.5 records the reviews and the settle. Built for
**server-kit 0.16 / ui-kit 0.46**, with notifications §10.

As drafted: Marcel, 2026-10-19 (audits/round-047/brief-047.md,
"Scope extension"): new reports and reworks notify the app's admins, in the app and by
e-mail, **on by default**, and each admin can switch it off. It is the "later round's new
notification type" that §10.2 decision 10 left open, and it is a type in notifications
§10.2 (the switch per channel). It is drafted with notifications §10, and uses its inbox
(§10.1) and its mail bundling (§10.4). Read at kk `2cb460c1`, ka `26a2eaa`, KS
`2b2bdab`, server-kit `a264f7f` (0.16.0). Paths as in notifications §10.

### 11.1 Where each one stands

**No app tells an admin about a new report, a rework or a crash.** The only signal is the
attention badge, which the app polls.

**keksdose**
- Badge: `domain/services/admin_attention_service.py:69-91`, polled every 60 s
  (`features/admin/use-admin-attention.ts:9-28`).
- One admin alert already exists, for support chat. `admin_recipient_ids` picks every
  real, active admin (`support_chat_service.py:800-817`), and
  `notify_support_message` pushes to them (`push_notifications.py:1310-1366`).
- The feedback stores fire `feedback_answered` and `feedback_comment` only
  (`adapters/persistence/feedback_public_stores.py:63-88`, :135-139). `add` sends nothing
  (`feedback_repository.py:90-105`).
- Admin: `users.role == ADMIN` (`domain/models/user.py:28-37`, :66), checked by
  `require_role` (`infrastructure/dependencies.py:502-510`).
- **keksdose sends no notification mail yet.** It has no one-click unsubscribe route or
  `/unsubscribe` page (notifications §3.6).

**kastlan**
- Feedback is company-scoped, with RLS (`domain/models/feedback.py:21-28`). Triage
  belongs to the company's ADMIN (`adapters/api/feedback_router.py:43-51`, :91).
- Roles are per company (`domain/models/auth.py:17-21`). The platform's `is_superuser`
  (:40-43) has no feedback count (`admin_attention_service.py:80-92`).
- Badge: `admin_attention_service.py:1-20`, shown at `app/top-bar.tsx:84`.
- The recipient pattern is the overdue mail's `_recipients` (`overdue_mail.py:95-116`):
  the role in the event's company, `is_active`, `not is_demo`, `email_verified`, the
  type's switch with its default. The billing notices to a company's admins
  (`billing_notices.py:67-86`) are account mail (no type switch, no `email_verified`, no
  unsubscribe parts), not the pattern.
- `/feedback` is ADMIN-only (`require_role(*ADMIN_ONLY)`, `feedback_router.py:91`, :114,
  :125; `infrastructure/roles.py:20`), so a manager's link would land on a 403.
  `receivable_types` knows only "staff anywhere" (`notification_types.py:39-43`).
- Mail is inline with a 10 s timeout per recipient (`infrastructure/email.py:37`). The
  repository and the reply store commit each write (`feedback_repository.py:53-54`,
  `feedback_reply_store.py:71-77`).
- The reply store mails only a reply (`feedback_reply_store.py:71-77`).

**Kurvenschmiede**
- Admin: `role == ADMIN` (`domain/models/user.py:24-58`, :93-97). Marcel is the only one
  today.
- `save` "no longer tells anybody anything" (`domain/services/feedback_service.py:287-291`).
  Only a REPLY entry fires (`feedback_stores.py:111-112`).
- Badge: `attention_service.py:9-13`.
- The loop files reports under the first admin (`feedback_loop.py:286-291`, :363-371),
  through the kit's `FeedbackService.create` on purpose ("the one the POST endpoint
  runs", :365), with its own constructor call.
- Mail goes after the commit (`send_after_commit`) through `_tell`
  (`notification_service.py:196`), with the unsubscribe footer and headers.

**The kit**
- `FeedbackService.create` refuses a demo and a manual CRASH (SK `feedback/service.py:291-319`,
  at 06c0848).
- `report_crash` answers `stored: false` for a demo or a spent window, and folds repeats
  by fingerprint (:321-375). The fingerprint holds the user id and the app version
  (`crash.py:70-87`): one broken page hit by 30 users is 30 rows, and an unfixed crash
  comes back after each deploy. The 20-an-hour cap is per account and doesn't bound it.
- `rework` refuses a demo (:720-751). It commits the entry (`store.add`, :739) before the
  status (`repository.apply`, :751): REWORK for an admin author, OPEN otherwise.
- The reply store fires for `kind = 'reply'` only (`feedback/ports.py:335-339`).
- `feedback_recipients` is author and commenters only (`feedback/public.py:140-155`).

**Logs**
- No production line logs a recipient address.
- The console mailers do log one, and are for development only: SK `mail.py:589-604`;
  kk `infrastructure/email.py:83`; ka `infrastructure/email.py:88-96`.
- kastlan's Resend error line logs `response.text`, which could echo the address
  (`email.py:127`).

### 11.2 Proposal

1. **One type, `feedback_received`. Rec:** one type covers a new report, a rework entry
   and a new crash.
   - Its id (`FEEDBACK_RECEIVED`) and setting words go in the kits: all three apps
     declare it (notifications decision 1's rule).
   - Alternative: two types, "New reports" and "Reworks", for an admin who wants only one
     of them. That is open for Marcel.
2. **On by default** in every channel the app offers (Marcel). This is an exception to
   notifications decision 1's default rule, named there.
   - Channels: keksdose in the app (inbox) + push + e-mail. kastlan e-mail, plus in the
     app once its inbox lands (notifications §10.1). KS e-mail.
   - `quiet = True`: a push waits for the end of quiet hours (§10.4). Each admin switches
     it off per channel on the types card.
3. **Who receives it** (the registry's `receivable`, notifications §3.1). Never a demo or
   deactivated account, and never the event's actor.
   - **keksdose:** every active `ADMIN` (`admin_recipient_ids`).
   - **kastlan:** the active `ADMIN`s **of the report's company**, the role checked in that
     company at delivery (as `invoices_overdue`). **Rec:** the platform superuser is not
     told; its console has no feedback. Open for Marcel.
   - **Kurvenschmiede:** every active `ADMIN`, not only the first.
   - An admin who files or reworks is not told about their own report; other admins are.
   - A report the KS loop files under the first admin tells nobody else today, since KS
     has one admin.
4. **What fires it:**
   - `create` (a new report, after the write);
   - `rework` (the entry);
   - `report_crash`, **only when it adds a row**, never when it folds a repeat.
   - It does not fire for a reply, a status change, a comment, a vote or a loop's write.
   - Crashes are already capped by the window (20 an hour per account). **Rec:** they
     alert too, and the 15-min mail bundle (§10.4) turns a burst into one mail.
5. **The demo.** A demo cannot file or rework (403), and its crash is not stored
   (`stored: false`), so it fires nothing. A demo admin never receives one (notifications
   §3.3 rule 1).
6. **The words. No sealed content, no reporter.** The push, the inbox row and the mail
   carry the same text: "New feedback report #123 (Bug)", "Report #123 was sent back for
   rework", "New crash report #123". The link is the admin inbox, `/feedback?row=123`.
   - No title, no body, no reporter name or address in any of them. KS seals titles; mail
     and push are plaintext. The admin reads the rest in the app.
   - Category labels are the app's. The mail carries the unsubscribe footer and headers
     (notifications §3.6).
   - A bundle reads "{n} new feedback reports and reworks", one line each.
7. **No recipient in logs.** The alert's path logs the type, the report id and the
   recipient's **user id**, never an address. The console mailers stay development-only
   (said in each app's settings check). **Rec:** kastlan's `email.py:127` logs the
   status and Resend's error `name` instead of `response.text`.
8. **Where it fires (server-kit).**
   - `FeedbackService(alerts: FeedbackAlerts | None = None)`. `FeedbackAlerts` is a port:
     `async def filed(alert: FeedbackAlert, row) -> None`.
   - `FeedbackAlert(kind: Literal["report", "rework", "crash"], feedback_id, category,
     actor_id)`.
   - It is called after the write, in the request's transaction. The app resolves
     recipients and delivers through its notification plan: an inbox row and a push
     (kk), or a queued or after-commit mail.
   - A layer-1 helper, `admin_alert_recipients(admin_ids, *, actor_id) -> list[int]`.

**Settled (2026-10-19).** Rules 1–8 stand with these changes:
1. **One type, `feedback_received`** (Open 1), for a new report, a rework and a new crash.
2. **On by default in every channel the app offers** (as proposed). keksdose: in the app,
   push and e-mail. kastlan: e-mail (its inbox is for `invoices_overdue` only,
   notifications §10.1). KS: e-mail. `quiet = True`.
3. **Mail by kind** (Open 2 amended, Open 4 as proposed):
   - **A new report and a rework are mailed right away**, after the commit, in every app.
   - **A crash notifies in the app** (keksdose: an inbox row and a push; kastlan and KS:
     the attention badge, which counts OPEN) and **is mailed only inside a 15-minute
     bundle where the app runs the queue** (notifications §10.4): keksdose. kastlan and KS
     mail no crash; a crash burst (the fingerprint is per user and version) would be one
     mail per row, and inline on `POST /feedback/crash` it would make a crashed page wait
     N × 10 s.
   - So `feedback_received.bundle = 15 min` applies to crash mails only, and only where a
     flush runs.
4. **Recipients (3 amended):**
   - **keksdose:** every active `ADMIN` (`admin_recipient_ids`) but the actor.
   - **kastlan: the ADMINs of the report's company only**, not managers (they cannot open
     `/feedback`). The type gets its own receivability rule, **"ADMIN in some company"**
     (beside "staff anywhere"), so managers and accountants are not offered a switch
     they can never receive. At delivery: ADMIN in the report's company, `is_active`,
     `not is_demo`, `email_verified`, the type's switch, the actor skipped, as
     `_recipients` (`overdue_mail.py:95-116`). A two-company person (ADMIN in A, MANAGER
     in B) hears only A's.
   - **KS: every active, non-demo ADMIN but the actor** (`User.is_person` leaves out the
     demo's system account). Its settings resource filters `feedback_received` by
     receivability on the read and on the PATCH (notifications §10.2 Settled).
   - **The platform superuser is not told** (Open 3); it hears this type only where it
     is an ADMIN itself. A developer signal on entering READY/REWORK would be a separate
     operator type.
5. **What fires it (4 amended):**
   - `create`, after the write; `report_crash` only when it adds a row.
   - **`rework` after `repository.apply`**, never after the entry alone (else it could
     announce a rework whose status move failed), and only when the rework **lands
     OPEN** (an author's); an admin's own rework lands in REWORK, the developer's lane,
     and tells nobody.
   - **The loops stay silent because their service is built without alerts**: KS's
     `feedback_loop.file_report` builds its `FeedbackService` with `alerts=None` (it has
     its own constructor call); the kit does not tell the two apart. keksdose's and
     kastlan's loops write by SQL past the service (§9.13, §10.5) and fire nothing.
6. **The words name the company in kastlan** (a two-company admin acting in B sees
   nothing of A's: RLS), as the overdue mail does (`{company}`, `overdue_mail.py:133`);
   the link switches company, or the page says "switch to A". kastlan's subjects:
   - de-CH: «Neue Rückmeldung #{number} ({category}) bei {company}» / «Rückmeldung
     #{number} bei {company} wurde zur Überarbeitung zurückgeschickt»
   - en: "New feedback report #{number} ({category}) at {company}" / "Report #{number} at
     {company} was sent back for rework"
   - fr: « Nouveau retour n° {number} ({category}) chez {company} » / « Le retour
     n° {number} chez {company} a été renvoyé pour reprise »
   - it: «Nuova segnalazione n. {number} ({category}) presso {company}» / «La
     segnalazione n. {number} presso {company} è stata rimandata per revisione»

   The type's title: "Neue Rückmeldungen und Überarbeitungen" / "New feedback and
   reworks" / "Nouveaux retours et reprises" / "Nuove segnalazioni e revisioni"; the body
   is `feedback_answered`'s shape ("Guten Tag {first_name}", one line, the link), formal
   Sie/vous/Lei, in `doc_text/notifications.py` beside `feedback_answered`, under
   `REVIEW_PENDING`. keksdose and KS name no company (one group of admins). All pushes
   and inbox rows are quiet (no sound, no vibration); support chat's admin push stays
   apart (conversational, `quiet=False`).
7. **No recipient in logs (7 amended).** kastlan's `email.py:127` logs the status and the
   JSON's `name` only (falling back to the status), never `response.text`; its SMTP
   `logger.exception` (:153-154) logs `type(exc).__name__` (aiosmtplib's
   `SMTPRecipientsRefused` holds the address). keksdose refuses the `console` mailer in
   production since kk 23c18e71 (notifications §10.4 Settled); KS's console mailer is
   development-only (`EMAIL_BACKEND=console`).
8. **Where it fires (8 amended).** The port is called after the write; the app delivers
   **after the commit**: kastlan in a background task (inline mail would hold the
   request), KS through `send_after_commit`, keksdose through its notification plan
   (inbox row and push in the transaction, the mail after commit, a crash's mail
   queued). kastlan wires the port through `FeedbackDeps` (`feedback_router.py:84-107`).
9. **keksdose's first notification mail** brings its unsubscribe route and the
   `/unsubscribe` page with RFC 8058 headers, which needs `send_email`'s `headers`
   parameter (notifications §10.2 Settled).

### 11.3 Split and size

- **server-kit S:**
  - `FEEDBACK_RECEIVED`, `FeedbackAlert`, `FeedbackAlerts`, `admin_alert_recipients`;
  - the three call sites;
  - a `testing` fake that records alerts;
  - tests: a fold fires nothing, a demo fires nothing, the actor is skipped.
- **ui-kit XS–S:** the type's words in `useFeedbackNotificationTypes` ("New feedback and
  reworks", "When someone files a report, sends one back, or a page crashes.") in seven
  languages, and an "Admin" group heading the apps may use.
- **keksdose S–M:**
  - the type;
  - its first notification mail, so the unsubscribe route and the `/unsubscribe` page
    with the kit's `UnsubscribePanel` (notifications §3.6);
  - `FeedbackAlerts` over `admin_recipient_ids`.
- **kastlan S:**
  - the type (staff ADMIN only);
  - the mail through `notification_mail`;
  - the company-scoped recipients;
  - the `email.py:127` log fix.
- **Kurvenschmiede S:** the type, the mail through `_tell`/`send_after_commit` (or the
  queue), every ADMIN.

### 11.4 For the reviews (as asked; answered in §11.5)

- **keksdose:**
  - The admin alert as your first notification mail: the unsubscribe route and page now.
  - The inbox and push words.
  - Is support chat's admin push a model to fold in, or does it stay apart?
- **kastlan:**
  - The report's company ADMINs only, or managers too.
  - The superuser left out.
  - The mail's words in four languages.
- **Kurvenschmiede:** every ADMIN; loop-filed reports silent; crashes in.

**Open for Marcel:**
1. One type (rec) or two.
2. Crashes alert, bundled (rec), or never.
3. kastlan's superuser told (rec: no).
4. The bundle window, 15 min (rec).

### 11.5 Reviews and settle (2026-10-19)

**Marcel's answers** (2026-10-19, in this session and the KS session)
1. **Open 1:** one type, `feedback_received` → §11.2 Settled 1.
2. **Open 2:** new reports and reworks mailed right away; crashes notify in the app and
   are mailed only inside a bundle where the app runs the queue (keksdose) → Settled 3.
3. **Open 3:** the superuser is not told → Settled 4.
4. **Open 4:** the 15-minute bundle, where a flush runs → Settled 3; notifications §10.4.
5. kastlan: ADMINs of the report's company only, an "ADMIN somewhere" receivability rule,
   the mail names the company, the rework alert after `apply` → Settled 4, 5, 6.
6. KS: every ADMIN, the receivable filter on read and PATCH, the loop's service built
   with `alerts=None` → Settled 4, 5.
7. No recipient in logs → Settled 7.

**Where each review point went** (each re-checked at ka 26a2eaa / kk 23c18e71 / KS 2b2bdab /
server-kit 06c0848)

| Review | Point | Where |
|---|---|---|
| kk | no admin alert today (`feedback_repository.py:90-105`, the stores, support chat's push, the 60 s poll) | §11.1 (stands) |
| kk | the unsubscribe route and page with the first notification mail, RFC 8058, `send_email` headers | Settled 9; notifications §10.2 Settled |
| kk | words fine, quiet; crash bursts make per-event mail noise | Settled 3, 6 |
| kk | support chat's admin push stays apart | Settled 6 |
| kk Marcel | in-app and push on, mail only through the bundle | **amended**: reports and reworks mailed right away, crashes bundled (Settled 3) |
| ka S | the recipient pattern is `overdue_mail.py:95-116`, not the billing notices | §11.1, Settled 4 |
| ka N | server-kit's lines moved (create :291, report_crash :321, rework :720) | §11.1 |
| ka | the company's ADMINs only, not managers (`/feedback` is ADMIN-only); "ADMIN in some company"; delivery filters; a two-company person; demo safe; an admin's own report | Settled 4 |
| ka S/B | crashes: per-user/version fingerprint, no queue in kastlan → in-app only | Settled 3 |
| ka | superuser left out (`admin_attention_service.py:91-92`) | Settled 4 |
| ka | registration, unsubscribe parts, the words in `doc_text/notifications.py`, REVIEW_PENDING | Settled 6 |
| ka S | the words name the company; the link switches company; four languages' subjects, title and body | Settled 6 |
| ka S | `email.py:127` and :153-154 log the address | Settled 7 |
| ka | the port through `FeedbackDeps`; the stores commit each write | Settled 8 |
| ka S | the rework alert after `apply` | Settled 5 |
| ka S | inline mail's 10 s per recipient: a background task, crashes in-app | Settled 3, 8 |
| ka N | alert a rework only when it lands OPEN | Settled 5 |
| KS | every ADMIN but the actor; `is_person` | Settled 4 |
| KS | the loop files through `FeedbackService.create`: build it with `alerts=None` | Settled 5 |
| KS | crashes one mail each where no bundle runs | **amended** by Marcel: no crash mail without the queue (Settled 3) |
| KS | `_tell`, `send_after_commit`, no recipient in logs | §11.1, Settled 7, 8 |
| KS | one type is enough | Settled 1 |
