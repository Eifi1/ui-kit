import type { ComponentPropsWithoutRef, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./ui";

// Every class below is spelled out in full rather than assembled from parts: the
// consumer's Tailwind build finds classes by scanning this package's source as text,
// and a class that exists only after a template literal runs is never generated.
//
// Each rule is written twice, once for a direct child and once for a `<button>` one
// level down. The second is for a Tooltip-wrapped IconButton — the map zoom's + and −
// both carry a tooltip — where the direct child is the tooltip's wrapper span and the
// button that draws the border and the corners sits inside it. The same again for an
// `<a>` one level down: a router link member (see {@link ButtonGroupLink}) under a
// tooltip. A bare link is a direct child and needs nothing extra.
const JOINED_COMMON = cn(
  "inline-flex rounded-md border border-[var(--border)]",
  // The group draws the frame; each member gives up its own border, radius and shadow.
  "[&>*]:rounded-none [&>*]:border-0 [&>*]:shadow-none",
  "[&>*>button]:rounded-none [&>*>button]:border-0 [&>*>button]:shadow-none",
  "[&>*>a]:rounded-none [&>*>a]:border-0 [&>*>a]:shadow-none",
  "[&>*]:border-[var(--border)]",
  // A focused member rises above its neighbours so its ring is not painted over by
  // the next one's background.
  "[&>*]:relative [&>*:focus-within]:z-10",
);

const JOINED: Record<"horizontal" | "vertical", string> = {
  // Logical edges and corners throughout (`border-s`, `rounded-s-*`), so in RTL the
  // first member sits on the right with the right-hand corners rounded — the physical
  // pair would round the outside of the last button and square off the first.
  horizontal: cn(
    JOINED_COMMON,
    "flex-row items-stretch",
    "[&>*:not(:first-child)]:border-s",
    "[&>:first-child]:rounded-s-md [&>:last-child]:rounded-e-md",
    "[&>:first-child>button]:rounded-s-md [&>:last-child>button]:rounded-e-md",
    "[&>:first-child>a]:rounded-s-md [&>:last-child>a]:rounded-e-md",
  ),
  // The block axis is top-to-bottom in both reading directions, so top/bottom are
  // already the logical edges here.
  vertical: cn(
    JOINED_COMMON,
    "flex-col items-stretch",
    "[&>*:not(:first-child)]:border-t",
    "[&>:first-child]:rounded-t-md [&>:last-child]:rounded-b-md",
    "[&>:first-child>button]:rounded-t-md [&>:last-child>button]:rounded-b-md",
    "[&>:first-child>a]:rounded-t-md [&>:last-child>a]:rounded-b-md",
  ),
};

// `gapped`: the members keep their own shape — round overlay discs, each its own
// border and radius — and sit apart. Nothing is stripped, so there is nothing to
// restore per edge, and the gap is logical by nature.
const GAPPED: Record<"horizontal" | "vertical", string> = {
  horizontal: "inline-flex flex-row items-center gap-1",
  vertical: "inline-flex flex-col items-center gap-1",
};

// `elevated`, joined: the frame itself floats — a filled surface under the members (a
// ghost member would otherwise show the content through it) and the shadow of a
// control lifted over the page.
const ELEVATED_JOINED = "bg-[var(--bg-surface)] shadow-lg";
// `elevated`, gapped: there is no frame, so each disc carries the shadow. Aimed at the
// control, not the tooltip's square wrapper span, whose shadow would be a box round a
// round disc.
const ELEVATED_GAPPED =
  "[&>button]:shadow-md [&>a]:shadow-md [&>*>button]:shadow-md [&>*>a]:shadow-md";

export interface ButtonGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "role"> {
  /** `horizontal` (default): side by side, in reading order. `vertical`: stacked —
   *  the map's zoom + over −. */
  orientation?: "horizontal" | "vertical";
  /**
   * `joined` (default): one frame, hairline dividers, outer corners rounded. `gapped`:
   * separate controls with a small gap, each keeping its own shape — the overlay
   * discs of keksdose's receipt preview zoom (scan-file-preview.tsx:362, the − and +
   * `IconButton variant="overlay"` in a hand-made `flex gap-1`), where a joined frame
   * would be a box drawn over the photo.
   */
  variant?: "joined" | "gapped";
  /**
   * Float it: a surface with a shadow, for a toolbar that sits OVER content (a map's
   * zoom, a photo's controls) rather than in the page's flow — keksdose adds
   * `shadow-sm` to each disc on the receipt preview by hand. On a joined group the
   * frame is filled and shadowed; on a gapped one, each member.
   */
  elevated?: boolean;
}

/**
 * Adjacent `Button`s or `IconButton`s drawn as one joined control: a single frame,
 * hairline dividers between the members, rounded only at the outer corners.
 *
 * keksdose asked for it twice — "collapse all / expand all" above its category
 * tree, and the + and − of its map zoom — both hand-built with negative margins and
 * physical `rounded-l` / `rounded-r`, which came out inside-out under `dir="rtl"`.
 *
 * `role="group"` with a name: a reader then introduces the pair as "Zoom, group"
 * before reading "Zoom in", which is what tells a listener that the next button
 * belongs with this one. Pass `aria-label` (or `aria-labelledby`); a group with no
 * name is one more unlabelled wrapper. It is NOT a toolbar — it adds no arrow-key
 * roving, and every member keeps its own tab stop, as plain adjacent buttons do.
 * For one-of-many selection use `ToggleGroup`, which has the radio semantics.
 */
export function ButtonGroup({
  orientation = "horizontal",
  variant = "joined",
  elevated = false,
  className,
  ...rest
}: ButtonGroupProps) {
  const joined = variant === "joined";
  return (
    <div
      {...rest}
      role="group"
      data-orientation={orientation}
      data-variant={variant}
      className={cn(
        joined ? JOINED[orientation] : GAPPED[orientation],
        elevated && (joined ? ELEVATED_JOINED : ELEVATED_GAPPED),
        className,
      )}
    />
  );
}

/** What {@link ButtonGroupLinkProps.renderLink} is handed. Spread it onto your router's
 *  link, mapping `href` — `renderLink={({ href, ...p }) => <Link to={href} {...p} />}`. */
export interface ButtonGroupLinkRenderProps {
  href: string;
  /** The button look — keep it, or the member is a bare link in the frame. */
  className: string;
  children: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
  "aria-current"?: "page";
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  [key: `aria-${string}`]: string | boolean | number | undefined;
  [key: `data-${string}`]: unknown;
}

export interface ButtonGroupLinkProps extends Omit<ComponentPropsWithoutRef<"a">, "href" | "className" | "children"> {
  href: string;
  /** The {@link Button} variant it looks like. Default `secondary`, the usual member. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** The member for the page you are on: `aria-current="page"` and the "on" look of a
   *  pressed member, so a link row reads as a segmented switch between pages. */
  current?: boolean;
  /** Render through your router's `Link` — see {@link ButtonGroupLinkRenderProps}. */
  renderLink?: (props: ButtonGroupLinkRenderProps) => ReactElement;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

const LINK_CURRENT = "bg-[var(--brand-bg)] text-[var(--brand)] hover:bg-[var(--brand-bg-hover)]";

/**
 * A {@link ButtonGroup} member that navigates: a link drawn as a {@link Button}, so it
 * joins the frame like one. A group mixing actions and pages — "Export" beside "Open
 * report" — had to either make the page a button with an `onClick` navigate (no
 * middle-click, no "open in new tab", no link semantics) or style an `<a>` whose
 * corners the group did not know about. Plain `<a>` by default; `renderLink` for the
 * router's `Link`, the kit's usual shape (`Chip`, `MenuItem`, `StatTile`).
 */
export function ButtonGroupLink({
  href,
  variant = "secondary",
  size,
  current = false,
  renderLink,
  className,
  children,
  ...rest
}: ButtonGroupLinkProps) {
  const props: ButtonGroupLinkRenderProps = {
    ...rest,
    href,
    "aria-current": current ? "page" : undefined,
    className: buttonClasses(variant, { size, className: cn(current && LINK_CURRENT, className) }),
    children,
  };
  if (renderLink) return <RenderedGroupLink render={renderLink} {...props} />;
  const { children: content, ...anchor } = props;
  return <a {...anchor}>{content}</a>;
}

/** Calls `renderLink` as a component, so the router link's hooks are its own. */
function RenderedGroupLink({
  render,
  ...props
}: ButtonGroupLinkRenderProps & { render: (props: ButtonGroupLinkRenderProps) => ReactElement }) {
  return render(props);
}
