import { Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { FOCUS_RING } from "./focus-ring";
import { IconButton } from "./icon-button";
import { Select } from "./select";
import { cn } from "../lib/cn";
import { dirOf, type Direction } from "../lib/direction";
import { defaultFilterState, isFilterActive, resolveFilter } from "./data-table-filters";
import type { ColumnFilter, FilterValue } from "./data-table-filters";
import type { SortCycle, SortState } from "./data-table-sort";
import { FilterPopover } from "./data-table-filter-popover";
import { SwipeableRow, type SwipeAction } from "./swipeable-row";
import { DialogFrame } from "./dialog-frame";
import { Checkbox } from "./checkbox";
import { Chip } from "./chip";
import { BooleanMark } from "./data-table-cells";
import { EMPTY_FORMATTED_VALUE } from "../lib/format";
import { useLongPress } from "../hooks/use-long-press";
import type { DataTableLabels } from "./data-table-labels";
import { RowLink, cleanAttrs, columnLabel, fromOutside, fromOwnControl } from "./data-table-shared";
import type {
  DataTableCellProps,
  DataTableColumn,
  DataTableProps,
  DataTableSortLabels,
  FilterState,
  MobileSwipeActions,
} from "./data-table";

// DataTable's phone layout: the card a row becomes, the fields inside it, and the sort
// and filter controls above the card list. Moved out of data-table.tsx whole (refactor
// audit 2026-10, MOD-3 step 4); the list itself, its pager and its row dialog stay in
// DataTable, which owns the state they share with the wide-screen table.

/** Only the `data-*` attributes of a cell's props — what a phone card field takes. */
function dataAttrsOf(props: DataTableCellProps | undefined): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) if (k.startsWith("data-") && k !== "data-col") out[k] = v;
  return out;
}

/** The logical sides onto the physical drag directions {@link SwipeableRow} takes. */
function physicalSwipe(
  actions: MobileSwipeActions,
  dir: Direction,
): { left?: SwipeAction[]; right?: SwipeAction[] } {
  const rtl = dir === "rtl";
  return {
    left: (rtl ? actions.end : actions.start) ?? actions.left,
    right: (rtl ? actions.start : actions.end) ?? actions.right,
  };
}

// ---------- Phone card at Large (0.32) ----------

/**
 * §4 "nothing truncates" in a phone card at Large and Extra large: a cell's own
 * `truncate` (a kit cell, a chip, the app's span) wraps instead — and breaks inside a
 * word too long for the card rather than running out of it. A descendant rule, so it
 * reaches the cells without the table knowing what they render; `large:`, so Normal
 * keeps every ellipsis it had.
 */
const CARD_NO_TRUNCATE =
  "large:[&_.truncate]:whitespace-normal large:[&_.truncate]:[overflow-wrap:anywhere]";

/**
 * Columns as label-above-value pairs: the phone card's fields at Large (§4), and the
 * opened row's `mobileDetailsInRow` at every size. Each pair is a `<div>` in the
 * `<dl>` — the grouping HTML allows — so a pair keeps together and the gap falls
 * BETWEEN facts rather than between a label and its own value. `relative` holds a
 * header's `sr-only` text (an actions column's), as every kit container must.
 */
