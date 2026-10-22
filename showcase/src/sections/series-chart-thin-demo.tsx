import { useState } from "react";
import { SeriesChart, ToggleGroup } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";
import { numberFormat } from "../lib/number-format";

/**
 * SERIES CHART — the row budget (0.34, Kurvenschmiede's U2): `maxRows` thins a long table
 * by ENVELOPE, and for comparison the stride the app used before, which aliases.
 */

const RATE = 1000;
const SECONDS = 10;

/** Ten seconds at 1 kHz: a 160 Hz tone whose swing grows and shrinks, over a slow drift,
 *  with one spike a single sample wide at t = 6.283 s — Kurvenschmiede's acoustic sweep,
 *  and the jerk spike a stride steps over. */
function sweepRows() {
  return Array.from({ length: RATE * SECONDS }, (_, i) => {
    const t = i / RATE;
    const swing = 4 + 3 * Math.sin((2 * Math.PI * t) / SECONDS);
    const value = 2 * Math.sin(2 * Math.PI * 0.3 * t) + swing * Math.sin(2 * Math.PI * 160 * t);
    return { x: t, v: i === 6283 ? 14 : value };
  });
}

const ROWS = sweepRows();
/** What the app drew before F88: every sixth row, a 167 Hz sampling of a 160 Hz tone. */
const STRIDED = ROWS.filter((_, i) => i % 6 === 0);

type Mode = "envelope" | "stride" | "all";

const TWO = numberFormat("en-GB", { maximumFractionDigits: 2 });

export function RowBudgetDemo() {
  const [mode, setMode] = useState<Mode>("envelope");
  return (
    <Example
      label="SeriesChart — a row budget (maxRows)"
      hint="10,000 rows: an envelope keeps every peak, a stride draws a wave the data does not have"
    >
      <div className="mb-2">
        <ToggleGroup<Mode>
          aria-label="How the rows are thinned"
          value={mode}
          onChange={setMode}
          options={[
            { value: "envelope", label: "maxRows={1000}" },
            { value: "stride", label: "Every 6th row" },
            { value: "all", label: "Every row" },
          ]}
        />
      </div>
      <SeriesChart
        rows={mode === "stride" ? STRIDED : ROWS}
        maxRows={mode === "envelope" ? 1000 : undefined}
        series={[{ key: "v", label: "Acceleration", curve: "linear" }]}
        axes={[{ id: "y", title: "Acceleration (m/s²)" }]}
        x={{ title: "Time (s)", format: (v) => TWO.format(v), label: (v) => `t = ${TWO.format(v)} s` }}
        valueFormat={(v) => TWO.format(v)}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">maxRows</code> is opt-in: without it every row is drawn, as
          before. With it, the table is cut into buckets and each keeps the row where every drawn
          series is lowest and the one where it is highest, plus the first and last ones — so the
          160 Hz tone fills its band and the spike at 6.28 s is there. <em>Every 6th row</em> is the
          stride an app would write: the tone comes out as a slow 6.7 Hz wave at full height, and
          the spike is gone. Drag to zoom: the window on show is thinned again, so a zoom draws
          more of the samples there, all of them once fewer than the budget are in view. The axes
          are fitted on every row either way, and a dot or a click still reports the row&apos;s
          index in <code className="font-mono">rows</code>.
        </Note>
      </div>
    </Example>
  );
}
