import { useState } from "react";
import { BulkActionBar, Button, Delta, StaticLegend, ToggleGroup } from "@eifi1/ui-kit";
import type { LegendEntry } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.13 display fixes: ToggleGroup `semantics="pressed"` (kastlan #47), Delta's figure
 * at zero (kastlan #48), a legend entry `align: "end"` (kastlan #49), and links as
 * BulkActionBar arrow-key stops (keksdose F8).
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

function PressedToggleGroup() {
  const [view, setView] = useState<"list" | "board" | "calendar">("list");
  const [log, setLog] = useState<string[]>([]);
  return (
    <Example
      label={'ToggleGroup — semantics="pressed"'}
      hint="toggle buttons (aria-pressed), each its own Tab stop — and still one always pressed"
    >
      <div className="grid max-w-md gap-2">
        <ToggleGroup
          semantics="pressed"
          aria-label="View"
          value={view}
          onChange={(v) => {
            setView(v);
            setLog((l) => [...l.slice(-3), v]);
          }}
          options={[
            { value: "list", label: "List" },
            { value: "board", label: "Board" },
            { value: "calendar", label: "Calendar" },
          ]}
        />
        <p className={READOUT}>onChange: {log.length ? log.join(", ") : "—"} (never null)</p>
        <Note>
          Pressing the pressed option re-sends its value rather than clearing it; {code("allowEmpty")} is still
          the way to a group that can be emptied. The default {code("semantics=\"radio\"")} is unchanged.
        </Note>
      </div>
    </Example>
  );
}

function DeltaAtZero() {
  return (
    <Example label="Delta at zero" hint="the figure stays beside the flat dash — a bare dash is for a missing value">
      <Row>
        <Delta value={0.0125} unit="percent" digits={2} goodDirection="down" label="rent" />
        <Delta value={0} unit="percent" digits={2} goodDirection="down" label="rent" />
        <Delta value={-0.004} unit="percent" digits={2} goodDirection="down" label="rent" />
        <Delta value={0} currency="CHF" arrow={false} />
      </Row>
    </Example>
  );
}

const GANTT_KEY: LegendEntry[] = [
  { key: "active", label: "Active lease", color: "var(--money-income)" },
  { key: "notice", label: "Notice given", color: "var(--warning)" },
  { key: "ended", label: "Ended", color: "var(--text-muted)" },
  {
    key: "today",
    label: "Today",
    color: "var(--danger)",
    icon: <span className="block h-3 w-px bg-[var(--danger)]" />,
    align: "end",
  },
];

function LegendEnd() {
  return (
    <Example label={'StaticLegend — entry align: "end"'} hint="kastlan's gantt key: the bars at the start, today at the end">
      <StaticLegend entries={GANTT_KEY} className="w-full" />
    </Example>
  );
}

function BarWithLink() {
  const [log, setLog] = useState("—");
  return (
    <Example label="BulkActionBar — a link among the actions" hint="Tab once into the bar, then ←/→: the link is a stop like the buttons">
      <div className="grid gap-2">
        <BulkActionBar variant="inline" count={3} onClear={() => setLog("cleared")}>
          <Button type="button" size="sm" variant="secondary" onClick={() => setLog("edit")}>
            Edit
          </Button>
          <Button
            href="#view-report"
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.preventDefault();
              setLog("view report");
            }}
          >
            View report
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setLog("delete")}>
            Delete
          </Button>
        </BulkActionBar>
        <p className={READOUT}>last: {log}</p>
      </div>
    </Example>
  );
}

export function Display013Demo() {
  return (
    <>
      <PressedToggleGroup />
      <DeltaAtZero />
      <LegendEnd />
      <BarWithLink />
    </>
  );
}
