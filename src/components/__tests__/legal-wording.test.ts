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
 * The legal wording as of 0.51.7. Update an entry ONLY in the change that adds the
 * `**Legal wording:**` line for it to the adopt doc.
 */
const LEGAL_WORDING: Record<string, Record<string, string>> = {
  en: { impressum: "425fe7961e6a", legal: "4a756d653db4", privacy: "295cb92abc11", terms: "f173b6a8b8b2" },
  "de-CH": { impressum: "6e8e555a0f60", legal: "2e098df47183", privacy: "72104c51331d", terms: "e4a7c7b032e4" },
  fr: { impressum: "3f703ecd6763", legal: "cbffca19f763", privacy: "5030aaf51462", terms: "c80ee2af9159" },
  it: { impressum: "9e60a55f89ef", legal: "bb36cce4e722", privacy: "413fca6deac5", terms: "3205065d1192" },
  es: { impressum: "ff37b004be44", legal: "b7f4c56a85a4", privacy: "1190aa922e01", terms: "a8abedb07988" },
  hu: { impressum: "bf4d3a8d0b77", legal: "49cf3c68c030", privacy: "e2ae5cf77632", terms: "e9f678f80047" },
  zh: { impressum: "c98c0d1ac118", legal: "f892d035ee15", privacy: "04d2267708fe", terms: "af4ba9ed834c" },
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
