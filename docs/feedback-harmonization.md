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
