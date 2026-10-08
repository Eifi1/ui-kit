import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Chip } from "../components/chip";
import { LegalFooter } from "../components/legal";
import type { LegalFooterProps } from "../components/legal";
import { LandingActions } from "./landing-actions";
import type { LandingActionsProps } from "./landing-actions";
import { useLandingLabels } from "./landing-labels";
import type { LandingLabels } from "./landing-labels";

/**
 * The sections of the public landing page (docs/landing-demo-harmonization.md §4.1),
 * top to bottom: `Hero`, `FeatureRows` of `FeatureRow`, `TrustStrip`, `CtaBand`,
 * `PublicFooter` — keksdose's landing-page.tsx, taken apart.
 *
 * The kit draws the frame; every word of marketing copy is the app's. Colours are the
 * kit's tokens (`--brand`, `--text-*`, `--bg-surface`, `--border`), so keksdose's ten
 * hard-coded teal sites follow the palette now (§2.11).
 *
 * **Visuals are decorative** (§4.1): the `visual` slots are `aria-hidden` and `inert` —
 * mock UI drawn with kit tokens, never screenshots with real data, and never anything a
 * keyboard could land on. The copy beside each one carries the information. A mock's
 * amounts use the demo data's currency, so the landing shows what "Try the demo" opens.
 */

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/** The decorative slot: hidden from assistive tech and out of the tab order. */
function Visual({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden inert data-slot="landing-visual" className={cn("mx-auto w-full select-none", className)}>
      {children}
    </div>
  );
}

/** The action pair's props, as `Hero` and `CtaBand` pass them on. */
type ActionProps = Pick<LandingActionsProps, "session" | "access" | "demoHref" | "openAppHref">;

/* ── Hero ────────────────────────────────────────────────────────────────── */

export interface HeroProps extends Omit<ComponentPropsWithoutRef<"section">, "title" | "children">, ActionProps {
  /** The page's `h1`: what the app does, in a line. */
  title: ReactNode;
  /** Under it: for whom, and why. */
  subtitle?: ReactNode;
  /** The kit's "Beta" chip above the title. */
  beta?: boolean;
  /** A badge of the app's own in that place; wins over `beta`. */
  badge?: ReactNode;
  /** Under the actions, quiet: "Free while in beta. Your data stays yours." */
  trust?: ReactNode;
  /** The product glimpse beside the copy (below it on a phone). Decorative. */
  visual?: ReactNode;
  /** Replaces the action pair ({@link LandingActions}). */
  actions?: ReactNode;
  /** Default `h1`; lower where the hero is embedded in another page. */
  headingAs?: HeadingLevel;
  labels?: Partial<LandingLabels>;
}

/**
 * The top of the landing (§4.1.2): an optional "Beta" badge, the `h1`, a subtitle, the
 * action pair for the visitor's state ({@link LandingActions}: "Request access" and "Try
 * the demo", or "Open app" for a session), a trust line, and a visual. Copy left and
 * visual right from `lg` up, stacked below.
 */
export function Hero({
  title,
  subtitle,
  beta = false,
  badge,
  trust,
  visual,
  actions,
  headingAs: Heading = "h1",
  session,
  access,
  demoHref,
  openAppHref,
  labels: labelsProp,
  className,
  ...rest
}: HeroProps) {
  const labels = useLandingLabels(labelsProp);
  const shownBadge =
    badge ??
    (beta ? (
      // keksdose's chip, padded out to the hero's scale.
      <Chip size="sm" tone="warning" className="px-3 py-1 font-medium">
        {labels.beta}
      </Chip>
    ) : null);
  return (
    <section
      {...rest}
      data-slot="landing-hero"
      className={cn(
        // `grid-cols-1` below `lg` (0.32.1, Kurvenschmiede's 0.32 report): without a
        // template the one column is `auto` and grows to the visual's longest unwrapped
        // line — 80 px past a 360 px phone at Extra large. `minmax(0, 1fr)` holds it to
        // the page. The same in FeatureRow and TrustStrip.
        "mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:py-24",
        visual != null && "lg:grid-cols-2",
        className,
      )}
    >
      <div>
        {shownBadge != null && <div className="mb-4">{shownBadge}</div>}
        <Heading className="text-4xl font-bold tracking-tight text-balance text-[var(--text-primary)] sm:text-5xl">
          {title}
        </Heading>
        {subtitle != null && <p className="mt-4 max-w-xl text-lg text-[var(--text-secondary)]">{subtitle}</p>}
        <div className="mt-8">
          {actions ?? (
            <LandingActions
              session={session}
              access={access}
              demoHref={demoHref}
              openAppHref={openAppHref}
              labels={labelsProp}
            />
          )}
        </div>
        {trust != null && <p className="mt-4 text-sm text-[var(--text-muted)]">{trust}</p>}
      </div>
      {visual != null && <Visual className="max-w-sm">{visual}</Visual>}
    </section>
  );
}

/* ── Feature rows ────────────────────────────────────────────────────────── */

export type FeatureRowsProps = ComponentPropsWithoutRef<"section">;

/**
 * The band that holds the feature rows (§4.1.3): two to four {@link FeatureRow}s on the
 * surface colour, between hairlines. The rows alternate sides by themselves — the copy
 * of every second row moves to the end from `lg` up — so the app lists them in order
 * and nothing else.
 */
export function FeatureRows({ className, children, ...rest }: FeatureRowsProps) {
  return (
    <section
      {...rest}
      data-slot="landing-feature-rows"
      className={cn("border-t border-[var(--border)] bg-[var(--bg-surface)]", className)}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">{children}</div>
    </section>
  );
}

