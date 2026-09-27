import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../lib/cn";
import { SECTION_LABEL_CLASS } from "./text";

/**
 * `md` (default) is kastlan's `text-2xl` page title from `sm` up, a step smaller on a
 * phone; `sm` is lenkbank's `text-lg` title on a dense tool page (projects-page.tsx).
 *
 * `compact` (0.13) is keksdose's page title (keksdose F4): `text-xl font-semibold` at
 * EVERY width — budgets, rules, accounts, transactions and budget pages all write
 * exactly that `<h1>` by hand. It is `md`'s phone size without `md`'s step up to
 * `text-2xl` on a wider screen, and without its `tracking-tight`, which keksdose's
 * titles never had. A word and not a letter for the reason `ProgressBar`'s `slim` is
 * one: the letters are taken in order, and there is none between `sm` and `md` — an
 * `lg` or `xl` at `text-xl` would read as LARGER than `md`, which from `sm` up it is
 * not.
 */
export type PageHeaderSize = "sm" | "compact" | "md";

const TITLE: Record<PageHeaderSize, string> = {
  sm: "text-lg font-semibold",
  compact: "text-xl font-semibold",
  md: "text-xl font-semibold tracking-tight sm:text-2xl",
};

/**
 * How the title block and the actions sit below the `sm` breakpoint. From `sm` up both
 * layouts are one row: title block at the start, actions at the end.
 */
export type PageHeaderMobileLayout = "stacked" | "inline";

const ROW: Record<PageHeaderMobileLayout, string> = {
  stacked: "flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
  inline: "flex-row items-center justify-between gap-2 sm:gap-4",
};

export interface PageHeaderProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  title: ReactNode;
  /** A sentence under the title. */
  description?: ReactNode;
  /** Buttons for the page — "New", "Export". At the title's end from `sm` up; under it,
   *  wrapping, on a phone — unless {@link mobileLayout} is `inline`. */
  actions?: ReactNode;
  /** A `Breadcrumbs` trail, drawn above everything else. */
  breadcrumbs?: ReactNode;
  /** A small uppercase line above the title — the section or the kind of record
   *  ("Building", "Settings"). The section-label type. */
  eyebrow?: ReactNode;
  /** The title's element. Default `h1`: a page has one, and this is it. `h2` for a
   *  header inside a page that already has its `h1` (a tab's own header). */
  as?: "h1" | "h2" | "h3";
  size?: PageHeaderSize;
  /**
   * `stacked` (default): on a phone the actions drop under the title and wrap, so a
   * row of three buttons never pushes the title off the screen.
   *
   * `inline`: the actions stay beside the title on a phone too, vertically centred on
   * it — keksdose's headers (transactions-page.tsx:515, `flex items-center
   * justify-between gap-2`), which carry one or two icon-sized controls and were tuned
   * for the phone in live #263. Adopting `PageHeader` must not undo that tuning, so the
   * row stays a row (keksdose F4). The actions do NOT wrap or shrink here: `inline` is
   * for a header whose actions are known to fit beside a phone-width title (an icon
   * button, a month picker); a long title wraps to make room for them instead.
   */
  mobileLayout?: PageHeaderMobileLayout;
}

/**
 * A page's head: optional breadcrumbs, an eyebrow, the title, a description, and the
 * page's actions.
 *
 * kastlan's (shared/components/display/page-header.tsx) is the model — title and
 * description on one side, actions on the other, stacked on a phone — and this adds
 * what its pages kept writing around it: a trail above, an eyebrow, a `ReactNode`
 * title (a status chip beside the name), and actions that WRAP when there are more
 * than fit a phone's width, instead of running off it. No outer margin: the page's
 * own rhythm (`space-y-*`, a grid gap) places it.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  eyebrow,
  as = "h1",
  size = "md",
  mobileLayout = "stacked",
  className,
  ...rest
}: PageHeaderProps) {
  const Heading = as as ElementType;
  return (
    <div {...rest} className={cn("flex min-w-0 flex-col gap-2", className)}>
      {breadcrumbs}
      <div className={cn("flex min-w-0", ROW[mobileLayout])}>
        <div className="min-w-0 flex-1">
          {eyebrow != null && <p className={cn(SECTION_LABEL_CLASS.xs, "mb-1")}>{eyebrow}</p>}
          <Heading className={cn("break-words text-[var(--text-primary)]", TITLE[size])}>{title}</Heading>
          {description != null && <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
        {actions != null && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
