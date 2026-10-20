import { isValidElement, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { RowActions, type RowAction, type RowActionTone } from "./row-actions";
import type { SwipeAction } from "./swipeable-row";
import type { DataTableLabels } from "./data-table-labels";
import type {
  DataTableColumn,
  DataTableDensity,
  DataTableDesktopSwipeActions,
  DataTableProps,
  DataTableRowAction,
  MobileSwipeActions,
} from "./data-table";

// DataTable's per-row actions (`rowActions`): the actions column on a wide screen and
// the swipes on a phone card. Moved out of data-table.tsx whole (refactor audit
// 2026-10, MOD-3 step 1); internal — the public types stay in data-table.tsx.

/** The actions column's key. Not a column a caller declares, so it is kept out of the
 *  column-settings panel. */
export const ROW_ACTIONS_KEY = "__rowActions";

/** The key of the column derived from `mobileSwipeActions` (0.46, dev#598) — the
 *  table's own too. */
export const SWIPE_ACTIONS_KEY = "__swipeActions";

/** A column the TABLE adds, not the caller: out of the column settings and the count,
 *  never resized, never the totals row's header. */
export function isTableOwnColumn(key: string): boolean {
  return key === ROW_ACTIONS_KEY || key === SWIPE_ACTIONS_KEY;
}

/**
 * An actions column's heading (0.46.1, keksdose dev#598 rework — Marcel: a VISIBLE
 * "Actions" heading on every table with an actions column): the caller's node, else the
 * word on screen; `false` is the pre-0.46.1 heading, a screen reader's name only.
 */
export function actionsHeading(header: ReactNode | false | undefined, word: string): ReactNode {
  if (header === false) return <span className="sr-only">{word}</span>;
  return header ?? word;
}

/** A curtain's tone, as an icon button's (keksdose's `toneOf`): only the tones that MEAN
 *  something on a quiet icon carry over; a status colour, a hue or an app's `paint` stays
 *  on the curtain and reads muted. */
function swipeTone(action: SwipeAction): RowActionTone {
  switch (action.tone) {
    case "danger":
    case "warning":
    case "info":
      return action.tone;
    default:
      return "muted";
  }
}

/**
 * A row's swipe plan as desktop row actions (dev#598) — what DataTable's
 * `desktopSwipeActions` column draws, for an app that builds its own actions column (or
 * a `RowActions` outside a table) from the same `mobileSwipeActions` plan, so the two
 * cannot drift (public since 0.46.1, keksdose N3).
 *
 * `end` then `start` — the physical `right` / `left` only where the logical side is
 * missing, as the card reads them — each action once, told apart by its `id`, else by its
 * label (two stages with one label would be one button twice). Each button runs the
 * swipe's own `onCommit`; a swipe's `danger` / `warning` / `info` tone carries over, any
 * other reads `muted`. `options.omit` leaves an action out, `options.commit` gives it a
 * `CommitScope` (see {@link DataTableDesktopSwipeActions}). A `null` plan is `[]`.
 *
 *     <RowActions actions={swipePlanRowActions(plan(row), row, { omit })} name={row.title} />
 */
export function swipePlanRowActions<T>(
  plan: MobileSwipeActions | null | undefined,
  row: T,
  options: Pick<DataTableDesktopSwipeActions<T>, "omit" | "commit"> = {},
): RowAction[] {
  if (!plan) return [];
  const out: RowAction[] = [];
  const seen = new Set<string>();
  for (const action of [...(plan.end ?? plan.right ?? []), ...(plan.start ?? plan.left ?? [])]) {
    const key = action.id ?? action.label;
    if (seen.has(key)) continue;
    seen.add(key);
    if (options.omit?.(action, row)) continue;
    const commit = typeof options.commit === "function" ? options.commit(action, row) : options.commit;
    out.push({
      key,
      label: action.label,
      icon: isValidElement(action.icon)
        ? action.icon
        : action.icon != null && action.icon !== false
          ? <>{action.icon}</>
          : undefined,
      tone: swipeTone(action),
      commit,
      onSelect: action.onCommit,
    });
  }
  return out;
}

interface ResolvedRowAction<T> {
  key: string;
  label: string;
  icon: ReactNode;
  tone: "default" | "danger";
  swipe: "start" | "end" | false;
  action: DataTableRowAction<T>;
}

function resolveRowAction<T>(
  action: DataTableRowAction<T>,
  index: number,
  labels: DataTableLabels,
): ResolvedRowAction<T> {
  const tone = action.tone ?? (action.kind === "delete" ? "danger" : "default");
  return {
    key: action.kind ?? `${index}:${action.label ?? ""}`,
    label: action.label ?? (action.kind === "edit" ? labels.edit : action.kind === "delete" ? labels.delete : ""),
    icon:
      action.icon ??
      (action.kind === "edit" ? <Pencil /> : action.kind === "delete" ? <Trash2 /> : null),
    tone,
    swipe: action.swipe ?? (tone === "danger" ? "start" : "end"),
    action,
  };
}

/** Ask, then act. */
async function runRowAction<T>(action: DataTableRowAction<T>, row: T): Promise<void> {
  if (action.confirm && !(await action.confirm(row))) return;
  action.onAction(row);
}

/** A resolved row action as {@link RowActions} takes it. Its `icon` is any node; a
 *  non-element one (a string glyph) is wrapped, since RowAction wants an element. */
function toRowAction<T>(a: ResolvedRowAction<T>, row: T): RowAction {
  return {
    key: a.key,
    label: a.label,
    icon: isValidElement(a.icon) ? a.icon : a.icon != null && a.icon !== false ? <>{a.icon}</> : undefined,
    tone: a.tone,
    disabledReason: a.action.disabledReason?.(row),
    onSelect: () => void runRowAction(a.action, row),
  };
}

/**
 * The caller's columns with the actions column appended, and the same actions as a
 * phone card's swipes (`swipesFromActions`; DataTable uses it unless the caller passes
 * `mobileSwipeActions`). Without `rowActions` the columns come back as given.
 *
 * The actions column is appended to the caller's columns rather than drawn as a
 * second special case beside the selection column: it then gets the cell padding,
 * the widths and the phone rules (`mobileHidden`) every other column gets.
 */
export function useRowActionColumn<T>({
  columns: columnsProp,
  rowActions,
  rowActionsHeader,
  rowName,
  labels,
  density,
  mobileSwipeActions,
  desktopSwipeActions,
}: {
  columns: DataTableColumn<T>[];
  rowActions: DataTableProps<T>["rowActions"];
  rowActionsHeader?: DataTableProps<T>["rowActionsHeader"];
  rowName: DataTableProps<T>["rowName"];
  labels: DataTableLabels;
  density: DataTableDensity;
  mobileSwipeActions?: DataTableProps<T>["mobileSwipeActions"];
  desktopSwipeActions?: DataTableProps<T>["desktopSwipeActions"];
}): {
  columns: DataTableColumn<T>[];
  swipesFromActions: (row: T) => MobileSwipeActions | null;
} {
  const rowActionsFor = useCallback(
    (row: T): ResolvedRowAction<T>[] =>
      rowActions
        ? (typeof rowActions === "function" ? rowActions(row) : rowActions)
            .filter((a) => !a.hidden?.(row))
            .map((a, i) => resolveRowAction(a, i, labels))
        : [],
    [rowActions, labels],
  );
  // dev#598: the desktop half of the caller's swipes. On by default, except beside
  // `rowActions`, whose column already is the desktop's (and whose swipes these usually
  // are). The options object is often a fresh literal per render; its parts are the deps.
  const swipeOptions = typeof desktopSwipeActions === "object" ? desktopSwipeActions : undefined;
  const swipeColumnOn =
    !!mobileSwipeActions && (desktopSwipeActions === undefined ? !rowActions : desktopSwipeActions !== false);
  const swipeOmit = swipeOptions?.omit;
  const swipeName = swipeOptions?.name;
  const swipeCollapse = swipeOptions?.collapse;
  const swipeCommit = swipeOptions?.commit;
  const swipeHeader = swipeOptions?.header;
  const swipeColumn = useMemo<DataTableColumn<T> | null>(
    () =>
      swipeColumnOn
        ? {
            key: SWIPE_ACTIONS_KEY,
            header: actionsHeading(swipeHeader, labels.actions),
            cell: (row) => (
              <RowActions
                actions={swipePlanRowActions(mobileSwipeActions!(row), row, { omit: swipeOmit, commit: swipeCommit })}
                name={(swipeName ?? rowName)?.(row)}
                collapse={swipeCollapse}
                size={density === "compact" ? "2xs" : "xs"}
                // The last column's tooltips open toward the row's start.
                tooltipSide="start"
                labels={{ actions: labels.actions }}
                className="justify-end"
              />
            ),
            className: "w-px whitespace-nowrap text-end",
            // The heading over the buttons, at the row's end (0.46.1).
            headClassName: "w-px text-end",
            // On a phone the same actions are the card's swipes.
            mobileHidden: true,
            noRowLink: true,
          }
        : null,
    [
      swipeColumnOn,
      mobileSwipeActions,
      swipeOmit,
      swipeCommit,
      swipeName,
      rowName,
      swipeCollapse,
      swipeHeader,
      density,
      labels.actions,
    ],
  );
  const actionColumns = useMemo<DataTableColumn<T>[]>(
    () =>
      rowActions
        ? [
            ...columnsProp,
            {
              key: ROW_ACTIONS_KEY,
              header: actionsHeading(rowActionsHeader, labels.actions),
              // Through RowActions (0.32, §10.8): the icons inline at Normal, one "⋯"
              // menu at Large once there are two — every label at once does not fit a
              // row. Each control stops its own click: the row's handler already skips
              // its controls, and this is for the caller who wraps the table in a
              // clickable element of their own.
              cell: (row) => (
                <RowActions
                  actions={rowActionsFor(row).map((a) => toRowAction(a, row))}
                  name={rowName?.(row)}
                  size={density === "compact" ? "2xs" : "xs"}
                  labels={{ actions: labels.actions }}
                  className="justify-end"
                />
              ),
              className: "w-px whitespace-nowrap text-end",
              headClassName: "w-px text-end",
              // On a phone the same actions are the card's swipes.
              mobileHidden: true,
              noRowLink: true,
            },
          ]
        : columnsProp,
    [columnsProp, rowActions, rowActionsHeader, rowActionsFor, rowName, labels.actions, density],
  );
  const columns = useMemo(
    () => (swipeColumn ? [...actionColumns, swipeColumn] : actionColumns),
    [actionColumns, swipeColumn],
  );
  const swipesFromActions = (row: T): MobileSwipeActions | null => {
    const swipes = rowActionsFor(row).filter((a) => a.swipe && !a.action.disabledReason?.(row));
    if (!swipes.length) return null;
    const toSwipe = (a: ResolvedRowAction<T>): SwipeAction => ({
      label: a.label,
      icon: a.icon,
      onCommit: () => void runRowAction(a.action, row),
      // The row action's tone, painted by SwipeableRow: its soft wash idle, its fill
      // and that fill's foreground armed (0.33).
      tone: a.tone === "danger" ? "danger" : "brand",
    });
    return {
      start: swipes.filter((a) => a.swipe === "start").map(toSwipe),
      end: swipes.filter((a) => a.swipe === "end").map(toSwipe),
    };
  };
  return { columns, swipesFromActions };
}
