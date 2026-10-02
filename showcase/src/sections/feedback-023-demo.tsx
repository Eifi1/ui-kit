import { useState } from "react";
import { ChatComposer, FeedbackAttachmentField, ToggleGroup } from "@eifi1/ui-kit";
import type { FeedbackAttachmentRef } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.23.0, from keksdose's 0.22 adoption report (the support chat): the attachment
 * field's refusals name the file and the limit (G5a), the field holds while a send is in
 * flight and, uploading on pick, takes the write lock (G5b), and the composer counts
 * against the server's limit as Textarea does (G6).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"];
/** Small, so a refusal is easy to provoke in the demo: most screenshots are larger. */
const MAX_BYTES = 200_000;

let nextUpload = 1;
const fakeUpload = (file: File) =>
  new Promise<FeedbackAttachmentRef>((resolve) => {
    window.setTimeout(
      () => resolve({ key: `upload-${nextUpload++}`, name: file.name, size: file.size, type: file.type }),
      900,
    );
  });

/* ── FeedbackAttachmentField: named refusals, disabled, disabledReason (page: feedback-compose) ── */

export function FeedbackAttachment023Demo() {
  const [refs, setRefs] = useState<FeedbackAttachmentRef[]>([
    { key: "upload-0", name: "invoice-000.pdf", size: 48_000, type: "application/pdf" },
  ]);
  const [state, setState] = useState<"open" | "sending" | "closed">("open");
  const [log, setLog] = useState<string[]>([]);
  const say = (line: string) => setLog((list) => [line, ...list].slice(0, 3));
  return (
    <Example
      label="FeedbackAttachmentField — refusals that name the file, and a field that holds"
      hint="pick an image over 200 KB, an SVG, or more than three files"
    >
      <div className="space-y-3">
        <ToggleGroup
          aria-label="Field state"
          value={state}
          onChange={(v) => setState(v as typeof state)}
          options={[
            { value: "open", label: "Open" },
            { value: "sending", label: "Sending…" },
            { value: "closed", label: "Thread closed" },
          ]}
        />
        <FeedbackAttachmentField
          refs
          value={refs}
          onChange={setRefs}
          onUpload={fakeUpload}
          max={3}
          accept={ACCEPT}
          maxBytes={MAX_BYTES}
          disabled={state === "sending"}
          disabledReason={state === "closed" ? "This conversation is closed — reopen it to add files." : undefined}
          // `info.message` is ready for a toast; an upload failure can say more from `error`.
          onError={(kind, error, info) => say(kind === "upload" ? `${info.message} (${String(error)})` : info.message)}
        />
        {log.length > 0 && (
          <ul aria-live="polite" className="space-y-0.5 text-xs text-[var(--danger)]">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </div>
      <Note>
        {code("onError")} now carries what was refused: {code("onError(kind, info)")} in the File modes,{" "}
        {code("onError(kind, error, info)")} in {code("refs")} mode — the second place stays the upload&apos;s error, as
        in 0.22. {code("info")} holds {code("file")}, {code("files")} (the surplus, for {code('"count"')}),{" "}
        {code("maxBytes")}, {code("accept")}, {code("max")} and a translated {code("message")} from the{" "}
        {code("filePicker")} labels FileButton uses: “photo.png” is larger than 200 kB. {code("disabled")} holds the field
        while a send is in flight — the chips stay, nothing is added or removed. {code("refs")} mode uploads on pick, so
        it is a commit: {code("disabledReason")} (or {code("commit")} under a locked WriteLockProvider) keeps the
        buttons focusable and says why. keksdose G5a / G5b.
      </Note>
    </Example>
  );
}

/* ── ChatComposer: maxLength + showCount, with the support picker (page: feedback-inbox) ── */

export function ChatComposerCount023Demo() {
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
          <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
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
    </Example>
  );
}
