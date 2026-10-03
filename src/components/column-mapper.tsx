import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, HTMLAttributes, ReactNode } from "react";
import { Upload } from "lucide-react";

import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import {
  assignColumnRole,
  guessMapping,
  missingRoles,
  readMappedTable,
  readTextFile,
  roleOfColumn,
} from "../lib/column-mapping";
import type {
  ColumnMapperResult,
  ColumnMapping,
  ColumnRole,
} from "../lib/column-mapping";
import { scrollIntoStrip, useStripFade } from "../lib/strip-fade";
import { parseTextTable } from "../lib/table-text";
import type { TableSeparator, TextTable } from "../lib/table-text";
import { AlertBanner } from "./alert-banner";
import { Checkbox } from "./checkbox";
import { Disclosure } from "./disclosure";
import { FileButton, useFilePicker } from "./file-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./table";
import { Select, Textarea } from "./ui";

/**
 * A table pasted, dropped or chosen as a file, and which of its columns plays which
 * part — Kurvenschmiede's columns input and keksdose's bank-file mapping step, once.
 *
 * Kurvenschmiede (`features/control/columns-input.tsx` + `csv.ts`) reads a recorder's
 * export into a playground signal (time, value) and a comparison (time, setpoint,
 * actual): a textarea, a file button, a parse, a select per role, and a line that says
 * which decimal convention was assumed and how many lines were skipped. keksdose
 * (`import-map-step.tsx`) shows a bank's CSV as a table with a role select on every
 * column's header, the file's real values under it, ignored columns dimmed, and what
 * the import still needs named under it. Same problem, two hand-built answers.
 *
 * Two layers, so both shapes fit:
 *
 * * {@link ColumnMapper} — the whole single panel: paste, drop or choose → parse
 *   ({@link parseTextTable}: separator, decimal convention, header line, all stated
 *   back) → preview with a role per column → `onChange(result)`. Kurvenschmiede's.
 * * {@link ColumnRoleTable} — the preview with the role selects alone, controlled, over
 *   rows the caller already has. keksdose's map step, whose rows come from its server's
 *   sniff (encodings, quoted multi-line cells, skipped title rows) and whose mapping
 *   lives in the wizard's state between steps.
 *
 * The rules under both are headless in `lib/column-mapping.ts`: a role moves rather
 * than doubling up, what is missing is named, and the rows a numeric role cannot read
 * are reported by line number rather than dropped.
 */

// ── Labels ────────────────────────────────────────────────────────────────────

export interface ColumnMapperLabels {
  /** The paste box's label. */
  paste: string;
  /** The caption under the paste box. */
  pasteHint: string;
  /** The file button. */
  chooseFile: string;
  /** A chosen or dropped file whose bytes could not be read at all. */
  readError: (name: string) => string;
  /** The checkbox that says whether the first line names the columns. */
  headerRow: string;
  /** What was read: so many columns and rows. */
  summary: (columns: number, rows: number) => string;
  /** The separator that was assumed. */
  separatorSemicolon: string;
  separatorComma: string;
  separatorTab: string;
  separatorSpace: string;
  /** The decimal convention that was assumed — with an example, because "decimal
   *  comma" alone is a term, and `1,5` is something a reader recognises. */
  decimalComma: string;
  decimalPoint: string;
  /** The title over the lines that could not be read. */
  unreadCount: (count: number) => string;
  /** One of them. */
  unreadLine: (line: number) => string;
  /** Past the first hundred listed. */
  unreadMore: (count: number) => string;
  /** The text has content, and none of it is a row. */
  noRows: string;
  /** The preview table's name. */
  table: string;
  /** A column the table names no header for. */
  columnN: (n: number) => string;
  /** The role select on a column's header — its accessible name. */
  roleOf: (column: string) => string;
  /** The role select's "no role" option. */
  ignore: string;
  /** A required role in the select — only while some role is NOT required: when
   *  every one is, the mark tells no role from another (0.24, Kurvenschmiede). */
  requiredRole: (role: string) => string;
  /** Under the preview, when it shows fewer rows than were read. */
  previewOf: (shown: number, total: number) => string;
  /** A required group's roles, already joined as a list with "or". */
  oneOf: (roles: string) => string;
  /** What the table still needs, already joined as a list with "and". */
  missing: (roles: string) => string;
}

