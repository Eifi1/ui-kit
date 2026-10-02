import { useMemo, useState } from "react";
import { Button } from "@eifi1/ui-kit";
import {
  REVIEW_STATUS_TONES,
  ReviewStatusChip,
  TranslationExportButton,
  TranslationLocaleTabs,
  TranslationReviewPanel,
} from "../../../src/components/translation-review";
import { DEFAULT_UI_KIT_LABELS } from "../../../src/i18n/defaults";
import { UI_KIT_LABELS_DE_CH } from "../../../src/i18n/locales/de-CH";
import { UI_KIT_LABELS_FR } from "../../../src/i18n/locales/fr";
import { UI_KIT_LABELS_IT } from "../../../src/i18n/locales/it";
import { kitLabelStrings } from "../../../src/i18n/review";
import type { UiKitLabels } from "../../../src/i18n/kit-labels";
import {
  REVIEW_STATUSES,
  dropReviews,
  flattenStrings,
  mergeReviews,
  translationRows,
  type TranslationReview,
  type TranslationReviewKey,
  type TranslationReviewWrite,
} from "../../../src/lib/translation-review";
import { Example, Note } from "../lib/section";

/**
 * 0.19 — the translation review as kit parts (H1): keksdose's /translations, which kastlan
 * was about to build a second time. The "server" is component state and a timeout; the
 * app's bundles are a dozen keksdose-style strings, and the kit's own words come from
 * `kitLabelStrings` under `kit.`, as every app's review will list them.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

// The app's own strings, keksdose-style: dotted keys, English as the reference.
const APP: Record<string, Record<string, unknown>> = {
  en: {
    budget: {
      rta: "Ready to Assign",
      goal_hint: "Set a goal to see how much to assign each month.",
      overspent: "Overspent by {{amount}}",
    },
    common: { save: "Save", cancel: "Cancel", items: "{{count}} items", deleted_user: "<deleted user>" },
    legal: {
      terms: "Terms of Service",
      privacy_intro: "We store only what the app needs. <1>Read the full policy</1>.",
    },
  },
  fr: {
    // `goal_hint` is missing: kastlan's French lacks 172 strings, and this is one.
    budget: { rta: "À attribuer", overspent: "Dépassement de {{amount}}" },
    common: { save: "Enregistrer", cancel: "Annuler", items: "des éléments", deleted_user: "<utilisateur supprimé>" },
    legal: {
      terms: "Conditions d’utilisation",
      privacy_intro: "Nous ne stockons que ce dont l’application a besoin. Lire la politique complète.",
    },
  },
  it: {
    budget: {
      rta: "Da assegnare",
      goal_hint: "Imposti un obiettivo per vedere quanto assegnare ogni mese.",
      overspent: "Superato di {{amount}}",
    },
    common: { save: "Salva", cancel: "Annulla", items: "{{count}} elementi", deleted_user: "<utente eliminato>" },
    legal: {
      terms: "Condizioni d’uso",
      privacy_intro: "Conserviamo solo ciò di cui l’app ha bisogno. <1>Legga l’informativa completa</1>.",
    },
  },
  "de-CH": {
    budget: {
      rta: "Zuzuweisen",
      goal_hint: "Setzen Sie ein Ziel, um zu sehen, wie viel Sie monatlich zuweisen.",
      overspent: "Um {{amount}} überzogen",
    },
    common: { save: "Speichern", cancel: "Abbrechen", items: "{{count}} Einträge", deleted_user: "<gelöschtes Konto>" },
    legal: {
      terms: "Nutzungsbedingungen",
      privacy_intro: "Wir speichern nur, was die App braucht. <1>Ganze Erklärung lesen</1>.",
    },
  },
};

const KIT: Record<string, UiKitLabels> = {
  en: DEFAULT_UI_KIT_LABELS,
  fr: UI_KIT_LABELS_FR,
  it: UI_KIT_LABELS_IT,
  "de-CH": UI_KIT_LABELS_DE_CH,
};

// A few of the kit's namespaces, not all ~900 rows: enough to see `kit` as one area
// among the app's.
const KIT_SAMPLE = /^kit\.(common|combobox|shareCard|serverWake)\./;

/** Everything one locale ships: the app's bundle and the kit's words under `kit.`. */
function strings(locale: string): Record<string, string> {
  const kit = flattenStrings(kitLabelStrings(KIT[locale]), "kit.");
  return {
    ...flattenStrings(APP[locale]),
    ...Object.fromEntries(Object.entries(kit).filter(([key]) => KIT_SAMPLE.test(key))),
  };
}

const LOCALES = [
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  // Visible but not reviewable here — the server's answer decides, never a role name.
  { value: "de-CH", label: "Deutsch (Schweiz)", readOnly: true },
];

