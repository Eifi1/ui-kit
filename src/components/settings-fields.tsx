import type { ReactNode } from "react";
import { Select } from "./ui";
import type { SelectProps } from "./ui";
import { ToggleGroup } from "./toggle-group";
import type { ToggleGroupBaseProps } from "./toggle-group";
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
  /** The `Select` (default). See {@link ThemeSettingToggleProps} for `"toggle"`. */
  variant?: "select";
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
  label: ReactNode;
  /** Translated option labels. */
  optionLabels: { system: string; light: string; dark: string };
  id?: string;
}

/**
 * `variant="toggle"` (0.31.0, docs/settings-harmonization.md §2.8): the three choices as
 * one segmented control instead of a select — system, light and dark side by side, the
 * choice visible without opening anything, in every app (keksdose offered light and dark
 * only; its store already knew "system"). A {@link ToggleGroup}'s props pass through —
 * `labelPlacement`, `disabledReason`, `commit`, `size` — minus the options and the value,
 * which this owns.
 *
 * Bind it to the PREFERENCE (`"system"` included), never to the resolved mode: on a
 * system-dark device a control bound to the mode shows "dark" and cannot say "follow the
 * system" (keksdose's control, §8).
 */
export interface ThemeSettingToggleProps
  extends Omit<ToggleGroupBaseProps<ThemePreference>, "options" | "label" | "ariaLabel"> {
  variant: "toggle";
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
  /**
   * Names the group: the field's label, or the label above it (`labelPlacement`). Leave
   * it out inside a card already titled "Theme" and name the group with `aria-label` or
   * `aria-labelledby` instead, so the card does not say "Theme" twice.
   */
  label?: ReactNode;
  /** Translated option labels. */
  optionLabels: { system: string; light: string; dark: string };
  id?: string;
}

export function ThemeSetting(props: ThemeSettingProps | ThemeSettingToggleProps) {
  if (props.variant === "toggle") {
    const { variant: _variant, value, onChange, label, optionLabels, ...rest } = props;
    return (
      <ToggleGroup<ThemePreference>
        {...rest}
        label={label}
        value={value}
        onChange={onChange}
        options={[
          { value: "system", label: optionLabels.system },
          { value: "light", label: optionLabels.light },
          { value: "dark", label: optionLabels.dark },
        ]}
      />
    );
  }
  const { variant: _variant, value, onChange, label, optionLabels, id, ...rest } = props;
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
