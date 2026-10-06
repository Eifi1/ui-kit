import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { useNoIndex } from "../hooks/use-noindex";
import { Button } from "../components/ui";
import type { AuthHeadingLevel } from "./status-parts";

/** Every string the page renders — the `notFound` namespace. keksdose's words
 *  (`error.not_found_*`), which kastlan took over. */
export interface NotFoundLabels {
  /** The heading. */
  title: string;
  /** Under it. */
  body: string;
  /** The way out for everyone — to `homeHref`. */
  home: string;
  /** The second way out for someone signed in — to `appHref`. */
  app: string;
}

export const DEFAULT_NOT_FOUND_LABELS: NotFoundLabels = {
  title: "Page not found",
  body: "This address doesn’t exist (any more). It may be a typo, or the page has moved.",
  home: "Go to the start page",
  app: "Back to the app",
};

export interface NotFoundPageProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  /** "Go to the start page". Default `/`, which takes a signed-in user into the app and
   *  anyone else to sign-in in all three apps. */
  homeHref?: string;
  /**
   * "Back to the app", beside it — pass it while someone is signed in. A LITERAL page
   * (keksdose's `/budget`), never the "last visited page" an app restores on start: a
   * stale one of those pointing at a route that is gone is the likeliest way a
   * signed-in user lands here (keksdose's not-found-page.tsx).
   */
  appHref?: string;
  /** App content under the text — a search field, a support address. */
  children?: ReactNode;
  /** `false` adds no `noindex` — for a preview inside another page. Default `true`. */
  noIndex?: boolean;
  /** The heading's level. Default `h2`, under `AuthLayout`'s `h1`; `h1` where the page
   *  stands alone (inside the app shell). */
  headingAs?: AuthHeadingLevel;
  labels?: Partial<NotFoundLabels>;
}

/**
 * What an unknown address renders (the router's catch-all), signed out and signed in —
 * keksdose's `NotFoundPage` (app/not-found-page.tsx, feedback #129), which kastlan took
 * over on `AuthLayout` (docs/auth-harmonization.md §7).
 *
 * In place of the silent `<Navigate to="/">` keksdose had: bouncing every typo, dead link
 * and fabricated URL to the start page is what Search Console reports as a soft 404, and
 * it hid broken links. An SPA cannot send a real 404 status — the web server answers
 * every path with index.html — so the page says it in words and calls
 * {@link useNoIndex}, which makes a crawler drop it (the server's `X-Robots-Tag` is the
 * authoritative half).
 *
 * It is the page's CONTENT, not a frame, so it sits in either: as `AuthLayout`'s child
 * for a visitor (`headingAs` default `h2`, under the layout's title), or bare inside the
 * app shell for someone signed in (`headingAs="h1"`, and `appHref`). The large "404" is
 * decoration — the heading says it in words — and hidden from a screen reader.
 */
export function NotFoundPage({
  homeHref = "/",
  appHref,
  children,
  noIndex = true,
  headingAs: Heading = "h2",
  labels: labelsProp,
  className,
  ...rest
}: NotFoundPageProps) {
  const labels = useKitLabels("notFound", DEFAULT_NOT_FOUND_LABELS, labelsProp);
  useNoIndex(noIndex);
  return (
    <div {...rest} className={cn("flex flex-col items-center gap-2 py-4 text-center", className)}>
      <p aria-hidden className="text-6xl font-bold leading-none tracking-tight text-[var(--text-placeholder)]">
        404
      </p>
      <Heading className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{labels.title}</Heading>
      <p className="max-w-prose text-sm text-[var(--text-secondary)]">{labels.body}</p>
      {children}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button href={homeHref} variant="brand">
          {labels.home}
        </Button>
        {appHref !== undefined && (
          <Button href={appHref} variant="secondary">
            {labels.app}
          </Button>
        )}
      </div>
    </div>
  );
}
