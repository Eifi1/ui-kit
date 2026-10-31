import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as root from "../../../src/index";
import * as currencies from "../../../src/currencies";
import * as eslintPlugin from "../../../src/eslint";
import * as pushWorker from "../../../src/push-worker";
import * as testingReact from "../../../src/testing/react";
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
import * as sync from "../../../src/sync";
import * as syncTesting from "../../../src/sync/testing";
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

/** Every entry point in package.json's `exports` (the test below holds it to the file;
 *  `./currencies`, `./eslint`, `./testing/react` and `./push-worker` were missing). */
const ENTRIES: Record<string, Record<string, unknown>> = {
  ".": root,
  "./currencies": currencies,
  "./eslint": eslintPlugin,
  "./push-worker": pushWorker,
  "./testing/react": testingReact,
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
  "./sync": sync,
  "./sync/testing": syncTesting,
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
  "src/testing/react.ts",
  "src/currencies.ts",
  "src/eslint/index.ts",
  "src/push-worker.ts",
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

/**
 * Exported hooks and helpers that no showcase page names (refactor audit 2026-10-30,
 * DOC-12). CONTRIBUTING's showcase rule gives a hook a specimen and a helper an
 * input → output table; these have neither, and say why. A label hook is fine here: its
 * words are on the page of the component that reads them.
 */
const TEST_HELPER =
  "a test helper for an app's suite (`/testing`, `/testing/react`, `/sync/testing`): nothing to render";
const LABEL_HOOK = "a label hook: its words are on the page of the component that reads them";
const PROVIDER =
  "reads a UiKitProvider option of the same name, for an app's own component; the provider is on the i18n page";
const WORKER = "runs in the app's service worker (`/push-worker`), where no page renders";
const ENGINE = "the offline and sync engine's plumbing, shown through the components that use it";
const APPEARANCE =
  "the appearance settings' plumbing (the pre-paint read, the stores' writers): the Appearance page shows its effect";
const OWED = "a pure helper still owed its input → output table (CONTRIBUTING, the showcase; DOC-12)";
const NOT_SHOWN: Record<string, string> = {
  createFakeSyncTransport: TEST_HELPER,
  rowMenuAction: TEST_HELPER,
  setViewportWidth: TEST_HELPER,
  stubResizeObserver: TEST_HELPER,
  stubViewportWidth: TEST_HELPER,
  viewportMatchMedia: TEST_HELPER,
  tourStepContext: TEST_HELPER,
  useFeedbackCategoryLabels: LABEL_HOOK,
  useFeedbackDetailLabels: LABEL_HOOK,
  useFeedbackNotificationTypesLabels: LABEL_HOOK,
  useFeedbackRepliesLabels: LABEL_HOOK,
  useFeedbackToastLabels: LABEL_HOOK,
  useLandingLabels: LABEL_HOOK,
  useLegalLabels: LABEL_HOOK,
  useTopBarPartsLabels: LABEL_HOOK,
  useKitChartTooltipPlacement: PROVIDER,
  useKitDocumentTitle: PROVIDER,
  useKitTableStorageKeyPrefix: PROVIDER,
  useKitTimeZone: PROVIDER,
  peekUiKitLabels: "loadUiKitLabels' synchronous sibling (the catalogue once it has arrived); the i18n page loads one",
  useUiKitLabels: "loadUiKitLabels as a hook; the i18n page loads a catalogue",
  handlePushSubscriptionChange: WORKER,
  pushSubscriptionInput: WORKER,
  resubscribeAfterChange: WORKER,
  releaseSyncEngine: ENGINE,
  syncEngineFor: ENGINE,
  rowByPk: ENGINE,
  isCacheSafe: ENGINE,
  removeStaleQueryCopies: ENGINE,
  createServiceWorkerUpdates: ENGINE,
  useServiceWorkerUpdate: ENGINE,
  useOfflineWriteLock: ENGINE,
  applyContrast: APPEARANCE,
  contrastLevel: APPEARANCE,
  isContrastMode: APPEARANCE,
  prefersMoreContrast: APPEARANCE,
  readContrastLevel: APPEARANCE,
  readPersistedContrast: APPEARANCE,
  readPersistedTextSize: APPEARANCE,
  readTextSize: APPEARANCE,
  useCoarsePointer: "a media hook (pointer: coarse); the components that read it are on their pages",
  useInlineFacts: "the large-text layout switch the stat and fact components read; shown through them",
  useRemPx: "the text-size-aware px of a rem the measuring components read; shown through them",
  remPx: "the text-size-aware px of a rem the measuring components read; shown through them",
  useOptionalWizardContext:
    "the wizard's context for a step component of an app's own; the Wizard page shows the steps",
  useSettingsHeadingLevel: "the heading level a settings section reads inside SettingsLayout; shown through it",
  useFocusParam: "SettingsLayout's `?focus=` deep link, read by the settings sections; shown through them",
  resolveSettingsLocation: "SettingsLayout's routing, shown through it",
  visibleSettingsEntries: "SettingsLayout's catalogue filter, shown through it",
  visibleSettingsGroups: "SettingsLayout's catalogue filter, shown through it",
  settingsFromListState: "SettingsLayout's routing, shown through it",
  resolveAccountAppearance: "the account settings' merge of the stored and the device appearance; shown through them",
  resolveAccountLanguage: "the account settings' language resolution; shown through LanguageSetting",
  matchOfferedLanguage: "the account settings' language resolution; shown through LanguageSetting",
  useAccessAction: "the landing page's sign-in / open-app action; shown through the landing specimen",
  clearLastVisitedPage: "the landing routing's memory of the last page; shown through the landing specimen",
  readKeyboardInset: "the on-screen keyboard's inset the anchored panels read; shown through them",
  describeThrown: "ErrorBoundary's text for what was thrown; shown through it",
  imageItemKind: "Lightbox's media kind; shown through it",
  splitFileName: "ImageGrid's file-name split; shown through it",
  dragHasFiles: "useFileDrop's drag test; shown through FileDropzone",
  pickMobileBar: "AppShell's phone bar; shown through it",
  splitMobileBar: "AppShell's phone bar; shown through it",
  resolveTooltipPlacement: "SeriesChart's tooltip side; shown through it",
  anchoredBand: "SeriesChart's band axis; shown through it",
  swipePlanRowActions: "DataTable's swipe plan from its row actions; shown through it",
  compareSortValues: "DataTable's sort order, for an app's own list that must sort the same; shown through DataTable",
  readTableUrlState: "useTableState's URL read; shown through DataTable",
  planRelation: "PlanCard's current / upgrade / downgrade; shown through it",
  planLimitMailto: "PlanLimitNotice's mail link; shown through it",
  maskMailAddress: "MailTestCard's masked address; shown through it",
  legalOperatorText: "LegalPage's operator sentence; shown through it",
  feedbackAttachmentUrls: "FeedbackRowDetail's helpers; shown through the feedback inbox",
  feedbackPageHref: "FeedbackRowDetail's helpers; shown through the feedback inbox",
  feedbackPagePath: "FeedbackRowDetail's helpers; shown through the feedback inbox",
  feedbackPageUrl: "FeedbackRowDetail's helpers; shown through the feedback inbox",
  feedbackRowAccess: "FeedbackRowDetail's helpers; shown through the feedback inbox",
  feedbackEnvironment: "FeedbackTable's column helpers; shown through the feedback inbox",
  feedbackSubmitter: "FeedbackTable's column helpers; shown through the feedback inbox",
  feedbackSubmitterEmail: "FeedbackTable's column helpers; shown through the feedback inbox",
  attachmentName: "the feedback record's helpers; shown through the feedback inbox",
  feedbackReworkCount: "the feedback record's helpers; shown through the feedback inbox",
  isImageAttachment: "the feedback record's helpers; shown through the feedback inbox",
  replaceDescription: "the feedback record's helpers; shown through the feedback inbox",
  createSearchIndex: "GlobalSearch's index; shown through it",
  matchEntries: "GlobalSearch's index; shown through it",
  normalizeSearchText: "GlobalSearch's index; shown through it",
  matchesHotkey: "useHotkey's parser; shown through the components that bind keys",
  parseHotkey: "useHotkey's parser; shown through the components that bind keys",
  demoCountdown: "DemoBanner's countdown; shown through it",
  isBillingError: "the billing refusals' test; shown through the billing page's errors",
  isBillingReadOnly: "the billing standing; shown through the billing specimens",
  billingLockAt: "the billing standing; shown through the billing specimens",
  checkoutLanded: "the checkout's return; shown through CheckoutReturn",
  billingCurrencyFor: OWED,
  minorToMajor: OWED,
  planPrice: OWED,
  addMonthsClamped: OWED,
  localeWeekStart: OWED,
  toDate: OWED,
  dateFormatSample: OWED,
  isDateFormatPreference: OWED,
  resolveDateFormat: OWED,
  currencyMinorDigits: OWED,
  formatWithMinus: OWED,
  compactIban: OWED,
  formatIban: OWED,
  formatNationalPhone: OWED,
  parsePhone: OWED,
  encodeQr: OWED,
  foldForSearch: OWED,
  matchesSearch: OWED,
  rankMatch: OWED,
  searchWords: OWED,
  formatLocaleOf: OWED,
  languageOptions: OWED,
  assignColumnRole: OWED,
  guessMapping: OWED,
  missingRoles: OWED,
  readTextFile: OWED,
  roleOfColumn: OWED,
  uuid5: OWED,
  withAllPlurals: OWED,
  filterTranslationRows: OWED,
  groupTranslationRows: OWED,
  keyInAreas: OWED,
  keyNamespace: OWED,
  placeholderMismatch: OWED,
  placeholderTokens: OWED,
  reviewAreaOf: OWED,
  reviewStatus: OWED,
  reviewUndo: OWED,
  reviewWrite: OWED,
  summariseRows: OWED,
  translationCorrections: OWED,
  translationReviewSwipePlan: OWED,
  unreviewedRows: OWED,
};

/**
 * Hooks and helpers deprecated in src (a `@deprecated` JSDoc on the declaration): on their
 * way out, so they need no page (decision 4 of the refactor plan, 0.52).
 */
const DEPRECATED = (function scan(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" || name === "test" ? [] : scan(path);
    if (!/\.tsx?$/.test(name)) return [];
    return [
      ...readFileSync(path, "utf8").matchAll(
        /\/\*\*(?:(?!\*\/)[\s\S])*?@deprecated(?:(?!\*\/)[\s\S])*\*\/\s*export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let)\s+([A-Za-z_$][\w$]*)/g,
      ),
    ].map((m) => m[1]);
  });
})(join(process.cwd(), "src"));

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
      const name = entry
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
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

