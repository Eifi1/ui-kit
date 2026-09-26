import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../lib/cn";
import { SECTION_LABEL_CLASS } from "./text";

/** `md` (default) is kastlan's `text-2xl` page title from `sm` up, a step smaller on a
 *  phone; `sm` is lenkbank's `text-lg` title on a dense tool page (projects-page.tsx). */
export type PageHeaderSize = "sm" | "md";

const TITLE: Record<PageHeaderSize, string> = {
  sm: "text-lg font-semibold",
  md: "text-xl font-semibold tracking-tight sm:text-2xl",
};

export interface PageHeaderProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  title: ReactNode;
  /** A sentence under the title. */
  description?: ReactNode;
  /** Buttons for the page — "New", "Export". At the title's end from `sm` up; under it,
   *  wrapping, on a phone. */
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
  className,
  ...rest
}: PageHeaderProps) {
  const Heading = as as ElementType;
  return (
    <div {...rest} className={cn("flex min-w-0 flex-col gap-2", className)}>
      {breadcrumbs}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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
