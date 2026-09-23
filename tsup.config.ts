import { defineConfig } from "tsup";

// `bundle: false` is the load-bearing setting, not a default.
//
// This package's barrel re-exports every component, including components/chart,
// which statically imports recharts. A bundling build would fuse those modules
// into one chunk, and the `sideEffects` field in package.json could no longer
// help a consumer drop what it does not use — importing a Button would pull all
// ~433KB of recharts into the consumer's ENTRY chunk, which is the exact
// regression the sideEffects note in package.json was written to prevent.
//
// With bundling off, tsup transpiles one output file per source module, so the
// module graph consumers tree-shake against is the same one they got when this
// package was consumed as raw source over `file:`.
//
// The `"use client"` banner goes on EVERY emitted module, which is the honest answer
// for this package: there is no server-safe half of it. Every module is a component, a
// hook, or a helper those call, and the entry points a consumer can reach are all
// browser code. Without the directive an app on the React Server Components default
// (Next's app router, and whatever property-management adopts) gets "You're importing a
// component that needs useState" from inside node_modules, with a stack pointing at a
// file its author did not write — the consumer's only fix being a "use client" wrapper
// per component.
//
// It is a directive prologue, so it must be the first thing in the file; `banner`
// prepends before the imports, which is where it has to be. Plain Node ignores it (a
// string expression statement), which `scripts/verify-package.mjs` proves by importing
// every entry point by package name. Rollup will warn `MODULE_LEVEL_DIRECTIVE` when it
// inlines one of these into a chunk that has none — noise in the consumer's build log,
// and the price of the directive being per-module.
export default defineConfig({
  entry: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.*", "!src/test/**", "!src/vite-env.d.ts"],
  format: ["esm"],
  outDir: "dist",
  bundle: false,
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  banner: { js: '"use client";' },
});
