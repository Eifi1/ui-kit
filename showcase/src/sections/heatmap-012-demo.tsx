import { useMemo, useState } from "react";
import { CalendarHeatmap, ToggleGroup, heatmapWindowEnd } from "@eifi1/ui-kit";
import { todayIso } from "@eifi1/ui-kit/dates";
import type { CalendarHeatmapDatum, CalendarHeatmapProps } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * CALENDAR HEATMAP, 0.12: a continuous colour ramp (`colorFrom`/`colorTo`), a fill of
 * the caller's own, the empty-day colour, and `anchor` — where a long window ends.
 *
 * Deterministic data (a seeded generator over fixed dates), as on the rest of the page.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

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

function activity(from: string, to: string, seed: number): CalendarHeatmapDatum[] {
  const rnd = seeded(seed);
  const out: CalendarHeatmapDatum[] = [];
  const end = new Date(`${to}T00:00:00`);
  for (let d = new Date(`${from}T00:00:00`); d <= end; d.setDate(d.getDate() + 1)) {
    const r = rnd();
    if (r < 0.25) continue;
    out.push({ date: iso(d), value: Math.round(r * r * 40) });
  }
  return out;
}

const MONTH_DATA = activity("2026-09-01", "2026-09-30", 11);

type Ramp = "levels" | "hex" | "var" | "fill";
// Short option words, the props in the caption: four long labels in one group were each
// cut to "levels (co…" / "colorFrom/To…" on a phone, two of them identically.
const RAMPS: { value: Ramp; label: string }[] = [
  { value: "levels", label: "levels" },
  { value: "hex", label: "hex" },
  { value: "var", label: "var()" },
  { value: "fill", label: "fill()" },
];
const RAMP_CAPTION: Record<Ramp, string> = {
  levels: "levels steps of color",
  hex: 'colorFrom="#fde68a" colorTo="#9a3412"',
  var: 'colorFrom="var(--bg-surface)" colorTo="var(--brand)"',
  fill: "fill(value) — a threshold",
};

const RAMP_PROPS: Record<Ramp, Partial<CalendarHeatmapProps>> = {
  levels: {},
  hex: { colorFrom: "#fde68a", colorTo: "#9a3412" },
  var: { colorFrom: "var(--bg-surface)", colorTo: "var(--brand)" },
  // Over 30 is "a lot" whatever the max is: a threshold, not a scale.
  fill: { fill: (value) => (value >= 30 ? "var(--danger)" : value >= 15 ? "var(--warning)" : "var(--success)") },
};

function ColourRamp() {
  const [ramp, setRamp] = useState<Ramp>("hex");
  const [empty, setEmpty] = useState<"default" | "custom">("default");
  return (
    <Example
      label="CalendarHeatmap — colorFrom/colorTo, fill and emptyColor"
      hint="a continuous ramp instead of steps; the day number's ink is measured against the fill"
    >
      <Row className="mb-3 items-start">
        <ToggleGroup<Ramp>
          aria-label="Ramp"
          size="sm"
          value={ramp}
          onChange={setRamp}
          options={RAMPS}
          caption={(v) => RAMP_CAPTION[v]}
        />
        <ToggleGroup<"default" | "custom">
          aria-label="Empty colour"
          size="sm"
          // Content-sized like the ramp group beside it, whose caption wrapper sizes it to
          // its options; left at the default w-full this one alone spanned the card.
          className="w-auto"
          value={empty}
          onChange={setEmpty}
          options={[
            { value: "default", label: "empty: default" },
            { value: "custom", label: "empty: hatched" },
          ]}
        />
      </Row>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <CalendarHeatmap
            data={MONTH_DATA}
            from="2026-09-01"
            to="2026-09-30"
            layout="month"
            {...RAMP_PROPS[ramp]}
            emptyColor={
              empty === "custom"
                ? "repeating-linear-gradient(45deg, var(--bg-surface-2) 0 3px, var(--bg-page) 3px 6px)"
                : undefined
            }
            aria-label="Check-ins in September"
          />
        </div>
        <div className="min-w-0">
          <CalendarHeatmap
            data={activity("2026-04-01", "2026-09-30", 11)}
            from="2026-04-01"
            to="2026-09-30"
            {...RAMP_PROPS[ramp]}
            emptyColor={
              empty === "custom"
                ? "repeating-linear-gradient(45deg, var(--bg-surface-2) 0 3px, var(--bg-page) 3px 6px)"
                : undefined
            }
            aria-label="Check-ins, April to September"
          />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          {code("colorFrom")} + {code("colorTo")} (both needed) replace the {code("levels")} steps of{" "}
          {code("color")} with a continuous scale from the smallest value to the busiest day. Two{" "}
          {code("#rrggbb")} colours are interpolated in JS, so each cell is a concrete hex and the
          month layout's day number picks black or white ink by MEASURING it; anything else (a{" "}
          {code("var()")}) is mixed with {code("color-mix()")}. {code("fill(value, max)")} wins over
          both — here a threshold rather than a scale — and also paints the legend.{" "}
          {code("emptyColor")} is any CSS background for a day with no value.
        </Note>
      </div>
    </Example>
  );
}

type Anchor = "to" | "today" | "latest" | "2026-06-30";
const ANCHORS: { value: Anchor; label: string }[] = [
  { value: "to", label: "to" },
  { value: "today", label: "today" },
  { value: "latest", label: "latest" },
  { value: "2026-06-30", label: "2026-06-30" },
];

// A report's "all" preset: the window runs a year past the data.
const A_FROM = "2025-10-01";
const A_TO = "2027-09-30";
const A_DATA = activity("2025-10-01", "2026-09-26", 5);

function AnchorSpecimen() {
  const [anchor, setAnchor] = useState<Anchor>("latest");
  const latest = useMemo(() => A_DATA.reduce((m, p) => (p.value !== 0 && p.date > m ? p.date : m), ""), []);
  const today = todayIso();
  return (
    <Example
      label="CalendarHeatmap — anchor, where a long window ends"
      hint="maxDays counts back from the anchor, not from to"
    >
      <Row className="mb-3">
        <ToggleGroup<Anchor> aria-label="Anchor" size="sm" value={anchor} onChange={setAnchor} options={ANCHORS} />
      </Row>
      <CalendarHeatmap
        data={A_DATA}
        from={A_FROM}
        to={A_TO}
        maxDays={140}
        anchor={anchor}
        aria-label="Check-ins, window anchored"
      />
      <OutTable
        rows={ANCHORS.map(({ value }) => [
          `heatmapWindowEnd("${A_FROM}", "${A_TO}", "${value}", "${latest}", "${today}")`,
          heatmapWindowEnd(A_FROM, A_TO, value, latest, today),
        ])}
      />
      <div className="mt-3">
        <Note>
          The window is {A_FROM} to {A_TO} — it runs a year into the future, as a report's
          &ldquo;all&rdquo; preset does — and {code("maxDays={140}")} keeps only 140 days of it. With{" "}
          {code('anchor="to"')} (the default) those are 140 empty future days; {code('"today"')} ends on
          today, {code('"latest"')} on the later of today and the last day with a value, and a{" "}
          {code('"YYYY-MM-DD"')} on that day. The end is always clamped into {code("from")}…{code("to")}.
          The table above is {code("heatmapWindowEnd")}, the exported pure function the component
          calls — for a caller that has to know which days are on screen (a caption, a total).
        </Note>
      </div>
    </Example>
  );
}

export function HeatmapRampDemo() {
  return (
    <>
      <ColourRamp />
      <AnchorSpecimen />
    </>
  );
}
