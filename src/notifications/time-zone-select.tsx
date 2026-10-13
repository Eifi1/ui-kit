import { useMemo } from "react";
import type { ReactNode } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import type { ComboOption } from "../components/combobox-core";
import { InlineEntityCombobox } from "../components/inline-entity-combobox";
import type { CommitScope } from "../components/write-lock";
import { useNotificationsLabels } from "./notification-parts";
import type { NotificationRegionLabels, NotificationsLabels } from "./notifications-labels";

/**
 * This device's IANA zone ("Europe/Zurich"), or `"UTC"` where the runtime names none —
 * the zone quiet hours are entered in the first time (§2.6), and the one the card offers
 * when it differs from the account's.
 */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Every zone the runtime lists; `[]` where `Intl.supportedValuesOf` is missing. */
function runtimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  return typeof intl.supportedValuesOf === "function" ? intl.supportedValuesOf("timeZone") : [];
}

/** "Argentina/Buenos_Aires" → "Argentina / Buenos Aires": the zone's city, as a row. */
function cityOf(rest: string): string {
  return rest.replace(/_/g, " ").replace(/\//g, " / ");
}

/**
 * The zone picker's rows (keksdose `notifications-card.tsx:131-146`): every zone `Intl`
 * lists, as its city ("Argentina / Buenos Aires") under its region, the region named by
 * `regionLabel` — which answers `undefined` for a region it does not know, and the region
 * keeps its IANA name. A zone with no region ("UTC") comes first, ahead of every heading,
 * rather than trailing the last group as if it were Pacific. `current` is kept even when
 * the runtime does not list it (an old alias such as "Europe/Kiev"): a picker without its
 * own value would show an empty field.
 */
export function timeZoneOptions(
  current: string,
  regionLabel: (region: string) => string | undefined,
): ComboOption<string>[] {
  const zones = runtimeZones();
  const all = !current || zones.includes(current) ? zones : [...zones, current].sort();
  const rows = all.map((zone): ComboOption<string> => {
    const slash = zone.indexOf("/");
    if (slash < 0) return { value: zone, label: zone };
    const region = zone.slice(0, slash);
    return { value: zone, label: cityOf(zone.slice(slash + 1)), group: regionLabel(region) ?? region };
  });
  return [...rows.filter((row) => !row.group), ...rows.filter((row) => row.group)];
}

/** The region's name in `regions`, or `undefined` for one the labels do not know.
 *  @internal Not part of the barrel. */
export function regionName(regions: NotificationRegionLabels, region: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(regions, region)
    ? regions[region as keyof NotificationRegionLabels]
    : undefined;
}

/** A zone as the picker shows it, for a sentence: "Europe / Zurich", the region in the
 *  kit's words. @internal Not part of the barrel. */
export function zoneName(zone: string, regions: NotificationRegionLabels): string {
  const slash = zone.indexOf("/");
  if (slash < 0) return zone;
  const region = zone.slice(0, slash);
  return `${regionName(regions, region) ?? region} / ${cityOf(zone.slice(slash + 1))}`;
}

export interface TimeZoneSelectProps {
  /** The IANA zone. Not clearable: a zone can be changed, never emptied. */
  value: string;
  /** The zone picked. Never called for the value it already has. */
  onChange: (zone: string) => void;
  /** Default `labels.timeZone`. */
  label?: ReactNode;
  disabled?: boolean;
  /** The input's id. */
  id?: string;
  className?: string;
  /** The picker SAVES on change (quiet hours do): locked under a write lock in scope. */
  commit?: CommitScope;
  labels?: LabelOverride<NotificationsLabels>;
}

/**
 * An IANA time zone, searchable (docs/notifications-harmonization.md §4.2, keksdose's
 * quiet-hours picker): type "Zur" for Europe/Zurich, and on a phone the kit's sheet with
 * a search box instead of a 400-row wheel. Rows are the city under its region, the region
 * in the kit's words (`labels.regions`); a zone with no region first; a stored zone the
 * runtime does not list is kept. On the kit's {@link InlineEntityCombobox}.
 */
export function TimeZoneSelect({
  value,
  onChange,
  label,
  disabled,
  id,
  className,
  commit,
  labels: labelsProp,
}: TimeZoneSelectProps) {
  const labels = useNotificationsLabels(labelsProp);
  const { regions } = labels;
  const options = useMemo(() => timeZoneOptions(value, (region) => regionName(regions, region)), [value, regions]);
  return (
    <InlineEntityCombobox<string>
      id={id}
      label={label ?? labels.timeZone}
      value={value}
      options={options}
      disabled={disabled}
      commit={commit}
      onChange={(zone) => {
        if (zone && zone !== value) onChange(zone);
      }}
      className={className}
    />
  );
}
