import { useRef, useState, useEffect } from "react";
import {
  Button,
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_MAX_ATTACHMENT_BYTES,
  DEFAULT_MAX_ATTACHMENTS,
  FeedbackAttachmentField,
  FeedbackDialog,
  Switch,
  Textarea,
  UiKitProvider,
  pastedName,
  ToggleGroup,
  Chip,
  FeedbackContextBox,
  FeedbackMenu,
  feedbackContext,
  useFeedbackSubmit,
} from "@eifi1/ui-kit";
import type {
  FeedbackAttachmentLabels,
  FeedbackCategoryOption,
  FeedbackAttachmentError,
  FeedbackDialogLabels,
  FeedbackMultipleSubmission,
  FeedbackSubmission,
  FeedbackAttachmentRef,
  ButtonSize,
  ButtonVariant,
  FeedbackCreatePayload,
  TopBarMenuEntry,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row, code, READOUT, beat } from "../lib/section";
import { MessagesSquare, Sparkles } from "lucide-react";

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

const READOUT_SMALL = "font-mono text-caption text-muted";

/** Shown instead of a bare "null" so an empty specimen still says what it is. */
function FileReadout({ file }: { file: File | null }) {
  if (!file) return <p className={READOUT_SMALL}>value: null</p>;
  return (
    <p className={READOUT_SMALL}>
      value: {`{ name: "${file.name}", type: "${file.type}", size: ${file.size} }`}
    </p>
  );
}

/** `onError` is the only channel the field has: it never renders a message of its
 *  own, so an app that does not wire this rejects a file in total silence. */
function RejectedLine({ kind }: { kind: "type" | "size" | null }) {
  if (!kind) return null;
  return (
    <p className="text-xs text-secondary">
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
        {/* The two notes live in the card: as siblings of the Example they took the
            page's 40px section gap and floated away from the dialog they explain. */}
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
      </Example>

      <Example
        label="Several attachments — multiple"
        hint={
          <>
            <code className="font-mono">&lt;FeedbackAttachmentField multiple&gt;</code> and{" "}
            <code className="font-mono">&lt;FeedbackDialog attachments=&quot;multiple&quot;&gt;</code>:
            every pick and paste adds a chip; the capture fills its own slot, once.
          </>
        }
      >
        <Multiple />
      </Example>

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
        <p className="mt-3 text-xs text-secondary">
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
        <p className="mt-3 text-xs text-secondary">
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
        <span className="text-xs text-muted">
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
        <p className={READOUT_SMALL}>
          {`onSubmit({ title: "${last.title}", category: "${last.category}", body: ${last.body.length} chars, attachment: ${last.attachment ? `"${last.attachment.name}"` : "null"} })`}
        </p>
      ) : (
        <p className={READOUT_SMALL}>onSubmit: not called yet</p>
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
          <div className="space-y-1 rounded-md border border-subtle bg-surface-2 px-3 py-2">
            <p className="text-xs text-secondary">
              contextSlot — reported from <code className="font-mono">/#feedback-compose</code>
            </p>
            <RejectedLine kind={rejected} />
          </div>
        }
      />
    </div>
  );
}

/* ── multiple ─────────────────────────────────────────────────────────────── */

// Widened past the image-only default so the file chip (glyph, name, size) shows
// next to the thumbnails; capped at three so the limit line is reachable in a demo.
const MULTI_ACCEPT = [...DEFAULT_ATTACHMENT_ACCEPT, "application/pdf"];
const MULTI_MAX = 3;

