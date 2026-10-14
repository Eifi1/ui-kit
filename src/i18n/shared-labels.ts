// The English words of the eleven namespaces the provider types itself (./kit-labels),
// in a module with no provider code: the English catalogue (./defaults) imports them
// without the React context, as it imports every component's `*-labels.ts`, and
// ./kit-labels re-exports them under the same names. Until 0.34 they were the rule's
// exceptions, written in the provider (round 0.34, DOC-6's sev-1 note).
//
// Here rather than beside their components: the provider re-exports them, and the
// catalogues reach the provider, so a module outside `i18n/` would put component
// directories into every catalogue's graph (`npm run check:graph` refuses that).

import type {
  AppShellLabels,
  CalculatorLabels,
  ComboboxLabels,
  CommonLabels,
  CurrencyLabels,
  DatePickerLabels,
  FileLabels,
  MultiSelectLabels,
  PickerSheetLabels,
  SwipeableRowLabels,
  TopBarLabels,
} from "./kit-labels";

export const DEFAULT_COMMON_LABELS: CommonLabels = {
  close: "Close",
  clear: "Clear",
  search: "Search",
  done: "Done",
  cancel: "Cancel",
  save: "Save",
  back: "Back",
  next: "Next",
  remove: "Remove",
  loading: "Loading…",
  noResults: "No results",
  fieldValue: (field, value) => `${field}: ${value}`,
  dismiss: "Dismiss",
  opensInNewTab: "opens in a new tab",
  aboutField: (field) => `About “${field}”`,
  help: "Help",
};

export const DEFAULT_DATE_PICKER_LABELS: DatePickerLabels = {
  panel: "Choose a date",
  rangePanel: "Choose a date range",
  clear: "Clear",
  previousDay: "Previous day",
  nextDay: "Next day",
  today: "Today",
  apply: "Apply",
  cancel: "Cancel",
  presets: "Quick ranges",
};

export const DEFAULT_COMBOBOX_LABELS: ComboboxLabels = {
  search: "Search",
  noResults: "No results",
  clear: "Clear",
  loading: "Loading…",
  create: (query) => `Create “${query}”`,
  selectedCount: (count) => `${count} selected`,
  loadError: "Couldn’t load results",
  resultCount: (count) => (count === 1 ? "1 result" : `${count} results`),
  minChars: (count) =>
    count === 1 ? "Type at least 1 character" : `Type at least ${count} characters`,
};

export const DEFAULT_MULTI_SELECT_LABELS: MultiSelectLabels = {
  search: "Search",
  selectAll: "Select all",
  clear: "Clear",
  all: "All",
  selectedCount: (count) => String(count),
};

export const DEFAULT_CALCULATOR_LABELS: CalculatorLabels = {
  open: "Open calculator",
  panel: "Calculator",
  calculation: "Calculation",
  backspace: "Backspace",
  clear: "Clear",
  equals: "Equals",
  done: "Done",
  plus: "Plus",
  minus: "Minus",
  times: "Times",
  divide: "Divide",
  decimal: "Decimal point",
};

export const DEFAULT_CURRENCY_LABELS: CurrencyLabels = {
  currency: "Currency",
  search: "Search currency",
};

export const DEFAULT_APP_SHELL_LABELS: AppShellLabels = {
  collapse: "Collapse sidebar",
  expand: "Expand sidebar",
  toggleGroup: (groupLabel) => `${groupLabel}: pages`,
};

export const DEFAULT_TOP_BAR_LABELS: TopBarLabels = {
  theme: "Toggle theme",
  palette: "Appearance preset",
  language: "Language",
  switchRole: "Switch role",
  role: (value) => `Role: ${value}`,
};

export const DEFAULT_PICKER_SHEET_LABELS: PickerSheetLabels = { close: "Close" };

export const DEFAULT_SWIPEABLE_ROW_LABELS: SwipeableRowLabels = { actions: "Row actions" };

/** Formats with the locale the provider was given (see {@link useKitFileLabels}).
 *  This static default has no locale to hand and falls back to the runtime's. */
export const DEFAULT_FILE_LABELS: FileLabels = {
  size: (bytes) => formatFileSize(bytes),
};

/** "12 kB", "3.4 MB" — `Intl`'s unit formatting, so the digits, the decimal mark and
 *  the unit's spelling all follow `locale`. */
export function formatFileSize(bytes: number, locale?: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let value = bytes;
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[i],
    unitDisplay: i === 0 ? "long" : "short",
    maximumFractionDigits: value < 10 && i > 0 ? 1 : 0,
  }).format(value);
}
