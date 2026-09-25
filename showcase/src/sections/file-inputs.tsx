import { useId, useRef, useState } from "react";
import { Camera, Paperclip, Upload } from "lucide-react";
import { AlertBanner, Button, Checkbox, FileButton, FileDropzone, useFilePicker } from "@eifi1/ui-kit";
import type { FileDropzoneRejectionFeedback, FilePickerLabels, FileRejection } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row, Stage } from "../lib/section";

/**
 * FILE INPUTS — `FileButton`, `useFilePicker` and the 0.6 `FileDropzone`.
 *
 * Every specimen reports refusals through `onReject` and draws them itself (an
 * `AlertBanner` without `role="alert"`, since the kit already speaks them), so the page
 * never needs a toaster to demonstrate one.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

const names = (files: readonly File[]) => (files.length ? files.map((f) => f.name).join(", ") : "—");

export function FileInputs() {
  return (
    <>
      <Example
        label="FileButton — one file"
        hint="Pick the same file twice: the second pick still arrives (the input resets itself)."
      >
        <Stage>
          <SingleButton />
        </Stage>
      </Example>

      <Example
        label="FileButton — several files, capped"
        hint="At most 3 files of up to 1 MB. Pick more, or a bigger one, to see the refusals."
      >
        <Stage>
          <CappedButton />
        </Stage>
      </Example>

      <Example
        label="FileButton — camera, pending, droppable"
        hint='capture="environment" opens the back camera on a phone; drop a file on the second button.'
      >
        <Stage>
          <CameraAndDrop />
        </Stage>
      </Example>

      <Example
        label="FileButton — own check, own words, opened through its ref"
        hint="isValid + invalidMessage refuse an empty file (a check accept cannot make); labels rewords the built-in refusals."
      >
        <Stage>
          <OwnWordsButton />
        </Stage>
      </Example>

      <Example
        label="useFilePicker — someone else's trigger"
        hint="The headless half: the input and the checks, opened from any control — or fed a paste with take()."
      >
        <Stage>
          <HeadlessPicker />
        </Stage>
      </Example>

      <Example
        label="FileDropzone — remove inside the zone, inline refusal"
        hint="No isValid: the zone checks accept (PDF) and maxSize (2 MB) itself, and a wrong type is refused by naming what is accepted."
      >
        <Stage>
          <DropzoneSingle />
        </Stage>
      </Example>

      <Example
        label="FileDropzone — rejectionFeedback, labels and the refusal payload"
        hint="Switch the mode, then pick a non-.txt file or one over 2 kB."
      >
        <DropzoneFeedback />
      </Example>

      <Example
        label="FileDropzone — the default toast, and the default type refusal"
        hint="No onReject/onInvalid: refusals toast. No isValid: accept alone refuses a wrong type, in words that name it."
      >
        <Stage>
          <DropzoneToast />
          <DropzoneAcceptOnly />
        </Stage>
        <Note>
          Drop a non-.zip on the second zone: the refusal reads{" "}
          <em>&ldquo;Only .zip files&rdquo;</em> — the new{" "}
          <code className="font-mono">filePicker.rejectedTypeOnly(accept, name)</code>, handed{" "}
          <code className="font-mono">accept</code>&apos;s tokens lower-cased and joined with
          &ldquo;, &rdquo;. Before 0.7.0 the default said only that the type was unsupported, so
          apps kept an <code className="font-mono">isValid</code> +{" "}
          <code className="font-mono">invalidMessage</code> per form just to say which type was
          wanted; <code className="font-mono">accept</code> already knows. Keep{" "}
          <code className="font-mono">isValid</code> for what <code className="font-mono">accept</code>{" "}
          cannot see — the empty statement in &ldquo;own check, own words&rdquo; above. A host that
          translated <code className="font-mono">rejectedType</code> but not yet{" "}
          <code className="font-mono">rejectedTypeOnly</code> keeps its own sentence rather than
          an English one (that button does exactly this). All seven shipped locales carry it.
        </Note>
        <Note>
          With no <code className="font-mono">onInvalid</code>, a rejection does{" "}
          <code className="font-mono">await import("sonner")</code> and toasts. The static
          import is avoided on purpose: sonner is an OPTIONAL peer, and the barrel re-exports
          this module — so importing it at the top would have broken{" "}
          <code className="font-mono">import {"{"} Button {"}"}</code> for any app that never
          installs it.
        </Note>
      </Example>

      <Example label="FileDropzone — multiple" hint="Up to 4 images; each can be removed on its own.">
        <Stage>
          <div data-stage="wide">
            <DropzoneMultiple />
          </div>
        </Stage>
      </Example>

      <Example
        label="All or nothing — onPick"
        hint="PDF or images, 1 MB each. One bad file refuses the whole pick, and it is said once."
      >
        <Stage>
          <WholePickButton />
          <div data-stage="wide">
            <WholePickDropzone />
          </div>
        </Stage>
      </Example>
    </>
  );
}

/** Shows the latest refusal, the way a host renders `rejections[0].message`. */
function Refusal({ rejections }: { rejections: FileRejection[] }) {
  if (rejections.length === 0) return null;
  return (
    <AlertBanner>
      {rejections.map((r) => (
        <span key={`${r.file.name}-${r.reason}`} className="block">
          {r.message}
        </span>
      ))}
    </AlertBanner>
  );
}

