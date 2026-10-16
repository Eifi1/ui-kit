import type { ComponentPropsWithRef } from "react";
import { cn } from "../lib/cn";

/**
 * The list page's fill, for an element between AppShell's `<main>` and a `fillHeight`
 * DataTable (0.40, docs/page-layout-harmonization.md §1.3): from `md` up, a flex column
 * that takes the rest of its parent — only while such a table is inside
 * (`has-[[data-fill-height]]`, the marker the table sets). Below `md`, and around
 * anything else, nothing: so a shell column may carry it for every route.
 *
 * No `min-h-0`, on purpose: a flex item's automatic minimum is its content's, and that
 * content counts the table's body at its 12rem floor, not at its rows. On a window too
 * short for the page's header and the floor, the page keeps that height and `<main>`
 * scrolls — with the page's own padding, which a `min-h-0` would push out of view.
 *
 * For a wrapper that is another component, or that merges other classes; otherwise
 * use {@link FillHeight}.
 */
export const FILL_HEIGHT_CLASS =
  "md:has-[[data-fill-height]]:flex md:has-[[data-fill-height]]:flex-1 md:has-[[data-fill-height]]:flex-col";

/** A plain `div`'s props: `className` is merged after {@link FILL_HEIGHT_CLASS}, and
 *  `ref` reaches the `div`. */
export type FillHeightProps = ComponentPropsWithRef<"div">;

/**
 * A wrapper between AppShell's `<main>` and a `fillHeight` DataTable: from `md`, a flex
 * column that takes the rest of its parent — only while such a table is inside. Below
 * `md`, and around anything else, a plain `div`.
 *
 * Every element on the way is one: the page's root, and any wrapper between it and the
 * table (an `id` holder, a desktop-only wrapper — that one merges
 * {@link FILL_HEIGHT_CLASS} with its own classes). The page's header above the table
 * keeps its height; only the table's body scrolls.
 *
 * ```tsx
 * <FillHeight className="py-4 md:p-6">
 *   <PageHeader title="Payees" />
 *   <DataTable fillHeight rows={rows} columns={columns} rowKey={(r) => r.id} />
 * </FillHeight>
 * ```
 */
export function FillHeight({ className, ...props }: FillHeightProps) {
  return <div {...props} className={cn(FILL_HEIGHT_CLASS, className)} />;
}
