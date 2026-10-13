import { useRef, useState } from "react";
import {
  Button,
  MeasuredGrid,
  UiKitProvider,
  useMeasuredRows,
  useWindowedRows,
  DataTable,
  NumberInput,
  Switch,
  formatMoney,
} from "@eifi1/ui-kit";
import { Example, Note, Stage, code, beat, StateLine } from "../lib/section";
import { InlineEditField } from "../../../src/components/inline-edit-field";
import { WriteLockProvider } from "../../../src/components/write-lock";

/**
 * MeasuredGrid and useMeasuredRows.
 *
 * A measured table: numeric columns typed cell by cell or pasted as a block. Every
 * specimen prints what the hook answers under it — `ready`, the point count and the
 * problem count — because that answer, not the look, is what a caller builds a Save
 * button on.
 */

/** A swept measurement, four hundred rows of it: enough that the windowing shows (the
 *  grid mounts a screenful and a few rows either side) and short enough to scroll. */
const SWEEP = Array.from({ length: 400 }, (_, index) => {
  const angle = -200 + index;
  const travel = angle * 0.2618 + Math.sin(angle / 40) * 1.5;
  return [angle, travel, 120 + Math.abs(angle) * 0.45];
});

const SWEEP_COLUMNS = [
  { label: "Angle", unit: "deg" },
  { label: "Travel", unit: "mm" },
  { label: "Force", unit: "N" },
];

/** What to copy for the paste specimen: a header line, a German tab-separated line and
 *  an English CSV line, with a trailing column the grid has no room for. */
const SAMPLE = [
  "time\tx\ty\tz",
  "0,5\t1,25\t2,75\t12:00:01",
  "1.5,2.25,3.75,12:00:02",
  "2;3,5;4,5;12:00:03",
].join("\n");

/** What the hook answers, under a specimen. */
function GridStateLine({ ready, points, problems }: { ready: boolean; points: number; problems: number }) {
  return (
    <p className="mt-2 font-mono text-xs text-muted">
      ready = {String(ready)} · rows = {points} · problems = {problems}
    </p>
  );
}

