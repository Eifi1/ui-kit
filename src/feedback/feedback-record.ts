import { DEFAULT_ATTACHMENT_ACCEPT } from "./feedback-attachment";
import { FEEDBACK_CATEGORY_ORDER } from "./feedback-inbox";
import type { FeedbackCategory, FeedbackStatus } from "./feedback-inbox";

/**
 * One feedback report as the three apps send it, and the facts the kit reads off it.
 *
 * Until 0.27 the inbox parts took no report at all ("no `Feedback` type in this file",
 * feedback-inbox.tsx): keksdose kept its reporter context in a JSON column, kastlan a
 * thinner copy of it, Kurvenschmiede a `page_path` and the bytes in the row. Marcel's
 * feedback round (2026-10-04, docs/feedback-harmonization.md) settled one API contract
 * for all three — keksdose's, read off its code — so the apps now share one shape and the
 * kit can take a row instead of a dozen loose values. This file is that shape (§3.1,
 * §3.2), the contract's constants (§3.4, §3.5, §4.3) and the readers and writers of the
 * one field whose format is itself contract: the body, which carries the rework rounds
 * (§3.4) — lifted from keksdose `frontend/src/features/feedback/body-attachments.ts`.
 *
 * Plain functions and data, no components: everything here is as usable from a loop
 * script's helper or a test as from a page.
 */

/* ── The resource (§3.1, §3.2) ────────────────────────────────────────────── */

/** Which copy of an app a report came from — keksdose `app/deploy-environment.ts`.
 *  Any other string is read as "not prod" (the admin list shows it upper-cased as a
 *  chip, §4.3), so an app with a `staging` loses nothing. */
export type FeedbackEnvironment = "prod" | "dev" | "local";

/**
 * The reporter's context, written by the submit dialog (keksdose
 * `use-feedback-dialog.tsx:105`) — §3.2 of the contract.
 *
 * **Every key is optional on read**, and a reader treats a missing one as "unknown":
 * kastlan's client sends six of them (no email, no version), Kurvenschmiede's old rows are
 * backfilled from two columns with a path-only `url`, crash rows add their own (and
 * `origin` / `environment` from the crash payload, §3.6 — older crash rows have neither),
 * and an erased account's row keeps only an allow-list (§3.2: `environment` stays,
 * `origin` goes). Extra keys are allowed — a server may add its own — hence the index
 * signature.
 */
export interface FeedbackContext {
  /** The full `location.href` at open time; `""` when "Attach current page URL" was off.
   *  Readers also accept a path-only value (Kurvenschmiede's backfilled rows). */
  url?: string;
  /** Its pathname; `""` when the URL was withheld. */
  route?: string;
  /** `location.origin` — which copy of the app, not personal; never withheld. */
  origin?: string;
  /** {@link FeedbackEnvironment}, or whatever the app calls its other copies. */
  environment?: FeedbackEnvironment | (string & {});
  /** The submitter, as a snapshot. The server should overwrite the three `user_*` keys
   *  from the session (Kurvenschmiede does), so nobody files in someone else's name. */
  user_id?: number | null;
  user_email?: string | null;
  user_display_name?: string | null;
  /** `"406x816"`. */
  viewport?: string;
  /** `navigator.userAgent`. */
  ua?: string;
  /** The app build (`__APP_VERSION__`). */
  version?: string;
  // Crash rows (server-written, keksdose `feedback_service.py:346`).
  fingerprint?: string;
  /** Which error boundary caught it. */
  boundary?: "app" | "page" | (string & {});
  online?: boolean;
  occurrences?: number;
  first_seen_at?: string;
  last_seen_at?: string;
  auto_reported?: boolean;
  [key: string]: unknown;
}

/**
 * One report — `FeedbackResponse`, keksdose `schemas/feedback.py:117`, §3.1 of the
 * contract. What `GET /feedback`, `GET /feedback/my`, `POST /feedback` and
 * `PATCH /feedback/{id}` answer in all three apps.
 *
 * Extra fields are allowed and ignored (kastlan's `company_id`, `user_name`): an app's
 * own row type with more fields is assignable to this one as it stands.
 *
 * There is **no rework counter field** — {@link reworkCount} reads it off the body, so
 * nothing can forget to set it.
 */
