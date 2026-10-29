import { describe, expect, it } from "vitest";
import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { missingKitLabels } from "../kit-labels";
import { germanLabels } from "../german";
import { UI_KIT_LABELS_DE_CH, uiKitLabelsDeCh } from "../locales/de-CH";
import { uiKitLabelsEn } from "../locales/en";
import { UI_KIT_LABELS_ES } from "../locales/es";
import { UI_KIT_LABELS_FR } from "../locales/fr";
import { UI_KIT_LABELS_HU } from "../locales/hu";
import { UI_KIT_LABELS_IT } from "../locales/it";
import { UI_KIT_LABELS_ZH } from "../locales/zh";

/**
 * The shipped translations (`@eifi1/ui-kit/i18n/<code>`). The type already demands every
 * key; these pin what the type cannot: that no key quietly equals the English default
 * object, and that the one German catalogue (Swiss, formal) really is respelled.
 */
const LOCALES = {
  "de-CH": UI_KIT_LABELS_DE_CH,
  es: UI_KIT_LABELS_ES,
  fr: UI_KIT_LABELS_FR,
  hu: UI_KIT_LABELS_HU,
  it: UI_KIT_LABELS_IT,
  zh: UI_KIT_LABELS_ZH,
};

/** Every leaf, as text: functions are called with plausible arguments — numbers; a label
 *  that works on text (`feedbackPage.environment`) prints one rather than throw. */
