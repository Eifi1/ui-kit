import { useState } from "react";
import { PieChart, StaticLegend, ToggleGroup, paletteFor } from "@eifi1/ui-kit";
import type { PieChartSlice } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * PIE CHART — the part-to-whole chart lifted out of kastlan's dashboard and reports: a
 * donut (the default) or a full pie, one slice per category, on the kit's chart shell
 * and ramp. And STATIC LEGEND, the key that says what a mark means without being a
 * switch.
 *
 * Fixed data, so the picture is the same on every load and in every test.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const formatEur = (v: number) => eur.format(v);

const SPENDING: PieChartSlice[] = [
  { key: "rent", label: "Rent", value: 1250 },
  { key: "food", label: "Groceries", value: 420 },
  { key: "transport", label: "Transport", value: 180 },
  { key: "leisure", label: "Leisure", value: 150 },
  { key: "utilities", label: "Utilities", value: 95 },
  // Under the 4 % label threshold: drawn, in the legend, but no label on the sliver.
  { key: "fees", label: "Bank fees", value: 12 },
  // Not drawn and not in the legend: a missing figure and a zero.
  { key: "insurance", label: "Insurance", value: null },
  { key: "gifts", label: "Gifts", value: 0 },
];

const OCCUPANCY: PieChartSlice[] = [
  { key: "let", label: "Let", value: 38, color: "var(--success)" },
  { key: "notice", label: "Under notice", value: 4, color: "var(--warning)" },
  { key: "vacant", label: "Vacant", value: 6, color: "var(--danger)" },
];

type Variant = "donut" | "pie";
type LegendMode = "toggle" | "static" | "none";
type SliceLabels = "percent" | "value" | "none";

function DonutAndPie() {
  const [variant, setVariant] = useState<Variant>("donut");
  const [legend, setLegend] = useState<LegendMode>("toggle");
  const [sliceLabels, setSliceLabels] = useState<SliceLabels>("percent");
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  return (
    <Example
      label="PieChart — donut and pie, legend modes and slice labels"
      hint="values ≤ 0 or null are not drawn; slices under 4 % get no label"
    >
      <Row className="mb-3">
        <ToggleGroup<Variant>
          aria-label="Variant"
          size="sm"
          value={variant}
          onChange={setVariant}
          options={[
            { value: "donut", label: "donut" },
            { value: "pie", label: "pie" },
          ]}
        />
        <ToggleGroup<LegendMode>
          aria-label="Legend"
          size="sm"
          value={legend}
          onChange={setLegend}
          options={[
            { value: "toggle", label: "toggle" },
            { value: "static", label: "static" },
            { value: "none", label: "none" },
          ]}
        />
        <ToggleGroup<SliceLabels>
          aria-label="Slice labels"
          size="sm"
          value={sliceLabels}
          onChange={setSliceLabels}
          options={[
            { value: "percent", label: "percent" },
            { value: "value", label: "value" },
            { value: "none", label: "none" },
          ]}
        />
      </Row>
      <PieChart
        data={SPENDING}
        variant={variant}
        legend={legend}
        sliceLabels={sliceLabels}
        formatValue={formatEur}
        hiddenSlices={hidden}
        onHiddenSlicesChange={setHidden}
        centerLabel="Spent in September"
        height={280}
        aria-label="Spending by category"
      />
      <p className={`mt-2 ${READOUT}`}>hiddenSlices = [{[...hidden].join(", ")}]</p>
      <div className="mt-3">
        <Note>
          With {code('legend="toggle"')} each legend entry is a switch: turn off Rent and the other
          slices' percentages — and the donut's total — are re-read as shares of what is left. The
          set is controlled here ({code("hiddenSlices")} / {code("onHiddenSlicesChange")}), so the
          readout follows it. {code('"static"')} is the same key with nothing to press. Insurance
          ({code("null")}) and Gifts ({code("0")}) are in the data but neither drawn nor listed, and
          Bank fees is a sliver under {code("minLabelShare")}: its figure is in the tooltip and its
          accessible name only.
        </Note>
      </div>
    </Example>
  );
}

