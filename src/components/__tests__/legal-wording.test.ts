// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { kitLabelStrings } from "../../i18n/review";
import type { UiKitLabels } from "../../i18n/kit-labels";
import { uiKitLabelsDeCh } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { uiKitLabelsEs } from "../../i18n/locales/es";
import { uiKitLabelsFr } from "../../i18n/locales/fr";
import { uiKitLabelsHu } from "../../i18n/locales/hu";
import { uiKitLabelsIt } from "../../i18n/locales/it";
import { uiKitLabelsZh } from "../../i18n/locales/zh";

/**
 * The "Legal wording:" rule (Marcel, 2026-10-29; CONTRIBUTING, docs/legal-harmonization.md),
 * held by a test instead of by memory (refactor audit 2026-10-30, DOC-6).
 *
 * A release that changes the kit's legal text says so in its adopt note, and each app moves
 * that page's `updated` date. keksdose stores the terms' `updated` date as the version a
 * user accepted (legal decision 10): a change shipped without the line leaves that record
 * pointing at text the user never saw, in one app or three.
 *
 * So the words are pinned, per catalogue and per page: a hash of every `legal.*` row of
 * `kitLabelStrings` (the operator as its placeholder sample, so the hash is the kit's text,
 * not an app's operator). A change fails here until it is acknowledged, and the failure
 * names the pages to put in the line.
 */

const CATALOGUES: Record<string, () => UiKitLabels> = {
  en: () => uiKitLabelsEn(),
  "de-CH": () => uiKitLabelsDeCh(),
  fr: () => uiKitLabelsFr(),
  it: () => uiKitLabelsIt(),
  es: () => uiKitLabelsEs(),
  hu: () => uiKitLabelsHu(),
  zh: () => uiKitLabelsZh(),
};

/** `legal.sections.<page>.…` belongs to its page; every other `legal.*` row (titles, the
 *  "updated" line, the shared words) to `legal`. */
const pageOf = (key: string) => (key.startsWith("legal.sections.") ? key.split(".")[2] : "legal");

/** Per page, the first 12 hex digits of a SHA-256 over its rows, sorted by key. */
function legalWording(labels: UiKitLabels): Record<string, string> {
  const pages: Record<string, string[]> = {};
  for (const [key, text] of Object.entries(kitLabelStrings(labels)).sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (key.startsWith("legal.")) (pages[pageOf(key)] ??= []).push(`${key}\u0000${text}`);
  }
  return Object.fromEntries(
    Object.entries(pages)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([page, rows]) => [page, createHash("sha256").update(rows.join("\n")).digest("hex").slice(0, 12)]),
  );
}

/**
 * The legal wording as of 0.66. Update an entry ONLY in the change that adds the
 * `**Legal wording:**` line for it to the adopt doc.
 *
 * 0.58 (keksdose's legal audit, legal decision 10): `terms` — the refund sentence moved
 * to the `changes` clause's commercial variant; `privacy` — the browser section's tail
 * lost "everything else stays on your device"; `legal` — `acceptWithAge`, the sign-up
 * box of an operator with a `minAge`, and `changeNotice`, the in-app notice of a change
 * (on no legal page).
 *
 * 0.59 (keksdose's scan for absolute claims, decision 10): `privacy` — the browser
 * section's lead says the app sets no cookies, where it said "No cookies."; and the
 * section's commercial tail, the checkout's window on Paddle's domain.
 *
 * 0.61 (Marcel 2026-11-12): `privacy` — the browser section's two standard entries, the page
 * cache's line and the shared-computer choice's (`standardEntries`), which an app places in
 * its own list. Announced in docs/adopt-0.61.md for the apps that add them.
 *
 * 0.62 (Marcel 2026-11-13): `privacy` — both standard entries lose their closing full stop
 * (no app's list has one), and the flag line says the flag is kept with the tab and the
 * sign-in itself is not stored (a reopened tab brings its storage back). Announced in the
 * 0.62 adopt note for the apps that use `standardEntries`.
 *
 * 0.63 (Marcel 2026-11-13): `impressum` — the optional `credits` section, the kit's default
 * chart palette credited to anyplot.ai ("Imprint"). Announced in docs/adopt-0.63.md for the
 * apps that add the section.
 *
 * 0.63 (docs/auth-harmonization.md §12.9): `privacy` — a third standard entry, the sign-in
 * `@eifi1/ui-kit/accounts` keeps (`standardEntries.session`). Announced in docs/adopt-0.63.md
 * for the apps that list it.
 *
 * 0.66 (refactor audit 2026-11-22, DOC-5): `privacy`, French only — the two standard entries
 * (`recentData`, `session`) take a no-break space before ";" and ":", as French writes them
 * everywhere else. No word changed. Announced in the 0.66 adopt note.
 */
const LEGAL_WORDING: Record<string, Record<string, string>> = {
  en: { impressum: "ad15487c7ecd", legal: "19962ca87a89", privacy: "d4bc4b0b4ad5", terms: "41d67860190b" },
  "de-CH": { impressum: "e02af20d24c7", legal: "aaea3302cba4", privacy: "7e5007f971ba", terms: "ce9971b444c5" },
  fr: { impressum: "4da463defd7a", legal: "4cbd81b82932", privacy: "cdf9ad56b301", terms: "257115a45dde" },
  it: { impressum: "5c9a396da7ba", legal: "ec2d48f0fa4a", privacy: "a08212e1d25b", terms: "98995c10e7a1" },
  es: { impressum: "51110d63b161", legal: "6afe0fa1f3ee", privacy: "663ff8d2709f", terms: "604a6af9da3c" },
  hu: { impressum: "677076521418", legal: "75d7bbd6869e", privacy: "7df8afc7b774", terms: "12871aadd0ab" },
  zh: { impressum: "6d6ae078366c", legal: "d923f39bab7b", privacy: "3a645cfbe14e", terms: "e4cacb32ea2d" },
};

describe("the legal wording (DOC-6)", () => {
  it("is the wording the adopt notes announced", () => {
    const now = Object.fromEntries(Object.entries(CATALOGUES).map(([code, make]) => [code, legalWording(make())]));
    const changed = Object.entries(now).flatMap(([code, pages]) =>
      Object.entries({ ...LEGAL_WORDING[code], ...pages })
        .filter(([page]) => LEGAL_WORDING[code]?.[page] !== pages[page])
        .map(([page]) => `${code}: ${page}`),
    );
    expect(
      changed,
      `legal wording changed (${changed.join(", ")}): add a "**Legal wording:** <pages>" line to ` +
        "docs/adopt-<minor>.md's section for this version, then update LEGAL_WORDING in this file to:\n" +
        JSON.stringify(now, null, 2),
    ).toEqual([]);
  });

  it("reads every catalogue's legal rows, the operator's sections included", () => {
    for (const make of Object.values(CATALOGUES)) {
      const rows = Object.keys(kitLabelStrings(make())).filter((key) => key.startsWith("legal."));
      expect(rows.length).toBeGreaterThan(40);
      expect(rows.some((key) => key.endsWith("(operator)"))).toBe(true);
    }
  });
});
