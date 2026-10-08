import type { ReactNode } from "react";
import { Select } from "./ui";
import type { SelectProps } from "./ui";
import { ToggleGroup } from "./toggle-group";
import type { ToggleGroupBaseProps } from "./toggle-group";
import type { ThemePreference } from "../theme/theme-store";
import { TEXT_SIZES } from "../theme/text-size";
import type { TextSize } from "../theme/text-size";
import { CONTRAST_MODES } from "../theme/contrast";
import type { ContrastMode } from "../theme/contrast";
import { useAppearanceLabels } from "./appearance-labels";
import type { AppearanceLabels } from "./appearance-labels";

/**
 * App-agnostic settings-field components (feedback #333): the language + theme
 * controls that every app's settings page needs — and, since 0.32, the text size and
 * the contrast (docs/text-size-harmonization.md §6), whose words are the kit's own
 * `appearance` namespace — so they live in @hb/ui and the app just supplies the
 * current value, a change handler and translated labels.
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
 * `labelPlacement`, `disabledReason`, `commit`, `size`, `overflow` — minus the options
 * and the value, which this owns.
 *
 * The options wrap rather than truncate (`overflow="wrap"`), as in its two siblings
 * {@link TextSizeSetting} and {@link ContrastSetting} (0.32.1, Kurvenschmiede's 0.32
 * report: "Syst… Li… D…" in a card at Extra large on a 360 px phone).
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
    const { variant: _variant, value, onChange, label, optionLabels, overflow = "wrap", ...rest } = props;
    return (
      <ToggleGroup<ThemePreference>
        {...rest}
        overflow={overflow}
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

/**
 * What {@link TextSizeSetting} and {@link ContrastSetting} take: a {@link ToggleGroup}'s
 * props — `labelPlacement`, `disabledReason`, `commit`, `size`, `overflow` — minus the
 * options and the value, which they own, as {@link ThemeSettingToggleProps} does.
 */
type AppearanceToggleProps<T extends string> = Omit<ToggleGroupBaseProps<T>, "options" | "label" | "ariaLabel"> & {
  value: T;
  onChange: (value: T) => void;
  /**
   * The field's visible label. Leave it out inside a row already titled with the
   * setting's name: the group is then named by `aria-label` / `aria-labelledby` if
   * given, else by the kit's own word ("Text size", "Contrast").
   */
  label?: ReactNode;
  /** The `appearance` namespace, for this instance. */
  labels?: Partial<AppearanceLabels>;
};

export type TextSizeSettingProps = AppearanceToggleProps<TextSize>;

/**
 * The text size (0.32, docs/text-size-harmonization.md §6): Normal, Large, Extra large as
 * one segmented control, in the core `appearance` group after the theme. Bind it to the
 * size IN FORCE — `useAccountAppearance().textSize` — and hand a pick to its
 * `pickTextSize`, which stores the device's choice and, signed in, the account's.
 *
 * The options wrap rather than truncate (`overflow="wrap"`): at Extra large on a 360 px
 * phone the group has 240 px, and "Extra large" cut to "Extra l…" would be the one
 * setting that cannot read its own value.
 */
export function TextSizeSetting({ value, onChange, label, labels: labelsProp, overflow = "wrap", ...rest }: TextSizeSettingProps) {
  const labels = useAppearanceLabels(labelsProp);
  const named = label !== undefined && label !== null && label !== false;
  return (
    <ToggleGroup<TextSize>
      {...rest}
      aria-label={named || rest["aria-labelledby"] ? rest["aria-label"] : (rest["aria-label"] ?? labels.textSize)}
      label={label}
      overflow={overflow}
      value={value}
      onChange={onChange}
      options={TEXT_SIZES.map((size) => ({ value: size, label: labels.textSizes[size] }))}
    />
  );
}

export type ContrastSettingProps = AppearanceToggleProps<ContrastMode>;

/**
 * More contrast (0.32, §5, §6): System, Standard, More as one segmented control, beside
 * the text size. Bind it to the stored MODE, "system" included — never to whether more
 * contrast is on at the moment, or a device that asks for more contrast would show
 * "More" and could not say "follow the device" (the theme's lesson, §8 of the settings
 * contract). `useAccountAppearance().contrast` is that mode.
 */
export function ContrastSetting({ value, onChange, label, labels: labelsProp, overflow = "wrap", ...rest }: ContrastSettingProps) {
  const labels = useAppearanceLabels(labelsProp);
  const named = label !== undefined && label !== null && label !== false;
  return (
    <ToggleGroup<ContrastMode>
      {...rest}
      aria-label={named || rest["aria-labelledby"] ? rest["aria-label"] : (rest["aria-label"] ?? labels.contrast)}
      label={label}
      overflow={overflow}
      value={value}
      onChange={onChange}
      options={CONTRAST_MODES.map((mode) => ({ value: mode, label: labels.contrastModes[mode] }))}
    />
  );
}
