import { createElement, lazy } from "react";
import type { ComponentType, FunctionComponent } from "react";

/**
 * A section component, loaded on first render instead of with the page.
 *
 * The showcase mounts every export of the kit, and imported statically that was one
 * ~1.8 MB chunk: the Overview page downloaded recharts, every chart demo and the data
 * table to show some prose. Each section file is now its own chunk, fetched when a page
 * that renders it is opened. `routes.tsx` declares them as
 *
 *   const Fields = lazySection(() => import("./sections/fields"), "Fields");
 *
 * and `scripts/gen-showcase-search-index.mjs` reads exactly that shape, so keep the
 * loader an inline arrow around a literal `import("./sections/…")` and the name a
 * string literal.
 *
 * Why not bare `React.lazy`: a lazy component suspends on its first render even when
 * its module is already in memory — it cannot be preloaded into a synchronous render.
 * That would put every test that renders a page behind a Suspense ping (and React's
 * "suspended resource finished loading" act() warning). Here a section whose module has
 * loaded renders synchronously, whether through `preload()` (see `preloadAllSections`)
 * or after its first lazy render.
 */
type Section<P = object> = ComponentType<P> & { preload: () => Promise<void> };
type PropsOf<C> = C extends ComponentType<infer P> ? P : never;

const registry: Section<never>[] = [];

export function lazySection<M, K extends keyof M & string>(
  load: () => Promise<M>,
  name: K,
): Section<PropsOf<M[K]>> {
  type P = PropsOf<M[K]>;
  let loaded: ComponentType<P> | undefined;
  let pending: Promise<void> | undefined;
  const preload = () =>
    (pending ??= load().then(
      (mod) => {
        loaded = mod[name] as ComponentType<P>;
      },
      (error: unknown) => {
        pending = undefined; // a failed fetch (a deploy replaced the chunk) may be retried
        throw error;
      },
    ));
  const Lazy = lazy(() => preload().then(() => ({ default: loaded! })));
  function LazySection(props: P) {
    // P is only known per call site; the element itself needs no more than "some props".
    return createElement((loaded ?? Lazy) as FunctionComponent<object>, props as object);
  }
  LazySection.displayName = `Lazy(${name})`;
  const section = Object.assign(LazySection, { preload });
  registry.push(section as Section<never>);
  return section;
}

/** Load every section module up front — for the tests, which render pages synchronously. */
export function preloadAllSections(): Promise<void[]> {
  return Promise.all(registry.map((s) => s.preload()));
}
