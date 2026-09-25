import { useRef, useState } from "react";
import {
  Button,
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_MAX_ATTACHMENT_BYTES,
  FeedbackAttachmentField,
  FeedbackDialog,
  Switch,
  Textarea,
  UiKitProvider,
  pastedName,
} from "@eifi1/ui-kit";
import type {
  FeedbackAttachmentLabels,
  FeedbackCategoryOption,
  FeedbackDialogLabels,
  FeedbackSubmission,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * FEEDBACK — COMPOSE.
 *
 * The half of the feature somebody FILES a report with. Its sibling — the inbox,
 * in the next section — is what happens to the report afterwards, and the split
 * between them is the one stated at the top of `feedback-inbox.tsx`: the kit owns
 * the form, the vocabulary and the look; the app owns the data, the API and every
 * string. There is no `Feedback` type anywhere in this section for the same
 * reason there is none in the package — the two consuming apps store a report
 * differently and are meant to.
 *
 * That is why the label constants below read like a translation file rather than
 * like props: `FeedbackDialogLabels` is ten REQUIRED strings, with no English
 * defaults, because both apps translate and a hardcoded "Cancel" would be a bug
 * in one of them. Only two are optional (`attachmentCapture`, `attachmentPaste`),
 * and they fall back to the provider's `feedbackAttachment` namespace. On the
 * standalone field every key is optional since 0.7.0 (prop > provider > English).
 */

const CATEGORIES: FeedbackCategoryOption[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "question", label: "Question" },
  { value: "other", label: "Something else" },
];

// All twelve: the ten required strings plus the two optional ones —
// `attachmentCapture` names the button `onCaptureScreenshot` adds, and
// `attachmentPaste` is the hint line under the buttons.
const DIALOG_LABELS: FeedbackDialogLabels = {
  title: "Report an issue",
  category: "Category",
  subject: "Subject",
  body: "What happened?",
  attachment: "Screenshot",
  submitHint: "Ctrl/Cmd+Enter to send",
  cancel: "Cancel",
  save: "Send report",
  attachmentAdd: "Add attachment",
  attachmentRemove: "Remove attachment",
  attachmentCapture: "Capture screenshot",
  attachmentPaste: "…or press Ctrl/Cmd+V anywhere to paste one.",
};

/**
 * A stand-in for `onCaptureScreenshot`. The apps snapshot their view with
 * `modern-screenshot`, a dependency of theirs and not of the kit; this draws a
 * labelled card on a canvas instead, so the button, its busy state and the file it
 * hands back are all real. The `File` goes through the same accept/size checks as a
 * picked or pasted one.
 */
async function fakeCapture(): Promise<File | null> {
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const css = getComputedStyle(document.documentElement);
  ctx.fillStyle = css.getPropertyValue("--bg-page").trim() || "#f5f5f4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = css.getPropertyValue("--brand").trim() || "#4f46e5";
  ctx.fillRect(0, 0, canvas.width, 36);
  ctx.fillStyle = css.getPropertyValue("--text-primary").trim() || "#111";
  ctx.font = "16px sans-serif";
  ctx.fillText("App view — stand-in capture", 20, 80);
  ctx.fillText(new Date().toLocaleTimeString(), 20, 108);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ? new File([blob], "screenshot.png", { type: "image/png" }) : null;
}

// The standalone field with `attachment` omitted: the heading is optional
// precisely so an editor can put the buttons straight under its own textarea,
// where a second heading over them would be noise.
const FIELD_LABELS: FeedbackAttachmentLabels = {
  attachmentAdd: "Add attachment",
  attachmentRemove: "Remove attachment",
};

const READOUT = "font-mono text-[11px] text-[var(--text-muted)]";

/** Shown instead of a bare "null" so an empty specimen still says what it is. */
function FileReadout({ file }: { file: File | null }) {
  if (!file) return <p className={READOUT}>value: null</p>;
  return (
    <p className={READOUT}>
      value: {`{ name: "${file.name}", type: "${file.type}", size: ${file.size} }`}
    </p>
  );
}