export interface FeedbackRecord {
  id: number;
  /** `null`: the author's account was erased (keksdose live #275). */
  user_id: number | null;
  /** The admin list only (joined); `null` — or absent — on `/my`, create and update. */
  user_email?: string | null;
  /** 1–255 characters, never blank. */
  title: string;
  /** `""` when none. Rework rounds are appended here (§3.4) — read it with
   *  {@link splitDescription} / {@link splitBodyAttachments}, write it with
   *  {@link appendRework} / {@link replaceDescription}. */
  body: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  /** §3.2; `null` on rows that have none. */
  context: FeedbackContext | null;
  /** The ONE captured screenshot's attachment URL, or `null`. */
  screenshot_url: string | null;
  /** Up to 5 other files; `null` = none. Optional because a server older than the
   *  column sends no key at all (keksdose dev #578 met exactly that). */
  attachment_urls?: string[] | null;
  /** The team's answer; `null` = none written. */
  outcome: string | null;
  /** Set on ENTERING `DONE` / `WONT_DO`, cleared on leaving them. ISO 8601. */
  resolved_at: string | null;
  /** ISO 8601. */
  created_at: string;
  /** ISO 8601. */
  updated_at: string;
}

/* ── Constants (§3.4, §3.5, §4.3) ─────────────────────────────────────────── */

/**
 * What a report may carry (§3.5, keksdose `upload_guards.py:197` and its
 * `attachment-options.ts`): the kit's four image types plus a PDF and a plain-text log
 * (keksdose feedback #87). SVG and HTML stay out — both are script-carrying documents in
 * an image's clothing. For `FeedbackAttachmentField` / `FeedbackDialog`'s `accept`, with
 * `DEFAULT_MAX_ATTACHMENTS` (5) and `DEFAULT_MAX_ATTACHMENT_BYTES` (10 MB) from
 * feedback-attachment.tsx, which already are the contract's limits.
 *
 * A plain array (not frozen) because `accept` takes `string[]`, as
 * `DEFAULT_ATTACHMENT_ACCEPT` does — copy it before changing it.
 */
export const FEEDBACK_ATTACHMENT_ACCEPT: string[] = [
  ...DEFAULT_ATTACHMENT_ACCEPT,
  "application/pdf",
  "text/plain",
];

/**
 * The categories a person can pick — every one but `CRASH`, in triage order (Bug, Idea,
 * Question, Other: the feedback menu's rows, §4.1). `CRASH` is filed by an error boundary
 * and the server refuses it by hand with a 422 (keksdose `_reject_manual_crash`), so no
 * picker may offer it.
 */
export const FEEDBACK_PICKABLE_CATEGORIES: readonly FeedbackCategory[] = Object.freeze(
  FEEDBACK_CATEGORY_ORDER.filter((category) => category !== "CRASH"),
);

/**
 * The statuses a report can be sent back for **rework** from (§3.4): everything the team
 * has answered — `IN_EVALUATION`, `NEEDS_LIVE_TEST`, `POSTPONED`, `DONE`, `WONT_DO`. On
 * these the server reopens the row when the body grows by a rework block; on `OPEN` /
 * `IN_PROGRESS` there is nothing to send back yet.
 */
export const FEEDBACK_REWORKABLE_STATUSES: readonly FeedbackStatus[] = Object.freeze([
  "IN_EVALUATION",
  "NEEDS_LIVE_TEST",
  "POSTPONED",
  "DONE",
  "WONT_DO",
] as const);

/**
 * The statuses in which the AUTHOR may still edit title, body and category (§3.4,
 * keksdose `canAuthorEdit`, `feedback-page.tsx:398`): `OPEN` and `IN_PROGRESS`. Once the
 * team has answered, the description is what they answered and stays as it was; a
 * correction goes in as a rework.
 */
export const FEEDBACK_AUTHOR_EDITABLE_STATUSES: readonly FeedbackStatus[] = Object.freeze([
  "OPEN",
  "IN_PROGRESS",
] as const);

