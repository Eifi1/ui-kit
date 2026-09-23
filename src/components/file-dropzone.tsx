import { useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "./ui";
import { cn } from "../lib/cn";
import { useKitFileLabels } from "../i18n/kit-labels";

/**
 * `onInvalid` is omitted from the `<div>` attributes and kept as this component's own.
 * The DOM event of that name belongs to form validation and takes a `FormEvent`; this
 * one takes the rejected `File`, and the kit's meaning is the one every caller already
 * writes. Everything else a `<div>` takes reaches the root — which carries
 * `role="button"`, so that is also where an `aria-label` or an `aria-describedby`
 * belongs.
 */
export interface FileDropzoneProps extends Omit<ComponentPropsWithoutRef<"div">, "onInvalid"> {
  file: File | null;
  onFileSelected: (file: File) => void;
  accept: string;
  isValid: (file: File) => boolean;
  invalidMessage: string;
  /**
   * How to surface {@link invalidMessage}. Defaults to a `sonner` toast — an
   * optional peer, imported only when a file is actually rejected. Pass your own to
   * route it somewhere else, or a no-op to silence it. The same escape hatch, for
   * the same reason, as `useWizard`'s `onValidationFailed`.
   *
   * It exists so this module does not import `sonner` STATICALLY. `package.json`
   * declares that peer `optional`, and the barrel re-exports this file — so a
   * top-level `import { toast } from "sonner"` made the claim false for everybody:
   * in an app that installed `@hb/ui` without sonner, `import { Button } from
   * "@hb/ui"` failed to resolve and `tsc --noEmit` failed on the missing types,
   * without a FileDropzone anywhere in it. Both current consumers happen to depend
   * on sonner, which is why nothing broke and why the contradiction survived:
   * `use-wizard.ts` had already answered the identical question the other way, in
   * writing, two modules over.
   */
  onInvalid?: (file: File) => void;
  /** The dropzone's accessible name, and the instruction shown on it. A caller's own
   *  `aria-label` wins over it — see the root element below. */
  dropLabel: string;
  browseLabel: string;
  emptyLabel: string;
  hint: string;
  /** Extra classes for the dropzone's root. */
  className?: string;
}

/** Drag-and-drop file picker shared by the import wizards (YNAB zip, CAMT xml).
 * Validation failures surface `invalidMessage` (a `sonner` toast by default, see
 * `onInvalid`); the chosen file is echoed with its size, otherwise `emptyLabel` +
 * `hint` describe what to drop. */
export function FileDropzone({
  file,
  onFileSelected,
  accept,
  isValid,
  invalidMessage,
  onInvalid,
  dropLabel,
  browseLabel,
  emptyLabel,
  hint,
  className,
  "aria-label": ariaLabel,
  ...rest
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The size through the kit's `file.size` label (the provider's locale by default).
  // This was `${n / 1024} KB`: ASCII digits, an English unit, and a binary kilobyte
  // mislabelled as a decimal one, all in one template literal.
  const fileText = useKitFileLabels();

  const acceptFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!isValid(f)) {
      if (onInvalid) {
        onInvalid(f);
      } else {
        // sonner is an optional peer: imported here, on the failure path only, so an
        // app that never trips this never has to install it. Not awaited — nothing
        // downstream depends on the toast having appeared, and the handlers that
        // reach this are DOM events.
        void import("sonner").then(({ toast }) => toast.error(invalidMessage));
      }
      return;
    }
    onFileSelected(f);
  };

  return (
    <div
      // `...rest` first: every handler below is the drop gesture itself, and the
      // `role`/`tabIndex` pair is what makes this div operable by keyboard at all.
      {...rest}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes("Files")) setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        if (!dragOver && e.dataTransfer.types.includes("Files")) setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        acceptFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      // The DOM spelling wins over `dropLabel`, which stays the name for every caller
      // that passes no `aria-label` — i.e. all of them today. Standardising on
      // `aria-label` (audit §api-design) does not get to silently rename an existing
      // required prop.
      aria-label={ariaLabel ?? dropLabel}
      className={cn(
        // `relative` is load-bearing, not cosmetic. The file input below is `sr-only`,
        // which Tailwind implements as `position: absolute` — so without a positioned
        // ancestor its containing block is the INITIAL one, and it is laid out at its
        // own offset from the top of the document. Nothing looks wrong, because the
        // input is 1x1 and clipped; what breaks is the page height. On a long page
        // every escaped sr-only element extends `documentElement.scrollHeight` to its
        // own offset, which produces a second, whole-document scrollbar alongside the
        // app shell's own — one that scrolls past the end of the content into nothing.
        // Measured on the showcase: body 900px, document 47,919px.
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
        // Three states out of two border tokens: the target rests on the plain
        // hairline, hover pulls it to `--border-strong`, and a live drag keeps that
        // border and adds the `--bg-active` wash on top — so "let go here" still reads
        // one step louder than "you are over it".
        dragOver
          ? "border-[var(--border-strong)] bg-[var(--bg-active)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)]",
        className,
      )}
    >
      <Upload className="size-5 text-[var(--text-muted)]" />
      <div className="text-sm text-[var(--text-secondary)]">
        {file ? <span className="font-medium">{file.name}</span> : emptyLabel}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        {file ? fileText.size(file.size) : hint}
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        {browseLabel}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => acceptFile(e.target.files?.[0])}
        className="sr-only"
      />
    </div>
  );
}
