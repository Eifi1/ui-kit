import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { Tooltip } from "./tooltip";
import type { DataTableLabels } from "./data-table-labels";
import { ROW_ACTIONS_KEY } from "./data-table-row-actions";
import { columnLabel } from "./data-table-shared";
import type { DataTableColumn } from "./data-table";

// DataTable's column settings on a wide screen: the vertical "Columns (n/m)" rail and
// the drawer it opens, with "Auto-size" and a show/hide box per column. Moved out of
// data-table.tsx whole (refactor audit 2026-10, MOD-3 step 5).

/** The "Columns" rail and its drawer (`columnSettings`). */
export function ColumnSettingsPanel<T>({
  columns,
  hiddenCols,
  setHiddenCols,
  showSettings,
  setShowSettings,
  columnsCountLabel,
  labels,
  autoSizeAll,
}: {
  /** Every column, hidden ones included; the actions column is left out here. */
  columns: DataTableColumn<T>[];
  hiddenCols: Set<string>;
  setHiddenCols: Dispatch<SetStateAction<Set<string>>>;
  showSettings: boolean;
  setShowSettings: (open: boolean) => void;
  /** "Columns (n/m)", the rail's text and name. */
  columnsCountLabel: string;
  labels: DataTableLabels;
  autoSizeAll: () => void;
}) {
  // The "Columns" rail button — where the drawer's X hands focus back (BUG-7a).
  const columnsRail = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <Tooltip label={columnsCountLabel} portal>
        <button
          ref={columnsRail}
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label={columnsCountLabel}
          aria-hidden={showSettings}
          tabIndex={showSettings ? -1 : 0}
          className={cn(
            "group flex shrink-0 items-start justify-center overflow-hidden pt-3 transition-[width] duration-200 ease-out",
            "border-s border-subtle",
            "hover:bg-hover",
            showSettings ? "w-0 border-s-0" : "w-8 cursor-pointer",
          )}
        >
          <span
            className="whitespace-nowrap text-xs font-medium tracking-wide text-muted group-hover:text-secondary"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {columnsCountLabel}
          </span>
        </button>
      </Tooltip>
      <div
        // Closed, the drawer is only `w-0`: without `inert` its X, Auto-size and one
        // checkbox per column stayed tab stops and in the accessibility tree, and Tab
        // after the last cell walked into controls nobody could see (BUG-7a).
        inert={!showSettings || undefined}
        className={cn(
          "shrink-0 overflow-hidden transition-[width] duration-200 ease-out",
          showSettings ? "w-56" : "w-0",
        )}
      >
        <div className="flex w-56 flex-col border-s border-subtle p-2">
          <div className="mb-2 flex items-center justify-between gap-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">
              {columnsCountLabel}
            </div>
            <Tooltip label={labels.close} portal>
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  // Back to the rail that opened it: the X is about to go inert, and
                  // focus would fall to <body> with it (BUG-7a).
                  columnsRail.current?.focus();
                }}
                aria-label={labels.close}
                className="rounded p-0.5 text-placeholder hover:bg-hover hover:text-secondary"
              >
                <X className="size-4" />
              </button>
            </Tooltip>
          </div>
          <button
            type="button"
            onClick={autoSizeAll}
            className="mb-2 rounded border border-subtle px-2 py-1 text-xs font-medium text-secondary hover:bg-hover"
          >
            {labels.autoSize}
          </button>
          <div className="flex flex-col gap-0.5">
            {columns.map((col) => {
              if (col.key === ROW_ACTIONS_KEY) return null;
              const checked = !hiddenCols.has(col.key);
              const headerLabel = columnLabel(col);
              return (
                <label
                  key={col.key}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-hover"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 shrink-0"
                    checked={checked}
                    onChange={(e) => {
                      setHiddenCols((s) => {
                        const next = new Set(s);
                        if (e.target.checked) next.delete(col.key);
                        else next.add(col.key);
                        return next;
                      });
                    }}
                  />
                  {/* The panel is `w-56`: a long column name wraps from Large up rather
                      than reading "Accoun…" beside its box (text size §10.17, round
                      0.34 T1). */}
                  <span className="min-w-0 truncate-until-large">{headerLabel}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
