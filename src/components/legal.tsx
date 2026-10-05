import type { ReactNode } from "react";

import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { AlertBanner } from "./alert-banner";
import { TextLink } from "./text-link";

/**
 * The legal pages' shell — Imprint, Privacy Policy, Terms — for every app (Marcel,
 * 2026-10-02: every app has them; docs/i18n-harmonization.md H10).
 *
 * keksdose and kastlan each carried the same shell, written twice: a back link, the
 * title, a "closed beta, not yet reviewed by a lawyer" notice, sections of heading +
 * running text, and kastlan's row of links to the three pages with the current one
 * marked. Kurvenschmiede had none. The words stay in each app — they are the app's
 * legal statements, reviewed under the `legal` area of the translation review — and
 * only the shape moves here.
 *
 * A CONTENT COLUMN, not a page: keksdose shows its legal pages inside its public
 * landing header and footer, kastlan inside `AuthLayout` (`width="wide" card={false}`,
 * no title of its own). Both put this inside their chrome; a page-owning layout would
 * have fought one of them.
 */

// ── Labels ────────────────────────────────────────────────────────────────────

export interface LegalLabels {
  /** The accessible name of {@link LegalLinks}' `<nav>`. */
  navLabel: string;
}

export const DEFAULT_LEGAL_LABELS: LegalLabels = {
  navLabel: "Legal",
};

// ── Links ─────────────────────────────────────────────────────────────────────

export interface LegalLink {
  href: string;
  /** "Imprint", "Privacy Policy", "Terms" — the app's words. */
  label: ReactNode;
}

export interface LegalLinksProps {
  links: readonly LegalLink[];
  /** The page being shown; its link is marked `aria-current="page"`. Usually the
   *  router's pathname. */
  currentHref?: string;
  /** `false` renders the links without the `<nav>` landmark — inside `AuthLayout`'s
   *  `footer` or `TopBarActionMenu`'s `footer`, which are named `<nav>`s already. The row
   *  keeps its spacing and `className` either way (0.27.1: it used to return the bare
   *  links, so in a plain container — Kurvenschmiede's account-menu `<li>` — they ran
   *  together as "ImpressumDatenschutzerklärungNutz…" and overflowed). Default true. */
  nav?: boolean;
  labels?: Partial<LegalLabels>;
  className?: string;
}

/** The legal pages as a row of quiet links, the one you are on marked (kastlan's
 *  `LegalLinks`). Wraps on a phone. */
export function LegalLinks({ links, currentHref, nav = true, labels: labelsProp, className }: LegalLinksProps) {
  const labels = useKitLabels("legal", DEFAULT_LEGAL_LABELS, labelsProp);
  const items = links.map((link) => (
    <TextLink key={link.href} href={link.href} tone="muted" current={link.href === currentHref}>
      {link.label}
    </TextLink>
  ));
  const rowClass = cn("flex flex-wrap gap-x-4 gap-y-1 text-xs", className);
  if (!nav) return <div className={rowClass}>{items}</div>;
  return (
    <nav aria-label={labels.navLabel} className={rowClass}>
      {items}
    </nav>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export interface LegalSectionProps {
  heading: ReactNode;
  /** Running text. Line breaks in it are kept (`white-space: pre-line`), so a
   *  translation can hold an address or a list as plain lines. */
  body?: string;
  /** Anything richer than plain text — links, a list — after `body`. */
  children?: ReactNode;
  /** The section's `id`, for a link to it from elsewhere ("see §4"). */
  id?: string;
  /** The heading's element. Default `h2`, under the layout's `h1`. */
  headingAs?: "h2" | "h3";
}

export function LegalSection({ heading, body, children, id, headingAs: Heading = "h2" }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-20">
      <Heading className="text-lg font-semibold text-[var(--text-primary)]">{heading}</Heading>
      {body !== undefined && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p>
      )}
      {children !== undefined && (
        <div className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{children}</div>
      )}
    </section>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export interface LegalLayoutProps {
  /** "Imprint", "Privacy Policy", "Terms". */
  title: ReactNode;
  /** Above the title — the app's "← Back" link (`<TextLink icon={ArrowLeft}>`), whose
   *  target differs per app (keksdose's start page, kastlan's sign-in). */
  back?: ReactNode;
  /**
   * A notice under the title, as a warning banner with `role="note"` — page furniture,
   * not an alert. Both apps say their legal texts await a lawyer's review; keksdose's
   * privacy page says something more precise than the others (its technical sections
   * describe running code), so the notice is per page, not per layout.
   */
  notice?: ReactNode;
  /** The sections — {@link LegalSection}s. */
  children: ReactNode;
  /** The three pages, linked at the end of the column with the current one marked.
   *  Leave out when the page's chrome already shows them (kastlan's AuthLayout footer). */
  links?: readonly LegalLink[];
  currentHref?: string;
  /** Default `h1`: the page's heading. */
  headingAs?: "h1" | "h2";
  /** Extra classes on the column — `px-0 py-0` inside a chrome that pads already. */
  className?: string;
  labels?: Partial<LegalLabels>;
}

export function LegalLayout({
  title,
  back,
  notice,
  children,
  links,
  currentHref,
  headingAs: Heading = "h1",
  className,
  labels,
}: LegalLayoutProps) {
  return (
    <article className={cn("mx-auto w-full max-w-3xl px-4 py-12", className)}>
      {back !== undefined && <div className="mb-4 text-sm">{back}</div>}
      <Heading className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{title}</Heading>
      {notice !== undefined && notice !== null && (
        <AlertBanner tone="warning" role="note" className="mt-4">
          {notice}
        </AlertBanner>
      )}
      <div className="mt-8 space-y-8">{children}</div>
      {links !== undefined && links.length > 0 && (
        <LegalLinks links={links} currentHref={currentHref} labels={labels} className="mt-12 border-t border-[var(--border)] pt-4" />
      )}
    </article>
  );
}
