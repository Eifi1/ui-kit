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
export default defineConfig({
  entry: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.*", "!src/test/**", "!src/vite-env.d.ts"],
  format: ["esm"],
  outDir: "dist",
  bundle: false,
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});
