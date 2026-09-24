/**
 * One lexer for "paste the table out of a spreadsheet", and the three rules for the
 * comma. `@eifi1/ui-kit/table-text` — pure functions over strings, no React.
 *
 * Moved here from Lenkbank (`shared/lib/parse-table.ts`), where three screens took a
 * table off somebody's clipboard — a measured-table grid, the text view beside it, and
 * a page that reads a recorder's setpoint/actual files — and each had grown its own
 * reader. They disagreed, and not in the harmless way: a whitespace-separated German
 * export was read as six columns of nonsense by two of them and as nothing at all by
 * the third, with no message either way. The lexing is one problem (lines, a
 * separator, fields, a header, numbers) and it is solved once here, so the next app
 * that imports a CSV does not write the comma rules wrong a second time.
 *
 * **What is genuinely different between callers is where the decision about the
 * comma is taken**, and that is a parameter rather than a constant. A comma is the
 * decimal mark in every German export and the column separator in every English CSV,
 * and no single rule serves both without regressing one of them. So the rules are
 * named instead of one being picked:
 *
 * * **`"whole-text"`** — the *file* door. A recorder writes one file in one
 *   convention, so the separator and the decimal mark are decided once, from the
 *   whole text, and stated back to the reader (`decimalComma`) where they can see
 *   what was assumed. Deciding once is what lets one damaged line be *counted*
 *   rather than re-guessed into a different convention than the lines around it.
 * * **`"per-line"`** — the *paste* door. What arrives on a clipboard is a few rows
 *   out of a spreadsheet, sometimes one row, sometimes a line somebody typed. There
 *   is no file to be consistent with, and a line must not change meaning because of
 *   another line somewhere else in the box — so each line is read on its own
 *   evidence.
 * * **unconditional** — one cell (`cellNumber` / `isCellNumber`). A single cell has
 *   no columns in it, so a comma in one cannot be separating anything and is always
 *   a decimal mark. That is not a table rule at all, which is why it is a pair of
 *   one-liners beside the others rather than an option on them.
 *
 * What this deliberately does not do:
 *
 * * **Thousands separators.** `1.234,5` and `1,234.5` are both a number with two
 *   marks in it, and telling the grouping mark from the decimal mark needs a rule
 *   about digit runs that would then have to be right for a three-digit integer
 *   too. A field carrying one is reported as a line that could not be read, with
 *   its line number, which is something a reader can act on. Guessing is not.
 * * **Empty cells.** An empty field is dropped rather than held open as a hole, so a
 *   row with a dropped channel in the middle of it shifts left. Keeping the hole
 *   would mean reading `1;2;3;` — a trailing separator, which every spreadsheet
 *   writes — as a four-column row. It is a known gap, not an oversight.
 * * **Quoted fields.** No `"a;b"` escaping. These are numbers; the only text in them
 *   is the header line, and a header field with a separator in it costs a column
 *   name, not a measurement.
 */

/** A digit, a comma, a digit — a comma that can only be a decimal mark or a
 *  grouping mark, never a separator with a number on each side of it. `1, 2`
 *  deliberately does not match: a comma followed by a space is how a human
 *  writes a list, and reading it as a decimal mark would turn a hand-typed
 *  `1, 2, 3` into one number. */
const DECIMAL_COMMA = /\d,\d/;

/** What separates the columns of one line. A regular expression only for the
 *  whitespace case, because a run of spaces is one separator. */
type Separator = string | RegExp;

/** Where the decision about the comma is taken. See the module docstring: the
 *  file door decides once for the whole text, the paste door decides per line. */
export type DecimalRule = "per-line" | "whole-text";

export interface ParseTableOptions {
  decimal: DecimalRule;
  /**
   * How many columns the caller already knows the table has. A grid with fixed
   * columns knows its width before a number arrives: anything past it is sliced
   * off — an export with a trailing timestamp column is not an error worth
   * refusing — and a line with fewer is reported. Omitted where the width is the
   * file's own answer.
   */
  columns?: number;
  /**
   * How many leading lines that are not rows of numbers may be a header.
   * Default 1, the name row. {@link parseRows} passes 2, because a bench export
   * writes the units on a second line under the names.
   */
  headerLines?: number;
}

export interface ParsedTable {
  rows: number[][];
  /** The first header line's fields — the column *names*. A units line under it
   *  is absorbed and not returned: what a column is measured in is the caller's to
   *  say (its column definitions), and a second list of strings here would be a
   *  second answer to that. */
  header: string[] | null;
  /** Whether a comma was read as a decimal mark. Under `"per-line"` this is true
   *  if any line was read that way, and it exists for the reader: a guess
   *  nobody can see is a guess nobody can correct. */
  decimalComma: boolean;
  /** Line numbers — 1-based, counted in the text as it was handed over, blank
   *  lines included — that held something which is not a row of numbers. A list
   *  rather than a count, because one door names the first one and the other
   *  counts them. */
  skipped: number[];
}

/**
 * The columns of one line, as text, with the decimal mark normalised to a point.
 *
 * Text rather than numbers because a grid holds cells as strings: a pasted
 * field that is not a number belongs in the cell it landed in, marked, where the
 * person who pasted it can see which column went wrong. Dropping it here would
 * shift every column after it and lose the evidence.
 */
export function splitRow(line: string): string[] {
  const separator = separatorOf(line);
  const decimalComma = separator !== ",";
  return fieldsOf(line, separator).map((field) => (decimalComma ? point(field) : field));
}

/**
 * A pasted table, or the lines of it that are not one.
 *
 * The lexer both doors are built on. It reads lines, drops blanks and `#`
 * banners, decides what separates the columns, takes the header off the top and
 * converts what is left.
 */