const at = "2026-09-28T09:30:00Z";
const SEED: TranslationReview[] = [
  { locale: "fr", key: "common.save", text: "Enregistrer", referenceText: "Save", verdict: "APPROVED", note: null, suggestion: null, reviewerName: "Amélie", reviewedAt: at },
  // Approved on an older wording: "changed since review".
  { locale: "fr", key: "budget.rta", text: "A attribuer", referenceText: "Ready to Assign", verdict: "APPROVED", note: null, suggestion: null, reviewerName: "Amélie", reviewedAt: at },
  { locale: "fr", key: "legal.terms", text: "Conditions d’utilisation", referenceText: "Terms of Service", verdict: "NEEDS_CHANGE", note: "Le terme juridique est « conditions générales ».", suggestion: "Conditions générales d’utilisation", reviewerName: null, reviewedAt: at },
  { locale: "fr", key: "kit.common.close", text: UI_KIT_LABELS_FR.common.close, referenceText: "Close", verdict: "APPROVED", note: null, suggestion: null, reviewerName: "Amélie", reviewedAt: at },
  // The English reference moved on since this was approved.
  { locale: "fr", key: "kit.combobox.resultCount(3)", text: UI_KIT_LABELS_FR.combobox.resultCount(3), referenceText: "3 hits", verdict: "APPROVED", note: null, suggestion: null, reviewerName: "Amélie", reviewedAt: at },
  { locale: "it", key: "common.save", text: "Salva", referenceText: "Save", verdict: "APPROVED", note: null, suggestion: null, reviewerName: "Giulia", reviewedAt: at },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function TranslationReviewDemo() {
  const [reviews, setReviews] = useState<TranslationReview[]>(SEED);
  const [locale, setLocale] = useState("fr");
  const [refuse, setRefuse] = useState(false);
  const [legalOnly, setLegalOnly] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const areas = useMemo(() => (legalOnly ? ["legal"] : null), [legalOnly]);

  const reference = useMemo(() => strings("en"), []);
  const rowsByLocale = useMemo(
    () =>
      new Map(
        LOCALES.map(({ value }) => [
          value,
          translationRows({
            locale: value,
            strings: strings(value),
            reference,
            reviews,
            areas,
            sourceOf: (key) => (key.startsWith("kit.") ? "kit" : "app"),
          }),
        ]),
      ),
    [reference, reviews, areas],
  );
  const current = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  // The app's request, here a timeout: answers with the rows it wrote, which the page
  // merges into its copy — as keksdose's cache patch does.
  const save = async (writes: TranslationReviewWrite[]) => {
    await wait(500);
    if (refuse) throw new Error("403");
    const now = new Date().toISOString();
    setReviews((prev) => mergeReviews(prev, writes.map((w) => ({ ...w, reviewerName: "You", reviewedAt: now }))));
  };
  const clear = async (keys: TranslationReviewKey[]) => {
    await wait(500);
    if (refuse) throw new Error("403");
    setReviews((prev) => dropReviews(prev, keys));
  };

  return (
    <div className="space-y-6">
      <Example
        label="TranslationReviewPanel — one locale at a time"
        hint="tabs and export span every locale; the panel is the open one"
      >
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TranslationExportButton
              rows={[...rowsByLocale.values()].flat()}
              onExport={(_corrections, file) => void file.text().then(setExported)}
            />
            <Button variant="ghost" aria-pressed={refuse} onClick={() => setRefuse((on) => !on)}>
              {refuse ? "Let saves through again" : "Refuse saves (403)"}
            </Button>
            <Button variant="ghost" aria-pressed={legalOnly} onClick={() => setLegalOnly((on) => !on)}>
              {legalOnly ? "Review every area" : "Limit to legal"}
            </Button>
          </div>
          <TranslationLocaleTabs
            locales={LOCALES.map((l) => ({ ...l, rows: rowsByLocale.get(l.value) ?? [] }))}
            active={locale}
            onChange={setLocale}
          />
          <TranslationReviewPanel
            key={locale}
            rows={rowsByLocale.get(locale) ?? []}
            localeLabel={current.label}
            referenceLabel="English"
            readOnly={current.readOnly}
            onSave={save}
            onClear={clear}
            areas={areas}
            areaLabels={{ legal: "the legal pages (Imprint, Privacy Policy, Terms of Service)" }}
            sourceLabels={{ app: "The app’s", kit: "The kit’s" }}
            formatError={(error) =>
              error instanceof Error && error.message === "403"
                ? "The server refused: that key is outside your review."
                : "Saving failed."
            }
          />
          {exported && (
            <pre className="max-h-64 overflow-auto rounded-md bg-[var(--bg-hover)] p-3 font-mono text-xs text-[var(--text-secondary)]">
              {exported}
            </pre>
          )}
          <Note>
            Rows come from {code("translationRows({ locale, strings, reference, reviews, areas })")}: the app&apos;s
            bundle through {code("flattenStrings")}, the kit&apos;s words through{" "}
            {code("flattenStrings(kitLabelStrings(labels), \"kit.\")")}, and whichever reference THIS app reads
            against. Shown here: a verdict on an older wording ({code("budget.rta")}) and on an older reference (
            {code("kit.combobox.resultCount(3)")}) read “Changed since review”; {code("common.items")} lost its{" "}
            {code("{{count}}")} and {code("legal.privacy_intro")} its {code("<1>")} link; French lacks{" "}
            {code("budget.goal_hint")}, so it is Missing and can only get a suggested translation. Refuse saves, then
            send a string back: the editor keeps its text and shows the error. The server&apos;s snake_case maps
            through {code("fromApiReview")} / {code("toApiWrite")}.
          </Note>
        </div>
      </Example>

      <Example label="ReviewStatusChip — the vocabulary" hint="the work queue's order">
        <div className="flex flex-wrap gap-2">
          {REVIEW_STATUSES.map((status) => (
            <ReviewStatusChip key={status} status={status} />
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Tones: {REVIEW_STATUSES.map((s) => `${s} ${REVIEW_STATUS_TONES[s]}`).join(" · ")}
        </p>
      </Example>
    </div>
  );
}
