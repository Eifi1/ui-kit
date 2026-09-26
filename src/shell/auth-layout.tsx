import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card } from "../components/ui";

/**
 * `extends ComponentPropsWithoutRef<"div">` because this is the page's outermost element
 * — the one that owns `min-h-dvh` and the safe-area padding — so there is nothing a
 * consumer could wrap it in to add an id or a `data-*` hook without breaking that.
 */
export interface AuthLayoutProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  /** The brand mark (an SVG), drawn in a brand-coloured tile above the title. */
  logo?: ReactNode;
  /** `false` draws `logo` as it is, without the tile — for a full-colour logo image. */
  logoTile?: boolean;
  /** The page's `<h1>`: the product name on sign-in, "Verify email", "Imprint". */
  title?: ReactNode;
  /** The muted line under the title. */
  description?: ReactNode;
  /** The card's content — the form, the status, the legal text. */
  children: ReactNode;
  /**
   * Above the header, outside the card — the legal pages' "← Back to sign in" link, or
   * a notice banner. Start-aligned in both widths.
   */
  back?: ReactNode;
  /** The top-end corner: a `LanguageMenu`. */
  languageMenu?: ReactNode;
  /** The top-end corner, before the language menu: a `ThemeToggle`. */
  themeToggle?: ReactNode;
  /** Below the card, centred — the legal links. */
  footer?: ReactNode;
  /** Wraps the footer in a `<nav>` with this name ("Legal"). Without it, a plain block. */
  footerLabel?: string;
  /**
   * - `"narrow"` (default) — a `max-w-sm` card centred on the page, header centred:
   *   sign-in, register, verify email, two-factor.
   * - `"wide"` — a `max-w-3xl` column from the top of the page, header start-aligned:
   *   running text (imprint, privacy, terms), which reads badly centred.
   */
  width?: "narrow" | "wide";
  /** `false` lays the header and content on the page itself, without the card's
   *  surface and border — the legal pages. Default true. */
  card?: boolean;
  /** Extra classes for the card (or, with `card={false}`, the content column). */
  cardClassName?: string;
}

/** Keeps the page clear of a notch, the rounded corners and the home indicator on a
 *  phone in `viewport-fit=cover`; 1rem where the platform reports no inset. Physical
 *  left/right, because that is what `env()` reports. */
const SAFE_AREA: CSSProperties = {
  paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
  paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
  paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
  paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
};

const FOOTER_CLASS =
  "flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] [&_a:hover]:text-[var(--text-primary)] [&_a:hover]:underline [&_a]:rounded-sm [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-[var(--brand)]";

/**
 * The public page frame outside the app shell: sign-in, registration, email
 * verification, two-factor — and, `width="wide"`, the legal pages.
 *
 * kastlan's login, register, verify-email and two-factor pages each repeat the same
 * `min-h-screen` centring, the absolutely placed language switcher, the brand tile, the
 * centred title + subtitle and an absolutely placed legal footer. Absolutely placed,
 * the footer and the switcher sat ON the card on a short phone screen (a tall register
 * form, or the software keyboard up); here they are rows of a column that grows with
 * its content, so the page scrolls instead of overlapping.
 *
 * The corner controls, the `<main>` and the footer are in reading order: a screen
 * reader meets the language switch first, which is where someone who cannot read the
 * page's language needs it.
 */
export function AuthLayout({
  logo,
  logoTile = true,
  title,
  description,
  children,
  back,
  languageMenu,
  themeToggle,
  footer,
  footerLabel,
  width = "narrow",
  card = true,
  cardClassName,
  className,
  style,
  ...rest
}: AuthLayoutProps) {
  const wide = width === "wide";
  const hasCorner = languageMenu != null || themeToggle != null;
  const hasHeader = logo != null || title != null || description != null;

  const header = hasHeader && (
    <div
      data-slot="auth-layout-header"
      className={cn("flex flex-col gap-1.5", wide ? "items-start text-start" : "items-center text-center")}
    >
      {logo != null &&
        (logoTile ? (
          <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-[var(--brand)] text-[var(--brand-contrast)] [&_svg]:size-6">
            {logo}
          </div>
        ) : (
          <div className="mb-2">{logo}</div>
        ))}
      {title != null && (
        <h1
          className={cn(
            "font-semibold leading-tight text-[var(--text-primary)]",
            wide ? "text-2xl md:text-3xl" : "text-2xl",
          )}
        >
          {title}
        </h1>
      )}
      {description != null && <p className="text-sm text-[var(--text-muted)]">{description}</p>}
    </div>
  );

  const body = (
    <>
      {header}
      <div className={cn(hasHeader && (wide ? "mt-6" : "mt-5"))}>{children}</div>
    </>
  );

  return (
    <div
      {...rest}
      data-auth-layout={width}
      style={{ ...SAFE_AREA, ...style }}
      className={cn("flex min-h-dvh flex-col bg-[var(--bg-page)] text-[var(--text-primary)]", className)}
    >
      {hasCorner && (
        <div data-slot="auth-layout-corner" className="flex items-center justify-end gap-1">
          {themeToggle}
          {languageMenu}
        </div>
      )}
      <main
        className={cn(
          // `relative` contains any `sr-only` child (see AppShell's <main>).
          "relative flex w-full flex-1 flex-col",
          wide ? "py-6 md:py-10" : "items-center justify-center py-8",
        )}
      >
        <div className={cn("mx-auto w-full", wide ? "max-w-3xl" : "max-w-sm")}>
          {back != null && <div className="mb-4">{back}</div>}
          {card ? (
            <Card className={cn(wide ? "p-6 md:p-8" : "p-6", cardClassName)}>{body}</Card>
          ) : (
            <div className={cardClassName}>{body}</div>
          )}
        </div>
      </main>
      {footer != null && footer !== false && (
        <footer className="pt-4">
          {footerLabel ? (
            <nav aria-label={footerLabel} className={FOOTER_CLASS}>
              {footer}
            </nav>
          ) : (
            <div className={FOOTER_CLASS}>{footer}</div>
          )}
        </footer>
      )}
    </div>
  );
}
