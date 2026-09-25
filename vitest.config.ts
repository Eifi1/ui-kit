import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { SHOWCASE_ALIAS } from "./showcase/alias";

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
  // Vitest does NOT read showcase/vite.config.ts, so the alias has to be repeated
  // here from the one shared definition. Without it the showcase render test would
  // resolve `@eifi1/ui-kit` to the published package in node_modules — i.e. test a
  // different build of the kit than the page it is testing.
  resolve: { alias: SHOWCASE_ALIAS },
  test: {
    // 20s, not vitest's 5s. `npm run check` is a BLOCKING pre-push gate and runs the
    // suite with coverage instrumentation, every file in parallel: there the keyboard
    // walks (data-table sorting, measured-grid, mini-calendar) took just over 5s on a
    // developer machine and failed a push that was fine. A real hang still fails.
    testTimeout: 20_000,
    globals: true,
    environment: "jsdom",
    // Pin the suite's timezone, for the same reason Keksdose does: since dev#471
    // `lib/dates.ts` answers with the LOCAL calendar day, and a test that pins that
    // is only meaningful somewhere that is not UTC — on a UTC runner the old (broken)
    // UTC implementation and the current one agree, so the regression test would pass
    // against the bug.
    env: { TZ: "Europe/Berlin" },
    clearMocks: true,
    // Vitest stubs every stylesheet with an EMPTY STRING by default, and it does so
    // by file extension — `tokens.css?raw` is stubbed too, so a test that reads the
    // token sheet as text gets "" and happily reports no drift. Narrowed to the one
    // file rather than `css: true`: the showcase's stylesheet pulls in Tailwind, and
    // processing it in every test run would cost seconds per file to produce CSS no
    // assertion reads. See theme/__tests__/tokens-css-mirror.test.ts.
    css: { include: [/tokens\.css/] },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "showcase/src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      // What a coverage number here is FOR: this package is consumed as source by
      // three applications, so an untested module is not "untested code" — it is a
      // module three products depend on that nothing in this repository renders.
      // Only the shipped modules count. Tests measuring themselves is circular, the
      // showcase is a demo harness rather than product code, and `src/test` is the
      // harness itself.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "**/__tests__/**", "showcase/**"],
      /**
       * A RATCHET, not a target. Measured 2026-09-22 against the whole suite:
       * lines 77.16%, statements 74.53%, functions 68.90%, branches 67.98%. Each
       * floor sits ~1pp under what was actually achieved, which is enough room for
       * an ordinary refactor and not enough to lose a suite.
       *
       * Deliberately not a round 80: a threshold the suite fails on the day it lands
       * is deleted the week after, and the number is then worse than none — it
       * taught everyone that this check is noise. Raise these when the real figure
       * rises, in the same commit that earns it, exactly like
       * `scripts/check-token-discipline.mjs`'s BUDGET.
       *
       * Functions and branches are the low pair on purpose: the untested remainder
       * is mostly event handlers on components nothing renders here (the audit's
       * list), so the honest way up is rendering those components, not asserting
       * harder on the ones already covered.
       */
      thresholds: { lines: 76, statements: 73, functions: 67, branches: 66 },
    },
  },
});
