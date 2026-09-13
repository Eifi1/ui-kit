// Minimal ambient typing for the Vite-injected `import.meta.env` so the package
// type-checks standalone (consumers provide the real values at build time).
interface ImportMetaEnv {
  readonly DEV: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
  /**
   * Vite's compile-time glob. Declared here rather than by pulling in
   * `vite/client` (which drags every asset-module shim with it) or `@types/node`
   * (which this package deliberately does not depend on — it ships browser code).
   *
   * It is what lets a TEST read the package's own sources: `field-invalid.test.tsx`
   * sweeps the component directory to find a field-shaped control that forgot a
   * prop, which is the kind of guard the consumer app writes with `readFileSync`
   * and cannot be written that way here.
   */
  glob<T = unknown>(
    pattern: string,
    options?: { query?: string; import?: string; eager?: boolean },
  ): Record<string, T>;
}
