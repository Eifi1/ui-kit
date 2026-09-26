import { useMemo, useState } from "react";
import { Button, CalendarHeatmap, ToggleGroup } from "@eifi1/ui-kit";
import type { CalendarHeatmapDatum, WeekDay } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * CALENDAR HEATMAP — days as shaded squares: the contribution graph (`layout="weeks"`)
 * and the phone's one-month calendar (`layout="month"`).
 *
 * The data is generated from a fixed seed over a FIXED window (October 2025 to
 * September 2026), so the page is the same on every load and in every test — a
 * heatmap drawn from `Math.random()` would show a different picture each time and
 * nobody could say whether a change to the component moved it.
 */

const FROM = "2025-10-01";
const TO = "2026-09-30";

/** A small deterministic generator (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Spending per day: nothing on about a third of the days, weekends heavier, one
 *  rent-sized peak on the 1st of each month. */
function spending(from: string, to: string, seed = 7): CalendarHeatmapDatum[] {
  const rnd = seeded(seed);
  const out: CalendarHeatmapDatum[] = [];
  const end = new Date(`${to}T00:00:00`);
  for (let d = new Date(`${from}T00:00:00`); d <= end; d.setDate(d.getDate() + 1)) {
    const r = rnd();
    if (r < 0.33 && d.getDate() !== 1) continue;
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    let value = Math.round(r * (weekend ? 140 : 70));
    if (d.getDate() === 1) value += 900;
    out.push({ date: iso(d), value });
  }
  return out;
}

const DATA = spending(FROM, TO);
const valueOn = (day: string) => DATA.filter((p) => p.date === day).reduce((s, p) => s + p.value, 0);

