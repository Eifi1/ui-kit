import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode, Ref } from "react";
import { Paperclip, Send } from "lucide-react";
import { cn } from "../lib/cn";
import { formatRelativeTime } from "../lib/format";
import { Button, EmptyState, Spinner, Textarea } from "../components/ui";
import { Skeleton } from "../components/skeleton";
import { Tooltip } from "../components/tooltip";
import { useKitFileLabels, useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { FeedbackAttachmentField } from "./feedback-attachment";
import type { FeedbackNoteAttachment } from "./feedback-inbox";
import type { FeedbackAttachmentLabels } from "./feedback-dialog";

/**
 * The conversation under a report: who said what, when, with what attached — and the
 * box to answer in.
 *
 * Both apps had written it by hand. kastlan's feedback page grew a comment list of
 * bordered boxes with `slate-*` literals (feedback-page.tsx, "keksdose left this
 * unbuilt"), and keksdose built the same thing a second time for support
 * (support-thread.tsx) with sides, bubbles and a composer that clears only what it
 * sent. This is that second one, generalised: the kit owns the look and the
 * behaviour, the app owns the data, the upload and every word it does not share.
 *
 * **Own vs other** is the caller's per message (`own`), not a comparison the kit makes
 * against a user id: whose message sits at the END side depends on who is reading,
 * and only the app knows that (keksdose's support thread labelled a member's question
 * "Du" in the admin panel the first time round, by reading the wrong field).
 *
 * **Redaction.** A thread is somebody's words about their own data — exactly what a
 * host's demo / screen-share mode blurs. Bodies, authors and attachments carry
 * `data-private` (the attribute `Tooltip redact` and `StatTile sensitive` use) unless
 * `redact={false}`.
 *
 * **RTL.** Sides are logical — `justify-end` is the reading end, and the bubble's
 * tucked corner is `rounded-ee` / `rounded-es` — and each body is `dir="auto"`, so a
 * Hebrew reply in an English thread (or the reverse) lays out as its own language.
 */

/* ── Labels ───────────────────────────────────────────────────────────────── */

/** The `feedbackThread` namespace of `<UiKitProvider labels>`. */
export interface FeedbackThreadLabels {
  /** Accessible name of the message list. */
  thread: string;
  empty: string;
  loading: string;
  /** Author line of an `own` message that has no `author` of its own. */
  you: string;
  /** The badge beside a `staff` author. */
  staff: string;
  /** Accessible name of a message's attachment list. */
  attachments: string;
}

export const DEFAULT_FEEDBACK_THREAD_LABELS: FeedbackThreadLabels = {
  thread: "Comments",
  empty: "No comments yet",
  loading: "Loading comments…",
  you: "You",
  staff: "Staff",
  attachments: "Attachments",
};

/** The `feedbackComposer` namespace of `<UiKitProvider labels>`. The attach buttons'
 *  words are `feedbackAttachment`'s, shared with the dialog and the note editor. */
export interface FeedbackComposerLabels {
  /** Accessible name of the text box. */
  field: string;
  placeholder: string;
  send: string;
  /** The shortcut line, given the platform's modifier ("Ctrl" or "⌘"). */
  sendHint: (modifier: string) => string;
}

export const DEFAULT_FEEDBACK_COMPOSER_LABELS: FeedbackComposerLabels = {
  field: "Write a comment",
  placeholder: "Write a comment…",
  send: "Send",
  sendHint: (modifier) => `${modifier} + Enter to send`,
};

/* ── Thread ───────────────────────────────────────────────────────────────── */

export interface FeedbackThreadAttachment {
  id?: string | number;
  name: string;
  /** Where to open it. Left out, the attachment is listed by name only. */
  url?: string;
  /** MIME type; an `image/*` with a `url` is shown as a thumbnail. */
  type?: string;
  /** Bytes, shown beside a non-image. */
  size?: number;
}

export interface FeedbackThreadMessage {
  id: string | number;
  /** Who wrote it. Left out on an `own` message, it reads "You". */
  author?: ReactNode;
  /** A `Date`, an ISO string or epoch ms. */
  createdAt: Date | string | number;
  body: string;
  attachments?: readonly FeedbackThreadAttachment[];
  /** Written by whoever is reading: sits at the end side, in the brand tint. */
  own?: boolean;
  /** Written by the team rather than a user: gets the "Staff" badge. */
  staff?: boolean;
}

export interface FeedbackThreadProps {
  messages: readonly FeedbackThreadMessage[];
  loading?: boolean;
  /** Replaces the default "No comments yet". */
  empty?: ReactNode;
  /**
   * Draw one attachment yourself — for files behind auth, which a plain `<img src>`
   * cannot fetch (kastlan's `AuthedImage`), or a lightbox. The default is a thumbnail
   * link for an image with a `url`, a file link otherwise.
   */
  renderAttachment?: (attachment: FeedbackThreadAttachment, message: FeedbackThreadMessage) => ReactNode;
  /** Tag bodies, authors and attachments `data-private`. Default true. */
  redact?: boolean;
  /** "Now" for the relative times — pin it in tests and stories. Default: the clock. */
  now?: Date | number;
  /** Overrides the provider's locale for the times. */
  locale?: string;
  labels?: Partial<FeedbackThreadLabels>;
  className?: string;
}

export function FeedbackThread({
  messages,
  loading = false,
  empty,
  renderAttachment,
  redact = true,
  now,
  locale: localeProp,
  labels: labelsProp,
  className,
}: FeedbackThreadProps) {
  const labels = useKitLabels("feedbackThread", DEFAULT_FEEDBACK_THREAD_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const file = useKitFileLabels();
  const priv = redact ? "" : undefined;
  const clock = useMinuteClock(now === undefined);
  const reference = now === undefined ? clock : +now;

  if (loading && messages.length === 0) {
    return <Skeleton lines={3} label={labels.loading} className={className} />;
  }
  if (messages.length === 0) {
    return (
      <EmptyState
        variant="inline"
        size="sm"
        title={empty ?? labels.empty}
        className={cn("justify-start", className)}
      />
    );
  }

  return (
    <ol aria-label={labels.thread} aria-busy={loading || undefined} className={cn("space-y-3", className)}>
      {messages.map((message) => {
        const date = toDate(message.createdAt);
        const author = message.author ?? (message.own ? labels.you : null);
        const attachments = message.attachments ?? [];
        return (
          <li
            key={message.id}
            className={cn("flex", message.own ? "justify-end" : "justify-start")}
            data-own={message.own ? "" : undefined}
          >
            <article
              className={cn(
                "max-w-[85%] min-w-0 rounded-lg px-3 py-2 text-sm",
                message.own
                  ? "rounded-ee-sm bg-[var(--brand-bg)]"
                  : "rounded-es-sm bg-[var(--bg-surface-2)]",
              )}
            >
              <header className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
                {author != null && (
                  <span data-private={priv} className="font-medium text-[var(--text-secondary)]">
                    {author}
                  </span>
                )}
                {message.staff && (
                  <span className="rounded border border-[var(--border)] bg-[var(--bg-surface)] px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                    {labels.staff}
                  </span>
                )}
                {date && (
                  // The kit's Tooltip, not a native title: one tooltip look app-wide
                  // (keksdose F0 / dev#523).
                  <Tooltip label={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" }).format(date)}>
                    <time dateTime={date.toISOString()} className="tabular-nums">
                      {formatRelativeTime(date, {
                        now: reference,
                        locale,
                        // Past the kit's day steps it is a date: "2 weeks ago" makes
                        // the reader do arithmetic the date already did.
                        absoluteAfterDays: 6.5,
                      })}
                    </time>
                  </Tooltip>
                )}
              </header>
              {message.body && (
                <p
                  data-private={priv}
                  dir="auto"
                  className="whitespace-pre-wrap break-words text-start text-[var(--text-primary)]"
                >
                  {message.body}
                </p>
              )}
              {attachments.length > 0 && (
                <ul aria-label={labels.attachments} data-private={priv} className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <li key={attachment.id ?? `${index}-${attachment.name}`} className="min-w-0">
                      {renderAttachment ? (
                        renderAttachment(attachment, message)
                      ) : (
                        <DefaultAttachment attachment={attachment} size={file.size} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

function DefaultAttachment({
  attachment,
  size,
}: {
  attachment: FeedbackThreadAttachment;
  size: (bytes: number) => string;
}) {
  const { name, url, type } = attachment;
  if (url && type?.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={name}
          loading="lazy"
          className="h-20 w-20 rounded border border-[var(--border)] object-cover"
        />
      </a>
    );
  }
  const content = (
    <>
      <Paperclip className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{name}</span>
      {attachment.size !== undefined && (
        <span className="shrink-0 text-[var(--text-muted)]">{size(attachment.size)}</span>
      )}
    </>
  );
  const chip =
    "inline-flex max-w-full items-center gap-1 rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-secondary)]";
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cn(chip, "hover:bg-[var(--bg-hover)]")}>
      {content}
    </a>
  ) : (
    <span className={chip}>{content}</span>
  );
}

/** The time, refreshed once a minute while `active`, so "2 minutes ago" does not stay
 *  "just now" on a page left open. Read in state rather than in render, which must be
 *  pure. */
function useMinuteClock(active: boolean): number {
  const [time, setTime] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTime(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [active]);
  return time;
}

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ── Composer ─────────────────────────────────────────────────────────────── */

/** What the composer's attach control takes — {@link FeedbackNoteAttachment} with the
 *  labels optional, since the field reads `feedbackAttachment` from the provider. */
export type FeedbackComposerAttachment = Omit<FeedbackNoteAttachment, "labels"> & {
  labels?: Partial<FeedbackAttachmentLabels>;
};

export interface FeedbackComposerProps {
  /**
   * Send the comment. Return the promise: the box clears when it RESOLVES, and only of
   * what was sent — text typed while it was in flight stays. A rejection keeps
   * everything for a retry (surface the error yourself; the composer stays quiet).
   */
  onSend: (body: string, attachment: File | null) => void | Promise<unknown>;
  /** The send is in flight: a spinner on the button and no second send. */
  pending?: boolean;
  /** Offer one picture with the comment (file, paste or `onCaptureScreenshot`).
   *  `true` for the defaults. Left out, the composer is text only. */
  attachment?: boolean | FeedbackComposerAttachment;
  /** Rendered INSTEAD of the composer — the thread is closed, or read-only for this
   *  reader. */
  disabledReason?: ReactNode;
  rows?: number;
  /**
   * The box's hint, over the `placeholder` label — keksdose F9: an admin answering a
   * support ticket is asked something else ("Reply to Anna…") than a member adding to
   * their own report, and one provider-wide label cannot say both.
   */
  placeholder?: string;
  /**
   * The draft, controlled — for a host that keeps it itself (saves it per ticket,
   * prefills a template). Left out, the composer keeps its own. Either way a send
   * that resolves clears only what was sent: controlled, that is an
   * `onValueChange("")` the host receives like any keystroke, and only if the draft
   * is still the one that went out.
   */
  value?: string;
  /** Every change to the draft — typing, {@link FeedbackComposerHandle.insertText}, the
   *  clear after a send. Required to change a controlled `value`. */
  onValueChange?: (value: string) => void;
  /** {@link FeedbackComposerHandle}: put text into the draft from outside (canned-reply
   *  chips) or focus the box. */
  ref?: Ref<FeedbackComposerHandle>;
  labels?: Partial<FeedbackComposerLabels>;
  className?: string;
}

/**
 * What a {@link FeedbackComposer} `ref` holds.
 *
 * keksdose F9: the support admin answers the same five questions all day and wants
 * chips above the box ("Thanks, fixed in the next release") that drop their text in
 * where the caret is. A controlled `value` alone cannot do that well — the host sees
 * the string, not the caret, so it could only append — so the composer, which owns
 * the textarea, does the splice.
 */
export interface FeedbackComposerHandle {
  /**
   * Insert `text` at the caret, replacing any selection (the caret the box last had:
   * a click on a chip blurs it, and the selection survives the blur), then focus the
   * box with the caret after the inserted text so the reply can go on. Nothing is
   * added around it — put a space or a newline in `text` if the reply needs one. A
   * no-op while `disabledReason` replaces the box.
   */
  insertText: (text: string) => void;
  focus: () => void;
}

const noSubscribe = () => () => {};
const isApple = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

/**
 * The answer box under a {@link FeedbackThread}: a textarea, an optional picture,
 * and Send — Ctrl/⌘+Enter sends, the shortcut the report dialog and the note editor
 * use, so the habit carries across the feature. Plain Enter is a new line: feedback is
 * written in paragraphs, unlike a chat.
 */
export function FeedbackComposer({
  onSend,
  pending = false,
  attachment,
  disabledReason,
  rows = 3,
  placeholder,
  value,
  onValueChange,
  ref,
  labels: labelsProp,
  className,
}: FeedbackComposerProps) {
  const labels = useKitLabels("feedbackComposer", DEFAULT_FEEDBACK_COMPOSER_LABELS, labelsProp);
  const [ownDraft, setOwnDraft] = useState("");
  const controlled = value !== undefined;
  const draft = controlled ? value : ownDraft;
  const [file, setFile] = useState<File | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  // The draft as of the last commit. The send's `.then` and `insertText` run after
  // renders their closure did not see — text typed while the send was in flight, a
  // second chip clicked before the first one's render — and must not act on a stale
  // string (for a controlled draft there is no updater function to lean on).
  const latest = useRef(draft);
  useLayoutEffect(() => {
    latest.current = draft;
  });
  // Where the caret goes once an inserted text has rendered.
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (caret.current === null || !el) return;
    el.focus();
    el.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  const setDraft = (next: string) => {
    latest.current = next;
    if (!controlled) setOwnDraft(next);
    onValueChange?.(next);
  };

  useImperativeHandle(ref, () => ({
    insertText: (text) => {
      const el = box.current;
      if (!el) return;
      const current = latest.current;
      // A second insert before the first has rendered goes after the first, not at the
      // textarea's not-yet-moved caret. Otherwise the textarea's selection, which may
      // be past the end of a controlled value the host has just shortened: clamp it.
      const pending = caret.current;
      const start = Math.min(pending ?? el.selectionStart ?? current.length, current.length);
      const end = pending ?? Math.max(start, Math.min(el.selectionEnd ?? start, current.length));
      caret.current = start + text.length;
      setDraft(current.slice(0, start) + text + current.slice(end));
    },
    focus: () => box.current?.focus(),
  }));
  // The server snapshot is "Ctrl"; the client corrects it after hydration.
  const modifier = useSyncExternalStore(
    noSubscribe,
    () => (isApple() ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );

  if (disabledReason != null && disabledReason !== false) {
    return <p className={cn("text-xs text-[var(--text-muted)]", className)}>{disabledReason}</p>;
  }

  const canSend = draft.trim().length > 0 && !pending;
  const send = () => {
    if (!canSend) return;
    const sentDraft = draft;
    const sentFile = file;
    Promise.resolve(onSend(draft.trim(), file))
      .then(() => {
        if (latest.current === sentDraft) setDraft("");
        setFile((current) => (current === sentFile ? null : current));
      })
      .catch(() => {});
  };

  const config = attachment === true ? {} : attachment || null;

  return (
    <div ref={root} className={cn("space-y-2", className)}>
      <Textarea
        rows={rows}
        dir="auto"
        aria-label={labels.field}
        ref={box}
        placeholder={placeholder ?? labels.placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className="flex flex-wrap items-end justify-between gap-2">
        {config ? (
          <FeedbackAttachmentField
            value={file}
            onChange={setFile}
            labels={config.labels}
            accept={config.accept}
            maxBytes={config.maxBytes}
            onError={config.onError}
            onCaptureScreenshot={config.onCaptureScreenshot}
            // The box is this field's sibling; a paste in it bubbles to `root`.
            pasteFrom={root}
          />
        ) : (
          <span />
        )}
        <div className="ms-auto flex items-center gap-2">
          <span className="text-xs text-[var(--text-placeholder)]">{labels.sendHint(modifier)}</span>
          <Button onClick={send} disabled={!canSend} aria-busy={pending || undefined}>
            {pending ? (
              <Spinner label={null} className="size-4" />
            ) : (
              <Send className="size-4 rtl:-scale-x-100" aria-hidden />
            )}
            {labels.send}
          </Button>
        </div>
      </div>
    </div>
  );
}