export function StackedFields<T>({
  columns,
  row,
  compact,
  liftOwnClicks = false,
}: {
  columns: DataTableColumn<T>[];
  row: T;
  compact: boolean;
  /** On a stretched card (0.50 K4): lift the own-click fields above its title link. */
  liftOwnClicks?: boolean;
}) {
  const fields = filledFields(columns, row);
  if (fields.length === 0) return null;
  return (
    <dl
      data-card-fields="stacked"
      className={cn("relative flex min-w-0 flex-col", compact ? "gap-1.5 text-xs" : "gap-2.5 text-sm", CARD_NO_TRUNCATE)}
    >
      {fields.map(({ col, value }) => (
        <div key={col.key} className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-muted">{col.header}</dt>
          <dd
            {...dataAttrsOf(col.cellProps?.(row))}
            className={cn("mt-0.5 min-w-0 break-words text-secondary", liftOwnClicks && keepsOwnClicks(col) && LIFTED_FIELD)}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A stretched card's own-click cell (0.50 K4): above the title control's overlay
 * (`after:z-[1]`), so its link or buttons take their own taps. `w-fit` keeps the lifted
 * box to the cell's content, so the field's empty rest still opens the row.
 */
const LIFTED_CELL = "relative z-[2]";
const LIFTED_FIELD = cn(LIFTED_CELL, "w-fit max-w-full justify-self-start");

/**
 * The keyboard frame of a stretched card (0.50 K4): FOCUS_RING's, inside the card,
 * while its title control (`data-card-link`) has the focus.
 */
const STRETCHED_RING =
  "has-[[data-card-link]:focus-visible]:ring-inset has-[[data-card-link]:focus-visible]:ring-focus has-[[data-card-link]:focus-visible]:ring-brand";

/** The most fields the default phone card shows under its title (0.49 KIT-7). */
export const MOBILE_CARD_FIELDS = 3;

/**
 * The default phone card's columns (0.49 KIT-7), out of the phone's columns (visible,
 * not `mobileHidden`): the title — `mobile: "primary"` or `mobilePrimary`, else the
 * first that is not a status — the `role: "status"` columns for beside it, at most
 * {@link MOBILE_CARD_FIELDS} fields: those marked `mobile: "secondary"` when any is,
 * else the first after the title, and the `role: "actions"` columns, drawn after the
 * fields. An actions column is never the title and never one of the fields, so the
 * fields and the marks leave it on the card; only `mobileHidden` / `mobile: "hidden"`
 * (which keep it out of `columns`) remove it.
 */
export function mobileCardColumns<T>(columns: DataTableColumn<T>[]): {
  primary: DataTableColumn<T> | null;
  status: DataTableColumn<T>[];
  fields: DataTableColumn<T>[];
  actions: DataTableColumn<T>[];
} {
  const titles = columns.filter((c) => c.role !== "actions");
  const primary =
    titles.find((c) => c.mobile === "primary") ??
    titles.find((c) => c.mobilePrimary) ??
    titles.find((c) => c.role !== "status") ??
    titles[0] ??
    null;
  const status = columns.filter((c) => c !== primary && c.role === "status");
  const actions = columns.filter((c) => c.role === "actions");
  const rest = titles.filter((c) => c !== primary && c.role !== "status");
  const marked = rest.filter((c) => c.mobile === "secondary");
  return { primary, status, fields: (marked.length > 0 ? marked : rest).slice(0, MOBILE_CARD_FIELDS), actions };
}

/** A column whose cell keeps its own clicks — `noRowLink`, or `role: "actions"`: no row
 *  link may wrap it, and a card that draws it is not a link itself. */
export function keepsOwnClicks<T>(col: DataTableColumn<T>): boolean {
  return !!col.noRowLink || col.role === "actions";
}

/** The kit's dev switch, as `lib/logger.ts` reads it: a development build, never a
 *  production one, never under vitest. Read per call so a test can switch it on. */
function devWarnings(): boolean {
  return Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;
}

/**
 * A development build's note on the default phone card (0.49 KIT-7): a `noRowLink`
 * column past its three fields. Such a column holds the cell's own controls — a per-row
 * delete, a link — and the card leaves it out with them, so on a phone the action is
 * gone. Never for a `role: "actions"` column, which the card draws after its fields.
 * Read off the declared `columns` (not the ones a person or the width hid), and only
 * while the table lets the card choose: `enabled` is false with a `mobileCard` or
 * `mobileDetailsInRow` (the column is then in the opened row), and a column marked
 * `mobile: "secondary"` means the app chose. Once per table and column key; `name`
 * (the table's `storageKey` or `urlSync` prefix) says which table, else its title
 * column does.
 */
export function useCardColumnWarnings<T>(columns: DataTableColumn<T>[], enabled: boolean, name?: string): void {
  const warned = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!enabled || !devWarnings()) return;
    const phone = columns.filter((c) => !c.mobileHidden && c.mobile !== "hidden");
    if (phone.some((c) => c.mobile === "secondary")) return;
    const { primary, status, fields, actions } = mobileCardColumns(phone);
    const onCard = new Set<DataTableColumn<T> | null>([primary, ...status, ...fields, ...actions]);
    const table = name ? ` "${name}"` : primary ? ` (title column "${primary.key}")` : "";
    warned.current ??= new Set();
    for (const col of phone) {
      if (onCard.has(col) || !col.noRowLink || warned.current.has(col.key)) continue;
      warned.current.add(col.key);
      console.warn(
        `[ui-kit] DataTable${table}: column "${col.key}" (noRowLink) is past the phone card's three fields and ` +
          'leaves the card — give it role: "actions" (drawn after the fields), or move its action to rowActions.',
      );
    }
  }, [columns, enabled, name]);
}

/**
 * Whether a rendered cell shows nothing worth a line (0.49 KIT-7): `null`, `undefined`,
 * a boolean (React draws neither), `""` or blank text, and the formatters' empty value
 * "—" ({@link EMPTY_FORMATTED_VALUE}), and `booleanColumn`'s mark for an unset value.
 * Any other element is never empty here — its output is the component's — so a column
 * whose empty value should drop off the card returns `null` (or "—") from `cell` for it.
 */
export function isEmptyCell(value: ReactNode): boolean {
  if (value === null || value === undefined || typeof value === "boolean") return true;
  if (isValidElement<{ value?: unknown }>(value) && value.type === BooleanMark) return value.props.value == null;
  if (typeof value === "string") {
    const text = value.trim();
    return text === "" || text === EMPTY_FORMATTED_VALUE;
  }
  return false;
}

/** Each column's rendered cell, without the empty ones. */
function filledFields<T>(columns: DataTableColumn<T>[], row: T): { col: DataTableColumn<T>; value: ReactNode }[] {
  return columns.map((col) => ({ col, value: col.cell(row) })).filter(({ value }) => !isEmptyCell(value));
}

/** A status column's value beside the card's title: text in a neutral chip, an element
 *  (the app's own Chip or StatusDot) as it is. */
function StatusChip({ value }: { value: ReactNode }) {
  return typeof value === "string" || typeof value === "number" ? <Chip size="sm">{value}</Chip> : <>{value}</>;
}

// ---------- Phone sort control (keksdose K10) ----------

/**
 * The card list's sort control: a "Sort by" select and a direction button.
 *
 * keksdose K10 (inputs audit 2026-10-02 §5; its aggregated report tables, #258): a
 * table is sorted by its header row and the phone card list has none, so the two
 * decisions the header carries — which column, which direction — were unreachable
 * below the breakpoint. keksdose hand-built this row over its DataTable to answer
 * "who did I pay the most" on the device it was asked on; this is that row, driven by
 * the SAME sort state as the headers (controlled `sorts` included), so turning the
 * phone sideways keeps the order and a sort chosen here is the one the URL and the
 * storage key hold.
 *
 * The rules are the header's: a newly picked column starts in its `firstSort`, the
 * direction button flips the primary sort (secondary ones stay), and "Default order"
 * — the third click of a `"tri"` cycle — is offered only under `"tri"`, since a
 * `"toggle"` table promises it is always ranked by something. The select's label is
 * a real `<label>` beside it, and the button sits outside that label: a click inside
 * a label is forwarded to the control it names, so a nested button would flip AND
 * open the select.
 */
export function MobileSort<T>({
  columns,
  sorts,
  sortCycle,
  compact,
  labels,
  onPick,
  onFlip,
}: {
  columns: DataTableColumn<T>[];
  sorts: SortState[];
  sortCycle: SortCycle;
  compact: boolean;
  labels: DataTableLabels;
  onPick: (key: string | null) => void;
  onFlip: () => void;
}) {
  const selectId = useId();
  const sortLabels: DataTableSortLabels = labels;
  if (columns.length === 0) return null;
  // A persisted or URL sort can name a column with no `sortBy` (or a hidden one): the
  // sort chain drops it, and so does the control rather than claiming it.
  const primary = sorts[0] && columns.some((c) => c.key === sorts[0].key) ? sorts[0] : null;
  const offerDefault = sortCycle === "tri" || primary === null;
  const desc = primary?.dir === "desc";
  return (
    <div
      data-table-mobile-sort=""
      className={cn(
        // At Large the direction button shows its words (IconButton's label, §4); the
        // row wraps so the select keeps a usable width on a 240 px card.
        "flex flex-wrap items-center gap-2 border-b border-subtle",
        compact ? "px-3 py-1.5" : "px-4 py-2",
      )}
    >
      <label htmlFor={selectId} className="shrink-0 text-xs text-muted">
        {sortLabels.sortBy}
      </label>
      <Select
        id={selectId}
        size={compact ? "sm" : "md"}
        className="min-w-0 flex-1 large:basis-40"
        value={primary?.key ?? ""}
        onChange={(e) => onPick(e.target.value || null)}
      >
        {offerDefault && <option value="">{sortLabels.sortDefault}</option>}
        {columns.map((col) => (
          <option key={col.key} value={col.key}>
            {columnLabel(col, labels)}
          </option>
        ))}
      </Select>
      <IconButton
        size={compact ? "xs" : "md"}
        variant="secondary"
        label={desc ? sortLabels.sortDescending : sortLabels.sortAscending}
        disabled={primary === null}
        onClick={onFlip}
      >
        {desc ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
      </IconButton>
    </div>
  );
}

// ---------- Phone card ----------

/** One phone card: what DataTable's card list draws for a row. */
export interface MobileRowProps<T> {
  row: T;
  isExpanded: DataTableProps<T>["isExpanded"];
  /** What the row shows when opened — DataTable's `openedRowContent`. */
  openedRowContent: (row: T) => ReactNode;
  /** Whether an opened row has anything to show at all. */
  opensRow: boolean;
  rowClassName: DataTableProps<T>["rowClassName"];
  rowAttributes: DataTableProps<T>["rowAttributes"];
  onRowClick: DataTableProps<T>["onRowClick"];
  rowHref: DataTableProps<T>["rowHref"];
  /** `mobileSwipeActions`, or the swipes derived from `rowActions`. */
  swipeActionsFor: ((row: T) => MobileSwipeActions | null) | undefined;
  /** The card list's reading direction, for which physical drag a swipe side means. */
  mobileDir: Direction;
  /** No column the card renders owns a link, so the card itself may be one. */
  mobileCardLinkable: boolean;
  /**
   * The card draws cells that keep their own clicks, so it cannot be one control (0.50
   * K4): its TITLE is the row's link (`rowHref`) or button (`onRowClick`), stretched over
   * the card, and those cells sit above it. Only for the default card, never a
   * `mobileCard`, and never when the title itself keeps its own clicks.
   */
  mobileCardStretched: boolean;
  mobileCard: DataTableProps<T>["mobileCard"];
  mobilePrimaryCol: DataTableColumn<T> | null;
  /** The `role: "status"` columns, drawn as chips beside the title (0.49 KIT-7). */
  mobileStatusColumns: DataTableColumn<T>[];
  mobileSecondaryColumns: DataTableColumn<T>[];
  /** The `role: "actions"` columns, drawn after the fields at the card's end (0.49 KIT-7). */
  mobileActionColumns: DataTableColumn<T>[];
  mobileExpandAsDialog: boolean;
  compact: boolean;
  /** The text size is Large or Extra large (§4). */
  large: boolean;
  /** Phone selection (0.40, keksdose live #421); null without DataTable's `selection`. */
  select: MobileRowSelect | null;
}

/** A phone card's part in DataTable's `selection` (0.40, keksdose live #421). */
export interface MobileRowSelect {
  /** The card list is in selection mode: the card shows its box and a tap toggles it. */
  active: boolean;
  /** `selection.isSelectable` for this row. */
  selectable: boolean;
  selected: boolean;
  onToggle: (checked: boolean) => void;
  /** A long press outside the mode: enter it with this row selected. */
  onLongPress: () => void;
}

/** One mobile card. Shared by the flat list and the grouped list, so both draw
 *  identical row markup. */
export function MobileRow<T>({
  row,
  isExpanded,
  openedRowContent,
  opensRow,
  rowClassName,
  rowAttributes,
  onRowClick,
  rowHref,
  swipeActionsFor,
  mobileDir,
  mobileCardLinkable,
  mobileCardStretched,
  mobileCard,
  mobilePrimaryCol,
  mobileStatusColumns,
  mobileSecondaryColumns,
  mobileActionColumns,
  mobileExpandAsDialog,
  compact,
  large,
  select,
}: MobileRowProps<T>) {
  const expanded = isExpanded?.(row) ?? false;
  // Selection mode (#421): the whole card is the row's checkbox — a tap toggles it
  // instead of opening the row, and the swipe and the long press stand down, so no
  // gesture means two things at once (keksdose's register list, its feedback #153).
  const selecting = !!select?.active;
  // Not on an open card, as in kk's register: its editor and a selection are two modes
  // fighting over the same row.
  const pressable = !!select && select.selectable && !selecting && !expanded;
  const longPress = useLongPress(() => select?.onLongPress(), { enabled: pressable });
  const expansion = expanded ? openedRowContent(row) : null;
  const tint = rowClassName?.(row);
  // Use div+role="button" rather than a real <button> so cells that
  // contain their own interactive controls (status toggles, action
  // icons) don't end up as illegal nested buttons.
  const interactive = !!onRowClick;
  // Say that the card OPENS something (Keksdose feedback #163). A phone card had
  // only a cursor and a tap-tint to advertise its editor — on the invoice review
  // screen, whose entire purpose is correcting mis-read lines, that read as "these
  // values are not editable". A chevron is the affordance every list on a phone
  // uses for exactly this, and it points the way the row actually opens: right into
  // a sheet, or down into an inline panel that flips it when expanded.
  const opensDetail = interactive && opensRow;
  const swipeActions = swipeActionsFor?.(row);
  const swipe = swipeActions ? physicalSwipe(swipeActions, mobileDir) : null;
  // An OPEN card swipes too (0.40, keksdose live #416, Marcel: "faster than scrolling
  // down to the buttons"). Only the card's header — the summary line — is inside
  // SwipeableRow; the opened body below is a sibling, so its fields, sliders and
  // scrolling never meet the gesture. Until 0.40 an open card silently lost it.
  // In selection mode a sideways drag would be a second meaning for a selecting touch.
  const swipeEnabled = !!swipe && !selecting;
  // The stretched card (0.50 K4): the title is the control, the card a plain box.
  // Selection mode keeps its own card (the whole card is the toggle there).
  const stretched = mobileCardStretched && interactive && !selecting && !mobileCard && !!mobilePrimaryCol;
  const href = mobileCardLinkable || stretched ? rowHref?.(row) : undefined;
  const cardClass = cn(
    "w-full text-start flex items-center",
    // §4: more room per row at Large — a taller row is a bigger tap target too.
    compact ? "px-3 py-2 gap-2 text-sm large:py-3" : "px-4 py-3 gap-3 large:py-4",
    // Live #320's other half: the card acknowledges the touch before the sheet
    // arrives. On a cold route the data can take a beat, and an unacknowledged tap
    // reads as "did that register?" — which is most of what "abrupt" means here.
    // `origin-center` + a 0.5% squeeze is deliberately almost subliminal: this fires
    // on every row of a long list, so anything larger becomes the list's personality
    // rather than feedback. `transition-transform` alone, so the existing background
    // flip stays instant.
    interactive &&
      "cursor-pointer transition-transform duration-100 active:scale-[0.995] active:bg-active motion-reduce:transition-none motion-reduce:active:scale-100",
    // The keyboard's frame drawn INSIDE the card, as the desktop row's is (keksdose live
    // #394): the browser's own ring and tap highlight sit on the card's outer edge, and
    // three ancestors clip it — SwipeableRow's `overflow-hidden`, the card list, and
    // AppShell main's `overflow-x-clip` — so the frame went missing on one side. A press
    // keeps the fill and the squeeze above; an outline on every tap of a long list would
    // be louder than the acknowledgement it replaces.
    (interactive || selecting) &&
      !stretched &&
      cn("[-webkit-tap-highlight-color:transparent] focus-visible:ring-inset", FOCUS_RING),
    // A stretched card (0.50 K4) draws the same frame, inside the card, while its TITLE
    // control has the keyboard: the ring outlines the whole tap target, as on every other
    // card, not the title's line alone. The own-click cells draw their own.
    stretched && cn("relative [-webkit-tap-highlight-color:transparent]", STRETCHED_RING),
    selecting && "cursor-pointer",
    select?.selected && selecting && "bg-brand-soft",
    // A 500 ms hold would otherwise start a text selection, and iOS's link callout —
    // which only yields to this CSS. The trade kk made on its register: the card's text
    // is not selectable on a phone where the table offers selection.
    select && "select-none [-webkit-touch-callout:none]",
  );
  // The card's content is written once and worn by either tag below. Note that
  // the primary cell is rendered RAW here, never through `linkColumn` — the card
  // itself is the anchor, and routing it through `linkColumn` too would nest an
  // <a> inside an <a>. Desktop and mobile are mutually exclusive (`isMdUp`), so
  // exactly one anchor exists per row.
  // The default card's filled fields and status values (0.49 KIT-7): an empty one
  // gets no line. Not computed for a `mobileCard`, which draws its own.
  // The stretched card's title control (0.50 K4): the row's link, or a real <button>
  // when the table only has `onRowClick` — a plain control, since nothing interactive
  // sits inside it any more. Its `::after` covers the whole card, so a tap anywhere
  // but on an own-click cell (lifted above it) lands on it, and a long press on the
  // card is a long press on the link ("open in new tab"). Its accessible name is the
  // title alone; the fields read as text after it. `data-row-link` marks it as the
  // row itself for `fromOwnControl`, so the long press still arms on it.
  const stretchedClass =
    "block w-full text-start focus-visible:outline-none after:absolute after:inset-0 after:z-[1] after:content-['']";
  const titleControl = (title: ReactNode) =>
    href ? (
      <RowLink
        href={href}
        data-card-link=""
        data-row-link=""
        onActivate={() => onRowClick!(row)}
        aria-expanded={opensRow ? expanded : undefined}
        className={stretchedClass}
        // Enter follows RowLink's own onClick; Space opens the row too, not the list's scroll.
        onKeyDown={(e) => {
          if (e.key !== " ") return;
          e.preventDefault();
          onRowClick!(row);
        }}
      >
        {title}
      </RowLink>
    ) : (
      <button
        type="button"
        data-card-link=""
        data-row-link=""
        aria-expanded={opensRow ? expanded : undefined}
        onClick={() => onRowClick!(row)}
        className={cn(stretchedClass, "font-[inherit]")}
      >
        {title}
      </button>
    );
  const fields = mobileCard ? [] : filledFields(mobileSecondaryColumns, row);
  const statuses = mobileCard ? [] : filledFields(mobileStatusColumns, row);
  const actionCells = mobileCard ? [] : filledFields(mobileActionColumns, row);
  const cardInner = (
    <>
      {/* The card's own content keeps the column it always had; the chevron sits
          beside it rather than inside, so a caller's `mobileCard` is untouched. */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          compact ? "gap-1 large:gap-2" : "gap-2 large:gap-3",
          // §4 "nothing truncates": at Large a cell's own `truncate` wraps instead —
          // the reader who chose bigger type is the one an ellipsis fails. A caller's
          // `mobileCard` is its own layout and keeps what it chose.
          !mobileCard && CARD_NO_TRUNCATE,
        )}
      >
        {mobileCard ? (
          mobileCard(row)
        ) : (
          <>
            {/* Only the `data-*` half of `cellProps` — see its note. The title row
                carries the status chips at its end (0.49 KIT-7). */}
            {(mobilePrimaryCol || statuses.length > 0) && (
              <div data-card-head="" className="flex min-w-0 items-start justify-between gap-2">
                {mobilePrimaryCol && (
                  <div
                    {...dataAttrsOf(mobilePrimaryCol.cellProps?.(row))}
                    data-card-title=""
                    className="min-w-0 flex-1 break-words font-medium"
                  >
                    {stretched ? titleControl(mobilePrimaryCol.cell(row)) : mobilePrimaryCol.cell(row)}
                  </div>
                )}
                {statuses.length > 0 && (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    {statuses.map(({ col, value }) => (
                      <span key={col.key} {...dataAttrsOf(col.cellProps?.(row))} data-card-status="" className="inline-flex">
                        <StatusChip value={value} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {fields.length > 0 && large ? (
              // §4: each label ABOVE its value at Large. Side by side, a label column
              // sized to the widest label leaves a value a sliver of a 240 px card.
              <StackedFields columns={mobileSecondaryColumns} row={row} compact={compact} liftOwnClicks={stretched} />
            ) : fields.length > 0 && (
              <dl
                className={cn(
                  "grid grid-cols-[auto_1fr] gap-x-3",
                  compact ? "gap-y-0.5 text-xs" : "gap-y-1 text-sm",
                )}
              >
                {fields.map(({ col, value }) => (
                  <Fragment key={col.key}>
                    <dt className="text-xs uppercase tracking-wide text-muted self-center">
                      {col.header}
                    </dt>
                    <dd
                      {...dataAttrsOf(col.cellProps?.(row))}
                      className={cn("min-w-0 text-secondary self-center", stretched && keepsOwnClicks(col) && LIFTED_FIELD)}
                    >
                      {value}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            )}
            {/* The row's actions after the fields, at the card's end (0.49 KIT-7): its
                buttons keep their own clicks, and RowActions folds into "⋯" at Large. */}
            {actionCells.length > 0 && (
              <div data-card-actions="" className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {actionCells.map(({ col, value }) => (
                  <div
                    key={col.key}
                    {...dataAttrsOf(col.cellProps?.(row))}
                    className={cn("flex min-w-0 justify-end", stretched && LIFTED_CELL)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {opensDetail && !selecting &&
        // `aria-hidden`: the row already announces itself as a button with
        // `aria-expanded`, so the icon would only add a second, wordless stop.
        (mobileExpandAsDialog ? (
          // Points INTO the sheet, which is the reading-forward direction.
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-placeholder rtl:-scale-x-100"
          />
        ) : (
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-placeholder transition-transform",
              expanded && "rotate-180",
            )}
          />
        ))}
    </>
  );
  // The long press rides the card itself; the click it leaves behind is swallowed on
  // the `<li>` below, in the capture phase, before the card (or RowLink) sees it.
  // Attached whenever the table selects, the hook's `enabled` deciding whether a press
  // arms: its pointerdown also clears a stale swallow latch, which must happen in the
  // mode too, or a long press whose click never came would eat the first toggle.
  //
  // A press that starts on a control in a cell (or in a portal one opened) is that
  // control's, not a way into the mode (keksdose live #428): it only clears the latch.
  const press = select
    ? {
        ...longPress.handlers,
        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
          if (fromOutside(e.target, e.currentTarget) || fromOwnControl(e.target, e.currentTarget)) {
            longPress.consumeClick();
            return;
          }
          longPress.handlers.onPointerDown(e);
        },
        onContextMenu: (e: ReactMouseEvent<HTMLElement>) => {
          if (fromOutside(e.target, e.currentTarget) || fromOwnControl(e.target, e.currentTarget)) return;
          longPress.handlers.onContextMenu(e);
        },
      }
    : undefined;
  const body = selecting ? (
    // In the mode a card is a toggle — kk's register row: `role="button"` with
    // `aria-pressed`, the box beside it only a picture of that state (the card is the
    // one control, so the two can never fight or fire twice).
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- role="button",
       tabIndex 0 and Enter/Space are all here; the rule cannot follow the conditional role. */
    <div
      role={select!.selectable ? "button" : undefined}
      tabIndex={select!.selectable ? 0 : undefined}
      aria-pressed={select!.selectable ? select!.selected : undefined}
      aria-disabled={select!.selectable ? undefined : true}
      data-card-selecting=""
      {...press}
      onClick={(e) => {
        if (!select!.selectable || fromOutside(e.target, e.currentTarget)) return;
        // A tap on a control in a cell is that control's (keksdose live #428).
        if (fromOwnControl(e.target, e.currentTarget)) return;
        select!.onToggle(!select!.selected);
      }}
      onKeyDown={(e) => {
        if (!select!.selectable || e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select!.onToggle(!select!.selected);
        }
      }}
      className={cardClass}
    >
      <Checkbox
        readOnly
        tabIndex={-1}
        aria-hidden
        checked={select!.selected}
        disabled={!select!.selectable}
        className="pointer-events-none shrink-0 self-center"
        inputClassName="pointer-events-none"
      />
      {cardInner}
    </div>
  ) : stretched ? (
    // The stretched card (0.50 K4): a plain box; its title is the control (above).
    <div {...press} data-card-stretched="" className={cardClass}>
      {cardInner}
    </div>
  ) : interactive && href ? (
      // A card with a URL of its own is a LINK, not a div wearing role="button"
      // (feedback #451): the phone's long-press "open in new tab" and a screen
      // reader's link semantics both come free, and the fake role goes away.
      <RowLink
        href={href}
        {...press}
        onActivate={() => onRowClick!(row)}
        aria-expanded={opensRow ? expanded : undefined}
        className={cardClass}
        // Enter already activates a link natively, and that routes through
        // RowLink's own onClick — handling it here too would open the row twice.
        // Space is the only key left, and only so it opens the row instead of
        // scrolling the list.
        onKeyDown={(e) => {
          if (e.key !== " ") return;
          e.preventDefault();
          onRowClick!(row);
        }}
      >
        {cardInner}
      </RowLink>
    ) : (
      /* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the handlers are
         only attached when `interactive`, and then so are role="button", tabIndex 0 and the
         Enter/Space handler below; the rule cannot follow the conditional role. */
      <div
        {...press}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={
          interactive
            ? (e) => {
                if (fromOutside(e.target, e.currentTarget)) return;
                // A tap on a control in a cell (a select, a button) is that
                // control's, as on the desktop `<tr>` (keksdose live #428).
                if (fromOwnControl(e.target, e.currentTarget)) return;
                onRowClick!(row);
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (e) => {
                // A key press inside a nested control is that control's.
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick!(row);
                }
              }
            : undefined
        }
        aria-expanded={opensRow ? expanded : undefined}
        className={cardClass}
      >
        {cardInner}
      </div>
    );
  return (
    <li
      className={cn(tint)}
      {...cleanAttrs(rowAttributes?.(row))}
      data-selected={selecting && select!.selected ? "" : undefined}
      onClickCapture={
        select
          ? (e) => {
              if (!longPress.consumeClick()) return;
              e.preventDefault();
              e.stopPropagation();
            }
          : undefined
      }
    >
      {swipeEnabled ? (
        <SwipeableRow enabled left={swipe!.left} right={swipe!.right}>
          {body}
        </SwipeableRow>
      ) : (
        body
      )}
      {expansion && !mobileExpandAsDialog && (
        <div
          className={cn(
            "bg-surface-2 border-t border-subtle",
            compact ? "px-3 py-2" : "px-4 py-3",
          )}
        >
          {expansion}
        </div>
      )}
    </li>
  );
}

// ---------- Phone selection bar (0.40, keksdose live #421) ----------

/**
 * The card list's way into and out of selection mode for a keyboard and a screen
 * reader — the long press is a touch gesture, and a gesture alone is no path at all.
 *
 * Outside the mode it is one button, "Select rows", visually hidden until it takes
 * focus (SwipeableRow's keyboard buttons, the same rule): the card list keeps the look
 * kk's register has, where the long press is the way in, and Tab or a screen reader's
 * cursor still finds it. In the mode it is a visible row: "Select all rows" — the
 * desktop header's box — and Cancel, which clears the selection and leaves, as the
 * bulk bar's Clear does. The owner's bulk bar is the owner's, as on desktop: it
 * appears because the selection is no longer empty.
 */
export function MobileSelectBar({
  active,
  allSelected,
  someSelected,
  compact,
  labels,
  onEnter,
  onToggleAll,
  onCancel,
}: {
  active: boolean;
  allSelected: boolean;
  someSelected: boolean;
  compact: boolean;
  labels: DataTableLabels;
  onEnter: () => void;
  onToggleAll: (checked: boolean) => void;
  onCancel: () => void;
}) {
  // The control that was pressed unmounts with the mode it switched, so focus is
  // handed across: into the bar's box on the way in, back to the button on the way out.
  const handOff = useRef(false);
  const allBox = useRef<HTMLInputElement>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!handOff.current) return;
    handOff.current = false;
    (active ? allBox.current : enterButton.current)?.focus();
  }, [active]);
  if (!active)
    return (
      <button
        ref={enterButton}
        type="button"
        data-table-mobile-select=""
        onClick={() => {
          handOff.current = true;
          onEnter();
        }}
        className={cn(
          "sr-only rounded-md text-sm font-medium text-secondary",
          // Padding only once shown: unconditional, it beats sr-only's `padding: 0`
          // (SwipeableRow's 0.32.1 note).
          "focus:not-sr-only focus:m-2 focus:inline-flex focus:px-2 focus:py-1",
          FOCUS_RING,
        )}
      >
        {labels.selectRows}
      </button>
    );
  return (
    <div
      data-table-mobile-select=""
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-subtle",
        compact ? "px-3 py-1.5" : "px-4 py-2",
      )}
    >
      <Checkbox
        ref={allBox}
        label={labels.selectAllRows}
        checked={allSelected}
        indeterminate={someSelected && !allSelected}
        onChange={(e) => onToggleAll(e.target.checked)}
      />
      <button
        type="button"
        onClick={() => {
          handOff.current = true;
          onCancel();
        }}
        className={cn("rounded-md px-2 py-1 text-sm text-muted hover:text-secondary", FOCUS_RING)}
      >
        {labels.cancelSelection}
      </button>
    </div>
  );
}

// ---------- Mobile filter sheet ----------

/**
 * Filter access for the mobile card list (feedback #299). The desktop table
 * houses per-column filters in its header; the card list has no header, so the
 * same filters were unreachable on phones. This renders a compact "Filters" bar
 * that opens a bottom sheet listing each filterable column as a collapsible
 * section, reusing the very same {@link FilterPopover} and filter state the
 * desktop table drives — so it filters identically and stays URL-synced.
 *
 * The sheet is a {@link DialogFrame} (round 0.34 BUG-7b = DUP-6). It was the last
 * hand-rolled modal in the kit: `role="dialog" aria-modal="true"` on the backdrop, with
 * copies of the scroll lock, the backdrop close and the Back entry — and no name, no
 * focus moved in, no trap and no Escape, so a reader was told the page was hidden while
 * focus stayed on it. On a phone `Modal` is a bottom sheet already; it now brings all
 * of that, and the exit motion, from the one place every other dialog gets it.
 */
export function MobileFilters<T>({
  columns,
  filters,
  selectOptionsByKey,
  isServer,
  hasFilterCallback,
  onSetFilter,
  onClearFilter,
  onClearAll,
  labels,
  locale,
}: {
  columns: DataTableColumn<T>[];
  filters: FilterState;
  selectOptionsByKey: Record<string, { value: string; label: string }[]>;
  isServer: boolean;
  hasFilterCallback: boolean;
  onSetFilter: (key: string, value: FilterValue) => void;
  onClearFilter: (key: string) => void;
  onClearAll: () => void;
  labels: DataTableLabels;
  locale?: string;
}) {
  const [open, setOpen] = useState(false);
  // The sheet is portalled to <body>, out from under whatever `dir` the table sits
  // in, so it carries the trigger's direction with it — read at the moment of opening,
  // from the element the user actually pressed.
  const [dir, setDir] = useState<Direction>("ltr");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filterable = useMemo(
    () =>
      columns
        .map((col) => ({ col, filter: !isServer || hasFilterCallback ? resolveFilter(col) : null }))
        .filter((x): x is { col: DataTableColumn<T>; filter: ColumnFilter<T> } => !!x.filter),
    [columns, isServer, hasFilterCallback],
  );

  if (filterable.length === 0) return null;

  const activeCount = filterable.filter(({ col }) => {
    const s = filters[col.key];
    return s && isFilterActive(s);
  }).length;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-subtle px-4 py-2">
      <button
        type="button"
        onClick={(e) => {
          setDir(dirOf(e.currentTarget));
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-secondary hover:bg-hover"
      >
        <Filter className="size-4" />
        <span>{labels.filters}</span>
        {activeCount > 0 && (
          <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-info-soft px-1 text-caption font-semibold text-info">
            {activeCount}
          </span>
        )}
      </button>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted hover:text-secondary"
        >
          {labels.clearAll}
        </button>
      )}
      {/* Escape, the backdrop, Back (Keksdose feedback #172: the filters are already
          in the URL, so closing never loses anything), the scroll lock, focus in and
          back to this bar's button — all `Modal`'s. `fullBleed` lets the sheet meet the
          screen's edges on a phone, as it always did. */}
      <DialogFrame
        open={open}
        onClose={() => setOpen(false)}
        title={labels.filters}
        closeButton
        closeLabel={labels.close}
        headerDivider
        fullBleed
        // Portalled to <body>, so the direction read from the button goes with it.
        dir={dir}
        className="max-h-[85vh] rounded-b-none md:rounded-b-lg"
        // The sections run edge to edge with a rule between them, as before.
        bodyClassName="space-y-0 divide-y divide-subtle px-0 pt-0 pb-0"
        actions={(close) => (
          <>
            <button
              type="button"
              onClick={onClearAll}
              disabled={activeCount === 0}
              // `me-auto` keeps Clear all at the start and Done at the end.
              className="me-auto text-sm text-muted hover:text-secondary disabled:opacity-40"
            >
              {labels.clearAll}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-md bg-inverse px-4 py-2 text-sm font-medium text-inverse"
            >
              {labels.done}
            </button>
          </>
        )}
      >
        {filterable.map(({ col, filter }) => {
          const state = filters[col.key];
          const active = !!state && isFilterActive(state);
          const isItemOpen = expanded === col.key;
          return (
            <div key={col.key}>
              <button
                type="button"
                onClick={() => setExpanded(isItemOpen ? null : col.key)}
                aria-expanded={isItemOpen}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-secondary">
                  {col.header}
                  {active && <span className="size-1.5 rounded-full bg-brand" />}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-placeholder transition-transform",
                    isItemOpen && "rotate-180",
                  )}
                />
              </button>
              {isItemOpen && (
                <div className="px-4 pb-3">
                  <FilterPopover
                    column={col}
                    state={state ?? defaultFilterState(filter)}
                    onChange={(next) => onSetFilter(col.key, next)}
                    onClear={() => onClearFilter(col.key)}
                    selectOptions={selectOptionsByKey[col.key] ?? []}
                    labels={labels}
                    locale={locale}
                  />
                </div>
              )}
            </div>
          );
        })}
      </DialogFrame>
    </div>
  );
}
