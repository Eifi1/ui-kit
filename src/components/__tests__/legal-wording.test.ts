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
 * The legal wording as of 0.58. Update an entry ONLY in the change that adds the
 * `**Legal wording:**` line for it to the adopt doc.
 *
 * 0.58 (keksdose's legal audit, legal decision 10): `terms` — the refund sentence moved
 * to the `changes` clause's commercial variant; `privacy` — the browser section's tail
 * lost "everything else stays on your device"; `legal` — `acceptWithAge`, the sign-up
 * box of an operator with a `minAge`, and `changeNotice`, the in-app notice of a change
 * (on no legal page).
 */
const LEGAL_WORDING: Record<string, Record<string, string>> = {
  en: { impressum: "425fe7961e6a", legal: "19962ca87a89", privacy: "84c9a6bd5dc2", terms: "41d67860190b" },
  "de-CH": { impressum: "6e8e555a0f60", legal: "aaea3302cba4", privacy: "a397f7b3ecac", terms: "ce9971b444c5" },
  fr: { impressum: "3f703ecd6763", legal: "4cbd81b82932", privacy: "f23b55700378", terms: "257115a45dde" },
  it: { impressum: "9e60a55f89ef", legal: "ec2d48f0fa4a", privacy: "787f9b6e3142", terms: "98995c10e7a1" },
  es: { impressum: "ff37b004be44", legal: "6afe0fa1f3ee", privacy: "8c81229e06f7", terms: "604a6af9da3c" },
  hu: { impressum: "bf4d3a8d0b77", legal: "75d7bbd6869e", privacy: "9eeaf61602e4", terms: "12871aadd0ab" },
  zh: { impressum: "c98c0d1ac118", legal: "d923f39bab7b", privacy: "c4cc8ea5ffed", terms: "e4cacb32ea2d" },
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
