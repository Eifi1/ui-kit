// The showcase's one build-time variable, merged into the package's ambient
// `ImportMetaEnv` (src/vite-env.d.ts) rather than declared there: it is the showcase's,
// and the package must not learn about it.
interface ImportMetaEnv {
  /**
   * keksdose's API base for the live kit review (`https://…/api/v1`). Set by the Pages
   * build from the repository variable `REVIEW_API_BASE` (.github/workflows/ci.yml);
   * absent in a local dev server and in a fork, where the page says it is not configured.
   */
  readonly VITE_REVIEW_API_BASE?: string;
}
