import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Download, ExternalLink, FileText, RotateCcw } from "lucide-react";
import { AuthedImage } from "../components/authed-image";
import { CopyButton } from "../components/copy-button";
import { TextLink } from "../components/text-link";
import { toast } from "../components/toast";
import { Button } from "../components/ui";
import type { AuthedFetcher } from "../hooks/use-authed-src";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { formatDate } from "../lib/format";
import { DEFAULT_MAX_ATTACHMENT_BYTES } from "./feedback-attachment";
import { DEFAULT_FEEDBACK_DIALOG_LABELS } from "./feedback-dialog";
import {
  FeedbackDetail,
  FeedbackDetailSection,
  FeedbackNoteEditor,
  FeedbackProse,
  FeedbackStatusTransitions,
  selectableFeedbackStatuses,
  visibleFeedbackStatuses,
} from "./feedback-inbox";
import type { FeedbackNoteAttachment, FeedbackStatus } from "./feedback-inbox";
import { useFeedbackToastLabels } from "./feedback-labels";
import {
  FEEDBACK_ATTACHMENT_ACCEPT,
  FEEDBACK_AUTHOR_EDITABLE_STATUSES,
  FEEDBACK_REWORKABLE_STATUSES,
  appendRework,
  attachmentName,
  isImageAttachment,
  replaceDescription,
  splitBodyAttachments,
  splitDescription,
} from "./feedback-record";
import type { FeedbackContext, FeedbackRecord } from "./feedback-record";
import { useFeedbackStatusUndo } from "./feedback-status-undo";
import type { FeedbackStatusChange } from "./feedback-status-undo";

/**
 * One report, opened — the panel a feedback table unfolds under its row (§4.4 of
 * docs/feedback-harmonization.md), lifted from keksdose's `FeedbackRow`
 * (`frontend/src/features/feedback/feedback-page.tsx:329-612`) with the contract's
 * changes applied.
 *
 * Until 0.27 each app wrote this panel itself out of the kit's shell
 * (`FeedbackDetail` / `FeedbackDetailSection` / `FeedbackNoteEditor`), and the three
 * copies had drifted in exactly the places a user notices:
 *
 * - **the description editor held the raw body** — keksdose `initial={fb.body}`
 *   (`:420`), kastlan the same (`pages/feedback-page.tsx:226`) — so an author fixing a
 *   typo could delete the `--- REWORK … ---` rounds and the `[screenshot]` file lines
 *   with it, and the history was gone. Here the editor holds the ORIGINAL description
 *   only ({@link splitDescription}) and saves through {@link replaceDescription}, which
 *   puts every appended block and file line back unchanged;
 * - **kastlan's rework sent `status: "OPEN"`** from the client (`:189-195`) and offered it
 *   on three statuses; keksdose sends the body alone and lets the server reopen the row
 *   on five (live #331). The contract is keksdose's (§3.4) — {@link appendRework}, one
 *   file, the server reopens;
 * - **kastlan showed only `screenshot_url`** (`:265-276`) and no downloads; keksdose the
 *   screenshot, the other files and the rework pictures, a PDF as a download (dev #578);
 * - **the URL fell away on Kurvenschmiede's rows**, whose backfilled `context.url` is a
 *   path (`/accounts?p=2`): keksdose's `new URL(…)` throws on one and the section
 *   vanished. kastlan already fell back to `context.route` (`feedbackRaw`, `:97`).
 *
 * The sections, in the contract's order: **Description** (the body; the author's
 * Edit while OPEN / IN_PROGRESS), **URL**, **Attachment**, **Outcome** (the admin's
 * outcome editor, Rework, Open page), **Send for rework** (only while reworking) and
 * **Status**. No comment thread (§2.2: kastlan's comments fold into the body, §7.7).
 *
 * The app keeps its data and its API: the row it renders, the PATCH (`onUpdate`), the
 * upload (`onUpload`), the authenticated GET (`fetcher`) and who is looking (`canEdit`,
 * `viewerId`). Every word is the kit's `feedbackDetail` namespace.
 */

/* ── Labels ───────────────────────────────────────────────────────────────── */

