import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";
import { FieldHint } from "./ui";

export type DescriptionListLayout = "rows" | "cards";
export type DescriptionListDensity = "comfortable" | "compact";

interface ListContextValue {
  layout: DescriptionListLayout;
  numeric: boolean;
  density: DescriptionListDensity;
}

const ListContext = createContext<ListContextValue>({ layout: "rows", numeric: false, density: "comfortable" });

export interface DescriptionListProps extends ComponentPropsWithoutRef<"dl"> {
  /**
   * `rows` (default): term beside detail, a two-column list that stacks the pair
   * when the LIST is narrower than 24rem — a container query, so a detail panel
   * beside a sidebar stacks where it is actually cramped, not where the viewport is.
   * `cards`: a grid of small bordered cards, term above body — keksdose's overview
   * figures, lenkbank's account facts.
   */
  layout?: DescriptionListLayout;
  /** Every detail is a figure: tabular digits, end-aligned. A `numeric` list of
   *  rows does not stack on a phone — a figure is short, and putting it under its
   *  term would double the list's height to gain no width. Per item: see
   *  {@link DescriptionItemProps.numeric}. */
  numeric?: boolean;
  /** `compact` tightens the rhythm for a dense side panel. */
  density?: DescriptionListDensity;
  /** `cards` only: the narrowest a card may get before the grid drops a column. */
  minCardWidth?: string;
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
  density = "comfortable",
  minCardWidth = "10rem",
  className,
  style,
  ...rest
}: DescriptionListProps) {
  const cards = layout === "cards";
  const grid: CSSProperties | undefined = cards
    ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minCardWidth}), 1fr))` }
    : undefined;
  return (
    <ListContext.Provider value={{ layout, numeric, density }}>
      <dl
        {...rest}
        data-layout={layout}
        style={grid ? { ...grid, ...style } : style}
        className={cn(
          cards
            ? cn("grid", density === "compact" ? "gap-2" : "gap-3")
            : "@container divide-y divide-[var(--border)]",
          density === "compact" ? "text-xs" : "text-sm",
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
}

const ROW_PAD: Record<DescriptionListDensity, string> = { comfortable: "py-2.5", compact: "py-1.5" };
const CARD_PAD: Record<DescriptionListDensity, string> = { comfortable: "px-3 py-2.5", compact: "px-2.5 py-1.5" };

/** One term and its detail inside a {@link DescriptionList}. */
export function DescriptionItem({
  term,
  children,
  hint,
  numeric: numericProp,
  detailClassName,
  className,
  ...rest
}: DescriptionItemProps) {
  const { layout, numeric: listNumeric, density } = useContext(ListContext);
  const numeric = numericProp ?? listNumeric;
  const cards = layout === "cards";

  const termNode = (
    <dt
      className={cn(
        "flex min-w-0 items-center gap-1 text-[var(--text-muted)]",
        cards && "text-xs uppercase tracking-wide",
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
        numeric && "tabular-nums text-end",
        cards && "mt-0.5 font-medium",
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
          className,
        )}
      >
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
