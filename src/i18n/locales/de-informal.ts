import type { UiKitLabels } from "../kit-labels";
import { uiKitLabelsDe } from "./de";

/**
 * The kit's words in informal German ("du"), for apps that address their users that way
 * everywhere else: `<UiKitProvider labels={UI_KIT_LABELS_DE_INFORMAL}>`.
 *
 * Built on the formal catalogue ({@link uiKitLabelsDe}) rather than beside it: most of
 * the kit's German never addresses anyone — buttons are infinitives ("Speichern"),
 * status lines are impersonal ("Wird geladen…"), hints use the infinitive
 * ("Mindestens 3 Zeichen eingeben", "Bitte erneut versuchen") — so it is the same text
 * in both registers and stays in sync with `de.ts` by construction. Only the sentences
 * that speak TO the user are rewritten here, by hand: du/Sie is grammar (verb forms,
 * imperatives, possessives), not a substitution a regex could do.
 *
 * Every key of `de.ts` was reviewed. The overridden ones — the complete list of
 * sentences that say "Sie" / "Ihr" / a Sie-imperative in the formal catalogue:
 *  - `miniCalendar.startSelected`, `miniCalendar.rangeSelected`
 *  - `dangerConfirm.phrase`
 *  - `wizard.confirmCancel`, `wizard.missingRequired`
 *  - `tour.awaitClickHint`
 *  - `signaturePad.instructions`, `signaturePad.typedFallbackHint`
 *
 * A key added to `de.ts` later is inherited as is; if it addresses the user, add its
 * du form here (the "no formal address" test in locales.test.ts catches a "Sie").
 * Conventions as in `de.ts`: „…“ quotes, `Intl` digits (via the `numberLocale`
 * argument, e.g. `"de-AT"`), number agreement.
 */
export function uiKitLabelsDeInformal(numberLocale = "de-DE"): UiKitLabels {
  const de = uiKitLabelsDe(numberLocale);

  return {
    ...de,
    miniCalendar: {
      ...de.miniCalendar,
      startSelected: (date) => `${date} als Startdatum gewählt. Wähle jetzt ein Enddatum.`,
      rangeSelected: (from, to) =>
        `Zeitraum ${from} bis ${to} gewählt. Wähle ein Startdatum, um neu zu beginnen.`,
    },
    dangerConfirm: {
      ...de.dangerConfirm,
      phrase: (phrase) => `Gib zur Bestätigung „${phrase}“ ein`,
    },
    wizard: {
      ...de.wizard,
      confirmCancel: "Deine Eingaben gehen verloren.",
      missingRequired: "Bitte fülle alle Pflichtfelder aus.",
    },
    tour: {
      ...de.tour,
      awaitClickHint: "Klick auf das hervorgehobene Element, um fortzufahren",
    },
    signaturePad: {
      ...de.signaturePad,
      instructions: "Unterschreibe im Feld mit der Maus, dem Finger oder einem Stift.",
      typedFallbackHint: "Wenn du nicht zeichnen kannst, gib stattdessen deinen Namen ein.",
    },
  };
}

export const UI_KIT_LABELS_DE_INFORMAL: UiKitLabels = uiKitLabelsDeInformal();