function Multiple() {
  const [files, setFiles] = useState<File[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [rejected, setRejected] = useState<FeedbackAttachmentError | null>(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [last, setLast] = useState<FeedbackMultipleSubmission | null>(null);
  const shortName = (f: File) => `"${f.name}"`;

  return (
    <div className="space-y-3">
      <div className="max-w-xl space-y-2">
        {/* The parts, as an app that builds its own form wires them: the photos in
            `value`, the capture in `screenshot` — the same split the dialog makes. */}
        <FeedbackAttachmentField
          multiple
          value={files}
          onChange={(next) => {
            setRejected(null);
            setFiles(next);
          }}
          max={MULTI_MAX}
          screenshot={screenshot}
          onScreenshotChange={setScreenshot}
          onCaptureScreenshot={fakeCapture}
          accept={MULTI_ACCEPT}
          onError={setRejected}
          labels={{ attachment: "Screenshot and photos", attachmentAdd: "Add a photo or PDF" }}
        />
        {rejected === "count" ? (
          <p className="text-xs text-secondary">
            onError(&quot;count&quot;) — more files than the {MULTI_MAX} slots had room for; the
            surplus was dropped.
          </p>
        ) : (
          <RejectedLine kind={rejected} />
        )}
        <p className={READOUT_SMALL}>
          {`screenshot: ${screenshot ? shortName(screenshot) : "null"} · value: [${files.map(shortName).join(", ")}]`}
        </p>
      </div>
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open the dialog with attachments=&quot;multiple&quot;
        </Button>
      </Row>
      <p className={READOUT_SMALL}>
        {last
          ? `onSubmit({ title: "${last.title}", screenshot: ${last.screenshot ? shortName(last.screenshot) : "null"}, attachments: [${last.attachments.map(shortName).join(", ")}] })`
          : "onSubmit: not called yet"}
      </p>
      <FeedbackDialog
        open={open}
        onClose={() => setOpen(false)}
        categories={CATEGORIES}
        category={category}
        onCategoryChange={setCategory}
        labels={DIALOG_LABELS}
        attachments="multiple"
        maxAttachments={MULTI_MAX}
        attachmentAccept={MULTI_ACCEPT}
        onCaptureScreenshot={fakeCapture}
        requireBody={false}
        onSubmit={(data) => {
          setLast(data);
          setOpen(false);
        }}
      />
      <Note>
        <strong>Opt-in, so nothing that exists changes.</strong> Without{" "}
        <code className="font-mono">multiple</code> the field holds one{" "}
        <code className="font-mono">File | null</code> and the dialog submits{" "}
        <code className="font-mono">attachment</code>, as before. With it,{" "}
        <code className="font-mono">onSubmit</code> is typed{" "}
        <code className="font-mono">FeedbackMultipleSubmission</code>:{" "}
        <code className="font-mono">screenshot</code> (what the capture returned, at most one —
        a second snapshot of the same view is no more evidence) apart from{" "}
        <code className="font-mono">attachments</code> (picked and pasted, up to{" "}
        <code className="font-mono">maxAttachments</code>, default {DEFAULT_MAX_ATTACHMENTS}).
        Two pastes are two files: the second is named{" "}
        <code className="font-mono">pasted-2.png</code>, because a backend that stores by name
        would otherwise keep only one of them — the loss keksdose reported (dev#578).
      </Note>
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
      <Note>
        Once a file is chosen the buttons are replaced by the preview, so there is no “replace”
        without removing first. A non-image would get a neutral file tile instead of the
        thumbnail — unreachable with the default accept list, and kept for a consumer that
        widens it.
      </Note>
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
        <p className="text-xs font-medium text-secondary">
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
        <p className="text-xs font-medium text-secondary">
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
      <div className="md:col-span-2">
        <Note>
          Before 0.7.0 <code className="font-mono">labels</code> was required and the two optional
          keys fell back to hard-coded English, so a German app relying on its provider got
          &ldquo;Capture screenshot&rdquo; under a German form. Switch this page&apos;s language:
          the left field follows; the right one keeps the nested provider&apos;s German. The
          heading (<code className="font-mono">attachment</code>) is not in the namespace — a note
          editor wants none — so it stays a prop.
        </Note>
      </div>
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
      <Note>
        Both checks run on the picked file, the captured screenshot and the pasted image alike —
        one <code className="font-mono">pick()</code> behind all three ways in, which is the
        point of the field being one component rather than three handlers.
      </Note>
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
      <Note>
        Leave the switch off when the field is inline on a page with other fields: a paste meant
        for one of them would otherwise land here.
      </Note>
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
      <Note>
        A clipboard carrying both text and an image still pastes its text into the textarea: the
        field calls <code className="font-mono">preventDefault()</code> only once it has actually
        found an image, so an ordinary copy is left where it was aimed.
      </Note>
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

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

let nextUpload = 1;

export function FeedbackAttachmentRefs022Demo() {
  const [refs, setRefs] = useState<FeedbackAttachmentRef[]>([]);
  const [outcome, setOutcome] = useState<"succeed" | "fail">("succeed");
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const say = (line: string) => setLog((list) => [line, ...list].slice(0, 4));
  const upload = (file: File) =>
    new Promise<FeedbackAttachmentRef>((resolve, reject) => {
      window.setTimeout(() => {
        if (outcome === "fail") reject(new Error("413 Payload Too Large"));
        else resolve({ key: `upload-${nextUpload++}`, name: file.name, size: file.size, type: file.type });
      }, 1200);
    });
  return (
    <Example label="FeedbackAttachmentField — uploaded on pick" hint="`refs`: the value is the refs the uploads answered">
      <div className="space-y-3">
        <ToggleGroup
          aria-label="Upload outcome"
          value={outcome}
          onChange={(v) => setOutcome(v as "succeed" | "fail")}
          options={[
            { value: "succeed", label: "Uploads succeed" },
            { value: "fail", label: "Uploads fail" },
          ]}
        />
        <FeedbackAttachmentField
          refs
          value={refs}
          onChange={setRefs}
          onUpload={upload}
          onRemove={(key) => say(`removed ${key} — delete it on the server`)}
          onUploadingChange={setUploading}
          onError={(kind, error) => say(kind === "upload" ? `upload failed: ${String(error)}` : `refused: ${kind}`)}
          accept={["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"]}
        />
        <p className="text-xs text-muted">
          {uploading ? "Uploading — Send waits." : `Ready to send: ${refs.map((r) => r.key).join(", ") || "nothing"}`}
        </p>
        {log.length > 0 && <p className="text-xs text-muted">{log.join(" · ")}</p>}
      </div>
      <Note>
        Every way in — pick, paste, capture — is validated as in the File modes, then handed to {code("onUpload")}; a
        chip with a spinner stands in until it answers, and the ref joins {code("value")}. A rejection drops the chip and
        reports {code('onError("upload", error)')}. Removal goes by key ({code("onRemove")}). Uploads in flight count
        against {code("max")}. keksdose K16 (the support chat&apos;s AttachmentPicker).
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

/* ── since 0.25 ─────────────────────────────────────────────────────────── */

// The attachment buttons' two looks, the toggle between them and a stand-in capture:
// shared with the note editor's specimen (feedback-inbox/record.tsx), which shows the
// same `attachmentButtonVariant` / `attachmentButtonSize` on FeedbackNoteEditor.
export type Look = "default" | "ghost-sm";

export const LOOKS: Record<Look, { variant?: ButtonVariant; size?: ButtonSize }> = {
  default: {},
  "ghost-sm": { variant: "ghost", size: "sm" },
};

export function LookToggle({ value, onChange }: { value: Look; onChange: (next: Look) => void }) {
  return (
    <ToggleGroup
      aria-label="Attachment buttons"
      size="sm"
      value={value}
      onChange={(v) => onChange(v as Look)}
      options={[
        { value: "default", label: "Default (secondary / md)" },
        { value: "ghost-sm", label: "ghost / sm" },
      ]}
    />
  );
}

/** A stand-in for an app's screenshot hook, so the capture button shows. */
export async function capture(): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const css = getComputedStyle(document.documentElement);
  ctx.fillStyle = css.getPropertyValue("--bg-page").trim() || "#eee";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = css.getPropertyValue("--text-primary").trim() || "#111";
  ctx.font = "14px sans-serif";
  ctx.fillText("App view — stand-in capture", 16, 40);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ? new File([blob], "screenshot.png", { type: "image/png" }) : null;
}

const CATEGORIES_025 = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
];

export function FeedbackDialogButtons025Demo() {
  const [look, setLook] = useState<Look>("ghost-sm");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  return (
    <Example
      label="FeedbackDialog — the attachment buttons' look"
      hint="attachmentButtonVariant / attachmentButtonSize, handed to the field inside"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <LookToggle value={look} onChange={setLook} />
          <Button onClick={() => setOpen(true)}>Report an issue</Button>
        </div>
        <FeedbackDialog
          open={open}
          onClose={() => setOpen(false)}
          categories={CATEGORIES_025}
          category={category}
          onCategoryChange={setCategory}
          onSubmit={() => setOpen(false)}
          onCaptureScreenshot={capture}
          attachmentButtonVariant={LOOKS[look].variant}
          attachmentButtonSize={LOOKS[look].size}
        />
        <Note>
          FeedbackAttachmentField took {code("buttonVariant")} / {code("buttonSize")} in 0.24
          (keksdose&apos;s support chat), but the dialog builds its field itself and passed neither.
          It now takes {code("attachmentButtonVariant")} / {code("attachmentButtonSize")}, named like
          its other attachment options ({code("attachmentAccept")}, {code("onAttachmentError")}),
          in both {code("attachments")} modes. Left out, the buttons are secondary / md as before.
        </Note>
      </div>
      <Note>Since 0.25.</Note>
    </Example>
  );
}

/* ── since 0.16 ─────────────────────────────────────────────────────────── */

/** A real image for the screenshot slot, drawn in the page's brand colour. */
function useScreenshot(): File | null {
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    ctx.fillStyle = css.getPropertyValue("--bg-surface-2").trim() || "gray";
    ctx.fillRect(0, 0, 160, 100);
    ctx.fillStyle = css.getPropertyValue("--brand").trim() || "black";
    ctx.fillRect(12, 12, 136, 16);
    ctx.fillRect(12, 40, 80, 48);
    canvas.toBlob((blob) => {
      if (blob) setFile(new File([blob], "screenshot.webp", { type: blob.type || "image/webp" }));
    }, "image/webp");
  }, []);
  return file;
}

/** Two image pastes delivered back to back, before React re-renders between them. */
function pasteTwice(target: EventTarget, image: File) {
  for (let i = 0; i < 2; i++) {
    const data = new DataTransfer();
    data.items.add(new File([image], "image.png", { type: image.type }));
    target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }
}

export function FeedbackAttachment016Demo() {
  const shot = useScreenshot();
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const pasteRoot = useRef<HTMLDivElement>(null);
  // The demo's screenshot arrives once the canvas is encoded; seed the slot with it.
  const [seeded, setSeeded] = useState(false);
  if (shot && !seeded) {
    setSeeded(true);
    setScreenshot(shot);
  }

  return (
    <Example
      label="FeedbackAttachmentField multiple — screenshot chip and two adds in one tick"
      hint="attachmentScreenshot; attachmentList is the dialog's heading"
    >
      <div ref={pasteRoot} className="max-w-md">
        <FeedbackAttachmentField
          multiple
          value={files}
          onChange={setFiles}
          pasteFrom={pasteRoot}
          screenshot={screenshot}
          onScreenshotChange={setScreenshot}
          onCaptureScreenshot={async () => shot}
          labels={{ attachment: "Attachments" }}
        />
      </div>
      <Row>
        <Button
          variant="secondary"
          size="sm"
          disabled={!shot}
          onClick={() => shot && pasteRoot.current && pasteTwice(pasteRoot.current, shot)}
        >
          Paste two images at once
        </Button>
        <span className={READOUT}>value: [{files.map((f) => f.name).join(", ")}]</span>
      </Row>
      <Note>
        The screenshot slot's chip says {code("Screenshot")} (the {code("attachmentScreenshot")}{" "}
        label) with the file name beneath it. Two pastes in one tick both land — the field
        builds on what it already handed to {code("onChange")}, not on a {code("value")} the
        parent has not re-rendered yet. {code("<FeedbackDialog attachments=\"multiple\">")}{" "}
        heads the list with {code("attachmentList")}.
      </Note>
      <Note>Since 0.16.</Note>
    </Example>
  );
}

/* ── since 0.23 ─────────────────────────────────────────────────────────── */

/**
 * 0.23.0, from keksdose's 0.22 adoption report (the support chat): the attachment
 * field's refusals name the file and the limit (G5a), the field holds while a send is in
 * flight and, uploading on pick, takes the write lock (G5b), and the composer counts
 * against the server's limit as Textarea does (G6).
 */

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"];

/** Small, so a refusal is easy to provoke in the demo: most screenshots are larger. */
const MAX_BYTES = 200_000;


const fakeUpload = (file: File) =>
  new Promise<FeedbackAttachmentRef>((resolve) => {
    window.setTimeout(
      () => resolve({ key: `upload-${nextUpload++}`, name: file.name, size: file.size, type: file.type }),
      900,
    );
  });

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
          <ul aria-live="polite" className="space-y-0.5 text-xs text-danger">
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
      <Note>Since 0.23.</Note>
    </Example>
  );
}

