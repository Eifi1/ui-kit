import { isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { useLargeText } from "../hooks/use-large-text";
import { useKitLabels } from "../i18n/kit-labels";
import { Popover } from "./popover";
import { Button, CompactControls, IconButton } from "./ui";
import type { IconButtonSize } from "./ui";
import type { DataTableColumn } from "./data-table";

/**
 * A row's actions — inline icons at Normal, one "⋯" menu at Large and above
 * (docs/text-size-harmonization.md §10.8).
 *
 * At Large an IconButton shows its label as text (§4). In a dense row — a register's
 * action column, a list row's end — every label at once does not fit: Kurvenschmiede
 * has 44 IconButtons in rows, kastlan 119. So a row's actions collapse instead, into
 * the menu the user roster has used since 0.31 (`UserRowActions`, now built on this):
 * one "⋯" button, and a menu with each action's icon AND words, where a locked one stays
 * listed and says why.
 *
 * The data is the roster's `UserRowActionList`, generalised: entries, and `false` /
 * `null` for the ones a condition left out (`row.locked || {…}`).
 */

/** One action of a row. */
export interface RowAction {
  /** React key. Default: the label. */
  key?: string;
  /** The action's name: the inline icon's name and tooltip, the menu entry's words. */
  label: string;
  /** Runs it. The kit sends nothing — the app opens its confirmation or calls its API. */
  onSelect: () => void;
  /**
   * The glyph: a Lucide icon (`Pencil`), or an element (`<Pencil />`, an app's own
   * svg) — DataTable's `rowActions` hand their `icon` node through. Inline, an action
   * without one is a small text button; in the menu it is the words alone.
   */
  icon?: LucideIcon | ReactElement;
  /** `danger` for delete, revoke, erase: the quiet red of IconButton's `tone="danger"`
   *  inline, the danger text tone in the menu. */
  tone?: "default" | "danger";
  /** Why it is not available for this row. It stays listed, focusable, and says so — an
   *  action that silently vanished would leave the reader looking for it. */
  disabledReason?: ReactNode;
  /** Leave it out for this row. */
  hidden?: boolean;
}

/** What a row's actions may be: entries, and `false` / `null` / `undefined` for the ones
 *  a condition left out. */
export type RowActionList = readonly (RowAction | false | null | undefined)[];

export interface RowActionsLabels {
  /** The menu button's name when the row has no name of its own; also the actions
   *  column's (hidden) header in {@link rowActionsColumn}. */
  actions: string;
  /** The menu button's name, given the row's: "Actions for Ada Example". */
  actionsFor: (name: string) => string;
}

export const DEFAULT_ROW_ACTIONS_LABELS: RowActionsLabels = {
  actions: "Actions",
  actionsFor: (name) => `Actions for ${name}`,
};

/**
 * - `"auto"` (default): the icons inline at Normal; the "⋯" menu at Large and Extra
 *   large once there are two or more (§10.8). A single action stays inline at every
 *   size, with its label as text at Large — one label fits a row, and a menu of one is
 *   a detour.
 * - `"menu"`: the menu at every size — the roster's choice, whose actions grow (§2.4
 *   there) and do not fit a phone card as a strip.
 * - `"inline"`: the icons at every size — for a row the app knows has room; at Large
 *   each then shows its label (IconButton's `labelVisible`).
 */
export type RowActionsCollapse = "auto" | "menu" | "inline";

/** The sizes a row action comes in: IconButton's row steps. `2xs` is DataTable's
 *  compact density. At Large every one is at least a 48 px target (IconButton). */
export type RowActionsSize = Extract<IconButtonSize, "md" | "sm" | "xs" | "2xs">;

export interface RowActionsProps {
  actions: RowActionList;
  /** The row's name, for the menu button's name — "Actions for Ada Example". Without it
   *  the button is "Actions". */
  name?: string;
  /** When the actions collapse into the menu — see {@link RowActionsCollapse}. */
  collapse?: RowActionsCollapse;
  /** The inline icons' and the "⋯" button's size. Default `xs`, a list row's action. */
  size?: RowActionsSize;
  /** The menu's width. Default `"15rem"`, in rem so it grows with the words (§3.2). */
  menuWidth?: `${number}rem`;
  /** On the wrapper: the inline strip, or the "⋯" button's box. */
  className?: string;
  labels?: Partial<RowActionsLabels>;
}

function visibleActions(actions: RowActionList): RowAction[] {
  return actions.filter((a): a is RowAction => Boolean(a) && !(a as RowAction).hidden);
}

/** An action's glyph as a node: a component is rendered, an element is used as is. */
function glyphOf(icon: RowAction["icon"]): ReactNode {
  if (icon === undefined) return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon as LucideIcon;
  return <Icon />;
}

/**
 * A row's actions, inline or as a "⋯" menu — see {@link RowActionsCollapse}. Every
 * control stops its click (and the Enter/Space it stands for) from reaching the row, so
 * a clickable row or a DataTable `rowLink` does not open as well; in a DataTable column
 * also set `noRowLink: true`, as {@link rowActionsColumn} does.
 *
 * Inline, the icons sit in a {@link CompactControls} region at Normal: their labels
 * stay the names and the tooltips, and a locked one keeps its reason in the tooltip — a
 * line under one icon of a row would break the row. In the menu a locked action's
 * reason is a line under its words at Large and on touch (Button's
 * `disabledReasonDisplay`).
 *
 * The menu is portalled, so a table's scroller cannot clip it; Escape and an outside
 * press close it, and focus goes back to the "⋯" button, which is where a confirmation
 * dialog then returns it.
 */
export function RowActions({
  actions,
  name,
  collapse = "auto",
  size = "xs",
  menuWidth = "15rem",
  className,
  labels: labelsProp,
}: RowActionsProps) {
  const labels = useKitLabels("rowActions", DEFAULT_ROW_ACTIONS_LABELS, labelsProp);
  const large = useLargeText();
  const entries = visibleActions(actions);
  if (entries.length === 0) return null;
  const asMenu = collapse === "menu" || (collapse === "auto" && large && entries.length > 1);
  if (!asMenu) {
    const strip = (
      <div data-slot="row-actions" className={cn("inline-flex items-center gap-0.5", className)}>
        {entries.map((action) => (
          <InlineAction key={action.key ?? action.label} action={action} size={size} />
        ))}
      </div>
    );
    // Compact at Normal (no room for a reason line in a row); at Large an inline action
    // is the app's choice ("inline") or the row's only one, and shows its words.
    return large ? strip : <CompactControls>{strip}</CompactControls>;
  }
  const title = name ? labels.actionsFor(name) : labels.actions;
  return (
    <Popover
      width={menuWidth}
      aria-label={title}
      className="p-1"
      trigger={({ open, toggle, ref }) => (
        <IconButton
          ref={ref}
          size={size}
          label={title}
          // "⋯" is read by everyone as "more actions"; the menu it opens is the words.
          labelVisible={false}
          aria-haspopup="dialog"
          aria-expanded={open}
          stopPropagation
          onClick={toggle}
          className={className}
        >
          <MoreHorizontal />
        </IconButton>
      )}
    >
      {(close) => (
        <ul data-slot="row-actions-menu" className="space-y-0.5">
          {entries.map((action) => {
            const glyph = glyphOf(action.icon);
            return (
              <li key={action.key ?? action.label}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  stretch
                  tone={action.tone === "danger" ? "danger" : undefined}
                  disabledReason={action.disabledReason}
                  className="w-full justify-start text-start"
                  onClick={() => {
                    close();
                    action.onSelect();
                  }}
                >
                  {glyph && (
                    <span aria-hidden className="flex shrink-0 [&_svg]:size-4">
                      {glyph}
                    </span>
                  )}
                  {action.label}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Popover>
  );
}

/** One inline action: an IconButton with its icon, else a small text button. */
function InlineAction({ action, size }: { action: RowAction; size: RowActionsSize }) {
  const glyph = glyphOf(action.icon);
  if (glyph) {
    return (
      <IconButton
        size={size}
        label={action.label}
        tone={action.tone === "danger" ? "danger" : undefined}
        disabledReason={action.disabledReason}
        stopPropagation
        onClick={action.onSelect}
      >
        {glyph}
      </IconButton>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      tone={action.tone === "danger" ? "danger" : undefined}
      disabledReason={action.disabledReason}
      onClick={(e) => {
        // A row listening for clicks must not open as well (IconButton's stopPropagation).
        e.stopPropagation();
        action.onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") e.stopPropagation();
      }}
    >
      {action.label}
    </Button>
  );
}

/** The actions column's hidden header, in the provider's words. */
function RowActionsHeader({ text, labels }: { text?: string; labels?: Partial<RowActionsLabels> }) {
  const resolved = useKitLabels("rowActions", DEFAULT_ROW_ACTIONS_LABELS, labels);
  return <span className="sr-only">{text ?? resolved.actions}</span>;
}

export interface RowActionsColumnOptions<T> {
  /** The column's key. Default `"actions"`. */
  key?: string;
  /** The row's actions — `false` / `null` for the ones a condition leaves out. */
  actions: (row: T) => RowActionList;
  /** The row's name, for the "⋯" button's name ("Actions for Ada Example"). */
  name?: (row: T) => string | undefined;
  collapse?: RowActionsCollapse;
  /** Default `xs`. */
  size?: RowActionsSize;
  /**
   * The column's name as plain text — the column-settings checklist and the phone
   * card's label read it (`DataTableColumn.headerText`). Pass the app's own word; left
   * out, the header shows the provider's `rowActions.actions` to a screen reader and
   * the plain-text places fall back to the column's `key`.
   */
  headerText?: string;
  labels?: Partial<RowActionsLabels>;
  /** Anything else for the column (`mobileHidden`, `cellProps`…), merged last. */
  column?: Partial<DataTableColumn<T>>;
}

/**
 * A DataTable column of {@link RowActions} — an app's action column in one line
 * (§10.8): inline icons at Normal, the "⋯" menu at Large with two or more actions.
 *
 *     columns={[...columns, rowActionsColumn({ actions: (r) => [...], name: (r) => r.name })]}
 *
 * The header is visually hidden (the icons say what the column is), the column hugs its
 * content at the row's end, and `noRowLink` keeps a `rowHref` anchor off it, so the
 * buttons keep their own clicks. On a phone it is a line of the card like any column;
 * set `column: { mobileHidden: true }` to drop it there (with `mobileDetailsInRow` it
 * then shows in the opened row instead).
 */
export function rowActionsColumn<T>({
  key = "actions",
  actions,
  name,
  collapse,
  size,
  headerText,
  labels,
  column,
}: RowActionsColumnOptions<T>): DataTableColumn<T> {
  return {
    key,
    header: <RowActionsHeader text={headerText} labels={labels} />,
    headerText,
    cell: (row) => (
      <RowActions actions={actions(row)} name={name?.(row)} collapse={collapse} size={size} labels={labels} />
    ),
    className: "w-px whitespace-nowrap text-end",
    headClassName: "w-px",
    noRowLink: true,
    ...column,
  };
}
