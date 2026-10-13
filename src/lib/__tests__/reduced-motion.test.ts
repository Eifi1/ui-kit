import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "../reduced-motion";
import { skipsExitAnimation } from "../../hooks/use-close-transition";

/**
 * DUP-11 (refactor audit 2026-10): one `prefersReducedMotion`. The settings focus said
 * "motion allowed" where there is no `matchMedia`, the exit timers said "no motion"; the
 * one copy answers the platform's default (`no-preference`), and an exit timer asks for
 * the other answer by name.
 */
describe("prefersReducedMotion (lib/reduced-motion)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const media = (reduce: boolean) =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: /prefers-reduced-motion:\s*reduce/.test(query) && reduce,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));

  it("reads the user's setting where it can be asked", () => {
    media(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(skipsExitAnimation()).toBe(true);
    media(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(skipsExitAnimation()).toBe(false);
  });

  it("without matchMedia: motion allowed, the platform default — unless the caller says otherwise", () => {
    expect(typeof window.matchMedia).not.toBe("function");
    expect(prefersReducedMotion()).toBe(false);
    expect(prefersReducedMotion(true)).toBe(true);
    // An exit timer: nothing paints, so a closed overlay is gone at once.
    expect(skipsExitAnimation()).toBe(true);
  });
});