export interface FeatureRowProps extends Omit<ComponentPropsWithoutRef<"div">, "title" | "children"> {
  /** A lucide icon (or any SVG) before the eyebrow. Decorative. */
  icon?: ReactNode;
  /** The small uppercase line above the heading: "Capture", "Plan". */
  eyebrow?: ReactNode;
  /** The row's `h2`. */
  title: ReactNode;
  description?: ReactNode;
  /** Up to three short points; the first three are shown. */
  bullets?: readonly ReactNode[];
  /** The mock beside the copy. Decorative. */
  visual?: ReactNode;
  /** Default `h2`. */
  headingAs?: HeadingLevel;
}

/**
 * One job of the app (§4.1.3), keksdose's "capture → budget → understand": an icon
 * eyebrow, the `h2`, a description, up to three bullets, and a visual on the other side.
 * Inside {@link FeatureRows} every second row puts its copy at the end (`group-even`),
 * which is keksdose's alternation without an index to pass.
 */
export function FeatureRow({
  icon,
  eyebrow,
  title,
  description,
  bullets,
  visual,
  headingAs: Heading = "h2",
  className,
  ...rest
}: FeatureRowProps) {
  const shown = bullets?.slice(0, 3) ?? [];
  return (
    <div
      {...rest}
      data-slot="landing-feature-row"
      className={cn("group/feature grid grid-cols-1 items-center gap-8 py-10", visual != null && "lg:grid-cols-2 lg:gap-16", className)}
    >
      <div className="lg:group-even/feature:order-last">
        {(icon != null || eyebrow != null) && (
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--brand)]">
            {icon != null && (
              <span aria-hidden className="flex shrink-0 [&_svg]:size-4">
                {icon}
              </span>
            )}
            {eyebrow}
          </p>
        )}
        <Heading className="mt-2 text-2xl font-semibold tracking-tight text-balance text-[var(--text-primary)] sm:text-3xl">
          {title}
        </Heading>
        {description != null && <p className="mt-3 max-w-xl text-[var(--text-secondary)]">{description}</p>}
        {shown.length > 0 && (
          <ul className="mt-4 space-y-2">
            {shown.map((bullet, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[var(--text-secondary)]">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                <span className="min-w-0">{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {visual != null && <Visual className="max-w-md">{visual}</Visual>}
    </div>
  );
}

/* ── Trust strip ─────────────────────────────────────────────────────────── */

export interface TrustItem {
  /** A lucide icon. Decorative. */
  icon?: ReactNode;
  /** The item's `h3`: "Hosted in Switzerland". */
  title: ReactNode;
  /** One sentence. */
  description: ReactNode;
}

export interface TrustStripProps extends Omit<ComponentPropsWithoutRef<"section">, "children"> {
  /** Three or four (§4.1.4): hosting, security, data ownership, sharing. */
  items: readonly TrustItem[];
  /** The items' heading level. Default `h3`. */
  headingAs?: HeadingLevel;
}

/**
 * Quiet, start-aligned facts after the feature rows (§4.1.4) — an icon, an `h3` and one
 * sentence each, on one row from `lg` up (three or four columns), two on a tablet, one
 * on a phone. No marketing volume: keksdose's "trust strip".
 */
export function TrustStrip({ items, headingAs: Heading = "h3", className, ...rest }: TrustStripProps) {
  return (
    <section {...rest} data-slot="landing-trust" className={cn("mx-auto max-w-6xl px-4 py-12 sm:py-16", className)}>
      <ul className={cn("grid grid-cols-1 gap-8 sm:grid-cols-2", items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
        {items.map((item, i) => (
          <li key={i}>
            {item.icon != null && (
              <span aria-hidden className="flex text-[var(--brand)] [&_svg]:size-5">
                {item.icon}
              </span>
            )}
            <Heading className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{item.title}</Heading>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── CTA band ────────────────────────────────────────────────────────────── */

export interface CtaBandProps extends Omit<ComponentPropsWithoutRef<"section">, "title" | "children">, ActionProps {
  /** The band's `h2`: the last ask. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Replaces the action pair ({@link LandingActions}). */
  actions?: ReactNode;
  /** Default `h2`. */
  headingAs?: HeadingLevel;
  labels?: Partial<LandingLabels>;
}

/**
 * The closing band before the footer (§4.1.5): a centred `h2`, a subtitle, and the same
 * action pair as the hero.
 */
export function CtaBand({
  title,
  subtitle,
  actions,
  headingAs: Heading = "h2",
  session,
  access,
  demoHref,
  openAppHref,
  labels,
  className,
  ...rest
}: CtaBandProps) {
  return (
    <section
      {...rest}
      data-slot="landing-cta"
      className={cn("border-t border-[var(--border)] bg-[var(--bg-surface)]", className)}
    >
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Heading className="text-2xl font-semibold tracking-tight text-balance text-[var(--text-primary)] sm:text-3xl">
          {title}
        </Heading>
        {subtitle != null && <p className="mx-auto mt-3 max-w-xl text-[var(--text-secondary)]">{subtitle}</p>}
        <div className="mt-8">
          {actions ?? (
            <LandingActions
              session={session}
              access={access}
              demoHref={demoHref}
              openAppHref={openAppHref}
              align="center"
              labels={labels}
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────── */

export interface PublicFooterProps extends Omit<LegalFooterProps, "children"> {
  /** The app's line under the legal links: "Self-hosted household budgeting." */
  tagline?: ReactNode;
}

/**
 * The public pages' footer (§4.1.6): the kit's {@link LegalFooter} — the three legal
 * links — with the app's tagline under them. keksdose's `SiteFooter`, which was already
 * this.
 */
export function PublicFooter({ tagline, ...rest }: PublicFooterProps) {
  return <LegalFooter {...rest}>{tagline}</LegalFooter>;
}