/** `useWizard`, `cn`, `formatIban`: a runtime function named in camelCase, hooks included. */
const helpers = [
  ...new Set(
    Object.values(ENTRIES).flatMap((mod) =>
      Object.entries(mod)
        .filter(([name, value]) => typeof value === "function" && /^[a-z]/.test(name))
        .map(([name]) => name),
    ),
  ),
].sort();

/** The showcase's own text — pages, specimens, dictionaries — where a helper is "on a page"
 *  when its name is written. Its tests are not the showcase. */
const showcaseText = (function read(dir: string): string {
  return readdirSync(dir)
    .map((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === "__tests__" ? "" : read(path);
      return /\.(tsx?|json)$/.test(name) ? readFileSync(path, "utf8") : "";
    })
    .join("\n");
})(join(ROOT, "showcase/src"));
const named = (name: string) => new RegExp(`(?<![\\w$])${name.replace(/\$/g, "\\$")}(?![\\w$])`).test(showcaseText);
const allNames = new Set([...runtimeNames, ...ENTRY_FILES.flatMap((f) => [...exportedNames(join(ROOT, f))])]);
const listed = new Map<string, string[]>();
for (const group of GROUPS) {
  for (const page of group.pages) {
    for (const name of page.components ?? []) listed.set(name, [...(listed.get(name) ?? []), page.slug]);
  }
}

