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
| 9 | Round 0.38: public feedback (votes, comments, replies) | **§9 DRAFT (round 0.38)**, for server-kit 0.11 / ui-kit 0.38 | amends §3.1, §3.3, §4.4.4 (outcome → replies), §5; server-services §2.7, §4; notifications (two types) |

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

## 9. Round 0.38: public feedback (DRAFT for review)

Round 0.38 (Marcel, 2026-10-14, relayed by keksdose) opens the reports to the app's other
users: everyone signed in reads every report, says "I want this too", and comments; the
admin's answer becomes a list of replies instead of one `outcome` field. Built from a
read-only survey on 2026-10-14 (kk `f6acbc41`, ka `fe8bf78`, KS `7dc6985`, all on
`feat/kit-0.37`; server-kit 0.10.0 `2023006`; ui-kit `495d6b1`). keksdose's shape is the
model. **server-kit 0.11, ui-kit 0.38.** Draft → the three app reviews → Marcel settles →
build.

### 9.1 Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Others' reports, for a non-admin | none: `GET /feedback/my` only; the inbox is `admin_guard` (the kit's router, `router.py:215-235`; kk `adapters/api/feedback_router.py:75-87`, `require_role(ADMIN)` `:81`) | none: `/feedback`, `/feedback/{id}`, `/feedback/counts` are `ADMIN_ONLY` (`adapters/api/feedback_router.py:73`, `:86-103`); `/my-feedback` redirect `pages/feedback-page.tsx:106` | none: `visible_to` narrows a non-admin to `user_id = viewer` (`domain/services/feedback_service.py:112-122`); a foreign row is 404 (`:72`) |
| Scope of "every user" | the whole app | **one company**: `Feedback` is a `CompanyMixin` table under forced RLS (`domain/models/feedback.py:24`, `infrastructure/rls.py:65-82`), and the roles are per company, TENANT included (`domain/models/auth.py:17-21`, `:144-154`) | the whole app; roles ADMIN, MEMBER, CUSTOMER (an outside reader who may file, `adapters/api/feedback_router.py:56-60`), REVIEWER (`domain/models/user.py:41-58`) |
| The answer | `outcome` Text, one field, overwritten (`domain/models/feedback.py:72`) | `outcome` Text (`domain/models/feedback.py:56`) | `outcome` sealed, `EncryptedText` (`domain/models/feedback.py:137`) |
| Comments | `feedback_comments`, **dormant**: model kept as "RETAINED DATA", routes deleted in refactor L2-8, 14 live rows of 2026-08-11 (`domain/models/feedback.py:76-106`); created in `alembic/versions/20260430_0001_initial_schema.py:218-227` (`feedback_id` `ON DELETE CASCADE`), `user_id` nullable since `20260906_0098_feedback_anonymisable.py:56`. Still read by the export (`account_export_service.py:270-278`, `:324-327`, as `"from": "you" \| "keksdose"`), scrubbed by the erasure (`budgets_service.py:1255-1260`), reaped for demo users | **dropped**: folded into `body` as `--- COMMENT <stamp> · <First Last \| email \| user #id> ---` blocks (`alembic/versions/b4d6f8a0c2e4_feedback_fold_comments.py:1-22`, `:43-68`) | none; the conversation is `body`'s rework blocks and `outcome` |
| Titles and bodies | plain | plain | **sealed** (`EncryptedText`, `domain/models/feedback.py:122`, `:127`; `context` `EncryptedJson` `:130`): no SQL search or sort on them |
| Attachments, by key | any signed-in user who has the URL (the storage's `read` ignores the viewer) | the same | the uploader, or anyone who can see the report that links it (§3.5's accepted variation; `feedback_service.py:470-480`) |
| Votes | none | none (the only votes are owner-meeting tallies, `domain/models/owner_meeting.py:125-127`) | none |
| First names | `first_name` NOT NULL, `last_name` default `""`; **migration 0114 moved the old `display_name` whole into `first_name`** (`domain/models/user.py:51-58`) | `first_name`, `last_name`, both NOT NULL (`domain/models/auth.py:30-31`) | `first_name` NOT NULL, `last_name`; the old `display_name` moved into `first_name` (`domain/models/user.py:67-74`) |
| The loop's write path | `keksdose_feedback` login: `SELECT` on `feedback`, `UPDATE (status, outcome)`; may not read `users` (`scripts/feedback-live-setup.sh:39-41`, `:54-56`); `feedback-live-write.sh` runs a file of `UPDATE`s in one transaction, terminal status IN_EVALUATION (`:6-9`, `:18`) | none | `feedback_loop.py --resolve` writes status and outcome through `feedback_service.save` as the first admin, on the app's own login (`feedback_loop.py:244-297`) |
| A feedback notification | none (`domain/models/push_subscription.py:38-63`: nine types, no feedback one) | none (`domain/services/notification_types.py:18-22`) | `feedback_answered`, e-mail, on (`domain/models/notification.py:40`, `:48-53`), fired from `save` → `notification_service.feedback_saved` when the status crosses into an answered one (`notification_service.py:224`, `:245-272`) |
| Erasure | the kit's `erase_author`, then the comments scrubbed and nulled (`budgets_service.py:1218-1262`) | `erase_author` (`admin_user_service.py:375-377`) | `erase_author` (`erasure_service.py:423-438`) |
| Export | own reports with `outcome` and every comment on them (`account_export_service.py:268-331`) | own reports with `outcome` (`account_service.py:244`, `:294-305`) | own reports (`export_service.py:89-92`) |
| Demo | refused on writes (§3.3) | no demo users | `is_demo` accounts, refused by `not_in_the_demo` (`feedback_router.py:78`) |

