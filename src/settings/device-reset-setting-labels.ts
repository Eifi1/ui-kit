// The English words of ./device-reset-setting, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./device-reset-setting
// re-exports them.

import type { DeviceResetLabels } from "./device-reset-setting";

/** docs/settings-harmonization.md §11.3, word for word. */
export const DEFAULT_DEVICE_RESET_LABELS: DeviceResetLabels = {
  title: "Reset this device",
  description:
    "Puts this device's appearance, and the way its tables and panels were left, back to the defaults. Your account, your data and your sign-in are not touched.",
  action: "Reset this device's settings",
  confirmTitle: "Reset this device's settings?",
  confirmBody:
    "Theme, colours, text size, contrast and language go back to their defaults here, and tables and panels open as they first did. Where your account has a language, a text size or a contrast, this device follows it again. Your account and your other devices stay as they are.",
  confirmAction: "Reset",
  done: "This device's settings are back to their defaults.",
  keywords: "reset defaults device restore appearance tables layout",
};