/** `onError` is the only channel the field has: it never renders a message of its
 *  own, so an app that does not wire this rejects a file in total silence. */
function RejectedLine({ kind }: { kind: "type" | "size" | null }) {
  if (!kind) return null;
  return (
    <p className="text-xs text-[var(--text-secondary)]">
      onError(&quot;{kind}&quot;) — the file was rejected{" "}
      {kind === "type" ? "for its MIME type" : "for its size"}, and `value` is unchanged.
    </p>
  );
}

export function FeedbackCompose() {
  return (
    <>
      <Example
        label="FeedbackDialog"
        hint="Send stays disabled until BOTH subject and body are non-empty — the category is not part of the check."
      >
        <Dialog />
      </Example>

      <Note>
        <strong>
          <code className="font-mono">onCaptureScreenshot</code> here is a stand-in.
        </strong>{" "}
        The prop takes a function that snapshots the app view and returns a{" "}
        <code className="font-mono">File</code>; both consuming apps implement it with{" "}
        <code className="font-mono">modern-screenshot</code>, which is a dependency of theirs and
        not of this repository — the kit stays free of a DOM-rasterising library it would
        otherwise force on every consumer. This page draws a labelled card on a canvas instead.
        Without the prop there is no “Capture screenshot” button at all.
      </Note>

      <Note>
        <strong>The form resets every time it opens.</strong> An effect keyed on{" "}
        <code className="font-mono">open</code> clears subject, body and attachment, so a report
        abandoned with Escape is gone — and the dialog is{" "}
        <em>rendered unconditionally with an <code className="font-mono">open</code> prop</em>,
        unlike <code className="font-mono">Modal</code> next door, which the caller mounts and
        unmounts. Category is the exception: it is controlled from outside, so it survives a
        close, which is why it is the one field with a prop pair rather than internal state.
      </Note>

      <Example
        label="FeedbackAttachmentField — standalone"
        hint={
          <>
            <code className="font-mono">labels.attachment</code> omitted, so no heading over the
            buttons.
          </>
        }
      >
        <Standalone />
      </Example>

      <Example
        label="FeedbackAttachmentField — provider labels"
        hint={
          <>
            No <code className="font-mono">labels</code> prop: the strings come from{" "}
            <code className="font-mono">&lt;UiKitProvider labels=&#123;&#123; feedbackAttachment &#125;&#125;&gt;</code>.
          </>
        }
      >
        <ProviderLabels />
      </Example>

      <Example
        label="accept + maxBytes → onError"
        hint="Narrowed to PNG only and 64 KB, so an ordinary screenshot trips one of the two rejections."
      >
        <Validation />
      </Example>

      <Example
        label="documentPaste + onCaptureScreenshot — standalone"
        hint="Switch documentPaste on, click anywhere on the page and press Ctrl/Cmd+V with an image copied."
      >
        <DocumentPaste />
      </Example>

      <Example
        label="pasteFrom — the field beside the box you paste into"
        hint="Put the caret in the textarea and paste an image; the listener is on their shared parent."
      >
        <PasteFrom />
      </Example>

      <Note>
        <strong>Three paste scopes, and the default is the narrowest of them.</strong> With
        neither prop set the field listens on its <em>own</em> subtree — which contains only its
        buttons and a visually hidden file input, so a paste made with nothing focused never
        reaches it. That is not a defect so much as the reason the other two exist:{" "}
        <code className="font-mono">documentPaste</code> is for a modal, which traps focus and so
        owns every paste in the page while it is up (the dialog above passes it, and the
        switch above shows it on its own), and{" "}
        <code className="font-mono">pasteFrom</code> is for a field standing beside the text box
        the paste is actually made in — events bubble upwards, so the common parent is the only
        element that hears both. It is worth knowing before concluding the standalone specimen
        above ignores Ctrl/Cmd+V: focus one of its own buttons first and it does not.
      </Note>

      <Example
        label="DEFAULT_ATTACHMENT_ACCEPT and DEFAULT_MAX_ATTACHMENT_BYTES"
        hint="Exported because they are the defaults a consumer narrows from, not ones it has to restate."
      >
        <OutTable rows={DEFAULT_ROWS} />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          The accept list is matched against{" "}
          <code className="font-mono">file.type</code> exactly — it is not a glob, so{" "}
          <code className="font-mono">image/*</code> would match nothing, and the same array is
          joined into the hidden input&apos;s <code className="font-mono">accept</code> attribute.
          The size check is client-side only: it spares the upload, not the server, which still
          has to enforce its own limit.
        </p>
      </Example>

      <Example
        label="pastedName"
        hint="Pure. The extension comes off the MIME type rather than being assumed to be .png."
      >
        <OutTable rows={PASTED_ROWS} />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          It exists because a clipboard image arrives called{" "}
          <code className="font-mono">image.png</code> at best and unnamed at worst, and that
          name is what the inbox shows beside the thumbnail. Safari puts TIFF on the clipboard,
          so a file called <code className="font-mono">pasted.png</code> that is not a PNG is one
          the receiving end opens wrong — hence the last two rows, which cover a suffixed type
          and the empty string.
        </p>
      </Example>
    </>
  );
}

/* ── FeedbackDialog ───────────────────────────────────────────────────────── */

function Dialog() {
  const [open, setOpen] = useState(false);
  // Controlled from out here, which is what makes it survive the open-reset above.
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [rejected, setRejected] = useState<"type" | "size" | null>(null);
  const [last, setLast] = useState<FeedbackSubmission | null>(null);
  const [narrow, setNarrow] = useState(false);

  // A no-op that resolves, but not instantly: `submitting` is the prop worth
  // seeing, and one that flips back inside the same microtask never paints. The
  // timer starts on a click and never at module scope, so mounting this section
  // in jsdom schedules nothing.
  const onSubmit = async (data: FeedbackSubmission) => {
    setSubmitting(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    setSubmitting(false);
    setLast(data);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <Row>
        <Button
          onClick={() => {
            setRejected(null);
            setOpen(true);
          }}
        >
          Report an issue
        </Button>
        <span className="text-xs text-[var(--text-muted)]">
          Drag it by its heading; Ctrl/Cmd+Enter sends; Ctrl/Cmd+V attaches a screenshot from
          anywhere in the page.
        </span>
      </Row>
      <Switch
        label="attachmentAccept={['image/png']} · maxAttachmentBytes={64 KB}"
        description="Off: the defaults. On: most real screenshots are refused, which shows onAttachmentError."
        checked={narrow}
        onCheckedChange={setNarrow}
      />

      {last ? (
        <p className={READOUT}>
          {`onSubmit({ title: "${last.title}", category: "${last.category}", body: ${last.body.length} chars, attachment: ${last.attachment ? `"${last.attachment.name}"` : "null"} })`}
        </p>
      ) : (
        <p className={READOUT}>onSubmit: not called yet</p>
      )}

      <FeedbackDialog
        open={open}
        onClose={() => setOpen(false)}
        categories={CATEGORIES}
        category={category}
        onCategoryChange={setCategory}
        labels={DIALOG_LABELS}
        onSubmit={onSubmit}
        submitting={submitting}
        onAttachmentError={setRejected}
        attachmentAccept={narrow ? ["image/png"] : undefined}
        maxAttachmentBytes={narrow ? 64 * 1024 : undefined}
        onCaptureScreenshot={fakeCapture}
        // The slot the app fills with what only it knows — who is reporting, which
        // route they were on. Rendered inside the panel, under the attachment
        // field, which is why the rejection line below is put here rather than
        // beside the trigger: while the dialog is up, the trigger is behind it.
        contextSlot={
          <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2">
            <p className="text-xs text-[var(--text-secondary)]">
              contextSlot — reported from <code className="font-mono">/#feedback-compose</code>
            </p>
            <RejectedLine kind={rejected} />
          </div>
        }
      />
    </div>
  );
}

/* ── FeedbackAttachmentField ──────────────────────────────────────────────── */

function Standalone() {
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<"type" | "size" | null>(null);

  return (
    <div className="space-y-2">
      <FeedbackAttachmentField
        value={file}
        onChange={(next) => {
          setRejected(null);
          setFile(next);
        }}
        labels={FIELD_LABELS}
        onError={setRejected}
        // `className` lands on the field's own root, which is also the element the
        // default-scope paste handler sits on.
        className="max-w-md"
      />
      <RejectedLine kind={rejected} />
      <FileReadout file={file} />
      <p className="text-xs text-[var(--text-muted)]">
        Once a file is chosen the buttons are replaced by the preview, so there is no “replace”
        without removing first. A non-image would get a neutral file tile instead of the
        thumbnail — unreachable with the default accept list, and kept for a consumer that
        widens it.
      </p>
    </div>
  );
}

/** German on purpose, so the nested provider is unmistakable on an English page. */
const FEEDBACK_ATTACHMENT_DE = {
  attachmentAdd: "Bild anhängen",
  attachmentCapture: "Bildschirm aufnehmen",
  attachmentPaste: "…oder ein Bild aus der Zwischenablage einfügen.",
  attachmentRemove: "Anhang entfernen",
};

function ProviderLabels() {
  const [plain, setPlain] = useState<File | null>(null);
  const [nested, setNested] = useState<File | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--text-secondary)]">
          The page&apos;s provider (this page&apos;s language)
        </p>
        {/* No labels at all — legal since 0.7.0; the field reads `feedbackAttachment`. */}
        <FeedbackAttachmentField
          value={plain}
          onChange={setPlain}
          onCaptureScreenshot={fakeCapture}
        />
        <FileReadout file={plain} />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--text-secondary)]">
          A nested provider, plus one key from the prop
        </p>
        <UiKitProvider labels={{ feedbackAttachment: FEEDBACK_ATTACHMENT_DE }}>
          <FeedbackAttachmentField
            value={nested}
            onChange={setNested}
            onCaptureScreenshot={fakeCapture}
            // Prop > provider > English, key by key: the heading only ever comes from
            // here, and `attachmentCapture` here beats the provider's.
            labels={{ attachment: "Bildschirmfoto", attachmentCapture: "App-Ansicht aufnehmen" }}
          />
        </UiKitProvider>
        <FileReadout file={nested} />
      </div>
      <p className="text-xs text-[var(--text-muted)] md:col-span-2">
        Before 0.7.0 <code className="font-mono">labels</code> was required and the two optional
        keys fell back to hard-coded English, so a German app relying on its provider got
        &ldquo;Capture screenshot&rdquo; under a German form. Switch this page&apos;s language:
        the left field follows; the right one keeps the nested provider&apos;s German. The
        heading (<code className="font-mono">attachment</code>) is not in the namespace — a note
        editor wants none — so it stays a prop.
      </p>
    </div>
  );
}

