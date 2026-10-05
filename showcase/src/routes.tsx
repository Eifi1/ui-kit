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
  ChartPie,
  Bookmark,
  Images,
  KeyRound,
  Link2,
  Percent,
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
import { lazySection } from "./lib/lazy-section";

const Foundations = lazySection(() => import("./sections/foundations"), "Foundations");
const PaletteGenerator = lazySection(() => import("./sections/palette-generator"), "PaletteGenerator");
const ButtonsSurfaces = lazySection(() => import("./sections/buttons-surfaces"), "ButtonsSurfaces");
const ChipsToggles = lazySection(() => import("./sections/chips-toggles"), "ChipsToggles");
const Fields = lazySection(() => import("./sections/fields"), "Fields");
const FormsRhf = lazySection(() => import("./sections/forms-rhf"), "FormsRhf");
const Choices = lazySection(() => import("./sections/choices"), "Choices");
const TimeInputDemo = lazySection(() => import("./sections/number-time-demo"), "TimeInputDemo");
const FileInputs = lazySection(() => import("./sections/file-inputs"), "FileInputs");
const AutocompleteDemo = lazySection(() => import("./sections/autocomplete-demo"), "AutocompleteDemo");
const FieldAnatomyDemo = lazySection(() => import("./sections/field-anatomy-demo"), "FieldAnatomyDemo");
const SelectionDemo = lazySection(() => import("./sections/selection-demo"), "SelectionDemo");
const LayoutDemo = lazySection(() => import("./sections/layout-demo"), "LayoutDemo");
const MeasuredGridDemo = lazySection(() => import("./sections/measured-grid-demo"), "MeasuredGridDemo");
const TableTextDemo = lazySection(() => import("./sections/table-text-demo"), "TableTextDemo");
const DangerConfirmDemo = lazySection(() => import("./sections/numbers-more-demo"), "DangerConfirmDemo");
const NumberStepsDemo = lazySection(() => import("./sections/numbers-more-demo"), "NumberStepsDemo");
const SignatureViewDemo = lazySection(() => import("./sections/numbers-more-demo"), "SignatureViewDemo");
const WeekStartDemo = lazySection(() => import("./sections/numbers-more-demo"), "WeekStartDemo");
const SignaturePasswordDemo = lazySection(() => import("./sections/signature-password-demo"), "SignaturePasswordDemo");
const StatsDemo = lazySection(() => import("./sections/stats-demo"), "StatsDemo");
const SeriesChartDemo = lazySection(() => import("./sections/series-chart-demo"), "SeriesChartDemo");
const FieldSync = lazySection(() => import("./sections/field-sync"), "FieldSync");
const Numbers = lazySection(() => import("./sections/numbers"), "Numbers");
const Comboboxes = lazySection(() => import("./sections/comboboxes"), "Comboboxes");
const EntityPickers = lazySection(() => import("./sections/entity-pickers"), "EntityPickers");
const DropdownParts = lazySection(() => import("./sections/dropdown-parts"), "DropdownParts");
const Dialogs = lazySection(() => import("./sections/overlays"), "Dialogs");
const PopoversMenusTooltips = lazySection(() => import("./sections/overlays"), "PopoversMenusTooltips");
const Dates = lazySection(() => import("./sections/dates"), "Dates");
const MonthPickerDemo = lazySection(() => import("./sections/month-picker-demo"), "MonthPickerDemo");
const DataTableSection = lazySection(() => import("./sections/data-table"), "DataTableSection");
const DataTableServerSection = lazySection(() => import("./sections/data-table-server"), "DataTableServerSection");
const DataTablePartsSection = lazySection(() => import("./sections/data-table-parts"), "DataTablePartsSection");
const Charts = lazySection(() => import("./sections/charts"), "Charts");
const TreemapDemo = lazySection(() => import("./sections/treemap-demo"), "TreemapDemo");
const ChartDrilldowns = lazySection(() => import("./sections/chart-drilldowns"), "ChartDrilldowns");
const ShellSection = lazySection(() => import("./sections/shell"), "ShellSection");
const Settings = lazySection(() => import("./sections/settings"), "Settings");
const FeedbackCompose = lazySection(() => import("./sections/feedback-compose"), "FeedbackCompose");
const FeedbackInbox = lazySection(() => import("./sections/feedback-inbox"), "FeedbackInbox");
const Wizard = lazySection(() => import("./sections/wizard"), "Wizard");
const GuidedTour = lazySection(() => import("./sections/tour"), "GuidedTour");
const CommandPaletteDemo = lazySection(() => import("./sections/command-palette-demo"), "CommandPaletteDemo");
const Search017Demo = lazySection(() => import("./sections/search-017-demo"), "Search017Demo");
const SwipeableRowDemo = lazySection(() => import("./sections/swipeable-row-demo"), "SwipeableRowDemo");
const HooksLib = lazySection(() => import("./sections/hooks-lib"), "HooksLib");
const Helpers = lazySection(() => import("./sections/helpers"), "Helpers");
const GettingStarted = lazySection(() => import("./sections/overview"), "GettingStarted");
const GroupOverview = lazySection(() => import("./sections/overview"), "GroupOverview");
const FeedbackProgress = lazySection(() => import("./sections/feedback-progress"), "FeedbackProgress");
const DescriptionTable = lazySection(() => import("./sections/description-table"), "DescriptionTable");
const TreeViewDemo = lazySection(() => import("./sections/tree-view-demo"), "TreeViewDemo");
const ConfirmFloating = lazySection(() => import("./sections/confirm-floating"), "ConfirmFloating");
const TypedConfirm018Demo = lazySection(() => import("./sections/confirm-018-demo"), "TypedConfirm018Demo");
const Reauth018Demo = lazySection(() => import("./sections/confirm-018-demo"), "Reauth018Demo");
const ClipboardTiming = lazySection(() => import("./sections/clipboard-timing"), "ClipboardTiming");
const SeriesChartMarks = lazySection(() => import("./sections/series-chart-marks"), "SeriesChartMarks");
const Localisation = lazySection(() => import("./sections/localisation"), "Localisation");
const TranslationReviewDemo = lazySection(() => import("./sections/translation-review-demo"), "TranslationReviewDemo");
const KitReviewPage = lazySection(() => import("./kit-review/kit-review-page"), "KitReviewPage");
const ListsMenus = lazySection(() => import("./sections/lists-menus"), "ListsMenus");
const PageStructure = lazySection(() => import("./sections/page-structure"), "PageStructure");
const ButtonLabelsTones = lazySection(() => import("./sections/button-labels-demo"), "ButtonLabelsTones");
const ChipHuesToggleField = lazySection(() => import("./sections/chip-hues-demo"), "ChipHuesToggleField");
const FeedbackMore = lazySection(() => import("./sections/feedback-more-demo"), "FeedbackMore");
const ToastsDemo = lazySection(() => import("./sections/toast-demo"), "ToastsDemo");
const DescriptionTableMore = lazySection(() => import("./sections/description-table-more"), "DescriptionTableMore");
const DisclosureMore = lazySection(() => import("./sections/disclosure-more-demo"), "DisclosureMore");
const IntegerTicksDemo = lazySection(() => import("./sections/series-chart-ticks-keys"), "IntegerTicksDemo");
const KeyboardPointsDemo = lazySection(() => import("./sections/series-chart-ticks-keys"), "KeyboardPointsDemo");
const DialogOpenDemo = lazySection(() => import("./sections/dialog-open-demo"), "DialogOpenDemo");
const TooltipAutoPortal = lazySection(() => import("./sections/tooltip-auto-portal-demo"), "TooltipAutoPortal");
const TooltipLazyDemo = lazySection(() => import("./sections/tooltip-013-demo"), "TooltipLazyDemo");
const TooltipClampDemo = lazySection(() => import("./sections/tooltip-014-demo"), "TooltipClampDemo");
const FloatingActions = lazySection(() => import("./sections/floating-actions-demo"), "FloatingActions");
const CalendarHeatmapDemo = lazySection(() => import("./sections/calendar-heatmap-demo"), "CalendarHeatmapDemo");
const MonthViewDemo = lazySection(() => import("./sections/month-view-demo"), "MonthViewDemo");
const ButtonsMore = lazySection(() => import("./sections/buttons-more-demo"), "ButtonsMore");
const AccountMenuDemo = lazySection(() => import("./sections/account-menu-demo"), "AccountMenuDemo");
const ToggleCaptionDemo = lazySection(() => import("./sections/toggle-caption-demo"), "ToggleCaptionDemo");
const ActionCardDemo = lazySection(() => import("./sections/action-card-demo"), "ActionCardDemo");
const NavPillsDemo = lazySection(() => import("./sections/nav-pills-demo"), "NavPillsDemo");
const ProgressSegmentsDemo = lazySection(() => import("./sections/progress-segments-demo"), "ProgressSegmentsDemo");
const ProgressLegendTone018Demo = lazySection(() => import("./sections/progress-018-demo"), "ProgressLegendTone018Demo");
const FieldDemo = lazySection(() => import("./sections/field-demo"), "FieldDemo");
const RhfWizardDemo = lazySection(() => import("./sections/rhf-wizard-demo"), "RhfWizardDemo");
const ListDragDemo = lazySection(() => import("./sections/list-drag-demo"), "ListDragDemo");
const List016Demo = lazySection(() => import("./sections/list-016-demo"), "List016Demo");
const AlertBannerBlockDemo = lazySection(() => import("./sections/props-011-demo"), "AlertBannerBlockDemo");
const BulkActionBarPanelDemo = lazySection(() => import("./sections/props-011-demo"), "BulkActionBarPanelDemo");
const ClipsMarkerDemo = lazySection(() => import("./sections/props-011-demo"), "ClipsMarkerDemo");
const EmptyStateSmallDemo = lazySection(() => import("./sections/props-011-demo"), "EmptyStateSmallDemo");
const IconButtonDisabledReasonDemo = lazySection(() => import("./sections/props-011-demo"), "IconButtonDisabledReasonDemo");
const MenuItemBadgeDemo = lazySection(() => import("./sections/props-011-demo"), "MenuItemBadgeDemo");
const MinBarLengthDemo = lazySection(() => import("./sections/props-011-demo"), "MinBarLengthDemo");
const SectionLabelMdDemo = lazySection(() => import("./sections/props-011-demo"), "SectionLabelMdDemo");
const Layout013Demo = lazySection(() => import("./sections/layout-013-demo"), "Layout013Demo");
const PageHeader014Demo = lazySection(() => import("./sections/page-header-014-demo"), "PageHeader014Demo");
const StatusDotHuesDemo = lazySection(() => import("./sections/props-011-demo"), "StatusDotHuesDemo");
const TableHeaderValignDemo = lazySection(() => import("./sections/props-011-demo"), "TableHeaderValignDemo");
const LinksDemo = lazySection(() => import("./sections/links-demo"), "LinksDemo");
const Links013Demo = lazySection(() => import("./sections/links-013-demo"), "Links013Demo");
const Buttons012 = lazySection(() => import("./sections/buttons-012-demo"), "Buttons012");
const Surfaces016Demo = lazySection(() => import("./sections/surfaces-016-demo"), "Surfaces016Demo");
const Surfaces017Demo = lazySection(() => import("./sections/surfaces-017-demo"), "Surfaces017Demo");
const FormLayoutDemo = lazySection(() => import("./sections/forms-012-demo"), "FormLayoutDemo");
const RhfFieldsDemo = lazySection(() => import("./sections/forms-012-demo"), "RhfFieldsDemo");
const Forms013Demo = lazySection(() => import("./sections/forms-013-demo"), "Forms013Demo");
const Forms0142Demo = lazySection(() => import("./sections/forms-0142-demo"), "Forms0142Demo");
const LineItems016Demo = lazySection(() => import("./sections/line-items-016-demo"), "LineItems016Demo");
const LineItemsJournal017Demo = lazySection(() => import("./sections/line-items-017-demo"), "LineItemsJournal017Demo");
const LineItemsSplit017Demo = lazySection(() => import("./sections/line-items-017-demo"), "LineItemsSplit017Demo");
const WizardStepHooksDemo = lazySection(() => import("./sections/wizard-012-demo"), "WizardStepHooksDemo");
const DescriptionPlaceholderDemo = lazySection(() => import("./sections/table-012-demo"), "DescriptionPlaceholderDemo");
const TableVariantsDemo = lazySection(() => import("./sections/table-012-demo"), "TableVariantsDemo");
const TableStackDemo = lazySection(() => import("./sections/table-012-demo"), "TableStackDemo");
const DataTableActionsDemo = lazySection(() => import("./sections/data-table-012-demo"), "DataTableActionsDemo");
const DataTableUrlFiltersDemo = lazySection(() => import("./sections/data-table-012-demo"), "DataTableUrlFiltersDemo");
const DataTableTotalsDemo = lazySection(() => import("./sections/data-table-017-demo"), "DataTableTotalsDemo");
const UrlStateDemo = lazySection(() => import("./sections/url-state-demo"), "UrlStateDemo");
const FormattingDemo = lazySection(() => import("./sections/formatting-demo"), "FormattingDemo");
const Signals016Demo = lazySection(() => import("./sections/signals-016-demo"), "Signals016Demo");
const Signals017Demo = lazySection(() => import("./sections/signals-017-demo"), "Signals017Demo");
const FormActions017Demo = lazySection(() => import("./sections/signals-017-demo"), "FormActions017Demo");
const WriteLock018Demo = lazySection(() => import("./sections/write-lock-018-demo"), "WriteLock018Demo");
const FormActions016Demo = lazySection(() => import("./sections/harmonise-016-demo"), "FormActions016Demo");
const LoadingState016Demo = lazySection(() => import("./sections/harmonise-016-demo"), "LoadingState016Demo");
const Media016Demo = lazySection(() => import("./sections/harmonise-016-demo"), "Media016Demo");
const Numbers016Demo = lazySection(() => import("./sections/harmonise-016-demo"), "Numbers016Demo");
const Files016Demo = lazySection(() => import("./sections/harmonise-016-demo"), "Files016Demo");
const Chips016Demo = lazySection(() => import("./sections/harmonise-016-demo"), "Chips016Demo");
const ChipSnapEdges018Demo = lazySection(() => import("./sections/chip-toast-018-demo"), "ChipSnapEdges018Demo");
const ToastMiddleClick018Demo = lazySection(() => import("./sections/chip-toast-018-demo"), "ToastMiddleClick018Demo");
const ServerWake018Demo = lazySection(() => import("./sections/server-wake-018-demo"), "ServerWake018Demo");
const HotkeyDemo = lazySection(() => import("./sections/states-012-demo"), "HotkeyDemo");
const StatesDemo = lazySection(() => import("./sections/states-012-demo"), "StatesDemo");
const ErrorBoundary013Demo = lazySection(() => import("./sections/error-boundary-013-demo"), "ErrorBoundary013Demo");
const PieChartDemo = lazySection(() => import("./sections/pie-chart-demo"), "PieChartDemo");
const HeatmapRampDemo = lazySection(() => import("./sections/heatmap-012-demo"), "HeatmapRampDemo");
const MonthStepperDemo = lazySection(() => import("./sections/calendars-012-demo"), "MonthStepperDemo");
const Display013Demo = lazySection(() => import("./sections/display-013-demo"), "Display013Demo");
const OutsideDaysDemo = lazySection(() => import("./sections/calendars-012-demo"), "OutsideDaysDemo");
const ComboboxClipsDemo = lazySection(() => import("./sections/clips-012-demo"), "ComboboxClipsDemo");
const PickerSheetClipsDemo = lazySection(() => import("./sections/clips-012-demo"), "PickerSheetClipsDemo");
const MediaDemo = lazySection(() => import("./sections/media-demo"), "MediaDemo");
const AuthAccountDemo = lazySection(() => import("./sections/auth-account-demo"), "AuthAccountDemo");
const FeedbackThreadDemo = lazySection(() => import("./sections/feedback-thread-demo"), "FeedbackThreadDemo");
const ShellBrandDemo = lazySection(() => import("./sections/shell-012-demo"), "ShellBrandDemo");
const AccountHeaderLinkDemo = lazySection(() => import("./sections/shell-feedback-013-demo"), "AccountHeaderLinkDemo");
const ComposerCannedRepliesDemo = lazySection(() => import("./sections/shell-feedback-013-demo"), "ComposerCannedRepliesDemo");
const Feedback014Demo = lazySection(() => import("./sections/feedback-014-demo"), "Feedback014Demo");
const FeedbackAttachment016Demo = lazySection(() => import("./sections/feedback-016-demo"), "FeedbackAttachment016Demo");
const Passkeys016Demo = lazySection(() => import("./sections/feedback-016-demo"), "Passkeys016Demo");
const Passkeys018Demo = lazySection(() => import("./sections/account-018-demo"), "Passkeys018Demo");
const AccountRoster018Demo = lazySection(() => import("./sections/account-018-demo"), "AccountRoster018Demo");
const Share018Demo = lazySection(() => import("./sections/share-018-demo"), "Share018Demo");
const Legal019Demo = lazySection(() => import("./sections/legal-019-demo"), "Legal019Demo");
const Legal028Demo = lazySection(() => import("./sections/legal-028-demo"), "Legal028Demo");
const LegalAccept028Demo = lazySection(() => import("./sections/legal-028-demo"), "LegalAccept028Demo");
const TableRefs016Demo = lazySection(() => import("./sections/feedback-016-demo"), "TableRefs016Demo");
const Rhf022Demo = lazySection(() => import("./sections/rhf-022-demo"), "Rhf022Demo");
const Country022Demo = lazySection(() => import("./sections/country-022-demo"), "Country022Demo");
const Guards022Demo = lazySection(() => import("./sections/guards-022-demo"), "Guards022Demo");
const FileLock022Demo = lazySection(() => import("./sections/guards-022-demo"), "FileLock022Demo");
const InlineEdit022Demo = lazySection(() => import("./sections/guards-022-demo"), "InlineEdit022Demo");
const OneTimeCode022Demo = lazySection(() => import("./sections/account-fields-022-demo"), "OneTimeCode022Demo");
const OneTimeCodeUnlabelled022Demo = lazySection(() => import("./sections/account-fields-022-demo"), "OneTimeCodeUnlabelled022Demo");
const PasswordStrength022Demo = lazySection(() => import("./sections/account-fields-022-demo"), "PasswordStrength022Demo");
const LanguageSelect022Demo = lazySection(() => import("./sections/account-fields-022-demo"), "LanguageSelect022Demo");
const TileRadioGroup022Demo = lazySection(() => import("./sections/account-fields-022-demo"), "TileRadioGroup022Demo");
const AccountNumbers022Demo = lazySection(() => import("./sections/account-numbers-022-demo"), "AccountNumbers022Demo");
const ToggleGroup022Demo = lazySection(() => import("./sections/pickers-022-demo"), "ToggleGroup022Demo");
const Choices022Demo = lazySection(() => import("./sections/pickers-022-demo"), "Choices022Demo");
const Dates022Demo = lazySection(() => import("./sections/pickers-022-demo"), "Dates022Demo");
const Month022Demo = lazySection(() => import("./sections/pickers-022-demo"), "Month022Demo");
const Numbers022Demo = lazySection(() => import("./sections/numbers-022-demo"), "Numbers022Demo");
const DataTableMobileSort022Demo = lazySection(() => import("./sections/misc-022-demo"), "DataTableMobileSort022Demo");
const FormActionsShortcut022Demo = lazySection(() => import("./sections/misc-022-demo"), "FormActionsShortcut022Demo");
const LineItemsRowProps022Demo = lazySection(() => import("./sections/misc-022-demo"), "LineItemsRowProps022Demo");
const FeedbackAttachmentRefs022Demo = lazySection(() => import("./sections/misc-022-demo"), "FeedbackAttachmentRefs022Demo");
const ChatComposer022Demo = lazySection(() => import("./sections/misc-022-demo"), "ChatComposer022Demo");
const TourStaleSpotlight022Demo = lazySection(() => import("./sections/misc-022-demo"), "TourStaleSpotlight022Demo");
const Fields022Demo = lazySection(() => import("./sections/fields-022-demo"), "Fields022Demo");
const PickerHints022Demo = lazySection(() => import("./sections/fields-022-demo"), "PickerHints022Demo");
const CheckboxGroup022Demo = lazySection(() => import("./sections/fields-022-demo"), "CheckboxGroup022Demo");
const CommitControls022Demo = lazySection(() => import("./sections/fields-022-demo"), "CommitControls022Demo");
// 0.23.0: the apps' 0.22 adoption round.
const TopBarMenuHeadingsDemo = lazySection(() => import("./sections/topbar-023-demo"), "TopBarMenuHeadingsDemo");
const FormActions023Demo = lazySection(() => import("./sections/confirm-023-demo"), "FormActions023Demo");
const DangerConfirm023Demo = lazySection(() => import("./sections/confirm-023-demo"), "DangerConfirm023Demo");
const Rhf023Demo = lazySection(() => import("./sections/fields-023-demo"), "Rhf023Demo");
const CountryClear023Demo = lazySection(() => import("./sections/fields-023-demo"), "CountryClear023Demo");
const AmountClass023Demo = lazySection(() => import("./sections/fields-023-demo"), "AmountClass023Demo");
const FeedbackAttachment023Demo = lazySection(() => import("./sections/feedback-023-demo"), "FeedbackAttachment023Demo");
const ChatComposerCount023Demo = lazySection(() => import("./sections/feedback-023-demo"), "ChatComposerCount023Demo");
const FieldStrip023Demo = lazySection(() => import("./sections/strip-023-demo"), "FieldStrip023Demo");
const TileLock023Demo = lazySection(() => import("./sections/strip-023-demo"), "TileLock023Demo");
const ComboboxFamilyLock023Demo = lazySection(() => import("./sections/combobox-023-demo"), "ComboboxFamilyLock023Demo");
const InlineCreateRow023Demo = lazySection(() => import("./sections/combobox-023-demo"), "InlineCreateRow023Demo");
const StepperNavFinishLock023Demo = lazySection(() => import("./sections/combobox-023-demo"), "StepperNavFinishLock023Demo");
const DateRange023Demo = lazySection(() => import("./sections/date-range-023-demo"), "DateRange023Demo");
const ColumnMapper023Demo = lazySection(() => import("./sections/column-mapper-023-demo"), "ColumnMapper023Demo");
// 0.24.0: the apps' 0.23 adoption round.
const Textarea024Demo = lazySection(() => import("./sections/textarea-024-demo"), "Textarea024Demo");
const DangerConfirm024Demo = lazySection(() => import("./sections/confirm-024-demo"), "DangerConfirm024Demo");
const ChatComposerSlot024Demo = lazySection(() => import("./sections/feedback-024-demo"), "ChatComposerSlot024Demo");
const ColumnMapper024Demo = lazySection(() => import("./sections/column-mapper-024-demo"), "ColumnMapper024Demo");
const RhfInlineEntity024Demo = lazySection(() => import("./sections/combobox-024-demo"), "RhfInlineEntity024Demo");
const AutocompleteHint024Demo = lazySection(() => import("./sections/combobox-024-demo"), "AutocompleteHint024Demo");
// 0.25.0: keksdose's feedback run 72 and the polish list.
const SearchParams025Demo = lazySection(() => import("./sections/search-params-025-demo"), "SearchParams025Demo");
const TranslationReview025Demo = lazySection(() => import("./sections/translation-review-025-demo"), "TranslationReview025Demo");
const TextareaEdge025Demo = lazySection(() => import("./sections/polish-025-demo"), "TextareaEdge025Demo");
const ColumnRoleRequired025Demo = lazySection(() => import("./sections/polish-025-demo"), "ColumnRoleRequired025Demo");
const FeedbackDialogButtons025Demo = lazySection(() => import("./sections/polish-025-demo"), "FeedbackDialogButtons025Demo");
const FeedbackNoteButtons025Demo = lazySection(() => import("./sections/polish-025-demo"), "FeedbackNoteButtons025Demo");
const TableEdgeFadeDemo = lazySection(() => import("./sections/table-fade-025-demo"), "TableEdgeFadeDemo");
const DataTableEdgeFadeDemo = lazySection(() => import("./sections/table-fade-025-demo"), "DataTableEdgeFadeDemo");
const TooltipTapDemo = lazySection(() => import("./sections/tooltip-025-demo"), "TooltipTapDemo");
// 0.27.0: the feedback harmonization.
const FeedbackSubmit027Demo = lazySection(() => import("./sections/feedback-submit-027-demo"), "FeedbackSubmit027Demo");
const FeedbackTable027Demo = lazySection(() => import("./sections/feedback-table-027-demo"), "FeedbackTable027Demo");
const FeedbackDetail027Demo = lazySection(() => import("./sections/feedback-detail-027-demo"), "FeedbackDetail027Demo");
const FeedbackRecord027Demo = lazySection(() => import("./sections/feedback-record-027-demo"), "FeedbackRecord027Demo");

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
  /** The page's sections. Each one it renders is a `lazySection`, fetched as its own
   *  chunk when the page first opens (showcase.tsx suspends on it). */
  Body: React.ComponentType;
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
        components: ["UiKitProvider", "UiKitLabels", "DEFAULT_UI_KIT_LABELS", "missingKitLabels", "UI_KIT_LABELS_DE_CH", "uiKitLabelsDeCh", "KIT_LANGUAGES", "resolveLanguage", "loadUiKitLabels", "kitLabelStrings", "TranslationReviewPanel"],
        Body: () => (
          <>
            <Localisation />
            <TranslationReviewDemo />
            <TranslationReview025Demo />
          </>
        ),
      },
      {
        slug: "kit-review",
        title: "Kit review (live)",
        short: "Kit review",
        blurb:
          "The kit's own words in every language keksdose ships, reviewed against keksdose's review database: the same kit. rows and verdicts as its Translations page, opened from there with a review token.",
        icon: ListChecks,
        components: ["TranslationReviewPanel", "TranslationLocaleTabs", "ServerWakeNotice", "createServerWake", "useServerWakeStage"],
        Body: KitReviewPage,
      },
    ],
  },
  {
    slug: "inputs",
    label: "Inputs",
    shortLabel: "Inputs",
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
        components: ["Input", "Select", "Textarea", "Label", "SearchField", "FloatingField", "FieldHint", "Field", "IbanInput", "PhoneInput", "FieldStrip"],
        Body: () => (
          <>
            <Fields />
            <FieldAnatomyDemo />
            <FieldDemo />
            <Fields022Demo />
            <AccountNumbers022Demo />
            <FieldStrip023Demo />
            <Textarea024Demo />
            <TextareaEdge025Demo />
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
        components: ["Form", "FormField", "FormItem", "FormLabel", "FormControl", "FormMessage", "useFormField", "useRhfWizardStep", "Field", "RhfField", "RhfTextField", "RhfNumberField", "RhfIntegerField", "RhfMoneyField", "RhfDateField", "RhfTextarea", "RhfSelect", "RhfCheckbox", "RhfCombobox", "RhfTextCombobox", "RhfLineItems", "FormActions", "LineItems", "WriteLockProvider", "RhfTimeInput", "RhfDateRangePicker", "RhfToggleGroup", "RhfIbanInput", "RhfPhoneInput", "RhfCountrySelect", "RhfMonthPicker", "RhfInlineEntityCombobox"],
        Body: () => (
          <>
            <FormsRhf />
            <RhfWizardDemo />
            <RhfFieldsDemo />
            <FormLayoutDemo />
            <Forms013Demo />
            <Forms0142Demo />
            <LineItems016Demo />
            <LineItemsJournal017Demo />
            <LineItemsSplit017Demo />
            <FormActions016Demo />
            <FormActions017Demo />
            <WriteLock018Demo />
            <Rhf022Demo />
            <FormActionsShortcut022Demo />
            <LineItemsRowProps022Demo />
            <CommitControls022Demo />
            <Rhf023Demo />
            <FormActions023Demo />
            <RhfInlineEntity024Demo />
          </>
        ),
      },
      {
        slug: "choices",
        title: "Choices",
        short: "Choices",
        blurb: "On or off, one of a few, a value on a scale — and picking a colour, an icon or a card.",
        icon: ToggleRight,
        components: ["Checkbox", "Switch", "Slider", "SwatchPicker", "IconPicker", "ChoiceCard", "ActionCard", "TileRadioGroup", "CheckboxGroup"],
        Body: () => (
          <>
            <Choices />
            <SelectionDemo />
            <ActionCardDemo />
            <TileRadioGroup022Demo />
            <Choices022Demo />
            <CheckboxGroup022Demo />
            <TileLock023Demo />
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
        components: ["NumberInput", "NumberField", "AmountInput", "CurrencySelect", "NumberPadSheet", "SignChip"],
        Body: () => (
          <>
            <Numbers />
            <NumberStepsDemo />
            <Numbers016Demo />
            <Numbers022Demo />
            <AmountClass023Demo />
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
        components: ["MiniCalendar", "DatePicker", "DateRangePicker", "calendarMonthPresets", "UiKitProvider", "useKitDateFormatter"],
        Body: () => (
          <>
            <Dates />
            <WeekStartDemo />
            <OutsideDaysDemo />
            <Dates022Demo />
            <DateRange023Demo />
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
            <MonthStepperDemo />
            <TimeInputDemo />
            <Month022Demo />
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
        Body: () => (
          <>
            <FileInputs />
            <Files016Demo />
            <FileLock022Demo />
          </>
        ),
      },
      {
        slug: "media",
        title: "Images & media",
        short: "Media",
        blurb:
          "Showing what was uploaded: a grid of thumbnails with actions and captions, the full-screen viewer with keys, swipe and zoom, and images that need a signed-in fetch.",
        icon: Images,
        components: ["ImageGrid", "Lightbox", "AuthedImage", "useAuthedSrc"],
        Body: () => (
          <>
            <MediaDemo />
            <Media016Demo />
          </>
        ),
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
            <ComboboxClipsDemo />
            <PickerHints022Demo />
            <AutocompleteHint024Demo />
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
        components: ["InlineEntityCombobox", "EntityCombobox", "MultiEntityCombobox", "CountrySelect"],
        Body: () => (
          <>
            <EntityPickers />
            <Country022Demo />
            <CountryClear023Demo />
            <ComboboxFamilyLock023Demo />
            <InlineCreateRow023Demo />
          </>
        ),
      },
      {
        slug: "dropdown-parts",
        title: "Dropdown parts",
        short: "Parts",
        blurb:
          "Multi-select, the grouped picker and the phone sheet — and the hooks and panel every dropdown in the kit is built from.",
        icon: Puzzle,
        components: ["MultiSelect", "GroupedPicker", "PickerSheet", "useDropdown", "useDropdownSearch", "DropdownPanel"],
        Body: () => (
          <>
            <DropdownParts />
            <PickerSheetClipsDemo />
          </>
        ),
      },
      {
        slug: "measured-grid",
        title: "Table entry",
        short: "Table entry",
        blurb:
          "Typing a table of measurements: a keyboard grid of cells, a block pasted from a spreadsheet, and the same table as text — thousands of rows, only the visible ones mounted.",
        icon: Grid3x3,
        components: ["MeasuredGrid", "useMeasuredRows", "useWindowedRows", "parseTable", "parseRows", "InlineEditField", "ColumnMapper", "ColumnRoleTable", "parseTextTable"],
        Body: () => (
          <>
            <MeasuredGridDemo />
            <TableTextDemo />
            <InlineEdit022Demo />
            <ColumnMapper023Demo />
            <ColumnMapper024Demo />
            <ColumnRoleRequired025Demo />
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
        components: ["SignaturePad", "SignatureView", "PasswordStrengthMeter", "DangerConfirm", "TypedConfirmField", "CurrentPasswordInput"],
        Body: () => (
          <>
            <SignaturePasswordDemo />
            <SignatureViewDemo />
            <DangerConfirmDemo />
            <Guards022Demo />
            <DangerConfirm023Demo />
            <DangerConfirm024Demo />
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
            <IconButtonDisabledReasonDemo />
            <Buttons012 />
            <Surfaces016Demo />
            <Surfaces017Demo />
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
            <Display013Demo />
            <Chips016Demo />
            <ChipSnapEdges018Demo />
            <ToggleGroup022Demo />
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
        components: ["ProgressBar", "Skeleton", "EmptyState", "AlertBanner", "alertFrameClass", "toneFrameClass", "toast", "Toaster", "LoadingState", "ErrorBoundary", "ServerWakeNotice"],
        Body: () => (
          <>
            <FeedbackProgress />
            <ProgressSegmentsDemo />
            <ProgressLegendTone018Demo />
            <FeedbackMore />
            <AlertBannerBlockDemo />
            <EmptyStateSmallDemo />
            <ToastsDemo />
            <ToastMiddleClick018Demo />
            <ServerWake018Demo />
            <StatesDemo />
            <LoadingState016Demo />
            <ErrorBoundary013Demo />
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
            <TableHeaderValignDemo />
            <TableVariantsDemo />
            <TableStackDemo />
            <TableRefs016Demo />
            <DescriptionPlaceholderDemo />
            <TableEdgeFadeDemo />
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
            <List016Demo />
            <MenuItemBadgeDemo />
            <BulkActionBarPanelDemo />
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
        components: ["DataTable", "BooleanMark", "booleanColumn", "CopyButton"],
        Body: () => (
          <>
            <DataTableSection />
            <DataTableActionsDemo />
            <DataTableTotalsDemo />
            <DataTableMobileSort022Demo />
            <DataTableEdgeFadeDemo />
          </>
        ),
      },
      {
        slug: "data-table-server",
        title: "Data table: server, URL & phone",
        short: "Server & phone",
        blurb:
          "The table when it does not own everything: the view kept in the address, the rows paged by a server, and the phone layout of cards, groups and swipe actions.",
        icon: Server,
        components: ["DataTable", "useTableUrlState", "filterHref"],
        Body: () => (
          <>
            <DataTableServerSection />
            <DataTableUrlFiltersDemo />
          </>
        ),
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
    shortLabel: "Charts",
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
        slug: "pie-chart",
        title: "Pie chart",
        short: "Pie",
        blurb:
          "A share of a whole as a donut or a pie: legend modes, slices that can be clicked and reached by keyboard, hidden amounts, the empty chart, right-to-left — and the legend on its own.",
        icon: ChartPie,
        components: ["PieChart", "StaticLegend"],
        Body: PieChartDemo,
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
            <MinBarLengthDemo />
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
        components: ["CalendarHeatmap", "heatmapLevel", "heatmapWindowEnd"],
        Body: () => (
          <>
            <CalendarHeatmapDemo />
            <HeatmapRampDemo />
          </>
        ),
      },
    ],
  },
  {
    slug: "overlays",
    label: "Overlays",
    // Nine groups share a 390px bar: a cell is 43px, and "Overlays" at 11px is 46.
    shortLabel: "Popups",
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
        components: ["Modal", "FullBleedDialog", "useBackdropClose", "OVERLAY_EXIT_MS", "useCloseTransition", "useDialogParam"],
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
        components: ["ConfirmProvider", "useConfirm", "FloatingPanel", "FloatingActionButton", "ReauthDialog"],
        Body: () => (
          <>
            <ConfirmFloating />
            <TypedConfirm018Demo />
            <Reauth018Demo />
          </>
        ),
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
        components: ["Popover", "HoverMenu", "Tooltip", "placeTooltip", "CLIPS_ATTRIBUTE"],
        Body: () => (
          <>
            <PopoversMenusTooltips />
            <TooltipAutoPortal />
            <TooltipLazyDemo />
            <TooltipClampDemo />
            <TooltipTapDemo />
            <ClipsMarkerDemo />
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
        Body: () => (
          <>
            <GuidedTour />
            <TourStaleSpotlight022Demo />
          </>
        ),
      },
      {
        slug: "command-palette",
        title: "Command palette",
        short: "Commands",
        blurb:
          "The ⌘K palette: a searchable list of places and actions, opened by the shortcut anywhere on the page, with results that can arrive late.",
        icon: Command,
        components: ["CommandPalette", "useCommandKey"],
        Body: () => (
          <>
            <CommandPaletteDemo />
            <Search017Demo />
          </>
        ),
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
        components: ["AppShell", "TopBar", "TopBarBrand", "PageContents", "ThemeToggle", "LanguageMenu", "TopBarActionMenu", "UserAvatar"],
        Body: () => (
          <>
            <ShellSection />
            <AccountMenuDemo />
            <ShellBrandDemo />
            <AccountHeaderLinkDemo />
            <TopBarMenuHeadingsDemo />
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
            <SectionLabelMdDemo />
            <Layout013Demo />
            <PageHeader014Demo />
            <StatusDotHuesDemo />
          </>
        ),
      },
      {
        slug: "links",
        title: "Links",
        short: "Links",
        blurb:
          "Every kit link routed by the app's own router, set once on the provider: the text link and its tones, a button or an action card that is a link, and links that leave the app.",
        icon: Link2,
        components: ["TextLink", "UiKitProvider", "useKitLink", "Button", "ActionCard"],
        Body: () => (
          <>
            <LinksDemo />
            <Links013Demo />
          </>
        ),
      },
      {
        slug: "settings",
        title: "Settings fields",
        short: "Settings",
        blurb: "The account-settings rows: theme, language, profile, password and two-factor.",
        icon: SettingsIcon,
        components: ["ThemeSetting", "LanguageSetting", "ProfileSetting", "TwoFactorSetting", "LanguageSelect"],
        Body: () => (
          <>
            <Settings />
            <PasswordStrength022Demo />
            <LanguageSelect022Demo />
          </>
        ),
      },
      {
        slug: "auth-account",
        title: "Sign-in & account security",
        short: "Auth",
        blurb:
          "The pages before the app — a narrow sign-in and a wide legal page — and the account's security: two-factor set up from a QR code, and passkeys added, renamed and removed.",
        icon: KeyRound,
        components: ["AuthLayout", "TwoFactorSetting", "PasskeysSetting", "DEFAULT_ACCOUNT_SETTINGS_LABELS", "ShareCard", "ShareDialog", "RoleChip", "AccountStateChip", "dateColumn", "LegalLayout", "LegalSection", "LegalLinks", "LegalPage", "LegalKitSection", "LegalFooter", "LegalAcceptCheckbox", "LEGAL_SKELETON", "useNoIndex", "OneTimeCodeInput"],
        Body: () => (
          <>
            <AuthAccountDemo />
            <Passkeys016Demo />
            <Passkeys018Demo />
            <AccountRoster018Demo />
            <Share018Demo />
            <Legal019Demo />
            <Legal028Demo />
            <LegalAccept028Demo />
            <OneTimeCode022Demo />
            <OneTimeCodeUnlabelled022Demo />
          </>
        ),
      },
      {
        slug: "wizard",
        title: "Wizard",
        short: "Wizard",
        blurb: "The multi-step engine, its chrome and its review step.",
        icon: Wand2,
        components: ["useWizard", "StepperNav", "WizardSummary", "WizardStep", "useWizardStepValidate", "useWizardNextGate"],
        Body: () => (
          <>
            <Wizard />
            <WizardStepHooksDemo />
            <StepperNavFinishLock023Demo />
          </>
        ),
      },
      {
        slug: "feedback-compose",
        title: "Feedback — compose",
        short: "Compose",
        blurb: "The report form and its attachment field.",
        icon: MessageSquarePlus,
        components: ["FeedbackDialog", "FeedbackAttachmentField", "FeedbackMenu", "useFeedbackSubmit", "FeedbackContextBox", "captureAppScreenshot", "createCrashReporter"],
        Body: () => (
          <>
            <FeedbackCompose />
            <FeedbackAttachment016Demo />
            <FeedbackAttachmentRefs022Demo />
            <FeedbackAttachment023Demo />
            <FeedbackDialogButtons025Demo />
            <FeedbackSubmit027Demo />
          </>
        ),
      },
      {
        slug: "feedback-inbox",
        title: "Feedback — inbox",
        short: "Inbox",
        blurb: "The shared status vocabulary, the transition policy, and the parts an inbox is built from.",
        icon: Inbox,
        components: ["FeedbackInbox", "FEEDBACK_STATUSES", "FeedbackThread", "FeedbackComposer", "ChatComposer", "useFeedbackColumns", "FeedbackMobileCard", "FeedbackRowDetail", "FeedbackReworkSection", "useFeedbackStatusUndo", "feedbackSwipePlan"],
        Body: () => (
          <>
            <FeedbackInbox />
            <FeedbackThreadDemo />
            <ComposerCannedRepliesDemo />
            <Feedback014Demo />
            <ChatComposer022Demo />
            <ChatComposerCount023Demo />
            <ChatComposerSlot024Demo />
            <FeedbackNoteButtons025Demo />
            <FeedbackTable027Demo />
            <FeedbackDetail027Demo />
            <FeedbackRecord027Demo />
          </>
        ),
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
        components: ["useMediaQuery", "useAnchoredPanel", "useOverlayHistory", "cn", "useHotkey"],
        Body: () => (
          <>
            <HooksLib />
            <HotkeyDemo />
          </>
        ),
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
      {
        slug: "formatting",
        title: "Formatting & signed values",
        short: "Formatting",
        blurb:
          "Numbers, money, percentages, dates and relative times in the reader's locale — as input → output in several languages — and the signed amount and change that colour themselves.",
        icon: Percent,
        components: ["formatNumber", "formatMoney", "formatPercent", "formatDate", "formatRelativeTime", "useKitFormat", "SignedAmount", "Delta", "Tone", "toneTextClass"],
        Body: () => (
          <>
            <FormattingDemo />
            <Signals016Demo />
            <Signals017Demo />
          </>
        ),
      },
      {
        slug: "url-state",
        title: "State in the URL",
        short: "URL state",
        blurb:
          "A value, a tab and an open dialog kept in the address, so a reload keeps them and Back undoes them: the search-param hooks and the dialog that opens from a link.",
        icon: Bookmark,
        components: ["useSearchParamState", "useTabParam", "useDialogParam", "Modal", "useSearchParamsState"],
        Body: () => (
          <>
            <UrlStateDemo />
            <SearchParams025Demo />
          </>
        ),
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
