import { useState } from "react";
import { SeriesChart, ToggleGroup } from "@eifi1/ui-kit";
import type { SeriesChartHit } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * SERIES CHART — two 0.10.0 behaviours: whole-number y ticks (automatic for counts,
 * forced or refused by `integerTicks`), and the keyboard's way onto a clickable chart.
 */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Users signed in per day — whole numbers on a short range, where a half tick is a
 *  value no sample can have. */
const USERS = DAYS.map((day, i) => ({ day, users: [1, 2, 1, 0, 2, 1, 2][i] }));
/** Days of runway, computed — fractional, but read in whole days. */
const RUNWAY = DAYS.map((day, i) => ({ day, runway: [2.7, 2.4, 2.1, 1.8, 1.4, 1.1, 0.6][i] }));

const ONE = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

type Forced = "auto" | "true" | "false";

export function IntegerTicksDemo() {
  const [runwayTicks, setRunwayTicks] = useState<Forced>("true");
  const [userTicks, setUserTicks] = useState<Forced>("auto");
  const resolve = (v: Forced) => (v === "auto" ? undefined : v === "true");
  return (
    <Example
      label="SeriesChart — whole-number y ticks (integerTicks)"
      hint="automatic when every value on the axis is whole; true forces it, false refuses it"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Row className="mb-2">
            <span className="text-xs text-[var(--text-muted)]">Users (counts)</span>
            <ToggleGroup<Forced>
              aria-label="integerTicks for the users axis"
              size="sm"
              value={userTicks}
              onChange={setUserTicks}
              options={[
                { value: "auto", label: "left out" },
                { value: "false", label: "false" },
              ]}
            />
          </Row>
          <SeriesChart
            rows={USERS}
            x={{ type: "category", key: "day" }}
            axes={[{ id: "y", title: "Users", integerTicks: resolve(userTicks) }]}
            series={[{ key: "users", label: "Users", type: "bar" }]}
            height={200}
          />
        </div>
        <div>
          <Row className="mb-2">
            <span className="text-xs text-[var(--text-muted)]">Runway (days, fractional)</span>
            <ToggleGroup<Forced>
              aria-label="integerTicks for the runway axis"
              size="sm"
              value={runwayTicks}
              onChange={setRunwayTicks}
              options={[
                { value: "auto", label: "left out" },
                { value: "true", label: "true" },
              ]}
            />
          </Row>
          <SeriesChart
            rows={RUNWAY}
            x={{ type: "category", key: "day" }}
            axes={[{ id: "y", title: "Days", integerTicks: resolve(runwayTicks), format: (v) => ONE.format(v) }]}
            series={[{ key: "runway", label: "Runway", dot: true }]}
            valueFormat={(v) => `${ONE.format(v)} days`}
            height={200}
          />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          Left: every value is a whole count, so the axis ticks 0 1 2 on its own — switch it to{" "}
          <code className="font-mono">false</code> and the halves come back (0, 0.5, 1 …), values no sample can
          have. Right: the runway is computed (2.7 days), so the automatic rule leaves it alone and a rounding
          formatter would print &ldquo;1&rdquo; twice; <code className="font-mono">true</code> ticks it in whole days.
          On a span wider than about eight the ticks are whole steps already and nothing changes; a zoom window
          holding no whole number falls back to the ordinary ticks. <code className="font-mono">tickValues</code>{" "}
          wins over either.
        </Note>
      </div>
    </Example>
  );
}

const WEEKDAY_SPEND = DAYS.map((day, i) => ({
  day,
  card: [42, 18, 65, 30, 88, 120, 24][i],
  cash: [5, 0, 12, 8, 20, 35, 0][i],
}));
const EUR = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function KeyboardPointsDemo() {
  const [mark, setMark] = useState<"bar" | "line">("bar");
  const [hit, setHit] = useState<SeriesChartHit | null>(null);
  return (
    <Example
      label="Bars and periods from the keyboard — onPointClick"
      hint="a clickable chart is one Tab stop; the arrows walk its bars (or, with no bars, its periods)"
    >
      <Row className="mb-3">
        <ToggleGroup<"bar" | "line">
          aria-label="Mark"
          value={mark}
          onChange={(v) => {
            setMark(v);
            setHit(null);
          }}
          options={[
            { value: "bar", label: "bars — a stop per bar" },
            { value: "line", label: "lines — a stop per day" },
          ]}
        />
      </Row>
      <SeriesChart
        rows={WEEKDAY_SPEND}
        x={{ type: "category", key: "day" }}
        axes={[{ id: "y", title: "EUR", format: (v) => EUR.format(v) }]}
        series={[
          { key: "card", label: "Card", type: mark },
          { key: "cash", label: "Cash", type: mark },
        ]}
        valueFormat={(v) => EUR.format(v)}
        onPointClick={setHit}
        height={220}
      />
      <OutTable
        rows={[
          ["onPointClick → x", hit ? String(hit.x) : "—"],
          ["→ key", hit ? String(hit.key ?? "undefined — the whole day") : "—"],
          ["→ row", hit ? `card ${EUR.format(Number(hit.row.card))}, cash ${EUR.format(Number(hit.row.cash))}` : "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          <strong>Try it: Tab into the chart and use the arrow keys.</strong> The chart is ONE Tab stop; ←/→ step
          through the stops in order, ↑/↓ move between the bars of one day, Home/End jump to the ends, and ↵ or
          Space report the stop exactly as a click would — with the series for a bar, without one for a day. The
          focused bar is outlined at its own geometry and the tooltip follows the keyboard. Each stop is a{" "}
          <code className="font-mono">role=&quot;button&quot;</code> named &ldquo;Sat — Card: €120&rdquo;, in a group
          named <code className="font-mono">seriesChart.points</code> (&ldquo;Chart values&rdquo;). The stops take no
          pointer events, so hovering and clicking behave exactly as before; Tab leaves the chart rather than
          walking 14 bars.
        </Note>
      </div>
    </Example>
  );
}