function SingleButton() {
  const [picks, setPicks] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      <FileButton
        variant="secondary"
        accept=".csv,.txt,text/csv,text/plain"
        onFiles={([f]) => setPicks((p) => [...p, f.name].slice(-3))}
      >
        <Upload aria-hidden className="size-4" />
        Choose CSV
      </FileButton>
      <p className={READOUT}>last picks: {picks.length ? picks.join(" · ") : "—"}</p>
    </div>
  );
}

function CappedButton() {
  const MAX = 3;
  const [files, setFiles] = useState<File[]>([]);
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  const left = MAX - files.length;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <FileButton
          multiple
          maxFiles={left}
          maxSize={1_000_000}
          disabled={left === 0}
          onFiles={(picked) => {
            setRejections([]);
            setFiles((f) => [...f, ...picked]);
          }}
          onReject={setRejections}
        >
          <Paperclip aria-hidden className="size-4" />
          Attach ({files.length}/{MAX})
        </FileButton>
        <Button variant="ghost" disabled={files.length === 0} onClick={() => setFiles([])}>
          Reset
        </Button>
      </div>
      <p className={READOUT}>files: {names(files)}</p>
      <Refusal rejections={rejections} />
    </div>
  );
}

function CameraAndDrop() {
  const [pending, setPending] = useState(false);
  const [last, setLast] = useState<string>("—");
  const upload = (files: File[]) => {
    setLast(names(files));
    // A pretend upload, so `pending` has something to show.
    setPending(true);
    window.setTimeout(() => setPending(false), 1200);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <FileButton accept="image/*" capture="environment" pending={pending} onFiles={upload}>
          <Camera aria-hidden className="size-4" />
          Photograph receipt
        </FileButton>
        <FileButton variant="secondary" droppable pending={pending} onFiles={upload}>
          Choose or drop
        </FileButton>
      </div>
      <p className={READOUT}>uploaded: {last}</p>
    </div>
  );
}

function HeadlessPicker() {
  const [files, setFiles] = useState<File[]>([]);
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  const [locked, setLocked] = useState(false);
  const picker = useFilePicker({
    accept: ".pdf,application/pdf,image/*",
    multiple: true,
    maxSize: 2_000_000,
    // `open()` and `take()` both do nothing while this is set.
    disabled: locked,
    onFiles: (picked) => {
      setRejections([]);
      setFiles((f) => [...f, ...picked]);
    },
    onReject: setRejections,
  });
  return (
    <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
      {picker.element}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">Lease documents</span>
        <Button variant="ghost" disabled={locked} onClick={picker.open}>
          + Add
        </Button>
      </div>
      <textarea
        aria-label="Paste a file here"
        placeholder="…or copy a file and paste it here"
        rows={2}
        readOnly
        onPaste={(e) => {
          if (e.clipboardData.files.length === 0) return;
          e.preventDefault();
          picker.take(e.clipboardData.files);
        }}
        className="w-full resize-none rounded-md border border-dashed border-[var(--border)] bg-transparent p-2 text-xs text-[var(--text-secondary)]"
      />
      <Checkbox
        label="Lock the card (disabled)"
        checked={locked}
        onChange={(e) => setLocked(e.target.checked)}
      />
      <p className={READOUT}>files: {names(files)}</p>
      <Refusal rejections={rejections} />
    </div>
  );
}

/** `isValid` + `invalidMessage`, `labels`, and the ref: the `<button>` itself, so a
 *  second control can open the same picker with `ref.current.click()`. */
function OwnWordsButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  return (
    <div className="space-y-2">
      <FileButton
        ref={ref}
        variant="secondary"
        accept=".csv,text/csv"
        maxSize={500_000}
        isValid={(f) => f.size > 0}
        invalidMessage="That file is empty — export the statement again."
        labels={{
          rejectedType: (name) => `Only CSV statements can be imported, not “${name}”.`,
          rejectedSize: (name, max) => `“${name}” is over ${max}; split the export by month.`,
        }}
        onFiles={([f]) => {
          setRejections([]);
          setFile(f);
        }}
        onReject={setRejections}
      >
        <Upload aria-hidden className="size-4" />
        Import statement
      </FileButton>
      <p className="text-xs text-[var(--text-secondary)]">
        No button handy?{" "}
        <button
          type="button"
          className="text-[var(--brand)] underline"
          onClick={() => ref.current?.click()}
        >
          Open it from this link
        </button>
        .
      </p>
      <p className={READOUT}>file: {file?.name ?? "—"}</p>
      <Refusal rejections={rejections} />
    </div>
  );
}

