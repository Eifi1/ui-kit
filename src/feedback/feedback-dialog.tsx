import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Paperclip, X } from "lucide-react";
import { Button, Input, Select, Textarea } from "../components/ui";
import { Modal } from "../components/modal";

export interface FeedbackCategoryOption {
  value: string;
  label: string;
}

export interface FeedbackDialogLabels {
  title: string;
  category: string;
  subject: string;
  body: string;
  attachment: string;
  attachmentAdd: string;
  attachmentRemove: string;
  submitHint: string;
  cancel: string;
  save: string;
}

export interface FeedbackSubmission {
  title: string;
  body: string;
  category: string;
  attachment: File | null;
}

const DEFAULT_ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The generic feedback form dialog: category + subject + body + an optional image
 * attachment, with Ctrl/Cmd+Enter to submit. Domain-free — the app supplies the
 * category options, labels and an `onSubmit` that talks to its own backend, plus
 * an optional `contextSlot` for app-specific context (user, current URL, …).
 */
export function FeedbackDialog({
  open,
  onClose,
  categories,
  category,
  onCategoryChange,
  labels,
  onSubmit,
  submitting = false,
  contextSlot,
  attachmentAccept = DEFAULT_ACCEPT,
  maxAttachmentBytes = DEFAULT_MAX_BYTES,
  onAttachmentError,
}: {
  open: boolean;
  onClose: () => void;
  categories: FeedbackCategoryOption[];
  category: string;
  onCategoryChange: (value: string) => void;
  labels: FeedbackDialogLabels;
  onSubmit: (data: FeedbackSubmission) => void | Promise<void>;
  submitting?: boolean;
  contextSlot?: ReactNode;
  attachmentAccept?: string[];
  maxAttachmentBytes?: number;
  onAttachmentError?: (kind: "type" | "size") => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset the form whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setAttachment(null);
    }
  }, [open]);

  // Object-URL preview lifecycle (create on change, revoke on cleanup).
  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview(null);
      return;
    }
    const url = URL.createObjectURL(attachment);
    setAttachmentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  const pickAttachment = (file: File | undefined | null) => {
    if (!file) return;
    if (!attachmentAccept.includes(file.type)) {
      onAttachmentError?.("type");
      return;
    }
    if (file.size > maxAttachmentBytes) {
      onAttachmentError?.("size");
      return;
    }
    setAttachment(file);
  };

  const canSubmit = !!title && !!body && !submitting;
  const trySubmit = () => {
    if (canSubmit) void onSubmit({ title, body, category, attachment });
  };

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          trySubmit();
        }
      }}
    >
      <h2 className="mb-3 text-lg font-semibold">{labels.title}</h2>
      <div className="space-y-3">
        <Select label={labels.category} value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Input label={labels.subject} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea rows={5} label={labels.body} value={body} onChange={(e) => setBody(e.target.value)} />
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {labels.attachment}
          </div>
          {attachment && attachmentPreview ? (
            <div className="flex items-start gap-2">
              <img
                src={attachmentPreview}
                alt={attachment.name}
                className="h-20 w-20 rounded border border-slate-200 object-cover dark:border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-slate-700 dark:text-slate-200">{attachment.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{Math.round(attachment.size / 1024)} KB</div>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                aria-label={labels.attachmentRemove}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-4" /> {labels.attachmentAdd}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={attachmentAccept.join(",")}
            className="sr-only"
            onChange={(e) => {
              pickAttachment(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {contextSlot}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-400 dark:text-slate-500">{labels.submitHint}</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {labels.cancel}
            </Button>
            <Button onClick={trySubmit} disabled={!canSubmit}>
              {labels.save}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
