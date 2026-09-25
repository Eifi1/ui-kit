import type { UiKitLabels } from "../kit-labels";
import { swiss } from "../swiss";
import { uiKitLabelsDeInformal } from "./de-informal";

/**
 * Swiss Standard German, informal ("du"): the informal German labels with Swiss
 * spelling ("ss" for every "ß") and `de-CH` number formatting (1’234.5) — derived the
 * same way `de-CH` is from `de`, so both stay in sync with their source.
 */
export const UI_KIT_LABELS_DE_CH_INFORMAL: UiKitLabels = swiss(uiKitLabelsDeInformal("de-CH"));
