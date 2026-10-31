import type { CSSProperties, ReactNode } from "react";
import { isTableOwnColumn } from "./data-table-row-actions";
import { DEFAULT_DATA_TABLE_LABELS, type DataTableLabels } from "./data-table-labels";
import type { DataTableCellProps, DataTableColumn, DataTableHeadProps } from "./data-table";
import { useKitLink, type LabelOverride } from "../i18n/kit-labels";
import { pickLinkRenderer, RenderedKitLink } from "./text-link";

// What DataTable shares with its header (data-table-head.tsx), its column panel and its
// phone layout (data-table-mobile.tsx): the cell-attribute and alignment rules, a
// column's plain-text name, and the row link. Moved out of data-table.tsx unchanged
// (refactor audit 2026-10, MOD-3), into a module of their own so none of those has to
// import data-table.tsx at run time — which imports them. Since 0.35 also the table's
// label resolver, which DataTable and its FilterPopover share and the barrel no longer
// exports (round 0.35 R1).

/**
 * Split a caller's cell attributes into what may reach the element and what the kit
 * owns. `role` and `data-col` are dropped outright (see `cellProps`); `className` and
 * `style` come back separately so the kit can merge rather than replace them.
 */
export function splitCellProps(props: DataTableCellProps | DataTableHeadProps | undefined): {
  attrs: Record<string, unknown>;
  className?: string;
  style?: CSSProperties;
} {
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
  return className?.replace(PHYSICAL_ALIGN, (token: string, lead: string, variants: string, side: string) =>
    // Already scoped to one direction: that is a caller choosing the physical side.
    /(^|:)(ltr|rtl):/.test(variants) ? token : `${lead}${variants}text-${side === "right" ? "end" : "start"}`,
  );
}

/** Drop the undefined entries of a {@link DataTableProps.rowAttributes} map, so a
 *  caller can write `{ "data-x": cond ? "y" : undefined }` and get no attribute
 *  at all rather than the string "undefined" in the DOM. */
export function cleanAttrs(attrs: Record<string, string | undefined> | undefined): Record<string, string> | undefined {
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
  if (isTableOwnColumn(col.key) && labels) return labels.actions;
  return col.headerText ?? (typeof col.header === "string" ? col.header : col.key);
}

/**
 * The table's labels: caller overrides merged onto the English defaults (presets merged
 * too, key by key, as the provider merges them — so the parameter is a
 * {@link LabelOverride}).
 *
 * DataTable's own, and FilterPopover's: public until 0.35, when it left the barrel for
 * DataTable's `labels` and the provider's `dataTable`, which it serves (round 0.35 R1,
 * refactor audit 2026-10 API-6a). It stays a resolver rather than `useKitLabels` for the
 * two keys it derives (`columnsCount`, `filterColumn`), which a plain merge would not.
 *
 * Lenient on purpose — a table with no labels at all still renders — so a translated app
 * finds out what fell back to English from `missingKitLabels(labels,
 * DEFAULT_UI_KIT_LABELS)` in its own test, where the answer is actionable.
 */
export function resolveDataTableLabels(...layers: (LabelOverride<DataTableLabels> | undefined)[]): DataTableLabels {
  if (!layers.some(Boolean)) return DEFAULT_DATA_TABLE_LABELS;
  // The layers in order, the provider's then the prop's, later winning key by key. An
  // `undefined` key is skipped, as `useKitLabels` skips it, rather than blanking the word
  // under it: DataTable spread `{ ...provider, ...prop }`, so `labels={{ autoSize:
  // undefined }}` blanked the provider's word and the English one (round 0.35). `presets`
  // is a record and is merged the same way, so renaming one keeps the other ten.
  const partial: Partial<Omit<DataTableLabels, "presets">> = {};
  const presets = { ...DEFAULT_DATA_TABLE_LABELS.presets };
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer ?? {})) {
      if (value === undefined) continue;
      if (key !== "presets") Object.assign(partial, { [key]: value });
      else for (const [preset, text] of Object.entries(value)) if (text !== undefined) presets[preset] = text;
    }
  }
  const merged: DataTableLabels = { ...DEFAULT_DATA_TABLE_LABELS, ...partial, presets };
  // `columnsCount` was split out of `columns` + a template literal. Consumers have
  // been translating `columns` since 0.1, and backfilling the English default over
  // that would hand them "Columns (4/9)" back for having translated the key that
  // existed at the time. So the count is derived from the RESOLVED `columns` unless the
  // caller states the whole sentence, which is the escape hatch for a language where
  // the parenthetical does not fit.
  if (partial.columns !== undefined && partial.columnsCount === undefined) {
    merged.columnsCount = (visible, total) => `${merged.columns} (${visible}/${total})`;
  }
  // The same for `filterColumn` (0.34), from a translated `filter`: the app's own word
  // with the column, rather than English for having translated the key that existed.
  if (partial.filter !== undefined && partial.filterColumn === undefined) {
    merged.filterColumn = (column) => `${merged.filter}: ${column}`;
  }
  return merged;
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

