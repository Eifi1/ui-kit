import { useState } from "react";
import { MiniCalendar, MonthPicker, ToggleGroup } from "@eifi1/ui-kit";
import { monthKey } from "@eifi1/ui-kit/dates";
import { Example, Note, Row, Stage } from "../lib/section";

/**
 * 0.12 on the calendar pages: MiniCalendar's `showOutsideDays` (Calendars) and
 * MonthPicker's `variant="stepper"` (Month & time).
 */

const READOUT = "mt-2 font-mono text-xs text-[var(--text-muted)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

export function OutsideDaysDemo() {
  const [day, setDay] = useState("2026-09-14");
  const [month, setMonth] = useState("2026-09");
  const [size, setSize] = useState<"sm" | "lg">("sm");
  return (
    <Example
      label="MiniCalendar — showOutsideDays"
      hint="the neighbouring months' days fill the first and last row, muted"
    >
      <Row className="mb-3">
        <ToggleGroup<"sm" | "lg">
          aria-label="Size"
          size="sm"
          value={size}
          onChange={setSize}
          options={[
            { value: "sm", label: 'size="sm"' },
            { value: "lg", label: 'size="lg"' },
          ]}
        />
      </Row>
      <Stage>
        <div data-stage={size === "lg" ? "wide" : undefined}>
          <MiniCalendar
            mode="single"
            from={day}
            to={day}
            locale="en-GB"
            size={size}
            month={month}
            onMonthChange={setMonth}
            max="2026-10-10"
            showOutsideDays
            onSelect={(f) => setDay(f)}
          />
        </div>
      </Stage>
      <p className={READOUT}>
        value={day} · month={month} · max=2026-10-10
      </p>
      <div className="mt-3">
        <Note>
          The leading and trailing cells are real days, not decoration: each is named with its whole
          date and honours {code("min")}/{code("max")} (page to October: the 11th onwards is dead). Click
          one — 31 August, say — and it is selected and the grid moves to its month. They are not stops
          of the roving tabindex, since arrowing off the month's edge already reaches them, and{" "}
          {code("renderDay")} is not called for them, so a day's events are drawn once, in its own
          month. Default {code("false")}: the cells stay empty.
        </Note>
      </div>
    </Example>
  );
}

export function MonthStepperDemo() {
  const now = monthKey(new Date());
  const [month, setMonth] = useState(now);
  const [bounded, setBounded] = useState(now);
  const [y, m] = now.split("-").map(Number);
  const min = monthKey(new Date(y!, m! - 1 - 2, 1));
  const max = monthKey(new Date(y!, m! - 1 + 1, 1));
  return (
    <Example
      label='MonthPicker — variant="stepper"'
      hint="a month page's header: the month as a heading that opens the grid, then Today and ‹ ›"
    >
      <Stage>
        <div data-stage="wide" className="space-y-6">
          <MonthPicker variant="stepper" value={month} onChange={setMonth} locale="en-GB" />
          <MonthPicker
            variant="stepper"
            value={bounded}
            onChange={setBounded}
            locale="de-DE"
            min={min}
            max={max}
            headingLevel={3}
            showToday={false}
          />
          <div dir="rtl">
            <MonthPicker variant="stepper" value={month} onChange={setMonth} locale="ar-EG" headingLevel={false} />
          </div>
        </div>
      </Stage>
      <p className={READOUT}>
        first = {month} · second = {bounded} (min {min}, max {max})
      </p>
      <div className="mt-3">
        <Note>
          What a calendar page used to assemble by hand around the field. The heading is a button that
          opens the month grid; its text is its name and it is {code("aria-live")}, so pressing ‹ or ›
          (focus stays on the arrow) still says where the arrow went. Today jumps to the current month
          and is disabled when that is outside the bounds; the arrows disable at {code("min")}/
          {code("max")}. The second is German, set in an {code("<h3>")} ({code("headingLevel={3}")})
          without Today; the third has {code("headingLevel={false}")} — no heading element, for a page
          that already has one — and sits right-to-left with the arrows mirrored. It shares its value
          with the first.
        </Note>
      </div>
    </Example>
  );
}