function Validation() {
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<"type" | "size" | null>(null);

  return (
    <div className="space-y-2">
      <FeedbackAttachmentField
        value={file}
        onChange={(next) => {
          setRejected(null);
          setFile(next);
        }}
        labels={FIELD_LABELS}
        accept={["image/png"]}
        maxBytes={64 * 1024}
        onError={setRejected}
        className="max-w-md"
      />
      <RejectedLine kind={rejected} />
      <FileReadout file={file} />
      <p className="text-xs text-[var(--text-muted)]">
        Both checks run on the picked file, the captured screenshot and the pasted image alike —
        one <code className="font-mono">pick()</code> behind all three ways in, which is the
        point of the field being one component rather than three handlers.
      </p>
    </div>
  );
}

function DocumentPaste() {
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<"type" | "size" | null>(null);
  const [documentPaste, setDocumentPaste] = useState(false);

  return (
    <div className="max-w-md space-y-2">
      <Switch
        label="documentPaste"
        description="Listen on the whole document, as the dialog does while open"
        checked={documentPaste}
        onCheckedChange={setDocumentPaste}
      />
      <FeedbackAttachmentField
        value={file}
        onChange={(next) => {
          setRejected(null);
          setFile(next);
        }}
        labels={{
          ...FIELD_LABELS,
          attachment: "Screenshot",
          attachmentCapture: "Capture the app view",
          attachmentPaste: documentPaste
            ? "…or paste an image anywhere on this page."
            : "…or paste while one of these buttons has focus.",
        }}
        documentPaste={documentPaste}
        onCaptureScreenshot={fakeCapture}
        onError={setRejected}
      />
      <RejectedLine kind={rejected} />
      <FileReadout file={file} />
      <p className="text-xs text-[var(--text-muted)]">
        Leave the switch off when the field is inline on a page with other fields: a paste meant
        for one of them would otherwise land here.
      </p>
    </div>
  );
}

