import { useEffect, useId, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "../lib/cn";
// Read at the moment of closing, as `useCloseTransition` does: the setting can change
// under a long-lived page.
import { prefersReducedMotion } from "../hooks/use-close-transition";

/** How long the fold takes, in ms. The same number as the `duration-200` below and as
 *  the unmount timer, because they are the same movement. */
const COLLAPSE_MS = 200;

/**
 * `extends` the div's props so an `id` (what a trigger's `aria-controls` points at), a
 * `data-tour` anchor or a test id reaches the element that folds.
 */
export interface CollapseProps extends ComponentPropsWithoutRef<"div"> {
  open: boolean;
  /**
   * Keep the children mounted while shut (hidden and `inert`) instead of unmounting
   * them once the fold has finished closing.
   *
   * Off by default, and that default is a behaviour contract rather than a
   * performance note: Lenkbank's disclosure bodies FETCH, and a body that only exists
   * while open is what stops a closed card asking — without every caller carrying its
   * own `enabled: open`. On for a body whose state must outlive a close (a half-typed
   * form) or that must be found by the browser's find-in-page.
   */
  keepMounted?: boolean;
  children: ReactNode;
}

/**
 * The fold on its own: content that opens and shuts in place, animated to a height
 * nobody measured.
 *
 * THE TECHNIQUE is `AppShell`'s sidebar group's, lifted out so there is one copy of it.
 * A `grid-template-rows` transition from `0fr` to `1fr` is the one way to animate to a
 * content-sized height without measuring it — so a chart that resizes inside it, or a
 * translated line that wraps, is still exactly as tall as it needs. `visibility` rides
 * the same transition, so a shut body leaves the accessibility tree only once it has
 * finished closing; `inert` takes it out of the tab order immediately.
 *
 * THE CHILDREN are unmounted once closed (see {@link CollapseProps.keepMounted}), but
 * only once the track has finished closing: the track is what animates, so the
 * children have to survive the movement that hides them. Under reduced motion they
 * go at once — there is no movement to wait for — and the opening half is silenced by
 * `motion-reduce:transition-none`, since tokens.css only silences the overlay
 * animations by name.
 *
 * Padding and margins belong on a child: on this element, or the clipping one inside
 * it, they would hold the row open by that much.
 */
export function Collapse({ open, keepMounted = false, children, className, style, ...rest }: CollapseProps) {
  // Whether the children are still on their way out. Adjusted DURING render when
  // `open` flips (React's "storing information from previous renders"), so a close
  // under reduced motion unmounts in the same render that shut it — a test, and a
  // screen reader, see the body go on the click — and a re-open mid-fold simply
  // cancels the linger.
  const [lingering, setLingering] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setLingering(!open && !prefersReducedMotion());
  }
  useEffect(() => {
    if (!lingering) return;
    const timer = setTimeout(() => setLingering(false), COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [lingering]);

  const mounted = open || lingering || keepMounted;

  return (
    <div
      {...rest}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none",
        className,
      )}
      // Inline rather than `grid-rows-[…]` classes: a caller's `className` must not be
      // able to pin the track open, and the two values ARE the state.
      style={{ ...style, gridTemplateRows: open ? "1fr" : "0fr", visibility: open ? "visible" : "hidden" }}
    >
      <div
        className={cn(
          "min-h-0 overflow-hidden transition-opacity duration-200 ease-out motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        {mounted && children}
      </div>
    </div>
  );
}

/**
 * What {@link DisclosureProps.triggerProps} may put on the header button: its own
 * attributes and handlers, and any `data-*`. Not the ones the disclosure owns —
 * `aria-expanded`, `aria-controls`, `disabled`, `onClick`, `type` and the content — nor
 * `className`, which is {@link DisclosureProps.headerClassName}.
 */
export type DisclosureTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "type" | "aria-expanded" | "aria-controls" | "disabled" | "onClick" | "children" | "className"
> & { [data: `data-${string}`]: string | number | boolean | undefined };

/**
 * `title` is omitted from the div's own props because this component already owns the
 * name: here it is the header's content (and a ReactNode), not the browser's tooltip.
 * Everything else reaches the outer element.
 */
export interface DisclosureProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  /** What the header says. A node, so a status chip or a count can sit in it. */
  title: ReactNode;
  /** The smaller line under the title — what is inside, for a reader deciding whether
   *  to open it. */
  hint?: ReactNode;
  /**
   * Who decides whether this one is open. Left out, the disclosure decides for itself,
   * which is what one standing on its own wants. Passed, the caller does — a set of
   * which one is open at a time, or an open state kept in the URL so the view can be
   * linked to. There is no accordion component: "one open at a time" is a few lines in
   * the caller and it usually owns a URL parameter, which is app state.
   */
  open?: boolean;
  /** Whether an UNCONTROLLED disclosure starts open. Ignored when `open` is passed. */
  defaultOpen?: boolean;
  /** Called with the next state on every toggle, controlled or not. */
  onOpenChange?: (open: boolean) => void;
  /**
   * `card` (default) draws the kit's `Card` surface round header and body, with the
   * chevron trailing the header and turning over — the "section that opens" of a
   * settings or analysis page. `bare` draws nothing: a leading chevron that turns
   * down, for an inline "Show 3 hidden accounts" inside something that already has
   * its own surface.
   *
   * `menu` is a row of a `HoverMenu`: the top bar's menu-item look
   * (`TOPBAR_MENU_ITEM_CLASS` — full-width, `px-3 py-2`, regular weight, square, the
   * hover wash with the text colour left alone), an INSET focus ring so the menu's
   * clipping edge cannot cut it off, the chevron at the end (`chevronPosition`
   * defaults to `end` here) and a body with no padding of its own, so the sub-list's
   * rows sit flush like the rows around them. keksdose's account menu opens its
   * language sub-list this way, and on `bare` it took four header overrides and a
   * body one to get there (account-menu.tsx).
   */
  variant?: "card" | "bare" | "menu";
  /**
   * Where a `bare` disclosure draws its chevron. `start` (default) is the leading
   * chevron that turns from the reading direction to down. `end` puts it at the far
   * end of the row, pointing down and turning up as the card's does — keksdose's
   * account menu, whose language sub-list reads "Language 🇩🇪 ⌄" with the chevron
   * after the flag, like every other menu row with a sub-list. With `trailing`, the
   * chevron follows it, as on a card. A `card` always has it at the end, so this is
   * ignored there. A `menu` defaults to `end`, like the menu rows around it.
   *
   * `after-title` sits it right after the title's text, pointing down and turning up —
   * "Net profit ⌄ ······ 1,234.50", Lenkbank's result rows, where the far end of the
   * row belongs to a figure (see {@link trailingInTrigger}) and a leading chevron
   * would push every label off the column the non-expandable rows' labels start on.
   * Not a card's: its chevron keeps the end.
   */
  chevronPosition?: "start" | "end" | "after-title";
  /**
   * Wrap the header button in a heading of this level. The WAI-ARIA disclosure pattern
   * puts the button INSIDE the heading when the disclosure titles a section, so the
   * page's heading outline still lists it. Off by default: an inline "show more" is
   * not a section.
   */
  headingAs?: "h2" | "h3" | "h4" | "h5" | "h6";
  /** See {@link CollapseProps.keepMounted}. */
  keepMounted?: boolean;
  disabled?: boolean;
  /** Extra classes for the header button. */
  headerClassName?: string;
  /**
   * Attributes for the header BUTTON — the outer props go to the wrapping div — such as
   * an `aria-label`, an `id` or a `data-*` test hook. A function of the open state
   * when they depend on it: keksdose's budget table names each group's toggle
   * "Expand group Food" / "Collapse group Food", because the visible title is only the
   * group's name:
   *
   * ```tsx
   * triggerProps={(open) => ({ "aria-label": t(open ? "collapseGroup" : "expandGroup", { name }) })}
   * ```
   *
   * An `aria-label` REPLACES the title as the button's name, so it must still contain
   * the title's words (WCAG 2.5.3, label in name). See {@link DisclosureTriggerProps}
   * for what the disclosure keeps for itself.
   */
  triggerProps?: DisclosureTriggerProps | ((open: boolean) => DisclosureTriggerProps);
  /** Extra classes for the body's wrapper — where its padding and spacing live. */
  bodyClassName?: string;
  /**
   * Content at the far end of the header row, beside the title: a count, a date, a
   * status chip, an action button. It is a SIBLING of the header button, never inside
   * it — a button may not contain another interactive element, and a count inside it
   * would also be read as part of the button's name. The header button still spans
   * the row under it (a stretched hit area), so clicking the empty space or the
   * card's chevron still toggles, while whatever sits in `trailing` gets its own
   * clicks. With `trailing`, the card's chevron moves after it, to the row's end.
   *
   * Unless {@link trailingInTrigger} is set, which moves it INTO the button.
   */
  trailing?: ReactNode;
  /**
   * Render {@link trailing} inside the header button instead of beside it, so the
   * whole row — figure included — is one click target and the figure is part of the
   * button's accessible name: "Net profit 1,234.50, collapsed" rather than a button
   * called "Net profit" next to an unexplained number.
   *
   * Lenkbank's result rows (features/steering/results-panel.tsx) are the case: label,
   * chevron, and the value at the far end, all one `<button>`, because a result row
   * has nothing else it could mean.
   *
   * ⚠️ Only for NON-interactive content — a count, a figure, a status chip. A button
   * may not contain another interactive element; an action belongs in the default,
   * sibling `trailing`. The content is rendered in a `<span>`, so keep it phrasing
   * content too (no `div`s).
   */
  trailingInTrigger?: boolean;
  /**
   * Trigger-only mode: the id of an element the CALLER renders elsewhere — the hidden
   * rows of a table, a panel in another column — which this header shows and hides.
   * The header's `aria-controls` points at it and the disclosure renders no body of
   * its own (`children`, `bodyClassName` and `keepMounted` are ignored). Pair it with
   * `open` / `onOpenChange`: the caller owns the state, since the caller renders what
   * it governs.
   *
   * It is an IDREF LIST, as `aria-controls` is: several space-separated ids when what
   * folds is several elements — a budget group's category rows, each its own `<li>`,
   * siblings of this header (keksdose's budget-mobile-list joins their ids with
   * `" "`). It may be the EMPTY string: trigger-only mode with nothing to point at yet
   * (a group whose rows are all filtered away, rows that are not rendered while shut).
   * The header then carries no `aria-controls` at all rather than an empty one, and
   * still toggles.
   *
   * A table's leading row — keksdose's "Upcoming" toggle over the scheduled rows of
   * its transactions table — is this mode too: the rows it folds are the TABLE's, so
   * the disclosure is only the header, and the table renders or drops them from the
   * same state.
   *
   * ```tsx
   * <DataTable
   *   rows={showFuture ? [...scheduled, ...posted] : posted}
   *   leadingRow={
   *     <Disclosure
   *       variant="bare"
   *       title={upcomingLabel}
   *       open={showFuture}
   *       onOpenChange={setShowFuture}
   *       // The scheduled rows' ids while they are rendered; "" while they are not.
   *       controls={showFuture ? scheduled.map((tx) => `row-s${tx.id}`).join(" ") : ""}
   *       headerClassName="px-3 py-2"
   *     />
   *   }
   *   …
   * />
   * ```
   */
  controls?: string;
  /** The body. Not rendered in trigger-only mode ({@link DisclosureProps.controls}). */
  children?: ReactNode;
}

/**
 * A section that opens in place: a header button with `aria-expanded` and
 * `aria-controls`, and a {@link Collapse} under it.
 *
 * Both apps had written this by hand — Lenkbank as a shared `CollapsibleCard` with ten
 * importers, Keksdose three separate times (accounts, twice; the support panel) — and
 * the copies had drifted: none of Keksdose's animated, and all three swapped a
 * `ChevronRight` for a `ChevronDown` rather than turning one. Here the chevron is one
 * icon that rotates, so the change of state is one element moving rather than two
 * trading places.
 *
 * The body is unmounted while shut; see {@link CollapseProps.keepMounted} for why that
 * is the default and when to opt out.
 */
export function Disclosure({
  title,
  hint,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  variant = "card",
  chevronPosition,
  headingAs: Heading,
  keepMounted,
  disabled,
  headerClassName,
  triggerProps,
  bodyClassName,
  trailing,
  trailingInTrigger = false,
  controls,
  className,
  children,
  ...rest
}: DisclosureProps) {
  const [own, setOwn] = useState(defaultOpen);
  const open = controlled ?? own;
  const bodyId = useId();
  const card = variant === "card";
  const menu = variant === "menu";
  // The card's chevron trails always; a menu row's unless asked otherwise; a bare
  // one only when asked to.
  const chevronAt = card ? "end" : (chevronPosition ?? (menu ? "end" : "start"));
  const chevronAtEnd = chevronAt === "end";
  const chevronAfterTitle = chevronAt === "after-title";
  const triggerOnly = controls !== undefined;
  // The card's header squares its lower corners only when a body opens under it.
  const joined = open && !triggerOnly;
  const hasTrailing = trailing !== undefined && trailing !== null && trailing !== false;
  // `trailing` beside the button, which then stretches under it; inside the button,
  // the row is simply the button.
  const trailingInside = hasTrailing && trailingInTrigger;
  const trailingBeside = hasTrailing && !trailingInTrigger;

  const toggle = () => {
    const next = !open;
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };

  const extraTriggerProps = typeof triggerProps === "function" ? triggerProps(open) : triggerProps;

  const button = (
    <button
      {...extraTriggerProps}
      type="button"
      aria-expanded={open}
      // `||`: an empty `controls` is trigger-only with nothing to name, not `aria-controls=""`.
      aria-controls={triggerOnly ? controls || undefined : bodyId}
      disabled={disabled}
      onClick={toggle}
      data-disclosure-trigger=""
      className={cn(
        "flex w-full gap-2 text-start outline-none disabled:cursor-not-allowed disabled:opacity-50",
        trailingBeside
          ? // Stretched over the whole header row (the row is `relative`), so the space
            // round `trailing` and the card's chevron still toggle; the ring and the
            // card's hover paint on the stretched area / the row, not the text box.
            cn(
              "min-w-0 flex-1 after:absolute after:inset-0 after:content-['']",
              "focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--brand)]",
              card ? cn("after:rounded-lg", joined && "after:rounded-b-none") : !menu && "after:rounded-sm",
            )
          : "focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
        card
          ? cn(
              "items-center justify-between rounded-lg p-4",
              trailingBeside ? "pe-0" : "hover:bg-[var(--bg-hover)] focus-visible:ring-inset",
              joined && "rounded-b-none",
            )
          : menu
            ? // TOPBAR_MENU_ITEM_CLASS's row, spelled out rather than imported: a
              // component does not reach up into the shell. A test holds the two to
              // the same classes.
              "items-center justify-between gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:ring-inset"
            : "items-center rounded-sm text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        headerClassName,
      )}
    >
      {chevronAt === "start" && <Chevron open={open} leading />}
      {/* `flex-1`: the title takes the row, so whatever a caller puts at its end sits
          at the header's far edge. */}
      <span className="min-w-0 flex-1">
        {chevronAfterTitle ? (
          // The chevron hugs the text, however long the translation: the text wraps
          // before the chevron is pushed away from it.
          <span className="flex items-center gap-1">
            <span className="min-w-0">{title}</span>
            <Chevron open={open} small />
          </span>
        ) : (
          <span className={cn("block", card && "text-sm font-semibold text-[var(--text-primary)]")}>{title}</span>
        )}
        {hint !== undefined && (
          <span className="mt-0.5 block text-xs font-normal text-[var(--text-muted)]">{hint}</span>
        )}
      </span>
      {/* The space is for the accessible name — "Net profit 1,234.50", not
          "Net profit1,234.50"; between flex items it renders as nothing. */}
      {trailingInside && " "}
      {trailingInside && (
        <span data-disclosure-trailing="" className="flex shrink-0 items-center gap-2">
          {trailing}
        </span>
      )}
      {chevronAtEnd && !trailingBeside && <Chevron open={open} small={!card} />}
    </button>
  );

  // Preflight already makes h1–h6 inherit size and weight, so the heading adds
  // structure and nothing visible.
  const header = Heading ? <Heading className={trailingBeside ? "min-w-0 flex-1" : undefined}>{button}</Heading> : button;

  return (
    <div
      {...rest}
      className={cn(card && "rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm", className)}
    >
      {trailingBeside ? (
        <div
          className={cn(
            "relative flex items-center gap-2",
            card &&
              cn(
                "rounded-lg pe-4 has-[[data-disclosure-trigger]:enabled:hover]:bg-[var(--bg-hover)]",
                joined && "rounded-b-none",
              ),
          )}
        >
          {header}
          {/* Positioned, so it paints over the stretched button and takes its own
              clicks; the chevron is not, so a click on it lands on the button. */}
          <div className="relative flex shrink-0 items-center gap-2">{trailing}</div>
          {chevronAtEnd && <Chevron open={open} small={!card} />}
        </div>
      ) : (
        header
      )}
      {!triggerOnly && (
        <Collapse id={bodyId} open={open} keepMounted={keepMounted}>
          <div className={cn(card ? "space-y-3 px-4 pb-4" : !menu && "space-y-2 pt-2", bodyClassName)}>{children}</div>
        </Collapse>
      )}
    </div>
  );
}

/**
 * One icon for both variants, turned rather than swapped. `leading` (bare) points it
 * along the reading direction while shut — right in LTR, left in RTL — and down when
 * open; trailing (card) points down while shut and up when open, which is the card
 * header's convention. Rotation, not a mirrored glyph, so RTL needs one opposite angle
 * and no `scale` composing with the turn.
 */
function Chevron({
  open,
  leading = false,
  small = leading,
}: {
  open: boolean;
  leading?: boolean;
  /** The bare variant's size, which a bare chevron keeps at either end of its row. */
  small?: boolean;
}) {
  return (
    <ChevronDown
      aria-hidden
      className={cn(
        "shrink-0 text-[var(--text-muted)] transition-transform duration-200 ease-out motion-reduce:transition-none",
        small ? "size-3.5" : "size-4",
        leading ? !open && "-rotate-90 rtl:rotate-90" : open && "rotate-180",
      )}
    />
  );
}