describe("the showcase's component index", () => {
  it("covers every entry point package.json exports", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { exports: Record<string, unknown> };
    const declared = Object.keys(pkg.exports)
      .filter((key) => key !== "./package.json" && !key.endsWith(".css"))
      .flatMap((key) =>
        key === "./i18n/*" ? ["de-CH", "en", "es", "fr", "hu", "it", "zh"].map((c) => `./i18n/${c}`) : [key],
      )
      .sort();
    expect(Object.keys(ENTRIES).sort()).toEqual(declared);
  });

  it("names every exported hook and helper on a page, or says why not (DOC-12)", () => {
    const missing = helpers.filter((name) => !named(name) && !(name in NOT_SHOWN) && !DEPRECATED.includes(name));
    expect(missing).toEqual([]);
  });

  it("keeps its hook and helper exceptions to exports no page names", () => {
    // Listed whole, so a round that gives several helpers a page prunes them in one go.
    const entries = Object.entries(NOT_SHOWN);
    expect(
      entries.filter(([name]) => !helpers.includes(name)).map(([name]) => `${name}: not an exported hook or helper`),
    ).toEqual([]);
    expect(
      entries.filter(([name]) => named(name)).map(([name]) => `${name}: named on a page now, drop it here`),
    ).toEqual([]);
    expect(
      entries.filter(([name]) => DEPRECATED.includes(name)).map(([name]) => `${name}: deprecated, needs no entry`),
    ).toEqual([]);
    expect(entries.filter(([, reason]) => reason.trim() === "").map(([name]) => name)).toEqual([]);
  });

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
