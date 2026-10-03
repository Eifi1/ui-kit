import { useMemo, useState } from "react";
import { Button, ToggleGroup, WriteLockProvider } from "@eifi1/ui-kit";
import { TranslationReviewPanel } from "../../../src/components/translation-review";
import type { TranslationReviewSaveInfo } from "../../../src/components/translation-review";
import {
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
 * 0.25 — swiping and grouping in the translation review (keksdose live #377, Marcel
 * reviewing on a phone: "Add swiping. And also grouping to the translation review entries
 * for faster reviewing."). The "server" is component state and a timeout; the strings are
 * a few dozen keksdose-style ones in four areas.
 *
 * 0.25.1 — "Many areas" swaps in a catalogue of keksdose's shape (122 areas, ~4700
 * synthetic strings), on which 0.25.0 opened every group on a wide screen; and the
 * "Groups start" switch is `defaultGroupsOpen`.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const EN = {
  budget: {
    rta: "Ready to Assign",
    assigned: "Assigned",
    activity: "Activity",
    available: "Available",
    overspent: "Overspent by {{amount}}",
    goal: "Goal",
    move: "Move money",
    hide: "Hide category",
    funded: "Funded",
    underfunded: "Underfunded",
    this_month: "This month",
    next_month: "Next month",
    copy_last: "Copy last month’s budget",
    age: "Age of money",
  },
  accounts: {
    title: "Accounts",
    balance: "Balance",
    reconcile: "Reconcile",
    cleared: "Cleared",
    uncleared: "Uncleared",
    add: "Add account",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    items: "{{count}} items",
    loading: "Loading…",
  },
  legal: { terms: "Terms of Service", privacy: "Privacy Policy", imprint: "Imprint" },
};

const FR = {
  budget: {
    rta: "À attribuer",
    assigned: "Attribué",
    activity: "Activité",
    available: "Disponible",
    overspent: "Dépassement de {{amount}}",
    goal: "Objectif",
    move: "Déplacer de l’argent",
    // `hide` is missing: French lacks it.
    funded: "Financé",
    underfunded: "Sous-financé",
    this_month: "Ce mois-ci",
    next_month: "Le mois prochain",
    copy_last: "Copier le budget du mois dernier",
    age: "Âge de l’argent",
  },
  accounts: {
    title: "Comptes",
    balance: "Solde",
    reconcile: "Rapprocher",
    cleared: "Pointé",
    uncleared: "Non pointé",
    add: "Ajouter un compte",
  },
  common: {
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    items: "des éléments",
    loading: "Chargement…",
  },
  legal: { terms: "Conditions d’utilisation", privacy: "Politique de confidentialité", imprint: "Mentions légales" },
};

const at = "2026-09-28T09:30:00Z";
const SEED: TranslationReview[] = [
  { locale: "fr", key: "common.save", text: "Enregistrer", referenceText: "Save", verdict: "APPROVED", note: null, suggestion: null, reviewerName: "Example Reviewer", reviewedAt: at },
  { locale: "fr", key: "budget.rta", text: "A attribuer", referenceText: "Ready to Assign", verdict: "APPROVED", note: null, suggestion: null, reviewerName: "Example Reviewer", reviewedAt: at },
  { locale: "fr", key: "legal.terms", text: "Conditions d’utilisation", referenceText: "Terms of Service", verdict: "NEEDS_CHANGE", note: "« conditions générales »", suggestion: "Conditions générales d’utilisation", reviewerName: null, reviewedAt: at },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** keksdose's shape, in synthetic strings: 20 long areas and 102 short ones. Every ninth
 *  French string is missing, every seventh differs from the reference in a placeholder. */
function manyAreas(): { en: Record<string, string>; fr: Record<string, string> } {
  const en: Record<string, string> = {};
  const fr: Record<string, string> = {};
  for (let a = 1; a <= 122; a++) {
    const size = a <= 20 ? 180 + (a % 5) : 5 + (a % 11);
    for (let i = 1; i <= size; i++) {
      const key = `area${String(a).padStart(3, "0")}.string${String(i).padStart(3, "0")}`;
      en[key] = `Example string ${a}.${i} with {{count}}`;
      if ((a + i) % 9) fr[key] = i % 7 ? `Chaîne d’exemple ${a}.${i} avec {{count}}` : `Chaîne d’exemple ${a}.${i}`;
    }
  }
  return { en, fr };
}

type Opening = "auto" | "open" | "folded";

export function TranslationReview025Demo() {
  const [reviews, setReviews] = useState<TranslationReview[]>(SEED);
  const [grouped, setGrouped] = useState(true);
  const [locked, setLocked] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [many, setMany] = useState(false);
  const [opening, setOpening] = useState<Opening>("auto");
  const [log, setLog] = useState<string[]>([]);

  const catalogue = useMemo(() => (many ? manyAreas() : { en: flattenStrings(EN), fr: flattenStrings(FR) }), [many]);
  const rows = useMemo(
    () => translationRows({ locale: "fr", strings: catalogue.fr, reference: catalogue.en, reviews }),
    [catalogue, reviews],
  );

  // What the app's mutation would do: write, patch its copy, and toast "Saved" — except
  // where the panel says it has toasted already (its Undo toast).
  const note = (what: string, info: TranslationReviewSaveInfo) =>
    setLog((prev) => [`${what} — ${info.origin}${info.toasted ? ", the kit toasted" : ", the app would toast “Saved”"}`, ...prev].slice(0, 4));
  const save = async (writes: TranslationReviewWrite[], info: TranslationReviewSaveInfo) => {
    await wait(300);
    const now = new Date().toISOString();
    setReviews((prev) => mergeReviews(prev, writes.map((w) => ({ ...w, reviewerName: "You", reviewedAt: now }))));
    note(`${writes.length} saved`, info);
  };
  const clear = async (keys: TranslationReviewKey[], info: TranslationReviewSaveInfo) => {
    await wait(300);
    setReviews((prev) => dropReviews(prev, keys));
    note(`${keys.length} cleared`, info);
  };

  return (
    <Example
      label="Swipe and group — 0.25"
      hint="on a phone: swipe a card toward the end to approve, toward the start for “Needs a change”"
    >
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" aria-pressed={grouped} onClick={() => setGrouped((on) => !on)}>
            {grouped ? "Show one list" : "Group by area"}
          </Button>
          <Button variant="ghost" aria-pressed={locked} onClick={() => setLocked((on) => !on)}>
            {locked ? "Unlock writes" : "Write lock"}
          </Button>
          <Button variant="ghost" aria-pressed={rtl} onClick={() => setRtl((on) => !on)}>
            {rtl ? "Left to right" : "Right to left"}
          </Button>
          <Button variant="ghost" aria-pressed={many} onClick={() => setMany((on) => !on)}>
            {many ? "Four areas" : "Many areas (122)"}
          </Button>
          <Button variant="ghost" onClick={() => setReviews(SEED)}>
            Start over
          </Button>
        </div>
        {grouped && (
          <div className="max-w-sm">
            <ToggleGroup<Opening>
              aria-label="Groups start"
              size="sm"
              value={opening}
              onChange={setOpening}
              options={[
                { value: "auto", label: "Auto" },
                { value: "open", label: "All open" },
                { value: "folded", label: "All folded" },
              ]}
            />
          </div>
        )}
        <div dir={rtl ? "rtl" : undefined}>
          <WriteLockProvider locked={locked} reason="Read-only demo — saving is disabled.">
            <TranslationReviewPanel
              rows={rows}
              localeLabel="Français"
              referenceLabel="English"
              onSave={save}
              onClear={clear}
              swipe
              groupBy={grouped ? "namespace" : undefined}
              defaultGroupsOpen={opening === "auto" ? "auto" : opening === "open"}
              // The showcase's example heading is an h3.
              groupHeadingAs="h4"
              // The "budget" area's batch (12) is larger than a page, so it asks first. The
              // many areas page as keksdose's do, 50 rows at a time.
              pageSize={many ? 50 : 10}
            />
          </WriteLockProvider>
        </div>
        {log.length > 0 && (
          <ul className="space-y-0.5 font-mono text-xs text-[var(--text-secondary)]" aria-label="Writes">
            {log.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        )}
        <Note>
          {code("swipe")} gives each phone card DataTable&apos;s swipe sides: toward the reading end approves (with
          the kit&apos;s Undo toast), toward the start opens the editor with the cursor in the wording — a string is
          never sent back blind. Every swipe is also a button (Tab onto a card), and there is none under the write
          lock, in a read-only locale, or toward Approve on a missing or approved string. In right-to-left the sides
          mirror. {code("groupBy=\"namespace\"")} puts each area under a heading with “n unreviewed / total” and
          “Approve unreviewed (n)” — one write, one Undo; larger than a page, it asks first. Filters narrow before
          grouping; each area pages on its own; a column sort orders every area alike. On a phone the areas start
          folded. {code("onSave(writes, { origin, toasted })")} tells the app when the kit has toasted, so its own
          “Saved” is skipped. Since 0.25.1 a folded area renders its header only, and on a wide screen the areas
          start folded once opening them all would render more than 100 rows — “Many areas” is keksdose&apos;s
          catalogue, which 0.25.0 opened as 122 tables. {code("defaultGroupsOpen")} ({code("\"auto\"")},{" "}
          {code("true")}, {code("false")}) overrides it; an area the reviewer opens or folds keeps that.
        </Note>
      </div>
    </Example>
  );
}
