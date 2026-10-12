// The English words of ./command-palette, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./command-palette re-exports them.

import type { CommandPaletteLabels } from "./command-palette";

export const DEFAULT_COMMAND_PALETTE_LABELS: CommandPaletteLabels = {
  placeholder: "Search…",
  empty: "No results",
  loading: "Searching…",
  dialog: "Search",
  error: "Search failed. Try again.",
  clear: "Clear search",
  submit: "Search",
  close: "Close",
};
