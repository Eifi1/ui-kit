import type { ComponentPropsWithRef } from "react";
import { cn } from "../lib/cn";
import { SECTION_LABEL_CLASS } from "./text";
import { Skeleton } from "./skeleton";
import type { PageHeaderMobileLayout, PageHeaderSize } from "./page-header";
import { ACTIONS, DESCRIPTION, ROOT, ROW, STACK_ACTIONS_AT_LARGE, TITLE } from "./page-header-layout";

export interface PageHeaderSkeletonProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The header's `size`, whose title it outlines. Default `md`, as PageHeader's. */
  size?: PageHeaderSize;
  /** The header's `mobileLayout`. Default `stacked`, as PageHeader's. */
  mobileLayout?: PageHeaderMobileLayout;
  /** How many actions to outline, each a `md` Button. Default 1; 0 for a header without. */
  actions?: number;
  /** A trail line above the title (the header's `breadcrumbs`). */
  breadcrumbs?: boolean;
  /** The small uppercase line above the title (the header's `eyebrow`). */
  eyebrow?: boolean;
  /** A line under the title (the header's `description`). */
  description?: boolean;
  /**
   * Say what is loading, once: a `role="status"` region with this as its hidden text.
   * Left out, nothing is announced — on a page outline the `TableSkeleton` under it
   * already says "Loading…", and two regions would say it twice.
   */
  label?: string;
}

/**
 * The outline of a {@link PageHeader} while its page is on its way (0.55): the trail, the
 * eyebrow, the title, the description and the actions, each the height the header gives
 * it, laid out by the same rows. keksdose drew it from `Skeleton` pieces for its page
 * outline (app/page-skeleton.tsx: an `h-7` bar for its `compact` title, an `h-9` one for
 * the actions) — numbers only the kit knows, and wrong the day the header's change.
 *
 * Exact, not near: each line is its type's own line box (`1lh` of the header's class for
 * it), so it follows the `size`, the `sm` step of `md`'s title and the reader's text size
 * (the rem scale) without a table of heights. An action is a `md` Button's box: a
 * `text-sm` line, `py-2` and the 1px border the outlined variants draw, and the 48px touch
 * target from Large up (button-look.ts). From Large on a phone a `stacked` header's actions
 * go full width, one under the other, and so do these. The header's rows and gaps are its
 * own class strings (page-header-layout.ts), so the outline hands over without a jump.
 *
 * Beside {@link TableSkeleton}: a page's outline is this over that. Props and `ref` go to
 * the root; every placeholder is `aria-hidden`.
 */
export function PageHeaderSkeleton({
  size = "md",
  mobileLayout = "stacked",
  actions = 1,
  breadcrumbs = false,
  eyebrow = false,
  description = false,
  label,
  className,
  ...rest
}: PageHeaderSkeletonProps) {
  return (
    <div
      {...rest}
      role={label ? "status" : undefined}
      // `relative`: the containing block for the sr-only text (sr-only-containment.test).
      className={cn("relative", className)}
      data-skeleton-preset="page-header"
    >
      {label && <span className="sr-only">{label}</span>}
      <div aria-hidden="true" className={ROOT}>
        {breadcrumbs && <Skeleton className="h-[1lh] w-56 max-w-full text-sm" data-skeleton-part="breadcrumbs" />}
        {/* `inline` wraps, as the header's does when its title keeps its words (keksdose H1). */}
        <div className={cn("flex min-w-0", ROW[mobileLayout], mobileLayout === "inline" && "flex-wrap")}>
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <Skeleton className={cn(SECTION_LABEL_CLASS.xs, "mb-1 h-[1lh] w-20")} data-skeleton-part="eyebrow" />
            )}
            <Skeleton className={cn(TITLE[size], "h-[1lh] w-48 max-w-full")} data-skeleton-part="title" />
            {description && (
              <Skeleton className={cn(DESCRIPTION, "h-[1lh] w-80 max-w-full")} data-skeleton-part="description" />
            )}
          </div>
          {actions > 0 && (
            <div className={cn(ACTIONS, mobileLayout === "stacked" && STACK_ACTIONS_AT_LARGE)}>
              {Array.from({ length: actions }, (_, i) => (
                <Skeleton
                  key={i}
                  className="h-[calc(1lh+1rem+2px)] w-24 rounded-md text-sm large:min-h-[48px]"
                  data-skeleton-part="action"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
