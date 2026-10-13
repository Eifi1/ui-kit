# Feedback across the kit and the three apps — history

What [the feedback contract](../feedback-harmonization.md) moved out of its body in
ui-kit 0.34 (refactor audit DOC-1): its snapshot, the per-repo to-dos and the review
records (the settled canon of 2026-10-04 and the 0.31 amendment). Kept as written:
"today", line numbers and each app's state are as of the day each part was written, and
an item may since have been folded into the contract, which wins. Section numbers are the
contract's.

## Status as written

Status: **2026-10-04**, led from ui-kit at Marcel's request. Built from a read-only
survey of each app's working tree (keksdose `main`, kastlan `fix/stale-shell-locales`,
Kurvenschmiede `feat/segment-list-inline-on-phones`). Marcel's decisions are in §2.
Everything after them follows the same pattern as the language round
([i18n-harmonization.md](../i18n-harmonization.md)): **one contract + kit parts**. The
contract is keksdose's, read off its code; the kit owns every visible word and every
part that three apps were building separately; each app keeps its data, API client,
auth and routes. The points the draft left open are settled in §7, which states the
final canon: **keksdose is the source** (Marcel, 2026-10-04, via keksdose's session) —
where the kit had made its own calls it went back to keksdose's behaviour, except for
Marcel's own decisions and keksdose's real defects, which the kit fixes (§7, end).

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

## 7. Settled points — the final canon (2026-10-04) — as written

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

## 8. Amendment for 0.31 (Marcel, 2026-10-07) — as written

Two of Marcel's keksdose feedback rows, forwarded by keksdose's session.

### 8.1 The subject in the expanded row (keksdose live #395)

With a row expanded and the table scrolled, nothing said which entry was being answered.
**`FeedbackRowDetail` now opens with the subject**: the kit's `FeedbackSubject` (title
and category badge), in every app. `showSubject={false}` suppresses it for an app that
already shows the title beside the detail; the default is on.

### 8.2 A triage step: READY, "Ready to implement" (keksdose live #396)

Marcel: "There should be an intermediate status where open is not touched by you but a
ready to implement. Then I will set it from open to ready to implement and my (or admin
feedback) will be right away persisted with ready to implement."

- **The eighth status `READY`**, "Ready to implement" / „Bereit zur Umsetzung" /
  « Prêt à implémenter » / "Pronto da implementare", sits between OPEN and IN_PROGRESS
  in the chain, so the status order, the picker and the swipe's "next status" go
  OPEN → READY → IN_PROGRESS.
- **OPEN now means "filed, not yet triaged".** Nobody works on an OPEN row, agents
  included. An admin releases it for implementation by setting READY.
- **Feedback filed by an admin is created READY.** The server decides at submit, from
  the author's role; the client never sends a status with a new row. A crash report is
  filed OPEN whoever's session it came from: nobody has looked at it yet.
- **A rework goes back to READY when an admin sends it, and to OPEN otherwise** (§3.4's
  append rule; the server sets the status). An admin's rework is already triaged; a
  user's is new input to look at.
- **The author may still edit** title, body and category while the row is OPEN, READY or
  IN_PROGRESS. Nothing has been answered yet.
- **Rework is offered from the same five answered statuses** as before. READY is not
  among them.
- **"Waiting for you"** (the inbox's awaiting toggle, §4.3) now holds **OPEN**,
  IN_EVALUATION and NEEDS_LIVE_TEST. An OPEN row waits on the triager now, and READY
  waits on the implementer.
- **The colour:** READY takes the brand tint at full strength, so it reads as "go"
  beside NEEDS_LIVE_TEST's muted brand tint and OPEN's neutral one. It has its own icon.
- **Rollout:** existing OPEN rows stay OPEN; there is no back-fill. Marcel triages them
  once. An app whose status column is a database enum adds the value
  (`ALTER TYPE feedbackstatus ADD VALUE 'READY' AFTER 'OPEN'` in Postgres). keksdose's
  feedback-loop scripts pick READY and IN_PROGRESS instead of OPEN and IN_PROGRESS.
- **Kits:** server-kit 0.5 has `FeedbackStatus.READY`, `initial_status(author_is_admin,
  crash=…)` and `rework_status(actor_is_admin)`, and the author-editable set gains READY.
  ui-kit 0.31 has the status, its meta and its label in seven languages, and the awaiting
  set above.