export const DEFAULT_COLUMN_MAPPER_LABELS: ColumnMapperLabels = {
  paste: "Paste a table",
  pasteHint:
    "Copy the rows out of a spreadsheet and paste them here, or drop a CSV or text file.",
  chooseFile: "Choose a file",
  readError: (name) => `“${name}” could not be read`,
  headerRow: "The first line names the columns",
  summary: (columns, rows) =>
    `${columns} ${columns === 1 ? "column" : "columns"}, ${rows} ${rows === 1 ? "row" : "rows"}`,
  separatorSemicolon: "separated by semicolons",
  separatorComma: "separated by commas",
  separatorTab: "separated by tabs",
  separatorSpace: "separated by spaces",
  decimalComma: "decimal comma (1,5)",
  decimalPoint: "decimal point (1.5)",
  unreadCount: (count) =>
    count === 1
      ? "1 line could not be read"
      : `${count} lines could not be read`,
  unreadLine: (line) => `Line ${line} could not be read`,
  unreadMore: (count) => `…and ${count} more`,
  noRows: "No line of this text reads as a row of the table.",
  table: "Columns and their roles",
  columnN: (n) => `Column ${n}`,
  roleOf: (column) => `What does column “${column}” hold?`,
  ignore: "Ignore",
  requiredRole: (role) => `${role} (required)`,
  previewOf: (shown, total) =>
    shown === 1
      ? `The first of ${total} rows`
      : `The first ${shown} of ${total} rows`,
  oneOf: (roles) => `either ${roles}`,
  missing: (roles) => `Still needed: ${roles}.`,
};

const SEPARATOR_LABEL: Record<
  TableSeparator,
  "separatorSemicolon" | "separatorComma" | "separatorTab" | "separatorSpace"
> = {
  ";": "separatorSemicolon",
  ",": "separatorComma",
  "\t": "separatorTab",
  " ": "separatorSpace",
};

/** How many unread lines are listed before "…and N more". */
const UNREAD_LISTED = 100;

/** A file a table is likely to be in. Extensions only, so a refusal reads "Only .csv,
 *  .tsv, … files" rather than a list of MIME types; the parse is the real check. */
const DEFAULT_ACCEPT = ".csv,.tsv,.txt,.dat,.asc";

function formatList(
  items: string[],
  type: "conjunction" | "disjunction",
  locale: string | undefined,
): string {
  try {
    return new Intl.ListFormat(locale, { type, style: "long" }).format(items);
  } catch {
    return items.join(", ");
  }
}

// ── ColumnRoleTable ───────────────────────────────────────────────────────────

/** A `data-*` attribute, typed so `{ "data-private": "" }` needs no cast. */
type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

/**
 * What {@link ColumnRoleTableProps.bodyProps} puts on the preview's `<tbody>`: `data-*`
 * hooks, an `id`, a class, a style.
 */
export type ColumnRoleTableBodyProps = Omit<
  HTMLAttributes<HTMLTableSectionElement>,
  "children" | "dangerouslySetInnerHTML"
> &
  DataAttributes;

/**
 * What {@link ColumnRoleTableProps.rowProps} returns for one preview row's `<tr>` —
 * the same shape as LineItems' `LineItemsRowProps`, on a table row.
 */
export type ColumnRoleTableRowProps = Omit<
  HTMLAttributes<HTMLTableRowElement>,
  "children" | "dangerouslySetInnerHTML"
> &
  DataAttributes;

export interface ColumnRoleTableProps<
  R extends string,
  M extends ColumnMapping<R> = ColumnMapping<R>,
