import { useState } from "react";
import type { ReactNode } from "react";
import { useKitLabels } from "../i18n/kit-labels";
import { KIT_LANGUAGES } from "../i18n/languages";
import type { KitLanguageCode } from "../i18n/languages";
import { AlertBanner } from "../components/alert-banner";
import { CheckboxGroup } from "../components/checkbox-group";
import type { CheckboxGroupOption } from "../components/checkbox-group";
import { FormActions } from "../components/form-actions";
import { Caption } from "../components/text";
import { hasMessage } from "./admin-parts";
import type { MaybePromise } from "./admin-parts";

/**
 * Who may review which translations: the REVIEWER role and its scope, in one editor
 * (docs/user-admin-harmonization.md §4.1 `PUT /admin/users/{id}/reviewer {locales, areas}`,
 * §7). It replaces three: keksdose's `user-reviewer-role.tsx` (a checkbox per language,
 * saved on each click), Kurvenschmiede's `reviewer-dialog.tsx` (a `CheckboxGroup` in a
 * dialog with Save) and kastlan's platform column.
 *
 * - **Languages** are the scope. Ticking none takes the role away — that is how both
 *   apps remove a reviewer — and the editor says so under the boxes.
 * - **Areas** narrow it: "Only the legal pages" (Imprint, Privacy Policy, Terms) for a
 *   lawyer, who reads law, not French. An area only means something beside at least one
 *   language, so the areas wait for one. Saved as `areas: null` when none is ticked —
 *   server-kit's "every area" — never `[]`, which would be "no area at all".
 *
 * A draft with Save, not a save per click: keksdose saved every tick, and two quick ticks
 * could land as a set nobody chose; one Save sends the whole scope, in the languages'
 * order (CheckboxGroup's), so the answer equals the request and the row does not
 * reshuffle on refetch. The server keeps its rules (an admin reviews everything already,
 * a customer is not given the role): `disabledReason` says them here.
 */

/** A reviewer's scope — the request body of `PUT …/reviewer`. */
export interface ReviewerScope {
  /** Language codes, in the editor's order. Empty: not a reviewer. */
  locales: string[];
  /** The areas the scope is narrowed to; `null` = every area (server-kit's rule). */
  areas: string[] | null;
}

/** One area the scope can be narrowed to. */
export interface ReviewerScopeArea {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
}

/** One language the editor offers, when the app's list is not the kit's codes. */
export interface ReviewerScopeLanguage {
  value: string;
  label: ReactNode;
}

/** The `reviewerScope` namespace. */
export interface ReviewerScopeLabels {
  /** The language group's legend. */
  languages: string;
  /** Under the languages. */
  hint: string;
  /** Under the languages while none is ticked. */
  none: string;
  /** The area group's legend. */
  areas: string;
  /** The default area, `legal`. */
  legalOnly: string;
  legalOnlyHint: string;
  /** A rejected save, unless `describeError` says better. */
  failed: string;
}

export const DEFAULT_REVIEWER_SCOPE_LABELS: ReviewerScopeLabels = {
  languages: "Languages",
  hint: "Tick the languages this person reviews.",
  none: "No language: saving takes the reviewer role away.",
  areas: "Limit to",
  legalOnly: "Only the legal pages",
  legalOnlyHint: "Imprint, Privacy Policy and Terms — for a lawyer rather than a native speaker.",
  failed: "The reviewer scope couldn’t be saved. Please try again.",
};

export interface ReviewerScopeEditorProps {
  /** The scope the server has — the draft starts from it. Key the editor by the
   *  account (`key={user.id}`) so another account starts a fresh draft. */
  value: { locales?: readonly string[] | null; areas?: readonly string[] | null };
  /** Sends the scope. A promise keeps the editor busy, and a rejection keeps the draft
   *  and shows why. */
  onSave: (scope: ReviewerScope) => MaybePromise;
  /** A Cancel beside Save — a dialog's way out. */
  onCancel?: () => void;
  /**
   * The languages offered: kit codes (named by the kit's registry, each in its own
   * language — "Deutsch", "Français") or the app's own `{ value, label }` rows. Default:
   * all seven of the kit's.
   */
  languages?: readonly KitLanguageCode[] | readonly ReviewerScopeLanguage[];
  /** The areas the scope can be narrowed to. Default: `legal` alone. `[]` for none. */
  areas?: readonly ReviewerScopeArea[];
  /** Why the scope cannot be changed for this account ("Administrators review every
   *  language already"). Every box says it; there is no Save. */
  disabledReason?: ReactNode;
  /** The app's words for a failed save. */
  describeError?: (error: unknown) => ReactNode | undefined;
  /** Over the languages: what the role is, in the app's words. */
  intro?: ReactNode;
  /** Columns for the languages from `sm` up. Default 2 (Kurvenschmiede's dialog). */
  columns?: 1 | 2 | 3 | 4;
  /** Save COMMITS: under a locked `WriteLockProvider` it is held with the lock's reason. */
  commit?: boolean;
  labels?: Partial<ReviewerScopeLabels>;
}

