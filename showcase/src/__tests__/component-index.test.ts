import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as root from "../../../src/index";
import * as chart from "../../../src/chart";
import * as dataTable from "../../../src/data-table";
import * as feedback from "../../../src/feedback";
import * as search from "../../../src/search";
import * as shell from "../../../src/shell";
import * as tour from "../../../src/tour";
import * as wizard from "../../../src/wizard";
import * as rhf from "../../../src/rhf";
import * as tableText from "../../../src/table-text";
import * as offline from "../../../src/offline";
import * as testing from "../../../src/testing";
import * as dates from "../../../src/lib/dates";
import * as i18nDeCh from "../../../src/i18n/locales/de-CH";
import * as i18nEn from "../../../src/i18n/locales/en";
import * as i18nEs from "../../../src/i18n/locales/es";
import * as i18nFr from "../../../src/i18n/locales/fr";
import * as i18nHu from "../../../src/i18n/locales/hu";
import * as i18nIt from "../../../src/i18n/locales/it";
import * as i18nZh from "../../../src/i18n/locales/zh";
import { GROUPS } from "../routes";

/**
 * The component → page index, checked against the exports (refactor audit 2026-10,
 * DOC-9).
 *
 * Each page's `components[]` is the index: the group overviews list it, and the search
 * finds a component by it. It was kept by hand and nothing compared it with what the
 * package exports, so it drifted both ways — 46 components the pages rendered were on no
 * list (QrCode could not be found by search at all), and the feedback page listed
 * `FeedbackInbox` and `FEEDBACK_STATUSES`, which the package does not export.
 *
 * Two rules, one per direction:
 *  - every PascalCase runtime export of an entry point is on some page's list, or in
 *    {@link NOT_ON_A_PAGE} with the reason it has no entry of its own;
 *  - every name on a page's list is something an entry point exports (types count: a
 *    page may document `MiniCalendarDayState`).
 */

/** Every entry point in package.json's `exports`. */
const ENTRIES: Record<string, Record<string, unknown>> = {
  ".": root,
  "./chart": chart,
  "./data-table": dataTable,
  "./feedback": feedback,
  "./search": search,
  "./shell": shell,
  "./tour": tour,
  "./wizard": wizard,
  "./rhf": rhf,
  "./table-text": tableText,
  "./offline": offline,
  "./testing": testing,
  "./dates": dates,
  "./i18n/de-CH": i18nDeCh,
  "./i18n/en": i18nEn,
  "./i18n/es": i18nEs,
  "./i18n/fr": i18nFr,
  "./i18n/hu": i18nHu,
  "./i18n/it": i18nIt,
  "./i18n/zh": i18nZh,
};

/** The source file behind each entry, for the type-only names a namespace import drops. */
const ENTRY_FILES = [
  "src/index.ts",
  "src/chart.ts",
  "src/data-table.ts",
  "src/feedback.ts",
  "src/search.ts",
  "src/shell.ts",
  "src/tour.ts",
  "src/wizard.ts",
  "src/rhf.ts",
  "src/table-text.ts",
  "src/offline.ts",
  "src/testing/index.ts",
  "src/lib/dates.ts",
  ...["de-CH", "en", "es", "fr", "hu", "it", "zh"].map((code) => `src/i18n/locales/${code}.ts`),
];

/**
 * Exported, and deliberately on no page's list. A part is documented on its parent's
 * page and found through it. (The five "no specimen yet" entries — DisabledReasonLine,
 * FeedbackSubject, SharePanel, TranslationProgress, TranslationReviewEditor — got a
 * specimen and a list entry in the showcase merge, refactor plan DOC-8.)
 */
const NOT_ON_A_PAGE: Record<string, string> = {
  CardHeader: "a part of Card (the Buttons & surfaces page)",
  CardTitle: "a part of Card (the Buttons & surfaces page)",
  CardDescription: "a part of Card (the Buttons & surfaces page)",
  CardAction: "a part of Card (the Buttons & surfaces page)",
  CardContent: "a part of Card (the Buttons & surfaces page)",
  CardFooter: "a part of Card (the Buttons & surfaces page)",
  TableHead: "a part of Table (the Description list & table page)",
  TableRow: "a part of Table (the Description list & table page)",
  TableHeaderCell: "a part of Table (the Description list & table page)",
  TableCell: "a part of Table (the Description list & table page)",
};

/** `Button`, `QrCode` — not `PALETTES`, `cn` or `useWizard`. */
const isPascalCase = (name: string) => /^[A-Z][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);

const ROOT = process.cwd();

/**
 * Every name a module exports, types included, read from the source: `export *` and
 * `export { … } from` are followed, declarations are read off. A namespace import gives
 * only the runtime names, and a page may document a type.
 */
function exportedNames(file: string, seen = new Set<string>()): Set<string> {
  const names = new Set<string>();
  if (seen.has(file)) return names;
  seen.add(file);
  const source = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const resolveFrom = (spec: string) => {
    const base = resolve(dirname(file), spec.replace(/\.js$/, ""));
    for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
      if (existsSync(candidate)) return candidate;
    }
    throw new Error(`${file}: cannot resolve ${spec}`);
  };
  for (const m of source.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)) {
    for (const name of exportedNames(resolveFrom(m[1]), seen)) names.add(name);
  }
  for (const m of source.matchAll(/export\s+\*\s+as\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const entry of m[1].split(",")) {
      const name = entry.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }
  for (const m of source.matchAll(
    /export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:type|interface|enum|class|function\*?|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(m[1]);
  }
  return names;
}

const runtimeNames = new Set(Object.values(ENTRIES).flatMap((mod) => Object.keys(mod)));
const allNames = new Set([...runtimeNames, ...ENTRY_FILES.flatMap((f) => [...exportedNames(join(ROOT, f))])]);
const listed = new Map<string, string[]>();
for (const group of GROUPS) {
  for (const page of group.pages) {
    for (const name of page.components ?? []) listed.set(name, [...(listed.get(name) ?? []), page.slug]);
  }
}

describe("the showcase's component index", () => {
  it("lists every exported component on a page, or says why not", () => {
    const missing = [...runtimeNames]
      .filter(isPascalCase)
      .filter((name) => !listed.has(name) && !(name in NOT_ON_A_PAGE))
      .sort();
    expect(missing).toEqual([]);
  });

  it("lists only names the package exports", () => {
    const unknown = [...listed.keys()].filter((name) => !allNames.has(name)).sort();
    expect(unknown).toEqual([]);
  });

  it("keeps its exceptions to exported components that are on no list", () => {
    for (const [name, reason] of Object.entries(NOT_ON_A_PAGE)) {
      expect(runtimeNames.has(name), `${name} is not exported`).toBe(true);
      expect(listed.get(name), `${name} is on a page's list after all`).toBeUndefined();
      expect(reason.trim(), name).not.toBe("");
    }
  });
});
