import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";
import { FieldHint } from "./ui";

export type DescriptionListLayout = "rows" | "cards" | "stacked";
export type DescriptionListDensity = "comfortable" | "compact" | "tight";
/** How many columns a `stacked` or `cards` list may use. */
export type DescriptionListColumns = 1 | 2 | 3 | 4 | 5 | 6;

interface ListContextValue {
  layout: DescriptionListLayout;
  numeric: boolean;
  prose: boolean;
  density: DescriptionListDensity;
  columns: DescriptionListColumns;
}

const ListContext = createContext<ListContextValue>({
  layout: "rows",
  numeric: false,
  prose: false,
  density: "comfortable",
  columns: 2,
});

/**
 * `stacked` columns, by the width of the LIST (a container query on a wrapper — the
 * `<dl>` is the grid and cannot query itself). One column on a phone-narrow pane, two
 * from 20rem, then one more column each time every column would still get ~12rem.
 * The same shape as kastlan's DetailGrid (1 → 2 at `sm` → n at `md`), measured on the
 * pane rather than the viewport, so the four preview dialogs and a full-width detail
 * page can share one list. Literal strings, because Tailwind only emits what it reads.
 */
const STACKED_COLS: Record<DescriptionListColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 @xs:grid-cols-2",
  3: "grid-cols-1 @xs:grid-cols-2 @xl:grid-cols-3",
  4: "grid-cols-1 @xs:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4",
  5: "grid-cols-1 @xs:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5",
  6: "grid-cols-1 @xs:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5 @6xl:grid-cols-6",
};

/** An item's span at each of those thresholds, never more columns than exist there —
 *  so a span can never open an implicit column and push the grid past its pane. */
const STACKED_SPAN: Record<DescriptionListColumns, string> = {
  1: "",
  2: "@xs:col-span-2",
  3: "@xs:col-span-2 @xl:col-span-3",
  4: "@xs:col-span-2 @xl:col-span-3 @3xl:col-span-4",
  5: "@xs:col-span-2 @xl:col-span-3 @3xl:col-span-4 @5xl:col-span-5",
  6: "@xs:col-span-2 @xl:col-span-3 @3xl:col-span-4 @5xl:col-span-5 @6xl:col-span-6",
};

/** The cards grid's gap per density, as a class and as the length the column formula
 *  subtracts — one table so the two cannot disagree. */
const CARD_GAP: Record<DescriptionListDensity, { cls: string; len: string }> = {
  comfortable: { cls: "gap-3", len: "0.75rem" },
  compact: { cls: "gap-2", len: "0.5rem" },
  tight: { cls: "gap-1", len: "0.25rem" },
};

export interface DescriptionListProps extends ComponentPropsWithoutRef<"dl"> {
  /**
   * `rows` (default): term beside detail, a two-column list that stacks the pair
   * when the LIST is narrower than 24rem — a container query, so a detail panel
   * beside a sidebar stacks where it is actually cramped, not where the viewport is.
   * `cards`: a grid of small bordered cards, term above body — keksdose's overview
   * figures, lenkbank's account facts.
   * `stacked` (0.10.0): a borderless grid, term ABOVE detail, {@link columns} wide —
   * kastlan's DetailField/DetailGrid and the label-over-value grids of its lease,
   * invoice, contact and unit preview dialogs. Items can {@link DescriptionItemProps.span}
   * several columns (a notes field across the whole row).
   */
  layout?: DescriptionListLayout;
  /** Every detail is a figure: tabular digits, end-aligned. A `numeric` list of
   *  rows does not stack on a phone — a figure is short, and putting it under its
   *  term would double the list's height to gain no width. Per item: see
   *  {@link DescriptionItemProps.numeric}. */
  numeric?: boolean;
  /** `compact` tightens the rhythm for a dense side panel. `tight` (0.10.0) is 11px
   *  type on a 2px rhythm with no rules between rows — keksdose's admin metrics
   *  breakdowns (metrics-panel's label-left, count-right lists), which are read as a
   *  block of small print, not scanned row by row. */
  density?: DescriptionListDensity;
  /** `cards` only: the narrowest a card may get before the grid drops a column. */
  minCardWidth?: string;
  /**
   * `stacked`: how many columns the grid grows to on a wide pane (default 2), see
   * {@link STACKED_COLS}. `cards` (0.10.0): the MOST cards per row; the grid still
   * drops columns below {@link minCardWidth}. keksdose's category editor faked "two
   * side by side" with `minCardWidth="calc(50% - 0.5rem)"`, which is `columns={2}
   * minCardWidth="0"` now, without knowing the gap. Ignored by `rows`.
   */
  columns?: DescriptionListColumns;
  /**
   * The details are sentences, not values: regular weight in the secondary ink.
   * lenkbank's control explainer cards each carry a paragraph, and at the card's
   * `font-medium` primary ink a grid of paragraphs reads as a wall of headings — it
   * spelled `font-normal text-slate-700` into every item. A flag rather than a new
   * default because every other card list in the apps holds values (dates, figures,
   * counts) that are not flagged `numeric` and ARE meant to stand out; lightening them
   * all would not be an improvement. Per item: {@link DescriptionItemProps.prose}.
   */
  prose?: boolean;
}

