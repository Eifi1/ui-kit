import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * The first test harness this package has ever had (refactor plan 2026-08-24, U-1).
 *
 * 62 modules and ~12,600 lines, consumed by three applications, were defended by
 * `tsc --noEmit` alone. The consumers' suites do exercise this code, but only
 * through rendered pages: they assert what a screen shows, so they cannot fail for
 * a pure helper returning the wrong string unless some screen happens to render it.
 * U-2 — a money field reading its own output back as arithmetic — is exactly that
 * shape, and a five-line test would have caught it the day it was written.
 *
 * Deliberately a copy of the lead consumer's config rather than a new dialect, so a
 * test can move between the two repositories unchanged.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    // Pin the suite's timezone, for the same reason Keksdose does: since dev#471
    // `lib/dates.ts` answers with the LOCAL calendar day, and a test that pins that
    // is only meaningful somewhere that is not UTC — on a UTC runner the old (broken)
    // UTC implementation and the current one agree, so the regression test would pass
    // against the bug.
    env: { TZ: "Europe/Berlin" },
    clearMocks: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
  },
});
