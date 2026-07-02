import type { ReactNode } from "react";
import { Select } from "./ui";
import type { ThemePreference } from "../theme/theme-store";

/**
 * App-agnostic settings-field components (feedback #333): the language + theme
 * controls that every app's settings page needs, so they live in @hb/ui and the
 * app just supplies the current value, a change handler and translated labels.
 * The app owns WHERE these render (its own settings page) and any app-specific
 * fields around them.
 */

export interface ThemeSettingProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
  label: ReactNode;
  /** Translated option labels. */
  optionLabels: { system: string; light: string; dark: string };
  id?: string;
}

export function ThemeSetting({ value, onChange, label, optionLabels, id }: ThemeSettingProps) {
  return (
    <Select id={id} label={label} value={value} onChange={(e) => onChange(e.target.value as ThemePreference)}>
      <option value="system">{optionLabels.system}</option>
      <option value="light">{optionLabels.light}</option>
      <option value="dark">{optionLabels.dark}</option>
    </Select>
  );
}

export interface LanguageSettingProps {
  value: string;
  onChange: (code: string) => void;
  label: ReactNode;
  options: { code: string; label: string }[];
  id?: string;
}

export function LanguageSetting({ value, onChange, label, options, id }: LanguageSettingProps) {
  return (
    <Select id={id} label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
