import { useState, useRef } from "react";
import { Paperclip } from "lucide-react";
import {
  ChatComposer,
  FeedbackThread,
  Switch,
  ToggleGroup,
  Chip,
  Button,
  FeedbackAttachmentField,
} from "@eifi1/ui-kit";
import type {
  FeedbackThreadAttachment,
  FeedbackThreadMessage,
  FeedbackComposerHandle,
  FeedbackThreadItem,
  FeedbackAttachmentRef,
} from "@eifi1/ui-kit";
import { Example, Note, Row, code, READOUT } from "../../lib/section";

/**
 * The Feedback inbox page: the conversation — FeedbackThread and ChatComposer — in one
 * module, rendered as one section (refactor audit 2026-10, DOC-8). The thread's base
 * specimens were feedback-thread-demo.tsx; what the releases added was filed by release
 * (shell-feedback-013, feedback-014, misc-022, feedback-023, feedback-024). Each keeps its
 * label, so its anchor and its search entry hold, and says since which release in a Note.
 */

/**
 * The conversation under a report (0.12): FeedbackThread draws it, ChatComposer
 * answers it. The kit owns the look and the behaviour; the showcase owns the data —
 * here an array in state that the composer appends to.
 */

const MINUTE = 60_000;

const NOW = new Date("2026-09-26T14:00:00Z").getTime();

