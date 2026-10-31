// The English words of ./data-export-setting, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./data-export-setting
// re-exports them.

import { englishWait } from "../auth/auth-errors-labels";
import type { DataExportLabels } from "./data-export-setting";

export const DEFAULT_DATA_EXPORT_LABELS: DataExportLabels = {
  title: "Export your data",
  description: "Download a copy of your account’s data as a JSON file.",
  download: "Download my data",
  started: "Your download has started.",
  saveAgain: "Didn’t start? Save the file",
  rateLimited: (seconds) =>
    seconds && seconds > 0
      ? `You exported your data a moment ago. Try again in ${englishWait(seconds)}.`
      : "You exported your data a moment ago. Please try again in a minute.",
  failed: "The export failed. Please try again.",
};
