import { describe, expect, it } from "vitest";
import { cellNumber, isCellNumber, parseRows, parseTable, splitRow } from "../table-text";

/**
 * The five shapes a measuring rig actually puts on the clipboard, and the two decimal
 * rules read against each other on every one of them.
 *
 * This is the table an audit measured over the three parsers that used to exist in
 * Lenkbank before this module replaced them, kept as a test because the disagreement
 * was never visible: two of the five were answered differently by two doors, and in
 * each case one of the answers was silent — a wrong table nobody was told about, and
 * an empty one that looks exactly like a paste that did not happen.
 *
 * **Read through the two rules rather than through the two doors.** Every one of
 * those disagreements was a *lexing* disagreement — a separator or a comma — and
 * both rules are this module's. What a door adds on top is only the shape of the
 * answer (a caller that transposes to columns and counts the lines it lost,
 * `parseRows` refusing on the first one), and a caller's shape is tested where it
 * lives.
 */
const SHAPES: { name: string; text: string; rows: number[][] }[] = [
  {
    name: "German Excel: semicolon columns, decimal commas",
    text: "s;out;back\n0,5;1,25;2,75\n1,5;2,25;3,75",
    rows: [
      [0.5, 1.25, 2.75],
      [1.5, 2.25, 3.75],
    ],
  },
  {
    name: "English CSV: comma columns, decimal points",
    text: "s,out,back\n0.5,1.25,2.75\n1.5,2.25,3.75",
    rows: [
      [0.5, 1.25, 2.75],
      [1.5, 2.25, 3.75],
    ],
  },
  {
    name: "rig log: tab columns, decimal commas",
    text: "s\tout\tback\n0,5\t1,25\t2,75\n1,5\t2,25\t3,75",
    rows: [
      [0.5, 1.25, 2.75],
      [1.5, 2.25, 3.75],
    ],
  },
  {
    // The defect. Two of the three old parsers split every number in two here
    // and accepted the result; the third came back with nothing.
    name: "printed or dumped: whitespace columns, decimal commas",
    text: "0,5 1,25 2,75\n1,5 2,25 3,75",
    rows: [
      [0.5, 1.25, 2.75],
      [1.5, 2.25, 3.75],
    ],
  },
  {
    // The other one. One column of this file was written by a different tool, so
    // the old whole-text rule — decimal commas only if no decimal POINT appears
    // anywhere — read the whole export as unreadable.
    name: "semicolon columns, one of them exported with a decimal point",
    text: "s;out;back\n0,5;1.25;2,75\n1,5;2.25;3,75",
    rows: [
      [0.5, 1.25, 2.75],
      [1.5, 2.25, 3.75],
    ],
  },
];

describe("the two decimal rules agree on what a rig writes", () => {
  for (const { name, text, rows } of SHAPES) {
    it(`reads ${name} the same way under either rule`, () => {
      expect(parseRows(text, 3)).toEqual({ rows });
      // The same text through the file rule, which decides the separator and the
      // comma once for the whole of it instead of line by line. It must reach
      // the same numbers and lose nothing: a `skipped` line here is exactly the
      // silent empty answer this table was written for.
      // Exactly what the file door passes: no column count and one header
      // line, because a file says its own width.
      const file = parseTable(text, { decimal: "whole-text" });
      expect(file.rows).toEqual(rows);
      expect(file.skipped).toEqual([]);
    });
  }
});

describe("the silent wrong answer", () => {
  it("does not read a decimal comma as a column when whitespace already separates the line", () => {
    // `0,5 1,25 2,75` is three numbers, and every parser here used to make six
    // out of it: the row was accepted, sliced to the three columns the grid
    // asked for, and saved as [0, 5, 1]. Nothing on screen said so, because a
    // row of numbers is exactly what a measured table expects.
    expect(splitRow("0,5 1,25 2,75")).toEqual(["0.5", "1.25", "2.75"]);
    expect(parseRows("0,5 1,25 2,75\n1,5 2,25 3,75", 3)).toEqual({
      rows: [
        [0.5, 1.25, 2.75],
        [1.5, 2.25, 3.75],
      ],
    });
  });

  it("still separates on a comma a human typed spaces after", () => {
    // The other half of the same rule: `1, 2, 3` is a list, not a number with
    // two decimal marks, and a comma followed by a space is what tells them
    // apart. Fixing the line above by reading every comma as a decimal mark
    // would have broken this one.
    expect(splitRow("1, 2, 3")).toEqual(["1", "2", "3"]);
    expect(parseRows("1, 2, 3", 3)).toEqual({ rows: [[1, 2, 3]] });
  });
});

