import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { DataTableLabels } from "../components/data-table-labels";
import type { MiniCalendarLabels, WeekDay } from "../components/mini-calendar";
import type { PopoverLabels } from "../components/popover";
import type { ChipInputLabels } from "../components/chip";
import type { FieldSyncLabels } from "../components/field-sync";
import type { PasswordRevealLabels, TabsLabels } from "../components/ui";
import type { WizardLabels } from "../wizard/types";
import type { TourLabels } from "../tour/tour";
import type { CommandPaletteLabels } from "../search/command-palette";
import type { GlobalSearchLabels } from "../search/global-search";
import type { MonthPickerLabels } from "../components/month-picker";
import type { PageContentsLabels } from "../components/page-contents";
import type { SeriesChartLabels } from "../components/series-chart-labels";
import type { SparklineLabels } from "../components/sparkline";
import type { StatTileLabels } from "../components/stat-tile";
import type { SignaturePadLabels } from "../components/signature-pad";
import type { PasswordStrengthLabels } from "../components/password-strength";
import type { DangerConfirmLabels } from "../components/danger-confirm";
import type { SwatchPickerLabels } from "../components/swatch-picker";
import type { IconPickerLabels } from "../components/icon-picker";
import type { DialogFrameLabels } from "../components/dialog-frame";
import type { FilePickerLabels } from "../components/file-button";
import type { MeasuredGridLabels } from "../components/measured-grid";
import type { FeedbackAttachmentFieldLabels } from "../feedback/feedback-attachment";
import type { ConfirmDialogLabels } from "../components/confirm-dialog";
import type { FloatingPanelLabels } from "../components/floating-panel";
import type { CopyButtonLabels } from "../components/copy-button";
import type { BulkActionBarLabels } from "../components/bulk-action-bar";
import type { ListLabels } from "../components/list";
import type { BreadcrumbsLabels } from "../components/breadcrumbs";

/**
 * EVERY string the kit renders, as one typed tree — and an optional provider that
 * hands it to every component at once.
 *
 * WHY THIS EXISTS. The kit ships no catalogue and resolves no strings, and that stays
 * true: the app supplies every word. What was wrong was HOW it had to supply them —
 * one `labels` prop per component instance, under a different prop name per
 * component (`labels`, `calendarLabels`, `passwordLabels`, `clearLabel`,
 * `searchPlaceholder`, `ariaLabel` …). A translated app therefore rendered English
 * wherever one call site forgot one prop, and nothing told it so: a German showcase
 * still said "Rows per page", "Collapse sidebar" and "Popover" in seven languages.
 *
 * Now there is one key per string, addressed by a dot path (`dataTable.pageSize`,
 * `datePicker.today`), and three sources in a fixed order of precedence:
 *
 *     the component's own prop   >   <UiKitProvider labels>   >   English default
 *
 * A consumer writes its translation ONCE, as a `UiKitLabels` (or a partial of it),
 * mounts `<UiKitProvider labels={…} locale={…}>` at the root, and every kit component
 * below speaks that language — including the ones nested inside other kit components
 * (the calendar inside the data table's date filter, the popover inside the date
 * picker), which no prop at the outer call site could reach before.
 *
 * Messages that carry a value are FUNCTIONS of that value, never a template to fill:
 * a number glued into an English sentence is untranslatable, because the grammar
 * around it moves with it in most languages.
 */

/* ── Namespaces that had no labels type of their own ─────────────────────── */

/** The words several components share. A component's own namespace wins over these
 *  where both exist; these are what a new component reaches for first. */
export interface CommonLabels {
  close: string;
  clear: string;
  search: string;
  done: string;
  cancel: string;
  save: string;
  back: string;
  next: string;
  remove: string;
  loading: string;
  noResults: string;
  /** "Name: value" — how a field's accessible name is composed with its value.
   *  A colon-and-space is not universal punctuation (French puts a space before
   *  the colon, Chinese uses a full-width one). */
  fieldValue: (field: string, value: string) => string;
  /** The × that puts away a banner or a notice (`AlertBanner onDismiss`). Not `close`:
   *  nothing opened, and "Close" on a banner reads as closing the page it sits on. */
  dismiss: string;
}

