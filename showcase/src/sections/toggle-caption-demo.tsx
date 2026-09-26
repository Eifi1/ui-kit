import { useState } from "react";
import { ToggleGroup } from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";

/**
 * ToggleGroup `caption` (0.11): a line under the group saying what the CHOSEN option
 * means — static, or a function of the value that changes (and is announced) with it.
 */

type Tyre = "slick" | "wet" | "inter";
type Diff = "open" | "locked" | "lsd";

const TYRE_CAPTION: Record<Tyre, string> = {
  slick: "Dry track only: the most grip above 20 °C, none on standing water.",
  wet: "Standing water: deep grooves clear it, but they overheat on a drying line.",
  inter: "A damp or drying track — between the two.",
};

export function ToggleCaptionDemo() {
  const [tyre, setTyre] = useState<Tyre>("slick");
  const [diff, setDiff] = useState<Diff | null>(null);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  return (
    <Example
      label="ToggleGroup — caption, static and as a function of the value"
      hint="a caption, not a hint behind a “?” — it describes the group and follows the choice"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <ToggleGroup<Tyre>
          label="Tyre"
          value={tyre}
          onChange={setTyre}
          caption={(v) => TYRE_CAPTION[v]}
          options={[
            { value: "slick", label: "Slick" },
            { value: "wet", label: "Wet" },
            { value: "inter", label: "Inter" },
          ]}
        />
        <ToggleGroup<Diff>
          label="Differential"
          allowEmpty
          value={diff}
          onChange={setDiff}
          caption={(v) =>
            v === null ? "Pick one — the setup sheet needs it." : v === "lsd" ? "Limited slip: the usual race choice." : null
          }
          options={[
            { value: "open", label: "Open" },
            { value: "locked", label: "Locked" },
            { value: "lsd", label: "LSD" },
          ]}
        />
        <div className="space-y-1">
          <span className="text-xs text-[var(--text-muted)]">no label, a static caption</span>
          <ToggleGroup<"metric" | "imperial">
            aria-label="Units"
            size="sm"
            value={units}
            onChange={setUnits}
            caption="Applies to every chart on this page."
            options={[
              { value: "metric", label: "Metric" },
              { value: "imperial", label: "Imperial" },
            ]}
          />
        </div>
      </div>
      <OutTable
        rows={[
          ["tyre", tyre],
          ["differential (allowEmpty)", diff ?? "null"],
          ["units", units],
        ]}
      />
      <div className="mt-3">
        <Note>
          The caption sits in muted 11px text under the field (or under the bare group, as in the third, which has
          only an <code className="font-mono">aria-label</code>) and is attached with{" "}
          <code className="font-mono">aria-describedby</code>. A FUNCTION caption is also a polite live region: a
          description is read when focus enters the group, not again when an arrow key changes the choice — so without
          it, the Tyre caption would change on screen and in silence. The Differential&apos;s function returns{" "}
          <code className="font-mono">null</code> for Open and Locked: the line empties without leaving a gap, and
          its value is <code className="font-mono">null</code> until something is picked
          (<code className="font-mono">allowEmpty</code>).
        </Note>
      </div>
    </Example>
  );
}