/**
 * `feedbackDetail` — the row detail's words (§4.4). English: keksdose's `en.json`
 * (`feedback.*`, `common.*`, `more.copy_url`) with the contract's changes; the de-CH
 * canon (keksdose `de-CH.json`, ss never ß, "Nacharbeit" throughout — §7.14) on each key.
 */
export interface FeedbackDetailLabels {
  /** Section 1's heading — keksdose's `feedback.body` (§7.3). The dialog's field asks
   *  "What happened? (optional)"; the description, once filed, is headed as what it is
   *  — and as the author's "Edit description" calls it. de-CH: "Beschreibung" */
  body: string;
  /** The author's button on that heading. de-CH: "Bearbeiten" */
  edit: string;
  /** Its accessible name — says WHAT is edited; contains the visible word.
   *  de-CH: "Beschreibung bearbeiten" */
  editDescription: string;
  /** The editors' save button (description, outcome). de-CH: "Speichern" */
  save: string;
  /** Every editor's cancel button. de-CH: "Abbrechen" */
  cancel: string;
  /** Section 2's heading. de-CH: "URL" */
  url: string;
  /** The copy button beside the link — copies the FULL `context.url`.
   *  de-CH: "URL kopieren" */
  copyUrl: string;
  /** Section 3's heading, and each picture's alt text. de-CH: "Anhang" */
  attachment: string;
  /** A PDF's / text file's download button, given the file's name.
   *  de-CH: "{{name}} herunterladen" */
  download: (name: string) => string;
  /** The toast when that download failed. de-CH: "Der Anhang konnte nicht
   *  heruntergeladen werden." */
  downloadFailed: string;
  /** Section 4's heading. de-CH: "Ergebnis" */
  outcome: string;
  /** On section 4's heading line once the row is settled, given the formatted
   *  `resolved_at` date. de-CH: "Erledigt am: {{date}}" */
  resolvedAt: (date: string) => string;
  /** The admin's button while there is no outcome. de-CH: "Ergebnis hinzufügen" */
  outcomeAdd: string;
  /** The same button once there is one. de-CH: "Aktualisieren" */
  outcomeUpdate: string;
  /** The line above the outcome editor. de-CH: "Was wurde umgesetzt, entschieden oder
   *  warum nicht." */
  outcomePlaceholder: string;
  /** The button that opens section 5 on an answered row. de-CH: "Nacharbeit" */
  rework: string;
  /** The link to the page the report was filed on. de-CH: "Seite öffnen" */
  openPage: string;
  /** Section 5's heading. de-CH: "Zur Nacharbeit senden" */
  reworkTitle: string;
  /** Section 5's send button. de-CH: "Nacharbeit senden" */
  reworkSend: string;
  /** The line above the rework note. de-CH: "Was muss noch angepasst werden? Neue
   *  Anforderungen oder Richtungswechsel." */
  reworkPlaceholder: string;
  /** The toast when the rework's file did not upload — and so nothing was sent. Names
   *  no screenshot: it fires for a PDF or a log too (§7.14; keksdose's said
   *  "screenshot"). de-CH: "Die Datei konnte nicht hochgeladen werden. Die Nacharbeit
   *  wurde nicht gesendet." */
  reworkUploadFailed: string;
  /** Section 6's heading. de-CH: "Status" */
  status: string;
}

export const DEFAULT_FEEDBACK_DETAIL_LABELS: FeedbackDetailLabels = {
  body: "Description",
  edit: "Edit",
  editDescription: "Edit description",
  save: "Save",
  cancel: "Cancel",
  url: "URL",
  copyUrl: "Copy URL",
  attachment: "Attachment",
  download: (name) => `Download ${name}`,
  downloadFailed: "The attachment could not be downloaded.",
  outcome: "Outcome",
  resolvedAt: (date) => `Resolved: ${date}`,
  outcomeAdd: "Add outcome",
  outcomeUpdate: "Update",
  outcomePlaceholder: "What was done, decided, or why this won't be addressed.",
  rework: "Rework",
  openPage: "Open page",
  reworkTitle: "Send for rework",
  reworkSend: "Send rework",
  reworkPlaceholder: "What still needs refinement? Any new constraints or change of direction.",
  reworkUploadFailed: "The file could not be uploaded. The rework was not sent.",
  status: "Status",
};

