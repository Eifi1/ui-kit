import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { missingKitLabels } from "../kit-labels";
import type { UiKitLabels } from "../kit-labels";
import {
  KIT_LANGUAGES,
  formatLocaleOf,
  languageOptions,
  loadUiKitLabels,
  resolveLanguage,
} from "../languages";
import type { KitLanguageCode } from "../languages";
import { uiKitLabelsDeCh } from "../locales/de-CH";
import { uiKitLabelsEn } from "../locales/en";
import { uiKitLabelsEs } from "../locales/es";
import { uiKitLabelsFr } from "../locales/fr";
import { uiKitLabelsHu } from "../locales/hu";
import { uiKitLabelsIt } from "../locales/it";
import { uiKitLabelsZh } from "../locales/zh";
import type { LanguageOption } from "../../shell/topbar-controls";
import type { LanguageSettingProps } from "../../components/settings-fields";

/**
 * The language registry (docs/i18n-harmonization.md, H2): the one answer to "which
 * language is this reader in" that kastlan, keksdose and Kurvenschmiede each wrote, and
 * disagreed on — zh-TW was German in one and Chinese in another, English counts were
 * grouped in two and raw in the third.
 */

const ALL: KitLanguageCode[] = ["de-CH", "en", "es", "fr", "it", "hu", "zh"];