> {
  /** The columns' names — the file's header line — or `null` for a table without one
   *  (each column is then "Column 1", "Column 2", …). */
  header: readonly string[] | null;
  /** The rows to preview, as text. Only the first {@link previewRows} are drawn. */
  rows: readonly (readonly string[])[];
  /** How many columns. Default: the header's length or the widest previewed row. */
  width?: number;
  /** The parts a column can play. */
  roles: readonly ColumnRole<R>[];
  /** Role → column. Any object with the roles as nullable number fields — keksdose's
   *  `CsvMapping` as it stands; the other fields are handed back untouched. */
  mapping: M;
  /** The next mapping, with the picked role moved onto its column. */
  onMappingChange: (next: M) => void;
  /** Default 5. */
  previewRows?: number;
  /** How many rows the table has in all, for "The first 5 of 120 rows". Default:
   *  `rows.length`. */
  totalRows?: number;
  /** Every role select disabled — keksdose locks them while a re-sniff replaces the
   *  table they point into. */
  disabled?: boolean;
  /**
   * Extra attributes for the preview's `<tbody>` (0.24) — keksdose: the sample rows are
   * the user's own bank data (payees, memos, amounts), and its demo mode blurs exactly
   * that through `.demo-mode [data-private]` (#336). With nowhere to put the attribute,
   * its map step reached into the table with a `useLayoutEffect` that set it on the
   * `<tbody>` after every commit; `bodyProps={{ "data-private": "" }}` declares it.
   * There is deliberately no head counterpart: the column names and the role selects
   * are what such a mode is there to show.
   *
   * Spread on the kit `TableBody`; a `className` is added to its own.
   */
  bodyProps?: ColumnRoleTableBodyProps;
  /**
   * Extra attributes for one preview row's `<tr>`, from its cells and its index in the
   * preview (0.24) — the contract of LineItems' `rowProps` (keksdose K20), on a table:
   * `data-*` hooks (a per-row `data-private`, a test id), an `id`, a class. Called for
   * the rows drawn, the first {@link previewRows}. The row has no attributes of its own
   * to protect; a `className` is added after its classes.
   */
  rowProps?: (row: readonly string[], index: number) => ColumnRoleTableRowProps | undefined;
  labels?: Partial<ColumnMapperLabels>;
  className?: string;
}

/**
 * A table's first rows, with a role select on every column's header.
 *
 * keksdose's mapping step (dev#462: "make it more table like, where the table columns
 * can be chosen from the input and the column data changes with the chosen column
 * header"): the file IS the form. The file's own column name sits on top, verbatim —
 * it is how the reader recognises the column; under it the role, picked in place;
 * under that the column's real values, so a column that is one off shows up here and
 * not after the import. A column with no role says "Ignore" and its values are dimmed:
 * the state that most needs to be visible in a twelve-column bank export.
 *
 * Picking a role another column holds MOVES it ({@link assignColumnRole}). What the
 * table still needs is named under it — a required group as "either Amount, Debit or
 * Credit". Required roles say "(required)" in the list only where some role is not
 * (0.24): Kurvenschmiede's roles are all required, so the mark told no option from
 * another, and on a phone it cut the role's own name short ("Zeit (s) (erforderl…")
 * — the part of the option the reader has to read. The "Still needed" line already
 * says what is missing; a mark that distinguishes nothing is only noise.
 *
 * The table scrolls sideways inside its own box (the kit {@link Table}'s wrapper, a
 * named, keyboard-reachable region while it overflows), so a wide export never widens
 * the page at 390px. An edge with columns behind it fades out (0.24, Kurvenschmiede:
 * on a phone the fourth column's select sat off-screen and nothing said there was more
 * to the right; phone scrollbars are overlays that show only while you drag). It is
 * the kit Tabs strip's measured fade: drawn only while something is hidden on that
 * side, so a table that fits is painted as before; both ends once scrolled into the
 * middle; the reading direction's own in RTL; never animated, so there is nothing for
 * reduced motion to turn off; and a `mask-image`, which changes no layout and needs no
 * background colour to fade to. A role select focused behind the fade is scrolled
 * clear of it.
 */
export function ColumnRoleTable<
  R extends string,
  M extends ColumnMapping<R> = ColumnMapping<R>,
