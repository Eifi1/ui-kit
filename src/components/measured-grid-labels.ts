// The English words of ./measured-grid, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./measured-grid re-exports them.

import type { MeasuredGridLabels } from "./measured-grid";

/** English defaults. Exported as the `measuredGrid` namespace of `UiKitLabels`
 *  (src/i18n), the complete reference a translation is written against. */
export const DEFAULT_MEASURED_GRID_LABELS: MeasuredGridLabels = {
  view: "Table view",
  cellsView: "Cells",
  textView: "Text",
  addRow: "Add row",
  removeRow: (row) => `Remove row ${row}`,
  clear: "Clear table",
  pasteHint: "Paste a block from a spreadsheet into any cell",
  cell: (column, row) => `${column}, row ${row}`,
  rowNumber: "Row",
  rowActions: "Row actions",
  keyboardHint:
    "Arrow keys move between cells. Type to replace a cell, F2 to edit it, Escape to undo the edit. Enter moves down and adds a row at the end.",
  lineError: (line) => `Line ${line} could not be read`,
  points: (count) => (count === 1 ? "1 point" : `${count} points`),
  problems: (count) => (count === 1 ? "1 cell is not a number" : `${count} cells are not numbers`),
};
