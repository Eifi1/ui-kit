/**
 * Which column of a table plays which part — the headless half of {@link ColumnMapper}.
 *
 * Two apps built this by hand, the same way. Kurvenschmiede's columns input
 * (`features/control/columns-input.tsx`) reads a recorder's export and asks which
 * column is the time, the setpoint and the actual; keksdose's bank-file import
 * (`import-map-step.tsx`, `use-file-import.ts`) shows a bank's CSV and asks which
 * column is the booking date, the amount, the payee. Both then have the same four
 * rules, and keksdose wrote them down after getting each one wrong once:
 *
 * * **A role sits on one column at most, and a column carries one role.** Picking a
 *   role for a column MOVES it there from wherever it was ({@link assignColumnRole});
 *   the column it left falls back to "ignore" in the same step. There is no error
 *   state, because there is nothing wrong to report.
 * * **What is still missing is named**, not left to a disabled button
 *   ({@link missingRoles}). A required role can be one of a group: a bank export that
 *   splits debit and credit has no amount column and needs none, so `required` may
 *   name a group, satisfied by any one of its members (keksdose's "money").
 * * **A mapping is indexes into ONE table.** When the column count changes, the
 *   indexes mean nothing any more and are guessed afresh; when it does not (the
 *   header line toggled), they still point where they did — keksdose's `keepRoles`.
 * * **The rows a role cannot read are reported by line**, not dropped in silence
 *   ({@link readMappedTable}): a footer under a recording, a total under a statement.
 *
 * Pure functions over plain data, so a two-step wizard can hold the mapping in its own
 * state between steps, and a table the server sniffed (keksdose's) can be mapped with
 * the same rules as one parsed here.
 */
import { tableNumber } from "./table-text";
import type { TableLine, TextTable } from "./table-text";

/** One part a column can play, defined by the caller. */
export interface ColumnRole<R extends string = string> {
  /** The key the mapping is stored under. */
  value: R;
  /** What the role select shows — translated by the caller. */
  label: string;
  /**
   * `true`: the table cannot be used until a column plays this role. A string names a
   * GROUP: the table needs any one of the roles that share it — keksdose's amount,
   * debit and credit, any of which carries the money.
   */
  required?: boolean | string;
  /**
   * Every cell this role reads must be a number in the table's decimal convention
   * ({@link tableNumber}). A row where one is not — a footer, a units line, a total
   * with a grouping mark — is moved to `unread` with its line number instead of being
   * handed over. Kurvenschmiede's time, setpoint and actual. The cells stay strings:
   * converting is the caller's, with `tableNumber(cell, result.decimalComma)`.
   */
  numeric?: boolean;
}

/** Role → column index. A role that is absent or `null` sits on no column — so a
 *  mapping with nullable fields (keksdose's `CsvMapping`) is one as it stands. */
export type ColumnMapping<R extends string = string> = Partial<Record<R, number | null>>;

/** What the table is, read through a mapping. */
export interface ColumnMapperResult<R extends string = string> extends TextTable {
  mapping: ColumnMapping<R>;
  /** What the table still needs before it can be used: one entry per gap, each the
   *  roles any of which would fill it (one role, or a required group). */
  missing: R[][];
  /** Every required role placed, and at least one row read. */
  complete: boolean;
}

const placedAt = <R extends string>(mapping: ColumnMapping<R>, role: R, width?: number): number | null => {
  const column = mapping[role];
  if (typeof column !== "number") return null;
  return width === undefined || column < width ? column : null;
};

/** The role on this column, or `null` for an ignored one. */
export function roleOfColumn<R extends string>(
  roles: readonly ColumnRole<R>[],
  mapping: ColumnMapping<R>,
  column: number,
): R | null {
  return roles.find((role) => mapping[role.value] === column)?.value ?? null;
}

/**
 * Put `role` on `column` — or, with `null`, take the column's role off it.
 *
 * Whatever this column played before stops, and the role moves here from any other
 * column, in one new mapping (keksdose's `assignColumn`: "both halves are patches to
 * the same object"). Other fields of the mapping are kept as they are.
 */
export function assignColumnRole<R extends string, M extends ColumnMapping<R>>(
  roles: readonly ColumnRole<R>[],
  mapping: M,
  column: number,
  role: R | null,
): M {
  const next = { ...mapping } as Record<string, unknown>;
  for (const { value } of roles) {
    if (mapping[value] === column) next[value] = null;
  }
  if (role !== null) next[role] = column;
  return next as M;
}