function ClickAndKeyboard() {
  const [picked, setPicked] = useState("—");
  return (
    <Example
      label="PieChart — onSliceClick and the keyboard"
      hint="one tab stop; arrows step between slices; Enter or Space activates"
    >
      <PieChart
        data={OCCUPANCY}
        onSliceClick={(key, slice) => setPicked(`${key} (${slice.label}: ${slice.value})`)}
        centerLabel="Units"
        height={240}
        aria-label="Occupancy"
      />
      <p className={`mt-2 ${READOUT}`}>onSliceClick → {picked}</p>
      <div className="mt-3">
        <Note>
          Tab into the chart: focus lands on the first slice, and ←/→ or ↑/↓ walk the slices
          clockwise from twelve o'clock (the legend's order), Home/End jump to the ends. The focused
          slice is written in the donut's centre and named &ldquo;Let: 38 (79%)&rdquo; for a screen
          reader. With {code("onSliceClick")} each slice is a {code('role="button"')}: click one, or
          press Enter. The colours here are the slices' own {code("color")} — status tokens — rather
          than the by-index ramp.
        </Note>
      </div>
    </Example>
  );
}

function RedactEmptyRtl() {
  const [redact, setRedact] = useState(true);
  return (
    <Example
      label="PieChart — redact, empty and right-to-left"
      hint="redact tags the figures data-private; an empty chart says so"
    >
      <Row className="mb-3">
        <ToggleGroup<"on" | "off">
          aria-label="Redact"
          size="sm"
          value={redact ? "on" : "off"}
          onChange={(v) => setRedact(v === "on")}
          options={[
            { value: "on", label: "redact on" },
            { value: "off", label: "redact off" },
          ]}
        />
      </Row>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="min-w-0">
          <PieChart
            data={SPENDING}
            redact={redact}
            sliceLabels="value"
            formatValue={formatEur}
            legend="static"
            height={220}
            aria-label="Spending, redacted"
          />
        </div>
        <div className="min-w-0">
          <PieChart data={[]} height={220} empty="No spending this month" aria-label="No spending" />
        </div>
        <div className="min-w-0" dir="rtl">
          <PieChart
            data={[
              { key: "a", label: "إيجار", value: 1250 },
              { key: "b", label: "طعام", value: 420 },
              { key: "c", label: "نقل", value: 180 },
            ]}
            locale="ar-EG"
            height={220}
            centerLabel="المجموع"
            aria-label="الإنفاق"
          />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          {code("redact")} marks every figure on screen — the centre, {code('"value"')} slice labels
          and the tooltip bubble — {code("data-private")}, which the host's demo-mode rule blurs; the
          slices and the percentages stay, since a share reveals no amount. The middle chart has
          nothing to draw and shows its {code("empty")} text instead of an empty box. The third
          sits in {code('dir="rtl"')} with {code('locale="ar-EG"')}: the legend and the centre
          follow the page and ←/→ follow the reading direction, while the plot itself is not
          mirrored.
        </Note>
      </div>
    </Example>
  );
}

function StaticLegendSpecimen() {
  return (
    <Example
      label="StaticLegend — a key, not a control"
      hint="swatch, stroke with dash, dot, a caller's icon — read as a list, no tab stops"
    >
      <StaticLegend
        aria-label="Lease timeline key"
        entries={[
          { key: "active", label: "Active lease", color: paletteFor(0) },
          { key: "planned", label: "Planned", color: paletteFor(1), marker: "stroke", dash: 1 },
          { key: "event", label: "Rent change", color: paletteFor(2), marker: "dot" },
          {
            key: "open",
            label: "Open-ended",
            color: paletteFor(0),
            icon: (
              <span
                className="block h-2 w-5 rounded-sm"
                style={{ background: `linear-gradient(to right, ${paletteFor(0)}, transparent)` }}
              />
            ),
          },
          {
            key: "today",
            label: "Today",
            color: "var(--text-primary)",
            icon: <span className="block h-3 w-px bg-[var(--text-primary)]" />,
          },
        ]}
      />
      <div className="mt-4 max-w-xs">
        <StaticLegend
          orientation="vertical"
          aria-label="Single entry"
          entries={[{ key: "buffer", label: "Cash buffer (target)", color: paletteFor(3), marker: "stroke", dash: "4 3" }]}
        />
      </div>
      <div className="mt-3">
        <Note>
          The same entries and marks as {code("ToggleLegend")}, but a {code("<ul>")}: a screen reader
          hears &ldquo;list, 5 items&rdquo; rather than five switches, and Tab skips it. Unlike{" "}
          {code("ToggleLegend")} it draws a single entry too (the vertical one below), because a key
          with one line still says what the one mark on the chart means.
        </Note>
      </div>
    </Example>
  );
}

export function PieChartDemo() {
  return (
    <>
      <DonutAndPie />
      <ClickAndKeyboard />
      <RedactEmptyRtl />
      <StaticLegendSpecimen />
    </>
  );
}