>({
  header,
  rows,
  width: widthProp,
  roles,
  mapping,
  onMappingChange,
  previewRows = 5,
  totalRows,
  disabled,
  bodyProps,
  rowProps,
  labels: labelsProp,
  className,
}: ColumnRoleTableProps<R, M>) {
  const labels: ColumnMapperLabels = useKitLabels(
    "columnMapper",
    DEFAULT_COLUMN_MAPPER_LABELS,
    labelsProp,
  );
  const locale = useKitLocale();
  const shown = rows.slice(0, previewRows);
  const width =
    widthProp ??
    shown.reduce(
      (widest, row) => Math.max(widest, row.length),
      header?.length ?? 0,
    );
  const columns = Array.from({ length: width }, (_, index) => index);
  const total = totalRows ?? rows.length;
  const nameOf = (column: number) =>
    header?.[column] || labels.columnN(column + 1);
  const labelOf = (value: R) =>
    roles.find((role) => role.value === value)?.label ?? value;
  const gaps = missingRoles(roles, mapping, width).map((gap) =>
    gap.length === 1
      ? labelOf(gap[0])
      : labels.oneOf(formatList(gap.map(labelOf), "disjunction", locale)),
  );
  // "(required)" only where it tells one option from another.
  const markRequired = roles.some((role) => role.required !== true);

  // The Table's own scroll wrapper — the `<table>`'s parent — is what overflows; the
  // fade is measured on it and drawn on the box round it, which has the same edges.
  const scroller = useRef<HTMLElement | null>(null);
  const tableRef = useCallback((table: HTMLTableElement | null) => {
    scroller.current = table?.parentElement ?? null;
  }, []);
  const fade = useStripFade(scroller);

  return (
    <div
      className={cn("min-w-0 space-y-1.5", className)}
      data-slot="column-role-table"
    >
      <div
        data-slot="column-role-table-scroll"
        // In reading-direction terms ("start", "end", "both"), for a caller's styling.
        data-overflow={fade.overflow}
        style={
          fade.mask
            ? { maskImage: fade.mask, WebkitMaskImage: fade.mask }
            : undefined
        }
      >
        <Table
          ref={tableRef}
          density="compact"
          framed
          aria-label={labels.table}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => {
                const role = roleOfColumn(roles, mapping, column);
                const name = nameOf(column);
                return (
                  <TableHeaderCell
                    key={column}
                    scope="col"
                    className="min-w-36 py-2 align-top"
                  >
                    <span className="block max-w-56 truncate pb-1 text-[11px] font-normal text-[var(--text-muted)]">
                      {name}
                    </span>
                    <Select
                      size="sm"
                      className="w-full"
                      aria-label={labels.roleOf(name)}
                      value={role ?? ""}
                      disabled={disabled}
                      // Focus brings a select behind the fade clear of it — the browser's
                      // own scroll stops at the edge, under the fade.
                      onFocus={(event) => {
                        const cell = event.currentTarget.closest("th");
                        if (scroller.current && cell)
                          scrollIntoStrip(scroller.current, cell);
                      }}
                      onChange={(event) =>
                        onMappingChange(
                          assignColumnRole(
                            roles,
                            mapping,
                            column,
                            event.target.value === ""
                              ? null
                              : (event.target.value as R),
                          ),
                        )
                      }
                    >
                      <option value="">{labels.ignore}</option>
                      {roles.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.required === true && markRequired
                            ? labels.requiredRole(option.label)
                            : option.label}
                        </option>
                      ))}
                    </Select>
                  </TableHeaderCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody {...bodyProps}>
            {shown.map((row, index) => (
              <TableRow {...rowProps?.(row, index)} key={index}>
                {columns.map((column) => (
                  <TableCell
                    key={column}
                    data-ignored={
                      roleOfColumn(roles, mapping, column) === null || undefined
                    }
                    className={cn(
                      "font-mono whitespace-nowrap",
                      // Dimmed, not hidden: its values are what tell you whether ignoring
                      // it was right.
                      roleOfColumn(roles, mapping, column) === null &&
                        "text-[var(--text-muted)]",
                    )}
                  >
                    <span className="block max-w-56 truncate">
                      {row[column] ?? ""}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {total > shown.length && (
        <p className="text-xs text-[var(--text-muted)]">
          {labels.previewOf(shown.length, total)}
        </p>
      )}
      {gaps.length > 0 && (
        <AlertBanner tone="warning" variant="inline" size="sm" block>
          {labels.missing(formatList(gaps, "conjunction", locale))}
        </AlertBanner>
      )}
    </div>
  );
}

// ── ColumnMapper ──────────────────────────────────────────────────────────────

export interface ColumnMapperProps<R extends string> {
  /** The parts the columns play — translated labels, which are required, which must
   *  be numbers. See {@link ColumnRole}. */
  roles: readonly ColumnRole<R>[];
  /**
   * The table read through the current mapping, on every change: the text, the header
   * checkbox, a role. `null` while there is no table at all (an empty box). Use it when
   * `result.complete`; until then `result.missing` says what is not placed yet.
   *
   * The rows are strings. A numeric role's cells are guaranteed to read with
   * `tableNumber(cell, result.decimalComma)`; anything else is the caller's to convert.
   */
  onChange: (result: ColumnMapperResult<R> | null) => void;
  /** The paste box's label. Default: `labels.paste`. */
  label?: ReactNode;
  /** The caption under the paste box. Default: `labels.pasteHint`. */
  hint?: ReactNode;
  /** What the file dialog offers, and what a drop is checked against. Default:
   *  `.csv,.tsv,.txt,.dat,.asc`. */
  accept?: string;
  /** The largest file taken, in bytes. Default: no limit. */
  maxSize?: number;
  /** Text to start with. `onChange` is called with its result once, on mount. */
  defaultText?: string;
  /** Rows in the preview. Default 5. */
  previewRows?: number;
  /** The first mapping for a new table. Default {@link guessMapping}: a column named
   *  like a role gets it, and the required roles left over take the free columns in
   *  order. */
  guess?: (table: TextTable) => ColumnMapping<R>;
  disabled?: boolean;
  /** The preview table's `<tbody>` attributes — {@link ColumnRoleTableProps.bodyProps}
   *  (0.24): `{ "data-private": "" }` for a table of someone's own data. */
  bodyProps?: ColumnRoleTableBodyProps;
  /** One preview row's `<tr>` attributes — {@link ColumnRoleTableProps.rowProps}
   *  (0.24). `row` is the row as read, `index` its place in the preview. */
  rowProps?: (row: readonly string[], index: number) => ColumnRoleTableRowProps | undefined;
  labels?: Partial<ColumnMapperLabels>;
  className?: string;
}

interface MapperState<R extends string> {
  text: string;
  /** The reader's answer to "does the first line name the columns", or `null` for
   *  the parse's own. */
  header: boolean | null;
  table: TextTable;
  mapping: ColumnMapping<R>;
}

const hasFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes("Files");

/**
 * Paste, drop or choose a table, see what it was read as, and say which column is
 * which — Kurvenschmiede's playground signal and comparison input as one kit part.
 *
 * Everything the parse assumed is stated, because a guess the reader cannot see is a
 * guess they cannot correct: the shape it found, the separator, the decimal
 * convention ("decimal comma (1,5)"), and every line it could not read, by number and
 * with its text. The header line is a checkbox, since the detection is a guess either
 * way and toggling it does not move a column (the mapping is kept, keksdose's
 * `keepRoles`). A new file is a new table and is mapped afresh; typing that changes the
 * column count re-guesses, because the old indexes point at nothing.
 *
 * A file can be chosen, dropped on the button, or dropped on the paste box — which,
 * left to the browser, would open the file in place of the page. It is read as UTF-8,
 * or as Windows-1252 when it is not UTF-8 ({@link readTextFile}).
 *
 * A two-step wizard that keeps the drop and the mapping apart (keksdose's) uses the
 * parts: {@link parseTextTable} or its own server's sniff, then {@link ColumnRoleTable},
 * then {@link readMappedTable}.
 */
export function ColumnMapper<R extends string>({
  roles,
  onChange,
  label,
  hint,
  accept = DEFAULT_ACCEPT,
  maxSize,
  defaultText = "",
  previewRows = 5,
  guess,
  disabled = false,
  bodyProps,
  rowProps,
  labels: labelsProp,
  className,
}: ColumnMapperProps<R>) {
  const labels: ColumnMapperLabels = useKitLabels(
    "columnMapper",
    DEFAULT_COLUMN_MAPPER_LABELS,
    labelsProp,
  );
  const firstMapping = (table: TextTable) =>
    guess ? guess(table) : guessMapping(roles, table.header, table.width);
  const [state, setState] = useState<MapperState<R>>(() => {
    const table = parseTextTable(defaultText);
    return {
      text: defaultText,
      header: null,
      table,
      mapping: firstMapping(table),
    };
  });
  const [reading, setReading] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // What is drawn and what is handed over are the same computation. Not memoised: a
  // caller writes `roles={[…]}` inline, so a memo keyed on them would miss every time,
  // and the read is one pass over rows that are already split.
  const result = readMappedTable(state.table, roles, state.mapping);

  const commit = (next: MapperState<R>) => {
    setState(next);
    onChange(
      next.table.width === 0
        ? null
        : readMappedTable(next.table, roles, next.mapping),
    );
  };

  /** New text. `fresh` (a file): the reader's header answer and the mapping start over. */
  const take = (text: string, fresh: boolean) => {
    const header = fresh ? null : state.header;
    const table = parseTextTable(text, header === null ? {} : { header });
    const keep =
      !fresh && table.width === state.table.width && state.table.width > 0;
    commit({
      text,
      header,
      table,
      mapping: keep ? state.mapping : firstMapping(table),
    });
  };

  const load = (file: File) => {
    setRefusal(null);
    setReading(true);
    void readTextFile(file)
      .then(
        (text) => take(text, true),
        // Only the read: an error thrown by the caller's onChange is not the file's.
        () => setRefusal(labels.readError(file.name)),
      )
      .finally(() => setReading(false));
  };

  const refuse = (rejections: { message: string }[]) =>
    setRefusal(rejections[0]?.message ?? null);

  // A file dropped on the paste box. The same screening as the button's.
  const drop = useFilePicker({
    accept,
    maxSize,
    disabled,
    onFiles: ([file]) => load(file),
    onReject: refuse,
  });

  const seeded = useEffectEvent(() => {
    if (state.table.width > 0) onChange(result);
  });
  useEffect(() => {
    seeded();
  }, []);

  const { table } = state;
  const separator = labels[SEPARATOR_LABEL[table.separator]];
  const unread = result.unread;

  return (
    <div
      className={cn("min-w-0 space-y-3", className)}
      data-slot="column-mapper"
    >
      <Textarea
        label={label ?? labels.paste}
        hint={hint ?? labels.pasteHint}
        rows={5}
        wrap="off"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={state.text}
        disabled={disabled}
        className={cn(
          "font-mono text-xs",
          dragOver && "rounded-md ring-2 ring-[var(--brand)]",
        )}
        data-drag-over={dragOver || undefined}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          setRefusal(null);
          take(event.target.value, false);
        }}
        onDragEnter={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          // Cancelled for every file drag: an uncancelled one makes the browser open
          // the file in place of the page.
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragOver(false);
          drop.take(event.dataTransfer.files);
        }}
      />
      {drop.element}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FileButton
          variant="secondary"
          accept={accept}
          maxSize={maxSize}
          droppable
          pending={reading}
          disabled={disabled}
          onFiles={([file]) => load(file)}
          onReject={refuse}
        >
          <Upload className="size-4" aria-hidden />
          {labels.chooseFile}
        </FileButton>
        {table.width > 0 && (
          <Checkbox
            label={labels.headerRow}
            checked={table.header !== null}
            disabled={disabled}
            onCheckedChange={(checked) => {
              const next = parseTextTable(state.text, { header: checked });
              // Same text, same split: the columns are where they were, and so are the
              // roles on them.
              commit({ ...state, header: checked, table: next });
            }}
          />
        )}
      </div>

      {refusal && (
        <AlertBanner tone="danger" variant="inline" size="sm" block>
          {refusal}
        </AlertBanner>
      )}

      {table.width > 0 && (
        <>
          <p
            className="text-xs text-[var(--text-secondary)]"
            data-slot="column-mapper-summary"
          >
            {[
              labels.summary(table.width, result.rows.length),
              separator,
              table.decimalComma ? labels.decimalComma : labels.decimalPoint,
            ].join(" · ")}
          </p>
          {result.rows.length === 0 && (
            <AlertBanner tone="warning" variant="inline" size="sm" block>
              {labels.noRows}
            </AlertBanner>
          )}
          <ColumnRoleTable
            header={table.header}
            rows={result.rows}
            width={table.width}
            roles={roles}
            mapping={state.mapping}
            onMappingChange={(mapping) => commit({ ...state, mapping })}
            previewRows={previewRows}
            disabled={disabled}
            bodyProps={bodyProps}
            rowProps={rowProps}
            labels={labelsProp}
          />
          {unread.length > 0 && (
            <Disclosure
              variant="bare"
              title={labels.unreadCount(unread.length)}
              data-slot="column-mapper-unread"
            >
              <ul className="space-y-1 text-xs">
                {unread.slice(0, UNREAD_LISTED).map((line) => (
                  <li key={line.line} className="min-w-0">
                    <span className="block text-[var(--text-secondary)]">
                      {labels.unreadLine(line.line)}
                    </span>
                    <code className="block truncate font-mono text-[var(--text-muted)]">
                      {line.text}
                    </code>
                  </li>
                ))}
                {unread.length > UNREAD_LISTED && (
                  <li className="text-[var(--text-muted)]">
                    {labels.unreadMore(unread.length - UNREAD_LISTED)}
                  </li>
                )}
              </ul>
            </Disclosure>
          )}
        </>
      )}
    </div>
  );
}
