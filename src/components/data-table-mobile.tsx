import { Fragment, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
import type { DataTableLabels } from "./data-table-labels";
import { RowLink, cleanAttrs, columnLabel, fromOutside } from "./data-table-shared";
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
export function StackedFields<T>({ columns, row, compact }: { columns: DataTableColumn<T>[]; row: T; compact: boolean }) {
  return (
    <dl
      data-card-fields="stacked"
      className={cn("relative flex min-w-0 flex-col", compact ? "gap-1.5 text-xs" : "gap-2.5 text-sm", CARD_NO_TRUNCATE)}
    >
      {columns.map((col) => (
        <div key={col.key} className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-muted">{col.header}</dt>
          <dd
            {...dataAttrsOf(col.cellProps?.(row))}
            className="mt-0.5 min-w-0 break-words text-secondary"
          >
            {col.cell(row)}
          </dd>
        </div>
      ))}
    </dl>
  );
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
  mobileCard: DataTableProps<T>["mobileCard"];
  mobilePrimaryCol: DataTableColumn<T> | null;
  mobileSecondaryColumns: DataTableColumn<T>[];
  mobileExpandAsDialog: boolean;
  compact: boolean;
  /** The text size is Large or Extra large (§4). */
  large: boolean;
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
  mobileCard,
  mobilePrimaryCol,
  mobileSecondaryColumns,
  mobileExpandAsDialog,
  compact,
  large,
}: MobileRowProps<T>) {
  const expanded = isExpanded?.(row) ?? false;
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
  // An expanded row never swipes: the editor below it owns the horizontal space,
  // and dragging the header away from its own form reads as a glitch.
  const swipeEnabled = !!swipe && !expanded;
  const href = mobileCardLinkable ? rowHref?.(row) : undefined;
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
    interactive && cn("[-webkit-tap-highlight-color:transparent] focus-visible:ring-inset", FOCUS_RING),
  );
  // The card's content is written once and worn by either tag below. Note that
  // the primary cell is rendered RAW here, never through `linkColumn` — the card
  // itself is the anchor, and routing it through `linkColumn` too would nest an
  // <a> inside an <a>. Desktop and mobile are mutually exclusive (`isMdUp`), so
  // exactly one anchor exists per row.
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
            {/* Only the `data-*` half of `cellProps` — see its note. */}
            {mobilePrimaryCol && (
              <div {...dataAttrsOf(mobilePrimaryCol.cellProps?.(row))} className="min-w-0 break-words font-medium">
                {mobilePrimaryCol.cell(row)}
              </div>
            )}
            {mobileSecondaryColumns.length > 0 && large ? (
              // §4: each label ABOVE its value at Large. Side by side, a label column
              // sized to the widest label leaves a value a sliver of a 240 px card.
              <StackedFields columns={mobileSecondaryColumns} row={row} compact={compact} />
            ) : mobileSecondaryColumns.length > 0 && (
              <dl
                className={cn(
                  "grid grid-cols-[auto_1fr] gap-x-3",
                  compact ? "gap-y-0.5 text-xs" : "gap-y-1 text-sm",
                )}
              >
                {mobileSecondaryColumns.map((col) => (
                  <Fragment key={col.key}>
                    <dt className="text-xs uppercase tracking-wide text-muted self-center">
                      {col.header}
                    </dt>
                    <dd
                      {...dataAttrsOf(col.cellProps?.(row))}
                      className="min-w-0 text-secondary self-center"
                    >
                      {col.cell(row)}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            )}
          </>
        )}
      </div>
      {opensDetail &&
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
  const body =
    interactive && href ? (
      // A card with a URL of its own is a LINK, not a div wearing role="button"
      // (feedback #451): the phone's long-press "open in new tab" and a screen
      // reader's link semantics both come free, and the fake role goes away.
      <RowLink
        href={href}
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
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={
          interactive
            ? (e) => {
                if (fromOutside(e.target, e.currentTarget)) return;
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
    <li className={cn(tint)} {...cleanAttrs(rowAttributes?.(row))}>
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