The kit: `FeedbackResponse` has one `outcome` (server-kit `feedback/schemas.py:155-182`;
ui-kit `FeedbackRecord`, `src/feedback/feedback-record.ts:84-120`); `FeedbackRowDetail`'s
Outcome section is one editor (§4.4.4). ui-kit already has a conversation part,
`FeedbackThread` with `own`, `staff` and event lines (`src/feedback/feedback-thread.tsx:97-147`),
which kastlan's comment list and keksdose's support chat came from.

### 9.2 Decisions

**Marcel's five** (2026-10-14, relayed via keksdose, **to be confirmed at the settle**):

1. **Visibility: all, minus attachments.** Every report is visible to every signed-in
   user of the app: title, body, category, status, replies, comments. Never to others:
   `screenshot_url`, `attachment_urls`, `context`, `crash_fingerprint`, the author's
   address.
2. **Rating: an upvote only** ("I want this too"), one per person per report, a count,
   sortable in the admin inbox. No down-votes, no stars.
3. **Names: others by first name only**, on reports, comments and replies. The admin
   still sees the whole account.
4. **Comments by others: each its own row** (author, date, body), a thread, never folded
   into a text field. The admin can hide a comment. keksdose's `feedback_comments` is
   revived.
5. **Admin replies as a list:** each answer its own row (author, date, body, and the
   status change it made, if any), a timeline in the admin row. Each existing `outcome`
   migrates in as the first reply. keksdose's loop gets an INSERT grant on the replies
   table.

**What the code says about them** (for the settle):
- **(1) and the body.** The body is not attachment-free. A rework appends
  `[screenshot] /api/v1/feedback/attachments/<key>` lines (§3.4), and in kk and ka a key
  is the whole lock (any signed-in user may fetch a URL they hold). kastlan's folded
  headers name a person, sometimes by address (`b4d6f8a0c2e4…py:1-22`). A crash body
  carries a `User:` line with the address and the stack (kk `_crash_body`). So the public
  body is a **filtered** body (9.4), and crash reports are not public (P1).
- **(1) and kastlan.** "Every user of the app" is, in kastlan, one company's people
  under forced RLS, tenants included (9.1). See P8.
- **(1) and Kurvenschmiede's files.** KS lets anyone who can see a report read its files
  (§3.5). Once reports are public that would open them; KS narrows the file rule to the
  uploader, the author and the admin (9.10).
- **(3) and the migrated names.** kk and KS moved each old display name whole into
  `first_name` with `last_name` left empty, so `first_name` is "Anna Muster" for those
  accounts. The rule is 9.5's: the first word of `first_name` while `last_name` is empty.
- **(4) and keksdose's 14 rows.** Their export labels anyone but the author
  `"keksdose"`, so they read as the team's answers, written as comments before the
  outcome loop. Revived as they are, they show as comments by the admin (9.6; K2).
- **(5) and "the first reply".** `outcome` is overwritten in place, so only the latest
  answer of each report exists; nobody stored who wrote it or when. The migrated reply
  has no author (shown as the admin, 9.7) and the date of the row's last change.