describe("KIT_LANGUAGES", () => {
  it("is the seven languages the kit ships a catalogue for, one German", () => {
    expect(KIT_LANGUAGES.map((language) => language.code)).toEqual(ALL);
  });

  it("formats each language like its home (H6), English as British", () => {
    expect(Object.fromEntries(KIT_LANGUAGES.map((l) => [l.code, l.formatLocale]))).toEqual({
      "de-CH": "de-CH",
      en: "en-GB",
      es: "es-ES",
      fr: "fr-FR",
      it: "it-IT",
      hu: "hu-HU",
      zh: "zh-CN",
    });
  });

  it("gives every language a format locale Intl knows, spelled canonically", () => {
    for (const { code, formatLocale } of KIT_LANGUAGES) {
      expect(Intl.getCanonicalLocales(formatLocale), code).toEqual([formatLocale]);
      expect(Intl.NumberFormat.supportedLocalesOf([formatLocale]), code).toEqual([formatLocale]);
    }
  });

  it("flies a flag-icons country, not the language code", () => {
    expect(Object.fromEntries(KIT_LANGUAGES.map((l) => [l.code, l.flag]))).toEqual({
      "de-CH": "ch",
      en: "gb",
      es: "es",
      fr: "fr",
      it: "it",
      hu: "hu",
      zh: "cn",
    });
    for (const { flag } of KIT_LANGUAGES) expect(flag).toMatch(/^[a-z]{2}$/);
  });

  it("lists them alphabetically by their own names", () => {
    const names = KIT_LANGUAGES.map((l) => l.nativeName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    // The Chinese catalogue is Simplified, and its name says so.
    expect(KIT_LANGUAGES.find((l) => l.code === "zh")!.nativeName).toBe("简体中文");
  });
});

describe("resolveLanguage — one requested tag, all seven offered", () => {
  it.each([
    // Exact, whatever the case.
    ["de-CH", "de-CH"],
    ["DE-ch", "de-CH"],
    ["en", "en"],
    ["EN", "en"],
    // Every German is the one German.
    ["de", "de-CH"],
    ["de-DE", "de-CH"],
    ["de-AT", "de-CH"],
    ["de-LI", "de-CH"],
    ["de-informal", "de-CH"],
    ["de-CH-informal", "de-CH"],
    ["de_CH", "de-CH"],
    // Every Chinese is the Simplified catalogue.
    ["zh-CN", "zh"],
    ["zh-TW", "zh"],
    ["zh-HK", "zh"],
    ["zh-Hant", "zh"],
    ["zh-Hant-HK", "zh"],
    // Any other regional form is its base language.
    ["fr-CA", "fr"],
    ["fr-CH", "fr"],
    ["en-AU", "en"],
    ["en-GB", "en"],
    ["es-MX", "es"],
    ["it-CH", "it"],
    ["hu-HU", "hu"],
    // Nothing the kit ships: the home language.
    ["pt-BR", "de-CH"],
    ["dense", "de-CH"],
  ])("answers %s with %s", (requested, expected) => {
    expect(resolveLanguage([requested], ALL)).toBe(expected);
  });
});

describe("resolveLanguage — precedence (H5: device → account → browser → de-CH)", () => {
  it("takes the first candidate that matches", () => {
    expect(resolveLanguage(["fr", "it", "en-US"], ALL)).toBe("fr");
    expect(resolveLanguage([null, "it", "en-US"], ALL)).toBe("it");
    expect(resolveLanguage([undefined, null, "en-US", "fr"], ALL)).toBe("en");
  });

  it("moves on to the next candidate when one matches nothing", () => {
    // A browser asking for Portuguese first and French second gets French, not the
    // fallback: that is why the whole of navigator.languages is passed.
    expect(resolveLanguage([null, undefined, "pt-BR", "fr-FR"], ALL)).toBe("fr");
  });

  it("falls back to de-CH when there is nothing to go on", () => {
    expect(resolveLanguage([], ALL)).toBe("de-CH");
    expect(resolveLanguage([null, undefined], ALL)).toBe("de-CH");
    expect(resolveLanguage(["", "   "], ALL)).toBe("de-CH");
  });
});

describe("resolveLanguage — an app's subset", () => {
  const KEKSDOSE: KitLanguageCode[] = ["de-CH", "en", "fr", "it"];

  it("matches only what the app offers", () => {
    expect(resolveLanguage(["es-MX"], KEKSDOSE)).toBe("de-CH");
    expect(resolveLanguage(["zh-TW"], KEKSDOSE)).toBe("de-CH");
    expect(resolveLanguage(["es-MX", "en"], KEKSDOSE)).toBe("en");
    expect(resolveLanguage(["de-AT"], KEKSDOSE)).toBe("de-CH");
    expect(resolveLanguage(["it-CH"], KEKSDOSE)).toBe("it");
  });

  it("returns the offered code's own spelling", () => {
    expect(resolveLanguage(["de-ch"], KEKSDOSE)).toBe("de-CH");
  });

  it("takes an explicit fallback as given", () => {
    expect(resolveLanguage(["pt-BR"], KEKSDOSE, "en")).toBe("en");
    expect(resolveLanguage(["fr"], KEKSDOSE, "en")).toBe("fr");
  });

  it("falls back to the first offered code when the app offers no German", () => {
    expect(resolveLanguage(["pt-BR"], ["en", "fr"])).toBe("en");
    // German is not offered, so a German reader is not matched to anything.
    expect(resolveLanguage(["de-DE", "fr"], ["en", "fr"])).toBe("fr");
    expect(resolveLanguage(["de-DE"], ["en", "fr"])).toBe("en");
  });

  it("answers de-CH when nothing is offered at all", () => {
    expect(resolveLanguage(["fr"], [])).toBe("de-CH");
  });
});

describe("formatLocaleOf", () => {
  it("gives each code its language's tag", () => {
    for (const { code, formatLocale } of KIT_LANGUAGES) {
      expect(formatLocaleOf(code)).toBe(formatLocale);
    }
  });

  it("resolves any other tag first: the language's home, not the reader's region", () => {
    expect(formatLocaleOf("de-AT")).toBe("de-CH");
    expect(formatLocaleOf("en-AU")).toBe("en-GB");
    expect(formatLocaleOf("en-US")).toBe("en-GB");
    expect(formatLocaleOf("zh-TW")).toBe("zh-CN");
  });

  it("keeps a tag of a language the kit does not ship as it is — a format preference (keksdose)", () => {
    expect(formatLocaleOf("sv-SE")).toBe("sv-SE");
    expect(formatLocaleOf("pt-br")).toBe("pt-BR");
    expect(formatLocaleOf("not a tag")).toBe("de-CH");
    expect(formatLocaleOf("")).toBe("de-CH");
  });
});

const FACTORIES: Record<KitLanguageCode, (locale: string) => UiKitLabels> = {
  "de-CH": uiKitLabelsDeCh,
  en: uiKitLabelsEn,
  es: uiKitLabelsEs,
  fr: uiKitLabelsFr,
  it: uiKitLabelsIt,
  hu: uiKitLabelsHu,
  zh: uiKitLabelsZh,
};

describe("loadUiKitLabels", () => {
  it.each(ALL)("%s: loads its catalogue, complete, in its format locale", async (code) => {
    const labels = await loadUiKitLabels(code);
    expect(missingKitLabels(labels, DEFAULT_UI_KIT_LABELS)).toEqual([]);
    // Every string leaf is the catalogue's own (functions drop out of the JSON).
    expect(JSON.stringify(labels)).toBe(JSON.stringify(FACTORIES[code](formatLocaleOf(code))));
    const grouped = new Intl.NumberFormat(formatLocaleOf(code)).format(12345);
    expect(labels.dataTable.rowCount(12345)).toBe(grouped);
  });

  it("speaks French for fr", async () => {
    expect((await loadUiKitLabels("fr")).common.close).toBe("Fermer");
  });

  it("groups English counts the British way, where the bare defaults print them raw", async () => {
    const en = await loadUiKitLabels("en");
    expect(en.dataTable.rowCount(12345)).toBe("12,345");
    expect(DEFAULT_UI_KIT_LABELS.dataTable.rowCount(12345)).toBe("12345");
  });

  it("groups German counts the Swiss way, and spells Swiss", async () => {
    const de = await loadUiKitLabels("de-CH");
    expect(de.dataTable.rowCount(12345)).toMatch(/^12[’']345$/);
    expect(de.common.close).toBe("Schliessen");
  });

  it("takes another format locale without changing the words", async () => {
    const de = await loadUiKitLabels("de-CH", "de-DE");
    expect(de.dataTable.rowCount(12345)).toBe("12.345");
    expect(de.common.close).toBe("Schliessen");
  });

  it("resolves a tag it does not ship like formatLocaleOf does", async () => {
    expect((await loadUiKitLabels("de-AT")).common.close).toBe("Schliessen");
    expect((await loadUiKitLabels("fr-CA")).common.close).toBe("Fermer");
    expect((await loadUiKitLabels("pt-BR")).common.close).toBe("Schliessen");
  });

  it("answers the same question with the same object", async () => {
    // The provider's context value keeps its identity across a switch back.
    expect(await loadUiKitLabels("it")).toBe(await loadUiKitLabels("it"));
    expect(await loadUiKitLabels("it", "it-CH")).not.toBe(await loadUiKitLabels("it"));
  });

  it("imports no catalogue statically — one chunk per language", () => {
    // A static import here would put every language in every app's entry chunk, the
    // regression one subpath per language exists to prevent. Each loader must stay a
    // literal `import()`, the only kind a bundler can split.
    const source = readFileSync(join(process.cwd(), "src", "i18n", "languages.ts"), "utf8");
    expect(source).not.toMatch(/^\s*import\s[^;]*?from\s+["']\.\/locales\//m);
    for (const code of ALL) expect(source).toContain(`import("./locales/${code}")`);
  });
});

describe("languageOptions", () => {
  it("gives LanguageMenu every language with its own name and flag", () => {
    const options: LanguageOption[] = languageOptions();
    expect(options).toEqual(
      KIT_LANGUAGES.map((l) => ({ code: l.code, label: l.nativeName, country: l.flag })),
    );
  });

  it("keeps the app's subset in the app's order", () => {
    expect(languageOptions(["en", "de-CH"])).toEqual([
      { code: "en", label: "English", country: "gb" },
      { code: "de-CH", label: "Deutsch", country: "ch" },
    ]);
  });

  it("is what LanguageSetting takes as well", () => {
    // A native <select> shows the names; the flag field rides along unused.
    const options: LanguageSettingProps["options"] = languageOptions(["fr", "it"]);
    expect(options.map((o) => o.label)).toEqual(["Français", "Italiano"]);
  });
});