const SCREENSHOT = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#e2e8f0"/><rect x="16" y="16" width="288" height="28" rx="4" fill="#94a3b8"/><rect x="16" y="60" width="180" height="12" rx="3" fill="#cbd5e1"/><rect x="16" y="82" width="240" height="12" rx="3" fill="#cbd5e1"/><rect x="200" y="140" width="104" height="40" rx="6" fill="#dc2626"/><text x="252" y="166" font-family="sans-serif" font-size="14" fill="#fff" text-anchor="middle">Error 500</text></svg>`,
)}`;

const SEED: FeedbackThreadMessage[] = [
  {
    id: 1,
    author: "Jana Novak",
    createdAt: NOW - 3 * 24 * 60 * MINUTE,
    body: "Saving a transaction with a split category fails with an error.\n\nIt worked last week. Screenshot attached.",
    attachments: [
      { id: "a1", name: "error.svg", url: SCREENSHOT, type: "image/svg+xml" },
      { id: "a2", name: "export-2026-09.csv", url: "#", type: "text/csv", size: 48_213 },
    ],
  },
  {
    id: 2,
    author: "Marcel (support)",
    staff: true,
    createdAt: NOW - 26 * 60 * MINUTE,
    body: "Thanks — we can reproduce it. A fix is going out with tomorrow's release.",
  },
  {
    id: 3,
    own: true,
    createdAt: NOW - 90 * MINUTE,
    body: "Great, I'll check tomorrow. Is there a workaround until then?",
  },
  {
    id: 4,
    author: "Marcel (support)",
    staff: true,
    createdAt: NOW - 4 * MINUTE,
    body: "Split the transaction after saving it, rather than before.",
    attachments: [{ id: "a3", name: "workaround.pdf", type: "application/pdf", size: 312_004 }],
  },
];

/** A reply in Hebrew, for the RTL switch: its body is `dir="auto"`, so it lays out as
 *  its own language inside an English thread, and an English one inside a Hebrew page. */
const HEBREW: FeedbackThreadMessage = {
  id: 5,
  author: "נועה",
  createdAt: NOW - 2 * MINUTE,
  body: "תודה, הפתרון עובד!",
};

type ThreadState = "messages" | "empty" | "loading";

function FeedbackThreadDemo() {
  const [messages, setMessages] = useState<FeedbackThreadMessage[]>(SEED);
  const [state, setState] = useState<ThreadState>("messages");
  const [redact, setRedact] = useState(true);
  const [blur, setBlur] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [pending, setPending] = useState(false);
  const [attachment, setAttachment] = useState(true);
  const [closed, setClosed] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [log, setLog] = useState("—");

  const shown = state === "empty" ? [] : rtl ? [...messages, HEBREW] : messages;

  const onSend = async (body: string, file: File | null) => {
    setPending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setPending(false);
    if (failNext) {
      setFailNext(false);
      setLog(`onSend("${body.slice(0, 20)}…") → rejected; the draft stays for a retry`);
      throw new Error("offline");
    }
    const attachments: FeedbackThreadAttachment[] | undefined = file
      ? [{ name: file.name, type: file.type, size: file.size, url: URL.createObjectURL(file) }]
      : undefined;
    setMessages((all) => [...all, { id: Date.now(), own: true, createdAt: NOW, body, attachments }]);
    setLog(`onSend("${body.slice(0, 20)}${body.length > 20 ? "…" : ""}", ${file ? file.name : "null"}) → resolved; the box clears`);
  };

  return (
    <>
      <Example
        label="FeedbackThread — own, staff, attachments, redact and RTL"
        hint="own sits at the end side in the brand tint; staff gets a badge; the app says which is which"
      >
        <Row>
          <ToggleGroup<ThreadState>
            aria-label="thread state"
            value={state}
            onChange={setState}
            options={[
              { value: "messages", label: "messages" },
              { value: "empty", label: "empty" },
              { value: "loading", label: "loading" },
            ]}
          />
          <Switch label="redact" description="data-private on bodies, authors, files" checked={redact} onCheckedChange={setRedact} />
          <Switch label="demo-mode blur" description="This page's [data-private] rule" checked={blur} onCheckedChange={setBlur} />
          <Switch label="dir=rtl" description="Adds a Hebrew reply" checked={rtl} onCheckedChange={setRtl} />
        </Row>
        <div
          dir={rtl ? "rtl" : undefined}
          className={`mt-4 max-w-2xl ${blur ? "[&_[data-private]]:blur-[5px]" : ""}`}
        >
          <FeedbackThread
            messages={shown}
            loading={state === "loading"}
            redact={redact}
            now={NOW}
            locale={rtl ? "he" : undefined}
          />
        </div>
        <div className="mt-3 space-y-2">
          <Note>
            {code("own")} is the caller&apos;s per message — whose words sit at the end side depends on who is
            reading, and only the app knows that. An own message without an {code("author")} reads
            &ldquo;You&rdquo;. An image attachment with a {code("url")} is a thumbnail link; anything else is a file
            link with its size ({code("renderAttachment")} takes over for files behind auth). Times are relative
            to {code("now")}, pinned here so the page reads the same every day.
          </Note>
          <Note>
            Turn on the blur: with {code("redact")} (the default) the bodies, authors and attachments are{" "}
            {code("data-private")} and a host&apos;s demo mode hides them; with it off they stay readable. Sides are
            logical — under {code("dir=rtl")} own messages move to the left — and each body is{" "}
            {code('dir="auto"')}.
          </Note>
        </div>
      </Example>

      <Example
        label="ChatComposer — pending, Ctrl/⌘+Enter and an attachment"
        hint="appends to the thread above; plain Enter is a new line"
      >
        <Row>
          <Switch label="attachment" description="One picture: file, paste or screenshot" checked={attachment} onCheckedChange={setAttachment} />
          <Switch label="reject the next send" checked={failNext} onCheckedChange={setFailNext} />
          <Switch label="disabledReason" description="The thread is closed" checked={closed} onCheckedChange={setClosed} />
        </Row>
        <div className="mt-4 max-w-2xl">
          <ChatComposer
            onSend={onSend}
            pending={pending}
            attachment={attachment}
            disabledReason={closed ? "This report is closed — open a new one to continue." : undefined}
          />
        </div>
        <p className={`mt-3 ${READOUT}`}>
          pending: {String(pending)} · {log}
        </p>
        <div className="mt-3">
          <Note>
            Ctrl+Enter (⌘+Enter on a Mac — the hint names the platform&apos;s key) sends, as in the report dialog and
            the note editor. While {code("pending")} the button shows a spinner and a second send is refused. The box
            clears when the promise RESOLVES, and only of what was sent: type more while it is in flight and that
            stays. A rejection keeps everything. Paste a screenshot into the box and it lands in the attachment field.
          </Note>
        </div>
      </Example>
    </>
  );
}

/* ── since 0.13 ─────────────────────────────────────────────────────────── */

const CANNED = [
  "Thanks for the report — ",
  "We can reproduce it; a fix is going out with the next release.",
  "Could you send a screenshot of the error?",
];

/** keksdose F9: canned replies for the support admin, and a hint naming the member. */
function ComposerCannedRepliesDemo() {
  const composer = useRef<FeedbackComposerHandle>(null);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  return (
    <Example
      label="ChatComposer — canned replies and a custom placeholder"
      hint="ref.insertText(text) at the caret; value / onValueChange for a draft the host keeps"
    >
      <Row className="mb-2">
        {CANNED.map((text) => (
          <Chip key={text} size="sm" onClick={() => composer.current?.insertText(text)}>
            {text.length > 32 ? `${text.slice(0, 30)}…` : text.trim()}
          </Chip>
        ))}
      </Row>
      <ChatComposer
        ref={composer}
        placeholder="Reply to Jana…"
        value={draft}
        onValueChange={setDraft}
        onSend={(body) => {
          setSent((list) => [...list, body]);
          return new Promise((resolve) => setTimeout(resolve, 400));
        }}
      />
      <Row className="mt-2">
        <span className={READOUT}>draft: {JSON.stringify(draft)}</span>
        <span className={READOUT}>sent: {sent.length}</span>
      </Row>
      <Note>
        A chip inserts at the caret the box last had and replaces a selection — the
        selection survives the chip's click — then focuses the box after the text. The
        draft here is controlled; a resolved send still clears only what was sent,
        reaching the host as {code('onValueChange("")')}.
      </Note>
      <Note>Since 0.13.</Note>
    </Example>
  );
}

/* ── since 0.14 ─────────────────────────────────────────────────────────── */

/**
 * The 0.14 follow-ups from keksdose G4/G5: its support chat on FeedbackThread +
 * ChatComposer — event lines, day lines and clock times in the thread; Enter to
 * send and files uploaded ahead of the send in the composer.
 */


const DAY = 24 * 60 * MINUTE;

const NOW_014 = new Date(2026, 8, 26, 14, 0).getTime();

const MAX_FILES = 3;

const SEED_014: FeedbackThreadItem[] = [
  {
    id: 1,
    author: "Jana Novak",
    createdAt: NOW_014 - 3 * DAY,
    body: "The CSV export stops after the first 500 rows.",
  },
  {
    id: 2,
    author: "Marcel (support)",
    staff: true,
    createdAt: NOW_014 - 3 * DAY + 40 * MINUTE,
    body: "Thanks — fixed in today's release. Please try again.",
  },
  { kind: "event", id: "e1", createdAt: NOW_014 - 3 * DAY + 41 * MINUTE, body: "Marked as resolved" },
  { kind: "event", id: "e2", createdAt: NOW_014 - DAY, body: "Closed automatically after 48 hours" },
  { id: 3, author: "Jana Novak", createdAt: NOW_014 - 90 * MINUTE, body: "Still cut off for me, sorry!" },
  { kind: "event", id: "e3", createdAt: NOW_014 - 89 * MINUTE, body: "Reopened by Jana" },
];

/** keksdose G4/G5: a support chat — event lines, day lines, clock times, Enter to send
 *  and several pre-uploaded files. */
function Feedback014Demo() {
  const [items, setItems] = useState<FeedbackThreadItem[]>(SEED_014);
  const [files, setFiles] = useState<FeedbackThreadAttachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [next, setNext] = useState(1);

  const upload = () => {
    const name = `screenshot-${next}.png`;
    setNext((n) => n + 1);
    setUploading((n) => n + 1);
    // Stands in for the host's upload: the ref comes back later.
    setTimeout(() => {
      setUploading((n) => n - 1);
      setFiles((list) => [...list, { id: name, name, size: 84_000 + next * 1_000 }]);
    }, 700);
  };

  return (
    <Example
      label="FeedbackThread + ChatComposer — a support chat"
      hint='kind: "event", daySeparators, timeFormat="clock"; sendOn="enter", attachmentSlot, canSend'
    >
      <div className="rounded-md border border-subtle p-3">
        <FeedbackThread messages={items} now={NOW_014} daySeparators timeFormat="clock" redact={false} />
      </div>
      <ChatComposer
        className="mt-3"
        sendOn="enter"
        rows={2}
        placeholder="Reply to Jana…"
        attachmentSlot={
          <Row>
            <Button
              variant="ghost"
              size="sm"
              onClick={upload}
              disabled={files.length + uploading >= MAX_FILES}
            >
              <Paperclip className="size-4" aria-hidden />
              Attach
            </Button>
            {files.map((file) => (
              <Chip
                key={file.id}
                size="sm"
                onRemove={() => setFiles((list) => list.filter((f) => f.id !== file.id))}
              >
                {file.name}
              </Chip>
            ))}
            {uploading > 0 && <span className={READOUT}>uploading {uploading}…</span>}
          </Row>
        }
        // Files ready make an empty draft sendable; an upload in flight holds the send.
        canSend={uploading > 0 ? false : files.length > 0 ? true : undefined}
        onSend={(body) => {
          const sent = files;
          setItems((list) => [
            ...list,
            { id: `m${list.length}`, own: true, createdAt: NOW_014, body, attachments: sent },
          ]);
          return new Promise((resolve) => setTimeout(resolve, 300)).then(() => setFiles([]));
        }}
      />
      <Note>
        Event lines are list items without an author or a side, worded for whoever reads
        them. Day lines say {code("Today")} / {code("Yesterday")} in the kit locale via{" "}
        {code("Intl.RelativeTimeFormat")}, so the clock times under them need no date; the
        Tooltip still has it. In the box, Enter sends and Shift+Enter is a new line (not
        while an IME is composing). Up to {MAX_FILES} files upload ahead of the send; the
        host keeps their refs, reads them in {code("onSend")} and passes{" "}
        {code("canSend")} so a message of files alone can go.
      </Note>
      <Note>Since 0.14.</Note>
    </Example>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

function ChatComposer022Demo() {
  const [sent, setSent] = useState<string[]>([]);
  return (
    <Example label="ChatComposer — the composer under a neutral name" hint="`id` and `data-*` reach its root">
      <div className="space-y-3">
        {sent.length > 0 && (
          <ul className="space-y-1 text-sm text-secondary">
            {sent.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}
        <ChatComposer
          sendOn="enter"
          rows={2}
          placeholder="Ask the assistant…"
          data-tour="showcase-assistant-ask"
          onSend={(body) => setSent((list) => [...list, body])}
        />
      </div>
      <Note>
        {code("ChatComposer")} is the composer under a name that is not about feedback, for a chat that is
        not a report ({code("FeedbackComposer")}, the old name, was deprecated in 0.34 and removed in 0.35). It
        puts {code("id")} and any {code("data-*")} on its root (the box, or the{" "}
        {code("disabledReason")} line in its place): keksdose&apos;s assistant tour points at{" "}
        {code('[data-tour="assistant-ask"]')}. keksdose K17.
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

/* ── since 0.23 ─────────────────────────────────────────────────────────── */

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"];

let nextUpload = 1;

const fakeUpload = (file: File) =>
  new Promise<FeedbackAttachmentRef>((resolve) => {
    window.setTimeout(
      () => resolve({ key: `upload-${nextUpload++}`, name: file.name, size: file.size, type: file.type }),
      900,
    );
  });

function ChatComposerCount023Demo() {
  const [size, setSize] = useState<"md" | "sm">("md");
  const [refs, setRefs] = useState<FeedbackAttachmentRef[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const onSend = (body: string) => {
    setPending(true);
    const files = refs;
    return new Promise<void>((resolve) => {
      window.setTimeout(() => {
        setSent((list) => [...list, files.length ? `${body} (+${files.length} file${files.length === 1 ? "" : "s"})` : body]);
        setRefs((current) => (current === files ? [] : current));
        setPending(false);
        resolve();
      }, 1200);
    });
  };
  return (
    <Example label="ChatComposer — counted against the server's limit" hint="`maxLength` + `showCount`, as on Textarea">
      <div className="space-y-3">
        <ToggleGroup
          aria-label="Composer size"
          value={size}
          onChange={(v) => setSize(v as "md" | "sm")}
          options={[
            { value: "md", label: "md" },
            { value: "sm", label: "sm" },
          ]}
        />
        {sent.length > 0 && (
          <ul className="space-y-1 text-sm text-secondary">
            {sent.map((m, i) => (
              <li key={i} className="break-words">
                {m}
              </li>
            ))}
          </ul>
        )}
        <ChatComposer
          sendOn="enter"
          rows={2}
          size={size}
          maxLength={120}
          showCount
          placeholder="Reply to Example Ltd…"
          pending={pending}
          canSend={uploading ? false : undefined}
          onSend={onSend}
          attachmentSlot={
            <FeedbackAttachmentField
              refs
              value={refs}
              onChange={setRefs}
              onUpload={fakeUpload}
              onUploadingChange={setUploading}
              max={3}
              accept={ACCEPT}
              disabled={pending}
            />
          }
        />
      </div>
      <Note>
        The reply box of keksdose&apos;s support chat: {code("maxLength={120}")} caps the box (the server&apos;s limit — 4,000
        there) and {code("showCount")} draws Textarea&apos;s own counter under it, read with the box on focus and announced
        only near and at the limit. Under {code('size="sm"')} the hidden send hint is still the box&apos;s description,
        the count after it. A canned reply inserted past the limit is kept whole and holds Send back until it is
        trimmed. The picker in {code("attachmentSlot")} is {code("FeedbackAttachmentField refs")} with{" "}
        {code("disabled={pending}")}. keksdose G6.
      </Note>
      <Note>Since 0.23.</Note>
    </Example>
  );
}

/* ── since 0.24 ─────────────────────────────────────────────────────────── */

/**
 * 0.24.0, from keksdose's 0.23 adoption report (the support chat's reply box): the
 * composer hands its slot the root a paste bubbles to, the attachment field's buttons
 * take a look, and the field stays inside a phone-width composer whatever its chips are
 * called.
 */




/** A screenshot's name as macOS writes it, and then some: wider than a phone. */
const LONG_NAME = "Screenshot 2026-10-03 at 07.45.12 — Example Ltd overview, all accounts.png";

function ChatComposerSlot024Demo() {
  const [width, setWidth] = useState<"phone" | "full">("phone");
  const [refs, setRefs] = useState<FeedbackAttachmentRef[]>([
    { key: "upload-0", name: LONG_NAME, size: 482_000, type: "image/png" },
  ]);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const onSend = (body: string) => {
    setPending(true);
    const files = refs;
    return new Promise<void>((resolve) => {
      window.setTimeout(() => {
        setSent((list) => [...list, files.length ? `${body} (+${files.length} file${files.length === 1 ? "" : "s"})` : body]);
        setRefs((current) => (current === files ? [] : current));
        setPending(false);
        resolve();
      }, 1200);
    });
  };
  return (
    <Example
      label="ChatComposer — the slot gets the composer's root"
      hint="copy an image, click into the box and paste: it lands in the field beside Send"
    >
      <div className="space-y-3">
        <ToggleGroup
          aria-label="Composer width"
          value={width}
          onChange={(v) => setWidth(v as "phone" | "full")}
          options={[
            { value: "phone", label: "Phone (390px)" },
            { value: "full", label: "Full width" },
          ]}
        />
        <div
          className={
            width === "phone" ? "w-full max-w-[390px] space-y-3 rounded-lg border border-subtle p-4" : "space-y-3"
          }
        >
          {sent.length > 0 && (
            <ul className="space-y-1 text-sm text-secondary">
              {sent.map((m, i) => (
                <li key={i} className="break-words">
                  {m}
                </li>
              ))}
            </ul>
          )}
          <ChatComposer
            sendOn="enter"
            rows={2}
            placeholder="Reply to Example Ltd…"
            pending={pending}
            canSend={uploading ? false : undefined}
            onSend={onSend}
            // A function of `{ root, pending }`: `root` is where a paste in the box
            // bubbles to — the field's `pasteFrom`, with no wrapper of the host's own.
            attachmentSlot={({ root, pending: sending }) => (
              <FeedbackAttachmentField
                refs
                value={refs}
                onChange={setRefs}
                onUpload={fakeUpload}
                onUploadingChange={setUploading}
                max={3}
                accept={ACCEPT}
                pasteFrom={root}
                disabled={sending}
                buttonVariant="ghost"
                buttonSize="sm"
                labels={{ attachmentAdd: "Attach" }}
              />
            )}
          />
        </div>
      </div>
      <Note>
        {code("attachmentSlot")} may be a function of {code("{ root, pending }")}: {code("root")} is the composer&apos;s
        own element, round the box and the slot, as a ref — exactly what {code("pasteFrom")} takes — so a screenshot
        pasted into the reply lands in the field, where keksdose had wrapped the whole composer in a ref&apos;d{" "}
        {code("<div>")} of its own to have something to hand over. It is attached before the field&apos;s first effect,
        so the first paste works and nothing renders twice. {code("pending")} is the field&apos;s {code("disabled")}. A
        plain node still works as before. The field&apos;s add and capture buttons take {code('buttonVariant="ghost"')}{" "}
        and {code('buttonSize="sm"')} (every mode; default secondary / md), the quiet small buttons keksdose&apos;s own
        picker had beside Send. And the field&apos;s root is {code("min-w-0 max-w-full")} now: a flex item is never
        narrower than its content, so a long name like the one above ran off a 390px composer unless the host bounded
        the field itself — keksdose passed {code('className="min-w-0 max-w-full"')}; it can drop it.
      </Note>
      <Note>Since 0.24.</Note>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** The thread and the composer, then the releases' additions in order. */
export function FeedbackComposerDemo() {
  return (
    <>
      <FeedbackThreadDemo />
      <ComposerCannedRepliesDemo />
      <Feedback014Demo />
      <ChatComposer022Demo />
      <ChatComposerCount023Demo />
      <ChatComposerSlot024Demo />
    </>
  );
}
