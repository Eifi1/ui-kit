import { useMemo, useState } from "react";
import {
  DateFormatSetting,
  DatePicker,
  UiKitProvider,
  dateFormatterFor,
  formatDateTimeWithPreference,
  formatDateWithPreference,
} from "@eifi1/ui-kit";
import type { DateFormatPreference } from "@eifi1/ui-kit";
import { useLocale } from "../i18n";
import { Example, Note, Row, code, READOUT } from "../lib/section";

/**
 * 0.46: an app's date format, lifted (Settings ▸ Appearance). The
 * preference is this demo's state; an app keeps it per device.
 */
export function DateFormatDemo() {
  const { code: locale } = useLocale();
  const [preference, setPreference] = useState<DateFormatPreference>("auto");
  const [day, setDay] = useState("2026-09-06");
  const formatDate = useMemo(() => dateFormatterFor(preference, locale), [preference, locale]);
  return (
    <Example
      label="DateFormatSetting — how a day is written, apart from the language"
      hint="each option is the date it produces; the kit's date fields follow it through the provider"
    >
      <div className="max-w-sm space-y-3">
        <DateFormatSetting value={preference} onChange={setPreference} />
        <UiKitProvider formatDate={formatDate}>
          <DatePicker label="A day in a kit field" value={day} onChange={setDay} />
        </UiKitProvider>
        <Row>
          <span className={READOUT}>
            column: {formatDateWithPreference(day, preference, locale, { weekday: true })}
          </span>
          <span className={READOUT}>sentence: {formatDateWithPreference(day, preference, locale)}</span>
          <span className={READOUT}>
            timestamp: {formatDateWithPreference("2026-09-06T23:30:00Z", preference, locale)}
          </span>
          <span className={READOUT}>
            with its clock: {formatDateTimeWithPreference("2026-09-06T23:30:00Z", preference, locale)}
          </span>
        </Row>
      </div>
      <Note>
        The app keeps the preference (a device store) and reads it in two places: its own {code("formatDate")} calls{" "}
        {code("formatDateWithPreference(value, preference, language)")}, and {code("<UiKitProvider formatDate>")} takes{" "}
        {code("dateFormatterFor(preference, language)")}, so a DatePicker, a DateRangePicker&apos;s ends and a DateMark
        write the day the same way. A month or a year, a weekday&apos;s name and a clock time stay the language&apos;s:
        they have no day, month and year to order — {code("formatDateTimeWithPreference")} (0.52) writes the
        preference&apos;s day and the language&apos;s clock. Since 0.52 every kit card that prints a day asks the
        provider&apos;s {code("formatDate")} too (the inbox, push devices, passkeys, sessions, feedback, billing,
        tours).
      </Note>
    </Example>
  );
}
