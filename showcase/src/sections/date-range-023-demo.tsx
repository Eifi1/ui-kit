import { useState } from "react";
import { DatePicker, DateRangePicker, Switch, type DateRangePickerPreset } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.23.0, kastlan: a long range is quick to pick. `monthJump` makes the panel's caption
 * open a month grid with year steps — a July-to-June service-charge period was eleven
 * month arrows past its start. Belongs on the `calendars` page.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

// Service-charge years run 1 July to 30 June. Synthetic, fixed dates: the demo does not
// move with the calendar.
const PERIODS: DateRangePickerPreset[] = [
  { id: "sc-2025", label: "2025/26", from: "2025-07-01", to: "2026-06-30" },
  { id: "sc-2026", label: "2026/27", from: "2026-07-01", to: "2027-06-30" },
];

export function DateRange023Demo() {
  const [jump, setJump] = useState(true);
  const [period, setPeriod] = useState({ from: "", to: "" });
  const [drafted, setDrafted] = useState({ from: "2025-07-01", to: "2026-06-30" });
  const [moveIn, setMoveIn] = useState("2026-10-01");
  return (
    <>
      <Example
        label="DateRangePicker monthJump — a July-to-June period"
        hint="the caption opens the months; ‹ › then step a year; a month returns to its days"
      >
        <div className="flex flex-col gap-3">
          <Switch label="monthJump" checked={jump} onCheckedChange={setJump} />
          <div className="grid items-start gap-3 md:grid-cols-2">
            <DateRangePicker
              label="Service-charge period"
              monthJump={jump}
              clearable
              hint="1 July to 30 June."
              error={period.from && period.to && period.to <= period.from ? "The end must be after the start." : undefined}
              from={period.from}
              to={period.to}
              onChange={(from, to) => setPeriod({ from, to })}
            />
            <DateRangePicker
              label="Settlement period"
              monthJump={jump}
              commit="apply"
              presets={PERIODS}
              from={drafted.from}
              to={drafted.to}
              onChange={(from, to) => setDrafted({ from, to })}
            />
          </div>
          <DatePicker
            label="Move-in date"
            monthJump={jump}
            step
            value={moveIn}
            onChange={setMoveIn}
            min="2020-01-01"
            className="md:w-1/2"
          />
        </div>
        <Note>
          With {code("monthJump")} a whole period is open, caption, Jul, 1, caption, next year, Jun, 30 — eight clicks
          where the month arrows took seventeen. The caption is a disclosure button named by the month it shows and
          described as {code("monthPicker.panel")}; the month grid is {code("MonthPicker")}&apos;s (arrows, Home/End,
          PageUp/PageDown a year), and Escape there steps back to the days instead of closing the panel. No new strings:
          it speaks with the {code("miniCalendar")} and {code("monthPicker")} labels a host already translated. Off by
          default — the caption becomes one more tab stop. Below 768px the range opens as the full-screen sheet, with
          the same jump.
        </Note>
        <Note>
          No two-month panel ({code("months={2}")}): for a twelve-month period it still pages six times where the jump
          takes two steps, and two calendars side by side each follow the value on their own — picking the end in the
          right-hand month pulls the left one onto it — which the calendar would have to learn first. For a range
          across one month boundary the single month and one arrow press stay as quick.
        </Note>
      </Example>
    </>
  );
}
