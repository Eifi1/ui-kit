// The English words of ./signature-pad, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./signature-pad re-exports them.

import type { SignaturePadLabels } from "./signature-pad";

export const DEFAULT_SIGNATURE_PAD_LABELS: SignaturePadLabels = {
  label: "Signature",
  instructions: "Sign in the box with a mouse, your finger or a pen.",
  typedFallbackHint: "If you cannot draw, type your name instead.",
  empty: "Nothing drawn yet",
  signed: "Signature drawn",
  undo: "Undo last stroke",
  clear: "Clear",
  save: "Save signature",
  useTyped: "Type name instead",
  useDrawn: "Draw instead",
  typedName: "Full name",
  cleared: "Signature cleared",
  undone: "Last stroke removed",
  viewEmpty: "Not signed",
  viewDrawn: "Handwritten signature",
  viewTyped: (name) => `Signed with the typed name ${name}`,
};
