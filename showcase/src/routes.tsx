import {
  Blocks,
  Grid3x3,
  FileUp,
  PanelTopClose,
  FunctionSquare,
  Gauge,
  PenLine,
  ToggleRight,
  Compass,
  Languages,
  LayoutGrid,
  BookOpen,
  CalendarDays,
  ChartColumn,
  CircleDot,
  Component as ComponentIcon,
  FileText,
  Inbox,
  Layers,
  Layout,
  ListFilter,
  MessageSquarePlus,
  MousePointerClick,
  Palette,
  PanelsTopLeft,
  Settings as SettingsIcon,
  Sigma,
  SwatchBook,
  Table,
  TextCursorInput,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppShellNavItem } from "@eifi1/ui-kit";

import { Foundations } from "./sections/foundations";
import { PaletteGenerator } from "./sections/palette-generator";
import { Primitives } from "./sections/primitives";
import { Fields } from "./sections/fields";
import { Choices } from "./sections/choices";
import { TimeInputDemo } from "./sections/number-time-demo";
import { FileInputs } from "./sections/file-inputs";
import { AutocompleteDemo } from "./sections/autocomplete-demo";
import { ControlsDemo, FieldAnatomyDemo } from "./sections/field-anatomy-demo";
import { SelectionDemo } from "./sections/selection-demo";
import { LayoutDemo } from "./sections/layout-demo";
import { MeasuredGridDemo } from "./sections/measured-grid-demo";
import {
  DangerConfirmDemo,
  NumberStepsDemo,
  SignatureViewDemo,
  WeekStartDemo,
} from "./sections/numbers-more-demo";
import { SignaturePasswordDemo } from "./sections/signature-password-demo";
import { StatsDemo } from "./sections/stats-demo";
import { SeriesChartDemo } from "./sections/series-chart-demo";
import { FieldSync } from "./sections/field-sync";
import { Numbers } from "./sections/numbers";
import { Dropdowns } from "./sections/dropdowns";
import { Overlays } from "./sections/overlays";
import { Dates } from "./sections/dates";
import { MonthPickerDemo } from "./sections/month-picker-demo";
import { DataTableSection } from "./sections/data-table";
import { Charts } from "./sections/charts";
import { TreemapDemo } from "./sections/treemap-demo";
import { ChartDrilldowns } from "./sections/chart-drilldowns";
import { ShellSection } from "./sections/shell";
import { Settings } from "./sections/settings";
import { FeedbackCompose } from "./sections/feedback-compose";
import { FeedbackInbox } from "./sections/feedback-inbox";
import { Wizard } from "./sections/wizard";
import { TourSearchFiles } from "./sections/tour-search-files";
import { HooksLib } from "./sections/hooks-lib";
import { Helpers } from "./sections/helpers";
import { GettingStarted, GroupOverview } from "./sections/overview";
import { Localisation } from "./sections/localisation";

/**
 * One page per component area, grouped for the sidebar — and every group with more
 * than one page opens on an OVERVIEW of that group.
 *
 * It began as a single 52,000px page with a section registry, which was wrong in three
 * ways at once: the sidebar's nav items pointed at routes that did not exist so nothing
 * ever changed, an in-page anchor could not be returned to with the back button because
 * no history entry was pushed, and the page was long enough that the browser's own
 * scroll anchoring gave up. Splitting it is not cosmetic — it is what makes the nav,
 * the URL and the back button mean anything.
 *
 * The overviews exist because clicking "Forms" used to land on "Fields" — the first
 * page of the group, which is a page about text inputs and nothing else. A group's
 * entry now answers "what is in here" first, the way MUI's and Carbon's component
 * indexes do, and the pages below it answer "how does this one work".
 *
 * THE ORDER IS THE COMMON THREAD. Each group builds on the ones above it: tokens are
 * what everything paints with; inputs and displays are built from primitives in those
 * tokens; overlays float those over the page; the app chrome composes all of it into a
 * frame; the API group is what is left when you take the pixels away. The Getting
 * started page says this in prose.
 */

export interface ShowcasePage {
  /** Path segment, unique across the whole app. */
  slug: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
  /** The exported components a page demonstrates — the group overview lists them,
   *  so a reader looking for `MultiSelect` finds which page it lives on. */
  components?: string[];
  Body: () => React.ReactElement;
}

export interface ShowcaseGroup {
  /** Path segment of the group's overview page. */
  slug: string;
  label: string;
  /** Shorter label for the mobile bottom bar, which divides the viewport evenly. */
  shortLabel?: string;
  icon: LucideIcon;
  /** One sentence for the overview page: what this layer is FOR. */
  blurb: string;
  pages: ShowcasePage[];
}