/** `DatePicker` / `DateRangePicker` chrome. The calendar inside has its own
 *  namespace, `miniCalendar`. */
export interface DatePickerLabels {
  /** Accessible name of the popover panel the calendar opens in. */
  panel: string;
  /** The same, for `DateRangePicker`'s panel. */
  rangePanel: string;
  clear: string;
  previousDay: string;
  nextDay: string;
  today: string;
  /** `DateRangePicker commit="apply"`: the button that commits the drafted range. */
  apply: string;
  /** …and the one that discards it. */
  cancel: string;
  /** Accessible name of `DateRangePicker`'s preset column. */
  presets: string;
}

/** The whole combobox family: `Combobox`, `EntityCombobox`,
 *  `MultiEntityCombobox`, `InlineEntityCombobox`, `Autocomplete`. */
export interface ComboboxLabels {
  search: string;
  noResults: string;
  clear: string;
  loading: string;
  /** The "add this" row when free entry is allowed. */
  create: (query: string) => string;
  /** Trigger summary once more than one value is picked. */
  selectedCount: (count: number) => string;
  /** An async lookup (`loadOptions`) failed. */
  loadError: string;
  /** Announced (live region) when the list settles on `count` > 0 rows. */
  resultCount: (count: number) => string;
  /** The query is shorter than the `minChars` a lookup needs. */
  minChars: (count: number) => string;
}

export interface MultiSelectLabels {
  search: string;
  selectAll: string;
  clear: string;
  /** Trigger text when nothing is picked, which a multi-select reads as "all". */
  all: string;
  /** Trigger summary once some (but not all) values are picked. The English
   *  default is the bare count, which is what the trigger has always shown. */
  selectedCount: (count: number) => string;
}

/** `CalculatorButton` (desktop popover keypad) and `NumberPadSheet` (phone sheet). */
export interface CalculatorLabels {
  /** The button that opens the calculator. */
  open: string;
  /** The popover / sheet itself. */
  panel: string;
  calculation: string;
  backspace: string;
  clear: string;
  equals: string;
  /** The primary key of the phone pad — visible text, not an aria-label. */
  done: string;
  /** Names of the operator keys and the decimal key. Their glyphs are not names a
   *  screen reader agrees on — "÷" is read as "division sign", "divided by" or
   *  nothing at all depending on the reader — so each says what it does. */
  plus: string;
  minus: string;
  times: string;
  divide: string;
  decimal: string;
}

/** `CurrencySelect` and the currency half of `AmountInput`. */
export interface CurrencyLabels {
  currency: string;
  search: string;
}

export interface AppShellLabels {
  collapse: string;
  expand: string;
  /** Accessible name of an inline group's disclosure button (`subNav="inline"`). */
  toggleGroup: (groupLabel: string) => string;
}

export interface TopBarLabels {
  theme: string;
  palette: string;
  language: string;
  switchRole: string;
  /** The role switcher's tooltip, given the active role's name. */
  role: (value: string) => string;
}

export interface PickerSheetLabels {
  close: string;
}

export interface SwipeableRowLabels {
  actions: string;
}

export interface FileLabels {
  /** A file size for display, given its size in BYTES. The default uses
   *  `Intl.NumberFormat`'s unit formatting in the provider's locale. */
  size: (bytes: number) => string;
}