/** `feedbackDetail` resolved: English, then `<UiKitProvider labels>`, then `labels`. */
export function useFeedbackDetailLabels(labels?: Partial<FeedbackDetailLabels>): FeedbackDetailLabels {
  return useKitLabels("feedbackDetail", DEFAULT_FEEDBACK_DETAIL_LABELS, labels);
}

/* ── The page a report was filed on (§3.2, §4.4.2) ────────────────────────── */

/** `context.url`, else `context.route` — a parsed URL, or null when neither is set or
 *  the value is no http(s) address or path (a `javascript:` value is not a page). */
function parsePage(context: FeedbackContext | null | undefined): URL | null {
  const raw = (context?.url || context?.route || "").trim();
  if (!raw) return null;
  try {
    // A base, so a PATH-ONLY value parses too: Kurvenschmiede backfills its old rows
    // with `url = page_path + search` (§3.2), and keksdose's `new URL(raw)` threw on
    // those and dropped the section.
    const url = new URL(raw, "http://localhost");
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Collapses a leading `//` run: `/\/\/evil.example/` as a path would be a
 *  protocol-relative link off the app. */
const localPath = (pathname: string) => pathname.replace(/^\/{2,}/, "/");

/**
 * The in-app link to the page a report was filed on — path + query + hash (keksdose
 * `localHref`: the query and hash carry the state worth restoring, `?tab=import`, a
 * drill-down). Read from `context.url`, else `context.route`; a path-only `url` works.
 * Always a path on THIS app, never another origin's address, so it is safe as an
 * `href` whatever the row says. `null` when there is nothing to link.
 */
export function feedbackPageHref(context: FeedbackContext | null | undefined): string | null {
  const url = parsePage(context);
  return url ? `${localPath(url.pathname)}${url.search}${url.hash}` : null;
}

/** The page's path alone — the compact text a URL column shows (§4.3). */
export function feedbackPagePath(context: FeedbackContext | null | undefined): string | null {
  const url = parsePage(context);
  return url ? localPath(url.pathname) : null;
}

/**
 * What "Copy URL" copies: the FULL `context.url` as the reporter's browser had it —
 * origin included, which is the one part that says which copy of the app it was
 * (feedback #278) — else `context.route`. `null` when there is no page.
 */
export function feedbackPageUrl(context: FeedbackContext | null | undefined): string | null {
  if (!parsePage(context)) return null;
  return (context?.url || context?.route || "").trim();
}

/* ── Attachments (§3.5, §4.4.3) ───────────────────────────────────────────── */

/**
 * Every file a report carries, in the order the detail shows them (§4.4.3): the
 * screenshot it was filed with, then its other files, then whatever the rework rounds
 * brought, in body order (keksdose dev #578, live #291). One list rather than three —
 * a reader looking for "the picture" should not have to know at which point in the
 * conversation it was taken.
 *
 * Each URL once: keksdose and Kurvenschmiede content-address their keys, so the same
 * screenshot pasted twice is one URL — shown twice it is the same picture twice (and,
 * keyed by URL, a React key clash keksdose had).
 */
export function feedbackAttachmentUrls(
  row: Pick<FeedbackRecord, "screenshot_url" | "attachment_urls" | "body">,
): string[] {
  const urls = [
    ...(row.screenshot_url ? [row.screenshot_url] : []),
    // `?? []`: NULL on rows filed before the column, and no key at all from a server
    // that predates it (keksdose dev #578).
    ...(row.attachment_urls ?? []),
    ...splitBodyAttachments(row.body).urls,
  ];
  return [...new Set(urls)];
}

/** The bytes behind a fetcher's answer — a `Blob` as it is, a `Response` checked. */
async function toBlob(answer: Blob | Response): Promise<Blob> {
  if (typeof Response !== "undefined" && answer instanceof Response) {
    if (!answer.ok) throw new Error(`HTTP ${answer.status}`);
    return answer.blob();
  }
  return answer as Blob;
}

/** No fetcher: the browser's own `fetch`, with the cookies a same-origin app uses. */
const plainFetch: AuthedFetcher = (url, { signal }) => fetch(url, { signal, credentials: "same-origin" });

/**
 * A PDF or a text log (keksdose `FeedbackFileDownload`, dev #578): the bytes sit behind
 * an authenticated route that serves them as `attachment`, never inline (§3.5), so a
 * plain link would be a 401 the moment it was opened. Fetched through the app's
 * fetcher and handed to a synthetic anchor; a failure says so in a toast.
 */
function AttachmentDownload({
  url,
  fetcher,
  labels,
}: {
  url: string;
  fetcher: AuthedFetcher;
  labels: FeedbackDetailLabels;
}) {
  const [busy, setBusy] = useState(false);
  const name = attachmentName(url);
  const download = async (event: MouseEvent) => {
    // The row around the detail may toggle on a click.
    event.stopPropagation();
    setBusy(true);
    try {
      const blob = await toBlob(await fetcher(url, { signal: new AbortController().signal }));
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = name;
      anchor.click();
      // After the click has handed the URL to the download, not before.
      setTimeout(() => URL.revokeObjectURL(href), 0);
    } catch {
      toast.error(labels.downloadFailed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      pending={busy}
      onClick={(event) => void download(event)}
      aria-label={labels.download(name)}
      className="max-w-full"
    >
      <FileText className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 max-w-[14rem] truncate">{name}</span>
      <Download className="size-3.5 shrink-0" aria-hidden />
    </Button>
  );
}

/* ── Who may do what (§3.4, §4.3, §4.4) ───────────────────────────────────── */

/** What the person looking at a row may do with it — {@link feedbackRowAccess}. */
export interface FeedbackRowAccess {
  /** The viewer filed it (`viewerId === row.user_id`; never for an erased author). */
  isAuthor: boolean;
  /** "Edit description": the author, while the row is OPEN or IN_PROGRESS — on either
   *  page (keksdose `canAuthorEdit`, `feedback-page.tsx:398`, is not gated on `mine`). */
  canEditDescription: boolean;
  /** The outcome editor: the admin on the inbox (`canEdit`). */
  canEditOutcome: boolean;
  /** "Rework": the admin or the author, on an answered row
   *  ({@link FEEDBACK_REWORKABLE_STATUSES}) — §3.4, anyone else gets the server's 403. */
  canRework: boolean;
  /** The status pills: the admin on the inbox; everyone else sees them read-only. */
  canChangeStatus: boolean;
}

/**
 * The detail's permission rules in one place — the same answers the server gives
 * (§3.4), so the panel never offers what the PATCH would refuse.
 *
 * `canEdit` is the app's "admin on `/feedback`": an admin on `/my-feedback` edits no
 * status and no outcome there (§4.3), but as the author still edits the description
 * and sends for rework. `viewerId` is the signed-in user's id.
 */
export function feedbackRowAccess(
  row: Pick<FeedbackRecord, "user_id" | "status">,
  { canEdit, viewerId }: { canEdit: boolean; viewerId?: number | null },
): FeedbackRowAccess {
  // `user_id: null` is an erased author (keksdose live #275): nobody is that author,
  // least of all a viewer whose id happens to be missing too.
  const isAuthor = row.user_id !== null && viewerId !== undefined && viewerId !== null && viewerId === row.user_id;
  return {
    isAuthor,
    canEditDescription: isAuthor && FEEDBACK_AUTHOR_EDITABLE_STATUSES.includes(row.status),
    canEditOutcome: canEdit,
    canRework: (canEdit || isAuthor) && FEEDBACK_REWORKABLE_STATUSES.includes(row.status),
    canChangeStatus: canEdit,
  };
}

/* ── The PATCH ─────────────────────────────────────────────────────────────── */

/** What the detail sends as `PATCH /feedback/{id}` (§3.4): the body (a description
 *  edit, a rework append) or the outcome — and, through {@link useFeedbackStatusUndo}
 *  when no `statusChange` is given, the status. Never two at once: a rework PATCH must
 *  carry the body ALONE for the server to read it as an append (keksdose live #331). */
export interface FeedbackDetailPatch {
  id: number;
  body?: string;
  /** `null` clears it — a real edit. */
  outcome?: string | null;
  status?: FeedbackStatus;
}

/**
 * The page's update mutation. **TanStack Query's `mutate` fits as it stands** — pass
 * `update.mutate` (and `pending={update.isPending}`), the same function
 * `useFeedbackStatusUndo` takes. A hand-written one sends the PATCH and calls
 * `onSuccess` once it has landed, and only then: that is when an editor closes. A
 * failure is the mutation's own to toast — the server's `detail`, else
 * `feedbackToast.updateFailed` (§4.4) — and leaves the editor open with its draft.
 */
export type FeedbackDetailUpdate = (patch: FeedbackDetailPatch, callbacks: { onSuccess: () => void }) => void;

/** `POST /feedback/attachments` (§3.3): one file up, its URL
 *  (`/api/v1/feedback/attachments/<key>`) back. Reject on failure. */
export type FeedbackUpload = (file: File) => Promise<string>;

/* ── Send for rework (§4.4.5) ─────────────────────────────────────────────── */

export interface FeedbackReworkSectionProps {
  /** The row being sent back: its id, and the body the round is appended to. */
  row: Pick<FeedbackRecord, "id" | "body">;
  /** The PATCH — see {@link FeedbackDetailUpdate}. Called with `{ id, body }` only. */
  onUpdate: FeedbackDetailUpdate;
  /** The PATCH is in flight (`update.isPending`). The upload adds its own. */
  pending?: boolean;
  /** The upload. Left out, the note goes without a file field. */
  onUpload?: FeedbackUpload;
  /** Snapshot the app view as a File — the kit's `captureAppScreenshot`, or the app's
   *  own. A "Capture screenshot" button appears only with it; a rejection (no
   *  `modern-screenshot`, a canvas that would not draw) toasts
   *  `feedbackToast.captureFailed` and adds nothing. */
  onCaptureScreenshot?: () => Promise<File | null>;
  /** The round landed — the server has the note and, on an answered row, reopened it. */
  onSent?: () => void;
  onCancel: () => void;
  /** Over the field's defaults: the contract's types and 10 MB (§3.5), the
   *  `feedbackToast` refusals, the `feedbackAttachment` words. */
  attachment?: Partial<FeedbackNoteAttachment>;
  /** The send COMMITS — see `FeedbackNoteEditor`'s `commit`. */
  commit?: boolean;
  labels?: Partial<FeedbackDetailLabels>;
}

/**
 * The rework editor (§4.4.5): the submitter — or the admin — sends an answered report
 * back with a note and at most one file, and the server reopens it (§3.4, keksdose
 * `submitRework`, `feedback-page.tsx:350`).
 *
 * - **The note is required** and trimmed: Send stays disabled on a blank box (a file
 *   alone cannot be sent; keksdose `:577` dropped that click silently).
 * - **One file**, added, captured or pasted — the dialog's types and 10 MB. It is
 *   uploaded FIRST and awaited: a body naming a file that never arrived would be a
 *   rework whose evidence is missing, and the upload is the half that fails on its
 *   own. If it fails nothing is sent and the toast says so; the note stays in the box.
 * - **The body alone goes in the PATCH** — {@link appendRework}'s strict extension of
 *   the current body, which is how the server recognises the append and reopens the
 *   row. Never a `status` (kastlan's client sent `OPEN`; an author may not write one,
 *   so the server refused the whole PATCH, note and all — keksdose live #331).
 *
 * Exported on its own for an app that offers rework somewhere other than the row
 * detail. Kurvenschmiede's author verdict ("That is it, done") is NOT here: an answered
 * item stays answered unless its author sends it back (§7.2).
 */
export function FeedbackReworkSection({
  row,
  onUpdate,
  pending = false,
  onUpload,
  onCaptureScreenshot,
  onSent,
  onCancel,
  attachment,
  commit,
  labels: labelsProp,
}: FeedbackReworkSectionProps) {
  const labels = useFeedbackDetailLabels(labelsProp);
  const toasts = useFeedbackToastLabels();
  const [uploading, setUploading] = useState(false);
  // The body as it is NOW, not as it was when Send was pressed: the list can refresh
  // while the file uploads, and an append to a stale body is no longer a strict
  // extension of the stored one — the server would read it as an edit, and refuse it.
  const latestBody = useRef(row.body);
  useEffect(() => {
    latestBody.current = row.body;
  }, [row.body]);

  const capture = onCaptureScreenshot
    ? async () => {
        try {
          return await onCaptureScreenshot();
        } catch {
          toast.error(toasts.captureFailed);
          return null;
        }
      }
    : undefined;

  const send = async (value: string, file?: File | null) => {
    const note = value.trim();
    if (!note) return;
    let url: string | null = null;
    if (file && onUpload) {
      setUploading(true);
      try {
        url = await onUpload(file);
      } catch {
        toast.error(labels.reworkUploadFailed);
        return;
      } finally {
        setUploading(false);
      }
    }
    let body: string | null;
    try {
      body = appendRework(latestBody.current, note, url);
    } catch {
      // The upload answered with something that is not an attachment URL of this
      // contract — written anyway it would sit in the body as prose no reader knows to
      // be a file. As far as the person is concerned, the file did not arrive.
      toast.error(labels.reworkUploadFailed);
      return;
    }
    if (body === null) return;
    onUpdate({ id: row.id, body }, { onSuccess: () => onSent?.() });
  };

  return (
    <FeedbackDetailSection title={labels.reworkTitle}>
      <FeedbackNoteEditor
        key={row.id}
        initial=""
        required
        commit={commit}
        pending={pending || uploading}
        onSave={(value, file) => void send(value, file)}
        onCancel={onCancel}
        saveLabel={labels.reworkSend}
        cancelLabel={labels.cancel}
        placeholder={labels.reworkPlaceholder}
        attachment={
          onUpload
            ? {
                accept: FEEDBACK_ATTACHMENT_ACCEPT,
                maxBytes: DEFAULT_MAX_ATTACHMENT_BYTES,
                onError: (kind) => {
                  toast.error(kind === "type" ? toasts.attachmentUnsupported : toasts.attachmentTooLarge);
                },
                onCaptureScreenshot: capture,
                ...attachment,
              }
            : undefined
        }
      />
    </FeedbackDetailSection>
  );
}

/* ── The detail (§4.4) ─────────────────────────────────────────────────────── */

export interface FeedbackRowDetailProps {
  /** The report — the list's own row, as `GET /feedback` / `GET /feedback/my` sent it. */
  row: FeedbackRecord;
  /** The admin on the inbox (`/feedback`): status pills and the outcome editor. `false`
   *  on `/my-feedback`, for an admin too (§4.3). */
  canEdit: boolean;
  /** The signed-in user's id — who the AUTHOR is: the description editor and rework. */
  viewerId?: number | null;
  /** The page's PATCH — `update.mutate` (see {@link FeedbackDetailUpdate}). */
  onUpdate: FeedbackDetailUpdate;
  /** `update.isPending`: the editors' save buttons wait for it. */
  pending?: boolean;
  /** `POST /feedback/attachments` for the rework's one file. Left out, a rework is a
   *  note alone. */
  onUpload?: FeedbackUpload;
  /** The app's authenticated GET (`AuthedImage`'s) — the pictures and the downloads go
   *  through it, since the attachment route wants the bearer token (§3.5). Left out,
   *  the browser's own fetch with same-origin cookies. */
  fetcher?: AuthedFetcher | null;
  /**
   * The undoable status change — what `useFeedbackStatusUndo(update.mutate)` returns,
   * the SAME one the table's status cell and the swipes use (§4.5). Left out, the
   * detail builds one from `onUpdate`, which is equivalent as long as `onUpdate` is the
   * page's mutation (its observer outlives the row a status filter removes).
   */
  statusChange?: FeedbackStatusChange;
  /** For the rework's "Capture screenshot" — see {@link FeedbackReworkSectionProps}. */
  onCaptureScreenshot?: () => Promise<File | null>;
  /** The rework's file field, over the contract's defaults. */
  reworkAttachment?: Partial<FeedbackNoteAttachment>;
  /** How the `resolved_at` date reads — the app's date cell, as a string. Default: the
   *  kit's `formatDate` in the provider's locale, `medium` style. */
  renderDate?: (iso: string) => string;
  /**
   * The detail's saves COMMIT (description, outcome, rework, status): under a locked
   * `WriteLockProvider` each is `aria-disabled` with the lock's reason, and nothing
   * reaches `onUpdate`. Off by default — keksdose's shell lock is a read-only demo
   * BUDGET, and a person viewing one still owns their own reports.
   */
  commit?: boolean;
  labels?: Partial<FeedbackDetailLabels>;
  className?: string;
}

/**
 * The expanded row of a feedback table (§4.4): what was reported, where, with which
 * files, what the answer was, and where it stands — with the edits each viewer may
 * make. Hand it to `DataTable`'s `expandedRow`:
 *
 * ```tsx
 * const update = useMutation({ mutationFn: ({ id, ...patch }) => api.updateFeedback(id, patch),
 *   onSuccess: invalidate, onError: (e) => toast.error(detailOf(e) ?? toastLabels.updateFailed) });
 * const changeStatus = useFeedbackStatusUndo(update.mutate);
 * <DataTable
 *   isExpanded={(row) => expandedId === row.id}
 *   expandedRow={(row) => (
 *     <FeedbackRowDetail row={row} canEdit={isAdmin && !mine} viewerId={user?.id}
 *       onUpdate={update.mutate} pending={update.isPending} statusChange={changeStatus}
 *       onUpload={api.uploadFeedbackAttachment} fetcher={authedImageFetcher}
 *       onCaptureScreenshot={captureAppScreenshot} />
 *   )} … />
 * ```
 *
 * Mounted only while its row is expanded, so which editor is open lives here, and
 * collapsing the row closes it. Each editor is keyed by the row's id, so a draft is
 * never thrown away by a list refresh under it.
 */
export function FeedbackRowDetail({
  row,
  canEdit,
  viewerId,
  onUpdate,
  pending = false,
  onUpload,
  fetcher,
  statusChange,
  onCaptureScreenshot,
  reworkAttachment,
  renderDate,
  commit,
  labels: labelsProp,
  className,
}: FeedbackRowDetailProps) {
  const labels = useFeedbackDetailLabels(labelsProp);
  // "placeholder = the dialog's body label" (§4.4.1): read from the dialog's own
  // namespace, so the two can never say different things.
  const dialogText = useKitLabels("feedbackDialog", DEFAULT_FEEDBACK_DIALOG_LABELS);
  const locale = useKitLocale();
  const ownStatusChange = useFeedbackStatusUndo(onUpdate);
  const changeStatus = statusChange ?? ownStatusChange;
  const [editingBody, setEditingBody] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState(false);
  const [reworking, setReworking] = useState(false);

  const access = feedbackRowAccess(row, { canEdit, viewerId });
  // The body as written, without its file lines (they are shown as files below) — the
  // rework rounds stay in the prose: they are what was said after the answer.
  const bodyText = splitBodyAttachments(row.body).text;
  const { description } = splitDescription(row.body);
  const pageHref = feedbackPageHref(row.context);
  const pageUrl = feedbackPageUrl(row.context);
  const files = feedbackAttachmentUrls(row);
  const fetchFile = fetcher ?? plainFetch;
  const dateText = (iso: string) => (renderDate ? renderDate(iso) : formatDate(iso, "medium", { locale }));

  const saveDescription = (value: string) => {
    // Only a real change makes a round trip; clearing it is one ("" — the description
    // is optional, §7.4), and the rounds and file lines go back unchanged.
    if (value.trim() === description.trim()) {
      setEditingBody(false);
      return;
    }
    onUpdate({ id: row.id, body: replaceDescription(row.body, value) }, { onSuccess: () => setEditingBody(false) });
  };

  const saveOutcome = (value: string) => {
    // Blank saves `null`: no outcome, rather than an empty one.
    const next = value.trim() ? value.trim() : null;
    if (next === row.outcome) {
      setEditingOutcome(false);
      return;
    }
    onUpdate({ id: row.id, outcome: next }, { onSuccess: () => setEditingOutcome(false) });
  };

  const showOutcomeEditor = access.canEditOutcome && editingOutcome;
  const showRework = access.canRework && reworking;

  return (
    <FeedbackDetail className={className}>
      <FeedbackDetailSection
        title={labels.body}
        action={
          access.canEditDescription && !editingBody ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                setEditingBody(true);
              }}
              aria-label={labels.editDescription}
            >
              {labels.edit}
            </Button>
          ) : undefined
        }
      >
        {access.canEditDescription && editingBody ? (
          <FeedbackNoteEditor
            key={row.id}
            // The ORIGINAL description only — see the module note.
            initial={description}
            pending={pending}
            commit={commit}
            onSave={saveDescription}
            onCancel={() => setEditingBody(false)}
            saveLabel={labels.save}
            cancelLabel={labels.cancel}
            placeholder={dialogText.bodyOptional ?? dialogText.body}
          />
        ) : (
          <FeedbackProse>{bodyText.trim() ? bodyText : undefined}</FeedbackProse>
        )}
      </FeedbackDetailSection>

      {pageHref && pageUrl && (
        // The page it was filed on, with the full URL a click away (keksdose #278).
        <FeedbackDetailSection title={labels.url}>
          <div className="flex min-w-0 items-center gap-1.5">
            <TextLink href={pageHref} tone="secondary" underline="hover" stopPropagation className="min-w-0">
              <code className="break-all text-xs">{pageHref}</code>
            </TextLink>
            <CopyButton size="xs" className="shrink-0" text={pageUrl} label={labels.copyUrl} stopPropagation />
          </div>
        </FeedbackDetailSection>
      )}

      {files.length > 0 && (
        <FeedbackDetailSection title={labels.attachment}>
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            {files.map((url) =>
              isImageAttachment(url) ? (
                <AuthedImage
                  key={url}
                  src={url}
                  alt={labels.attachment}
                  fetcher={fetchFile}
                  link
                  stopPropagation
                  // A broken attachment is simply not in the row (keksdose's
                  // AuthedImage default) rather than a grey tile per failure.
                  errorFallback={null}
                  wrapperClassName="inline-block max-w-full"
                  className="max-h-64 max-w-full rounded border border-[var(--border)]"
                />
              ) : (
                <AttachmentDownload key={url} url={url} fetcher={fetchFile} labels={labels} />
              ),
            )}
          </div>
        </FeedbackDetailSection>
      )}

      <FeedbackDetailSection
        title={labels.outcome}
        // When the row entered DONE / WONT_DO (keksdose feedback #96).
        action={
          row.resolved_at ? (
            <span className="text-xs text-[var(--text-muted)]">{labels.resolvedAt(dateText(row.resolved_at))}</span>
          ) : undefined
        }
      >
        {showOutcomeEditor ? (
          <FeedbackNoteEditor
            key={row.id}
            initial={row.outcome ?? ""}
            pending={pending}
            commit={commit}
            onSave={saveOutcome}
            onCancel={() => setEditingOutcome(false)}
            saveLabel={labels.save}
            cancelLabel={labels.cancel}
            placeholder={labels.outcomePlaceholder}
          />
        ) : (
          <div className="space-y-2">
            <FeedbackProse>{row.outcome || undefined}</FeedbackProse>
            {(access.canEditOutcome || (access.canRework && !reworking) || pageHref) && (
              <div className="flex flex-wrap gap-2">
                {access.canEditOutcome && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingOutcome(true);
                    }}
                  >
                    {row.outcome ? labels.outcomeUpdate : labels.outcomeAdd}
                  </Button>
                )}
                {access.canRework && !reworking && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      setReworking(true);
                    }}
                  >
                    <RotateCcw className="size-3.5" aria-hidden /> {labels.rework}
                  </Button>
                )}
                {pageHref && (
                  // A real href (keksdose dev #451): middle-click and ⌘/Ctrl-click are
                  // the browser's, and only a link has them.
                  <Button href={pageHref} variant="secondary" onClick={(event) => event.stopPropagation()}>
                    <ExternalLink className="size-3.5" aria-hidden /> {labels.openPage}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </FeedbackDetailSection>

      {showRework && (
        <FeedbackReworkSection
          row={row}
          onUpdate={onUpdate}
          pending={pending}
          onUpload={onUpload}
          onCaptureScreenshot={onCaptureScreenshot}
          onSent={() => setReworking(false)}
          onCancel={() => setReworking(false)}
          attachment={reworkAttachment}
          commit={commit}
          labels={labelsProp}
        />
      )}

      <FeedbackDetailSection title={labels.status}>
        {/* Expanded: the whole enum in one click for the admin (keksdose feedback #421);
            everyone else the narrow set, read-only — a picture of the workflow. */}
        <FeedbackStatusTransitions
          status={row.status}
          statuses={
            access.canChangeStatus ? selectableFeedbackStatuses(row.status) : visibleFeedbackStatuses(row.status)
          }
          canEdit={access.canChangeStatus}
          commit={commit}
          onPick={(status) => changeStatus(row, status)}
          variant="pill"
        />
      </FeedbackDetailSection>
    </FeedbackDetail>
  );
}
