import { DEFAULT_DATA_TABLE_LABELS } from "../components/data-table-labels";
import { DEFAULT_MINI_CALENDAR_LABELS } from "../components/mini-calendar";
import { DEFAULT_MONTH_PICKER_LABELS } from "../components/month-picker";
import { DEFAULT_PAGE_CONTENTS_LABELS } from "../components/page-contents";
import { DEFAULT_POPOVER_LABELS } from "../components/popover";
import { DEFAULT_CHIP_INPUT_LABELS } from "../components/chip";
import { DEFAULT_FIELD_SYNC_LABELS } from "../components/field-sync";
import { DEFAULT_PASSWORD_REVEAL_LABELS } from "../components/ui";
import { DEFAULT_WIZARD_LABELS } from "../wizard/types";
import { DEFAULT_TOUR_LABELS } from "../tour/tour";
import { DEFAULT_COMMAND_PALETTE_LABELS } from "../search/command-palette";
import { DEFAULT_SERIES_CHART_LABELS } from "../components/series-chart-labels";
import { DEFAULT_SPARKLINE_LABELS } from "../components/sparkline";
import { DEFAULT_STAT_TILE_LABELS } from "../components/stat-tile";
import { DEFAULT_SIGNATURE_PAD_LABELS } from "../components/signature-pad";
import { DEFAULT_PASSWORD_STRENGTH_LABELS } from "../components/password-strength";
import {
  DEFAULT_APP_SHELL_LABELS,
  DEFAULT_CALCULATOR_LABELS,
  DEFAULT_COMBOBOX_LABELS,
  DEFAULT_COMMON_LABELS,
  DEFAULT_CURRENCY_LABELS,
  DEFAULT_DATE_PICKER_LABELS,
  DEFAULT_FILE_LABELS,
  DEFAULT_MULTI_SELECT_LABELS,
  DEFAULT_PICKER_SHEET_LABELS,
  DEFAULT_SWIPEABLE_ROW_LABELS,
  DEFAULT_TOP_BAR_LABELS,
} from "./kit-labels";
import type { UiKitLabels } from "./kit-labels";

/**
 * The whole English tree in one object: what a translation is written against, and
 * the `reference` for {@link missingKitLabels}.
 *
 * A separate module from the provider on purpose. Components import the provider's
 * hooks; this file imports the components' defaults. Kept together they would be an
 * import cycle through every component in the kit.
 */
export const DEFAULT_UI_KIT_LABELS: UiKitLabels = {
  common: DEFAULT_COMMON_LABELS,
  dataTable: DEFAULT_DATA_TABLE_LABELS,
  miniCalendar: DEFAULT_MINI_CALENDAR_LABELS,
  datePicker: DEFAULT_DATE_PICKER_LABELS,
  monthPicker: DEFAULT_MONTH_PICKER_LABELS,
  popover: DEFAULT_POPOVER_LABELS,
  combobox: DEFAULT_COMBOBOX_LABELS,
  multiSelect: DEFAULT_MULTI_SELECT_LABELS,
  calculator: DEFAULT_CALCULATOR_LABELS,
  currency: DEFAULT_CURRENCY_LABELS,
  chipInput: DEFAULT_CHIP_INPUT_LABELS,
  fieldSync: DEFAULT_FIELD_SYNC_LABELS,
  passwordReveal: DEFAULT_PASSWORD_REVEAL_LABELS,
  appShell: DEFAULT_APP_SHELL_LABELS,
  pageContents: DEFAULT_PAGE_CONTENTS_LABELS,
  topBar: DEFAULT_TOP_BAR_LABELS,
  pickerSheet: DEFAULT_PICKER_SHEET_LABELS,
  swipeableRow: DEFAULT_SWIPEABLE_ROW_LABELS,
  file: DEFAULT_FILE_LABELS,
  wizard: DEFAULT_WIZARD_LABELS,
  tour: DEFAULT_TOUR_LABELS,
  commandPalette: DEFAULT_COMMAND_PALETTE_LABELS,
  seriesChart: DEFAULT_SERIES_CHART_LABELS,
  sparkline: DEFAULT_SPARKLINE_LABELS,
  statTile: DEFAULT_STAT_TILE_LABELS,
  signaturePad: DEFAULT_SIGNATURE_PAD_LABELS,
  passwordStrength: DEFAULT_PASSWORD_STRENGTH_LABELS,
};
