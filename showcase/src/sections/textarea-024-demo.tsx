import { useState } from "react";
import { FieldHint, Textarea, ToggleGroup } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.24: the Textarea's floated label on a scrolled field (Kurvenschmiede). Fields page
 * (slug `fields`).
 *
 * Both fields open already scrolled a few lines down — that is the state the bug lived
 * in: before 0.24 the first visible line ran straight under "Paste a table", on desktop
 * and on a phone alike. Now the label strip keeps the field's own surface behind it,
 * so the text slides out of sight under the strip instead. The state toggle repaints
 * that surface (read-only and disabled take the inset surface, invalid only the
 * border), and the strip has to follow every one of them. Synthetic values only.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

// A recorder export as a user would paste it: a header and forty rows, far more than
// the five the field shows.
const TABLE = [
  "time;setpoint;actual",
  ...Array.from({ length: 40 }, (_, i) => {
    const t = (i * 0.05).toFixed(2);
    const set = (i < 10 ? 0 : 1).toFixed(3);
    const act = (i < 10 ? 0 : 1 - Math.exp(-(i - 10) / 6)).toFixed(3);
    return `${t};${set};${act}`;
  }),
].join("\n");

const NOTES = Array.from(
  { length: 8 },
  (_, i) =>
    `Run ${i + 1}: the step response settled inside the band; the overshoot stayed below the limit and the example rig logged no faults.`,
).join("\n");

type State = "editable" | "readOnly" | "disabled" | "invalid";

/** Scroll a field a few lines down once it mounts, so the demo opens in the state the
 *  report was about rather than waiting for someone to scroll it there. */
const scrolled = (el: HTMLTextAreaElement | null) => {
  if (el && el.scrollTop === 0) el.scrollTop = 52;
};

export function Textarea024Demo() {
  const [table, setTable] = useState(TABLE);
  const [notes, setNotes] = useState(NOTES);
  const [state, setState] = useState<State>("editable");
  const [rtl, setRtl] = useState(false);
  const stateProps = {
    readOnly: state === "readOnly",
    disabled: state === "disabled",
    invalid: state === "invalid",
  };
  return (
    <Example
      label="Textarea — the floated label on a scrolled field"
      hint="both fields open scrolled down: the text slides under the label strip, never through the label"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Field state"
            size="sm"
            value={state}
            onChange={(v) => setState(v as State)}
            options={[
              { value: "editable", label: "Editable" },
              { value: "readOnly", label: "Read-only" },
              { value: "disabled", label: "Disabled" },
              { value: "invalid", label: "Invalid" },
            ]}
          />
          <ToggleGroup
            aria-label="Direction"
            size="sm"
            value={rtl ? "rtl" : "ltr"}
            onChange={(v) => setRtl(v === "rtl")}
            options={[
              { value: "ltr", label: "LTR" },
              { value: "rtl", label: "RTL" },
            ]}
          />
        </div>
        <div dir={rtl ? "rtl" : undefined} className="grid gap-4 md:grid-cols-2">
          <Textarea
            ref={scrolled}
            label="Paste a table"
            hint={<FieldHint label="Semicolon, comma or tab separated; the first line may be a header." />}
            rows={5}
            wrap="off"
            spellCheck={false}
            className="font-mono text-xs"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            {...stateProps}
          />
          <Textarea
            ref={scrolled}
            label="Notes on the runs"
            rows={5}
            maxLength={2000}
            showCount
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            {...stateProps}
          />
        </div>
        <Note>
          The strip is the field&apos;s top padding made to stay put: an {code("aria-hidden")} layer behind the
          label, inside the border, in the same {code("--bg-surface")} / {code("--bg-surface-2")} the field
          itself wears in that state, and only while the label is floated — an empty, unfocused field and an
          unlabelled one look exactly as before. It stops short of a classic scrollbar (either side, so RTL too)
          rather than hiding its top arrow, and it sits at the top, so the resize handle, {code("rows")} and{" "}
          {code("showCount")} are untouched.
        </Note>
      </div>
    </Example>
  );
}
