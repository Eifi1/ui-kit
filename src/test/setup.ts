import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library does not unmount between tests on its own when `globals`
// is on and the auto-cleanup hook is not installed. Several suites here assert on
// teardown behaviour (the scroll lock, the overlay history stack), so a tree left
// mounted from the previous test would be indistinguishable from the bug.
afterEach(() => {
  cleanup();
});

// `findBy*` / `waitFor` give up after 1s by default. The suite now runs every file at
// once in reused workers (vmThreads, see vitest.config.ts), and a showcase test that
// waits for a lazily loaded section plus the search dialog took longer than that
// under full load: a pass on one run, a fail on the next. 5s absorbs the load; a real
// hang still fails, and `testTimeout` (20s) still bounds the test.
configure({ asyncUtilTimeout: 5000 });

/**
 * jsdom has no canvas. Its `getContext` already answers `null` — which every canvas
 * user in the kit handles (SignaturePad draws nothing and says so) — but it also
 * prints "Not implemented: HTMLCanvasElement's getContext() method" for every call,
 * and the showcase render tests mount a SignaturePad on each pass over its page:
 * fifteen lines of noise per run that hid anything real. Same answer, no log.
 *
 * A test that needs a 2D context (signature-pad.test) stubs this with `vi.spyOn`,
 * which takes precedence and is restored after it.
 */
// Guarded: a few files run under `@vitest-environment node` (the packaging contract
// reads package.json and the file tree), where there is no DOM to patch at all.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return null;
  } as unknown as HTMLCanvasElement["getContext"];
}
