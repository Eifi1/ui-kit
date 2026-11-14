import { useQuery } from "@tanstack/react-query";
import { Languages } from "lucide-react";
import type { ReactNode } from "react";

import { AlertBanner } from "../components/alert-banner";
import { EmptyState } from "../components/empty-state";
import { DEFAULT_LEGAL_LABELS } from "../components/legal-labels";
import type { LegalOperator } from "../components/legal";
import { LoadingState } from "../components/loading-state";
import { PageHeader } from "../components/page-header";
import { toast } from "../components/toast";
import { TranslationReviewPanel } from "../components/translation-review";
import { TranslationExportButton, TranslationLocaleTabs } from "../components/translation-review-parts";
import { useSearchParamState, useSearchParamsState } from "../hooks/use-search-param-state";
import { DEFAULT_UI_KIT_LABELS } from "../i18n/defaults";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { KIT_LANGUAGES, loadUiKitLabels } from "../i18n/languages";
import { kitLabelStrings } from "../i18n/review";
import {
  REVIEW_STATUSES,
  flattenStrings,
  fromApiReview,
  reviewAreaOf,
  toApiWrite,
  translationRows,
} from "../lib/translation-review";
import type { ReviewStatus, TranslationReviewFilter, TranslationRow } from "../lib/translation-review";
import { useDescribeAccountFailure } from "./account-failure";
import { DEFAULT_ACCOUNT_TRANSLATIONS_LABELS } from "./account-translations-labels";
import type { AccountTranslationsLabels } from "./account-translations-labels";
import { accountQueryKeys } from "./accounts-context";
import { useTranslationReviews } from "./accounts-hooks";

/** The kit's own words ride in the review under `kit.` — they share every screen with the
 *  app's, so a reviewer reading the French reads both. Fixes to them go upstream, to the kit;
 *  the spelling is the one every app shares, so a verdict means the same string everywhere. */
const KIT_PREFIX = "kit.";
/** The heading every kit string stands under, but for a review area's (`kit.legal.…`). */
const KIT_GROUP = "kit";

/** What {@link AccountTranslationReview} takes. */
export interface AccountTranslationReviewProps {
  /** One language's own strings, as the app ships them — its catalogue, a tree or flat. The
   *  page reads them through this, so the list cannot drift from what readers see. */
  loadStrings: (code: string) => Promise<Readonly<Record<string, unknown>>>;
  /** The kit's words under `kit.` beside the app's (default on). `{ operator }` reads the
   *  legal sections that name the operator as the page shows them, not as `{{name}}`. */
  kitWords?: boolean | { operator?: LegalOperator };
  /** What a language is read against. Default: English — and English against German. */
  referenceOf?: (code: string) => string;
  /** The areas a reviewer may be limited to: the server's `review_areas`, which a grant is
   *  checked against. Default `["legal"]`. An area's strings stand under their own heading. */
  reviewAreas?: readonly string[];
  /** Each area's word, on the filter and as its heading. `legal` defaults to the kit's word
   *  for the legal pages. */
  areaLabels?: Readonly<Record<string, string>>;
  /** The language's name. Default: its own (`Français`), from the kit's registry. */
  languageLabel?: (code: string) => string;
  /** The corrections' file, before the date: `<exportName>-translation-corrections-<date>.json`.
   *  Left out: no export button. */
  exportName?: string;
  /** The panel's sort and page size kept in the browser under this key (DataTable's
   *  `storageKey`). Left out, nothing is stored. */
  storageKey?: string;
  /** Over the header's own words. */
  title?: ReactNode;
  description?: ReactNode;
  labels?: LabelOverride<AccountTranslationsLabels>;
  className?: string;
}

const englishFirst = (code: string) => (code === "en" ? "de-CH" : "en");
/** The list's 403: the server grants this viewer no language — an answer, said as one. */
const isForbidden = (error: unknown) => (error as { response?: { status?: number } })?.response?.status === 403;
const nativeName = (code: string) => KIT_LANGUAGES.find((language) => language.code === code)?.nativeName ?? code;

/**
 * `/translations` (server-kit 0.31's `translation_review_router`): a native speaker reads the
 * app's wording and the kit's in their language beside the reference, and approves it or says
 * what should change. Kurvenschmiede's `TranslationsPage`, about 300 lines each app wrote around
 * the kit's review parts, once.
 *
 * Who may review what is the server's: an admin every language, a reviewer the languages and
 * possibly the areas an admin granted, anyone else nothing — the page then says so. The strings
 * come from what the app ships (`loadStrings`) and the kit's catalogues; the server keeps only
 * the verdicts, each with the wording it was given on. Corrections are never applied here — the
 * catalogues are source code — but exported as a file a developer applies. The language, the
 * filters and the search live in the address, so a link can say "the French legal strings that
 * need a change"; nothing is kept in the browser unless the app names a `storageKey`.
 */
