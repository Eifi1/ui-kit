import type { UiKitLabels } from "../kit-labels";
import { swiss } from "../swiss";
import { uiKitLabelsDe } from "./de";

/**
 * Swiss Standard German: the German labels with Swiss spelling — "ss" for every "ß"
 * (Schliessen, Grösse), which is the one systematic difference in UI text — and
 * `de-CH` number formatting (1’234.5).
 *
 * Derived rather than duplicated, so a key added to the German labels is Swiss the
 * moment it lands. Function labels are wrapped: their RESULT is respelled, so an
 * argument the app passes in (a file name, a phrase to type) is respelled too — which
 * is what a Swiss app writing "ss" everywhere wants.
 */
export const UI_KIT_LABELS_DE_CH: UiKitLabels = swiss(uiKitLabelsDe("de-CH"));
