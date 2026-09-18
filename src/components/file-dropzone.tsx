import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "./ui";
import { cn } from "../lib/cn";

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
}: {
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
  dropLabel: string;
  browseLabel: string;
  emptyLabel: string;
  hint: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      aria-label={dropLabel}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragOver
          ? "border-slate-500 bg-slate-100 dark:border-slate-300 dark:bg-slate-800"
          : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500",
      )}
    >
      <Upload className="size-5 text-slate-500 dark:text-slate-400" />
      <div className="text-sm text-slate-700 dark:text-slate-200">
        {file ? <span className="font-medium">{file.name}</span> : emptyLabel}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {file ? `${Math.round(file.size / 1024)} KB` : hint}
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