function leaves(tree: unknown, path = ""): Array<[string, string]> {
  if (typeof tree === "string") return [[path, tree]];
  if (typeof tree === "function") {
    const fn = tree as (...a: unknown[]) => unknown;
    const out = fn(...Array.from({ length: tree.length }, (_, i) => (i === 0 ? 1234 : 2)));
    return typeof out === "string" ? [[path, out]] : [];
  }
  if (tree && typeof tree === "object") {
    return Object.entries(tree).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe.each(Object.entries(LOCALES))("@eifi1/ui-kit/i18n/%s", (_code, labels) => {
  it("covers every key of the English defaults", () => {
    expect(missingKitLabels(labels, DEFAULT_UI_KIT_LABELS)).toEqual([]);
  });

  it("upper-cases feedbackPage.environment, and never throws on a value that is no string", () => {
    const environment = labels.feedbackPage.environment as (value: unknown) => string;
    expect(environment("dev")).toBe("DEV");
    expect(environment(undefined)).toBe("");
    expect(environment(null)).toBe("");
    expect(environment(7)).toBe("7");
  });

  it("is not the English defaults under another name", () => {
    const english = new Map(leaves(DEFAULT_UI_KIT_LABELS));
    const same = leaves(labels).filter(([k, v]) => english.get(k) === v && /[a-z]{4}/i.test(v));
    // A few words are the same in both (e.g. "Text", "Tooltip"); a whole namespace is not.
    expect(same.length).toBeLessThan(leaves(labels).length / 10);
  });
});

describe("de-CH", () => {
  it("has no ß anywhere, and formats numbers the Swiss way", () => {
    const text = leaves(UI_KIT_LABELS_DE_CH).map(([, v]) => v);
    expect(text.join(" ")).not.toMatch(/ß/);
    // The check bites: the internal source it is derived from does write "ß".
    expect(leaves(germanLabels("de-CH")).some(([, v]) => v.includes("ß"))).toBe(true);
    expect(UI_KIT_LABELS_DE_CH.dataTable.rowCount(1234)).toBe(new Intl.NumberFormat("de-CH").format(1234));
  });

  it("respells what the app passes into a function label too", () => {
    const phrase = UI_KIT_LABELS_DE_CH.dangerConfirm.phrase;
    expect(typeof phrase === "function" ? phrase("Schließen") : phrase).toBe(
      "Geben Sie zur Bestätigung „Schliessen“ ein",
    );
  });

  it("addresses the reader formally — the kit's one German says Sie", () => {
    expect(UI_KIT_LABELS_DE_CH.wizard.missingRequired).toBe("Bitte füllen Sie alle Pflichtfelder aus.");
  });

  it("the factory takes a number locale without changing the words", () => {
    expect(uiKitLabelsDeCh().dataTable.rowCount(1234)).toBe(UI_KIT_LABELS_DE_CH.dataTable.rowCount(1234));
    const germanDigits = uiKitLabelsDeCh("de-DE");
    expect(germanDigits.dataTable.rowCount(1234)).toBe(new Intl.NumberFormat("de-DE").format(1234));
    expect(germanDigits.dataTable.pageChanged(1, 2)).toBe(UI_KIT_LABELS_DE_CH.dataTable.pageChanged(1, 2));
    expect(
      leaves(germanDigits)
        .map(([, v]) => v)
        .join(" "),
    ).not.toMatch(/ß/);
  });
});

describe("serverWake is keksdose's reviewed wording (0.35)", () => {
  // The cold-start notice is keksdose's (#199, kit 0.18), and its reviewed words are canon:
  // its `boot.slow` / `boot.waking`, with the app's name where keksdose writes its own. The
  // kit's fr and it had drifted ("cela prend plus de temps", "Caricamento in corso").
  const KEKSDOSE = {
    en: [
      "Still loading — this is taking longer than usual.",
      "The server goes to sleep when nobody is using Keksdose, so the first request after a break has to start it again. That can take a moment — nothing is lost, the page fills in by itself.",
    ],
    "de-CH": [
      "Lädt noch – das dauert länger als sonst.",
      "Der Server schläft ein, wenn Keksdose gerade niemand benutzt. Die erste Anfrage nach einer Pause muss ihn erst wieder starten. Das kann einen Moment dauern – es geht nichts verloren, die Seite füllt sich von selbst.",
    ],
    fr: [
      "Chargement en cours — c’est plus long que d’habitude.",
      "Le serveur se met en veille quand personne n’utilise Keksdose\u202f; la première requête après une pause doit donc le réveiller. Cela peut prendre un instant — rien n’est perdu, la page se remplit toute seule.",
    ],
    it: [
      "Sta ancora caricando: ci vuole più del solito.",
      "Il server si addormenta quando nessuno usa Keksdose, perciò la prima richiesta dopo una pausa deve prima riavviarlo. Può volerci un momento: non va perso nulla, la pagina si riempie da sola.",
    ],
  };
  const CATALOGUES = { en: uiKitLabelsEn(), "de-CH": UI_KIT_LABELS_DE_CH, fr: UI_KIT_LABELS_FR, it: UI_KIT_LABELS_IT };

  it.each(Object.entries(KEKSDOSE))("%s says what keksdose says, key for key", (code, [slow, waking]) => {
    const { serverWake } = CATALOGUES[code as keyof typeof CATALOGUES];
    expect(Object.keys(serverWake).sort()).toEqual(["slow", "waking"]);
    expect(serverWake.slow).toBe(slow);
    expect(serverWake.waking("Keksdose")).toBe(waking);
  });

  it("names no app where none is given, in the catalogue's own word for it", () => {
    expect(UI_KIT_LABELS_FR.serverWake.waking()).toContain("personne n’utilise l’application\u202f;");
    expect(UI_KIT_LABELS_IT.serverWake.waking()).toContain("nessuno usa l’app,");
  });
});

/** Every function label, called once per parameter with 12345 there and 2 elsewhere:
 *  "path#parameter" → what it prints. A label that throws on a number (one that works on
 *  text) is left out. */
function countProbes(tree: unknown, path = "", out = new Map<string, string>()) {
  if (typeof tree === "function") {
    const fn = tree as (...a: unknown[]) => unknown;
    const arity = Math.max(1, fn.length);
    for (let at = 0; at < arity; at++) {
      try {
        const text = fn(...Array.from({ length: arity }, (_, i) => (i === at ? 12345 : 2)));
        if (typeof text === "string") out.set(`${path}#${at}`, text);
      } catch {
        // A text parameter: there is no number to format.
      }
    }
  } else if (tree && typeof tree === "object") {
    for (const [k, v] of Object.entries(tree)) countProbes(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

describe("thousands formatting is the same in every catalogue (round 0.34 DOC-6)", () => {
  it("a count one catalogue formats is printed raw by none", () => {
    // English is its formatting factory, not the defaults, which print raw since 0.1.
    const catalogues = { en: uiKitLabelsEn(), ...LOCALES };
    const probes = Object.entries(catalogues).map(([code, l]) => [code, countProbes(l)] as const);
    // "12,345", "12’345", "12 345", "12.345": the digits split by one separator.
    const formatted = /12[^\d]345/;
    const keys = new Set(probes.flatMap(([, p]) => [...p.keys()]));
    const raw: string[] = [];
    for (const key of keys) {
      // A position or an id (`lineItems.row`) is printed raw everywhere, and that is fine.
      if (!probes.some(([, p]) => formatted.test(p.get(key) ?? ""))) continue;
      for (const [code, p] of probes) if (p.get(key)?.includes("12345")) raw.push(`${code} ${key}`);
    }
    expect(raw).toEqual([]);
  });
});