export function MeasuredGridDemo() {
  const sweep = useMeasuredRows(SWEEP, { digits: 3 });
  const pasted = useMeasuredRows([]);
  const german = useMeasuredRows([[0.5, 1.25], [1, 2.5]], { locale: "de-DE" });
  const generated = useMeasuredRows([], { digits: 2, locale: "fr-FR" });
  const rtl = useMeasuredRows([[1, 10], [2, 20], [3, 30]]);

  return (
    <>
      <Note>
        <strong>Keyboard:</strong> the grid is one tab stop. Arrows move between cells (Left/Right
        flip in a right-to-left page), Home/End go to the ends of the row and with Ctrl to the ends
        of the table, PageUp/PageDown move a screenful. Typing replaces a cell; F2 edits it in place,
        where Left/Right move the caret and leave the cell only at the edge of its text; Escape puts
        back what the cell held. Enter and ArrowDown move down a column and add a row past the last
        one.
      </Note>

      <Example label="MeasuredGrid — 400 measured rows" hint="windowed: only the rows on screen are mounted">
        <Stage>
          <div data-stage="wide">
            <MeasuredGrid
              label="Steering sweep"
              hint="Type a letter into a cell to see it marked invalid, and the hook stop being ready."
              columns={SWEEP_COLUMNS}
              {...sweep.props}
            />
            <GridStateLine ready={sweep.ready} points={sweep.rows.length} problems={sweep.problems} />
          </div>
        </Stage>
      </Example>

      <Example label="MeasuredGrid — paste a block" hint="from any cell; extra columns and one header line dropped">
        <Stage>
          <div data-stage="wide" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <MeasuredGrid
                label="Pasted table"
                columns={[{ label: "x" }, { label: "y" }, { label: "z", unit: "N" }]}
                {...pasted.props}
              />
              <GridStateLine ready={pasted.ready} points={pasted.rows.length} problems={pasted.problems} />
            </div>
            <div>
              <p className="mb-1 text-caption font-medium text-muted">
                Copy this, click a cell, paste
              </p>
              <pre className="overflow-x-auto rounded-md border border-subtle bg-surface-2 p-3 font-mono text-xs text-primary">
                {SAMPLE}
              </pre>
            </div>
          </div>
        </Stage>
        <Note>
          Each pasted line is read on its own evidence (<code>@eifi1/ui-kit/table-text</code>, the
          per-line rule): the tab and semicolon lines read their commas as decimal marks, the comma
          line separates on them. The first line is not numbers, so it is a header and is skipped;
          the fourth field of each line has no column to land in and is dropped. Text with no tab,
          newline or semicolon in it is an ordinary paste into one cell.
        </Note>
      </Example>

      <Example label="MeasuredGrid — locale, text view, read-only" hint="de-DE decimal comma">
        <Stage>
          <div data-stage="wide" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UiKitProvider locale="de-DE">
              <div>
                <MeasuredGrid
                  label="Typed in German"
                  columns={[{ label: "Weg", unit: "mm" }, { label: "Kraft", unit: "N" }]}
                  views={["text", "cells"]}
                  {...german.props}
                />
                <GridStateLine ready={german.ready} points={german.rows.length} problems={german.problems} />
              </div>
            </UiKitProvider>
            <MeasuredGrid
              label="Read-only"
              columns={[{ label: "Weg", unit: "mm" }, { label: "Kraft", unit: "N" }]}
              views={["cells"]}
              disabled
              cells={german.cells}
              onCells={() => {}}
            />
          </div>
        </Stage>
        <Note>
          The text view commits on blur and names the first line it cannot read rather than
          dropping it — try a line with a word in it. A read-only grid can still be walked with the
          arrows; nothing in it can be changed.
        </Note>
      </Example>

      <Example
        label="MeasuredGrid — generated rows, taller rows, own words"
        hint="setRows writes numbers in; rowHeight, a locale prop and labels change the grid itself"
      >
        <Stage>
          <div data-stage="wide" className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  generated.setRows(
                    Array.from({ length: 24 }, (_, i) => [i * 15, Math.sin((i * 15 * Math.PI) / 180)]),
                  )
                }
              >
                Generate a sine (setRows)
              </Button>
              <Button variant="ghost" onClick={() => generated.setCells([])}>
                Empty it (setCells)
              </Button>
            </div>
            <MeasuredGrid
              label="Generated curve"
              columns={[{ label: "Angle", unit: "deg" }, { label: "Sine" }]}
              // The decimal comma for pasted and text-view cells, without a provider.
              locale="fr-FR"
              // Fixed row height the windowing divides by; taller for a touch screen.
              rowHeight={36}
              labels={{
                addRow: "Add a measurement",
                clear: "Start over",
                pasteHint: "Paste straight from the lab's spreadsheet",
                points: (n) => (n === 1 ? "1 measurement" : `${n} measurements`),
              }}
              {...generated.props}
            />
            <GridStateLine ready={generated.ready} points={generated.rows.length} problems={generated.problems} />
            <p className="font-mono text-xs text-muted">
              rows[1] = {generated.rows[1] ? JSON.stringify(generated.rows[1]) : "—"}
            </p>
          </div>
        </Stage>
        <Note>
          <code>setRows</code> takes numbers and writes them as cells in the hook&apos;s locale
          (<code>fr-FR</code>, so a comma) rounded to its <code>digits</code> (2);{" "}
          <code>rows</code> reads them back as numbers once the table is whole.
        </Note>
      </Example>

      <Example label="MeasuredGrid — right-to-left" hint='dir="rtl": the columns run from the right, and so do the arrows'>
        <Stage>
          <div data-stage="wide" dir="rtl">
            <MeasuredGrid
              label="Right-to-left"
              columns={[{ label: "x" }, { label: "y" }]}
              views={["cells"]}
              // The English count inside a right-to-left table: the bidi algorithm puts
              // the number at the start of an RTL run, so "3 points" read "points 3".
              // FSI…PDI isolate it as its own left-to-right phrase — what <bdi> does, in
              // a string. An Arabic dictionary's own words would not need it.
              labels={{ points: (n) => `\u2068${n === 1 ? "1 point" : `${n} points`}\u2069` }}
              {...rtl.props}
            />
          </div>
        </Stage>
        <Note>
          Click the first cell (on the right) and press ←: the caret moves to the next column, which
          is further left. Left and Right are visual directions, not &quot;previous&quot; and
          &quot;next&quot;.
        </Note>
      </Example>

      <Example label="useWindowedRows — a list of your own" hint="10,000 rows; only the visible ones and a few either side are mounted, each measured as it renders">
        <Stage>
          <div data-stage="wide">
            <WindowedList />
          </div>
        </Stage>
      </Example>
    </>
  );
}

/** Ten thousand rows, rendered as a window: a spacer the full height of the list, and
 *  only rows `first` to `last` positioned inside it.
 *
 *  0.32: each row is placed at `offsetOf(index)` with `estimate` (32px × the text size's
 *  scale) as its MINIMUM height, and `measureRef` reports its real one. A row that wraps —
 *  the reading and its value, in a narrow pane at Extra large — grows and pushes the next
 *  one down; at `top: index × 32` it was cut off and drawn over
 *  (docs/text-size-harmonization.md §10.9). */
