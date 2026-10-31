import { describe, expect, it } from "vitest";
import { uiKitLabelsFr } from "../locales/fr";

/**
 * French takes the singular for zero: CLDR's "one" covers 0 and 1, which is what fr.ts's
 * `plural()` (`count < 2`) says and what its other count labels follow. Nine of them
 * tested `count === 1` instead and printed "0 commentaires", "0 non lues", "0 étapes"
 * (refactor audit 2026-10-30, DOC-11).
 */
const fr = uiKitLabelsFr();

const COUNTS: [string, (count: number) => string, string, string][] = [
  [
    "feedbackAttachment.attachmentLimit",
    // Optional in the type, as every `multiple`-mode word is; the catalogue has it.
    fr.feedbackAttachment.attachmentLimit!,
    "0 pièce jointe au maximum — retirez-la pour en ajouter une autre.",
    "5 pièces jointes au maximum — retirez-en une pour en ajouter une autre.",
  ],
  ["feedbackPublic.total", fr.feedbackPublic.total, "0 retour", "5 retours"],
  ["feedbackPublic.comments", fr.feedbackPublic.comments, "0 commentaire", "5 commentaires"],
  ["feedbackPublic.votes", fr.feedbackPublic.votes, "0 vote", "5 votes"],
  ["feedbackPage.reworkChip", fr.feedbackPage.reworkChip, "Reprise", "Reprise ×5"],
  [
    "calendarHeatmap.truncated",
    fr.calendarHeatmap.truncated,
    "Affichage des jours les plus récents ; 0 jour antérieur n’est pas affiché.",
    "Affichage des jours les plus récents ; 5 jours antérieurs ne sont pas affichés.",
  ],
  ["bulkActionBar.selected", fr.bulkActionBar.selected, "0 sélectionné", "5 sélectionnés"],
  ["tourCatalogue.steps", fr.tourCatalogue.steps, "0 étape", "5 étapes"],
  ["notifications.bellUnread", fr.notifications.bellUnread, "0 non lue", "5 non lues"],
];

describe("French count labels take the singular for 0", () => {
  it.each(COUNTS)("%s", (_key, label, zero, five) => {
    expect(label(0)).toBe(zero);
    expect(label(5)).toBe(five);
  });
});
