import { describe, expect, it } from "vitest";
import {
  assignColumnRole,
  guessMapping,
  missingRoles,
  readMappedTable,
  readTextFile,
  roleOfColumn,
} from "../column-mapping";
import type { ColumnRole } from "../column-mapping";
import { parseTextTable } from "../table-text";

/** Kurvenschmiede's comparison: three numeric roles, all required. */
const CURVE: ColumnRole<"time" | "setpoint" | "actual">[] = [
  { value: "time", label: "Time", required: true, numeric: true },
  { value: "setpoint", label: "Setpoint", required: true, numeric: true },
  { value: "actual", label: "Actual", required: true, numeric: true },
];

/** keksdose's bank import, cut down: a required date and a required group for the money. */
type BankRole = "date" | "amount" | "debit" | "credit" | "payee";
const BANK: ColumnRole<BankRole>[] = [
  { value: "date", label: "Booking date", required: true },
  { value: "amount", label: "Amount", required: "money" },
  { value: "debit", label: "Debit", required: "money" },
  { value: "credit", label: "Credit", required: "money" },
  { value: "payee", label: "Payee" },
];

describe("assignColumnRole", () => {
  it("moves a role rather than putting it on two columns, and clears what the column held", () => {
    const start = { time: 0, setpoint: 1, actual: 2 };
    // Time onto column 2: it leaves column 0, and column 2's actual is unplaced.
    expect(assignColumnRole(CURVE, start, 2, "time")).toEqual({ time: 2, setpoint: 1, actual: null });
    expect(assignColumnRole(CURVE, start, 1, null)).toEqual({ time: 0, setpoint: null, actual: 2 });
  });

  it("hands every other field of the caller's mapping back untouched", () => {
    // keksdose's CsvMapping carries the delimiter and the header flag beside the roles.
    const mapping = { date: 0, amount: null, debit: null, credit: null, payee: 1, delimiter: ";", has_header: true };
    const next = assignColumnRole(BANK, mapping, 3, "amount");
    expect(next).toEqual({ ...mapping, amount: 3 });
    expect(roleOfColumn(BANK, next, 3)).toBe("amount");
    expect(roleOfColumn(BANK, next, 2)).toBeNull();
  });
});

describe("missingRoles", () => {
  it("names each unplaced required role, and a group none of whose roles is placed", () => {
    expect(missingRoles(BANK, {})).toEqual([["date"], ["amount", "debit", "credit"]]);
    // A bank that splits debit and credit has no amount column and needs none.
    expect(missingRoles(BANK, { date: 0, debit: 3 })).toEqual([]);
  });

  it("counts a column past the table's width as no column", () => {
    expect(missingRoles(CURVE, { time: 0, setpoint: 1, actual: 2 }, 2)).toEqual([["actual"]]);
  });
});

describe("guessMapping", () => {
  it("places a role on the column named like it, and the required roles left over on the free columns in order", () => {
    expect(guessMapping(CURVE, ["Actual", "t", "x"], 3)).toEqual({ actual: 0, time: 1, setpoint: 2 });
    expect(guessMapping(CURVE, null, 4)).toEqual({ time: 0, setpoint: 1, actual: 2 });
  });

  it("does not guess an optional role by position", () => {
    // Twelve columns of a bank export: "the fifth role is the fifth column" would be a
    // wrong answer dressed as a suggestion.
    expect(guessMapping(BANK, ["Buchung", "Text", "Wert"], 3)).toEqual({ date: 0 });
    expect(guessMapping(BANK, ["Booking date", "payee", "Amount"], 3)).toEqual({ date: 0, payee: 1, amount: 2 });
  });
});

describe("readMappedTable", () => {
  it("moves a row a numeric role cannot read to the unread lines, in line order", () => {
    const table = parseTextTable(["t;soll;ist;note", "0;1,5;1,4;ok", "1;2,5;x;bad", "end of record", "2;3,5;3,4;"].join("\n"));
    const result = readMappedTable(table, CURVE, guessMapping(CURVE, table.header, table.width));
    expect(result.rows).toEqual([
      ["0", "1,5", "1,4", "ok"],
      ["2", "3,5", "3,4", ""],
    ]);
    expect(result.lines.map((line) => line.line)).toEqual([2, 5]);
    expect(result.unread).toEqual([
      { line: 3, text: "1;2,5;x;bad" },
      { line: 4, text: "end of record" },
    ]);
    expect(result.complete).toBe(true);
    expect(result.decimalComma).toBe(true);
  });

  it("does not check a column no numeric role sits on", () => {
    const table = parseTextTable("t;soll;ist;note\n0;1,5;1,4;ok\n1;2,5;2,4;x");
    const result = readMappedTable(table, CURVE, { time: 0, setpoint: 1, actual: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.unread).toEqual([]);
  });

  it("is incomplete while a required role is missing or no row was read", () => {
    const table = parseTextTable("t;soll\n0;1");
    expect(readMappedTable(table, CURVE, { time: 0, setpoint: 1 })).toMatchObject({
      complete: false,
      missing: [["actual"]],
    });
    const headerOnly = parseTextTable("t;soll;ist");
    expect(readMappedTable(headerOnly, CURVE, { time: 0, setpoint: 1, actual: 2 }).complete).toBe(false);
  });
});

describe("readTextFile", () => {
  it("reads UTF-8 as UTF-8", async () => {
    const file = new File(["Empfänger;Betrag\n"], "export.csv", { type: "text/csv" });
    expect(await readTextFile(file)).toBe("Empfänger;Betrag\n");
  });

  it("reads bytes that are not UTF-8 as Windows-1252, not as replacement characters", async () => {
    // "Empfänger" with ä as the single byte 0xE4, as a German export writes it.
    const bytes = new Uint8Array([0x45, 0x6d, 0x70, 0x66, 0xe4, 0x6e, 0x67, 0x65, 0x72]);
    expect(await readTextFile(new File([bytes], "export.csv"))).toBe("Empfänger");
  });
});
