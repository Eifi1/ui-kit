// The English words of ./dialog-frame, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./dialog-frame re-exports them.

import type { DialogFrameLabels } from "./dialog-frame";

export const DEFAULT_DIALOG_FRAME_LABELS: DialogFrameLabels = { close: "Close" };