/**
 * The two statuses that wait on the person triaging: answered and handed back for a
 * verdict, or answered and only checkable on a deployed build (keksdose
 * `AWAITING_VERDICT`, live #330). The phone's "Only what is waiting for you" toggle
 * narrows the inbox to exactly these (§4.3).
 */
export const FEEDBACK_AWAITING_STATUSES: readonly FeedbackStatus[] = Object.freeze([
  "IN_EVALUATION",
  "NEEDS_LIVE_TEST",
] as const);

/* ── The body (§3.4) ──────────────────────────────────────────────────────── */

/**
 * The path every app serves attachments under (§3.3), and a key after it. Keys are
 * OPAQUE (§3.5): keksdose and Kurvenschmiede content-address (`<sha12>.<ext>`), kastlan's
 * storage keys are `<uuid32>_<sha12>.<ext>` — so `[\w.-]+`, never a fixed hex shape.
 */
const ATTACHMENT_URL = /^\/api\/v1\/feedback\/attachments\/[\w.-]+$/;

/**
 * One file line in a body. The marker is deliberately narrow — this path and nothing
 * else, alone on its line — so no sentence a user writes can be mistaken for one
 * (keksdose live #291). It says `[screenshot]` for a PDF or a text log too: the name is
 * history, the format is contract.
 */
const ATTACHMENT_LINE = /^\[screenshot\]\s+(\/api\/v1\/feedback\/attachments\/[\w.-]+)\s*$/;

/**
 * The `--- REWORK <stamp> ---` rule a rework opens with. Anchored and whole-line for the
 * same reason as the file marker: "I did a REWORK --- honestly" is a sentence, not a
 * round. kastlan's folded `--- COMMENT <stamp> · <name> ---` blocks (§7.7) never match.
 */
const REWORK_RULE = /^---\s*REWORK\b.*---$/;

/** Any appended block's opening rule: a rework round, or a kastlan comment folded into
 *  the body by its one-time migration (§7.7). */
const BLOCK_RULE = /^---\s*(?:REWORK|COMMENT)\b.*---$/;

/** The body line for one uploaded attachment — what {@link appendRework} writes under
 *  the note. */
export function feedbackAttachmentLine(url: string): string {
  return `[screenshot] ${url}`;
}

/**
 * A rework round appended to a body — the exact text `PATCH /feedback/{id}` takes as the
 * new `body` (§3.4; keksdose `submitRework`, `feedback-page.tsx:350`):
 *
 * ```text
 * <old body>\n\n--- REWORK 2026-10-04 09:12 ---\n<note>\n[screenshot] /api/v1/feedback/attachments/<key>
 * ```
 *
 * - The stamp is UTC, `YYYY-MM-DD HH:MM` (`toISOString().slice(0, 16)`), from `now`.
 * - The old body is kept byte for byte, so the result STRICTLY EXTENDS it — which is
 *   how the server recognises an append and reopens an answered row (keksdose
 *   `_is_rework_append`, live #331). `\n\n` is left out when the old body is `""`.
 * - ONE file per round (`url`), uploaded first by the caller: a body appended without
 *   it would be a rework whose evidence never arrived.
 *
 * **Returns `null` when the trimmed note is empty** — a file alone cannot be sent
 * (keksdose `:577`). Null rather than a throw because an empty note is something a
 * person does, not a bug, and the type then makes every caller decide what an empty
 * box means before anything can reach the PATCH.
 *
 * **Throws a `TypeError` when `url` is not an attachment URL** of the contract's shape
 * (`/api/v1/feedback/attachments/<key>`): that one IS a bug — the upload handed back
 * something foreign — and written anyway it would sit in the body as prose that no
 * reader recognises as a file.
 */
export function appendRework(
  body: string,
  note: string,
  url?: string | null,
  now: Date = new Date(),
): string | null {
  const text = note.trim();
  if (!text) return null;
  if (url && !ATTACHMENT_URL.test(url)) {
    throw new TypeError(`appendRework: not a feedback attachment URL: ${url}`);
  }
  const stamp = now.toISOString().slice(0, 16).replace("T", " ");
  const block = `--- REWORK ${stamp} ---\n${url ? `${text}\n${feedbackAttachmentLine(url)}` : text}`;
  return body ? `${body}\n\n${block}` : block;
}

