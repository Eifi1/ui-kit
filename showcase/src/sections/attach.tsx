import { useState } from "react";
import {
  AlertBanner,
  AttachButton,
  FeedbackAttachmentField,
  FileDropzone,
  attachDropzoneProps,
  formatFileSize,
} from "@eifi1/ui-kit";
import type { AttachOptions, AttachSource, FileRejection } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Stage, code } from "../lib/section";

/**
 * ATTACH — `AttachButton`: camera, photos, files and a screenshot behind one paperclip,
 * and the feedback field's `picker="sheet"`.
 *
 * Every specimen draws its refusals itself from `onReject` (the kit already speaks them),
 * and the screenshot is a stand-in: a one-pixel PNG, so the page needs no capture library.
 */

/** A 1×1 transparent PNG, as a capture would hand one over. */
function fakeScreenshot(): Promise<File> {
  const bytes = Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
    (c) => c.charCodeAt(0),
  );
  return Promise.resolve(new File([bytes], "screenshot.png", { type: "image/png" }));
}

const listed = (files: readonly File[]) =>
  files.length ? files.map((f) => `${f.name} (${formatFileSize(f.size)})`).join(", ") : "—";

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

/** The last hand-over and refusal of one specimen. */
function useLast() {
  const [last, setLast] = useState<{ files: File[]; source: AttachSource | "—" }>({ files: [], source: "—" });
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  return {
    last,
    rejections,
    onFiles: (files: File[], source: AttachSource) => {
      setRejections([]);
      setLast({ files, source });
    },
    onReject: (r: FileRejection[]) => setRejections(r),
  };
}

export function AttachDemo() {
  return (
    <>
      <Example
        label="AttachButton — a sheet on a phone, a menu on a desktop"
        hint="Narrow the window below md for the sheet. Up to 5 images or PDFs of 2 MB; the camera keeps several pages and hands them over together."
      >
        <Stage>
          <SheetSpecimen />
        </Stage>
        <Note>
          The tiles follow {code("accept")}: on a touch screen Photos asks for its image types (the gallery) and Files
          for the rest (the document picker); with a mouse both are one file dialog, so the menu says Files once. Camera
          shows where a JPEG may come in and {code("useHasCamera()")} does not say there is none; Screenshot with{" "}
          {code("onCaptureScreenshot")}, and the sheet is gone before it is called. Every pick is screened against the
          whole {code("accept")}, and {code("onFiles")} says where it came from.
        </Note>
      </Example>

      <Example
        label="AttachButton — one way in opens it directly"
        hint="Only PDFs, and no camera for a PDF: no sheet and no menu, the paperclip is the file dialog."
      >
        <Stage>
          <DirectSpecimen />
        </Stage>
      </Example>

      <Example
        label='AttachButton — layout="inline" in a FileDropzone'
        hint="The tiles as buttons in the zone, one tap each; a drop on the zone is screened by the same options and arrives as “drop”."
      >
        <Stage>
          <InlineSpecimen />
        </Stage>
      </Example>

      <Example
        label='FeedbackAttachmentField — picker="sheet"'
        hint="One trigger instead of the add and capture buttons; the Screenshot tile is offered while the screenshot slot is empty."
      >
        <Stage>
          <FeedbackSpecimen />
        </Stage>
      </Example>
    </>
  );
}

function SheetSpecimen() {
  const { last, rejections, onFiles, onReject } = useLast();
  return (
    <div className="space-y-2">
      <AttachButton
        variant="secondary"
        accept="image/*,application/pdf"
        multiple
        maxFiles={5}
        maxSize={2_000_000}
        camera={{ fileName: "receipt" }}
        onCaptureScreenshot={fakeScreenshot}
        onFiles={onFiles}
        onReject={onReject}
      />
      <OutTable
        rows={[
          ["source", last.source],
          ["files", listed(last.files)],
        ]}
      />
      <Refusal rejections={rejections} />
    </div>
  );
}

function DirectSpecimen() {
  const { last, rejections, onFiles, onReject } = useLast();
  return (
    <div className="space-y-2">
      <AttachButton variant="ghost" iconOnly accept="application/pdf" onFiles={onFiles} onReject={onReject} />
      <OutTable rows={[["files", listed(last.files)]]} />
      <Refusal rejections={rejections} />
    </div>
  );
}

function InlineSpecimen() {
  const { last, rejections, onFiles, onReject } = useLast();
  const options: AttachOptions = {
    accept: "image/jpeg,image/png,application/pdf",
    multiple: true,
    maxFiles: 10,
    pick: "whole",
    onFiles,
    onReject,
  };
  return (
    <div className="space-y-2">
      <FileDropzone
        {...attachDropzoneProps(options)}
        rejectionFeedback="none"
        renderBody={() => (
          <div className="flex flex-col items-center gap-2 py-2">
            <AttachButton {...options} layout="inline" size="sm" />
          </div>
        )}
      />
      <OutTable
        rows={[
          ["source", last.source],
          ["files", listed(last.files)],
        ]}
      />
      <Refusal rejections={rejections} />
    </div>
  );
}

function FeedbackSpecimen() {
  const [files, setFiles] = useState<File[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  return (
    <FeedbackAttachmentField
      picker="sheet"
      multiple
      value={files}
      onChange={setFiles}
      screenshot={screenshot}
      onScreenshotChange={setScreenshot}
      onCaptureScreenshot={fakeScreenshot}
    />
  );
}
