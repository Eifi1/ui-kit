import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "../lib/cn";
import { useNoIndex } from "../hooks/use-noindex";
import { PublicFooter } from "./landing-sections";
import { usePageSeoIf, type PageSeo } from "./page-seo";

export interface PublicPageProps extends Omit<ComponentPropsWithRef<"div">, "title" | "children"> {
  /** The app's public header — the one a signed-out visitor already sees on the landing
   *  (`PublicHeader`, keksdose's `LandingHeader`, Kurvenschmiede's). */
  header?: ReactNode;
  /** Default: `<PublicFooter />`, the three legal links (§3.3: one click away from every
   *  page a visitor can reach). Pass your own `PublicFooter` for a tagline; `null` for none. */
  footer?: ReactNode;
  /** The page's heading. */
  title: ReactNode;
  /** One or two sentences under the title: what the page is. */
  description?: ReactNode;
  /** Above the title — the app's "← Back" link (`<TextLink icon={ArrowLeft}>`). */
  back?: ReactNode;
  /** Beside the title from `sm` up, under it on a phone: the page's own controls (a
   *  region and a month picker on keksdose's /prices). */
  actions?: ReactNode;
  /**
   * What search engines are told, and it has no default on purpose: a public page is
   * either one to find — then it names its canonical path (and title, description,
   * structured data), through {@link usePageSeo} — or one to keep out of the index
   * (`"noindex"`: a 404, a page a link was sent for). `null` declares nothing, for a page
   * that is not the page: a preview inside another (the showcase).
   */
  seo: PageSeo | "noindex" | null;
  /** The column. `"wide"` (default) is the landing's sections' width, for tiles and
   *  tables; `"prose"` the legal pages' reading column. */
  width?: "wide" | "prose";
  /** Default `h1`; a lower level for a page shown inside another (a preview), as the
   *  landing's sections take one. */
  headingAs?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** `false` draws the column as a `<div>` instead of `<main>`, for a host that has its
   *  own `<main>`. Default true. */
  landmark?: boolean;
  children: ReactNode;
}

const WIDTH = { wide: "max-w-6xl", prose: "max-w-3xl" } as const;

/**
 * A public page that is not the landing and not a legal page (0.51, Marcel 2026-10-26):
 * keksdose's regional price snapshot at /prices, and Kurvenschmiede's public pages. The
 * frame every public page has — the app's public header, a column, the public footer — is
 * {@link LegalPage}'s, without the legal parts: no numbered sections, no beta notice, no
 * "Back to home" of its own, and indexed unless it says otherwise.
 *
 * keksdose was about to compose it by hand (`PublicHeader` + a column + `PublicFooter` +
 * `usePageSeo`), and Kurvenschmiede had drawn its visitor pages inside the app shell with
 * a footer bolted on (visitor-legal-footer.tsx); the next app would have drawn a third.
 * The width is the landing's (`max-w-6xl`), so a link from a feature row lands on a page
 * whose edges line up with the one it came from.
 *
 * `seo` is required: a public page is found or it is not, and forgetting the canonical on
 * a page meant to be found is silent. The kit's words are none — the title, the copy and
 * the back link are the app's.
 */
export function PublicPage({
  header,
  footer,
  title,
  description,
  back,
  actions,
  seo,
  width = "wide",
  headingAs: Heading = "h1",
  landmark = true,
  className,
  children,
  ...rest
}: PublicPageProps) {
  useNoIndex(seo === "noindex");
  usePageSeoIf(seo === "noindex" ? null : seo);
  const Main = landmark ? "main" : "div";
  return (
    <div {...rest} data-slot="public-page" className={cn("flex min-h-full flex-col", className)}>
      {header}
      <Main className="flex-1">
        <div data-slot="public-page-column" className={cn("mx-auto w-full px-4 py-12", WIDTH[width])}>
          {back != null && <div className="mb-4 text-sm">{back}</div>}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Heading className="text-3xl font-bold tracking-tight break-words text-primary">{title}</Heading>
              {description != null && <p className="mt-3 max-w-2xl text-lg text-secondary">{description}</p>}
            </div>
            {actions != null && (
              <div data-slot="public-page-actions" className="flex shrink-0 flex-wrap items-center gap-2">
                {actions}
              </div>
            )}
          </div>
          <div className="mt-8 space-y-8">{children}</div>
        </div>
      </Main>
      {footer === undefined ? <PublicFooter /> : footer}
    </div>
  );
}
