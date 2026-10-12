// The English words of ./column-mapper, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./column-mapper re-exports them.

import type { ColumnMapperLabels } from "./column-mapper";

/** {@link ColumnMapperLabels.requiredRoleShort}'s English — and its fallback for a
 *  provider whose labels predate the key. */
export const markedShort = (role: string) => `${role} *`;

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
  requiredRoleShort: markedShort,
  previewOf: (shown, total) =>
    shown === 1
      ? `The first of ${total} rows`
      : `The first ${shown} of ${total} rows`,
  oneOf: (roles) => `either ${roles}`,
  missing: (roles) => `Still needed: ${roles}.`,
};
