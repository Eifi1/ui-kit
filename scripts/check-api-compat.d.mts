// Types for the parts of check-api-compat.mjs its test imports (src/__tests__/api-compat.test.ts).

export interface ApiChange {
  kind: string;
  entry: string;
  name: string;
  detail: string;
  /** The flagged types the change only shows through; empty for a change of its own. */
  through: string[];
}
export interface CheckApiOptions {
  /** The repository: its package.json's version, its tags and its docs/. */
  root?: string;
  log?: (line: string) => void;
  env?: Record<string, string | undefined>;
  /** The published versions; by default the root's tags and the registry. */
  published?: Iterable<string>;
  /** The package directory of a release; by default `npm pack`ed into `dir`. */
  pack?: (version: string, dir: string) => string;
}
export interface CheckApiResult {
  ok: boolean;
  skipped?: boolean;
  previous?: string;
  changes: ApiChange[];
  unannounced: ApiChange[];
}
export function compareVersions(a: string, b: string): number;
export function previousRelease(version: string, published: Iterable<string>): string | null;
export function compareApi(oldDir: string, newDir: string): ApiChange[];
export function mustChangeNames(markdown: string): Set<string>;
export function isNamed(name: string, names: Iterable<string>): boolean;
export function adoptTextSince(previous: string, docsDir?: string): { file: string; text: string }[];
export function checkApi(newDir: string, options?: CheckApiOptions): CheckApiResult;