function PasteFrom() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [rejected, setRejected] = useState<"type" | "size" | null>(null);
  // The element whose subtree is listened to: the common parent of the box the
  // paste is made in and the field, which are siblings. A paste in the textarea
  // bubbles to here and never through the field, so without this ref the gesture
  // would be silently unavailable to an inline editor.
  const shared = useRef<HTMLDivElement>(null);

  return (
    <div ref={shared} className="max-w-md space-y-2">
      <Textarea
        rows={3}
        label="Reply"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <FeedbackAttachmentField
        value={file}
        onChange={(next) => {
          setRejected(null);
          setFile(next);
        }}
        labels={{
          ...FIELD_LABELS,
          attachmentPaste: "…or paste a screenshot while the caret is in the box above.",
        }}
        pasteFrom={shared}
        onError={setRejected}
      />
      <RejectedLine kind={rejected} />
      <FileReadout file={file} />
      <p className="text-xs text-[var(--text-muted)]">
        A clipboard carrying both text and an image still pastes its text into the textarea: the
        field calls <code className="font-mono">preventDefault()</code> only once it has actually
        found an image, so an ordinary copy is left where it was aimed.
      </p>
    </div>
  );
}

/* ── Constants and the pure helper ────────────────────────────────────────── */

// Computed by calling the real exports rather than transcribed, so the table
// cannot drift from the package the way a hand-written one would.
const DEFAULT_ROWS: Array<[string, string]> = [
  ["DEFAULT_ATTACHMENT_ACCEPT", `[${DEFAULT_ATTACHMENT_ACCEPT.map((t) => `"${t}"`).join(", ")}]`],
  ["DEFAULT_ATTACHMENT_ACCEPT.join(\",\")", DEFAULT_ATTACHMENT_ACCEPT.join(",")],
  ["DEFAULT_MAX_ATTACHMENT_BYTES", String(DEFAULT_MAX_ATTACHMENT_BYTES)],
  [
    "DEFAULT_MAX_ATTACHMENT_BYTES / 1024 / 1024",
    `${DEFAULT_MAX_ATTACHMENT_BYTES / 1024 / 1024} // MB`,
  ],
];

const PASTED_ROWS: Array<[string, string]> = [
  ['pastedName("image/png")', pastedName("image/png")],
  ['pastedName("image/jpeg")', pastedName("image/jpeg")],
  // Safari's clipboard, which is the whole reason the extension is not assumed.
  ['pastedName("image/tiff")', pastedName("image/tiff")],
  // Suffixed types lose the "+xml"; none of them are in the accept list anyway.
  ['pastedName("image/svg+xml")', pastedName("image/svg+xml")],
  ['pastedName("")', pastedName("")],
];
