import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { TourProvider } from "@eifi1/ui-kit";
import { Showcase } from "../showcase";
import { LocaleProvider } from "../i18n";
import { preloadAllSections } from "../lib/lazy-section";

/**
 * What every test file that mounts the whole showcase shares: the environment it needs
 * and the real tree it renders. It was copied into showcase.test.tsx and search.test.tsx;
 * 0.28.1 split their per-page tests across shard files (pages-shard-*.test.tsx), so the
 * copies would have become six.
 *
 * Why the split (0.28.1, Marcel asked the suites to be profiled): a test FILE runs on one
 * worker, so the two files that mounted every page — 47 s and 34 s of a 100 s run — set
 * the run's floor however many cores there were, and each page was mounted twice, once
 * per file. One check per page, spread over four files, mounts each page once and lets
 * the workers share it.
 */

/** Mounting every component in the kit is slow, and slower under the coverage run of
 *  `npm run check`; raised per file rather than globally so other suites stay honest. */
export const MOUNT_TIMEOUT_MS = 60_000;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const PROTO = Element.prototype as unknown as { scrollIntoView?: () => void };
const JSDOM_HAS_IT = "scrollIntoView" in Element.prototype;

/**
 * Registers the file's hooks:
 * - every lazy section loaded up front (lib/lazy-section.ts), so a page renders in one
 *   synchronous pass and a test asserts right after render(), not on a Suspense
 *   fallback; the lazy path itself is covered by lazy-section.test.tsx;
 * - a ResizeObserver stub, and recharts' 0×0 warnings silenced — expected in jsdom, and
 *   noise that would bury a real failure;
 * - `scrollIntoView` where the file asks for it (the search jumps to an anchor);
 * - after each test, the persisted locale and `<html dir/lang>` cleared: both live
 *   outside React's tree and outside `cleanup()`, so a test that picks Hungarian would
 *   otherwise hand it to the next one.
 */
export function useShowcaseEnvironment({ scrollIntoView = false }: { scrollIntoView?: boolean } = {}): void {
  beforeAll(() => preloadAllSections(), 60_000);
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    if (scrollIntoView && !JSDOM_HAS_IT) PROTO.scrollIntoView = () => {};
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    if (scrollIntoView && !JSDOM_HAS_IT) delete PROTO.scrollIntoView;
  });
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
  });
}

/**
 * The real tree from main.tsx at `path`: the locale provider ABOVE the shell, because it
 * owns `<html dir>` and the whole frame is laid out from that. Without it `useT` falls
 * back to English and the language menu would set nothing — the bug these tests exist
 * to keep fixed. `extra` renders beside the shell, inside the router (a location probe).
 */
export function renderShowcase(path: string, extra?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocaleProvider>
        <TourProvider>
          <Showcase />
          {extra}
        </TourProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}