function languageOptions(languages: ReviewerScopeEditorProps["languages"]): CheckboxGroupOption[] {
  const rows = languages ?? KIT_LANGUAGES.map((language) => language.code);
  return rows.map((row) => {
    if (typeof row !== "string") return { value: row.value, label: row.label };
    const language = KIT_LANGUAGES.find((entry) => entry.code === row);
    return {
      value: row,
      // Each name in its own language, marked so a screen reader says it so.
      label: language ? <span lang={language.formatLocale}>{language.nativeName}</span> : row,
    };
  });
}

/** The same set, regardless of order. */
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const seen = new Set(a);
  return b.every((x) => seen.has(x));
}

export function ReviewerScopeEditor({
  value,
  onSave,
  onCancel,
  languages,
  areas: areasProp,
  disabledReason,
  describeError,
  intro,
  columns = 2,
  commit,
  labels: labelsProp,
}: ReviewerScopeEditorProps) {
  const labels = useKitLabels("reviewerScope", DEFAULT_REVIEWER_SCOPE_LABELS, labelsProp);
  const areaOptions: readonly ReviewerScopeArea[] =
    areasProp ?? [{ value: "legal", label: labels.legalOnly, hint: labels.legalOnlyHint }];
  const savedLocales = [...(value.locales ?? [])];
  const savedAreas = [...(value.areas ?? [])];
  const [locales, setLocales] = useState<string[]>(savedLocales);
  const [areas, setAreas] = useState<string[]>(savedAreas);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ReactNode>(null);
  const locked = hasMessage(disabledReason);

  const nextAreas = locales.length === 0 ? [] : areas;
  const dirty = !sameSet(locales, savedLocales) || !sameSet(nextAreas, locales.length === 0 ? [] : savedAreas);

  const save = () => {
    if (pending || locked || !dirty) return;
    const scope: ReviewerScope = {
      locales,
      areas: locales.length > 0 && areas.length > 0 ? areas : null,
    };
    setFailure(null);
    let result: MaybePromise;
    try {
      result = onSave(scope);
    } catch (error) {
      setFailure(describeError?.(error) ?? labels.failed);
      return;
    }
    if (!result || typeof result.then !== "function") return;
    setPending(true);
    result.then(
      () => setPending(false),
      (error: unknown) => {
        setPending(false);
        const own = describeError?.(error);
        setFailure(hasMessage(own) ? own : labels.failed);
      },
    );
  };

  return (
    <div className="space-y-3">
      {intro && <div className="text-sm text-[var(--text-secondary)]">{intro}</div>}
      <CheckboxGroup
        legend={labels.languages}
        options={languageOptions(languages)}
        value={locales}
        onChange={(next) => {
          setFailure(null);
          setLocales(next);
        }}
        columns={columns}
        hint={locked ? undefined : locales.length === 0 ? labels.none : labels.hint}
        disabledReason={disabledReason}
      />
      {areaOptions.length > 0 && (
        <CheckboxGroup
          legend={labels.areas}
          options={areaOptions.map((area) => ({ value: area.value, label: area.label, hint: area.hint }))}
          value={nextAreas}
          onChange={(next) => {
            setFailure(null);
            setAreas(next);
          }}
          // An area narrows a language scope; with no language there is none to narrow.
          disabled={locales.length === 0}
          disabledReason={disabledReason}
        />
      )}
      {failure && (
        <AlertBanner tone="danger" size="sm">
          {failure}
        </AlertBanner>
      )}
      {locked ? (
        <Caption>{disabledReason}</Caption>
      ) : (
        <FormActions
          onSubmit={save}
          onCancel={onCancel}
          pending={pending}
          submitDisabled={!dirty}
          commit={commit}
        />
      )}
    </div>
  );
}
