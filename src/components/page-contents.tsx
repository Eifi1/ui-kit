import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";

/**
 * "On this page": a page's own table of contents, with the section being read marked.
 *
 * Three parts, because an app needs them separately:
 *
 *   - {@link useScrollSpy} — which section is current, from the headings' positions in
 *     a scroll container. No markup; usable for anything that follows the reader.
 *   - {@link PageContents} — the list. `variant="rail"` for beside the page,
 *     `variant="disclosure"` for a collapsed block under the title on narrow screens.
 *   - {@link PageContentsLayout} — the page with the rail sticky on one side of it.
 *
 * Domain-free: the app supplies the entries and how an entry links (`hrefFor`), so it
 * works with any router, including a hash router where `#id` alone would be read as a
 * route.
 */

export interface PageContentsItem {
  /** The id of the heading the entry jumps to. */
  id: string;
  label: ReactNode;
  /** 2 indents the entry under the one before it. */
  level?: 1 | 2;
}

export interface PageContentsLabels {
  /** The heading above the list, and the landmark's accessible name. */
  title: string;
}

export const DEFAULT_PAGE_CONTENTS_LABELS: PageContentsLabels = {
  title: "On this page",
};

export interface UseScrollSpyOptions {
  /** The element that scrolls. Defaults to the viewport. In `AppShell`, pass its
   *  `<main>` — it is the page's scroll container from `md` up. */
  root?: Element | null;
  /**
   * How far down the scroller the "reading line" sits, as a fraction of its height.
   * A section becomes current once its heading passes above it, and stays current
   * until the next heading does — so a long section keeps its entry marked while it
   * is being read, not only while its heading is on screen. Default 0.15: close to
   * the top, so a short section followed by another does not hand its mark to the
   * next one the moment it is scrolled to.
   */
  line?: number;
}

/**
 * The id of the section being read: the last of `ids` whose element has scrolled
 * above the reading line — or the first, before any has.
 */
export function useScrollSpy(ids: readonly string[], options: UseScrollSpyOptions = {}): string | null {
  const { root = null, line = 0.15 } = options;
  const [current, setCurrent] = useState<string | null>(null);
  const key = ids.join("\u0000");

  useEffect(() => {
    if (ids.length === 0) return;
    const scroller: Element | Window = root ?? window;
    const measure = () => {
      const top = root ? root.getBoundingClientRect().top : 0;
      const height = root ? root.clientHeight : window.innerHeight;
      const reading = top + height * line;
      let next = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= reading) next = id;
      }
      // At the very bottom the last sections may never reach the line; the reader
      // who scrolled to the end is reading the end.
      const atEnd = root
        ? root.scrollTop + root.clientHeight >= root.scrollHeight - 2
        : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const scrolled = root ? root.scrollTop : window.scrollY;
      if (atEnd && scrolled > 0) next = ids[ids.length - 1];
      setCurrent(next);
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // `key` stands for `ids`: a new array with the same entries is the same list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, root, line]);

  return current;
}

export interface PageContentsProps extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  items: PageContentsItem[];
  /** The current entry — typically `useScrollSpy(items.map(i => i.id), …)`. */
  activeId?: string | null;
  /** The link for an entry. Default `#id`; under a hash router build it with the
   *  router (react-router's `useHref({ hash: id })` gives `#/page#id`). */
  hrefFor?: (id: string) => string;
  /** `rail` — a list beside the page. `disclosure` — collapsed under a summary line,
   *  for narrow screens where a rail has no room. */
  variant?: "rail" | "disclosure";
  labels?: Partial<PageContentsLabels>;
}

/**
 * The list itself. The current entry gets a brand bar on the list's rule, the brand
 * colour, and `aria-current="location"` — the marker documentation sites use, and the
 * one a screen reader announces.
 */
