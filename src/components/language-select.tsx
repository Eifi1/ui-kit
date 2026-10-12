import { KIT_LANGUAGES, languageOptions, resolveLanguage } from "../i18n/languages";
import type { KitLanguage, KitLanguageCode } from "../i18n/languages";
import { Select } from "./select";
import type { SelectProps } from "./select";

/**
 * A language as a FORM FIELD: one of the codes an app offers, picked in a form beside
 * other fields — label, hint and error like every kit field, controlled, submitted with
 * the rest.
 *
 * Kurvenschmiede's admin invites people by mail, and the invitation goes out in a
 * language the admin picks, because the invitee has no account yet to say theirs
 * (allowlist-panel.tsx: a `Select` with an `<option>` per language, spelled out by
 * hand). Neither language control the kit had fits there: `LanguageMenu` is the top
 * bar's switcher for the reader's OWN language, a flag in a hover menu that changes the
 * page the moment it is picked; `LanguageSetting` is the settings row for the same
 * thing — since 0.34 this field over the app's `{ code, label }` rows. This one is for
 * a language that belongs to something else — an invitation, a mail template, a
 * customer's correspondence — and takes only the CODES: the names come from the kit's
 * registry ({@link languageOptions}), the same "Deutsch", "Français", "简体中文" the
 * switcher shows.
 *
 * Every {@link Select} prop passes through (`label`, `hint`, `error`, `required`,
 * `disabled`, `size`, `name`, `id`, `data-*`); only `value`, `onChange` and the options
 * are this component's.
 *
 * WHAT IT SHOWS FOR `value`. The offered code that answers it, by
 * {@link resolveLanguage}'s rule: so i18next's `resolvedLanguage` can be handed in as it
 * comes, and a stored `de` or `de-AT` shows as the one German, `de-CH`. A value that
 * answers to none of the codes shows the fallback `resolveLanguage` would pick (`de-CH`
 * when offered, else the first code) — where a bare native select would show its first
 * option and say nothing. Either way the field does not write the resolved code back:
 * `onChange` fires when the person picks, as on any field. Keep `value` one of `codes`
 * (resolve it once, where the state starts) and what is shown is what is submitted.
 *
 * Each name is marked with its own language (`lang`), so a screen reader says
 * "Français" in French rather than spelling it in the page's voice. A caller's
 * `optionLabel` (English names for a team-facing list) is in the page's language, and
 * goes unmarked — unless `optionLang="own"` says its names are still each language's
 * own ("Deutsch (Schweiz)").
 */
export interface LanguageSelectProps extends Omit<SelectProps, "value" | "onChange" | "children" | "multiple"> {
  /** The chosen language: one of `codes` — or any tag, shown as the code it resolves to. */
  value: string;
  /** The picked code — always one of `codes`. */
  onChange: (code: KitLanguageCode) => void;
  /** The languages to offer, in the order to list them. Default: all seven
   *  ({@link KIT_LANGUAGES}' order, alphabetical by native name). */
  codes?: readonly KitLanguageCode[];
  /**
   * The text of each option. Default: the language's name in itself — the right name
   * for a reader looking for theirs, and for an admin choosing what an invitee reads.
   * `(language) => language.englishName` for a list read by a team rather than by the
   * language's readers (a reviewer grant), or the app's own words for a code.
   */
  optionLabel?: (language: KitLanguage) => string;
  /**
   * Which language the option texts are in, for the `lang` each option carries.
   * `"own"`: each language's name in itself — the registry's names, or an `optionLabel`
   * that keeps to them (keksdose's "Deutsch (Schweiz)", `LanguageSetting`'s rows).
   * `"page"`: the page's language, unmarked — English names on a list a team reads.
   * Default: `"own"`, or `"page"` with an `optionLabel` (0.34, refactor audit 2026-10,
   * API-7).
   */
  optionLang?: "own" | "page";
}

const ALL_CODES: readonly KitLanguageCode[] = KIT_LANGUAGES.map((language) => language.code);

// `ref` (the `<select>`) rides `rest` onto the Select: a React 19 ref prop since 0.34
// (MOD-4, refactor audit 2026-10), where this was `forwardRef`.
export function LanguageSelect({
  value,
  onChange,
  codes = ALL_CODES,
  optionLabel,
  optionLang = optionLabel ? "page" : "own",
  ...rest
}: LanguageSelectProps) {
  const shown = resolveLanguage([value], codes);
  return (
    <Select {...rest} value={shown} onChange={(e) => onChange(e.target.value as KitLanguageCode)}>
      {languageOptions(codes).map((option) => {
        const language = KIT_LANGUAGES.find((entry) => entry.code === option.code)!;
        return (
          <option key={option.code} value={option.code} lang={optionLang === "own" ? language.formatLocale : undefined}>
            {optionLabel ? optionLabel(language) : option.label}
          </option>
        );
      })}
    </Select>
  );
}