- **(5) and the grant.** The loop's login may not read `users` (`feedback-live-setup.sh:54-56`),
  so it cannot name itself: its replies have a null author, which is fine (9.11). An
  INSERT on a `serial` key also needs `USAGE` on its sequence, and kk's timestamps are
  Python-side defaults (`domain/models/base.py:35-39`), so the replies table needs
  `server_default now()` for a raw `INSERT`.

**The open points, each with a Rec:**

- **P1. Crash reports.** **Rec: not public.** A CRASH row is diagnostics: its body is a
  stack with the reporter's `User:` line, its title an error message. It stays admin +
  author, gets no votes and no comments; replies work as on any row. A crash an admin
  re-labels to BUG becomes public from then on, with its body as it is (the admin edits
  the body first if it should not show: the admin's own call, as now).
- **P2. Notifications to the author and the commenters.** **Rec: two types**, 9.9:
  `feedback_answered` (a reply: to the author and to everyone who commented) and
  `feedback_comment` (a comment: to the author and to the earlier commenters), both on by
  default, since both fire only on a report the person wrote or commented on.
- **P3. Moderation beyond hide.** **Rec: none.** The admin hides and unhides; the
  author may delete their own comment; nobody edits a comment; no flagging, no bans, no
  locking a thread. The apps' users are invited or few; a ban is the account admin's
  deactivation, which exists.
- **P4. Account deletion.** **Rec:** the reports survive anonymised as today (§3.2); the
  person's **comments survive scrubbed** with a null author, shown as <deleted user>
  (kk already does it, `budgets_service.py:1255-1260`), so a thread keeps no hole; their
  **votes are deleted** (a vote says nothing once nobody stands behind it, and counts
  drop by one); **replies an erased admin wrote survive** with a null author and the
  body scrubbed, as a comment. 9.12.
- **P5. The export.** **Rec:** `data.feedback` gains each report's `replies` (body, date,
  status change; no author name: another person's data); `data.feedback_comments`, the
  comments the person wrote on any report (report id and title, body, date, hidden); and
  `data.feedback_votes` (report id and title, date). Others' comments on the person's
  own reports leave the export: they are others' words. 9.12.
- **P6. The demo.** **Rec: reads, never writes.** A demo sees the public list and the
  threads (the GET routes are served, server-services §2.8), and gets 403 `demo_refused`
  on a vote and a comment, as on a report. KS's demo accounts are kept out of lists of
  people (`user.py:128-130`), and a demo cannot write, so no demo name shows.
- **P7. Rate limits.** **Rec:** comments 20 per hour per user (the crash window's
  number); votes 60 per hour per user (a vote and its undo are two); 429 with
  `Retry-After`, charged before the work (§2.11). A comment's body 1–4 000 characters
  after trimming, plain text, no files.
- **P8. Switching the public parts off.** **Rec: one switch per app, `public`, on in
  keksdose and Kurvenschmiede, off in kastlan at first.** Off, the public routes are not
  mounted, the menu has no public list, and votes and comments do not exist; **replies
  are not public parts** and ship everywhere. kastlan's reports are about one company's
  property management, read by the company's staff and its tenants; whether a tenant
  should read a manager's reports, and whether a company wants it at all, is kastlan's
  question (A1). On in kastlan, "every user" is the acting company's people (RLS), and
  the Rec is staff only (`ALL_EMPLOYEES`, no TENANT).
- **P9. The author's vote.** **Rec: the report is the author's vote.** Filing a report
  inserts the author's vote row; their button shows "voted" and is disabled ("Your
  report"); they cannot withdraw it. So the count reads "people who want this", 1 on a
  new report, and a vote by the author never doubles it. Existing reports are backfilled
  with one vote by their author where `user_id` is set.

### 9.3 The report: the public view and the admin view

Three views of one report, by who reads it:

| Field | Admin (inbox) | Author (`/my`) | Anyone else (public) |
|---|---|---|---|
| `id`, `title`, `category`, `status`, `created_at`, `updated_at`, `resolved_at` | ✓ | ✓ | ✓ |
| `body` | as stored | as stored | **public body** (9.4) |
| `user_id` | ✓ | ✓ | — |
| `user_email` | ✓ | — | — |
| `author_name` (new) | the full name (`full_name`, reader's order) | their own full name | **first name** (9.5); `null` = erased |
| `mine` (new) | ✓ | `true` | ✓ |
| `context`, `screenshot_url`, `attachment_urls` | ✓ | ✓ | — |
| `votes`, `voted` (new) | ✓ | ✓ | ✓ |
| `comment_count` (new) | ✓, hidden ones included | visible ones | visible ones |
| `replies` (new) | ✓ (9.7) | ✓ | ✓ |
| `outcome` | ✓, deprecated (9.7) | ✓, deprecated | — |

- The admin and author views are `FeedbackResponse` with the new fields;
  **`FeedbackPublicResponse` is a separate model**, not the same model with nulls, so a
  field added to `FeedbackResponse` later never leaks into the public list by default.
  `crash_fingerprint` is in neither view (it never was on the wire).
- An admin reading the public list gets the public view too: the page is the users'
  page, and an admin who wants the files opens the row in the inbox.
- A public row is never a CRASH (P1); the public list filters on it, and the public
  thread routes answer 404 for a CRASH row to anyone but its author and an admin.

### 9.4 The public body

`public_body(body) -> str` (server-kit, layer 1), applied by the server, never the
client:
- drops every `[screenshot] <url>` line (§3.4's pattern), so no key leaves;
- rewrites kastlan's folded headers `--- COMMENT <stamp> · <name> ---` to
  `--- COMMENT <stamp> ---`: the name may be an address;
- keeps the `--- REWORK <stamp> ---` lines and the notes: the author's own words, and
  the client's rework chip reads them.

### 9.5 Names

`first_name_of(first, last) -> str | None` (server-kit, beside `full_name`): `first`
trimmed; **when `last` is empty, only the first word of `first`**, so an account whose
old display name moved whole into `first_name` (kk 0114, KS) shows "Anna", not "Anna
Muster"; `None` when nothing is left. CJK: a name in CJK script with no `last` is shown
whole (no space to split on), which may be a full name; KS has seven languages and zh
among them (K-questions). Others are named this way on reports, comments and replies; the
admin sees `full_name` and the address, as today. A name is the server's: the client
never builds one from an id.

### 9.6 Votes

Table `feedback_votes (feedback_id FK ON DELETE CASCADE, user_id FK ON DELETE CASCADE,
created_at, PRIMARY KEY (feedback_id, user_id))`; in kastlan a `CompanyMixin` table.

- **`votes`**: the count of rows; **`voted`**: whether the viewer has one. Both on every
  view (9.3). The author's row is written with the report (P9).
- **A vote is idempotent**: `PUT` twice is one row, `DELETE` with none is a 204. A vote
  on a CRASH row is 404 (P1); on the author's own report, `DELETE` is 409 "Your report
  counts as your vote".
- **Votes on any status**: a DONE or WONT_DO report may still be wanted.
- **The sort:** the inbox gains a sortable **Votes** column (client-side, as every
  column); the public list sorts by `sort=newest` (default) or `sort=votes` (most, then
  newest), on the server, since it pages (9.8).

### 9.7 Replies

Table `feedback_replies (id, feedback_id FK ON DELETE CASCADE, author_id FK users
nullable, body Text NOT NULL, status_from nullable, status_to nullable, created_at
server_default now())`; KS seals `body`; kastlan's is a `CompanyMixin` table.

```jsonc
// FeedbackReplyResponse
{ "id": 31, "author_name": "Marcel",   // first name for the public, full name for an admin; null = no author
  "body": "Fixed in 0.4.27.", "status_to": "IN_EVALUATION",  // null: no status change
  "created_at": "2026-10-14T09:12:00Z" }
// FeedbackReplyCreate (admin only)
{ "body": "…", "status": "IN_EVALUATION" }   // body 1–8000 trimmed; status optional
```

- **Who writes:** an admin (`POST /feedback/{id}/replies`), and the loop (9.11). A
  reply with `status` moves the report through `plan_update` (the same `resolved_at`
  rule) and records `status_from`/`status_to`; a status `PATCH` alone writes no reply.
  The response shows `status_to` only; `status_from` is for the admin's timeline.
- **Null author:** the loop, a migrated outcome, or an erased admin. Shown as the app's
  word for its admin ("Admin" / "Admin"), never "the team" (§3.3).
- **No edit, no delete** in the API: a correction is a new reply. (An admin may fix a
  typo in the database, as with any row.)
- **The outcome migration** (each app, one Alembic step): one reply per row whose
  `outcome` is not blank: `body = outcome`, `author_id = NULL`, `status_to = NULL`,
  `created_at = coalesce(resolved_at, updated_at)`. KS seals the copy under the same
  key. kastlan runs it under `SET LOCAL app.bypass_rls` and copies `company_id`.
- **`outcome` stays one release, read-only**: the API answers it as the newest reply's
  body (so an old client still shows an answer); `PATCH {outcome}` is a 422 from 0.11.
  The column is dropped in the release after, with the loop's `UPDATE` grant on it
  (9.11).
- **Rework** is unchanged: the author's note is appended to the body (§3.4), not a reply
  or a comment, and it still reopens the row.

### 9.8 Comments

Table `feedback_comments (id, feedback_id FK ON DELETE CASCADE, user_id FK nullable,
body Text NOT NULL, created_at, updated_at, hidden_at nullable, hidden_by FK nullable)`:
keksdose's table plus the two hide columns; KS seals `body`; kastlan's is a
`CompanyMixin` table.

```jsonc
// FeedbackCommentResponse
{ "id": 9, "author_name": "Anna", "mine": false, "staff": false,
  "body": "Same here on the iPad.",          // null when hidden, for everyone but its author and an admin
  "hidden": false, "created_at": "…" }
// FeedbackCommentCreate
{ "body": "…" }                              // 1–4000 after trimming; plain text, no files
```

- **Who comments:** any signed-in user who sees the report, its author included, on any
  status, but not a demo (P6) and not on a CRASH row (P1). A comment never changes the
  status (a rework does that).
- **An admin's post on a public thread is a reply** (9.7), not a comment, so the
  answer is in one place. `staff` is `true` only on keksdose's revived rows whose writer
  is an admin (K2).
- **Hide:** `PATCH /feedback/{id}/comments/{comment_id} {"hidden": true|false}`, admin
  only. Hidden: others see the line "Hidden by an admin" with no body and no name; the
  writer sees their text with that line; the admin sees it struck through with
  **Unhide**. A hidden comment still counts for its writer's export and erasure.
- **Delete:** the writer's own, `DELETE /feedback/{id}/comments/{comment_id}`, a hard
  delete; an admin hides instead.
- **Order:** oldest first; the thread merges replies and comments by `created_at`.

### 9.9 Endpoints

keksdose's names (`list_*`, `create_*`; kk's deleted comment routes were
`/feedback/{id}/comments`), under `/api/v1`, bearer auth, the app's demo guard on every
write:

| Method + path | Name | Who | Answer |
|---|---|---|---|
| `GET /feedback/public?sort=&status_filter=&category=&limit=&offset=` | `list_public` | any signed-in user (public on) | `FeedbackPublicResponse[]`, no CRASH |
| `GET /feedback/{feedback_id}/comments` | `list_comments` | anyone who may see the report | `FeedbackCommentResponse[]` |
| `POST /feedback/{feedback_id}/comments` | `create_comment` | the same (public on); not a demo | 201 `FeedbackCommentResponse` |
| `PATCH /feedback/{feedback_id}/comments/{comment_id}` | `hide_comment` | admin | `FeedbackCommentResponse` |
| `DELETE /feedback/{feedback_id}/comments/{comment_id}` | `delete_comment` | the writer | 204 |
| `PUT /feedback/{feedback_id}/vote` | `vote` | anyone who may see the report (public on); not a demo | `{ "votes": 4, "voted": true }` |
| `DELETE /feedback/{feedback_id}/vote` | `unvote` | the same; not the author | `{ "votes": 3, "voted": false }` |
| `POST /feedback/{feedback_id}/replies` | `create_reply` | admin | 201 `FeedbackResponse` (the report, its `replies` included) |

- **Replies ride on the report** (`replies` on every view, oldest first): a report has
  few, and the admin row, `/my` and the public row show them at once. Comments are
  fetched when a thread opens, since they may be many.
- `GET /feedback` and `GET /feedback/my` keep their shapes, plus the new fields (9.3).
- "Who may see the report" is: an admin; its author; anyone else when public is on and
  it is no CRASH. Otherwise 404 "Feedback not found", whatever the app's `foreign_row`.
- Routes added, none renamed; kk's `openapi-schema.d.ts` gains them.

### 9.10 Privacy rules

What leaves for a non-admin about a report that is not theirs, exactly: `id`, `title`,
the public body (9.4), `category`, `status`, `created_at`, `updated_at`,
`resolved_at`, `author_name` (first name), `mine`, `votes`, `voted`, `comment_count`,
and the replies (`author_name` first name, `body`, `status_to`, `created_at`). Per
comment: `author_name` (first name), `mine`, `staff`, `body` (none when hidden),
`hidden`, `created_at`. **Never:** user ids, addresses, last names, `context`, any
attachment URL or key (the columns and the body's file lines), `crash_fingerprint`,
`hidden_by`, `status_from`, who voted.

- **The files stay the author's and the admin's.** kk and ka serve a key to any
  signed-in user; that stays safe only because no key reaches anyone else (above). KS's
  "anyone who can see the report that links it" narrows to the uploader, the author and
  an admin.
- **Mail and push carry no content** (notifications §2.8): no title, no body, no
  comment. KS seals all three.
- **The redaction** of ui-kit's thread (`data-private`, `feedback-thread.tsx`, "Redaction")
  covers comment and reply bodies and names, as it does now.

### 9.11 Notifications

Two types, declared by each app in its registry (notifications §2.1). The words move into
the kit, since all three declare them (the `DateFormatSetting` rule):

| Type | Fires on | To | Default | Quiet |
|---|---|---|---|---|
| `feedback_answered` | a reply (9.7), from the admin or the loop | the author and every earlier commenter, never the reply's writer; not a deactivated or erased account | on | true |
| `feedback_comment` | a visible comment (9.8) | the author and the earlier commenters, never the comment's writer | on | true |

- Both are on by §2.1's rule: they fire only on a report the person wrote or commented
  on, their own act. Voters are not told (P2).
- **KS's `feedback_answered` changes its trigger** from "the status crosses into an
  answered one" (`notification_service.py:224`) to "a reply". A status change with no
  reply is no answer; a reply on an answered row is one.
- Channels: kk `app` (inbox + push), ka `app` (its poller, until push) and e-mail, KS
  e-mail. The mail says "Your report has an answer" / "New comment on a report you
  follow", names the report by number and links `?row=<id>`.
- **Hidden later** does not unsend. A comment hidden within a minute of posting has
  usually been sent already; accepted.
- **The loop's replies** are written by raw SQL in kk (9.13), so no app code runs:
  kk's jobs runner sends `feedback_answered` for replies with `notified_at IS NULL`
  (a column on `feedback_replies`, set by the app's own writes at once). K3.
- Sent after the commit (notifications §9.2.4, way (ii) or (iii)).

### 9.12 Erasure and export

**Erasure** (`FeedbackService.erase_author` grows; the app calls it as today):
1. the reports, as now (§3.2, server-services §2.15);
2. **comments** by the person: body `scrub_text`'d with the identifiers, `user_id`
   NULL, `hidden_by` NULL where it was them; kept (P4);
3. **votes** by the person: deleted (P4);
4. **replies** by the person: `author_id` NULL, body scrubbed.
`ErasedFeedback` gains `comments`, `votes`, `replies` counts. kk's own scrub
(`budgets_service.py:1255-1260`) goes into the kit's.

**Export** (P5): `data.feedback[]` gains `replies: [{ body, status, created_at }]` and
`votes` (the count); `data.feedback_comments: [{ report, title, body, hidden,
created_at }]` and `data.feedback_votes: [{ report, title, created_at }]`, oldest first;
`title` is the public title of the report (another person's report may be erased later;
the export is a snapshot). keksdose's `comments` key with `"from": "you" | "keksdose"`
goes. Others' comments on the person's reports are not exported (user-admin §6.5,
"others' data").

### 9.13 keksdose's loop write path

The loop answers with a reply, not an `outcome`:

```sql
BEGIN;
INSERT INTO feedback_replies (feedback_id, body, status_from, status_to)
  SELECT id, $$…$$, status, 'IN_EVALUATION' FROM feedback WHERE id = 412;
UPDATE feedback SET status = 'IN_EVALUATION' WHERE id = 412;
COMMIT;   -- feedback-live-write.sh runs the file with psql -1
```

Grants for `keksdose_feedback` (`feedback-live-setup.sh:39-41`, re-run as `keksdose_owner`):
- **may:** `SELECT` on `feedback`, `feedback_replies` and `feedback_comments` (the
  context of a run; no names in either); `INSERT (feedback_id, body, status_from,
  status_to)` on `feedback_replies`; `USAGE` on `feedback_replies_id_seq`;
  `UPDATE (status)` on `feedback`;
- **may not:** read `users`, `feedback_votes` (who voted) or anything else (step 4's
  check stays); set `author_id`, `created_at` or `notified_at` (column-level grant: the
  defaults fill them, so a loop reply is always "Admin" and always queued for notice);
  update or delete a reply; write a comment or hide one; set `resolved_at` (it sets
  IN_EVALUATION only; DONE stays Marcel's);
- **after the outcome column goes** (9.7), `UPDATE (outcome)` goes with it; for the one
  release in between the loop writes no outcome.

The foreign key to `users` needs no grant: Postgres checks it as the table's owner.

### 9.14 What server-kit 0.11 ships

**Layer 1** (`eifi1_server_kit.feedback`, additive):
- schemas: `FeedbackPublicResponse`, `FeedbackReplyCreate`, `FeedbackReplyResponse`,
  `FeedbackCommentCreate`, `FeedbackCommentResponse`, `FeedbackCommentHide`,
  `FeedbackVoteResponse`; `FeedbackResponse` gains `author_name`, `mine`, `votes`,
  `voted`, `comment_count`, `replies` (optional, so an app on 0.10's row still
  validates);
- rules: `public_body`, `first_name_of` (in `auth.accounts` beside `full_name`),
  `is_public(row)` (not CRASH), `plan_reply(status, new_status, *, now)` on
  `plan_update`'s status lane, `COMMENT_MAX` 4 000, `REPLY_MAX` 8 000;
- erasure: `scrub_comment`, and the counts on `ErasedFeedback`.

**Layer 2** (`feedback.ports`, `.service`, `.router`):
- ports, **separate**, so an app with public off implements only replies:
  `FeedbackReplyStore` (`for_reports(ids)`, `add`, `by_author`, `apply`),
  `FeedbackCommentStore` (`for_report(id, *, viewer)`, `counts(ids, *, viewer)`, `add`,
  `get`, `apply`, `delete`, `by_author`), `FeedbackVoteStore` (`counts(ids, *, viewer)`
  → `(votes, voted)`, `put`, `delete`, `delete_by_author`), and `PeopleLookup`
  (`names(user_ids) -> Mapping[int, (first, last)]`, the one read of `users`);
  `FeedbackRepository` gains `public(sort, status, category, limit, offset)`;
- service: `list_public`, `comments`, `comment`, `hide_comment`, `delete_comment`,
  `vote`, `unvote`, `reply`; the inbox, `/my` and `get` fill the new fields in one query
  per store, not per row;
- **one write per request** (server-services §2.7) becomes **one write per store, the
  report last**: `reply` with a status adds the reply, then applies the row; a create
  adds the report, then the author's vote;
- router: the eight routes of 9.9, the app's demo guard on each write, the admin guard
  on hide and reply; `FeedbackDeps` gains `public: bool = False`, `replies`, `comments`,
  `votes`, `people` (dependencies), `comment_limiter`/`vote_limiter` on
  `FeedbackLimiters`. Public off: the public, vote and comment routes are not mounted;
- **where an app reacts** stays the adapter (server-services §2.16): the notification
  types fire in the stores' `add`, which see the actor;
- `testing`: fakes for the three stores and the lookup, and a privacy check
  (`assert_public_view`) that walks every public answer for a key outside 9.10's list.

Size: **M** (~550 code, ~900 test lines).

### 9.15 What ui-kit 0.38 ships

- types: `FeedbackRecord` gains `author_name`, `mine`, `votes`, `voted`,
  `comment_count`, `replies?: FeedbackReply[]`; `FeedbackPublicRecord`;
  `FeedbackComment`, `FeedbackReply`;
- **`FeedbackVoteButton`** (`ThumbsUp`, the count, `aria-pressed`; "I want this too" /
  "Will ich auch"; disabled with "Your report" / "Ihr Bericht" on one's own), optimistic
  with rollback;
- **`FeedbackPublicList`**: the page for `/all-feedback` (the name is P-question M5):
  `DataTable` with #, Date, Category, Subject (+ rework chip), Votes, Status, the sort
  toggle **Newest / Most wanted**, the phone cards; the row expands to
  `FeedbackPublicDetail`: the public body, the replies, the comment thread, the vote;
- **`FeedbackCommentThread`** on `FeedbackThread`: replies with the `staff` look,
  comments with `own`, the hidden line, **Hide / Unhide** for an admin, **Delete** for
  the writer (with confirm), the composer (1–4 000, no files);
- **`FeedbackReplyTimeline`** replaces `FeedbackRowDetail`'s Outcome section (§4.4.4):
  the replies oldest first, each with name, date and a "→ {status}" chip, and the admin's
  composer with an optional status pick (`selectableFeedbackStatuses`), **Reply** /
  **Antworten**. The `Resolved: {date}`, Rework and Open-page buttons stay where they
  are. `/my-feedback` shows the timeline read-only and the comments;
- `feedbackColumns` gains **Votes** (sortable; hidden on the phone, a count chip on the
  card); `FeedbackMenu` gains **All feedback** above the list link when the app passes
  `publicHref`;
- labels in seven languages (`feedbackPublic`, `feedbackComments`, `feedbackReplies`,
  `feedbackVote`), and the two notification types' words.

Size: **M**.

### 9.16 Per app

- **keksdose (canon), M:** migrations: `feedback_replies` (+ `notified_at`), the outcome
  copy, `feedback_votes` + the author backfill, `feedback_comments` + `hidden_at`,
  `hidden_by` (the 14 rows stay; K2); the three stores and `PeopleLookup`;
  `public=True`; the two types in `NOTIFICATION_TYPES` and the job for loop replies;
  the export (P5) and the erasure (its scrub moves into the kit); the loop's grants and
  its SQL template (9.13) and the agent prompt; the page and the menu entry.
- **kastlan, S–M:** the three tables as `CompanyMixin` with forced RLS; the outcome
  copy under bypass; the stores; `public` per A1 (off: replies only); if on, the public
  routes behind a staff check; the two types (`app` + e-mail); export and erasure.
- **Kurvenschmiede, M:** the three tables, comment and reply bodies sealed; the outcome
  copy sealed; the stores and `PeopleLookup` (no demo or system account named);
  `public=True`; the attachment rule narrowed (9.10); `feedback_answered` moves to "a
  reply", `feedback_comment` added, both in seven languages; `--resolve` writes a reply
  through the kit's service; export and erasure.

### 9.17 For the reviews

**keksdose:**
- K1. Is 9.13's grant enough for the loop (it reads comments for context; it writes
  `status` and a reply), and should `feedback-live-read.sh` show the replies and
  comments?
- K2. Who wrote the 14 `feedback_comments` rows of 2026-08-11 (the admin, or the
  authors)? Shown as comments (with `staff` where an admin wrote them), or moved into
  replies by the migration?
- K3. The loop replies' notice: a `notified_at` queue in the jobs runner, or no notice
  for loop replies (the author sees the answer on the next visit)?
- K4. The menu: `/all-feedback` beside the support chat and the assistant, or the
  public list as the non-admin's default list with "My feedback" as a filter?

**kastlan:**
- A1. Public on or off? If on: staff only (no TENANT), per company as RLS gives?
- A2. Does any page read `outcome` outside the feedback page (overview tiles, activity
  feed)?
- A3. kastlan's folded `--- COMMENT … ---` blocks: keep them in the body (9.4 hides the
  names), or split them back out into comment rows now that comments return?

**Kurvenschmiede:**
- B1. Do CUSTOMERs (outside readers) read and comment on public reports, or members
  only?
- B2. `feedback_answered` on "a reply" instead of "a status crossing": agreed?
- B3. The first-name rule for a zh name with an empty `last_name` (9.5).
- B4. Sealed comment and reply bodies: any cost in decrypting a page of public rows
  and their counts?

**Open for Marcel** (beside confirming the five):
- M1. P1 crash reports not public; M2. P9 the report is the author's vote (the count
  starts at 1); M3. P8 kastlan off at first; M4. P4 comments survive an erasure
  scrubbed, votes go; M5. the public page's path and name (`/all-feedback`, "All
  feedback" / "Alle Rückmeldungen"); M6. `outcome` read-only for one release, then
  dropped.
