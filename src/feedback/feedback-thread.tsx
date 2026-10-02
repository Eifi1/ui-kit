import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode, Ref } from "react";
import { ImageIcon, ImageOff, Paperclip, Send } from "lucide-react";
import { cn } from "../lib/cn";
import { formatDate, formatRelativeTime } from "../lib/format";
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
 *
 * **A chat, too** (keksdose G4/G5). keksdose's support chat is the same conversation
 * read the chat way: status lines between the messages ("Closed automatically",
 * "Reopened"), a day line where the date changes, clock times under it, Enter to send
 * and several files uploaded ahead of the send. Each of those is an opt-in here
 * (`kind: "event"`, `daySeparators`, `timeFormat="clock"`, `sendOn="enter"`,
 * `attachmentSlot` + `canSend`), so the feedback thread's defaults stay as they were.
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
  /** The shortcut line under `sendOn="enter"` (keksdose G5): Enter sends, so say how a
   *  new line is made. */
  sendHintEnter: string;
}

export const DEFAULT_FEEDBACK_COMPOSER_LABELS: FeedbackComposerLabels = {
  field: "Write a comment",
  placeholder: "Write a comment…",
  send: "Send",
  sendHint: (modifier) => `${modifier} + Enter to send`,
  sendHintEnter: "Enter to send, Shift + Enter for a new line",
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
  /** Leave out, or `"message"`. `"event"` is a {@link FeedbackThreadEvent}. */
  kind?: "message";
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

/**
 * A line in the thread that nobody wrote — "Closed automatically", "Marked as
 * resolved", "Reopened" — drawn centred and muted with its time, no author, no side,
 * no bubble.
 *
 * keksdose G4: its support chat interleaves these with the messages, and as a message
 * they came out as a bubble from nobody at the start side, which reads as the member
 * having said "resolved". Word it for the READER, as with `own`: the app knows whether
 * "you reopened it" or "Anna reopened it" is true for the person looking.
 *
 * The text is the app's, not somebody's words about their data, so it is NOT tagged
 * `data-private`; one that names a person can wrap the name in its own
 * `<span data-private>` (`body` is a node for that reason).
 */
export interface FeedbackThreadEvent {
  kind: "event";
  id: string | number;
  /** A `Date`, an ISO string or epoch ms. */
  createdAt: Date | string | number;
  body: ReactNode;
}

/** One row of a {@link FeedbackThread}: a message, or an event line between them. */
export type FeedbackThreadItem = FeedbackThreadMessage | FeedbackThreadEvent;

export interface FeedbackThreadProps {
  /** Oldest first. Event lines ({@link FeedbackThreadEvent}) sit among the messages. */
  messages: readonly FeedbackThreadItem[];
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
  /**
   * How a row's time reads. `"relative"` (default): "5 minutes ago", a date past six
   * days — right for a report's comments, read days apart. `"clock"`: the time of day
   * in the locale ("14:05", "2:05 PM") — the chat look, keksdose G4; pair it with
   * `daySeparators`, which say which day that clock time is on. Either way the full
   * date and time is in the Tooltip.
   */
  timeFormat?: "relative" | "clock";
  /**
   * A centred day line before the first row and wherever the next row is on another
   * calendar day (the device's zone): "Today", "Yesterday", else the date — keksdose
   * G4. "Today" / "Yesterday" are `Intl.RelativeTimeFormat`'s own words in the kit
   * locale, so there is no label to translate. Default false.
   */
  daySeparators?: boolean;
  /** "Now" for the relative times and the day lines — pin it in tests and stories.
   *  Default: the clock. */
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
  timeFormat = "relative",
  daySeparators = false,
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

  // Per row, the calendar day of the last readable date up to it — what a day line
  // compares against.
  const days: (number | null)[] = [];
  for (const message of messages) {
    const date = toDate(message.createdAt);
    days.push(date ? dayNumber(date) : (days.at(-1) ?? null));
  }

  return (
    <ol aria-label={labels.thread} aria-busy={loading || undefined} className={cn("space-y-3", className)}>
      {messages.flatMap((message, index) => {
        const date = toDate(message.createdAt);
        const time = date && (
          // The kit's Tooltip, not a native title: one tooltip look app-wide
          // (keksdose F0 / dev#523).
          <Tooltip label={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" }).format(date)}>
            <time dateTime={date.toISOString()} className="tabular-nums">
              {timeFormat === "clock"
                ? formatDate(date, "time", { locale })
                : formatRelativeTime(date, {
                    now: reference,
                    locale,
                    // Past the kit's day steps it is a date: "2 weeks ago" makes
                    // the reader do arithmetic the date already did.
                    absoluteAfterDays: 6.5,
                  })}
            </time>
          </Tooltip>
        );
        const rows: ReactNode[] = [];
        const day = date && dayNumber(date);
        // Against the last row WITH a readable date: an unparseable one neither starts
        // a day nor hides the next change.
        if (daySeparators && date && day !== days[index - 1]) {
          rows.push(<DaySeparator key={`day-${message.id}`} date={date} now={reference} locale={locale} />);
        }
        if (message.kind === "event") {
          // A list item like the rest, so "Reopened" is read in its place, but not an
          // article: an article is somebody's post, and this has no author.
          rows.push(
            <li
              key={message.id}
              data-event=""
              className="flex flex-wrap items-baseline justify-center gap-x-2 px-4 text-center text-xs text-[var(--text-muted)]"
            >
              <span>{message.body}</span>
              {time && <span className="text-[11px]">{time}</span>}
            </li>,
          );
          return rows;
        }
        const author = message.author ?? (message.own ? labels.you : null);
        const attachments = message.attachments ?? [];
        rows.push(
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
                {time}
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
          </li>,
        );
        return rows;
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
  if (url && type?.startsWith("image/")) return <ImageThumbnail url={url} name={name} />;
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

/** An image attachment's thumbnail. The box is drawn before the picture arrives —
 *  `loading="lazy"` leaves it empty until it nears the viewport, and a URL that has
 *  expired never fills it — and an empty bordered square read as a broken layout, not
 *  as a picture. So the box carries an image glyph underneath until the picture
 *  covers it, and swaps it for a broken-image glyph when the load fails. */
function ImageThumbnail({ url, name }: { url: string; name: string }) {
  // Keyed on the URL, so a message whose attachment is replaced tries the new one.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === url;
  const Glyph = failed ? ImageOff : ImageIcon;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-20 w-20 overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface-2)]"
    >
      <Glyph aria-hidden className="absolute inset-0 m-auto size-6 text-[var(--text-muted)]" />
      {!failed && (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- load/error are resource events, not interactions
        <img
          src={url}
          alt={name}
          loading="lazy"
          onError={() => setFailedUrl(url)}
          className="relative h-full w-full object-cover"
        />
      )}
      {/* The <img> and its alt are gone once it failed; the link still needs a name. */}
      {failed && <span className="sr-only">{name}</span>}
    </a>
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

/** The local calendar day as one number (20260926), for "same day?" and keys. */
function dayNumber(date: Date): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * The day line of `daySeparators` (keksdose G4): "Today" / "Yesterday" from
 * `Intl.RelativeTimeFormat` (`numeric: "auto"`) — the locale's own words, capitalised
 * for a line that stands alone ("heute" → "Heute"; a script without case is left as
 * is) — else the weekday and date, with the year only when it is not this one.
 *
 * Counted in calendar days, not 24-hour spans: 23:50 yesterday is "Yesterday" at
 * 00:10 today.
 */
function DaySeparator({ date, now, locale }: { date: Date; now: number; locale: string | undefined }) {
  const today = new Date(now);
  const days = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86_400_000,
  );
  let label: string;
  if (days === 0 || days === -1) {
    const word = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days + 0, "day");
    label = word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
  } else {
    label = formatDate(
      date,
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        ...(date.getFullYear() === today.getFullYear() ? null : { year: "numeric" }),
      },
      { locale },
    );
  }
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return (
    <li data-day-separator="" className="flex items-center gap-3 py-1 text-xs text-[var(--text-muted)]">
      <span aria-hidden className="h-px flex-1 bg-[var(--border)]" />
      <time dateTime={`${y}-${m}-${d}`} className="font-medium">
        {label}
      </time>
      <span aria-hidden className="h-px flex-1 bg-[var(--border)]" />
    </li>
  );
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
   *
   * `attachment` is the built-in field's one picture. Files the host uploaded ahead
   * (`attachmentSlot`) are the host's state, read by the host here — and `body` may be
   * `""` when `canSend` let an attachments-only message go.
   */
  onSend: (body: string, attachment: File | null) => void | Promise<unknown>;
  /** The send is in flight: a spinner on the button and no second send. */
  pending?: boolean;
  /** Offer one picture with the comment (file, paste or `onCaptureScreenshot`).
   *  `true` for the defaults. Left out, the composer is text only. */
  attachment?: boolean | FeedbackComposerAttachment;
  /**
   * The host's own attach control, in the row with Send where the built-in field sits
   * (after it, if both are on) — keksdose G5: its support chat uploads up to N files
   * AHEAD of the send and sends their refs, which one `File` in `onSend` cannot carry.
   * The slot is the host's picker plus the chips of what is uploaded; the upload, the
   * refs and clearing them once `onSend` resolves stay with the host. Pair it with
   * `canSend`.
   */
  attachmentSlot?: ReactNode;
  /**
   * Whether Send is enabled, over the composer's own rule (some text in the box) —
   * for state the composer cannot see, i.e. `attachmentSlot`'s (keksdose G5): `true`
   * with files ready makes an empty draft sendable (`onSend("", null)`), `false` while
   * an upload is still running holds even a written reply back. Left out, the text
   * decides. `pending` blocks a send either way.
   */
  canSend?: boolean;
  /**
   * Which key sends. `"mod-enter"` (default): Ctrl/⌘+Enter, the report dialog's and
   * note editor's shortcut, with plain Enter a new line — feedback is written in
   * paragraphs. `"enter"`: the chat way (keksdose G5) — Enter sends, Shift+Enter is a
   * new line, Ctrl/⌘+Enter still sends; an Enter that confirms an IME composition
   * (Japanese, Chinese input) is the IME's, never a send.
   */
  sendOn?: "mod-enter" | "enter";
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
  /**
   * On the composer's root — the box, or the `disabledReason` line in its place —
   * with any `data-*` attribute beside it (keksdose K17). keksdose's assistant tour
   * points at the chat box with `[data-tour="assistant-ask"]`, and a composer that
   * dropped every attribute it was not told about left the anchor nowhere: the
   * assistant kept its hand-built box rather than lose the tour step.
   */
  id?: string;
  /** `data-*` attributes for the root, as `id` — a tour anchor, a test id. */
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
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
 * written in paragraphs, unlike a chat — which `sendOn="enter"` is for (keksdose G5).
 */
export function FeedbackComposer({
  onSend,
  pending = false,
  attachment,
  attachmentSlot,
  canSend: canSendProp,
  sendOn = "mod-enter",
  disabledReason,
  rows = 3,
  placeholder,
  value,
  onValueChange,
  ref,
  labels: labelsProp,
  className,
  id,
  ...rest
}: FeedbackComposerProps) {
  const labels = useKitLabels("feedbackComposer", DEFAULT_FEEDBACK_COMPOSER_LABELS, labelsProp);
  const rootAttributes = { id, ...dataAttributes(rest) };
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
    return (
      <p {...rootAttributes} className={cn("text-xs text-[var(--text-muted)]", className)}>
        {disabledReason}
      </p>
    );
  }

  const canSend = (canSendProp ?? draft.trim().length > 0) && !pending;
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
    <div {...rootAttributes} ref={root} className={cn("space-y-2", className)}>
      <Textarea
        rows={rows}
        dir="auto"
        aria-label={labels.field}
        ref={box}
        placeholder={placeholder ?? labels.placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          const mod = event.ctrlKey || event.metaKey;
          // Under "enter": plain Enter sends, Shift+Enter falls through to the
          // textarea's new line, and an Enter that ends an IME composition is the
          // IME's (keyCode 229 is how Safari reports it after the composition ended).
          const chat =
            sendOn === "enter" &&
            !event.shiftKey &&
            !event.altKey &&
            !event.nativeEvent.isComposing &&
            event.keyCode !== 229;
          if (mod || chat) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className="flex flex-wrap items-end justify-between gap-2">
        {config || attachmentSlot != null ? (
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            {config && (
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
            )}
            {attachmentSlot}
          </div>
        ) : (
          <span />
        )}
        <div className="ms-auto flex items-center gap-2">
          <span className="text-xs text-[var(--text-placeholder)]">
            {sendOn === "enter" ? labels.sendHintEnter : labels.sendHint(modifier)}
          </span>
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

/** The `data-*` entries of a rest-props object, and nothing else: whatever a caller
 *  spread in that the composer does not know is not the root's to receive. */
function dataAttributes(props: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) if (key.startsWith("data-")) out[key] = value;
  return out;
}

/**
 * {@link FeedbackComposer} under a name that is not about feedback (keksdose K17).
 *
 * The component was never feedback-specific: a textarea, an optional picture or a
 * host's upload slot, Send, `sendOn="enter"` for the chat way. keksdose's assistant
 * and support chat are chats, not reports, and an import of `FeedbackComposer` there
 * reads as a mistake to the next person. The same function, not a wrapper, so the
 * two names cannot drift.
 */
export const ChatComposer = FeedbackComposer;
/** {@link FeedbackComposerProps}, for {@link ChatComposer}. */
export type ChatComposerProps = FeedbackComposerProps;
/** {@link FeedbackComposerHandle}, for {@link ChatComposer}. */
export type ChatComposerHandle = FeedbackComposerHandle;
/** {@link FeedbackComposerLabels}, for {@link ChatComposer} — still the `feedbackComposer`
 *  namespace of the provider. */
export type ChatComposerLabels = FeedbackComposerLabels;