/** The complete tree. `UiKitProvider` takes any partial of it. */
export interface UiKitLabels {
  common: CommonLabels;
  dataTable: DataTableLabels;
  miniCalendar: MiniCalendarLabels;
  datePicker: DatePickerLabels;
  monthPicker: MonthPickerLabels;
  popover: PopoverLabels;
  combobox: ComboboxLabels;
  multiSelect: MultiSelectLabels;
  calculator: CalculatorLabels;
  currency: CurrencyLabels;
  chipInput: ChipInputLabels;
  fieldSync: FieldSyncLabels;
  passwordReveal: PasswordRevealLabels;
  tabs: TabsLabels;
  appShell: AppShellLabels;
  pageContents: PageContentsLabels;
  topBar: TopBarLabels;
  pickerSheet: PickerSheetLabels;
  swipeableRow: SwipeableRowLabels;
  file: FileLabels;
  wizard: WizardLabels;
  tour: TourLabels;
  commandPalette: CommandPaletteLabels;
  globalSearch: GlobalSearchLabels;
  seriesChart: SeriesChartLabels;
  sparkline: SparklineLabels;
  statTile: StatTileLabels;
  signaturePad: SignaturePadLabels;
  passwordStrength: PasswordStrengthLabels;
  dangerConfirm: DangerConfirmLabels;
  swatchPicker: SwatchPickerLabels;
  iconPicker: IconPickerLabels;
  dialogFrame: DialogFrameLabels;
  filePicker: FilePickerLabels;
  measuredGrid: MeasuredGridLabels;
  feedbackAttachment: FeedbackAttachmentFieldLabels;
  confirmDialog: ConfirmDialogLabels;
  floatingPanel: FloatingPanelLabels;
  copyButton: CopyButtonLabels;
  bulkActionBar: BulkActionBarLabels;
  list: ListLabels;
  breadcrumbs: BreadcrumbsLabels;
}

/** Any subset of the tree, one level deep — each namespace may be partial, and a
 *  namespace that holds a record (`dataTable.presets`) is merged key by key. */
export type UiKitLabelOverrides = { [K in keyof UiKitLabels]?: Partial<UiKitLabels[K]> };

/* ── English defaults for the namespaces defined here ────────────────────── */

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

/* ── The provider ────────────────────────────────────────────────────────── */

interface KitI18n {
  labels?: UiKitLabelOverrides;
  locale?: string;
  weekStartsOn?: WeekDay;
}

const KitI18nContext = createContext<KitI18n>({});

export interface UiKitProviderProps {
  /** Any part of {@link UiKitLabels}. Missing keys fall back to English. */
  labels?: UiKitLabelOverrides;
  /**
   * BCP 47 tag used by every kit component that formats something — dates, numbers,
   * month and weekday names, file sizes — when it is not handed a `locale` prop of
   * its own. Without a provider, and without a prop, those use the runtime default.
   */
  locale?: string;
  /**
   * The first day of the week (0 = Sunday, 1 = Monday …) for every calendar below —
   * `MiniCalendar` and the pickers built on it — that is not handed a `weekStartsOn`
   * of its own. Without it the week start follows `locale`'s week info.
   *
   * Separate from `locale` because the two are separate decisions: a German-built
   * app running in English (`locale="en"`) would otherwise start its weeks on Sunday,
   * and switching it to `en-GB` to get Monday changes every date and number format.
   */
  weekStartsOn?: WeekDay;
  children: ReactNode;
}

/**
 * Hand every kit component below this point its strings and its locale.
 *
 * Optional: a component outside any provider behaves exactly as it did before the
 * provider existed. Nesting works as a merge — an inner provider overrides only what
 * it names, so a page can re-label one table's `dataTable.table` without restating
 * the language.
 */
export function UiKitProvider({ labels, locale, weekStartsOn, children }: UiKitProviderProps) {
  const outer = useContext(KitI18nContext);
  const value = useMemo<KitI18n>(
    () => ({
      locale: locale ?? outer.locale,
      weekStartsOn: weekStartsOn ?? outer.weekStartsOn,
      labels: mergeOverrides(outer.labels, labels),
    }),
    [outer, labels, locale, weekStartsOn],
  );
  return <KitI18nContext.Provider value={value}>{children}</KitI18nContext.Provider>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Two levels: namespaces, and inside a namespace a record-valued key (presets). */
function mergeNamespace<T extends object>(base: T, over: Partial<T> | undefined): T {
  if (!over) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    const prev = out[k];
    out[k] = isRecord(prev) && isRecord(v) ? { ...prev, ...v } : v;
  }
  return out as T;
}

