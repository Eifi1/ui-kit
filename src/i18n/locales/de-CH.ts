import type { UiKitLabels } from "../kit-labels";
import { germanLabels } from "../german";
import { swiss } from "../swiss";

/**
 * The kit's words in German — Swiss Standard German, formal ("Sie"), the kit's ONE German
 * catalogue: `<UiKitProvider labels={UI_KIT_LABELS_DE_CH}>`. Swiss spelling — "ss" for
 * every "ß" (Schliessen, Grösse), which is the one systematic difference in UI text — and
 * `de-CH` number formatting (1’234.5).
 *
 * Derived from the internal German source (`../german`) rather than written out, so a
 * key added there is Swiss the moment it lands. Function labels are wrapped: their
 * RESULT is respelled, so an argument the app passes in (a file name, a phrase to type)
 * is respelled too — which is what a Swiss app writing "ss" everywhere wants.
 *
 * {@link uiKitLabelsDeCh} takes another number locale (e.g. `"de-DE"` for 1.234,5, or
 * `"de-AT"`) without touching the words — the spelling stays Swiss, as the factories of
 * the other catalogues keep their words.
 */
export function uiKitLabelsDeCh(numberLocale = "de-CH"): UiKitLabels {
  return swiss(germanLabels(numberLocale));
}

export const UI_KIT_LABELS_DE_CH: UiKitLabels = uiKitLabelsDeCh();
