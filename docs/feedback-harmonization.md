# Feedback across the kit and the three apps — harmonisation plan

Status: **2026-10-04**, led from ui-kit at Marcel's request. Built from a read-only
survey of each app's working tree (keksdose `main`, kastlan `fix/stale-shell-locales`,
Kurvenschmiede `feat/segment-list-inline-on-phones`). Marcel's decisions are in §2.
Everything after them follows the same pattern as the language round
([i18n-harmonization.md](i18n-harmonization.md)): **one contract + kit parts**. The
contract is keksdose's, read off its code; the kit owns every visible word and every
part that three apps were building separately; each app keeps its data, API client,
auth and routes. The points the draft left open are settled in §7.

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
   an answered item back for **rework** (a note + attachments; the server reopens it).
   kastlan's comment thread goes. keksdose's support chat stays keksdose-only and is
   out of scope (it keeps using the kit's `FeedbackThread` / `FeedbackComposer`).
3. **Routes**: `/feedback` (admin inbox) + `/my-feedback` (the user's own).
   Kurvenschmiede splits its single page.
4. **Canon = keksdose's wording and behaviour**, owned by the kit in all 7 languages —
   except the submit button says **"Send"** (keksdose: "Save") and the body uses
   **"What happened?"** wording (keksdose: "Description (optional)"). Multiple
   attachments + screenshot capture, crash auto-filing, Undo on status changes, phone
   swipes on the inbox.

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
  `reworkCount`), so nothing can forget to set it. The kit ships the reader (§5).
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
| `url` | full `location.href` at open time | yes → `""` |
| `route` | its pathname | yes → `""` |
| `origin` | `location.origin` | no — which copy of the app, not personal |
| `environment` | `"prod"` / `"dev"` / `"local"` (kk `app/deploy-environment.ts`) | no |
| `user_id`, `user_email`, `user_display_name` | the submitter, snapshot | no |
| `viewport` | `"406x816"` | no |
| `ua` | `navigator.userAgent` | no |
| `version` | the app build (`__APP_VERSION__`) | no |

Crash rows add (server-written, kk `feedback_service.py:346`): `fingerprint`,
`boundary` (`app`/`page`), `online`, `occurrences`, `first_seen_at`, `last_seen_at`,
`auto_reported: true`. The admin list shows a non-`prod` `environment` as a chip in the
subject cell (kk `feedback-page.tsx` `environmentLabel`). On account erasure the server
scrubs the name and email out of `context` (kk `Feedback.user_id` docstring).

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
| `screenshot_url` | the captured screenshot's upload URL, or null |
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
- **Rework** (any actor, admin included): a PATCH whose only field is `body` and whose
  new body strictly extends the old one is an append. On a row outside OPEN /
  IN_PROGRESS the **server** sets `status = OPEN` (kk `_is_rework_append`, live #331).
  The client never sends a status with it. The appended shape is fixed:

  ```text
  <old body>\n\n--- REWORK 2026-10-04 09:12 ---\n<note>\n[screenshot] /api/v1/feedback/attachments/<key>
  ```

  (`\n\n` left out when the old body is `""`; one `[screenshot] <url>` line per
  rework attachment — kk `body-attachments.ts` `attachmentLine`; the marker covers
  pdf/txt too despite its name.) Reworkable statuses: IN_EVALUATION, NEEDS_LIVE_TEST,
  POSTPONED, DONE, WONT_DO.
- **`resolved_at`**: stamped only on a real transition **into** DONE/WONT_DO (a DONE→DONE
  re-PATCH keeps the date), cleared on leaving them (kk `update_feedback`, feedback #96).
- **Re-labelling to CRASH** → 422; CRASH → BUG stays an ordinary admin update.

### 3.5 Attachments

From kk `upload_guards.py:197` and `store_attachment_bytes`:

- Types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `application/pdf`,
  `text/plain` (no SVG/HTML). Type taken from the bare media type; anything else → 415.
- Size: **10 MB** per file (413), empty file → 400, an `image/*` that does not decode → 400.
- Count: **one screenshot + up to 5 other files** per report (kk `MAX_ATTACHMENT_URLS`).
- Key: content-addressed `sha256(bytes)[:12].<ext>`, so the same paste twice is one URL.
  The URL is opaque to clients; each server validates only its own pattern.
- Download: authenticated, so clients fetch through the authed client (`AuthedImage`
  for pictures, blob download for pdf/txt — kk `FeedbackFileDownload`); non-images are
  always served as `attachment`, never inline.
- Throttle: 20 uploads / hour / user → 429 with `Retry-After` (kk `throttle_attachment`).

### 3.6 Crash filing

`POST /feedback/crash`, kk `feedback_router.report_crash` + `feedback_service.record_crash`:

```jsonc
// CrashReportCreate — every string is truncated server-side, never refused
{ "name": "TypeError", "message": "x is undefined",          // message 1–2000, name ≤200
  "stack": "…", "component_stack": "…",                      // ≤8000 each
  "boundary": "page",                                        // "app" | "page"
  "url": "https://…/accounts?p=2", "route": "/accounts",     // ≤2000 / ≤500
  "version": "0.4.26", "viewport": "406x816", "ua": "…",     // ≤50 / ≤50 / ≤500
  "online": true, "occurred_at": "2026-10-04T09:12:00Z" }

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
fingerprint characters, shown in the fallback so a user can quote it.

### 3.7 Errors

FastAPI's `{"detail": "<sentence>"}` in all three (kastlan's `DomainError` handler emits
the same shape); validation errors are FastAPI's `{"detail": [ … ]}` list. Clients show
`detail` when it is a string, else their fallback toast (kk `extractApiErrorMessage`).

| Status | When |
|---|---|
| 400 | empty file; image that does not decode |
| 403 | not admin on `GET /feedback` (`Insufficient role`); not the author; author changing a forbidden field or a frozen row |
| 404 | `Feedback not found`; `Attachment not found` |
| 413 / 415 | file over 10 MB / type outside §3.5 |
| 422 | CRASH set by hand; explicit null on a NOT NULL field; blank title; bad attachment URL |
| 429 | upload throttle (`Retry-After`) |

### 3.8 What kastlan and Kurvenschmiede change

| Contract point | kastlan today | Kurvenschmiede today |
|---|---|---|
| 7 statuses | 5 in a PG enum → `ALTER TYPE feedback_status ADD VALUE` ×2 | has 7 |
| CRASH category | missing → add enum value (before `BUG`, as kk migration 0050) + manual-CRASH 422 | has it, unused |
| `context` JSON | has it; client sends 6 keys, `user_email: null` | **`page_path` + `user_agent` columns** → `context` (migrate `page_path` → `route`, `user_agent` → `ua`), drop the columns |
| Create shape | JSON ✓; `body` required → optional | **multipart** → JSON + two-step upload |
| Attachments | 1 `screenshot_url`, images only → add `attachment_urls` JSON, pdf/txt, decode check, non-image `attachment` disposition | **bytes in `feedback_attachment`** → served at `/feedback/attachments/{key}`, `screenshot_url` + `attachment_urls` on the row, pdf/txt, 4 → 10 MB |
| Rework | author sends `status: OPEN` + body → server-side append detection, any actor | `note` field → body append with `--- REWORK <stamp> ---`, author edit while OPEN/IN_PROGRESS added, author `DONE` verdict removed (§7) |
| `resolved_at` | stamped on every DONE/WONT_DO write, never cleared → enter/leave rule | already right (`stamp_settlement`) |
| Lists | `PaginatedResponse`, MANAGER may list all (§7) | one `GET /feedback` for both audiences → split into `GET /feedback` (ADMIN, 403 otherwise) + `GET /feedback/my` |
| Response fields | `user_name` extra; no `attachment_urls` | `author_name`/`author_email`/`is_mine`/`page_path`/`user_agent`/`attachments[]` → contract fields; `outcome ""` → `null`; title cap 200 → 255 |
| Crash | none → endpoint + `crash_fingerprint` column + limiter | none → same |
| Comments | `feedback_comments` + 2 routes → removed (§7 for the rows) | — |

## 4. The UI contract (B)

The canonical English is keksdose's (kk `frontend/src/shared/i18n/locales/en.json`,
`feedback.*`), the German its `de-CH.json` (ss, never ß), except the two decided
changes marked ★. The kit's i18n round translates fr, it, es, hu, zh. Key names in
backticks are the proposed kit label paths (§5).

### 4.1 Top-bar feedback menu

kk `frontend/src/app/top-bar.tsx:156` on the kit's `TopBarActionMenu`. No heading
(kastlan's "New submission" and Kurvenschmiede's "Send feedback" headings go).

| Part | Canon | EN | DE-CH |
|---|---|---|---|
| Trigger | `MessageSquare`, `aria-label` | Send feedback | Feedback senden |
| Rows | `Bug`, `Lightbulb`, `HelpCircle`, `MoreHorizontal` → opens the dialog on that category | Bug · Idea · Question · Other | Fehler · Idee · Frage · Sonstiges |
| Divider | always | — | — |
| Extra entries (app, optional) | keksdose: `Sparkles` Help assistant → `/assistant`, `MessagesSquare` Support chat → `/support` with unread chip | Help assistant · Support chat | Hilfe-Assistent · Support-Chat |
| List link, last | `Inbox`; ADMIN → `/feedback`, everyone else → `/my-feedback` | View feedback / My feedback | Feedback ansehen / Mein Feedback |
| Trigger badge (optional) | `iconBadge` the app supplies (keksdose: support unread, `danger`) | app's words | app's words |

CRASH never appears as a row. Position in the bar stays each app's.

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
| Submit hint | Ctrl+Enter to send | Strg+Enter zum Senden |
| Buttons ★ | Cancel · **Send** | Abbrechen · **Senden** |

Attachments: accept png/jpeg/webp/gif/pdf/txt, 10 MB, 5 files + the one capture; paste
adds a file. **Context box** (the dialog's `contextSlot`, kk `use-feedback-dialog.tsx:222`):

| Line | EN | DE-CH |
|---|---|---|
| Submitter | **User:** {display name} ({email}) — "—" when unknown | **Nutzer:** … |
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
`/my-feedback` the user's own (read-only, rework only — also for an admin).

| Part | EN | DE-CH |
|---|---|---|
| Title `/feedback` | Feedback | Feedback |
| Title `/my-feedback` | My feedback | Mein Feedback |
| Empty table | None | Keine |
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
| 7 | URL | pathname link (`noRowLink`), aria "Open page" / "Seite öffnen" | text | hidden |
| 8 | Status | `FeedbackStatusTransitions variant="icon"` with `visibleFeedbackStatuses` | select, chain order | |
| 9 | Resolved / Erledigt am | `resolved_at` date | date | hidden |

- **Deep link: `?row=<id>`** (kit `useSearchParamState`, `history: "replace"`); every row
  is a real link that keeps the table's other params. Kurvenschmiede's `?report=` is
  read once and rewritten.
- **Phone**: cards grouped by day header; card = title + `FeedbackStatusBadge` on one
  line, compact category badge · date · (admin) submitter beneath. Admin only: a
  `FloatingActionGroup` (aria "Feedback actions" / "Feedback-Aktionen") with one
  `Eye` toggle **"Only what is waiting for you" / "Nur was auf Sie wartet"** narrowing
  to IN_EVALUATION + NEEDS_LIVE_TEST (page state, not URL).

### 4.4 Row detail

Expanded inline under its row (kk `FeedbackRow`, `feedback-page.tsx:329`), kit
`FeedbackDetail` + `FeedbackDetailSection`, sections in this order:

1. **Description** / **Beschreibung** (heading — §7) — the body without its
   `[screenshot]` lines; "—" when empty. Action for the **author while OPEN or
   IN_PROGRESS**: button **Edit** / **Bearbeiten**, aria **Edit description** /
   **Beschreibung bearbeiten** → `FeedbackNoteEditor` (placeholder = the dialog's body
   label, **Save** / **Speichern**, **Cancel** / **Abbrechen**); clearing it saves `""`.
2. **URL** — only when `context.url` is set: the local path as a link + `CopyButton`
   **Copy URL** / **URL kopieren**.
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
   - when the URL is set: `ExternalLink` **Open page** / **Seite öffnen** (a real `href`).
5. **Send for rework** / **Zur Nacharbeit senden** — only while reworking:
   `FeedbackNoteEditor` with the attachment field (add, capture, paste; same types and
   size), placeholder **What still needs refinement? Any new constraints or change of
   direction.** / **Was muss noch angepasst werden? Neue Anforderungen oder
   Richtungswechsel.**, buttons **Send rework** / **Nacharbeit senden** and Cancel. The
   file is uploaded first; if that fails nothing is sent: **The screenshot could not be
   uploaded. The rework was not sent.** / **Der Screenshot konnte nicht hochgeladen
   werden. Die Rückmeldung wurde nicht gesendet.**
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
the user rebind them (Settings → Interaction); the other two use the default.

### 4.6 Crash filing (client)

kk `frontend/src/shared/lib/crash-report.ts` as the boundary's `onReport` + `redact`
(kk `app/error-boundary.tsx:68`), on both placements (`app`, `page`):

- maps the kit's `CrashReport` to §3.6 (`placement` → `boundary`, anything but `app` is
  `page`), clamped to the server's caps;
- `redact` reduces the page to its path + an **allow-list** of query params (kk: `p ps
  sort tab g granularity month preset from to tstate future archived uncleared`) — the
  list is the app's, the mechanism the kit's; no `q`, no `f.*`, no ids;
- never files: chunk-load errors (the kit already withholds them), demo sessions, a
  crash within 10 s of a Vite hot update (dev only);
- posts with a bare `fetch` + `keepalive` and the bearer token — not the app's axios
  client, whose 401 handler would log the user out of a crashed page;
- offline or signed out → buffered in `localStorage` (newest 3), flushed at start-up and
  when a token appears; 401/5xx are retried, other 4xx dropped;
- resolves `{ reference }` only when stored, else `{ filed: false }`, so the fallback
  never claims a report that was not sent;
- must never throw.

## 5. What the kit adds, what stays app-side (C)

**Kit** (all under `@eifi1/ui-kit/feedback`, re-exported from the main barrel):

- **Label namespaces**, all 7 languages, keksdose's text as the English defaults:
  `feedbackStatus` (7), `feedbackCategory` (5), `feedbackMenu`, `feedbackContext`,
  `feedbackPage` (titles, columns, empty, deleted user, rework chip, awaiting filter,
  phone actions), `feedbackDetail` (sections, edit, outcome, rework, open page, copy URL,
  resolved, download), `feedbackToast` (§4.2 toasts, update failed, Undo trio). Existing
  `feedbackDialog` / `feedbackAttachment` defaults move to the canon (★ already match;
  `attachmentAdd` "Attach image" → "Add attachment", the longer paste hint, the submit hint).
- **`FeedbackRecord`** type = §3.1, `FeedbackContext` type = §3.2. This reverses the
  "no `Feedback` type in this file" note in `src/feedback/feedback-inbox.tsx` — the
  apps now share one shape.
- **Constants**: `FEEDBACK_ATTACHMENT_ACCEPT` (images + pdf + txt), the existing
  `DEFAULT_MAX_ATTACHMENTS` (5) / `DEFAULT_MAX_ATTACHMENT_BYTES` (10 MB),
  `FEEDBACK_PICKABLE_CATEGORIES` (no CRASH), `FEEDBACK_REWORKABLE_STATUSES`,
  `FEEDBACK_AUTHOR_EDITABLE_STATUSES`, `FEEDBACK_AWAITING_STATUSES`.
- **Body helpers** (from kk `body-attachments.ts`): `appendRework(body, note, urls, now)`,
  `reworkCount(body)`, `splitBodyAttachments(body)`, `isImageAttachment(url)`,
  `attachmentName(url)`.
- **`FeedbackMenu`** — `TopBarActionMenu` preset: the four category rows, divider,
  `extraEntries`, list link from `isAdmin` (or `listHref`), `iconBadge`, `onFile(category)`.
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
- **`createCrashReporter({ endpoint, getToken, allowParams, storageKey, suppress })`** →
  `{ onReport, redact, flushPending }` — §4.6, the endpoint/token/allow-list/demo check
  coming from the app.
- **`feedbackColumns({ canEdit, onStatus, renderDate, … })`** — §4.3's nine columns,
  plus `FeedbackMobileCard` and `feedbackMobileGroupBy`.
- **`FeedbackRowDetail`** — §4.4, taking the row, `canEdit`, `viewerId`, `onUpdate`,
  `onUpload`, an `AuthedFetcher` for pictures and downloads; owns the outcome editor
  and the **rework section** (`FeedbackReworkSection`, exported for reuse).
- **`useFeedbackStatusUndo(mutate)`** — §4.5's toast trio around one status PATCH.
- **`FEEDBACK_SWIPE_ACTIONS`, `DEFAULT_FEEDBACK_SWIPE`, `feedbackSwipePlan(binding,
  row)`** — modelled on 0.26's `translationReviewSwipePlan` (logical `start`/`end`
  sides), returning what `DataTable mobileSwipeActions` takes.
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

**keksdose** — backend: no change (it is the contract; dropping the retained
`feedback_comments` table stays a separate decision). Frontend:
1. Bump the kit; replace `STATUS_LABEL`, `categoryLabelKey` and the `feedback.*` keys the kit now owns (keep `support.*`, `assistant.*`).
2. `app/top-bar.tsx` → `FeedbackMenu` with the assistant/support entries and the unread `iconBadge`; keep `data-tour="feedback-menu"`.
3. `use-feedback-dialog.tsx` → kit dialog wrapper + `FeedbackContextBox`; submit reads **Send**, body **What happened? (optional)**.
4. `capture-screenshot.ts` → `captureAppScreenshot`; `attachment-options.ts` → kit constants.
5. `shared/lib/crash-report.ts` → `createCrashReporter` with its own allow-list; `app/error-boundary.tsx` unchanged otherwise.
6. `feedback-page.tsx` → `feedbackColumns` + `FeedbackRowDetail` + mobile card + `feedbackSwipePlan` + `useFeedbackStatusUndo`; `body-attachments.ts` → kit helpers.
7. Run the feedback tests (`features/feedback/__tests__`) against the kit parts; keep the tours ("Sending feedback", "Report something") pointing at the same anchors.

**kastlan** — backend:
1. Alembic: `feedback_status` + NEEDS_LIVE_TEST, POSTPONED; `feedback_category` + CRASH (before BUG).
2. Alembic: `attachment_urls` JSON NULL, `crash_fingerprint` VARCHAR(32) indexed.
3. `schemas/feedback.py`: body optional (`""`), `attachment_urls` (≤ 5, own URL pattern), CRASH → 422 on create and update, explicit-null guard.
4. `feedback_router.upload_attachment`: pdf/txt, image decode check, `attachment` disposition for non-images, key pattern widened.
5. `feedback_service.update_feedback`: server-side rework append (any actor) instead of the author's `status: OPEN`; `resolved_at` enter/leave rule.
6. `POST /feedback/crash` with fingerprint dedupe, limiter and the 202 shapes; rows carry the user's `company_id`.
7. Remove the comments routes, schemas and service methods; then the table (§7).
8. `GET /feedback` ADMIN-only per the contract (§7 for MANAGER and the envelope); `/feedback/counts` gains the two statuses.

kastlan — frontend:
1. `shared/types/feedback.ts`: 7 statuses, CRASH, `attachment_urls`, context keys.
2. `shared/components/feedback/feedback-button.tsx` → kit dialog wrapper (multiple, capture, context box with email, origin, environment, version).
3. `app/top-bar.tsx` → `FeedbackMenu` (drops "New submission"; rows Bug/Idea/Question/Other; "View feedback" / "My feedback"); the Ctrl+Shift+F hotkey and `feedback:open` event per §7.
4. `features/feedback/pages/feedback-page.tsx` → kit columns + detail; comments section, `fetchFeedbackComments` / `addFeedbackComment` removed; Undo; swipes with the default binding.
5. `app/providers.tsx` and `app/app-layout.tsx` boundaries get `createCrashReporter`.
6. `public/locales/*/feedback.json`: delete the keys the kit owns; overview tiles (`features/overview/pages/group-overview-page.tsx`) count the new statuses.

**Kurvenschmiede** — backend:
1. Alembic: `context` JSON (encrypted like the body, §7), backfill `{route: page_path, ua: user_agent}`, drop `page_path` / `user_agent`; `crash_fingerprint`; title cap 255; `outcome` nullable (`""` → NULL).
2. Attachments: `POST /feedback/attachments` → `{url}` and `GET /feedback/attachments/{key}` over the existing `feedback_attachment` storage (§7); `screenshot_url` + `attachment_urls` on the row; pdf/txt; 10 MB; drop `POST /feedback/{id}/attachments`.
3. `POST /feedback` → JSON `FeedbackCreate`.
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

Order: the kit release first; keksdose adopts it (no backend work, proves the parts);
kastlan and Kurvenschmiede each do backend then frontend in one PR per app.

## 7. Settled points (Marcel and the kit, 2026-10-04)

The draft's open points, decided — Marcel's three marked (M), the rest the kit's call
under decision 4.

1. **Rework on the wire:** keksdose's full-body PATCH with server-side append detection
   stays the contract (keksdose and kastlan already append a `--- REWORK <stamp> ---`
   block). Kurvenschmiede's `note` field may stay as an app-side convenience, but its
   client sends what the contract says.
2. **(M) The author's "done" goes.** An answered item stays answered unless its author
   sends it back for rework; Kurvenschmiede's "That is it, done" / "Your verdict" is
   removed.
3. **Detail heading:** "What happened?" / "Was ist passiert?", as in the dialog; the
   edit button keeps "Edit description".
4. **The body stays optional:** "What happened? (optional)".
5. **kastlan's list envelope:** app-side — the kit takes rows; kastlan's client unwraps
   `items` (or the endpoint returns a plain array; kastlan's call).
6. **(M) Inbox access: admins only.** kastlan's backend narrows MANAGER to their own
   items, like keksdose and Kurvenschmiede.
7. **(M) kastlan's existing comments fold into the item:** a one-time migration appends
   each item's comments to its body, dated and named, like rework notes; then the
   comments table and endpoints are dropped.
8. **Kurvenschmiede's attachment storage:** app-side (its own table and encryption may
   stay). The two-step upload's orphans are its to clean (e.g. unattached uploads older
   than a day); the URL shape the client sees follows §3.5.
9. **Kurvenschmiede's `context` encryption:** app-side; encrypting the JSON like the
   other reporter data is recommended.
10. **Undo on swipes:** yes — every status change offers the Undo toast, swipes included
    (the kit's swipe path uses the same undoable change).
11. **Entry points:** for parity, kastlan's Ctrl+Shift+F / `feedback:open` and
    Kurvenschmiede's account-menu item go. The menu shows "My feedback" to everyone and
    "View feedback" in addition to admins.
12. **Submit hint:** the kit's "Ctrl/⌘ + Enter to send" (right on a Mac too).
13. **Empty states:** "No feedback yet" / "Noch kein Feedback", with the hint "Use the
    speech bubble in the top bar to send some." (the inbox: "Nothing has been sent yet.")
    — the kit owns both; keksdose's bare "None" goes.
14. **German rework wording:** "Nacharbeit" throughout ("Rückmeldung" goes).
15. **`GET /feedback/{id}`:** not part of the contract — `?row=` deep links work off the
    list; kastlan may keep its endpoint as an extension.
