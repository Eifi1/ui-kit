import { useState } from "react";
import { Button, Select, Textarea } from "@eifi1/ui-kit";
// The two subpath entries, imported from their source files: the showcase's alias
// (showcase/alias.ts + tsconfig `paths`) maps only "@eifi1/ui-kit" and "/dates", and
// a bare "@eifi1/ui-kit/rhf" would resolve INTO the barrel file. A consumer writes
// `from "@eifi1/ui-kit/rhf"` and `from "@eifi1/ui-kit/table-text"`.
import { cellNumber, isCellNumber, parseRows, parseTable, splitRow } from "@eifi1/ui-kit/table-text";
import { Example, Note, OutTable } from "../lib/section";

/**
 * `@eifi1/ui-kit/table-text` — reading a pasted table or a CSV. Rendered on the
 * "Table entry" page, under MeasuredGrid, because it is the parser MeasuredGrid's paste
 * runs through; it used to sit on the Helpers page.
 */
export function TableTextDemo() {
  return <TableTextHelpers />;
}

const q = (v: unknown) => JSON.stringify(v);

const GERMAN_EXPORT = "Weg;Kraft\nmm;N\n0,5;12,25\n1,0;13,5\n1,5;14,75";
const ENGLISH_CSV = "x,y\n0.5,12.25\n1.0,13.5";
const MATLAB_DUMP = "0,5 1,25 2,75\n1,0 2,5 5,5";
const HAND_TYPED = "1, 2, 3";

function TableTextHelpers() {
  const [text, setText] = useState(GERMAN_EXPORT);
  const [rule, setRule] = useState<"whole-text" | "per-line">("whole-text");
  const parsed = parseTable(text, { decimal: rule, headerLines: 2 });
  const rows2 = parseRows(text, 2);

  return (
    <>
      <Example label="parseTable · parseRows — live" hint="paste a table from a spreadsheet into the box">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Textarea
              label="Text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              {[GERMAN_EXPORT, ENGLISH_CSV, MATLAB_DUMP].map((sample, i) => (
                <Button key={i} variant="secondary" className="text-xs" onClick={() => setText(sample)}>
                  {["German export", "English CSV", "MATLAB dump"][i]}
                </Button>
              ))}
            </div>
            <Select
              label="decimal"
              value={rule}
              onChange={(e) => setRule(e.target.value as "whole-text" | "per-line")}
            >
              <option value="whole-text">&quot;whole-text&quot; — the file door</option>
              <option value="per-line">&quot;per-line&quot; — the paste door</option>
            </Select>
          </div>
          <OutTable
            rows={[
              [`parseTable(text, { decimal: "${rule}", headerLines: 2 }).header`, q(parsed.header)],
              [".rows", q(parsed.rows)],
              [".decimalComma", q(parsed.decimalComma)],
              [".skipped", q(parsed.skipped)],
              ["parseRows(text, 2)", q(rows2)],
            ]}
          />
        </div>
      </Example>

      <Example label="splitRow · cellNumber · isCellNumber" hint="one line, and one cell">
        <OutTable
          rows={[
            [`splitRow(${q("0,5;12,25")})`, q(splitRow("0,5;12,25"))],
            [`splitRow(${q("0,5 1,25 2,75")})`, q(splitRow("0,5 1,25 2,75"))],
            [`splitRow(${q("0.5\t12.25")})`, q(splitRow("0.5\t12.25"))],
            [`splitRow(${q(HAND_TYPED)})`, q(splitRow(HAND_TYPED))],
            [`parseTable(${q("0,5;1\n1,5;2")}, { decimal: "per-line", columns: 1 }).rows`, q(parseTable("0,5;1\n1,5;2", { decimal: "per-line", columns: 1 }).rows)],
            [`parseRows(${q("a;b\n1;x")}, 2)`, q(parseRows("a;b\n1;x", 2))],
            [`cellNumber(${q("12,5")})`, q(cellNumber("12,5"))],
            [`isCellNumber(${q("12,5")})`, q(isCellNumber("12,5"))],
            [`isCellNumber(${q("")})`, q(isCellNumber(""))],
            [`isCellNumber(${q("1.234,5")})`, q(isCellNumber("1.234,5"))],
          ]}
        />
        <Note>
          A comma between digits in a cell is always a decimal mark; in a line it depends on
          what else separates the columns. <code className="font-mono">columns</code> slices a
          wider line; <code className="font-mono">parseRows</code> answers with the first line
          it could not read rather than an empty table.
        </Note>
      </Example>
    </>
  );
}
