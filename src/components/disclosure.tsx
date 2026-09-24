import { useEffect, useId, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "../lib/cn";

/** How long the fold takes, in ms. The same number as the `duration-200` below and as
 *  the unmount timer, because they are the same movement. */
const COLLAPSE_MS = 200;

/** Read at the moment of closing, like `useCloseTransition` does: the setting can
 *  change under a long-lived page, and jsdom/SSR have no `matchMedia` — where "no
 *  animation" is also the only correct answer, since nothing is painting. */
function prefersReducedMotion(): boolean {
  return (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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
   */
  variant?: "card" | "bare";
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
  /** Extra classes for the body's wrapper — where its padding and spacing live. */
  bodyClassName?: string;
  children: ReactNode;
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
  headingAs: Heading,
  keepMounted,
  disabled,
  headerClassName,
  bodyClassName,
  className,
  children,
  ...rest
}: DisclosureProps) {
  const [own, setOwn] = useState(defaultOpen);
  const open = controlled ?? own;
  const bodyId = useId();
  const card = variant === "card";

  const toggle = () => {
    const next = !open;
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };

  const button = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={bodyId}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "flex w-full gap-2 text-start outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
        card
          ? cn(
              "items-center justify-between rounded-lg p-4 hover:bg-[var(--bg-hover)] focus-visible:ring-inset",
              open && "rounded-b-none",
            )
          : "items-center rounded-sm text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        headerClassName,
      )}
    >
      {!card && <Chevron open={open} leading />}
      <span className="min-w-0">
        <span className={cn("block", card && "text-sm font-semibold text-[var(--text-primary)]")}>{title}</span>
        {hint !== undefined && (
          <span className="mt-0.5 block text-xs font-normal text-[var(--text-muted)]">{hint}</span>
        )}
      </span>
      {card && <Chevron open={open} />}
    </button>
  );

  return (
    <div
      {...rest}
      className={cn(card && "rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm", className)}
    >
      {/* Preflight already makes h1–h6 inherit size and weight, so the heading adds
          structure and nothing visible. */}
      {Heading ? <Heading>{button}</Heading> : button}
      <Collapse id={bodyId} open={open} keepMounted={keepMounted}>
        <div className={cn(card ? "space-y-3 px-4 pb-4" : "space-y-2 pt-2", bodyClassName)}>{children}</div>
      </Collapse>
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
function Chevron({ open, leading = false }: { open: boolean; leading?: boolean }) {
  return (
    <ChevronDown
      aria-hidden
      className={cn(
        "shrink-0 text-[var(--text-muted)] transition-transform duration-200 ease-out motion-reduce:transition-none",
        leading ? "size-3.5" : "size-4",
        leading ? !open && "-rotate-90 rtl:rotate-90" : open && "rotate-180",
      )}
    />
  );
}