export const GROUPS: ShowcaseGroup[] = [
  {
    slug: "start",
    label: "Getting started",
    shortLabel: "Start",
    icon: Compass,
    blurb: "What the kit is, how it is layered, and how to read the pages that follow.",
    pages: [
      {
        slug: "overview",
        title: "Overview",
        blurb:
          "What @eifi1/ui-kit is, the six layers it is built in, and how to read a page of this showcase.",
        icon: Compass,
        Body: GettingStarted,
      },
    ],
  },
  {
    slug: "foundations",
    label: "Foundations",
    shortLabel: "Tokens",
    icon: Layers,
    blurb:
      "The values every component paints with, and the language every component speaks. Nothing below this layer hardcodes a colour or a word.",
    pages: [
      {
        slug: "tokens",
        title: "Tokens",
        blurb:
          "Every value in the active TokenSet, live. Flip the theme or the palette in the top bar and watch this page move — anything that does not move is hardcoded.",
        icon: Palette,
        components: ["TokenSet", "PALETTES", "applyPersistedTheme", "applyPersistedPalette"],
        Body: Foundations,
      },
      {
        slug: "palette",
        title: "Palette generator",
        blurb:
          "One brand colour in, both themes out — with every contrast ratio measured rather than asserted, and the compromises named.",
        icon: SwatchBook,
        components: ["derivePalette", "deriveChartRamp", "auditChartRamp"],
        Body: PaletteGenerator,
      },
      {
        slug: "localisation",
        title: "Localisation",
        blurb:
          "Every string the kit renders, as one typed tree — and the provider that hands a translation to every component at once.",
        icon: Languages,
        components: ["UiKitProvider", "UiKitLabels", "DEFAULT_UI_KIT_LABELS", "missingKitLabels"],
        Body: Localisation,
      },
    ],
  },
  {
    slug: "inputs",
    label: "Inputs",
    icon: TextCursorInput,
    blurb:
      "Every way to capture a value. They share one anatomy — a floating label, the value, a helper line below — so a form reads as one thing.",
    pages: [
      {
        slug: "fields",
        title: "Text fields",
        blurb: "Inputs, and the class constants an app composes its own fields from.",
        icon: TextCursorInput,
        components: ["Input", "Select", "Textarea", "Label", "SearchField", "FloatingField", "FieldHint"],
        Body: () => (
          <>
            <Fields />
            <FieldAnatomyDemo />
          </>
        ),
      },
      {
        slug: "choices",
        title: "Choices",
        blurb: "On or off, one of a few, a value on a scale — and picking a colour, an icon or a card.",
        icon: ToggleRight,
        components: ["Checkbox", "Switch", "Slider", "SwatchPicker", "IconPicker", "ChoiceCard"],
        Body: () => (
          <>
            <Choices />
            <SelectionDemo />
          </>
        ),
      },
      {
        slug: "numbers",
        title: "Numbers & money",
        blurb:
          "The numeric stack: a calculator-backed number field, a field whose value is a number, the money field and its tones, and the currency picker.",
        icon: Sigma,
        components: ["NumberInput", "NumberField", "AmountInput", "CurrencySelect", "NumberPadSheet"],
        Body: () => (
          <>
            <Numbers />
            <NumberStepsDemo />
          </>
        ),
      },
      {
        slug: "dropdowns",
        title: "Dropdowns & pickers",
        blurb:
          "Comboboxes, multi-select, grouped and sheet pickers, and the dropdown primitives underneath them.",
        icon: ListFilter,
        components: [
          "Combobox",
          "Autocomplete",
          "EntityCombobox",
          "MultiEntityCombobox",
          "MultiSelect",
          "GroupedPicker",
          "PickerSheet",
        ],
        Body: () => (
          <>
            <Dropdowns />
            <AutocompleteDemo />
          </>
        ),
      },
      {
        slug: "files",
        title: "Files",
        blurb:
          "Picking files: a button that opens the picker or the camera, the drop area, and refusals reported where the user is looking, never as a toast.",
        icon: FileUp,
        components: ["FileButton", "useFilePicker", "FileDropzone"],
        Body: FileInputs,
      },
      {
        slug: "measured-grid",
        title: "Table entry",
        blurb:
          "Typing a table of measurements: a keyboard grid of cells, a block pasted from a spreadsheet, and the same table as text — thousands of rows, only the visible ones mounted.",
        icon: Grid3x3,
        components: ["MeasuredGrid", "useMeasuredRows", "useWindowedRows"],
        Body: MeasuredGridDemo,
      },
      {
        slug: "dates",
        title: "Dates & time",
        blurb:
          "Picking a point in time at every grain: a day, a range of days, a month, a time of day.",
        icon: CalendarDays,
        components: ["MiniCalendar", "DatePicker", "DateRangePicker", "MonthPicker", "TimeInput"],
        Body: () => (
          <>
            <Dates />
            <MonthPickerDemo />
            <TimeInputDemo />
            <WeekStartDemo />
          </>
        ),
      },
      {
        slug: "field-sync",
        title: "Field sync state",
        blurb:
          "Sync state for a database-backed field, saved on blur: the frame's colour and an icon at the field's end say edited, saving, saved or failed — hover the error mark for the reason.",
        icon: CircleDot,
        components: ["useFieldSync", "FieldSyncRow", "FieldSyncIndicator"],
        Body: FieldSync,
      },
      {
        slug: "signature-password",
        title: "Signature, password & confirmation",
        blurb:
          "Capturing a signature — and showing a saved one — telling a user how strong their password is, and confirming a destructive action.",
        icon: PenLine,
        components: ["SignaturePad", "SignatureView", "PasswordStrengthMeter", "DangerConfirm"],
        Body: () => (
          <>
            <SignaturePasswordDemo />
            <SignatureViewDemo />
            <DangerConfirmDemo />
          </>
        ),
      },
    ],
  },
  {
    slug: "data-display",
    label: "Data display",
    shortLabel: "Display",
    icon: ComponentIcon,
    blurb:
      "Showing values rather than taking them: the building blocks, the table, and the charts.",
    pages: [
      {
        slug: "primitives",
        title: "Primitives",
        blurb: "Buttons, cards, tabs, banners, avatars — the pieces everything else is built from.",
        icon: Blocks,
        components: ["Button", "IconButton", "Card", "Tabs", "AlertBanner", "Chip", "ChipInput"],
        Body: () => (
          <>
            <Primitives />
            <ControlsDemo />
          </>
        ),
      },
      {
        slug: "data-table",
        title: "Data table",
        blurb:
          "The largest component in the kit: sorting, filtering, selection, pagination, URL sync and its pure helpers.",
        icon: Table,
        components: ["DataTable", "useTableState", "DataTableFilterPopover"],
        Body: DataTableSection,
      },
      {
        slug: "charts",
        title: "Charts",
        blurb:
          "The themed chart shell over Recharts, its colour system, the tile chart (treemap) and the zoomable series chart the apps share.",
        icon: ChartColumn,
        components: ["ChartContainer", "ChartLegend", "Treemap", "SeriesChart", "ToggleLegend"],
        Body: () => (
          <>
            <Charts />
            <TreemapDemo />
            <ChartDrilldowns />
            <SeriesChartDemo />
          </>
        ),
      },
      {
        slug: "stats",
        title: "Stats & sparklines",
        blurb:
          "The KPI tile every dashboard repeats — value, change, trend — and the tiny line that fits in a table cell.",
        icon: Gauge,
        components: ["StatTile", "StatTileGrid", "Sparkline"],
        Body: StatsDemo,
      },
      {
        slug: "layout",
        title: "Disclosure & dialog frame",
        blurb: "A section that folds away, and the header-body-actions frame every dialog repeats.",
        icon: PanelTopClose,
        components: ["Disclosure", "Collapse", "DialogFrame"],
        Body: LayoutDemo,
      },
    ],
  },
  {
    slug: "overlays",
    label: "Overlays",
    icon: MousePointerClick,
    blurb:
      "Everything that floats above the page, and the one timing they all share on the way out.",
    pages: [
      {
        slug: "dialogs",
        title: "Dialogs & popovers",
        blurb:
          "Modal, full-bleed dialog, popover, hover menu and tooltip — plus the shared close-transition timing.",
        icon: MousePointerClick,
        components: ["Modal", "FullBleedDialog", "Popover", "HoverMenu", "Tooltip"],
        Body: Overlays,
      },
      {
        slug: "tour-search-files",
        title: "Tour, palette & files",
        blurb: "The guided tour, the command palette, the dropzone and the swipeable row.",
        icon: Wand2,
        components: ["TourProvider", "CommandPalette", "FileDropzone", "SwipeableRow"],
        Body: TourSearchFiles,
      },
    ],
  },
  {
    slug: "app-chrome",
    label: "App chrome",
    shortLabel: "Chrome",
    icon: PanelsTopLeft,
    blurb:
      "The frame an app lives in and the flows every app repeats: settings, multi-step forms, feedback.",
    pages: [
      {
        slug: "shell",
        title: "Shell",
        blurb: "The app frame you are looking at, taken apart.",
        icon: Layout,
        components: ["AppShell", "TopBar", "PageContents", "ThemeToggle", "LanguageMenu"],
        Body: ShellSection,
      },
      {
        slug: "settings",
        title: "Settings fields",
        blurb: "The account-settings rows: theme, language, profile, password and two-factor.",
        icon: SettingsIcon,
        components: ["ThemeSetting", "LanguageSetting", "ProfileSetting", "TwoFactorSetting"],
        Body: Settings,
      },
      {
        slug: "wizard",
        title: "Wizard",
        blurb: "The multi-step engine, its chrome and its review step.",
        icon: Wand2,
        components: ["useWizard", "StepperNav", "WizardSummary"],
        Body: Wizard,
      },
      {
        slug: "feedback-compose",
        title: "Feedback — compose",
        blurb: "The report form and its attachment field.",
        icon: MessageSquarePlus,
        components: ["FeedbackDialog", "FeedbackAttachmentField"],
        Body: FeedbackCompose,
      },
      {
        slug: "feedback-inbox",
        title: "Feedback — inbox",
        blurb: "The shared status vocabulary, the transition policy, and the parts an inbox is built from.",
        icon: Inbox,
        components: ["FeedbackInbox", "FEEDBACK_STATUSES"],
        Body: FeedbackInbox,
      },
    ],
  },
  {
    slug: "api",
    label: "API",
    icon: BookOpen,
    blurb:
      "What is left when you take the pixels away: the hooks components are built from, and the pure helpers and constants an app calls directly.",
    pages: [
      {
        slug: "hooks-lib",
        title: "Hooks & lib",
        blurb: "The non-visual exports: hooks read live, and the pure helpers as input → output.",
        icon: FileText,
        components: ["useMediaQuery", "useAnchoredPanel", "useOverlayHistory", "cn"],
        Body: HooksLib,
      },
      {
        slug: "helpers",
        title: "Helpers & constants",
        blurb:
          "The functions and data behind the inputs, shown as input → output: date arithmetic at @eifi1/ui-kit/dates, the calculator's evaluator, the currency table, and the class constants a custom field is composed from.",
        icon: FunctionSquare,
        components: ["todayIso", "dateRangePresets", "evaluateExpression", "CURRENCIES", "FIELD_BASE"],
        Body: Helpers,
      },
    ],
  },
];

