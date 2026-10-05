import { describe, expect, it } from "vitest";
import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { KIT_LABEL_SAMPLES, kitLabelStrings } from "../review";
import { UI_KIT_LABELS_DE_CH } from "../locales/de-CH";
import { UI_KIT_LABELS_ES } from "../locales/es";
import { UI_KIT_LABELS_FR } from "../locales/fr";
import { UI_KIT_LABELS_HU } from "../locales/hu";
import { UI_KIT_LABELS_IT } from "../locales/it";
import { UI_KIT_LABELS_ZH } from "../locales/zh";
import type { UiKitLabels } from "../kit-labels";

/**
 * `kitLabelStrings`: the kit's words as rows for an app's translation review (keksdose's
 * /translations). What has to hold: every function label has samples, every catalogue
 * yields the reference's keys exactly, and no translation drops an argument.
 */

const LOCALES: Record<string, UiKitLabels> = {
  "de-CH": UI_KIT_LABELS_DE_CH,
  es: UI_KIT_LABELS_ES,
  fr: UI_KIT_LABELS_FR,
  hu: UI_KIT_LABELS_HU,
  it: UI_KIT_LABELS_IT,
  zh: UI_KIT_LABELS_ZH,
};

function functionPaths(tree: unknown, path = ""): string[] {
  if (typeof tree === "function") return [path];
  if (tree && typeof tree === "object") {
    return Object.entries(tree).flatMap(([k, v]) => functionPaths(v, path ? `${path}.${k}` : k));
  }
  return [];
}

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

const reference = kitLabelStrings(DEFAULT_UI_KIT_LABELS);

describe("KIT_LABEL_SAMPLES", () => {
  it("has samples for every function label, and none for a label that is gone", () => {
    const fns = functionPaths(DEFAULT_UI_KIT_LABELS).sort();
    expect(Object.keys(KIT_LABEL_SAMPLES).sort()).toEqual(fns);
  });
});

describe("kitLabelStrings", () => {
  it("lists a string label under its dot path, an array entry under its index", () => {
    expect(reference["common.close"]).toBe("Close");
    expect(reference["accountSettings.passkeys.list"]).toBe(DEFAULT_UI_KIT_LABELS.accountSettings.passkeys.list);
    const indexed = Object.keys(reference).filter((k) => /\.\d+$/.test(k));
    for (const key of indexed) expect(typeof reference[key]).toBe("string");
  });

  it("calls a function label with its samples, the sample named in the key", () => {
    expect(reference["combobox.resultCount(1)"]).toBe("1 result");
    expect(reference["combobox.resultCount(3)"]).toBe("3 results");
    expect(reference["shareCard.removeConfirm(name)"]).toBe("Remove access for {{name}}?");
    expect(reference["filePicker.hint(\"\")"]).toBe("Any file type");
    expect(reference["serverWake.waking()"]).toContain("the app");
    expect(reference["serverWake.waking(appName)"]).toContain("{{appName}}");
    expect(reference).not.toHaveProperty("combobox.resultCount");
  });

  it("reviews what the app ships: an override replaces the kit's words", () => {
    const rows = kitLabelStrings({
      ...UI_KIT_LABELS_DE_CH,
      common: { ...UI_KIT_LABELS_DE_CH.common, close: "Zumachen" },
      combobox: { ...UI_KIT_LABELS_DE_CH.combobox, resultCount: (n) => `${n} Treffer` },
    });
    expect(rows["common.close"]).toBe("Zumachen");
    expect(rows["combobox.resultCount(3)"]).toBe("3 Treffer");
  });

  it("turns a label that throws into a ⚠ row instead of throwing", () => {
    const rows = kitLabelStrings({
      ...DEFAULT_UI_KIT_LABELS,
      tabs: {
        ...DEFAULT_UI_KIT_LABELS.tabs,
        remove: () => {
          throw new Error("broken override");
        },
      },
    });
    expect(rows["tabs.remove(tab)"]).toBe("⚠ broken override");
  });

  it("lists the legal labels (0.28), the operator's texts with one placeholder per field", () => {
    expect(reference["legal.titles.terms"]).toBe("Terms of Service");
    expect(reference["legal.accept"]).toBe("I accept the {terms} and the {privacy}");
    expect(reference["legal.sections.privacy.browser.lead"]).toBe(
      "No cookies. The app keeps the following in your browser's storage:",
    );
    expect(reference["legal.sections.impressum.operator.body(operator)"]).toBe(
      "{{name}}\n{{postalCode}} {{city}}\n{{country}}\n\nThe full postal address is supplied on request to anyone with a legitimate legal interest; write to the contact address below.",
    );
    expect(reference["legal.sections.terms.law.body(operator)"]).toContain("is {{city}} ({{region}}), {{country}}.");
    expect(reference).not.toHaveProperty("legal.sections.terms.law.body([object Object])");
  });

  it("reads the real sentence with the app's operator — same keys, the country in the rows' language", () => {
    const operator = {
      name: "Example Operator",
      postalCode: "0000",
      city: "Example Town",
      region: "EX",
      country: "CH",
      email: "legal@example.com",
    };
    const rows = kitLabelStrings(DEFAULT_UI_KIT_LABELS, { operator });
    expect(Object.keys(rows)).toEqual(Object.keys(reference));
    expect(rows["legal.sections.privacy.controller.body(operator)"]).toBe(
      "The party responsible for processing personal data in this service is:\nExample Operator\n0000 Example Town, Switzerland\nEmail: legal@example.com\n\nThe full postal address is supplied on request to data subjects and supervisory authorities.",
    );
    expect(rows["legal.sections.impressum.contact.body(operator)"]).toBe("Email: legal@example.com");
    expect(rows["legal.sections.privacy.contact.body(operator)"]).toBe(
      "For any privacy request, contact: legal@example.com",
    );
    // Everything that does not name the operator is unchanged.
    expect(rows["combobox.resultCount(3)"]).toBe(reference["combobox.resultCount(3)"]);
    const german = kitLabelStrings(DEFAULT_UI_KIT_LABELS, { operator, locale: "de-CH" });
    expect(german["legal.sections.terms.law.body(operator)"]).toContain("is Example Town (EX), Schweiz.");
  });

  it("gives the English reference no ⚠ rows and nothing unrendered", () => {
    for (const [key, text] of Object.entries(reference)) {
      expect(text, key).not.toMatch(/^⚠|NaN|undefined|\[object /);
    }
  });
});

describe.each(Object.entries(LOCALES))("kitLabelStrings — %s", (_code, labels) => {
  const rows = kitLabelStrings(labels);

  it("yields exactly the reference's keys, so the rows join one to one", () => {
    expect(Object.keys(rows).sort()).toEqual(Object.keys(reference).sort());
  });

  it("renders every row — no ⚠, NaN, undefined or [object …]", () => {
    for (const [key, text] of Object.entries(rows)) {
      expect(text, key).not.toMatch(/^⚠|NaN|undefined|\[object /);
    }
  });

  it("keeps every argument the reference shows — no placeholder dropped or invented", () => {
    for (const [key, text] of Object.entries(rows)) {
      expect(placeholders(text), key).toEqual(placeholders(reference[key]));
    }
  });
});
