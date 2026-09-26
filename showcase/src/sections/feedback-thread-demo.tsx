import { useState } from "react";
import { FeedbackComposer, FeedbackThread, Switch, ToggleGroup } from "@eifi1/ui-kit";
import type { FeedbackThreadAttachment, FeedbackThreadMessage } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * The conversation under a report (0.12): FeedbackThread draws it, FeedbackComposer
 * answers it. The kit owns the look and the behaviour; the showcase owns the data —
 * here an array in state that the composer appends to.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

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

export function FeedbackThreadDemo() {
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
            ariaLabel="thread state"
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
        label="FeedbackComposer — pending, Ctrl/⌘+Enter and an attachment"
        hint="appends to the thread above; plain Enter is a new line"
      >
        <Row>
          <Switch label="attachment" description="One picture: file, paste or screenshot" checked={attachment} onCheckedChange={setAttachment} />
          <Switch label="reject the next send" checked={failNext} onCheckedChange={setFailNext} />
          <Switch label="disabledReason" description="The thread is closed" checked={closed} onCheckedChange={setClosed} />
        </Row>
        <div className="mt-4 max-w-2xl">
          <FeedbackComposer
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