/* ── since 0.27 ─────────────────────────────────────────────────────────── */

/**
 * 0.27's submit side of feedback (docs/feedback-harmonization.md §4.1, §4.2): the top-bar
 * menu, the wired dialog, the context box and the screenshot capture — what keksdose,
 * kastlan and Kurvenschmiede each built around the kit's dialog, once. Synthetic data
 * only; nothing leaves the page.
 */

const ADA = { id: 7, email: "ada@example.com", display_name: "Ada Example" };

let uploads = 0;

// Every link stays in the showcase; in an app they are /assistant, /support, /my-feedback
// and /feedback (the menu's defaults).
const HERE = "/feedback-compose";

export function FeedbackSubmit027Demo() {
  const [role, setRole] = useState<"user" | "admin">("user");
  const [outcome, setOutcome] = useState<"ok" | "fail">("ok");
  const [last, setLast] = useState<FeedbackCreatePayload | null>(null);
  const [attach, setAttach] = useState(true);

  const feedback = useFeedbackSubmit({
    // An app's authed client goes here; the demo hands back a made-up attachment URL.
    upload: async (file) => {
      await beat(300);
      const ext = file.name.split(".").pop() ?? "bin";
      return `/api/v1/feedback/attachments/${(++uploads).toString(16).padStart(12, "0")}.${ext}`;
    },
    create: async (payload) => {
      await beat(500);
      if (outcome === "fail") throw new Error("Demo: the server said no");
      setLast(payload);
      return { id: 412 };
    },
    user: ADA,
    environment: "local",
    version: "0.27.0",
  });

  // keksdose's extra rows, as an app passes them: the help assistant and the support chat
  // with its unread count.
  const extraEntries: TopBarMenuEntry[] = [
    { kind: "link", key: "assistant", to: HERE, icon: <Sparkles className="size-4" />, label: "Help assistant" },
    {
      kind: "link",
      key: "support",
      to: HERE,
      icon: <MessagesSquare className="size-4" />,
      label: "Support chat",
      trailing: (
        <Chip size="sm" variant="solid" tone="danger">
          2
        </Chip>
      ),
    },
  ];

  const here = typeof window === "undefined" ? "" : window.location.href;

  return (
    <>
      <Example
        label="FeedbackMenu + useFeedbackSubmit — the top-bar menu and the wired dialog"
        hint="pick a row; the report is not sent anywhere — its payload is printed below"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              aria-label="Signed in as"
              value={role}
              onChange={(v) => setRole(v as "user" | "admin")}
              options={[
                { value: "user", label: "User" },
                { value: "admin", label: "Admin" },
              ]}
            />
            <ToggleGroup
              aria-label="The create call"
              value={outcome}
              onChange={(v) => setOutcome(v as "ok" | "fail")}
              options={[
                { value: "ok", label: "Succeeds" },
                { value: "fail", label: "Fails" },
              ]}
            />
          </div>
          {/* A stand-in for the app's top bar: the menu sits where the app puts it. */}
          <div className="flex items-center justify-end gap-1 rounded-lg border border-subtle bg-surface px-3 py-1.5">
            <span className="me-auto text-sm font-semibold text-primary">Example Ltd</span>
            <FeedbackMenu
              onFile={feedback.open}
              isAdmin={role === "admin"}
              extraEntries={extraEntries}
              myFeedbackHref={HERE}
              inboxHref="/feedback-inbox"
              iconBadge={{ label: "2 unread", tone: "danger" }}
            />
          </div>
          {feedback.dialog}
          {last && (
            <pre className="max-h-72 overflow-auto rounded-md bg-surface-2 p-3 text-xs text-secondary">
              {JSON.stringify(last, null, 2)}
            </pre>
          )}
          <Note>
            {code("<FeedbackMenu onFile={feedback.open} isAdmin={…} />")} draws §4.1: Bug · Idea · Question · Other,
            a rule, the app&apos;s {code("extraEntries")}, then the list links: {code("Feedback discussion")} with{" "}
            {code("publicHref")}, {code("My feedback")} for everyone and {code("Feedback inbox")} for an admin (0.40) —
            never a Crash row. {code("useFeedbackSubmit")} takes the
            app&apos;s {code("upload(file) → url")} and {code("create(payload)")} and owns the rest: multiple attachments
            (one screenshot + 5 files, images/PDF/text, 10 MB), the capture, the context box, uploads before the create,
            and every toast in the kit&apos;s words. Hand it {code("errorMessage")} to toast the server&apos;s{" "}
            {code("detail")} instead of the generic failure.
          </Note>
        </div>
        <Note>Since 0.27.</Note>
      </Example>

      <Example
        label="FeedbackContextBox + feedbackContext() — what the box shows is what is sent"
        hint="untick the box: the URL is struck through, and url / route go empty"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <FeedbackContextBox user={ADA} url={here} attachUrl={attach} onAttachUrlChange={setAttach} />
          <pre className="min-w-0 overflow-auto rounded-md bg-surface-2 p-3 text-xs text-secondary">
            {JSON.stringify(
              feedbackContext({ user: ADA, attachUrl: attach, url: here, environment: "local", version: "0.27.0" }),
              null,
              2,
            )}
          </pre>
        </div>
        <Note>
          One set of values feeds both, so the box cannot promise one thing while the report carries another.{" "}
          {code("origin")} and {code("environment")} are never withheld — which copy of the app is not personal, and
          triage asks it first.
        </Note>
        <Note>Since 0.27.</Note>
      </Example>
    </>
  );
}
