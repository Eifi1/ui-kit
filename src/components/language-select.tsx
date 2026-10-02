import { forwardRef } from "react";
import { KIT_LANGUAGES, languageOptions, resolveLanguage } from "../i18n/languages";
import type { KitLanguage, KitLanguageCode } from "../i18n/languages";
import { Select } from "./ui";
import type { SelectProps } from "./ui";

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
 * thing and takes ready-made `{ code, label }` rows. This one is for a language that
 * belongs to something else — an invitation, a mail template, a customer's
 * correspondence — and takes only the CODES: the names come from the kit's registry
 * ({@link languageOptions}), the same "Deutsch", "Français", "简体中文" the switcher shows.
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
 * goes unmarked.
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
}

const ALL_CODES: readonly KitLanguageCode[] = KIT_LANGUAGES.map((language) => language.code);

export const LanguageSelect = forwardRef<HTMLSelectElement, LanguageSelectProps>(function LanguageSelect(
  { value, onChange, codes = ALL_CODES, optionLabel, ...rest },
  ref,
) {
  const shown = resolveLanguage([value], codes);
  return (
    <Select {...rest} ref={ref} value={shown} onChange={(e) => onChange(e.target.value as KitLanguageCode)}>
      {languageOptions(codes).map((option) => {
        const language = KIT_LANGUAGES.find((entry) => entry.code === option.code)!;
        return (
          <option key={option.code} value={option.code} lang={optionLabel ? undefined : language.formatLocale}>
            {optionLabel ? optionLabel(language) : option.label}
          </option>
        );
      })}
    </Select>
  );
});
LanguageSelect.displayName = "LanguageSelect";
