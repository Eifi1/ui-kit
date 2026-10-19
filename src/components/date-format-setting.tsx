import type { ReactNode } from "react";
import { Select } from "./select";
import type { SelectProps } from "./select";
import { useAppearanceLabels } from "./appearance-labels";
import type { AppearanceLabels } from "./appearance-labels";
import { useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { DATE_FORMAT_PREFERENCES, dateFormatSample } from "../lib/date-format";
import type { DateFormatPreference } from "../lib/date-format";

/** A {@link Select}'s props minus the value, the change handler and the options, which
 *  this owns. */
export interface DateFormatSettingProps extends Omit<SelectProps, "value" | "onChange" | "children" | "multiple"> {
  value: DateFormatPreference;
  onChange: (value: DateFormatPreference) => void;
  /** The field's label. Default: the kit's `appearance.dateFormat` ("Date format"). */
  label?: ReactNode;
  /** The line under it. Default: the kit's `appearance.dateFormatHelp`; `null` for none. */
  hint?: ReactNode;
  /** The interface language the samples are rendered for — `"auto"`'s sample is that
   *  language's shape. Default: the provider's locale. */
  language?: string;
  /** The `appearance` namespace, for this instance. */
  labels?: LabelOverride<AppearanceLabels>;
}

/**
 * The date format (0.46, keksdose's Settings ▸ Appearance select, feedback #180): "Follow
 * language" and four explicit shapes, each option labelled by the date it produces —
 * 01.08.2026, 01/08/2026, 08/01/2026, 2026-08-01 — rendered live by the resolver the
 * app's dates go through ({@link dateFormatSample}), and `auto` as "Follow language —
 * 01 Aug 2026". The words are the kit's `appearance` namespace; the value and where it
 * is kept are the app's (see `formatDateWithPreference` and `dateFormatterFor`).
 */
export function DateFormatSetting({
  value,
  onChange,
  label,
  hint,
  language,
  labels: labelsProp,
  ...rest
}: DateFormatSettingProps) {
  const labels = useAppearanceLabels(labelsProp);
  const sampleLanguage = useKitLocale(language);
  return (
    <Select
      {...rest}
      label={label ?? labels.dateFormat}
      hint={hint === null ? undefined : (hint ?? labels.dateFormatHelp)}
      value={value}
      onChange={(e) => onChange(e.target.value as DateFormatPreference)}
    >
      {DATE_FORMAT_PREFERENCES.map((preference) => {
        const sample = dateFormatSample(preference, sampleLanguage);
        return (
          <option key={preference} value={preference}>
            {preference === "auto" ? `${labels.dateFormatAuto} — ${sample}` : sample}
          </option>
        );
      })}
    </Select>
  );
}
