// The English words of ./file-button, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./file-button re-exports them.

import type { FilePickerLabels } from "./file-button";

export const DEFAULT_FILE_PICKER_LABELS: FilePickerLabels = {
  rejectedType: (name) => `“${name}” is not a supported file type`,
  rejectedTypeOnly: (accept) => `Only ${accept} files`,
  rejectedSize: (name, maxSize) => `“${name}” is larger than ${maxSize}`,
  rejectedCount: (name, maxFiles) =>
    `“${name}” was not added: at most ${maxFiles} ${maxFiles === 1 ? "file" : "files"}`,
  rejectedInvalid: (name) => `“${name}” cannot be used here`,
  rejectedMany: (count) => `${count} files were not added`,
  rejectedPick: (count) =>
    count === 1 ? "The file was not added" : `None of the ${count} files were added`,
  selected: (count, firstName) => (count === 1 ? `“${firstName}” selected` : `${count} files selected`),
  remove: (name) => `Remove “${name}”`,
  clearAll: "Remove all files",
  removed: (name) => `“${name}” removed`,
  cleared: "All files removed",
  dropzone: "File upload",
  browse: "Browse",
  empty: "Drop a file here",
  emptyMultiple: "Drop files here",
  hint: (accept) => (accept ? `Accepted: ${accept}` : "Any file type"),
  busy: "Uploading…",
};
