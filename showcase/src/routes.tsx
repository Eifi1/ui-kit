import {
  AppWindow,
  Blocks,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ChartArea,
  ChartBar,
  ChartLine,
  ChevronsUpDown,
  CircleDot,
  ClipboardCheck,
  ClipboardCopy,
  Command,
  Compass,
  Component as ComponentIcon,
  Contact,
  FileText,
  FileUp,
  Footprints,
  FunctionSquare,
  Gauge,
  Grid3x3,
  Inbox,
  Languages,
  Layers,
  Layout,
  ListTree,
  List as ListIcon,
  ListChecks,
  PanelTop,
  LayoutGrid,
  LayoutPanelLeft,
  Loader,
  MessageCircleQuestion,
  ListFilter,
  MessageSquarePlus,
  MousePointerClick,
  MoveHorizontal,
  Palette,
  PanelTopClose,
  PanelsTopLeft,
  PenLine,
  Pin,
  Puzzle,
  Server,
  Settings as SettingsIcon,
  Sigma,
  SwatchBook,
  Table,
  Tags,
  TextCursorInput,
  ToggleRight,
  Wand2,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppShellNavItem } from "@eifi1/ui-kit";

import { Foundations } from "./sections/foundations";
import { PaletteGenerator } from "./sections/palette-generator";
import { ButtonsSurfaces } from "./sections/buttons-surfaces";
import { ChipsToggles } from "./sections/chips-toggles";
import { Fields } from "./sections/fields";
import { FormsRhf } from "./sections/forms-rhf";
import { Choices } from "./sections/choices";
import { TimeInputDemo } from "./sections/number-time-demo";
import { FileInputs } from "./sections/file-inputs";
import { AutocompleteDemo } from "./sections/autocomplete-demo";
import { FieldAnatomyDemo } from "./sections/field-anatomy-demo";
import { SelectionDemo } from "./sections/selection-demo";
import { LayoutDemo } from "./sections/layout-demo";
import { MeasuredGridDemo } from "./sections/measured-grid-demo";
import { TableTextDemo } from "./sections/table-text-demo";
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
import { Comboboxes } from "./sections/comboboxes";
import { EntityPickers } from "./sections/entity-pickers";
import { DropdownParts } from "./sections/dropdown-parts";
import { Dialogs, PopoversMenusTooltips } from "./sections/overlays";
import { Dates } from "./sections/dates";
import { MonthPickerDemo } from "./sections/month-picker-demo";
import { DataTableSection } from "./sections/data-table";
import { DataTableServerSection } from "./sections/data-table-server";
import { DataTablePartsSection } from "./sections/data-table-parts";
import { Charts } from "./sections/charts";
import { TreemapDemo } from "./sections/treemap-demo";
import { ChartDrilldowns } from "./sections/chart-drilldowns";
import { ShellSection } from "./sections/shell";
import { Settings } from "./sections/settings";
import { FeedbackCompose } from "./sections/feedback-compose";
import { FeedbackInbox } from "./sections/feedback-inbox";
import { Wizard } from "./sections/wizard";
import { GuidedTour } from "./sections/tour";
import { CommandPaletteDemo } from "./sections/command-palette-demo";
import { SwipeableRowDemo } from "./sections/swipeable-row-demo";
import { HooksLib } from "./sections/hooks-lib";
import { Helpers } from "./sections/helpers";
import { GettingStarted, GroupOverview } from "./sections/overview";
import { FeedbackProgress } from "./sections/feedback-progress";
import { DescriptionTable } from "./sections/description-table";
import { TreeViewDemo } from "./sections/tree-view-demo";
import { ConfirmFloating } from "./sections/confirm-floating";
import { ClipboardTiming } from "./sections/clipboard-timing";
import { SeriesChartMarks } from "./sections/series-chart-marks";
import { Localisation } from "./sections/localisation";
import { ListsMenus } from "./sections/lists-menus";
import { PageStructure } from "./sections/page-structure";
import { ButtonLabelsTones } from "./sections/button-labels-demo";
import { ChipHuesToggleField } from "./sections/chip-hues-demo";
import { FeedbackMore } from "./sections/feedback-more-demo";
import { ToastsDemo } from "./sections/toast-demo";
import { DescriptionTableMore } from "./sections/description-table-more";
import { DisclosureMore } from "./sections/disclosure-more-demo";
import { IntegerTicksDemo, KeyboardPointsDemo } from "./sections/series-chart-ticks-keys";
import { DialogOpenDemo } from "./sections/dialog-open-demo";
import { TooltipAutoPortal } from "./sections/tooltip-auto-portal-demo";
import { FloatingActions } from "./sections/floating-actions-demo";
import { CalendarHeatmapDemo } from "./sections/calendar-heatmap-demo";
import { MonthViewDemo } from "./sections/month-view-demo";
import { ButtonsMore } from "./sections/buttons-more-demo";
import { AccountMenuDemo } from "./sections/account-menu-demo";
import { ToggleCaptionDemo } from "./sections/toggle-caption-demo";
import { ActionCardDemo } from "./sections/action-card-demo";
import { NavPillsDemo } from "./sections/nav-pills-demo";
import { ProgressSegmentsDemo } from "./sections/progress-segments-demo";
import { FieldDemo } from "./sections/field-demo";
import { RhfWizardDemo } from "./sections/rhf-wizard-demo";
import { ListDragDemo } from "./sections/list-drag-demo";

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
 * what everything paints with; inputs, pickers, displays and charts are built from
 * primitives in those tokens; overlays float those over the page; the app chrome composes all of it
 * into a frame; the API group is what is left when you take the pixels away. The Getting
 * started page says this in prose.
 *
 * SIZE. A page holds one component family — about a dozen specimens, not thirty — and a
 * group holds at most about ten pages. The second limit is the phone's: below `md` the
 * current group's pages are a row of pills above the bottom bar that WRAPS rather than
 * scrolls, so every page added to a group is another line of pills over the content.
 * Inputs outgrew it once the dropdown, date and table pages were split, which is why
 * "Pickers & entry" exists, and Data display outgrew it in 0.8.0, which is why the chart
 * pages became "Charts". A split page leaves its old slug in `RETIRED_SLUGS`.
 */