const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function YearOfWeeks() {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  return (
    <Example
      label="CalendarHeatmap — a year of weeks, onSelect and formatValue"
      hint='layout="weeks" (the default): one column per week, scrolls sideways where it does not fit'
    >
      <CalendarHeatmap
        data={DATA}
        from={FROM}
        to={TO}
        selected={selected}
        onSelect={setSelected}
        formatValue={(v) => eur.format(v)}
        aria-label="Spending per day"
      />
      <OutTable
        rows={[
          ["selected", selected ?? "— click a day, or arrow to one and press Enter"],
          ["that day's spending", selected ? eur.format(valueOn(selected)) : "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">onSelect</code> makes every day a button (click, Enter or Space) and{" "}
          <code className="font-mono">selected</code> rings the chosen one — the drill-down into a day&apos;s rows.
          The grid is ONE tab stop: ↑/↓ are the previous/next day, ←/→ a week, PageUp/PageDown a month, Home/End the
          window&apos;s ends. <code className="font-mono">formatValue</code> writes each amount as euros, in the
          tooltip and in the day&apos;s accessible name. The 1st of each month is rent, so the scale&apos;s top (the
          default <code className="font-mono">max</code>: the largest value on screen) is far above an ordinary day.
          Every tooltip is <code className="font-mono">data-private</code> by default (<code className="font-mono">sensitive</code>).
        </Note>
      </div>
    </Example>
  );
}

/** The last day of a "YYYY-MM" month, as "YYYY-MM-DD". */
const monthEnd = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return iso(new Date(y, m, 0));
};
const shiftMonth = (key: string, by: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function OneMonth() {
  const [month, setMonth] = useState("2026-09");
  const [selected, setSelected] = useState<string | undefined>("2026-09-14");
  const title = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return (
    <Example
      label='CalendarHeatmap — layout="month" and a custom tooltip'
      hint="a 7-column calendar with day numbers, for one month on a phone"
    >
      <div className="max-w-sm">
        <Row className="mb-2 justify-between">
          <Button size="sm" variant="secondary" disabled={month <= "2025-10"} onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            Previous
          </Button>
          <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
          <Button size="sm" variant="secondary" disabled={month >= "2026-09"} onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            Next
          </Button>
        </Row>
        <CalendarHeatmap
          layout="month"
          data={DATA}
          from={`${month}-01`}
          to={monthEnd(month)}
          selected={selected}
          onSelect={setSelected}
          formatValue={(v) => eur.format(v)}
          tooltip={(day) =>
            day.hasData ? (
              <span>
                <strong>{day.formattedValue}</strong> on {day.formattedDate}
                <br />
                level {day.level} of 4
              </span>
            ) : (
              <span>Nothing spent on {day.formattedDate}</span>
            )
          }
          aria-label={`Spending in ${title}`}
        />
      </div>
      <OutTable rows={[["selected", selected ?? "—"]]} />
      <div className="mt-3">
        <Note>
          The month layout is for a phone: switch to it on <code className="font-mono">useMediaQuery</code> and narrow{" "}
          <code className="font-mono">from</code>/<code className="font-mono">to</code> to one month, as the page&apos;s
          own header does here. In this layout ←/→ move a day and ↑/↓ a week. <code className="font-mono">tooltip</code>{" "}
          replaces the default &ldquo;date: value&rdquo; bubble with anything, and is told the day&apos;s{" "}
          <code className="font-mono">level</code>, <code className="font-mono">hasData</code> and both formatted
          strings; the day&apos;s accessible name stays the date and the value.
        </Note>
      </div>
    </Example>
  );
}

type Colour = "brand" | "success" | "chart";
const COLOURS: Record<Colour, string> = {
  brand: "var(--brand)",
  success: "var(--success)",
  chart: "var(--chart-3)",
};

function ScaleControls() {
  const [levels, setLevels] = useState("4");
  const [maxMode, setMaxMode] = useState<"auto" | "100">("auto");
  const [colour, setColour] = useState<Colour>("brand");
  const from = "2026-04-01";
  return (
    <Example label="CalendarHeatmap — levels, max and color" hint="the scale: how many steps, where it tops out, in what colour">
      <Row className="mb-3">
        <span className="text-xs text-[var(--text-muted)]">levels</span>
        <ToggleGroup<string>
          aria-label="Levels"
          size="sm"
          value={levels}
          onChange={setLevels}
          options={["2", "4", "6"].map((l) => ({ value: l, label: l }))}
        />
        <span className="text-xs text-[var(--text-muted)]">max</span>
        <ToggleGroup<"auto" | "100">
          aria-label="Max"
          size="sm"
          value={maxMode}
          onChange={setMaxMode}
          options={[
            { value: "auto", label: "largest on screen" },
            { value: "100", label: "100" },
          ]}
        />
        <span className="text-xs text-[var(--text-muted)]">color</span>
        <ToggleGroup<Colour>
          aria-label="Colour"
          size="sm"
          value={colour}
          onChange={setColour}
          options={[
            { value: "brand", label: "--brand" },
            { value: "success", label: "--success" },
            { value: "chart", label: "--chart-3" },
          ]}
        />
      </Row>
      <CalendarHeatmap
        data={DATA}
        from={from}
        to={TO}
        levels={Number(levels)}
        max={maxMode === "auto" ? undefined : 100}
        color={COLOURS[colour]}
        formatValue={(v) => eur.format(v)}
        aria-label="Spending per day, April to September"
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">levels</code> is the number of non-empty steps (the legend grows with it).
          Left alone, <code className="font-mono">max</code> is the largest value in the window — here the rent, so
          most days sit on the first step; <code className="font-mono">max=&#123;100&#125;</code> puts an ordinary
          weekend at the top and lets the rent clip to it. <code className="font-mono">color</code> is any CSS colour,
          each step mixed into <code className="font-mono">--bg-surface</code>, so the ramp follows the theme — flip
          it in the top bar.
        </Note>
      </div>
    </Example>
  );
}

function Truncated() {
  const [capped, setCapped] = useState(true);
  const [legend, setLegend] = useState(true);
  const [sensitive, setSensitive] = useState(true);
  const counts = useMemo(() => spending(FROM, TO, 21).map((p) => ({ ...p, value: Math.round(p.value / 20) })), []);
  return (
    <Example label="CalendarHeatmap — maxDays, legend and sensitive" hint="a long window cut to its latest days, and says so">
      <Row className="mb-3">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={capped} onChange={(e) => setCapped(e.target.checked)} />
          <code className="font-mono">maxDays=&#123;90&#125;</code>
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={legend} onChange={(e) => setLegend(e.target.checked)} />
          <code className="font-mono">legend</code>
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
          <code className="font-mono">sensitive</code>
        </label>
      </Row>
      <CalendarHeatmap
        data={counts}
        from={FROM}
        to={TO}
        maxDays={capped ? 90 : undefined}
        legend={legend}
        sensitive={sensitive}
        labels={{ day: (date, value) => `${date}: ${value} receipts` }}
        aria-label="Receipts scanned per day"
      />
      <div className="mt-3">
        <Note>
          The window is a whole year; <code className="font-mono">maxDays</code> keeps the LATEST 90 days and prints
          how many earlier ones it left out (<code className="font-mono">calendarHeatmap.truncated</code>) rather than
          silently starting in July. Untick <code className="font-mono">legend</code> (default on) and the Less … More
          scale goes. Untick <code className="font-mono">sensitive</code> and hover a day: the
          bubble loses <code className="font-mono">data-private</code>, so a host&apos;s demo-mode blur no longer
          covers it — right for receipt COUNTS, wrong for amounts. <code className="font-mono">labels.day</code> words
          each day&apos;s name and tooltip for this data.
        </Note>
      </div>
    </Example>
  );
}

const WEEK_STARTS: { value: string; label: string }[] = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "6", label: "Saturday" },
];

function RtlWeekStart() {
  const [start, setStart] = useState("6");
  return (
    <Example label="CalendarHeatmap — right-to-left and weekStartsOn" hint={<code className="font-mono">dir=&quot;rtl&quot; locale=&quot;ar-EG&quot;</code>}>
      <Row className="mb-3">
        <span className="text-xs text-[var(--text-muted)]">weekStartsOn</span>
        <ToggleGroup<string> aria-label="Week starts on" size="sm" value={start} onChange={setStart} options={WEEK_STARTS} />
      </Row>
      <div className="grid gap-6 md:grid-cols-2">
        <div dir="rtl">
          <CalendarHeatmap
            data={DATA}
            from="2026-06-01"
            to={TO}
            locale="ar-EG"
            weekStartsOn={Number(start) as WeekDay}
            aria-label="الإنفاق اليومي"
          />
        </div>
        <div dir="rtl" className="max-w-xs">
          <CalendarHeatmap
            layout="month"
            data={DATA}
            from="2026-09-01"
            to="2026-09-30"
            locale="ar-EG"
            weekStartsOn={Number(start) as WeekDay}
            legend={false}
            aria-label="الإنفاق في سبتمبر"
          />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          Under <code className="font-mono">dir=&quot;rtl&quot;</code> the weeks run right to left, the sideways
          scroller starts at the newest week on the LEFT, and ←/→ are mirrored. <code className="font-mono">locale</code>{" "}
          writes the month and weekday names, day numbers and values in Arabic-Indic digits.{" "}
          <code className="font-mono">weekStartsOn</code> overrides the provider&apos;s and the locale&apos;s first day —
          the rows of the weeks layout and the columns of the month layout both move with it.
        </Note>
      </div>
    </Example>
  );
}

export function CalendarHeatmapDemo() {
  return (
    <>
      <YearOfWeeks />
      <OneMonth />
      <ScaleControls />
      <Truncated />
      <RtlWeekStart />
    </>
  );
}
