import { useId, useLayoutEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { claimEscape } from "../hooks/use-dismiss";
import { firstTabStop } from "../lib/focus-left";
import { Tooltip } from "./tooltip";
import type { DataTableLabels } from "./data-table-labels";
import { isTableOwnColumn } from "./data-table-row-actions";
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
  autoHidden,
  keepColumn,
  showSettings,
  setShowSettings,
  columnsCountLabel,
  labels,
  autoSizeAll,
}: {
  /** Every column, hidden ones included; the actions column is left out here. */
  columns: readonly DataTableColumn<T>[];
  hiddenCols: Set<string>;
  setHiddenCols: Dispatch<SetStateAction<Set<string>>>;
  /** The columns the table's width leaves out (`fitPriority`, 0.48): unticked, and
   *  marked "hidden for width". */
  autoHidden: Set<string>;
  /** A tick keeps a column in whatever the width; an untick drops that (data-table-fit.ts). */
  keepColumn: (key: string, on: boolean) => void;
  showSettings: boolean;
  setShowSettings: (open: boolean) => void;
  /** "Columns (n/m)", the rail's text and name. */
  columnsCountLabel: string;
  labels: DataTableLabels;
  autoSizeAll: () => void;
}) {
  // The "Columns" rail button — where the drawer's X hands focus back (BUG-7a).
  const columnsRail = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerId = useId();
  // The opening half (refactor audit 2026-10-30, DSP-13). Opened from the rail, the focus
  // goes into the drawer: the rail it was on turns zero wide and leaves the tab order in
  // the same render, and the focus sat in a control nobody could see. To the first column
  // box — what the drawer is opened for — or, with none, its first control. Only when the
  // rail opened it: a drawer that starts open (its state is the table's) takes nothing.
  const focusOnOpen = useRef(false);
  useLayoutEffect(() => {
    if (!showSettings || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    const drawer = drawerRef.current;
    if (!drawer) return;
    (
      drawer.querySelector<HTMLElement>('input[type="checkbox"]') ?? firstTabStop(drawer, { includeSelf: false })
    )?.focus();
  }, [showSettings]);
  const close = () => {
    setShowSettings(false);
    // Back to the rail that opened it: the drawer is about to go inert, and focus would
    // fall to <body> with it (BUG-7a).
    columnsRail.current?.focus();
  };
  return (
    <>
      <Tooltip label={columnsCountLabel} portal>
        <button
          ref={columnsRail}
          type="button"
          onClick={() => {
            focusOnOpen.current = true;
            setShowSettings(true);
          }}
          aria-label={columnsCountLabel}
          // A disclosure: it says whether the drawer is open, and never hides itself from
          // a screen reader — `aria-hidden` on it while it held the focus left the reader
          // with nothing to say (DSP-13). Zero wide and out of the tab order while open.
          aria-expanded={showSettings}
          aria-controls={drawerId}
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
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape
          for whatever control in the drawer holds the focus; the group itself is no control. */}
      <div
        ref={drawerRef}
        id={drawerId}
        // Named by its own heading's words, so a reader entering it hears "Columns (4/9),
        // group" before the first box (DSP-13).
        role="group"
        aria-label={columnsCountLabel}
        // Closed, the drawer is only `w-0`: without `inert` its X, Auto-size and one
        // checkbox per column stayed tab stops and in the accessibility tree, and Tab
        // after the last cell walked into controls nobody could see (BUG-7a).
        inert={!showSettings || undefined}
        // Escape closes it onto the rail, as its X does. Claimed, not handed to the Escape
        // stack: inside a dialog the drawer is what the key closes, not the dialog.
        onKeyDown={(e) => {
          if (e.key !== "Escape" || !showSettings) return;
          claimEscape(e);
          close();
        }}
        className={cn(
          "shrink-0 overflow-hidden transition-[width] duration-200 ease-out",
          showSettings ? "w-56" : "w-0",
        )}
      >
        <div className="flex w-56 flex-col border-s border-subtle p-2">
          <div className="mb-2 flex items-center justify-between gap-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">{columnsCountLabel}</div>
            <Tooltip label={labels.close} portal>
              <button
                type="button"
                onClick={close}
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
              if (isTableOwnColumn(col.key)) return null;
              // Ticked = drawn: a column left out for width is unticked, so the boxes
              // and "Columns (8/10)" say the same (keksdose live #451).
              const forWidth = !hiddenCols.has(col.key) && autoHidden.has(col.key);
              const checked = !hiddenCols.has(col.key) && !forWidth;
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
                      keepColumn(col.key, e.target.checked);
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
                  {forWidth ? (
                    // Under the name, as part of the box's name: "Email, hidden for width".
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate-until-large">{headerLabel}</span>
                      <span className="text-micro text-muted" data-hidden-for-width="">
                        {labels.hiddenForWidth}
                      </span>
                    </span>
                  ) : (
                    <span className="min-w-0 truncate-until-large">{headerLabel}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