/**
 * How many times a report has been sent back — the count of `--- REWORK … ---` rule
 * lines in its body (keksdose live #331: the "category for items in rework", derived
 * rather than stored, so nothing can forget to set it or leave it set). Folded kastlan
 * comments do not count.
 */
export function reworkCount(body: string): number {
  let n = 0;
  for (const line of body.split("\n")) if (REWORK_RULE.test(line.trim())) n += 1;
  return n;
}

/**
 * A body split into the prose to render and the files to show beside it, in body order.
 *
 * The file lines are stripped from the text: they are a location, not something anybody
 * wrote, and left in they would put a raw URL in the middle of a sentence. Trailing blank
 * lines go (what a stripped marker leaves at the end of a note); every blank line between
 * paragraphs stays.
 */
export function splitBodyAttachments(body: string): { text: string; urls: string[] } {
  const urls: string[] = [];
  const kept: string[] = [];
  for (const line of body.split("\n")) {
    const match = ATTACHMENT_LINE.exec(line.trim());
    if (match) urls.push(match[1]);
    else kept.push(line);
  }
  return { text: kept.join("\n").replace(/\n+$/, ""), urls };
}

/** A body cut where its first appended block begins. */
function cutAtFirstBlock(body: string): { head: string; appended: string } {
  const lines = body.split("\n");
  const at = lines.findIndex((line) => BLOCK_RULE.test(line.trim()));
  if (at === -1) return { head: body, appended: "" };
  return { head: lines.slice(0, at).join("\n"), appended: lines.slice(at).join("\n") };
}

/**
 * The ORIGINAL description, apart from everything appended to it since (§4.4.1).
 *
 * - `description` — what the author wrote when filing, without its file lines and
 *   trailing blank lines: the text the "Edit description" editor holds.
 * - `appended` — every `--- REWORK … ---` round and folded `--- COMMENT … ---` block,
 *   from the first one's rule line to the end, verbatim (`""` when there are none).
 *
 * keksdose's editor edits the raw body (`initial={fb.body}`, `feedback-page.tsx:420`), so
 * an author tidying a typo could delete the rework history and the file lines with it.
 * The kit's editor holds `description` only and saves through
 * {@link replaceDescription}, which puts the rest back unchanged.
 */
export function splitDescription(body: string): { description: string; appended: string } {
  const { head, appended } = cutAtFirstBlock(body);
  return { description: splitBodyAttachments(head).text, appended };
}

/**
 * The body with its original description replaced and everything else kept — the file
 * lines of the original part (after the new text, in their order) and the appended
 * blocks (verbatim, after a blank line). The new text is trimmed; clearing it saves the
 * rest alone (`""` when there is no rest).
 *
 * `replaceDescription(body, splitDescription(body).description)` gives back a canonical
 * body unchanged — a trimmed description, then each block after one blank line, as the
 * dialog and {@link appendRework} write them.
 */
export function replaceDescription(body: string, description: string): string {
  const { head, appended } = cutAtFirstBlock(body);
  const files = splitBodyAttachments(head).urls.map(feedbackAttachmentLine);
  const text = description.trim();
  const top = [...(text ? [text] : []), ...files].join("\n");
  if (!appended) return top;
  return top ? `${top}\n\n${appended}` : appended;
}

/**
 * Whether an attachment URL is a picture (keksdose dev #578). The upload route takes
 * PDFs and text logs too and serves them as downloads, never inline, so an `<img>` on
 * one shows a broken icon. The key's extension is the server's own statement of the
 * type (minted from the sniffed content), so it is the thing to read.
 */
export function isImageAttachment(url: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(url);
}

/** The file name an attachment downloads as — its key, the last segment of the URL. */
export function attachmentName(url: string): string {
  return url.slice(url.lastIndexOf("/") + 1);
}
