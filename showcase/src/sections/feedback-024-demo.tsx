import { useState } from "react";
import { ChatComposer, FeedbackAttachmentField, ToggleGroup } from "@eifi1/ui-kit";
import type { FeedbackAttachmentRef } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.24.0, from keksdose's 0.23 adoption report (the support chat's reply box): the
 * composer hands its slot the root a paste bubbles to, the attachment field's buttons
 * take a look, and the field stays inside a phone-width composer whatever its chips are
 * called.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"];

let nextUpload = 1;
const fakeUpload = (file: File) =>
  new Promise<FeedbackAttachmentRef>((resolve) => {
    window.setTimeout(
      () => resolve({ key: `upload-${nextUpload++}`, name: file.name, size: file.size, type: file.type }),
      900,
    );
  });

/** A screenshot's name as macOS writes it, and then some: wider than a phone. */
const LONG_NAME = "Screenshot 2026-10-03 at 07.45.12 — Example Ltd overview, all accounts.png";

/* ── ChatComposer + FeedbackAttachmentField refs in the slot (page: feedback-inbox) ── */

export function ChatComposerSlot024Demo() {
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
            width === "phone" ? "w-full max-w-[390px] space-y-3 rounded-lg border border-[var(--border)] p-4" : "space-y-3"
          }
        >
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
    </Example>
  );
}
