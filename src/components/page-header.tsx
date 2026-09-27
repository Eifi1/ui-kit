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

/**
 * Where the actions sit on the title block's height, in the one row the header is from
 * `sm` up (and on a phone too when {@link PageHeaderMobileLayout} is `inline`, the only
 * layout that has a row there). Unset keeps each layout's own: `start` for `stacked`,
 * `center` for `inline`.
 */
export type PageHeaderActionsAlign = "start" | "center" | "end";

/** Applied to the ROW, so the title block and the actions are aligned against each
 *  other on one cross axis. 0.14.0 put `self-*` on the actions box alone, which moved
 *  nothing when the actions were the taller item — they already filled the row, and
 *  the title stayed at the top (keksdose H2, reports-page's two-line labelled
 *  CurrencySelect). Per layout, because `stacked` is a column on a phone, where
 *  `items-center` would centre everything HORIZONTALLY — so it aligns from `sm` up. */
const ROW_ALIGN: Record<PageHeaderMobileLayout, Record<PageHeaderActionsAlign, string>> = {
  stacked: { start: "sm:items-start", center: "sm:items-center", end: "sm:items-end" },
  inline: { start: "items-start", center: "items-center", end: "items-end" },
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
  /**
   * A second group of actions that gets its OWN full-width row under the header on a
   * phone, and joins the actions' row from `sm` up, between the title and
   * {@link actions}.
   *
   * keksdose's budget page (budget-page.tsx, feedback #60) is the case: title and month
   * navigation on row 1, the fold/unfold toggles on row 2 on a phone — "two tidy rows
   * instead of the old ragged justify-between overflow" — and one row, title | toggles |
   * month nav, on a wider screen. It builds that by hand with a wrapping flex row and
   * swapped order utilities; adopting `PageHeader` (keksdose G6b) must not lose it.
   * There: `actions` is the month navigation, this is the toggles.
   *
   * The DOM order is title, `actions`, `secondaryActions` — the phone's visual order,
   * and the one a screen reader and the Tab key follow at every width. From `sm` up the
   * two groups swap places visually only, which keeps the page's primary control (the
   * month) at the row's end, where keksdose had it, and first in reading order. The
   * breakpoint is `sm`, the one {@link mobileLayout} switches at, not keksdose's `md`:
   * one header, one breakpoint.
   */
  secondaryActions?: ReactNode;
  /**
   * The actions' vertical alignment against the title block — see
   * {@link PageHeaderActionsAlign}. Unset keeps the layout's own.
   *
   * keksdose's reports page (reports-page.tsx, keksdose G8) carries a LABELLED
   * `CurrencySelect` as its action: a field with its label on top is taller than the
   * title, and `stacked`'s default top alignment hangs it from the title's cap height
   * with its control well below the title's line. `center` sets it on the title's
   * middle, as that page's hand-written `items-center` row did. It aligns the whole row
   * (title block and actions against each other), since 0.14.1: 0.14.0 moved only the
   * actions box, which did nothing when the actions were the taller item (keksdose H2).
   */
  actionsAlign?: PageHeaderActionsAlign;
  /**
   * One line, cut with an ellipsis, instead of the default breaking of a long word onto
   * as many lines as it needs.
   *
   * keksdose's payees page (payees-page.tsx, live #263, keksdose G6a) wraps its title in
   * its own truncating span so a long name gives way to the `inline` header's actions
   * instead of pushing them. This is that span's behaviour on the heading itself; the
   * title block is already allowed to shrink below its content, which is what lets the
   * cut happen inside a flex row.
   *
   * The full title stays in the DOM as the heading's text, so a screen reader and the
   * document outline read all of it. There is deliberately no native `title` tooltip:
   * the kit does not use them (not on touch, not on keyboard focus, not styled).
   */
  truncateTitle?: boolean;
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
  secondaryActions,
  actionsAlign,
  truncateTitle = false,
  className,
  ...rest
}: PageHeaderProps) {
  const Heading = as as ElementType;
  const hasSecondary = secondaryActions != null;
  const wrapsSecondary = hasSecondary && mobileLayout === "inline";
  const align = actionsAlign != null ? ROW_ALIGN[mobileLayout][actionsAlign] : undefined;
  // keksdose H1: in `inline` the title block could shrink below its longest word, and
  // `break-words` then split "Monatsbudget" into "Monatsbudg" / "et" beside the actions.
  // Unless it truncates, the title keeps its longest word (min-content) and the ROW
  // wraps instead: actions that do not fit go to a line of their own, as the app's old
  // `flex-wrap` header did.
  const keepsWords = mobileLayout === "inline" && !truncateTitle;
  return (
    <div {...rest} className={cn("flex min-w-0 flex-col gap-2", className)}>
      {breadcrumbs}
      {/* With a second group, `inline` wraps so that group's full-width basis puts it
          on a row of its own on a phone (`stacked` is a column there already, and a
          basis would size a column item's HEIGHT); from `sm` up the row stops wrapping
          and the order utilities seat it between the title and the actions. Without
          one, nothing changes. */}
      <div
        className={cn(
          "flex min-w-0",
          ROW[mobileLayout],
          keepsWords ? "flex-wrap" : wrapsSecondary && "flex-wrap sm:flex-nowrap",
          align,
        )}
      >
        <div className={cn("flex-1", keepsWords ? "min-w-min" : "min-w-0")}>
          {eyebrow != null && <p className={cn(SECTION_LABEL_CLASS.xs, "mb-1")}>{eyebrow}</p>}
          <Heading
            className={cn(
              truncateTitle ? "truncate" : "break-words",
              "text-[var(--text-primary)]",
              TITLE[size],
            )}
          >
            {title}
          </Heading>
          {description != null && <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
        {actions != null && (
          <div className={cn("flex shrink-0 flex-wrap items-center gap-2", hasSecondary && "sm:order-2")}>
            {actions}
          </div>
        )}
        {hasSecondary && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 sm:order-1 sm:shrink-0",
              wrapsSecondary && "basis-full sm:basis-auto",
            )}
          >
            {secondaryActions}
          </div>
        )}
      </div>
    </div>
  );
}