export function PageContents({
  items,
  activeId,
  hrefFor = (id) => `#${id}`,
  variant = "rail",
  labels,
  className,
  ...rest
}: PageContentsProps) {
  const l = useKitLabels("pageContents", DEFAULT_PAGE_CONTENTS_LABELS, labels);
  const listRef = useRef<HTMLUListElement>(null);
  // The entry just clicked is the current one until the reader scrolls on their own.
  // Without this, jumping to a short section near the end of a page marks whichever
  // later section the jump also carried past the reading line — you click one entry
  // and another lights up.
  const [clicked, setClicked] = useState<string | null>(null);
  useEffect(() => {
    if (!clicked) return;
    const release = () => setClicked(null);
    // A user scroll — wheel, touch, keys — releases it; the programmatic scroll the
    // jump itself causes does not fire these.
    window.addEventListener("wheel", release, { passive: true, once: true });
    window.addEventListener("touchmove", release, { passive: true, once: true });
    window.addEventListener("keydown", release, { once: true });
    return () => {
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", release);
    };
  }, [clicked]);
  const shown = clicked ?? activeId;

  // Keep the current entry in view when the list is taller than the window.
  useEffect(() => {
    if (!shown || variant !== "rail") return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-entry="${CSS.escape(shown)}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [shown, variant]);

  if (items.length === 0) return null;

  const list = (
    <ul
      ref={listRef}
      className={cn(
        "space-y-0.5 border-s border-[var(--border)]",
        variant === "rail" && "max-h-[calc(100dvh-10rem)] overflow-y-auto [scrollbar-width:thin]",
      )}
    >
      {items.map((item) => {
        const current = item.id === shown;
        return (
          <li key={item.id} data-entry={item.id}>
            <a
              href={hrefFor(item.id)}
              // One line per entry in the rail; past 22rem the ellipsis takes over and
              // the full text is on hover. The disclosure has the page's width and wraps.
              title={variant === "rail" && typeof item.label === "string" ? item.label : undefined}
              aria-current={current ? "location" : undefined}
              onClick={() => setClicked(item.id)}
              className={cn(
                "-ms-px block border-s-2 py-1 pe-1 text-[13px] leading-snug transition-colors duration-150",
                variant === "rail" && "truncate",
                item.level === 2 ? "ps-6" : "ps-3",
                current
                  ? "border-[var(--brand)] font-medium text-[var(--brand)]"
                  : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
              )}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "disclosure") {
    return (
      <details
        className={cn(
          "group rounded-md border border-[var(--border)] bg-[var(--bg-surface)]",
          className,
        )}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-[var(--text-secondary)] [&::-webkit-details-marker]:hidden">
          {l.title}
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <nav {...rest} aria-label={l.title} className="border-t border-[var(--border)] px-2 py-2">
          {list}
        </nav>
      </details>
    );
  }

  return (
    <nav {...rest} aria-label={l.title} className={className}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {l.title}
      </p>
      {list}
    </nav>
  );
}

export interface PageContentsLayoutProps extends ComponentPropsWithoutRef<"div"> {
  /** What goes in the rail — typically a `<PageContents variant="rail">`. */
  contents: ReactNode;
  /**
   * Which side of the page the rail sits on: `start` is the left in a left-to-right
   * language (next to the app's own sidebar, so both navigations are in one place),
   * `end` the right (the documentation-site convention, clear of the sidebar). Logical,
   * so both flip in a right-to-left UI.
   */
  position?: "start" | "end";
  children: ReactNode;
}

/**
 * The page with a sticky contents rail beside it, from `xl` (1280px) up. Below that
 * the rail would squeeze the content, so it is not rendered there — pair it with a
 * `<PageContents variant="disclosure" className="xl:hidden">` in the page.
 *
 * The rail is `sticky top-6`, which sticks inside the nearest scroll container — the
 * viewport, or `AppShell`'s `<main>`.
 */
export function PageContentsLayout({
  contents,
  position = "start",
  children,
  className,
  ...rest
}: PageContentsLayoutProps) {
  // In DOM order on its side, not moved there with `order`: Tab and a screen reader
  // follow the source, and a rail painted on the left but read after the page would
  // put the page's index at its end.
  const rail = (
    <aside className="hidden xl:block">
      <div className="sticky top-6">{contents}</div>
    </aside>
  );
  return (
    <div
      {...rest}
      className={cn(
        "xl:grid xl:gap-10",
        // `fit-content(22rem)`: the rail is as wide as its longest entry, up to 22rem.
        // A fixed 13rem broke "Select — unlabelled, labelled, invalid, disabled" over
        // three lines beside a page with room to spare; an index you scan should read
        // one entry per line.
        position === "start"
          ? "xl:grid-cols-[fit-content(22rem)_minmax(0,1fr)]"
          : "xl:grid-cols-[minmax(0,1fr)_fit-content(22rem)]",
        className,
      )}
    >
      {position === "start" && rail}
      <div className="min-w-0">{children}</div>
      {position === "end" && rail}
    </div>
  );
}
