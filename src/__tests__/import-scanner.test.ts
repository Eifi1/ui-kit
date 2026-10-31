// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closure, importsOf } from "../../scripts/lib/imports.mjs";

/**
 * scripts/lib/imports.mjs, the one scanner behind verify-package's "this entry imports no
 * package" checks (refactor audit 2026-10-30, DUP-13). Three of the six old regexes read
 * only `from "…"`, and five did not follow a relative import.
 */
let dir = "";
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = "";
});

function tree(files: Record<string, string>) {
  dir = mkdtempSync(join(tmpdir(), "uikit-imports-"));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return (name: string) => join(dir, name);
}

describe("importsOf", () => {
  it("reads every import form, in either quote, each once", () => {
    const at = tree({
      "a.js": [
        'import { x } from "pkg-a";',
        "import 'side-effect';",
        'export * from "./b.js";',
        'const lazy = () => import("pkg-b");',
        "const again = () => import ( 'pkg-b' );",
      ].join("\n"),
    });
    expect(importsOf(at("a.js"))).toEqual(["pkg-a", "side-effect", "./b.js", "pkg-b"]);
  });
});

describe("closure", () => {
  it("follows relative imports to the package a module two steps away imports", () => {
    // The case the per-file scans passed: the entry itself imports nothing bare.
    const at = tree({
      "testing/index.js": 'export { a } from "./a.js";\n',
      "testing/a.js": 'import { b } from "../lib/b.js";\nexport const a = b;\n',
      "lib/b.js": 'import "react";\nexport const b = 1;\n',
    });
    const { files, packages } = closure(at("testing/index.js"));
    expect([...packages]).toEqual(["react"]);
    expect([...files].map((f) => f.slice(dir.length + 1))).toEqual(["testing/index.js", "testing/a.js", "lib/b.js"]);
  });

  it("resolves a specifier without its extension, or a directory's index.js, and walks a cycle once", () => {
    const at = tree({
      "entry.js": 'import "./util";\nimport "./dir";\n',
      "util.js": 'import "./entry.js";\n',
      "dir/index.js": "export const nothing = 0;\n",
    });
    const { files, packages } = closure(at("entry.js"));
    expect(files.size).toBe(3);
    expect(packages.size).toBe(0);
  });

  it("fails on a relative import that names no file, rather than passing it", () => {
    const at = tree({ "entry.js": 'import "./gone.js";\n' });
    expect(() => closure(at("entry.js"))).toThrow(/gone\.js, which resolves to no file/);
  });
});
