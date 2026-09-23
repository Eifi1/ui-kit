import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library does not unmount between tests on its own when `globals`
// is on and the auto-cleanup hook is not installed. Several suites here assert on
// teardown behaviour (the scroll lock, the overlay history stack), so a tree left
// mounted from the previous test would be indistinguishable from the bug.
afterEach(() => {
  cleanup();
});

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