describe("the silent empty answer", () => {
  it("names the line rather than answering with no rows at all", () => {
    // A grouped number (`1.234,5`) is one this module does not read. What made
    // that a defect rather than a limitation is that the two leading lines a
    // header is allowed to occupy swallowed both data lines, so the text view
    // was handed `{ rows: [] }`, cleared the table, and said nothing — a reader
    // who pasted a sweep and got an empty grid cannot tell a bad paste from a
    // bad parser.
    expect(parseRows("0,5;1.234,5;2,75\n1,5;2.345,6;3,75", 3)).toEqual({ error: 1 });
  });

  it("names the line of a table that is nothing but a header", () => {
    expect(parseRows("travel\tout\tback", 3)).toEqual({ error: 1 });
  });

  it("is empty, without an error, only for text with nothing in it", () => {
    expect(parseRows("  \n\n", 3)).toEqual({ rows: [] });
  });
});

describe("parseTable", () => {
  it("takes a units line under the names as part of the header, where a door asks for two", () => {
    // A bench export writes `s;F;F2` and then `mm;N;N`. The names are what the
    // column selects need; the units are the measurement's own and are said by
    // those selects, so the second line is absorbed and not returned.
    const parsed = parseTable("s;F;F2\nmm;N;N\n0,5;1,25;2,75", {
      decimal: "per-line",
      columns: 3,
      headerLines: 2,
    });
    expect(parsed.header).toEqual(["s", "F", "F2"]);
    expect(parsed.rows).toEqual([[0.5, 1.25, 2.75]]);
  });

  it("keeps a header field as it was written, whatever the numbers under it are read as", () => {
    const parsed = parseTable("Weg [mm];Kraft [N]\n0,5;1,25", { decimal: "whole-text" });
    expect(parsed.header).toEqual(["Weg [mm]", "Kraft [N]"]);
    expect(parsed.decimalComma).toBe(true);
  });

  it("numbers a skipped line as it stands in the text, blank lines included", () => {
    // The number goes on screen, so it has to be the one the reader can count
    // to in the box they pasted into.
    const parsed = parseTable("0\t1\t2\n\n3\t4\t5\nend of record", {
      decimal: "per-line",
      columns: 3,
    });
    expect(parsed.skipped).toEqual([4]);
  });

  it("decides the comma per line for a paste and once for a file", () => {
    // The same two lines, read two ways. Per line, the second line's own
    // semicolons say its commas are decimal marks. For a file, the separator is
    // taken once from the line most likely to be data — which is the second.
    const text = "0.5,1.25\n0,5;1,25";
    expect(parseTable(text, { decimal: "per-line", headerLines: 0 }).rows).toEqual([
      [0.5, 1.25],
      [0.5, 1.25],
    ]);
    const file = parseTable(text, { decimal: "whole-text", headerLines: 0 });
    expect(file.decimalComma).toBe(true);
    expect(file.skipped).toEqual([1]);
  });

  it("drops a recorder's banner without spending the header on it", () => {
    const parsed = parseTable("# recorder v2\ns;F\n0,5;1,25", { decimal: "per-line" });
    expect(parsed.header).toEqual(["s", "F"]);
    expect(parsed.rows).toEqual([[0.5, 1.25]]);
  });
});

describe("one cell", () => {
  it("reads a comma in a single cell as a decimal mark, because there is nothing to separate", () => {
    expect(cellNumber("0,5")).toBe(0.5);
    expect(isCellNumber("0,5")).toBe(true);
  });

  it("is not a number while it is still being typed", () => {
    // "-" and "1." are states a number passes through, and an empty cell is a
    // hole in the measurement rather than a zero.
    expect(isCellNumber("-")).toBe(false);
    expect(isCellNumber("")).toBe(false);
    expect(isCellNumber("   ")).toBe(false);
  });
});

describe("a known width", () => {
  it("drops the columns past it rather than refusing the line", () => {
    // A trailing counter or timestamp column is what an export normally carries, not
    // an error. It still has to be a number: every field of a row is read first.
    expect(parseRows("0,5;1,25;7\n1,5;2,25;8", 2)).toEqual({
      rows: [
        [0.5, 1.25],
        [1.5, 2.25],
      ],
    });
  });

  it("reports a line with fewer columns than the caller asked for", () => {
    const parsed = parseTable("1;2;3\n4;5\n6;7;8", { decimal: "per-line", columns: 3 });
    expect(parsed.rows).toEqual([
      [1, 2, 3],
      [6, 7, 8],
    ]);
    expect(parsed.skipped).toEqual([2]);
  });
});

describe("what the file rule reports back", () => {
  it("says no decimal comma was assumed for an English CSV", () => {
    const parsed = parseTable("s,out\n0.5,1.25", { decimal: "whole-text" });
    expect(parsed.decimalComma).toBe(false);
    expect(parsed.rows).toEqual([[0.5, 1.25]]);
  });

  it("answers an empty text with an empty table and no header", () => {
    expect(parseTable("\n  \n", { decimal: "whole-text" })).toEqual({
      rows: [],
      header: null,
      decimalComma: false,
      skipped: [],
    });
  });
});
