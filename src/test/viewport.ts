import { vi } from "vitest";
import { viewportMatchMedia, type ViewportOptions } from "../testing/viewport";

/**
 * The viewport stubs for the kit's own tests (refactor audit 2026-10, TST-10). The
 * stubs themselves ship in `@eifi1/ui-kit/testing` (src/testing/viewport.ts), so the
 * apps run the same ones; this adds the shapes this suite reaches for, on
 * `vi.stubGlobal`, so a file's `afterEach(() => vi.unstubAllGlobals())` undoes them.
 *
 * jsdom has no `matchMedia`, which every kit hook reads as the DESKTOP layout; a test
 * that wants the phone shape stubs it.
 */
export {
  setViewportWidth,
  stubResizeObserver,
  stubViewportWidth,
  viewportMatchMedia,
  type ResizeObserverStub,
  type ViewportOptions,
} from "../testing/viewport";

/** A phone in portrait: below every `max-*` breakpoint up to `sm`, at every text size. */
export const PHONE_WIDTH = 375;
/** A laptop: at or above `lg` at Normal text, and `md` even at Extra large (1152 px). */
export const DESKTOP_WIDTH = 1280;

/**
 * The phone layout: `usePhoneLayout()`'s `(width < 768px)` matches — `(width < 960px)` at
 * Large — and the `options` features (a finger, reduced motion …). Was eight private
 * copies of a stub that answered `query.includes("width <")`, which this matches query
 * for query at every breakpoint the kit has. Undone by `vi.unstubAllGlobals()`, which
 * it also returns — so `beforeEach(stubPhone)` undoes itself after each test.
 */
export function stubPhone(options: ViewportOptions = {}): () => void {
  vi.stubGlobal("matchMedia", viewportMatchMedia(PHONE_WIDTH, options));
  return () => vi.unstubAllGlobals();
}

/** The desktop layout, with a `matchMedia` to answer from (the `options` features) —
 *  where the absent one, jsdom's desktop fallback, will not do. Undone like
 *  {@link stubPhone}. */
export function stubDesktop(options: ViewportOptions = {}): () => void {
  vi.stubGlobal("matchMedia", viewportMatchMedia(DESKTOP_WIDTH, options));
  return () => vi.unstubAllGlobals();
}