/**
 * The gaps: each required role with no column, and each required group none of whose
 * roles has one. In the order of `roles`. A column index past `width` is no column.
 */
export function missingRoles<R extends string>(
  roles: readonly ColumnRole<R>[],
  mapping: ColumnMapping<R>,
  width?: number,
): R[][] {
  const gaps: R[][] = [];
  const groups = new Set<string>();
  for (const role of roles) {
    if (role.required === true) {
      if (placedAt(mapping, role.value, width) === null) gaps.push([role.value]);
    } else if (typeof role.required === "string" && !groups.has(role.required)) {
      groups.add(role.required);
      const members = roles.filter((other) => other.required === role.required);
      if (members.every((member) => placedAt(mapping, member.value, width) === null)) {
        gaps.push(members.map((member) => member.value));
      }
    }
  }
  return gaps;
}

const normalised = (text: string) => text.trim().toLowerCase();

/**
 * A first mapping for a table nobody has mapped yet.
 *
 * A column whose header IS a role's label or key gets that role. The required roles
 * left over then take the free columns in order — Kurvenschmiede's "time, setpoint,
 * actual are the first three columns", which is how a recorder writes them. Optional
 * roles are not guessed by position: in a bank
 * export of twelve columns, "the fourth role is the fourth column" is a wrong answer
 * presented as a suggestion, and an "ignore" is the honest one.
 */
export function guessMapping<R extends string>(
  roles: readonly ColumnRole<R>[],
  header: readonly string[] | null,
  width: number,
): ColumnMapping<R> {
  const mapping: ColumnMapping<R> = {};
  const taken = new Set<number>();
  if (header) {
    for (const role of roles) {
      const names = [normalised(role.label), normalised(role.value)];
      const column = header.findIndex((name, index) => !taken.has(index) && names.includes(normalised(name)));
      if (column >= 0) {
        mapping[role.value] = column;
        taken.add(column);
      }
    }
  }
  const free = Array.from({ length: width }, (_, index) => index).filter((index) => !taken.has(index));
  for (const role of roles) {
    if (role.required !== true || typeof mapping[role.value] === "number") continue;
    const column = free.shift();
    if (column === undefined) break;
    mapping[role.value] = column;
  }
  return mapping;
}

/**
 * The table read through the mapping: the rows every `numeric` role can read, the
 * others moved to `unread` (in line order, with the parse's own), what is missing,
 * and whether the table can be used. Column indexes past the table's width count as
 * unplaced.
 */
export function readMappedTable<R extends string>(
  table: TextTable,
  roles: readonly ColumnRole<R>[],
  mapping: ColumnMapping<R>,
): ColumnMapperResult<R> {
  const numeric = roles
    .filter((role) => role.numeric)
    .map((role) => placedAt(mapping, role.value, table.width))
    .filter((column): column is number => column !== null);
  const rows: string[][] = [];
  const lines: TableLine[] = [];
  const refused: TableLine[] = [];
  table.rows.forEach((row, index) => {
    if (numeric.every((column) => Number.isFinite(tableNumber(row[column] ?? "", table.decimalComma)))) {
      rows.push(row);
      lines.push(table.lines[index]);
    } else {
      refused.push(table.lines[index]);
    }
  });
  const unread = refused.length ? [...table.unread, ...refused].sort((a, b) => a.line - b.line) : table.unread;
  const missing = missingRoles(roles, mapping, table.width);
  return {
    ...table,
    rows,
    lines,
    unread,
    mapping,
    missing,
    complete: missing.length === 0 && rows.length > 0,
  };
}

/**
 * A dropped or chosen file's text — UTF-8 when it is UTF-8, else Windows-1252.
 *
 * A German bank or bench export is very often written in Windows-1252, and reading it
 * as UTF-8 turns every "ä" in a column name into "�" — no error, just a header nobody
 * recognises. So the bytes are tried as strict UTF-8 first and read as Windows-1252
 * when that fails (keksdose's server sniffs the encoding for the same reason; a file
 * read in the browser had nothing doing it). Falls back to `FileReader` where a `File`
 * has no `arrayBuffer` (Kurvenschmiede's `readText`).
 */
export async function readTextFile(file: Blob): Promise<string> {
  const bytes = await bytesOf(file);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function bytesOf(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsArrayBuffer(file);
  });
}
