/**
 * What a built module imports, and everything it reaches — the one scanner behind "this
 * entry imports no package" (refactor audit 2026-10-30, DUP-13). verify-package checked
 * that six times with three regexes, and only one of them followed a relative import: a
 * `testing/*.js` that imported `../lib/x.js` reaching React passed, and `import "x"` or
 * `import("x")` slipped past the `from`-only ones.
 *
 * For emitted ES modules (dist/, an installed package), not source: every `from "…"`,
 * `import "…"` and `import("…")`, in either quote. A relative specifier resolves the way
 * Node resolves dist's (fix-esm-extensions writes the `.js`): the path itself, else
 * `.js`, else `/index.js`.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

/** The specifiers `file` imports, in order, each once. */
export function importsOf(file) {
  return [...new Set([...readFileSync(file, "utf8").matchAll(SPECIFIER)].map((m) => m[1]))];
}

const isFile = (path) => existsSync(path) && statSync(path).isFile();

/** The file a relative specifier names, from `from`'s directory. */
export function resolveRelative(from, specifier) {
  const base = join(dirname(from), specifier);
  const found = [base, `${base}.js`, join(base, "index.js")].find(isFile);
  if (!found) throw new Error(`${from} imports ${specifier}, which resolves to no file`);
  return found;
}

/**
 * Everything `entry` reaches: `files`, the modules walked (entry included), and
 * `packages`, every bare specifier any of them imports (`react`, `node:fs`, …).
 */
export function closure(entry) {
  const files = new Set();
  const packages = new Set();
  const walk = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const specifier of importsOf(file)) {
      if (specifier.startsWith(".")) walk(resolveRelative(file, specifier));
      else packages.add(specifier);
    }
  };
  walk(entry);
  return { files, packages };
}
