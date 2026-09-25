import type { UiKitLabels } from "../kit-labels";
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

function respell(text: string): string {
  return text.replace(/ß/g, "ss").replace(/ẞ/g, "SS");
}

function swiss<T>(value: T): T {
  if (typeof value === "string") return respell(value) as T;
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => swiss(fn(...args))) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swiss(v)])) as T;
  }
  return value;
}