export function AccountTranslationReview({
  loadStrings,
  kitWords = true,
  referenceOf = englishFirst,
  reviewAreas = ["legal"],
  areaLabels,
  languageLabel = nativeName,
  exportName,
  storageKey,
  title,
  description,
  labels: labelsProp,
  className,
}: AccountTranslationReviewProps) {
  const labels = useKitLabels("accountTranslations", DEFAULT_ACCOUNT_TRANSLATIONS_LABELS, labelsProp);
  const legal = useKitLabels("legal", DEFAULT_LEGAL_LABELS);
  const describe = useDescribeAccountFailure();
  const locale = useKitLocale();
  const { list, save, clear } = useTranslationReviews();

  const allowed = list.data?.locales ?? [];
  const areas = list.data?.areas ?? null;
  const needed = [...new Set([...allowed, ...allowed.map(referenceOf)])].sort();
  const operator = typeof kitWords === "object" ? kitWords.operator : undefined;
  const strings = useQuery({
    queryKey: [...accountQueryKeys.translationStrings, ...needed],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          needed.map(async (code) => {
            const own = flattenStrings(await loadStrings(code));
            if (kitWords === false) return [code, own] as const;
            const kit = await loadUiKitLabels(code).catch(() => DEFAULT_UI_KIT_LABELS);
            return [
              code,
              { ...own, ...flattenStrings(kitLabelStrings(kit, { operator, locale: code }), KIT_PREFIX) },
            ] as const;
          }),
        ),
      ),
    enabled: needed.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const [requested, setRequested] = useSearchParamState("locale", "");
  const active = allowed.includes(requested) ? requested : (allowed[0] ?? "");
  // One state object with one setter: the panel reports every filter on every change.
  const [filter, setFilter] = useSearchParamsState<TranslationReviewFilter>({
    status: {
      default: "all",
      parse: (raw) => ((REVIEW_STATUSES as readonly string[]).includes(raw) ? (raw as ReviewStatus) : undefined),
    },
    source: { default: "all" },
    namespace: { param: "ns", default: "all" },
    // Typing is not a step anybody wants Back to walk through, letter by letter.
    query: { param: "q", default: "", history: "replace" },
    placeholdersOnly: {
      param: "placeholders",
      default: false,
      parse: (raw) => (raw === "1" ? true : undefined),
      serialize: (on) => (on ? "1" : null),
    },
  });

  // An app key's area is its first segment; a kit key's its kit namespace — unless it belongs
  // to a review area, as `kit.legal.…` does: a lawyer reads the kit's legal half beside the app's.
  const namespaceOf = (key: string) =>
    reviewAreaOf(key, reviewAreas) ?? (key.startsWith(KIT_PREFIX) ? key.split(".", 2).join(".") : key.split(".", 1)[0]);
  const sourceOf = (key: string) => (key.startsWith(KIT_PREFIX) ? "kit" : "app");
  const groupOf = (row: TranslationRow) =>
    row.source === "kit" && !reviewAreas.includes(row.namespace) ? KIT_GROUP : row.namespace;
  const areaWord = (area: string) => areaLabels?.[area] ?? (area === "legal" ? legal.navLabel : area);

  const verdicts = (list.data?.reviews ?? []).map(fromApiReview);
  const rowsByLocale = new Map<string, TranslationRow[]>(
    strings.data
      ? allowed.map((code) => [
          code,
          translationRows({
            locale: code,
            strings: strings.data[code] ?? {},
            reference: strings.data[referenceOf(code)] ?? {},
            reviews: verdicts.filter((review) => review.locale === code),
            namespaceOf,
            sourceOf,
            areas,
          }),
        ])
      : [],
  );
  const allRows = [...rowsByLocale.values()].flat();

  const header = (
    <PageHeader
      size="sm"
      title={title ?? labels.title}
      description={description ?? labels.description}
      actions={
        exportName && list.data && strings.data ? (
          <TranslationExportButton
            rows={allRows}
            locales={allowed}
            fileName={`${exportName}-translation-corrections-${new Date().toISOString().slice(0, 10)}.json`}
          />
        ) : undefined
      }
    />
  );

  const body = (() => {
    // The server's answer to a viewer with no grant is a 403; an admin gets every language.
    if (list.isError || (list.data && allowed.length === 0)) {
      return list.isError && !isForbidden(list.error) ? (
        <AlertBanner>{describe(list.error)}</AlertBanner>
      ) : (
        <EmptyState
          icon={<Languages className="size-8" aria-hidden />}
          title={labels.noAccess}
          hint={labels.noAccessHint}
        />
      );
    }
    if (strings.isError) return <AlertBanner>{describe(strings.error)}</AlertBanner>;
    if (list.isPending || strings.isPending) return <LoadingState className="py-16" />;
    return (
      <>
        {allowed.length > 1 && (
          <TranslationLocaleTabs
            locales={allowed.map((code) => ({
              value: code,
              label: languageLabel(code),
              rows: rowsByLocale.get(code) ?? [],
            }))}
            active={active}
            onChange={setRequested}
          />
        )}
        <TranslationReviewPanel
          // A new language is a new list: the editor and the selection were the old one's.
          key={active}
          rows={rowsByLocale.get(active) ?? []}
          localeLabel={languageLabel(active)}
          referenceLabel={languageLabel(referenceOf(active))}
          // The panel shows a rejection itself — an editor keeps its text, a selection stays —
          // and toasts an approval with its Undo; only an untoasted success says "Saved" here.
          onSave={(writes, { toasted }) =>
            save.mutateAsync(writes.map(toApiWrite)).then(() => {
              if (!toasted) toast.success(labels.saved);
            })
          }
          onClear={(keys, { toasted }) =>
            clear.mutateAsync(keys).then(() => {
              if (!toasted) toast.success(labels.cleared);
            })
          }
          // A swiped card approves or opens the editor; the strings stand under one heading
          // per area, each with "Approve unreviewed".
          swipe
          groupBy={groupOf}
          groupLabel={(group) => (group === KIT_GROUP ? labels.sourceKit : areaWord(group))}
          areas={areas}
          areaLabels={Object.fromEntries(reviewAreas.map((area) => [area, areaWord(area)]))}
          sourceLabels={{ app: labels.sourceApp, kit: labels.sourceKit }}
          filter={filter}
          onFilterChange={setFilter}
          storageKey={storageKey}
          formatDate={(iso) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
          formatError={(error) => describe(error)}
        />
      </>
    );
  })();

  return (
    <div className={["space-y-4", className].filter(Boolean).join(" ")}>
      {header}
      {body}
    </div>
  );
}
