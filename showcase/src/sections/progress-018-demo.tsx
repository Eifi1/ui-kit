import { useState } from "react";
import { ProgressBar } from "../../../src/components/progress-bar";
import type { ProgressBarSegment } from "../../../src/components/progress-bar";
import type { TextTone } from "../../../src/components/signed-amount";
import { Example, Note } from "../lib/section";

/**
 * ProgressBar `legendTone` (0.18): the legend's figures in a text tone of their own —
 * keksdose's tax card, whose parts are one bucket at three certainties (a class ramp)
 * while the figures carry the bucket's money direction.
 */

const chf = new Intl.NumberFormat("en-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 });

/** One hue at three strengths: the same money, less and less certain. */
const CERTAINTY: ProgressBarSegment[] = [
  { key: "booked", label: "Booked", value: 0, className: "bg-[var(--chart-1)]" },
  { key: "committed", label: "Committed", value: 0, className: "bg-[color-mix(in_oklab,var(--chart-1)_60%,var(--bg-surface))]" },
  { key: "extrapolated", label: "Extrapolated", value: 0, className: "bg-[color-mix(in_oklab,var(--chart-1)_30%,var(--bg-surface))]" },
];

function bucket(values: [number, number, number]): ProgressBarSegment[] {
  return CERTAINTY.map((seg, i) => ({ ...seg, value: values[i] }));
}

const TONES: Array<TextTone> = ["muted", "income", "expense", "net", "default"];

export function ProgressLegendTone018Demo() {
  const [tone, setTone] = useState<TextTone>("expense");
  const owed = bucket([4200, 1800, 900]);
  const refunds = bucket([650, -120, 300]);
  return (
    <Example
      label="ProgressBar — legendTone"
      hint="the legend's figures in a text tone: one for every row, or one per row"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs text-[var(--text-muted)]">Tax owed</div>
          <div className="text-lg tabular-nums text-[var(--money-expense)]">{chf.format(4200)}</div>
          <ProgressBar
            className="mt-2"
            size="slim"
            aria-label="Tax owed"
            max={6900}
            formatValue={(v) => chf.format(v)}
            segments={owed}
            legend
            sensitive
            legendTone={tone}
          />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs text-[var(--text-muted)]">Refunds, toned by each part's sign</div>
          <div className="text-lg tabular-nums text-[var(--money-income)]">{chf.format(650)}</div>
          <ProgressBar
            className="mt-2"
            size="slim"
            aria-label="Refunds"
            max={950}
            formatValue={(v) => chf.format(v)}
            segments={refunds}
            legend
            legendTone={(seg) => (seg.value < 0 ? "expense" : "income")}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]" role="group" aria-label="legendTone">
        <code className="font-mono text-xs">legendTone</code>
        {TONES.map((t) => (
          <label key={t} className="flex items-center gap-1">
            <input type="radio" name="legend-tone-018" checked={tone === t} onChange={() => setTone(t)} />
            <span className="font-mono text-xs">{t}</span>
          </label>
        ))}
      </div>
      <Note>
        Default `muted`: no change for a bar that sets nothing. The swatches and names keep their colours; `sensitive` still tags each toned figure `data-private`. A `legendValue` node inherits the tone unless it sets its own.
      </Note>
    </Example>
  );
}
