import { MeasuredGrid, UiKitProvider, useMeasuredRows } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

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
function StateLine({ ready, points, problems }: { ready: boolean; points: number; problems: number }) {
  return (
    <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
      ready = {String(ready)} · rows = {points} · problems = {problems}
    </p>
  );
}

export function MeasuredGridDemo() {
  const sweep = useMeasuredRows(SWEEP, { digits: 3 });
  const pasted = useMeasuredRows([]);
  const german = useMeasuredRows([[0.5, 1.25], [1, 2.5]], { locale: "de-DE" });

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
            <StateLine ready={sweep.ready} points={sweep.rows.length} problems={sweep.problems} />
          </div>
        </Stage>
      </Example>

      <Example label="MeasuredGrid — paste a block" hint="from any cell; extra columns and one header line dropped">
        <Stage>
          <div data-stage="wide" className="grid gap-4 md:grid-cols-2">
            <div>
              <MeasuredGrid
                label="Pasted table"
                columns={[{ label: "x" }, { label: "y" }, { label: "z", unit: "N" }]}
                {...pasted.props}
              />
              <StateLine ready={pasted.ready} points={pasted.rows.length} problems={pasted.problems} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium text-[var(--text-muted)]">
                Copy this, click a cell, paste
              </p>
              <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-xs text-[var(--text-primary)]">
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
          <div data-stage="wide" className="grid gap-4 md:grid-cols-2">
            <UiKitProvider locale="de-DE">
              <div>
                <MeasuredGrid
                  label="Typed in German"
                  columns={[{ label: "Weg", unit: "mm" }, { label: "Kraft", unit: "N" }]}
                  views={["text", "cells"]}
                  {...german.props}
                />
                <StateLine ready={german.ready} points={german.rows.length} problems={german.problems} />
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
    </>
  );
}
