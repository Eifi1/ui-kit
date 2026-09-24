import { useState } from "react";
import { Camera, Paperclip, Upload } from "lucide-react";
import { AlertBanner, Button, FileButton, FileDropzone, useFilePicker } from "@eifi1/ui-kit";
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
        label="useFilePicker — someone else's trigger"
        hint="The headless half: the input and the checks, opened from any control."
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

      <Example label="FileDropzone — multiple" hint="Up to 4 images; each can be removed on its own.">
        <Stage>
          <div data-stage="wide">
            <DropzoneMultiple />
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
  const [file, setFile] = useState<File | null>(null);
  const picker = useFilePicker({ accept: ".pdf,application/pdf", onFiles: ([f]) => setFile(f) });
  return (
    <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
      {picker.element}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">Lease documents</span>
        <Button variant="ghost" onClick={picker.open}>
          + Add
        </Button>
      </div>
      <p className={READOUT}>file: {file?.name ?? "—"}</p>
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