function DropzoneSingle() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <FileDropzone
      file={file}
      onFileSelected={setFile}
      onClear={() => setFile(null)}
      accept=".pdf,application/pdf"
      maxSize={2_000_000}
      rejectionFeedback="inline"
      dropLabel="Drop a floor plan"
      browseLabel="Browse…"
      emptyLabel="Drop a PDF here"
      hint="Up to 2 MB"
    />
  );
}

/** No `onReject`, no `onInvalid`, no `rejectionFeedback`: the 0.5 default, a toast. */
function DropzoneToast() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <FileDropzone
      file={file}
      onFileSelected={setFile}
      onClear={() => setFile(null)}
      accept="image/*"
      maxSize={1_000_000}
      dropLabel="Drop a profile photo"
      browseLabel="Browse…"
      emptyLabel="Drop an image"
      hint="Refusals appear as a toast"
    />
  );
}

/** `accept` alone, no `isValid`: a wrong type is refused with the default
 *  `rejectedTypeOnly`, which names the accepted types. `onInvalid` gets each refused
 *  file, and (like `onReject`) switches the toast off. */
function DropzoneAcceptOnly() {
  const [file, setFile] = useState<File | null>(null);
  const [refused, setRefused] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      <FileDropzone
        file={file}
        onFileSelected={setFile}
        onClear={() => setFile(null)}
        accept=".zip"
        onInvalid={(f) => setRefused((r) => [...r, f.name].slice(-3))}
        rejectionFeedback="inline"
        labels={{ remove: (name) => `Discard ${name}` }}
        aria-label="Budget export (.zip)"
        dropLabel="Drop a budget export"
        browseLabel="Choose .zip…"
        emptyLabel="Drop the .zip here"
        hint="Checked by accept alone"
      />
      <p className={READOUT}>onInvalid: {refused.length ? refused.join(" · ") : "—"}</p>
    </div>
  );
}

function DropzoneMultiple() {
  const MAX = 4;
  const [files, setFiles] = useState<File[]>([]);
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  return (
    <div className="space-y-2">
      <FileDropzone
        multiple
        files={files}
        onFilesSelected={(picked) => {
          setRejections([]);
          setFiles((f) => [...f, ...picked]);
        }}
        onRemove={(_, i) => setFiles((f) => f.filter((__, j) => j !== i))}
        onClear={() => setFiles([])}
        onReject={setRejections}
        accept="image/*"
        maxFiles={MAX - files.length}
        dropLabel="Drop photos"
        browseLabel="Add photos…"
        emptyLabel="Drop up to four photos"
        hint="Images only"
      />
      <Refusal rejections={rejections} />
      <Note>
        <code className="font-mono">onReject</code> switches the legacy toast off, exactly as{" "}
        <code className="font-mono">onInvalid</code> always did. A caller that passes neither still
        gets the 0.5 toast; <code className="font-mono">rejectionFeedback</code> picks{" "}
        <code className="font-mono">"inline"</code> or <code className="font-mono">"none"</code> explicitly.
      </Note>
    </div>
  );
}

/** The whole pick judged at once: `onPick` sees both halves and returns `false` to
 *  refuse all of it. The button takes the pick through `onPick` alone — no `onFiles`. */
function WholePickButton() {
  const [files, setFiles] = useState<File[]>([]);
  const [refused, setRefused] = useState<FileRejection[]>([]);
  return (
    <div className="space-y-2">
      <FileButton
        multiple
        droppable
        variant="secondary"
        accept="application/pdf,image/*"
        maxSize={1_000_000}
        onPick={(accepted, rejected) => {
          setRefused(rejected);
          if (rejected.length > 0) return false;
          setFiles(accepted);
        }}
      >
        <Paperclip aria-hidden className="size-4" />
        Attach a set
      </FileButton>
      <p className={READOUT}>set: {names(files)}</p>
      <Refusal rejections={refused} />
    </div>
  );
}