function mergeOverrides(
  a: UiKitLabelOverrides | undefined,
  b: UiKitLabelOverrides | undefined,
): UiKitLabelOverrides | undefined {
  if (!a) return b;
  if (!b) return a;
  const out: Record<string, unknown> = { ...a };
  for (const [ns, v] of Object.entries(b)) {
    out[ns] = mergeNamespace((out[ns] as object | undefined) ?? {}, v as object);
  }
  return out as UiKitLabelOverrides;
}

/** What the nearest provider says about one namespace — `undefined` outside one.
 *  For a component whose own resolver does more than a merge (the data table
 *  derives `columnsCount` from `columns`): feed `{ ...overrides, ...props }` to it. */
export function useKitLabelOverrides<K extends keyof UiKitLabels>(
  ns: K,
): Partial<UiKitLabels[K]> | undefined {
  return useContext(KitI18nContext).labels?.[ns] as Partial<UiKitLabels[K]> | undefined;
}

/**
 * One namespace, resolved: `defaults`, then the provider, then the component's own
 * `prop`. Record-valued keys are merged key by key at each step.
 */
export function useKitLabels<K extends keyof UiKitLabels>(
  ns: K,
  defaults: UiKitLabels[K],
  prop?: Partial<UiKitLabels[K]>,
): UiKitLabels[K] {
  const fromProvider = useKitLabelOverrides(ns);
  return useMemo(
    () => mergeNamespace(mergeNamespace(defaults, fromProvider), prop),
    [defaults, fromProvider, prop],
  );
}

/** The component's own `locale` prop, else the provider's, else `undefined` (which
 *  every `Intl` API reads as "the runtime's default"). */
export function useKitLocale(prop?: string): string | undefined {
  const fromProvider = useContext(KitI18nContext).locale;
  return prop ?? fromProvider;
}

/** The week start the nearest `<UiKitProvider weekStartsOn>` pins, else `undefined`
 *  (the caller then asks the locale). A component's own prop goes first:
 *  `prop ?? useKitWeekStart()`. */
export function useKitWeekStart(): WeekDay | undefined {
  return useContext(KitI18nContext).weekStartsOn;
}

/** {@link DEFAULT_FILE_LABELS}, but formatting in the provider's locale. */
export function useKitFileLabels(prop?: Partial<FileLabels>): FileLabels {
  const locale = useKitLocale();
  const defaults = useMemo<FileLabels>(
    () => ({ size: (bytes) => formatFileSize(bytes, locale) }),
    [locale],
  );
  return useKitLabels("file", defaults, prop);
}

/**
 * The dot paths of every key `labels` does NOT supply — the ones a translated app is
 * still showing in English. Assert on it in the app's own test:
 *
 *     expect(missingKitLabels(de)).toEqual([]);
 *
 * `reference` is the complete tree to check against — pass
 * {@link DEFAULT_UI_KIT_LABELS} (src/i18n/defaults.ts). It is a parameter rather than an import
 * because the defaults live beside their components, and this module is imported BY
 * those components.
 */
export function missingKitLabels(
  labels: UiKitLabelOverrides | undefined,
  reference: UiKitLabels,
): string[] {
  const missing: string[] = [];
  for (const [ns, keys] of Object.entries(reference)) {
    const given = (labels as Record<string, Record<string, unknown> | undefined> | undefined)?.[ns];
    for (const [key, value] of Object.entries(keys as Record<string, unknown>)) {
      const got = given?.[key];
      if (got === undefined) {
        missing.push(`${ns}.${key}`);
      } else if (isRecord(value) && isRecord(got)) {
        for (const sub of Object.keys(value)) {
          if (got[sub] === undefined) missing.push(`${ns}.${key}.${sub}`);
        }
      }
    }
  }
  return missing;
}
