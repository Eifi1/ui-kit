import type { ReactNode } from "react";
import { Select } from "./ui";
import type { SelectProps } from "./ui";
import type { ThemePreference } from "../theme/theme-store";

/**
 * App-agnostic settings-field components (feedback #333): the language + theme
 * controls that every app's settings page needs, so they live in @hb/ui and the
 * app just supplies the current value, a change handler and translated labels.
 * The app owns WHERE these render (its own settings page) and any app-specific
 * fields around them.
 */

/**
 * Everything a {@link Select} takes, minus the two this component owns: the value is a
 * {@link ThemePreference} rather than a string, and `onChange` hands over the preference
 * itself because no caller of this wants the event. The rest — `disabled`, `required`,
 * `invalid`, `error`, a `data-tour` anchor — passes straight through, which is what makes
 * this a settings FIELD rather than a fixed widget.
 */
export interface ThemeSettingProps
  extends Omit<SelectProps, "value" | "onChange" | "children"> {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
  label: ReactNode;
  /** Translated option labels. */
  optionLabels: { system: string; light: string; dark: string };
  id?: string;
}

export function ThemeSetting({ value, onChange, label, optionLabels, id, ...rest }: ThemeSettingProps) {
  return (
    <Select
      {...rest}
      id={id}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as ThemePreference)}
    >
      <option value="system">{optionLabels.system}</option>
      <option value="light">{optionLabels.light}</option>
      <option value="dark">{optionLabels.dark}</option>
    </Select>
  );
}

/** See {@link ThemeSettingProps}: a `Select`'s props with the value and the change
 *  handler re-typed to the language CODE the caller stores. */
export interface LanguageSettingProps
  extends Omit<SelectProps, "value" | "onChange" | "children"> {
  value: string;
  onChange: (code: string) => void;
  label: ReactNode;
  options: { code: string; label: string }[];
  id?: string;
}

export function LanguageSetting({ value, onChange, label, options, id, ...rest }: LanguageSettingProps) {
  return (
    <Select {...rest} id={id} label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