/**
 * A real `<dl>` — terms and their details, which is what keksdose's eight and
 * lenkbank's four hand-built "label: value" blocks were, and none of them said so.
 * As a `<dl>` a reader announces "list, 6 items" and pairs each term with its detail;
 * as a stack of `<div>`s it read one undifferentiated run of text.
 *
 * Composed from {@link DescriptionItem} children rather than taking an `items`
 * array. The call sites this replaces are mostly CONDITIONAL — "IBAN, if there is
 * one", "closing date, once closed" — and `{iban && <DescriptionItem …>}` reads as
 * what it means, where an array wants `.filter(Boolean)` and a cast. Children also
 * give each item its own props (a numeric figure in an otherwise textual list, a
 * `data-private` detail) with no parallel config object. A data-driven list loses
 * nothing: `items.map((i) => <DescriptionItem key={i.term} {...i} />)`.
 *
 * Each pair is wrapped in a `<div>`, which HTML permits inside a `<dl>` for exactly
 * this: styling a pair as a unit (a row, a card) without breaking the list.
 */
export function DescriptionList({
  layout = "rows",
  numeric = false,
  prose = false,
  density = "comfortable",
  minCardWidth = "10rem",
  columns,
  className,
  style,
  ...rest
}: DescriptionListProps) {
  const cards = layout === "cards";
  const stacked = layout === "stacked";
  const gap = CARD_GAP[density];
  // Cards: auto-fill at `minCardWidth`, and with `columns` a floor on the track of one
  // n-th of the row (less the gaps) — so auto-fill can never fit more than n. The
  // outer `min(100%, …)` keeps a single card from overflowing a pane narrower than
  // its minimum.
  const track =
    columns !== undefined
      ? `max(${minCardWidth}, (100% - ${columns - 1} * ${gap.len}) / ${columns})`
      : minCardWidth;
  const grid: CSSProperties | undefined = cards
    ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${track}), 1fr))` }
    : undefined;
  const ctx: ListContextValue = { layout, numeric, prose, density, columns: columns ?? 2 };
  const text = density === "tight" ? "text-[11px] leading-4" : density === "compact" ? "text-xs" : "text-sm";

  if (stacked) {
    return (
      <ListContext.Provider value={ctx}>
        {/* The container the columns are measured on — see STACKED_COLS. */}
        <div className="@container">
          <dl
            {...rest}
            data-layout={layout}
            style={style}
            className={cn(
              "grid",
              STACKED_COLS[ctx.columns],
              density === "tight" ? "gap-x-3 gap-y-1" : density === "compact" ? "gap-x-4 gap-y-2" : "gap-x-6 gap-y-4",
              text,
              className,
            )}
          />
        </div>
      </ListContext.Provider>
    );
  }

  return (
    <ListContext.Provider value={ctx}>
      <dl
        {...rest}
        data-layout={layout}
        style={grid ? { ...grid, ...style } : style}
        className={cn(
          cards
            ? cn("grid", gap.cls)
            : // Tight rows carry no rules: at a 2px rhythm a line under every row
              // turns a block of small print into a ruled table.
              cn("@container", density !== "tight" && "divide-y divide-[var(--border)]"),
          text,
          className,
        )}
      />
    </ListContext.Provider>
  );
}

export interface DescriptionItemProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** What is described: "Opened", "IBAN", "Net rent". */
  term: ReactNode;
  /** The description itself. */
  children?: ReactNode;
  /** The explanation behind a "?" beside the term (a {@link FieldHint}) — the same
   *  meaning `hint` has on `StatTile` and the labelled fields. */
  hint?: string;
  /** This detail is a figure (see {@link DescriptionListProps.numeric}); overrides
   *  the list's setting either way. */
  numeric?: boolean;
  /** Classes for the `<dd>`. */
  detailClassName?: string;
  /** This detail is prose (see {@link DescriptionListProps.prose}); overrides the
   *  list's setting either way. */
  prose?: boolean;
  /**
   * `stacked`: how many columns this item spans, clamped to the list's `columns` and
   * to however many the pane has room for; `"full"` is the whole row. kastlan's
   * DetailField `span={2}` for notes and descriptions. `cards`: only `"full"` applies,
   * because a card grid's column count is not known to CSS ahead of layout.
   */
  span?: number | "full";
}

const ROW_PAD: Record<DescriptionListDensity, string> = {
  comfortable: "py-2.5",
  compact: "py-1.5",
  tight: "py-px",
};
const CARD_PAD: Record<DescriptionListDensity, string> = {
  comfortable: "px-3 py-2.5",
  compact: "px-2.5 py-1.5",
  tight: "px-2 py-1",
};

/** One term and its detail inside a {@link DescriptionList}. */
export function DescriptionItem({
  term,
  children,
  hint,
  numeric: numericProp,
  prose: proseProp,
  span,
  detailClassName,
  className,
  ...rest
}: DescriptionItemProps) {
  const { layout, numeric: listNumeric, prose: listProse, density, columns } = useContext(ListContext);
  const numeric = numericProp ?? listNumeric;
  const prose = proseProp ?? listProse;
  const cards = layout === "cards";
  const stacked = layout === "stacked";
  const spanClass =
    span === "full"
      ? "col-span-full"
      : stacked && span !== undefined && span > 1
        ? STACKED_SPAN[Math.min(Math.floor(span), columns) as DescriptionListColumns]
        : undefined;

  const termNode = (
    <dt
      className={cn(
        "flex min-w-0 items-center gap-1 text-[var(--text-muted)]",
        cards && (density === "tight" ? "text-[10px] uppercase tracking-wide" : "text-xs uppercase tracking-wide"),
        // Stacked terms are a step smaller than the detail, as kastlan's dialogs set
        // them; in a list that is already small they stay the list's own size.
        stacked && density === "comfortable" && "text-xs",
      )}
    >
      <span className="min-w-0 break-words">{term}</span>
      {hint && <FieldHint label={hint} side="top" className="shrink-0" />}
    </dt>
  );
  const detail = (
    <dd
      className={cn(
        "min-w-0 break-words text-[var(--text-primary)]",
        // A stacked figure sits under its term, so it keeps the term's start edge.
        numeric && (stacked ? "tabular-nums" : "tabular-nums text-end"),
        (cards || stacked) && "mt-0.5 font-medium",
        prose && "font-normal text-[var(--text-secondary)]",
        detailClassName,
      )}
    >
      {children}
    </dd>
  );

  if (cards) {
    return (
      <div
        {...rest}
        className={cn(
          "min-w-0 rounded-md border border-[var(--border)] bg-[var(--bg-surface)]",
          CARD_PAD[density],
          spanClass,
          className,
        )}
      >
        {termNode}
        {detail}
      </div>
    );
  }

  if (stacked) {
    return (
      <div {...rest} className={cn("min-w-0", spanClass, className)}>
        {termNode}
        {detail}
      </div>
    );
  }

  return (
    <div
      {...rest}
      className={cn(
        "grid gap-x-4 gap-y-0.5",
        numeric
          ? // Never stacks: a figure is short (see DescriptionListProps.numeric).
            "grid-cols-[minmax(0,1fr)_auto] items-baseline"
          : "grid-cols-1 @sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @sm:items-baseline",
        ROW_PAD[density],
        className,
      )}
    >
      {termNode}
      {detail}
    </div>
  );
}
