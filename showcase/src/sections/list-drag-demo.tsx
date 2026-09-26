import { useState } from "react";
import type { DragEvent } from "react";
import { GripVertical, User } from "lucide-react";
import { List, ListItem } from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";

/**
 * ListItem `targetProps` and `bordered` (0.11). `targetProps` hands extra attributes and
 * handlers to the row's main target — here HTML5 drag-and-drop on the WHOLE row, which a
 * grip inside a button cannot start in Firefox — and `bordered` gives unselected rows a
 * visible border, for rows laid out as a wrapping strip.
 */

const INITIAL = ["Warm-up", "Intervals 4 × 4 min", "Tempo", "Cool-down", "Stretching"];

function moved<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function DraggableRows() {
  const [segments, setSegments] = useState(INITIAL);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [selected, setSelected] = useState("Tempo");
  const [log, setLog] = useState("—");
  return (
    <Example
      label="ListItem — targetProps: the whole row is the drag source"
      hint="drag a row onto another to reorder; a click still selects"
    >
      <List aria-label="Session segments" className="max-w-sm">
        {segments.map((s, i) => (
          <ListItem
            key={s}
            title={s}
            subtitle={`Segment ${i + 1}`}
            leading={<GripVertical className="size-4 text-[var(--text-muted)]" aria-hidden />}
            selected={s === selected}
            onClick={() => setSelected(s)}
            className={over === i && dragging !== null && dragging !== i ? "ring-2 ring-[var(--brand)] rounded-md" : undefined}
            targetProps={{
              draggable: true,
              // A role here is IGNORED: the row keeps its own (a button).
              role: "listitem",
              "aria-roledescription": "draggable segment",
              onDragStart: (e: DragEvent<HTMLElement>) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
                setDragging(i);
              },
              onDragOver: (e: DragEvent<HTMLElement>) => {
                e.preventDefault();
                setOver(i);
              },
              onDragLeave: () => setOver((o) => (o === i ? null : o)),
              onDrop: (e: DragEvent<HTMLElement>) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (!Number.isNaN(from) && from !== i) {
                  setSegments((list) => moved(list, from, i));
                  setLog(`moved “${segments[from]}” to position ${i + 1}`);
                }
                setOver(null);
                setDragging(null);
              },
              onDragEnd: () => {
                setOver(null);
                setDragging(null);
              },
            }}
          />
        ))}
      </List>
      <OutTable
        rows={[
          ["order", segments.join(" → ")],
          ["selected (onClick)", selected],
          ["last drop", log],
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">targetProps</code> are spread on the row&apos;s main target — the 44px button —{" "}
          <em>first</em>, so the row&apos;s own role, name, state and click handling always win. Here they carry{" "}
          <code className="font-mono">draggable</code>, <code className="font-mono">onDragStart</code>,{" "}
          <code className="font-mono">onDragOver</code>, <code className="font-mono">onDrop</code> and{" "}
          <code className="font-mono">onDragEnd</code>, and an <code className="font-mono">aria-roledescription</code>.
          They also pass <code className="font-mono">role: &quot;listitem&quot;</code>, which is dropped: inspect a row
          and it is still a <code className="font-mono">button</code> — a role from outside would silently turn the row
          into something else. Drag needs a mouse; the keyboard reorder is the app&apos;s to add (a pair of move
          buttons in <code className="font-mono">actions</code>).
        </Note>
      </div>
    </Example>
  );
}

const PROFILES = ["Road bike", "Gravel", "Commuter", "Tandem", "Kids' trailer", "Winter tyres"];

function BorderedStrip() {
  const [active, setActive] = useState("Gravel");
  const [bordered, setBordered] = useState(true);
  return (
    <Example label="ListItem — bordered, in a wrapping strip" hint="rows laid out side by side, each a visible box">
      <label className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input type="checkbox" checked={bordered} onChange={(e) => setBordered(e.target.checked)} />
        <code className="font-mono">bordered</code>
      </label>
      <List aria-label="Profiles" density="compact" separator="none" className="flex-row flex-wrap gap-2">
        {PROFILES.map((p) => (
          <ListItem
            key={p}
            title={p}
            icon={User}
            density="compact"
            bordered={bordered}
            selected={p === active}
            onClick={() => setActive(p)}
            className="w-auto"
          />
        ))}
      </List>
      <OutTable rows={[["selected", active]]} />
      <div className="mt-3">
        <Note>
          The <code className="font-mono">List</code> is laid out as <code className="font-mono">flex-row flex-wrap</code>{" "}
          through its <code className="font-mono">className</code>, so the rows wrap at phone width.{" "}
          <code className="font-mono">bordered</code> draws <code className="font-mono">--border</code> round each
          unselected row instead of a transparent border — untick it and the strip reads as loose words. The selected
          row keeps its brand border either way.
        </Note>
      </div>
    </Example>
  );
}

export function ListDragDemo() {
  return (
    <>
      <DraggableRows />
      <BorderedStrip />
    </>
  );
}