/** A group whose sidebar entry opens an overview page rather than its only page. */
export const hasOverview = (group: ShowcaseGroup) => group.pages.length > 1;

/** The overview pages, synthesised from the groups so a group cannot exist without one. */
function overviewPage(group: ShowcaseGroup): ShowcasePage {
  return {
    slug: group.slug,
    title: group.label,
    blurb: group.blurb,
    icon: LayoutGrid,
    Body: () => <GroupOverview group={group} />,
  };
}

/** Flat list, in reading order — each overview before its pages. For routing,
 *  prev/next, and the render test. */
export const PAGES: ShowcasePage[] = GROUPS.flatMap((g) =>
  hasOverview(g) ? [overviewPage(g), ...g.pages] : g.pages,
);

export const HOME_SLUG = PAGES[0].slug;

/** The group a page belongs to — its own group for an overview page. */
export function groupOf(slug: string): ShowcaseGroup | undefined {
  return GROUPS.find((g) => g.slug === slug || g.pages.some((p) => p.slug === slug));
}

/**
 * Nav for `AppShell`. A group with one page links straight to it; a group with several
 * links to its OVERVIEW and lists its pages as `items` — a flyout or an inline
 * disclosure, depending on the sidebar style picked in the top bar.
 */
export const NAV: AppShellNavItem[] = GROUPS.map((group) => ({
  to: `/${hasOverview(group) ? group.slug : group.pages[0].slug}`,
  label: group.label,
  shortLabel: group.shortLabel,
  icon: group.icon,
  // The group entry is highlighted while ANY of its pages is open — AppShell matches
  // the sub-items itself — so `end` only has to cover the overview route.
  end: true,
  dataTour: group.slug === "data-display" ? "nav" : undefined,
  items: hasOverview(group)
    ? group.pages.map((p) => ({ to: `/${p.slug}`, label: p.title, icon: p.icon }))
    : undefined,
}));