/**
 * What counts as a control of its own inside a clickable row: a click or key press
 * that lands on one of these belongs to it, not to the row's `onRowClick`. The row's
 * own link (`rowHref`, marked `data-row-link`) is the exception — it IS the row.
 */
const OWN_CONTROL =
  'a[href],button,input,select,textarea,label,summary,[role="button"],[role="link"],[role="checkbox"],[role="switch"],[role="menuitem"],[role="option"],[contenteditable=""],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

/** Whether an event on `row` started on a control nested inside it. */
export function fromOwnControl(target: EventTarget | null, row: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  const hit = target.closest(OWN_CONTROL);
  return !!hit && hit !== row && row.contains(hit) && !hit.hasAttribute("data-row-link");
}

/**
 * The controls whose own default IS the click — a native checkbox's or radio's toggle, a
 * label's click through to its field, a summary's disclosure (0.46, the 0.45 note from
 * UM): cancelling the click undoes it. Each is the click's own activation target, so a
 * click on one does not follow the link around it, and {@link RowLink} leaves its
 * default alone.
 */
const OWN_DEFAULT = 'input[type="checkbox"],input[type="radio"],label,summary';

/** Whether a click inside `link` landed on (or in) one of {@link OWN_DEFAULT}. */
function onOwnDefault(target: EventTarget | null, link: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  const hit = target.closest(OWN_DEFAULT);
  return !!hit && hit !== link && link.contains(hit);
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
 *
 * `navigate` (refactor audit 2026-10-30, DSP-23 b): a table with `rowHref` and no
 * `onRowClick` has nothing to open the row in place, and the cancelled click opened
 * nothing at all. There the plain click is the link's: followed through the provider's
 * `linkComponent` for an in-app path, as every kit link is (`pickLinkRenderer`), else
 * by the browser.
 */
export function RowLink({
  href,
  onActivate,
  navigate = false,
  className,
  children,
  ...rest
}: {
  href: string;
  /** Runs on a plain left click. Omit it where an ANCESTOR already handles the
   *  click (the desktop `<tr>`), or the row would toggle twice. */
  onActivate?: () => void;
  /** The row has no `onRowClick`: a plain click follows the link instead. */
  navigate?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "className" | "children" | "onClick" | "onClickCapture"
>) {
  const kitLink = useKitLink();
  if (navigate) {
    const render = pickLinkRenderer(undefined, kitLink, href);
    const linkProps = {
      ...rest,
      href,
      draggable: false,
      className,
      // A modified click opens a tab; it must not also select the row (see above).
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!fromOutside(e.target, e.currentTarget) && !isPlainLeftClick(e)) e.stopPropagation();
      },
    };
    // Drawn as a component of its own, so a router link's hooks are its own: text-link's
    // RenderedKitLink, every kit link's (0.52 code review, data-table-shared.tsx — this
    // module had a copy).
    return render ? (
      <RenderedKitLink render={render} props={{ ...linkProps, children }} />
    ) : (
      <a {...linkProps}>{children}</a>
    );
  }
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
        // A checkbox, a radio, a label or a summary keeps its own default: cancelling
        // it would undo the toggle, and the link is not followed from it anyway.
        if (onOwnDefault(e.target, e.currentTarget)) return;
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
        // exactly how the row behaved before it became a link — and one that did not
        // (a select in a phone card's cell, keksdose live #428) is still its own.
        if (fromOwnControl(e.target, e.currentTarget)) return;
        onActivate?.();
      }}
    >
      {children}
    </a>
  );
}