export function parseTable(text: string, options: ParseTableOptions): ParsedTable {
  const headerLimit = options.headerLines ?? 1;
  const lines = contentLines(text);
  if (!lines.length) return { rows: [], header: null, decimalComma: false, skipped: [] };
  const fixed = options.decimal === "whole-text" ? wholeTextRule(lines) : null;

  let header: string[] | null = null;
  let headerCount = 0;
  const rows: number[][] = [];
  const skipped: number[] = [];
  let sawDecimalComma = false;

  for (const { line, number } of lines) {
    const separator = fixed ? fixed.separator : separatorOf(line);
    const decimalComma = fixed ? fixed.decimalComma : separator !== ",";
    const fields = fieldsOf(line, separator);
    const numbers = fields.map((field) => Number(decimalComma ? point(field) : field));
    const readable = fields.length > 0 && numbers.every(Number.isFinite);

    if (!readable) {
      // A header is only a header at the top, and only before any data: a stray
      // word further down is a broken row, and dropping it silently would lose a
      // measurement without saying so.
      if (rows.length === 0 && headerCount < headerLimit) {
        header ??= fields;
        headerCount += 1;
        continue;
      }
      skipped.push(number);
      continue;
    }
    if (options.columns !== undefined && fields.length < options.columns) {
      skipped.push(number);
      continue;
    }
    if (decimalComma && DECIMAL_COMMA.test(line)) sawDecimalComma = true;
    rows.push(options.columns === undefined ? numbers : numbers.slice(0, options.columns));
  }

  return {
    rows,
    header,
    decimalComma: fixed ? fixed.decimalComma : sawDecimalComma,
    skipped,
  };
}

/**
 * The paste door: a fixed number of columns, and the line that stopped it.
 *
 * Read per line, with up to two header lines (names, then units). It answers with a
 * line number rather than with what it managed to read, because half a pasted
 * sweep saved as a measurement is worse than a refused paste — and because a
 * table that comes back **empty** is the one answer a reader cannot act on: it
 * looks exactly like a paste that did not happen. So text that has content and
 * produced no row at all is an error naming its first unreadable line, never
 * `{ rows: [] }`.
 */
export function parseRows(text: string, columns: number): { rows: number[][] } | { error: number } {
  const lines = contentLines(text);
  if (!lines.length) return { rows: [] };
  const parsed = parseTable(text, { decimal: "per-line", columns, headerLines: 2 });
  if (parsed.skipped.length) return { error: parsed.skipped[0] };
  if (!parsed.rows.length) return { error: lines[0].number };
  return { rows: parsed.rows };
}

/** One cell as a number. Unconditional: a cell has no columns in it, so a comma
 *  in one is a decimal mark and nothing else. */
export const cellNumber = (cell: string) => Number(cell.replace(",", "."));

/** Whether one cell holds a number yet. An empty cell is not one — it is a hole
 *  in the measurement, which is a different thing from a zero. */
export const isCellNumber = (cell: string) =>
  cell.trim() !== "" && !Number.isNaN(cellNumber(cell));

/**
 * The one separator and the one decimal mark a whole file is read with.
 *
 * The separator is taken from the line most likely to be data — the second,
 * where there is one, because the first is usually the names.
 *
 * A comma between two digits is then a decimal mark whenever something else is
 * already separating the columns: there is nothing else it could be. The rule
 * this replaces also demanded that no decimal POINT appear anywhere in the file,
 * which read a semicolon-separated export with one column written by a different
 * tool — an entirely ordinary thing for a bench to produce — as a table with no
 * rows in it, and said nothing.
 */
function wholeTextRule(lines: { line: string }[]): { separator: Separator; decimalComma: boolean } {
  const separator = separatorOf(lines[lines.length > 1 ? 1 : 0].line);
  const body = lines.map((entry) => entry.line).join("\n");
  return { separator, decimalComma: separator !== "," && DECIMAL_COMMA.test(body) };
}

/** Lines with something on them, numbered as they stand in the original text so
 *  a message can point at one. `#` banners are a recorder's, not a measurement. */
function contentLines(text: string): { line: string; number: number }[] {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => line !== "" && !line.startsWith("#"));
}

/**
 * What separates this line's columns.
 *
 * In order of trust, not of count: a semicolon-separated line with decimal
 * commas has more commas than semicolons, and a tab-separated one may have both.
 * Whichever of tab and semicolon appears wins outright, because neither is ever
 * anything but a separator.
 *
 * The comma is the one that has to be argued about. A line that has whitespace
 * between its fields *and* a comma between two digits has already said what
 * separates it — so the comma is a decimal mark, and the whitespace separates.
 * That is a German export printed or dumped from MATLAB (`0,5 1,25 2,75`), and
 * reading its commas as separators produced six columns from three: each number
 * split into a pair of small integers, accepted as a row, and saved as a
 * measurement with nothing on screen to say so. A comma with a space after it is
 * not that shape (`DECIMAL_COMMA` does not match `1, 2`), so a hand-typed list
 * still separates on the comma.
 */
function separatorOf(line: string): Separator {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  if (line.includes(",")) return /\s/.test(line) && DECIMAL_COMMA.test(line) ? /\s+/ : ",";
  return /\s+/;
}

/** One line into trimmed, non-empty fields, as they were written. The header is
 *  returned out of these, so a column called `Weg,X` keeps its name even where
 *  the numbers under it are being read with a decimal comma. */
function fieldsOf(line: string, separator: Separator): string[] {
  return line
    .split(separator)
    .map((field) => field.trim())
    .filter((field) => field !== "");
}

/** The decimal mark this language of `Number` understands. One comma, because a
 *  field with two of them is a grouped number and this module does not read
 *  those — it reports the line instead. */
const point = (field: string) => field.replace(",", ".");