function WindowedList() {
  const COUNT = 10_000;
  const ROW = 32;
  const scrollRef = useRef<HTMLDivElement>(null);
  const { first, last, totalHeight, offsetOf, estimate, measureRef } = useWindowedRows(COUNT, ROW, scrollRef);
  return (
    <div className="space-y-2">
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto rounded-md border border-subtle bg-surface"
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          {Array.from({ length: last - first }, (_, i) => {
            const index = first + i;
            return (
              <div
                key={index}
                ref={measureRef}
                data-row-index={index}
                style={{ position: "absolute", top: offsetOf(index), minHeight: estimate, insetInline: 0 }}
                className="flex flex-wrap items-center justify-between gap-x-3 border-b border-subtle px-3 py-1 text-sm text-primary"
              >
                <span>Reading {index + 1}</span>
                <span className="font-mono text-xs text-muted">
                  {(Math.sin(index / 50) * 100).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="font-mono text-xs text-muted [overflow-wrap:anywhere]">
        first = {first} · last = {last} · mounted = {last - first} of {COUNT} · estimate = {estimate}px ·
        totalHeight = {Math.round(totalHeight)}px
      </p>
    </div>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

interface Envelope {
  id: number;
  name: string;
  assigned: string;
}

const START: Envelope[] = [
  { id: 1, name: "Rent", assigned: "1100.0000" },
  { id: 2, name: "Groceries", assigned: "450.0000" },
  { id: 3, name: "Holidays", assigned: "0.0000" },
];

function EnvelopeTable() {
  const [rows, setRows] = useState(START);
  const [locked, setLocked] = useState(false);
  const [log, setLog] = useState("—");
  const update = (id: number, patch: Partial<Envelope>) =>
    setRows((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <Example label="InlineEditField in a DataTable" hint="click a value — Enter or leaving saves, Escape cancels">
      <div className="flex flex-col gap-3">
        <Switch checked={locked} onCheckedChange={setLocked} label="Read-only demo budget" />
        <WriteLockProvider locked={locked} reason="Read-only demo — saving is disabled.">
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              {
                key: "name",
                header: "Envelope",
                cell: (r) => (
                  <InlineEditField
                    commit
                    label="Envelope name"
                    value={r.name}
                    inputProps={{ maxLength: 40 }}
                    onCommit={(name) => {
                      if (name.trim() === "") throw new Error("A name is needed.");
                      update(r.id, { name: name.trim() });
                      setLog(`renamed to ${name.trim()}`);
                    }}
                    formatError={(e) => (e as Error).message}
                  />
                ),
              },
              {
                key: "assigned",
                header: "Assigned",
                headClassName: "text-end",
                cell: (r) => (
                  <InlineEditField
                    commit
                    redact
                    align="end"
                    label="Assigned"
                    value={r.assigned}
                    display={(v) => formatMoney(Number(v), "CHF")}
                    // The column is Numeric(18,4): "1100" is the server's "1100.0000".
                    isEqual={(a, b) => Number(a) === Number(b)}
                    onCommit={(v) =>
                      beat(500).then(() => {
                        update(r.id, { assigned: Number(v).toFixed(4) });
                        setLog(`assigned ${v}`);
                      })
                    }
                    editor={(p) => (
                      <NumberInput
                        calculator={false}
                        aria-label={p.label}
                        value={p.value}
                        onChange={p.onChange}
                        onCommit={p.commit}
                        aria-invalid={p.invalid || undefined}
                        aria-describedby={p.describedBy}
                        inputClassName="px-2 py-1 text-end"
                      />
                    )}
                  />
                ),
              },
            ]}
          />
        </WriteLockProvider>
        <StateLine>{`last = ${log}`}</StateLine>
      </div>
      <Note>
        The value is a quiet button named by the value — the action (&ldquo;Edit Assigned&rdquo;) is its description,
        so a screen reader does not hear a column of &ldquo;edit, edit, edit&rdquo;. A text value needs no editor; any
        other takes one through {code("editor")} (here {code("NumberInput calculator={false}")}, whose own{" "}
        {code("onCommit")} hands over the evaluated &ldquo;1100-50&rdquo;). Unchanged by {code("isEqual")} is not a
        write. A returned promise keeps the editor read-only with a spinner; a rejection (or a throw — empty the name)
        keeps it open with the failure under it. With {code("commit")} under a lock, the value stays a button,{" "}
        {code("aria-disabled")}, with the reason — never a field that takes keys it cannot save.
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

function Rename() {
  const [name, setName] = useState("Household");
  return (
    <Example label="InlineEditField — a rename that can fail" hint="the save rejects for “Taken”; the typed name stays for a retry">
      <Stage>
        <div className="flex items-center gap-2 text-sm font-medium">
          <InlineEditField
            label="Budget name"
            value={name}
            className="flex-1"
            formatError={(e) => (e as Error).message}
            onCommit={(next) =>
              beat(600).then(() => {
                if (next.trim().toLowerCase() === "taken") throw new Error("You already have a budget called that.");
                setName(next.trim());
              })
            }
          />
        </div>
      </Stage>
      <Note>
        keksdose&rsquo;s budgets rename was an {code("Input")} with Save and Cancel and no Escape. The failure is shown
        under the field, described and spoken; the next keystroke clears it. Focus returns to the value after Enter or
        Escape, and stays where you went after a save that came from leaving the field.
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

/** Table entry (`measured-grid`): the value that edits in place. */
export function InlineEdit022Demo() {
  return (
    <>
      <EnvelopeTable />
      <Rename />
    </>
  );
}