export interface ShowcasePage {
  /** Path segment, unique across the whole app. */
  slug: string;
  title: string;
  /** The title for the phone's row of page pills, where a group's pages share one
   *  screen width: "Chips" for "Chips & toggles". Often the title itself. */
  short: string;
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
        short: "Overview",
        blurb:
          "What @eifi1/ui-kit is, the eight layers it is built in, and how to read a page of this showcase.",
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
        short: "Tokens",
        blurb:
          "Every value in the active TokenSet, live. Flip the theme or the palette in the top bar and watch this page move — anything that does not move is hardcoded.",
        icon: Palette,
        components: ["TokenSet", "PALETTES", "applyPersistedTheme", "applyPersistedPalette"],
        Body: Foundations,
      },
      {
        slug: "palette",
        title: "Palette generator",
        short: "Palette",
        blurb:
          "One brand colour in, both themes out — with every contrast ratio measured rather than asserted, and the compromises named.",
        icon: SwatchBook,
        components: ["derivePalette", "deriveChartRamp", "auditChartRamp"],
        Body: PaletteGenerator,
      },
      {
        slug: "localisation",
        title: "Localisation",
        short: "Localisation",
        blurb:
          "Every string the kit renders, as one typed tree — and the provider that hands a translation to every component at once.",
        icon: Languages,
        components: ["UiKitProvider", "UiKitLabels", "DEFAULT_UI_KIT_LABELS", "missingKitLabels", "UI_KIT_LABELS_DE", "UI_KIT_LABELS_DE_CH", "UI_KIT_LABELS_DE_INFORMAL", "uiKitLabelsDe"],
        Body: Localisation,
      },
    ],
  },
  {
    slug: "inputs",
    label: "Inputs",
    icon: TextCursorInput,
    blurb:
      "Every way to type or set a value: text, choices, numbers, dates, files, and the form adapter around them. They share one anatomy — a floating label, the value, a helper line below — so a form reads as one thing.",
    pages: [
      {
        slug: "fields",
        title: "Text fields",
        short: "Text",
        blurb: "Inputs, and the class constants an app composes its own fields from.",
        icon: TextCursorInput,
        components: ["Input", "Select", "Textarea", "Label", "SearchField", "FloatingField", "FieldHint", "Field"],
        Body: () => (
          <>
            <Fields />
            <FieldAnatomyDemo />
            <FieldDemo />
          </>
        ),
      },
      {
        slug: "forms",
        title: "Forms (react-hook-form)",
        short: "Forms",
        blurb:
          "The react-hook-form adapter at @eifi1/ui-kit/rhf: a field's label, control, description and message wired to each other and to the form's state, with the messages only where the user can see them.",
        icon: ClipboardCheck,
        components: ["Form", "FormField", "FormItem", "FormLabel", "FormControl", "FormMessage", "useFormField", "useRhfWizardStep", "Field"],
        Body: () => (
          <>
            <FormsRhf />
            <RhfWizardDemo />
          </>
        ),
      },
      {
        slug: "choices",
        title: "Choices",
        short: "Choices",
        blurb: "On or off, one of a few, a value on a scale — and picking a colour, an icon or a card.",
        icon: ToggleRight,
        components: ["Checkbox", "Switch", "Slider", "SwatchPicker", "IconPicker", "ChoiceCard", "ActionCard"],
        Body: () => (
          <>
            <Choices />
            <SelectionDemo />
            <ActionCardDemo />
          </>
        ),
      },
      {
        slug: "numbers",
        title: "Numbers & money",
        short: "Numbers",
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
        slug: "calendars",
        title: "Calendars & date pickers",
        short: "Calendars",
        blurb:
          "Picking a day or a range of days: the calendar itself, the date and range pickers built on it, their presets and bounds, and the first day of the week.",
        icon: CalendarDays,
        components: ["MiniCalendar", "DatePicker", "DateRangePicker", "calendarMonthPresets", "UiKitProvider"],
        Body: () => (
          <>
            <Dates />
            <WeekStartDemo />
          </>
        ),
      },
      {
        slug: "month-view",
        title: "Calendar month view",
        short: "Month view",
        blurb:
          "The calendar as a page: a ruled month with each day's events drawn in its cell, a header of the page's own driving it, and a panel for the day that is picked.",
        icon: CalendarRange,
        components: ["MiniCalendar", "MiniCalendarDayState"],
        Body: MonthViewDemo,
      },
      {
        slug: "month-time",
        title: "Month & time",
        short: "Month & time",
        blurb:
          "The coarser and the finer grain: a month picked on its own, in a field or between step buttons, and a time of day.",
        icon: CalendarClock,
        components: ["MonthPicker", "TimeInput"],
        Body: () => (
          <>
            <MonthPickerDemo />
            <TimeInputDemo />
          </>
        ),
      },
      {
        slug: "files",
        title: "Files",
        short: "Files",
        blurb:
          "Picking files: a button that opens the picker or the camera, the drop area, and refusals reported where the user is looking, never as a toast.",
        icon: FileUp,
        components: ["FileButton", "useFilePicker", "FileDropzone", "useFileDrop"],
        Body: FileInputs,
      },
    ],
  },
  {
    slug: "pickers",
    label: "Pickers & entry",
    shortLabel: "Pickers",
    icon: ListFilter,
    blurb:
      "Choosing from a list rather than typing, and the heavier kinds of entry: a table of measurements, a field saved as you leave it, a signature, a password.",
    pages: [
      {
        slug: "comboboxes",
        title: "Comboboxes",
        short: "Comboboxes",
        blurb:
          "Free text with suggestions: the combobox whose value is whatever was typed, and the autocomplete that searches as you type.",
        icon: ChevronsUpDown,
        components: ["Combobox", "Autocomplete"],
        Body: () => (
          <>
            <Comboboxes />
            <AutocompleteDemo />
          </>
        ),
      },
      {
        slug: "entity-pickers",
        title: "Entity pickers",
        short: "Entities",
        blurb:
          "Picking a record by its id: inline and button-shaped pickers, static and loaded options, several at once, and the invalid, error and disabled states they share.",
        icon: Contact,
        components: ["InlineEntityCombobox", "EntityCombobox", "MultiEntityCombobox"],
        Body: EntityPickers,
      },
      {
        slug: "dropdown-parts",
        title: "Dropdown parts",
        short: "Parts",
        blurb:
          "Multi-select, the grouped picker and the phone sheet — and the hooks and panel every dropdown in the kit is built from.",
        icon: Puzzle,
        components: ["MultiSelect", "GroupedPicker", "PickerSheet", "useDropdown", "useDropdownSearch", "DropdownPanel"],
        Body: DropdownParts,
      },
      {
        slug: "measured-grid",
        title: "Table entry",
        short: "Table entry",
        blurb:
          "Typing a table of measurements: a keyboard grid of cells, a block pasted from a spreadsheet, and the same table as text — thousands of rows, only the visible ones mounted.",
        icon: Grid3x3,
        components: ["MeasuredGrid", "useMeasuredRows", "useWindowedRows", "parseTable", "parseRows"],
        Body: () => (
          <>
            <MeasuredGridDemo />
            <TableTextDemo />
          </>
        ),
      },
      {
        slug: "field-sync",
        title: "Field sync state",
        short: "Sync state",
        blurb:
          "Sync state for a database-backed field, saved on blur: the frame's colour and an icon at the field's end say edited, saving, saved or failed — hover the error mark for the reason.",
        icon: CircleDot,
        components: ["useFieldSync", "FieldSyncRow", "FieldSyncIndicator"],
        Body: FieldSync,
      },
      {
        slug: "signature-password",
        title: "Signature, password & confirmation",
        short: "Signature",
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
      "Showing values rather than taking them: the building blocks, feedback and progress, lists, trees and the table.",
    pages: [
      {
        slug: "buttons",
        title: "Buttons & surfaces",
        short: "Buttons",
        blurb:
          "Buttons, button groups, icon buttons, cards, spinners and avatars — the pieces everything else is built from.",
        icon: Blocks,
        components: ["Button", "ButtonGroup", "ButtonGroupLink", "IconButton", "Card", "Spinner", "UserAvatar", "buttonClasses"],
        Body: () => (
          <>
            <ButtonsSurfaces />
            <ButtonLabelsTones />
            <ButtonsMore />
          </>
        ),
      },
      {
        slug: "chips-toggles",
        title: "Chips & toggles",
        short: "Chips",
        blurb:
          "Chips and the chip field, the toggle group, and tabs — the small controls that pick one of a few or hold a short list.",
        icon: Tags,
        components: ["Chip", "ChipInput", "ToggleGroup", "Tabs"],
        Body: () => (
          <>
            <ChipsToggles />
            <ChipHuesToggleField />
            <ToggleCaptionDemo />
          </>
        ),
      },
      {
        slug: "feedback",
        title: "Feedback & progress",
        short: "Feedback",
        blurb:
          "How far a job has got, that content is on its way, that there is nothing here, and that something needs reading: progress bars and meters, skeletons, empty states and banners.",
        icon: Loader,
        components: ["ProgressBar", "Skeleton", "EmptyState", "AlertBanner", "alertFrameClass", "toneFrameClass", "toast", "Toaster"],
        Body: () => (
          <>
            <FeedbackProgress />
            <ProgressSegmentsDemo />
            <FeedbackMore />
            <ToastsDemo />
          </>
        ),
      },
      {
        slug: "description-list",
        title: "Description list & table",
        short: "Lists & tables",
        blurb:
          "Facts laid out without any machinery: a list of terms and details, a plain static table, and the separator and scroll area that sit between them.",
        icon: ListIcon,
        components: ["DescriptionList", "DescriptionItem", "Table", "TableBody", "TableEmpty", "TableCaption", "TableFoot", "NUMERIC_CELL_CLASS", "Separator", "ScrollArea"],
        Body: () => (
          <>
            <DescriptionTable />
            <DescriptionTableMore />
          </>
        ),
      },
      {
        slug: "tree-view",
        title: "Tree view",
        short: "Tree",
        blurb:
          "A hierarchy walked with the keyboard — one Tab stop, arrows to open and close, type-ahead — with children loaded on demand, controlled from outside, right-to-left, and its row on its own.",
        icon: ListTree,
        components: ["TreeView", "TreeRow", "TreeNode"],
        Body: TreeViewDemo,
      },
      {
        slug: "lists-menus",
        title: "Lists & menus",
        short: "Lists & menus",
        blurb:
          "The row every app draws by hand — a button, a link or a record, with its actions beside it — the row of a menu, and the bar a selection of rows brings up.",
        icon: ListChecks,
        components: ["List", "ListItem", "MenuItem", "BulkActionBar"],
        Body: () => (
          <>
            <ListsMenus />
            <ListDragDemo />
          </>
        ),
      },
      {
        slug: "data-table",
        title: "Data table",
        short: "Table",
        blurb:
          "The largest component in the kit, whole: sorting, filtering, selection and expansion, controlled from outside, short and unpaginated, filling a pane, and right-to-left.",
        icon: Table,
        components: ["DataTable"],
        Body: DataTableSection,
      },
      {
        slug: "data-table-server",
        title: "Data table: server, URL & phone",
        short: "Server & phone",
        blurb:
          "The table when it does not own everything: the view kept in the address, the rows paged by a server, and the phone layout of cards, groups and swipe actions.",
        icon: Server,
        components: ["DataTable"],
        Body: DataTableServerSection,
      },
      {
        slug: "data-table-parts",
        title: "Data table: parts & helpers",
        short: "Table parts",
        blurb:
          "What the table is assembled from, usable on its own: the pager, the filter popover, the label tree, and the pure sort, filter and URL helpers.",
        icon: Wrench,
        components: ["Pagination", "FilterPopover", "DEFAULT_DATA_TABLE_LABELS", "resolveDataTableLabels", "nextSorts", "rowMatches"],
        Body: DataTablePartsSection,
      },
      {
        slug: "layout",
        title: "Disclosure & dialog frame",
        short: "Disclosure",
        blurb: "A section that folds away, and the header-body-actions frame every dialog repeats.",
        icon: PanelTopClose,
        components: ["Disclosure", "Collapse", "DialogFrame"],
        Body: () => (
          <>
            <LayoutDemo />
            <DisclosureMore />
          </>
        ),
      },
    ],
  },
  {
    slug: "charts",
    label: "Charts",
    icon: ChartArea,
    blurb:
      "Values as pictures: the themed shell over Recharts, the tile chart, the zoomable series chart with its bars and areas, and the KPI tile.",
    pages: [
      {
        slug: "chart-shell",
        title: "Chart shell",
        short: "Charts",
        blurb:
          "The themed chart shell over Recharts — container, tooltip and legend — and the colour system every chart in the kit draws from.",
        icon: ChartColumn,
        components: ["ChartContainer", "ChartTooltip", "ChartLegend", "useChart", "paletteFor"],
        Body: Charts,
      },
      {
        slug: "tile-chart",
        title: "Tile chart",
        short: "Tiles",
        blurb:
          "The treemap: a share of a whole as tiles, with labels that fit, tiles you can click — and drilling down, through a bar chart as well as through tiles.",
        icon: LayoutPanelLeft,
        components: ["Treemap", "TreemapCell", "fitLabel"],
        Body: () => (
          <>
            <TreemapDemo />
            <ChartDrilldowns />
          </>
        ),
      },
      {
        slug: "series-chart",
        title: "Series chart",
        short: "Series",
        blurb:
          "The zoomable series chart the apps share: an axis per unit, a legend of switches, one zoom for a stack of charts, and the helpers underneath.",
        icon: ChartLine,
        components: ["SeriesChart", "StaticSeriesChart", "SharedXZoom", "ToggleLegend", "facingAxes"],
        Body: () => (
          <>
            <SeriesChartDemo />
            <IntegerTicksDemo />
          </>
        ),
      },
      {
        slug: "series-chart-marks",
        title: "Series chart: bars, areas & time",
        short: "Bars & areas",
        blurb:
          "The same chart drawing bars, areas and stacks, over categories and real time, with reference lines, markers, dots and clicks — and a legend whose colours hold still.",
        icon: ChartBar,
        components: ["SeriesChart", "visibleSeries", "seriesLegendEntries", "defaultZoomAxes"],
        Body: () => (
          <>
            <SeriesChartMarks />
            <KeyboardPointsDemo />
          </>
        ),
      },
      {
        slug: "stats",
        title: "Stats & sparklines",
        short: "Stats",
        blurb:
          "The KPI tile every dashboard repeats — value, change, trend — and the tiny line that fits in a table cell.",
        icon: Gauge,
        components: ["StatTile", "StatTileGrid", "Sparkline"],
        Body: StatsDemo,
      },
      {
        slug: "calendar-heatmap",
        title: "Calendar heatmap",
        short: "Heatmap",
        blurb:
          "Days as shaded squares: a year of weeks or one month, a day that can be picked, the scale's steps, top and colour, a long window cut to its latest days, and right-to-left.",
        icon: CalendarDays,
        components: ["CalendarHeatmap", "heatmapLevel"],
        Body: CalendarHeatmapDemo,
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
        title: "Dialogs",
        short: "Dialogs",
        blurb:
          "Modal and full-bleed dialog, the backdrop press that closes them, and the close-transition timing every overlay shares.",
        icon: AppWindow,
        components: ["Modal", "FullBleedDialog", "useBackdropClose", "OVERLAY_EXIT_MS", "useCloseTransition"],
        Body: () => (
          <>
            <Dialogs />
            <DialogOpenDemo />
          </>
        ),
      },
      {
        slug: "confirm-floating",
        title: "Confirm dialog & floating panel",
        short: "Confirm",
        blurb:
          "The promise that replaces window.confirm — with tones, its own words and a queue — and the non-modal panel docked in a corner behind a floating button.",
        icon: MessageCircleQuestion,
        components: ["ConfirmProvider", "useConfirm", "FloatingPanel", "FloatingActionButton"],
        Body: ConfirmFloating,
      },
      {
        slug: "floating-actions",
        title: "Floating actions",
        short: "Floating",
        blurb:
          "The corner controls: an extended button that reports a status and is announced when it changes, the kit tooltip on a floating button, and a pill of corner toggles, links and counts.",
        icon: Pin,
        components: ["FloatingActionButton", "FloatingActionGroup", "FloatingAction", "FloatingPanel"],
        Body: FloatingActions,
      },
      {
        slug: "popovers",
        title: "Popovers, menus & tooltips",
        short: "Popovers",
        blurb:
          "The overlays anchored to a trigger: popover, hover menu and tooltip — flipped and clamped against the window, mirrored right-to-left, and the pure placement behind them.",
        icon: MousePointerClick,
        components: ["Popover", "HoverMenu", "Tooltip", "placeTooltip"],
        Body: () => (
          <>
            <PopoversMenusTooltips />
            <TooltipAutoPortal />
          </>
        ),
      },
      {
        slug: "tour",
        title: "Guided tour",
        short: "Tour",
        blurb:
          "A spotlight tour over the real page: steps that point at any element by selector, wait for a click, run code first, and survive a missing target.",
        icon: Footprints,
        components: ["TourProvider", "useTour", "useTourOptional", "TourStep"],
        Body: GuidedTour,
      },
      {
        slug: "command-palette",
        title: "Command palette",
        short: "Commands",
        blurb:
          "The ⌘K palette: a searchable list of places and actions, opened by the shortcut anywhere on the page, with results that can arrive late.",
        icon: Command,
        components: ["CommandPalette", "useCommandKey"],
        Body: CommandPaletteDemo,
      },
      {
        slug: "swipeable-row",
        title: "Swipeable row",
        short: "Swipe",
        blurb:
          "A list row that reveals its actions when dragged sideways — by finger or mouse, in stages, right-to-left — with the same actions reachable by keyboard.",
        icon: MoveHorizontal,
        components: ["SwipeableRow", "useRowSwipe"],
        Body: SwipeableRowDemo,
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
        short: "Shell",
        blurb: "The app frame you are looking at, taken apart.",
        icon: Layout,
        components: ["AppShell", "TopBar", "PageContents", "ThemeToggle", "LanguageMenu", "TopBarActionMenu", "UserAvatar"],
        Body: () => (
          <>
            <ShellSection />
            <AccountMenuDemo />
          </>
        ),
      },
      {
        slug: "page-structure",
        title: "Page header & breadcrumbs",
        short: "Page header",
        blurb:
          "The parts of a page that are not its content: the header with its trail and actions, the breadcrumbs on their own, and the section label, caption and status dot.",
        icon: PanelTop,
        components: ["PageHeader", "Breadcrumbs", "SectionLabel", "Caption", "StatusDot", "NavPills", "SECTION_LABEL_CLASS", "CAPTION_CLASS"],
        Body: () => (
          <>
            <PageStructure />
            <NavPillsDemo />
          </>
        ),
      },
      {
        slug: "settings",
        title: "Settings fields",
        short: "Settings",
        blurb: "The account-settings rows: theme, language, profile, password and two-factor.",
        icon: SettingsIcon,
        components: ["ThemeSetting", "LanguageSetting", "ProfileSetting", "TwoFactorSetting"],
        Body: Settings,
      },
      {
        slug: "wizard",
        title: "Wizard",
        short: "Wizard",
        blurb: "The multi-step engine, its chrome and its review step.",
        icon: Wand2,
        components: ["useWizard", "StepperNav", "WizardSummary"],
        Body: Wizard,
      },
      {
        slug: "feedback-compose",
        title: "Feedback — compose",
        short: "Compose",
        blurb: "The report form and its attachment field.",
        icon: MessageSquarePlus,
        components: ["FeedbackDialog", "FeedbackAttachmentField"],
        Body: FeedbackCompose,
      },
      {
        slug: "feedback-inbox",
        title: "Feedback — inbox",
        short: "Inbox",
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
        short: "Hooks",
        blurb: "The non-visual exports: hooks read live, and the pure helpers as input → output.",
        icon: FileText,
        components: ["useMediaQuery", "useAnchoredPanel", "useOverlayHistory", "cn"],
        Body: HooksLib,
      },
      {
        slug: "clipboard-timing",
        title: "Clipboard & timing",
        short: "Clipboard",
        blurb:
          "Copying that says whether it worked, and waiting until the typing stops: the copy button and its hook, and the debounced value and callback.",
        icon: ClipboardCopy,
        components: ["CopyButton", "useCopyToClipboard", "copyToClipboard", "useDebounce", "useDebouncedCallback"],
        Body: ClipboardTiming,
      },
      {
        slug: "helpers",
        title: "Helpers & constants",
        short: "Helpers",
        blurb:
          "The functions and data behind the inputs, shown as input → output: date arithmetic at @eifi1/ui-kit/dates, the calculator's evaluator, the currency table, and the class constants a custom field is composed from.",
        icon: FunctionSquare,
        components: ["todayIso", "dateRangePresets", "calendarMonthPresets", "lastFullMonthsRange", "evaluateExpression", "CURRENCIES", "FIELD_BASE"],
        Body: Helpers,
      },
    ],
  },
];

/**
 * Slugs that no longer name a page, each mapped to the page that took over its FIRST
 * specimens. Pages were split when they grew past what a reader scrolls through — the
 * old Primitives page held 29 specimens — and a link written before the split (in a
 * README, a commit message, an issue, another page of this showcase) has to keep
 * landing somewhere sensible rather than on "No such page". The router redirects
 * `/<old>` to `/<new>`, keeping the query and the `#anchor`.
 */
export const RETIRED_SLUGS: Record<string, string> = {
  primitives: "buttons",
  dropdowns: "comboboxes",
  dates: "calendars",
  "tour-search-files": "tour",
  // `charts` redirected to "chart-shell" until 0.8.0, when the charts left Data display
  // for a group of their own — which took the slug for its overview. An old /charts link
  // now lands one level up, on the index of the chart pages, which is still right.
};

/** A group whose sidebar entry opens an overview page rather than its only page. */
export const hasOverview = (group: ShowcaseGroup) => group.pages.length > 1;

/** The overview pages, synthesised from the groups so a group cannot exist without one. */
function overviewPage(group: ShowcaseGroup): ShowcasePage {
  return {
    slug: group.slug,
    title: group.label,
    short: group.shortLabel ?? group.label,
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
