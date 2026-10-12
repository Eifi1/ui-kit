import type { CSSProperties, ReactNode } from "react";
import { ROW_ACTIONS_KEY } from "./data-table-row-actions";
import type { DataTableLabels } from "./data-table-labels";
import type { DataTableCellProps, DataTableColumn, DataTableHeadProps } from "./data-table";

// What DataTable shares with its header (data-table-head.tsx), its column panel and its
// phone layout (data-table-mobile.tsx): the cell-attribute and alignment rules, a
// column's plain-text name, and the row link. Moved out of data-table.tsx unchanged
// (refactor audit 2026-10, MOD-3), into a module of their own so none of those has to
// import data-table.tsx at run time — which imports them.

/**
 * Split a caller's cell attributes into what may reach the element and what the kit
 * owns. `role` and `data-col` are dropped outright (see `cellProps`); `className` and
 * `style` come back separately so the kit can merge rather than replace them.
 */
export function splitCellProps(
  props: DataTableCellProps | DataTableHeadProps | undefined,
): { attrs: Record<string, unknown>; className?: string; style?: CSSProperties } {
  if (!props) return { attrs: {} };
  const {
    className,
    style,
    role: _role,
    "data-col": _col,
    ...attrs
  } = props as DataTableCellProps & { "data-col"?: unknown };
  return { attrs, className, style };
}

// A bare `text-right` / `text-left` token, with or without variant prefixes
// (`md:text-right`). Deliberately NOT `text-right-…` or an arbitrary value.
const PHYSICAL_ALIGN = /(^|\s)((?:[\w-]+:)*)text-(left|right)(?=\s|$)/g;

/**
 * A column's `className`/`headClassName` with physical text alignment rewritten to
 * logical: `text-right` → `text-end`, `text-left` → `text-start`.
 *
 * Every numeric column written before 0.7.0 says `text-right`, and that is what it
 * MEANT: the end of the line, where digits line up. Rendered as written, a
 * right-to-left table puts those numbers on the far side from their own header's
 * sort button. Rewriting keeps each existing call site correct in both directions
 * with no change on its side; a caller who genuinely wants the physical side in RTL
 * too can say `ltr:text-right rtl:text-right`, which this leaves alone.
 */
export function logicalAlign(className: string | undefined): string | undefined {
  return className?.replace(
    PHYSICAL_ALIGN,
    (token: string, lead: string, variants: string, side: string) =>
      // Already scoped to one direction: that is a caller choosing the physical side.
      /(^|:)(ltr|rtl):/.test(variants)
        ? token
        : `${lead}${variants}text-${side === "right" ? "end" : "start"}`,
  );
}

/** Drop the undefined entries of a {@link DataTableProps.rowAttributes} map, so a
 *  caller can write `{ "data-x": cond ? "y" : undefined }` and get no attribute
 *  at all rather than the string "undefined" in the DOM. */
export function cleanAttrs(
  attrs: Record<string, string | undefined> | undefined,
): Record<string, string> | undefined {
  if (!attrs) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) out[k] = v;
  return out;
}

/**
 * A column's name as a plain string.
 *
 * `header` is a ReactNode — an icon, a unit suffix, a tooltip-wrapped span — and
 * neither a live region nor the column-settings checklist can speak a React element.
 * The `key` fallback is the one the settings panel has always used; a column whose
 * header is not a string and whose key is not human-readable is a call site that
 * should pass a string header, and that is visible in what gets announced.
 */
export function columnLabel<T>(col: DataTableColumn<T>, labels?: DataTableLabels): string {
  if (col.key === ROW_ACTIONS_KEY && labels) return labels.actions;
  return col.headerText ?? (typeof col.header === "string" ? col.header : col.key);
}

/**
 * Whether a click that reached `row`'s handler did not start in the row's own DOM.
 *
 * React bubbles an event through the COMPONENT tree, portals included: a popover, a
 * menu or a dialog a cell (or the expansion under it) opens renders at `<body>` but
 * still reports its clicks to every React ancestor — the row among them. So a click
 * in a cell's portalled date picker opened the row it came from, and a page wrapped
 * such content in `<div onClick={(e) => e.stopPropagation()}>` to stop it (kastlan's
 * feedback page did, round its comments). The row owns the clicks on the row.
 */
export function fromOutside(target: EventTarget | null, row: HTMLElement): boolean {
  return !(target instanceof Node) || !row.contains(target);
}

/** A click the APP owns. Anything else — middle, ⌘/Ctrl, Shift, Alt — belongs to
 *  the browser, and the whole feature is not touching it. */
const isPlainLeftClick = (e: React.MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * The anchor a linkable row is opened through (Keksdose feedback #451).
 *
 * The plain left click is OURS: cancelled, then handed to the row's own handler, so
 * clicking a row still expands it in place instead of reloading the page. Every
 * other click — middle, ⌘/Ctrl, Shift, Alt — is left completely untouched, which is
 * the entire point of using an anchor rather than an `onAuxClick` + `window.open`:
 * that imitation buys back the middle click and still loses ⌘/Ctrl-click, "copy link
 * address", the status-bar preview and the phone's long-press menu.
 *
 * Modified clicks DO stop propagating: on a table with `selection`, ⌘/Ctrl-click and
 * Shift-click on a row mean "select" (feedback #289), and a row must not change its
 * selection while the browser is opening a tab. The rest of the row still selects —
 * the link is one cell, not the row.
 *
 * `draggable={false}` because an anchor otherwise hijacks a horizontal mouse drag as
 * a link-drag: that is both drag-to-select-text on the desktop table and the mouse
 * path through SwipeableRow's gesture on the mobile card.
 */
export function RowLink({
  href,
  onActivate,
  className,
  children,
  ...rest
}: {
  href: string;
  /** Runs on a plain left click. Omit it where an ANCESTOR already handles the
   *  click (the desktop `<tr>`), or the row would toggle twice. */
  onActivate?: () => void;
  className?: string;
  children: ReactNode;
} & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "className" | "children" | "onClick" | "onClickCapture"
>) {
  return (
    <a
      {...rest}
      href={href}
      draggable={false}
      className={className}
      // CAPTURE phase, and it has to be: on the mobile card the whole card is the
      // anchor, so a nested control sits INSIDE it — and the ones that matter
      // (the feedback row's status toggles) stop the click propagating so the row
      // won't also expand. A bubble-phase handler would never run for those, and
      // the browser would follow the link out from under the button press. Cancelling
      // here happens before any descendant can silence the event; `stopPropagation`
      // does not undo a `preventDefault`.
      onClickCapture={(e) => {
        // A click in a portal a descendant opened is not a click on the link: leave
        // it (and a link inside it) alone. See `fromOutside`.
        if (fromOutside(e.target, e.currentTarget)) return;
        if (isPlainLeftClick(e)) e.preventDefault();
      }}
      onClick={(e) => {
        if (fromOutside(e.target, e.currentTarget)) return;
        if (!isPlainLeftClick(e)) {
          e.stopPropagation();
          return;
        }
        // Already cancelled above; this phase only decides what opens. A nested
        // control that stopped propagation deliberately never reaches it, which is
        // exactly how the row behaved before it became a link.
        onActivate?.();
      }}
    >
      {children}
    </a>
  );
}
