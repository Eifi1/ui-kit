import { useRef, useState } from "react";
import { Camera, Paperclip, Upload } from "lucide-react";
import { AlertBanner, Button, Checkbox, FileButton, FileDropzone, useFilePicker } from "@eifi1/ui-kit";
import type { FileRejection } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

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
        hint="isValid + invalidMessage refuse an empty file; labels rewords the built-in refusals."
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
        hint="No isValid: the zone checks accept (PDF) and maxSize (2 MB) itself."
      >
        <Stage>
          <DropzoneSingle />
        </Stage>
      </Example>

      <Example
        label="FileDropzone — the default toast, and a check of its own"
        hint="No onReject/onInvalid: refusals toast. With isValid, accept is not re-checked."
      >
        <Stage>
          <DropzoneToast />
          <DropzoneOwnCheck />
        </Stage>
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

/** The caller's own check. `accept` still filters the dialog but is NOT re-checked:
 *  `isValid` is taken to be the type check. `onInvalid` gets each refused file. */
function DropzoneOwnCheck() {
  const [file, setFile] = useState<File | null>(null);
  const [refused, setRefused] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      <FileDropzone
        file={file}
        onFileSelected={setFile}
        onClear={() => setFile(null)}
        accept=".zip"
        isValid={(f) => /\.zip$/i.test(f.name) && f.size > 0}
        invalidMessage="Only a non-empty .zip export can be imported"
        onInvalid={(f) => setRefused((r) => [...r, f.name].slice(-3))}
        rejectionFeedback="inline"
        labels={{ remove: (name) => `Discard ${name}` }}
        aria-label="Budget export (.zip)"
        dropLabel="Drop a budget export"
        browseLabel="Choose .zip…"
        emptyLabel="Drop the .zip here"
        hint="Checked by isValid"
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
