// Minimal ambient typing for the Vite-injected `import.meta.env` so the package
// type-checks standalone (consumers provide the real values at build time).
interface ImportMetaEnv {
  readonly DEV: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