function WholePickDropzone() {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <div className="space-y-2">
      <FileDropzone
        multiple
        files={files}
        onFilesSelected={setFiles}
        onClear={() => setFiles([])}
        onPick={(_accepted, rejected) => rejected.length === 0 || false}
        rejectionFeedback="inline"
        accept="application/pdf,image/*"
        maxSize={1_000_000}
        dropLabel="Drop a set of documents"
        browseLabel="Choose files…"
        emptyLabel="Drop the whole set"
        hint="PDF or images, 1 MB each — all or nothing"
      />
      <Note>
        Returning <code className="font-mono">false</code> from{" "}
        <code className="font-mono">onPick</code> delivers nothing, still hands the screening&apos;s
        refusals to <code className="font-mono">onReject</code>, and replaces the per-file message
        with one sentence for the pick (<code className="font-mono">labels.rejectedPick</code>) —
        spoken, and shown inline here.
      </Note>
    </div>
  );
}

/* ── rejectionFeedback, labels and the refusal payload ─────────────────────
 * Moved here from the old "Tour, palette & files" page, with the two dropzone
 * specimens it had beside it folded into the ones above: its default-toast zone is
 * "the default toast" (the note on why sonner is imported lazily came along), and its
 * onInvalid zone is "a check of its own".
 */

const FEEDBACK_MODES: FileDropzoneRejectionFeedback[] = ["toast", "inline", "none"];

/** Overridden in German, so it is plain which strings came from `labels`. */
const DROPZONE_LABELS_DE: Partial<FilePickerLabels> = {
  rejectedType: (name) => `„${name}“ ist keine Textdatei`,
  rejectedTypeOnly: (accept, name) => `Nur ${accept} — „${name}“ passt nicht`,
  rejectedSize: (name, max) => `„${name}“ ist größer als ${max}`,
  selected: (_count, name) => `„${name}“ ausgewählt`,
  remove: (name) => `„${name}“ entfernen`,
  removed: (name) => `„${name}“ entfernt`,
};

function DropzoneFeedback() {
  const [mode, setMode] = useState<FileDropzoneRejectionFeedback>("inline");
  const [file, setFile] = useState<File | null>(null);
  const [rejections, setRejections] = useState<FileRejection[] | null>(null);
  const helpId = useId();

  return (
    <div className="space-y-3">
      <Row>
        {FEEDBACK_MODES.map((m) => (
          <Button
            key={m}
            variant={m === mode ? "brand" : "secondary"}
            aria-pressed={m === mode}
            onClick={() => setMode(m)}
          >
            rejectionFeedback=&quot;{m}&quot;
          </Button>
        ))}
      </Row>
      <FileDropzone
        file={file}
        onFileSelected={(f) => {
          setRejections(null);
          setFile(f);
        }}
        onClear={() => setFile(null)}
        // Without `isValid`, the zone checks `accept` itself — a drop ignores the
        // dialog's filter, so this is what refuses a dragged-in .png.
        accept=".txt,text/plain"
        maxSize={2_000}
        rejectionFeedback={mode}
        onReject={setRejections}
        labels={DROPZONE_LABELS_DE}
        // The DOM spelling wins over dropLabel as the accessible name; a caller's own
        // description is merged with the inline error's.
        aria-label="Textnotiz ablegen"
        aria-describedby={helpId}
        className="bg-[var(--bg-surface-2)]"
        dropLabel="Drop a text note"
        browseLabel="Choose a note…"
        emptyLabel="Drop a .txt note here"
        hint="Plain text, at most 2 kB"
      />
      <p id={helpId} className="text-xs text-[var(--text-muted)]">
        Notes are attached to the current row. (This paragraph is the zone&apos;s own{" "}
        <code className="font-mono">aria-describedby</code>.)
      </p>
      <OutTable
        rows={[
          ["file", file ? `${file.name} (${file.size} B)` : "null"],
          [
            "onReject(rejections)",
            rejections
              ? rejections.map((r) => `{ reason: "${r.reason}", message: "${r.message}" }`).join(", ")
              : "—",
          ],
        ]}
      />
      <Note>
        <code className="font-mono">"toast"</code> goes through sonner;{" "}
        <code className="font-mono">"inline"</code> prints under the zone in the danger colour
        and ties it to the zone with <code className="font-mono">aria-describedby</code>;{" "}
        <code className="font-mono">"none"</code> shows nothing and leaves it to the caller — the
        payload above. Inline and none are also spoken through the zone&apos;s live region (a
        toast through sonner&apos;s own). Drag a file over the zone to see the drag-over wash.
        The zone is a named <code className="font-mono">role=&quot;group&quot;</code>, not a
        button: Tab reaches Browse (and the remove button) directly, and a click anywhere on the
        zone is a pointer shortcut for Browse — the zone used to be a{" "}
        <code className="font-mono">role=&quot;button&quot;</code> with real buttons nested in
        it, which ARIA forbids.
      </Note>
    </div>
  );
}
