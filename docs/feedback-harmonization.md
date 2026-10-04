# Feedback across the kit and the three apps — harmonisation plan

Status: **2026-10-04**, led from ui-kit at Marcel's request. Built from a read-only
survey of each app's working tree (keksdose `main`, kastlan `fix/stale-shell-locales`,
Kurvenschmiede `feat/segment-list-inline-on-phones`). Marcel's decisions are in §2.
Everything after them follows the same pattern as the language round
([i18n-harmonization.md](i18n-harmonization.md)): **one contract + kit parts**. The
contract is keksdose's, read off its code; the kit owns every visible word and every
part that three apps were building separately; each app keeps its data, API client,
auth and routes. The points the draft left open are settled in §7, which states the
final canon: **keksdose is the source** (Marcel, 2026-10-04, via keksdose's session) —
where the kit had made its own calls it went back to keksdose's behaviour, except for
Marcel's own decisions and keksdose's real defects, which the kit fixes (§7, end).

Paths below are relative to each repo: **kk** = keksdose, **ka** = kastlan,
**KS** = Kurvenschmiede.

## 1. Where each one stands

| | keksdose | kastlan | Kurvenschmiede | ui-kit (0.26) |
|---|---|---|---|---|
| Statuses | 7 | **5** (no NEEDS_LIVE_TEST, POSTPONED), PG enum | 7, VARCHAR(20) | `FeedbackStatus` (7) + `FEEDBACK_STATUS_META` |
| Categories | CRASH BUG IDEA QUESTION OTHER | **no CRASH** | CRASH BUG IDEA QUESTION OTHER | `FeedbackCategory` (5) |
| Status/category labels | app (`STATUS_LABEL`, "the package has no translations") | app | app | **none** |
| DE labels that differ | In Bearbeitung, Zur Prüfung, Live testen | In Bearbeitung, Zur Prüfung | **In Arbeit, In Prüfung, Test auf der Live-Umgebung** | — |
| Create | JSON, two-step upload | JSON, two-step upload | **multipart, one step** | — |
| Reporter context | `context` JSON (10 keys) | `context` JSON (6 keys, no email/version) | **`page_path` + `user_agent` columns** | — |
| Attachments | screenshot + ≤5 files, png/jpeg/webp/gif/pdf/txt, 10 MB | **1 image**, 10 MB | list in own table (bytes in DB), **4 MB, images only** | field supports `multiple`, 5, 10 MB |
| Body | optional | **required** | optional | `requireBody` |
| Conversation | outcome + rework (body append, server reopens) | outcome + rework (client sends `status: OPEN`) + **comment thread** | outcome + `note` (server appends) + **author "done"** | Thread/Composer (support chat uses them) |
| Author edit while OPEN/IN_PROGRESS | yes | yes | **no** | — |
| Crash auto-filing | `POST /feedback/crash`, fingerprint dedupe | **none** | **none** (docs say yes) | `ErrorBoundary onReport` |
| Routes | `/feedback` (admin) + `/my-feedback` | same | **`/feedback` for both** | — |
| Deep link | `?row=` | `?row=` | **`?report=`** | `useSearchParamState` |
| Undo on status change | yes (8 s toast) | no | no | — |
| Phone swipes | advance / Done / Won't do, rebindable | no | no | `DataTable mobileSwipeActions` |
| Lists | plain array | **`PaginatedResponse`** (client asks `limit=500`) | plain array, **one endpoint for both audiences** | — |

## 2. Decisions (Marcel, 2026-10-04)

1. **All 7 statuses everywhere**: OPEN, IN_PROGRESS, IN_EVALUATION, NEEDS_LIVE_TEST,
   POSTPONED, DONE, WONT_DO — kastlan's backend adds the two it lacks. **Categories**
   CRASH, BUG, IDEA, QUESTION, OTHER; CRASH is filed automatically and never pickable.
2. **One conversation model**: the team writes an **outcome**; the submitter can send
   an answered item back for **rework** (a note and at most one file; the server
   reopens it).
   kastlan's comment thread goes. keksdose's support chat stays keksdose-only and is
   out of scope (it keeps using the kit's `FeedbackThread` / `FeedbackComposer`).
3. **Routes**: `/feedback` (admin inbox) + `/my-feedback` (the user's own).
   Kurvenschmiede splits its single page.
4. **Canon = keksdose's wording and behaviour**, owned by the kit in all 7 languages —
   except the submit button says **"Send"** (keksdose: "Save") and the dialog's body
   field asks **"What happened? (optional)"** (keksdose: "Description (optional)").
   Multiple attachments + screenshot capture, crash auto-filing, Undo on status changes
   (swipes included), phone swipes on the inbox. Where the kit's draft had made its own
   calls, keksdose's behaviour wins (§7).

## 3. The API contract (A)

Derived from kk `backend/keksdose/adapters/api/feedback_router.py`,
`domain/schemas/feedback.py`, `domain/models/feedback.py`,
`domain/services/feedback_service.py`, `adapters/api/upload_guards.py`, and the client
in kk `frontend/src/shared/api/endpoints.ts` (`feedbackApi`). All paths under
`/api/v1`, bearer auth on every route, JSON unless stated.

### 3.1 The resource

`FeedbackResponse` (kk `schemas/feedback.py:117`):

```jsonc
{
  "id": 412,
  "user_id": 7,                 // null = the author's account was erased (kk live #275)
  "user_email": "a@b.ch",       // admin list only (joined); null on /my, create, update
  "title": "Chart jumps on save",
  "body": "…",                  // "" when none; rework rounds are appended here (§3.4)
  "category": "BUG",            // CRASH | BUG | IDEA | QUESTION | OTHER
  "status": "OPEN",             // the 7 of §2.1
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
  anchored on `^---\s*REWORK\b` so kastlan's folded `--- COMMENT … ---` blocks (§7.7)
  never count.
- Storage (recommended, not wire): the same column names in all three
  (`feedback.title, body, category, status, context, screenshot_url, attachment_urls,
  outcome, resolved_at, crash_fingerprint`), so the outcome-writing loop tools
  (kk `scripts/feedback-live-*.sh`, KS `backend/kurvenschmiede/feedback_loop.py`) and
  one agent prompt work on every repo.

### 3.2 The `context` object

Written by the dialog (kk `features/feedback/use-feedback-dialog.tsx:105`) — every key
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
caps the object's size, so a client cannot file in someone else's name.

Crash rows add (server-written, kk `feedback_service.py:346`): `fingerprint`,
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
behind the app".

App-specific:

- **keksdose** demo sessions: `POST /feedback` → 403 `Demo sessions cannot submit
  feedback`, `POST /feedback/attachments` → 403 (`upload_guards.refuse_demo`),
  `POST /feedback/crash` → 202 `stored: false`. kastlan has no demo users.
- **kastlan**: `GET /feedback` and `GET /feedback/my` return plain arrays (§7.5); its
  admin-only reach also covers `GET /feedback/{id}`, `GET /feedback/counts`, the
  overview tiles and the activity feed's "Feedback #x submitted" items (all app-side).

Not in the contract: `GET /feedback/{id}` (keksdose has none; kastlan's admin-only one
may stay as an app extension, the kit never calls it), kastlan's `GET /feedback/counts`
(app extension for its overview tiles), Kurvenschmiede's `GET /feedback/categories`
(the kit carries the limits), and every comments route.

### 3.4 Writes

**Create** — `FeedbackCreate` (kk `schemas/feedback.py:25`):

| Field | Rule |
|---|---|
| `title` | 1–255 chars, not blank |
| `body` | optional, default `""`; whitespace-only is stored as `""` |
| `category` | default `OTHER`; **`CRASH` → 422** for everyone (kk `_reject_manual_crash`) |
| `context` | object or null (§3.2) |
| `screenshot_url` | the captured screenshot's upload URL, or null; **MUST** match the app's own attachment URL pattern, like `attachment_urls` — the kit fetches it with the bearer token, so a foreign absolute URL would send the token off-origin. keksdose today leaves it an unvalidated `String(500)` (kk `schemas/feedback.py:33-36`) → required backend fix |
| `attachment_urls` | ≤ 5, each must match the app's own attachment URL pattern, deduplicated, order kept |

The client uploads every file **before** the create, so a row never names a file that
did not arrive (kk `use-feedback-dialog.tsx:89`).

**Update** — `PATCH /feedback/{id}` with any of `status`, `title`, `body`, `category`,
`outcome` (kk `schemas/feedback.py:83`). Rules (kk `feedback_service.update_feedback`):

- **None means "not sent"**: an explicit `null` for `status`, `title`, `body` or
  `category` → 422; `outcome: null` clears the outcome (a real edit).
- **ADMIN**: any field, any status jump, any time. This is the status change and the
  outcome editor.
- **Author edit**: `title` / `body` / `category` only, and only while the row is OPEN or
  IN_PROGRESS. Anything else → 403 naming the reason.
- **Rework** (admin or the author — anyone else gets the 403 above before the append
  is even looked at): a PATCH whose only field is `body` and whose new body strictly
  extends the old one is an append. On a row outside OPEN / IN_PROGRESS the **server**
  sets `status = OPEN` (kk `_is_rework_append`, live #331). The client never sends a
  status with it. The appended shape is fixed:

  ```text
  <old body>\n\n--- REWORK 2026-10-04 09:12 ---\n<note>\n[screenshot] /api/v1/feedback/attachments/<key>
  ```

  - the stamp is **UTC**, `YYYY-MM-DD HH:MM`
    (`new Date().toISOString().slice(0, 16).replace("T", " ")`, kk `feedback-page.tsx:351`);
  - the note is **required** and trimmed — a file alone cannot be sent (kk `:577`);
  - **one file per rework** (kk `submitRework(note, file?)`, `:350`), so at most one
    `[screenshot] <url>` line (kk `body-attachments.ts` `attachmentLine`; the marker
    covers pdf/txt too despite its name);
  - `\n\n` is left out when the old body is `""`.

  Reading it back: the rework count anchors on `^---\s*REWORK\b` (whole line), so
  kastlan's folded `--- COMMENT <YYYY-MM-DD HH:MM> · <name> ---` blocks (§7.7) never
  count; the file line is `^\[screenshot\]\s+(/api/v1/feedback/attachments/[\w.-]+)\s*$`.
  Keys are opaque (§3.5), so no helper assumes `[a-f0-9]{12}`. Reworkable statuses:
  IN_EVALUATION, NEEDS_LIVE_TEST, POSTPONED, DONE, WONT_DO.
- **`resolved_at`**: stamped only on a real transition **into** DONE/WONT_DO (a DONE→DONE
  re-PATCH keeps the date), cleared on leaving them (kk `update_feedback`, feedback #96).
- **Re-labelling to CRASH** → 422; CRASH → BUG stays an ordinary admin update.

### 3.5 Attachments

From kk `upload_guards.py:197` and `store_attachment_bytes`:

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
- Throttle: 20 uploads / hour / user → 429 with `Retry-After` (kk `throttle_attachment`).
  App-specific: keksdose's window is **shared with support-chat uploads**
  (`upload_guards._attachment_limiter`) and charged **before** the type/size checks, so a
  refused file uses a slot — and one full report is up to 6 uploads. kastlan adds the
  same in-process limiter (20 uploads/h, 20 crashes/h per user); Kurvenschmiede's are
  per process (2 uvicorn workers → effectively 40/h). Recommended for all: charge after
  validation.

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
fingerprint characters, shown in the fallback so a user can quote it. keksdose's limiter
is hit **before** the dedupe, so duplicates count too and `occurrences` stops rising
after 20 in an hour — recommended for all: charge after the dedupe.

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
| 422 | CRASH set by hand; explicit null on a NOT NULL field; blank title; an `attachment_urls` or `screenshot_url` entry that is not the app's own (keksdose checks only `attachment_urls` today, §3.4) |
| 429 | upload throttle (`Retry-After`) |

The kit only toasts `detail`, so an app may answer a foreign row with 404 rather than
403 (Kurvenschmiede does, below) without the client noticing.

### 3.8 What kastlan and Kurvenschmiede change

| Contract point | kastlan today | Kurvenschmiede today |
|---|---|---|
| 7 statuses | 5 in a PG enum → `ALTER TYPE feedbackstatus ADD VALUE` ×2 | has 7 |
| CRASH category | missing → add to `feedbackcategory` (before `BUG`, as kk migration 0050) + manual-CRASH 422 | has it, unused |
| `context` JSON | has it; client sends 6 keys, `user_email: null` | **`page_path` + `user_agent` columns** → `context` (migrate `page_path` → `route`, `user_agent` → `ua`), drop the columns |
| Create shape | JSON ✓; `body` required → optional | **multipart** → JSON + two-step upload |
| Attachments | 1 `screenshot_url`, images only → add `attachment_urls` JSON, pdf/txt, decode check, non-image `attachment` disposition | **bytes in `feedback_attachment`** → served at `/feedback/attachments/{key}`, `screenshot_url` + `attachment_urls` on the row, pdf/txt, 4 → 10 MB |
| Rework | author sends `status: OPEN` + body → server-side append detection, admin or author | `note` field → body append with `--- REWORK <stamp> ---`, author edit while OPEN/IN_PROGRESS added, author `DONE` verdict removed (§7) |
| `resolved_at` | stamped on every DONE/WONT_DO write, never cleared → enter/leave rule | already right (`stamp_settlement`) |
| Lists | `PaginatedResponse` → plain arrays (§7.5); MANAGER may list all → own items only (§7.6) | one `GET /feedback` for both audiences → split into `GET /feedback` (ADMIN, 403 otherwise) + `GET /feedback/my` |
| Response fields | `user_name` extra; no `attachment_urls` | `author_name`/`author_email`/`is_mine`/`page_path`/`user_agent`/`attachments[]` → contract fields; `outcome ""` → `null`; title cap 200 → 255 |
| `screenshot_url` check | images only, URL unchecked → own pattern (MUST) | derived from its rows → own pattern |
| Crash | none → endpoint + `crash_fingerprint` column + limiter | none → same |
| Limiters | none → in-process, 20 uploads/h and 20 crashes/h per user | per process (see below) |
| Comments | `feedback_comments` + 2 routes → folded into the body as `--- COMMENT <YYYY-MM-DD HH:MM> · <name> ---` blocks, then dropped (§7.7; 0 rows in prod and dev, the fold ships anyway) | — |
| Demo users / erasure | neither | — |
| Goes entirely | comments routes | `note`, `GET /feedback/categories`, `POST`/`GET /feedback/{id}/attachments` |

**Accepted Kurvenschmiede deviations** — app-side, invisible to the client:

- an attachment is readable by its uploader and by anyone who can see the report that
  links it; anything else is a 404;
- the content key is an HMAC-SHA256 under the data key, same `[a-f0-9]{12}.<ext>` shape;
- a foreign report answers 404 (indistinguishable from a missing one), a rule break on
  one's own report 403;
- the type is detected from the bytes (magic numbers; pdf `%PDF-`, txt = UTF-8 without
  NUL) → 400/415, and the stored type is the detected one;
- the server overwrites `user_id` / `user_email` / `user_display_name` in `context` from
  the session and caps its size (recommended for all three, §3.2);
- `screenshot_url` / `attachment_urls` are derived from attachment rows (kind
  `screenshot` | `file` | `rework`), so old rows may list more than 5 `attachment_urls`;
- each upload sweeps unattached uploads older than 24 h (no scheduler);
- the limiters are per process (2 uvicorn workers → effectively 40/h).

## 4. The UI contract (B)

The canonical English is keksdose's (kk `frontend/src/shared/i18n/locales/en.json`,
`feedback.*`), the German its `de-CH.json` (ss, never ß), except the two decided
changes marked ★ and the wording §7 settled. The kit's i18n round translates fr, it,
es, hu, zh. Key names in backticks are the proposed kit label paths (§5). No string
names "the developers" or "the team": "admin" means a different person per app (§3.3).

### 4.1 Top-bar feedback menu

kk `frontend/src/app/top-bar.tsx:156` on the kit's `TopBarActionMenu`. No heading
(kastlan's "New submission" and Kurvenschmiede's "Send feedback" headings go).

| Part | Canon | EN | DE-CH |
|---|---|---|---|
| Trigger | `MessageSquare`, `aria-label` | Send feedback | Feedback senden |
| Rows | `Bug`, `Lightbulb`, `HelpCircle`, `MoreHorizontal` → opens the dialog on that category | Bug · Idea · Question · Other | Fehler · Idee · Frage · Sonstiges |
| Divider | always | — | — |
| Extra entries (app, optional) | keksdose: `Sparkles` Help assistant → `/assistant`, `MessagesSquare` Support chat → `/support` with unread chip | Help assistant · Support chat | Hilfe-Assistent · Support-Chat |
| List link, last (§7.11) | `Inbox`, ONE by role: **admins** → `/feedback`, **everyone else** → `/my-feedback` | View feedback / My feedback | Feedback ansehen / Mein Feedback |
| Trigger badge (optional) | `iconBadge` the app supplies (keksdose: support unread, `danger`) | app's words | app's words |

CRASH never appears as a row. Position in the bar stays each app's. The list link is
keksdose's (kk `top-bar.tsx:205-214`, feedback #331): an admin reaches their own reports
through the inbox.

### 4.2 Submit dialog

The kit's `FeedbackDialog` in `attachments="multiple"`, `requireBody={false}`
(kk `use-feedback-dialog.tsx:142`). Default category when opened from a row: that row's.

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
| Submit hint (§7.12) | Ctrl+Enter to send — on Apple: ⌘ Enter to send | Strg+Enter zum Senden — on Apple: ⌘ Enter zum Senden |
| Buttons ★ | Cancel · **Send** | Abbrechen · **Senden** |

Attachments: accept png/jpeg/webp/gif/pdf/txt, 10 MB, 5 files + the one capture; paste
adds a file. **Context box** (the dialog's `contextSlot`, kk `use-feedback-dialog.tsx:222`):

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

One page component, two routes (kk `feedback-page.tsx:614`, `app/routes.tsx:203`):
`/feedback` is the admin inbox (editable; a non-admin is redirected to `/my-feedback`),
`/my-feedback` the user's own: no status or outcome editing there (also for an admin),
but the author can send an answered item back for rework **and** edit the description
while it is OPEN / IN_PROGRESS — kk `canAuthorEdit` (`feedback-page.tsx:398`) is not
gated on `mine`.

| Part | EN | DE-CH |
|---|---|---|
| Title `/feedback` | Feedback | Feedback |
| Title `/my-feedback` | My feedback | Mein Feedback |
| Empty table, both pages (§7.13; keksdose `common.none`) | None | Keine |
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
  never renders the `mobilePrimary` cell when `mobileCard` is set (kit
  `src/components/data-table.tsx:1734`), which is why keksdose's phone cards show
  neither chip today — a latent keksdose bug the kit part fixes. Admin only: a
  `FloatingActionGroup` (aria "Feedback actions" / "Feedback-Aktionen") with one
  `Eye` toggle **"Only what is waiting for you" / "Nur was auf Sie wartet"** narrowing
  to IN_EVALUATION + NEEDS_LIVE_TEST (page state, not URL).

### 4.4 Row detail

Expanded inline under its row (kk `FeedbackRow`, `feedback-page.tsx:329`), kit
`FeedbackDetail` + `FeedbackDetailSection`, sections in this order:

1. **Description** / **Beschreibung** (§7.3) — the body without its
   `[screenshot]` lines; "—" when empty. Action for the **author while OPEN or
   IN_PROGRESS**, on either page: button **Edit** / **Bearbeiten**, aria **Edit
   description** / **Beschreibung bearbeiten** → `FeedbackNoteEditor` (placeholder =
   the dialog's body label, **Save** / **Speichern**, **Cancel** / **Abbrechen**);
   clearing it saves `""`. The editor holds **only the original description**:
   keksdose edits the raw body (`initial={fb.body}`, kk `feedback-page.tsx:420`), so an
   author could delete `--- REWORK … ---` blocks and `[screenshot] /api/…` lines and
   lose the history. The kit keeps the rework (and folded comment) blocks and the file
   lines out of the editable text and re-appends them unchanged on save.
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
   gesendet.** (it fires for pdf/txt too, so it names no screenshot; §7.14).
6. **Status** — `FeedbackStatusTransitions variant="pill"`: admin on `/feedback` gets
   `selectableFeedbackStatuses` (all 7), everyone else the read-only
   `visibleFeedbackStatuses`.

Any failed PATCH toasts the server's `detail`, else **Could not save that change.** /
**Änderung konnte nicht gespeichert werden.**

### 4.5 Status changes

| Where | Control |
|---|---|
| Table cell | `FeedbackStatusTransitions variant="icon"`, `visibleFeedbackStatuses` (one step either way + the three off-chain) |
| Row detail | `variant="pill"`, `selectableFeedbackStatuses` for the admin |
| Phone card | swipe (admin, `/feedback` only) |

**Undo** (kk `changeStatusUndoably`): after the PATCH lands, an 8 s success toast
**Set to “{{status}}”: {{title}}** / **Auf „{{status}}“ gesetzt: {{title}}** with action
**Undo** / **Rückgängig**, which PATCHes the previous status and confirms **Back to
“{{status}}”: {{title}}** / **Zurück auf „{{status}}“: {{title}}**. Fired from the page's
mutation, so it still arrives when a status filter has already removed the row.

**Swipes** (kk `feedback-page.tsx:990`, defaults in kk
`shared/state/swipe-prefs-store.ts:99`): actions `advance` (to `nextFeedbackStatus`,
`ChevronsRight`, sky, label = the next status), `done` (`Check`, emerald, "Done"),
`wont_do` (`Ban`, rose, "Won't do"); an action the row cannot take drops out. Default
binding: right = advance, then done on the longer drag; left = won't do. keksdose lets
the user rebind them (Settings → Interaction) and stores **physical** `right` / `left`
ladders with `"none"` fillers over the ids `advance` | `done` | `wont_do`, mapping them
to `{ end: right, start: left }` as its translations page does (kk
`features/translations/translations-page.tsx:280`). The kit's inbox binding uses
exactly those three ids on logical `start` / `end` ladders and drops `"none"` or any
unknown id, mirroring 0.26's `TranslationReviewPanel` binding. The other two apps use
the default. Every swipe commits through the same undoable change as a tap (§7.10) —
keksdose's too (`changeStatusUndoably`, kk `feedback-page.tsx:991`).

### 4.6 Crash filing (client)

kk `frontend/src/shared/lib/crash-report.ts` as the boundary's `onReport` + `redact`
(kk `app/error-boundary.tsx:68`), on both placements (`app`, `page`):

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
  (newest 3), flushed at start-up and when a token appears (kk `main.tsx:59-61`);
  401/5xx are retried, other 4xx dropped. A signed-out visitor's crash stays buffered
  until a sign-in (Kurvenschmiede's public pages; accepted — there is no
  unauthenticated crash endpoint);
- resolves "filed" **only when the server answered `stored === true`** —
  `{ reference }` when it gave one, `{}` otherwise; `stored: false` (limiter, demo) and
  every failure resolve `{ filed: false }`, so the fallback never claims a report that
  was not filed. keksdose today keys on `res.ok` + `reference` (kk `crash-report.ts:253-255`,
  `:325`), so a 202 `stored: false` resolves `{}` and the kit fallback (kit
  `src/components/error-boundary.tsx:214`) says it was filed without a reference;
  keksdose takes the fix with adoption;
- must never throw.

## 5. What the kit adds, what stays app-side (C)

**Kit** (all under `@eifi1/ui-kit/feedback`, re-exported from the main barrel):

- **Label namespaces**, all 7 languages, keksdose's text as the English defaults:
  `feedbackStatus` (7), `feedbackCategory` (5), `feedbackMenu`, `feedbackContext`,
  `feedbackPage` (titles, columns, empty, deleted user, rework chip, awaiting filter,
  phone actions), `feedbackDetail` (sections, edit, outcome, rework, open page, copy URL,
  resolved, download), `feedbackToast` (§4.2 toasts, update failed, Undo trio). Existing
  `feedbackDialog` / `feedbackAttachment` defaults move to the canon (★ already match;
  `submitHint` "Ctrl/⌘ + Enter to send" → keksdose's "Ctrl+Enter to send", ⌘ on Apple;
  `attachmentAdd` "Attach image" → "Add attachment", the longer paste hint).
- **`FeedbackRecord`** type = §3.1, `FeedbackContext` type = §3.2. This reverses the
  "no `Feedback` type in this file" note in `src/feedback/feedback-inbox.tsx` — the
  apps now share one shape.
- **Constants**: `FEEDBACK_ATTACHMENT_ACCEPT` (images + pdf + txt), the existing
  `DEFAULT_MAX_ATTACHMENTS` (5) / `DEFAULT_MAX_ATTACHMENT_BYTES` (10 MB),
  `FEEDBACK_PICKABLE_CATEGORIES` (no CRASH), `FEEDBACK_REWORKABLE_STATUSES`,
  `FEEDBACK_AUTHOR_EDITABLE_STATUSES`, `FEEDBACK_AWAITING_STATUSES`.
- **Body helpers** (from kk `body-attachments.ts`): `appendRework(body, note, url?, now)`
  (one file, UTC stamp), `reworkCount(body)` anchored on `^---\s*REWORK\b`,
  `splitBodyAttachments(body)`, `splitDescription(body)` (the original description vs
  the appended rework/comment blocks, for §4.4.1's editor), `isImageAttachment(url)`,
  `attachmentName(url)` — every key match is `[\w.-]+` (kastlan's `<uuid32>_<sha12>`
  keys), never a fixed hex shape.
- **`FeedbackMenu`** — `TopBarActionMenu` preset: the four category rows, divider,
  `extraEntries`, then "View feedback" when `isAdmin`, else "My feedback"; `iconBadge`,
  `onFile(category)`.
- **`FeedbackContextBox`** + **`feedbackContext({ user, attachUrl, url, environment,
  version })`** — the box's wording and the §3.2 object, so the two cannot drift.
- **`useFeedbackDialog`-shaped hook or `FeedbackSubmitDialog`** — the dialog with the
  canon props (`multiple`, accept, limits, error toasts, capture), taking
  `upload(file) → url` and `create(payload)` from the app.
- **`captureAppScreenshot({ rootId = "root" })`** — keksdose's `capture-screenshot.ts`
  (style-property allow-list, viewport and `display:none` filter, WebP with PNG
  fallback). `modern-screenshot` becomes an **optional peer**
  (`peerDependenciesMeta.optional`, like `sonner`) loaded with a dynamic `import()`, so
  an app without it pays nothing and an app that calls the helper without it gets a
  rejected promise (→ the capture-failed toast).
- **`createCrashReporter({ endpoint, getToken, allowParams, storageKey, suppress,
  environment })`** → `{ onReport, redact, flushPending }` — §4.6: filed only on
  `stored === true`, buffers while `getToken()` is empty, adds `origin` / `environment`;
  the endpoint, token source, allow-list and demo check come from the app.
- **`feedbackColumns({ canEdit, onStatus, renderDate, … })`** — §4.3's nine columns,
  plus `feedbackMobileGroupBy` and `FeedbackMobileCard`, which draws the env and rework
  chips itself (§4.3).
- **`FeedbackRowDetail`** — §4.4, taking the row, `canEdit`, `viewerId`, `onUpdate`,
  `onUpload`, an `AuthedFetcher` for pictures and downloads; owns the description editor
  (original text only), the URL/route fallback, the outcome editor and the **rework
  section** (`FeedbackReworkSection`, one file, exported for reuse).
- **`useFeedbackStatusUndo(mutate)`** — §4.5's toast trio around one status PATCH, used
  by the table, the detail and the swipes.
- **`FEEDBACK_SWIPE_ACTIONS` (`advance`, `done`, `wont_do`), `DEFAULT_FEEDBACK_SWIPE`,
  `feedbackSwipePlan(binding, row)`** — modelled on 0.26's `translationReviewSwipePlan`
  (logical `start`/`end` ladders, `"none"` and unknown ids dropped), returning what
  `DataTable mobileSwipeActions` takes.
- **`FeedbackAwaitingToggle`** — the phone `FloatingAction` of §4.3.

**App**: the API client and query keys; auth, roles and the admin check; route
registration and the `/feedback` → `/my-feedback` redirect; the upload/create calls
handed to the kit; `AuthedImage`'s fetcher; app version and deploy environment; the
crash endpoint, token source, demo check and query-param allow-list; swipe-binding
storage (keksdose's Settings → Interaction); tour anchors; keksdose's support chat and
help assistant entries; the outcome loop tooling; app-only extras (kastlan's counts
tiles).

## 6. Per repo (D)

**ui-kit** (first, one minor release):
1. Label namespaces + all 7 catalogues; canon defaults for `feedbackDialog` / `feedbackAttachment`.
2. `FeedbackRecord` / `FeedbackContext` types, constants, body helpers (with keksdose's tests).
3. `FeedbackMenu`, `FeedbackContextBox` + `feedbackContext()`, the submit-dialog wrapper.
4. `captureAppScreenshot` + optional `modern-screenshot` peer.
5. `createCrashReporter`.
6. `feedbackColumns`, `FeedbackMobileCard`, `FeedbackRowDetail` + `FeedbackReworkSection`, `useFeedbackStatusUndo`, swipe plan, awaiting toggle.
7. `kitLabelStrings` picks the new namespaces up; showcase page; ADOPTING.md section.

**keksdose** — backend (it is the contract's source; dropping the retained
`feedback_comments` table stays a separate decision):
1. Validate `screenshot_url` against the own attachment URL pattern (contract MUST, §3.4).
2. **Done** (2026-10-04): `CrashReportCreate` takes optional `origin` (≤ 200) and `environment` (≤ 20), copied into the crash row's `context` (§3.2, §3.6); the erasure allow-list keeps `environment` and drops `origin` (§3.2).
3. Recommended, Marcel decides at the push: upload limiter charged after validation, crash limiter after the dedupe (§3.5, §3.6).

keksdose — frontend:
1. Bump the kit; replace `STATUS_LABEL`, `categoryLabelKey` and the `feedback.*` keys the kit now owns — no `feedback.*` key is used outside `features/feedback` and `app/top-bar.tsx` (tests aside), so removing them is clean; `common.none` and `more.copy_url` stay (shared), as do `support.*` and `assistant.*`.
2. `app/top-bar.tsx` → `FeedbackMenu` (`isAdmin`) with the assistant/support entries and the unread `iconBadge`; the list link stays keksdose's (§4.1); keep `data-tour="feedback-menu"`.
3. `use-feedback-dialog.tsx` → kit dialog wrapper + `FeedbackContextBox`; submit reads **Send**, body **What happened? (optional)**, hint **Ctrl+Enter to send** (⌘ on Apple).
4. `capture-screenshot.ts` → `captureAppScreenshot`; `attachment-options.ts` → kit constants.
5. `shared/lib/crash-report.ts` → `createCrashReporter` with its own allow-list (filed only on `stored === true`); `main.tsx:59-61` keeps the flush wiring (start-up + token-appears subscription) on the reporter's `flushPending`; `app/error-boundary.tsx` unchanged otherwise.
6. `feedback-page.tsx` → `feedbackColumns` + `FeedbackRowDetail` + `FeedbackMobileCard` + `FeedbackEmptyState` + `feedbackSwipePlan` + `useFeedbackStatusUndo` (swipes included, as `changeStatusUndoably` already does); the swipe-prefs store keeps its physical bindings and maps them to `{ end: right, start: left }`; `body-attachments.ts` → kit helpers.
7. Run the feedback tests (`features/feedback/__tests__`) against the kit parts; keep the tours ("Sending feedback", "Report something") on the same anchors, but rewrite their copy: `tour.fb.form_body` ("the Description is optional … Ctrl+Enter sends it") changes with the dialog's "What happened?" wording (Ctrl+Enter stays), and the help-assistant corpus (built from tour copy) needs a rebuild.

**kastlan** — backend:
1. Alembic: `feedbackstatus` + NEEDS_LIVE_TEST, POSTPONED; `feedbackcategory` + CRASH (before BUG).
2. Alembic: `attachment_urls` JSON NULL, `crash_fingerprint` VARCHAR(32) indexed.
3. `schemas/feedback.py`: body optional (`""`), `attachment_urls` (≤ 5) **and** `screenshot_url` checked against the own URL pattern, CRASH → 422 on create and update, explicit-null guard.
4. `feedback_router.upload_attachment`: pdf/txt, image decode check, `attachment` disposition for non-images, key pattern widened (keys stay `<uuid32>_<sha12>.<ext>`).
5. `feedback_service.update_feedback`: server-side rework append (admin or author) instead of the author's `status: OPEN`; `resolved_at` enter/leave rule.
6. `POST /feedback/crash` with fingerprint dedupe and the 202 shapes; rows carry the user's `company_id`; in-process limiters, 20 uploads/h and 20 crashes/h per user.
7. Fold the comments into their items' bodies as `--- COMMENT <YYYY-MM-DD HH:MM> · <name> ---` blocks (§7.7), then drop the routes, schemas, service methods and table.
8. `GET /feedback` and `GET /feedback/my` return plain arrays (§7.5); `GET /feedback` ADMIN-only (company-scoped), MANAGER narrowed to own items (§7.6); `/feedback/{id}` and `/feedback/counts` stay ADMIN-only extensions, `/counts` gains the two statuses.

kastlan — frontend:
1. `shared/types/feedback.ts`: 7 statuses, CRASH, `attachment_urls`, context keys.
2. `shared/components/feedback/feedback-button.tsx` → kit dialog wrapper (multiple, capture, context box with email, origin, environment, version).
3. `app/top-bar.tsx` → `FeedbackMenu` (drops "New submission"; rows Bug/Idea/Question/Other; "View feedback" for an admin, "My feedback" for everyone else); the Ctrl+Shift+F hotkey and `feedback:open` event go (§7.11).
4. `features/feedback/pages/feedback-page.tsx` → kit columns + detail; comments section, `fetchFeedbackComments` / `addFeedbackComment` removed; Undo; swipes with the default binding.
5. `app/providers.tsx` and `app/app-layout.tsx` boundaries get `createCrashReporter`.
6. `public/locales/*/feedback.json`: delete the keys the kit owns; overview tiles (`features/overview/pages/group-overview-page.tsx`) and the activity feed's "Feedback #x submitted" items stay admin-only, the tiles count the new statuses.

**Kurvenschmiede** — backend and frontend ship as **one branch / one PR**: today's
frontend breaks the moment the backend changes. Backend:
1. Alembic: `context` JSON (encrypted like the body, §7), backfill `{route: page_path, url: page_path + search, ua: user_agent}`, drop `page_path` / `user_agent`; `crash_fingerprint`; title cap 255; `outcome` nullable (`""` → NULL).
2. Attachments: `POST /feedback/attachments` → `{url}` and `GET /feedback/attachments/{key}` over the existing `feedback_attachment` storage (§7.8, with the deviations accepted in §3.8); `screenshot_url` + `attachment_urls` derived on the row and validated as own URLs; pdf/txt; 10 MB; `note`, `GET /feedback/categories` and `POST`/`GET /feedback/{id}/attachments` go.
3. `POST /feedback` → JSON `FeedbackCreate`; the server overwrites the `user_*` context keys from the session and caps the object.
4. Split `GET /feedback` (ADMIN) and `GET /feedback/my`; response = §3.1 (`user_id`, `user_email`).
5. `PATCH`: contract fields and rules — author title/body/category while OPEN/IN_PROGRESS, rework by body append (replaces `note`), author status writes refused.
6. Data: rewrite stored `--- <stamp> ---` note rules to `--- REWORK <stamp> ---` (decrypt in app code) so the Rework chip counts them.
7. `POST /feedback/crash`.
8. `feedback_loop.py` and `docs/feedback-loop.md` read `context` and the attachment URLs.

Kurvenschmiede — frontend:
1. `features/feedback/feedback-page.tsx` → two routes in `app/routes.tsx` (`/feedback` admin, `/my-feedback`), kit columns + detail; `?report=` → `?row=`; "Your verdict" goes.
2. `use-feedback-dialog.tsx` → kit dialog wrapper (multiple, two-step upload, context box); `capture-page.ts` → `captureAppScreenshot`.
3. `app/top-bar.tsx` → `FeedbackMenu` (no heading, rows Bug/Idea/Question/Other); `app/account-menu.tsx:75` entry per §7.
4. `main.tsx` and `app/layout.tsx` boundaries get `createCrashReporter`.
5. Admin: Undo, swipes (default binding), awaiting toggle.
6. `de-CH.json` etc.: drop the app's feedback keys (In Arbeit → In Bearbeitung, In Prüfung → Zur Prüfung, Test auf der Live-Umgebung → Live testen come with the kit).

Order: the kit release first; keksdose adopts it (the `screenshot_url` check is its only
required backend change; it proves the parts); kastlan and Kurvenschmiede each do
backend then frontend in one PR per app.

## 7. Settled points — the final canon (2026-10-04)

Every point the draft left open is decided; none is open. Marcel's own decisions are
marked (M). Everything else follows decision 4 as Marcel clarified it through
keksdose's session: **keksdose is the source** — where the kit's draft had made its own
call (the menu, the submit hint, the empty state, the detail heading, the crash
payload's caps), the kit went back to keksdose's behaviour.

1. **(M) Rework:** keksdose's full-body PATCH with server-side append detection is the
   wire (§3.4) — a `--- REWORK <stamp> ---` block, **one file** and a **required note**;
   the server reopens the row. Kurvenschmiede's `note` field goes (§3.8).
2. **(M) The author's "done" goes.** An answered item stays answered unless its author
   sends it back for rework; Kurvenschmiede's "That is it, done" / "Your verdict" is
   removed.
3. **Detail heading:** keksdose's **"Description"** / **"Beschreibung"** over the filed
   body (§4.4); the author's button keeps "Edit" / aria "Edit description".
4. **(M) The dialog's body field:** **"What happened? (optional)"** / **"Was ist
   passiert? (optional)"** (keksdose: "Description (optional)") — also the description
   editor's placeholder. The body stays optional. **(M) Submit: "Send"** (keksdose:
   "Save").
5. **kastlan's list envelope:** app-side — the kit takes rows. kastlan's call: plain
   arrays on `GET /feedback` and `GET /feedback/my`.
6. **(M) Inbox access: admins only.** kastlan's backend narrows MANAGER to their own
   items, like keksdose and Kurvenschmiede.
7. **(M) kastlan's existing comments fold into the item:** a one-time migration appends
   each item's comments to its body as `--- COMMENT <YYYY-MM-DD HH:MM> · <name> ---`
   blocks (never counted as rework, §3.4); then the comments table and endpoints are
   dropped. kastlan has 0 comment rows in prod and dev and ships the fold anyway.
8. **Kurvenschmiede's attachment storage:** app-side (its own table and encryption may
   stay). The two-step upload's orphans are its to clean (e.g. unattached uploads older
   than a day); the URL shape the client sees follows §3.5.
9. **Kurvenschmiede's `context` encryption:** app-side; encrypting the JSON like the
   other reporter data is recommended.
10. **(M) Undo on swipes: yes.** The advance / done / won't-do swipes commit through the
    same undoable change as a tap — the 8 s "Set to …" toast with Undo (§4.5). keksdose's
    swipes do too since 2026-10-04 (`changeStatusUndoably`); the kit's
    `feedbackSwipePlan` takes `useFeedbackStatusUndo`'s change.
11. **Entry points:** the menu is keksdose's — no heading, the four rows, and ONE list
    link by role: **admins "View feedback" → `/feedback`, everyone else "My feedback" →
    `/my-feedback`** (§4.1). For parity, kastlan's Ctrl+Shift+F / `feedback:open` and
    Kurvenschmiede's account-menu item go.
12. **Submit hint:** keksdose's **"Ctrl+Enter to send"** / **"Strg+Enter zum Senden"**.
    On a Mac, iPhone or iPad the kit says **"⌘ Enter to send"** / **"⌘ Enter zum
    Senden"** — the platform rule the kit's `form.submitShortcut` already follows, since
    the key there is Cmd; the label is a function of the platform (`(apple) => …`).
13. **Empty states:** keksdose's **"None"** / **"Keine"** on both pages, no hint beneath
    it — also when a filter leaves nothing, as keksdose's `empty={t("common.none")}` does.
14. **(M) German rework wording:** **"Nacharbeit"** throughout, the upload failure toast
    included: "Die Datei konnte nicht hochgeladen werden. Die Nacharbeit wurde nicht
    gesendet." keksdose's "Rückmeldung" goes with adoption (the kit owns the string). The
    toast names a **file**, not a screenshot — keksdose's own review point: it fires for
    a PDF or a log too.
15. **`GET /feedback/{id}`:** not part of the contract — `?row=` deep links work off the
    list; kastlan may keep its endpoint as an extension.
16. **Crash payload and erasure** (contract change, keksdose's backend already does it):
    `CrashReportCreate` takes optional `origin` (≤ 200) and `environment` (≤ 20), copied
    into the row's `context`; the erasure allow-list keeps `environment` and drops
    `origin` (§3.2, §3.6).

**keksdose's defects stay fixed in the kit** — the source's behaviour, not its bugs:

- the crash reporter resolves "filed" only on `stored === true` (keksdose keyed on
  `res.ok` + `reference`, so a 202 `stored: false` claimed a filing, §4.6);
- the phone cards draw the environment and Rework chips themselves (`DataTable` never
  renders `mobilePrimary` beside `mobileCard`, so keksdose's cards showed neither, §4.3);
- the description editor holds only the original text and re-appends the rework /
  comment blocks and file lines on save (keksdose's edited the raw body and could delete
  the history, §4.4).
