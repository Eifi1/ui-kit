/**
 * @vitest-environment node
 *
 * Node, not jsdom: this file reads the manifest and loads `tsup.config.ts`, and tsup
 * pulls in esbuild, which refuses to start under jsdom ("new TextEncoder().encode(\"\")
 * instanceof Uint8Array" is false there). Nothing here renders.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * What the package MAKES A CONSUMER INSTALL, checked against what it actually imports.
 *
 * Three findings in the 2026-09-22 audit are the same missing check. `flag-icons` was a
 * hard dependency — 5.6 MB of stylesheet and SVG in every consumer's `node_modules` —
 * that no module in `src/` imports, because the flags are class NAMES (`fi fi-xx`) the
 * host's stylesheet paints. `lucide-react` was a hard dependency pinned by `^0.511.0`
 * to one patch line of a 0.x package, while all three consumers declared their own copy.
 * And `recharts`/`react-router` were declared optional peers while the barrel imported
 * them statically, which is the defect that shipped in 0.4.x.
 *
 * All three are invisible to `tsc`, to the test suite (everything is a devDependency
 * here) and to `scripts/verify-package.mjs`, which installs what the manifest declares
 * and therefore believes it. So the manifest is checked against the import graph instead:
 * a runtime dependency nobody imports is dead weight, and an import nobody declares is an
 * install the consumer has to guess at.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

/** Sources that ship, i.e. everything under `src/` that tsup turns into a module. */
function shippedSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "__tests__" && entry !== "test") shippedSources(path, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\./.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Comments first: `src/chart.ts` documents `import("@eifi1/ui-kit/chart")` in prose, and
 * a scanner that counts that is a scanner whose failures get ignored.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[^\n"'`]*?\/\/.*$/gm, "");
}

const STATIC = /^\s*(?:import|export)\s[\s\S]*?\sfrom\s*["']([^"']+)["']/gm;
const BARE = /^\s*import\s+["']([^"']+)["']/gm;
const DYNAMIC = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

/** `zustand/middleware` is an install of `zustand`. */
const packageOf = (specifier: string) =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];

function importedPackages(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of shippedSources(join(ROOT, "src"))) {
    const source = stripComments(readFileSync(file, "utf8"));
    for (const pattern of [STATIC, BARE, DYNAMIC]) {
      for (const [, specifier] of source.matchAll(pattern)) {
        if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
        const name = packageOf(specifier);
        found.set(name, [...(found.get(name) ?? []), file.slice(ROOT.length + 1)]);
      }
    }
  }
  return found;
}

describe("packaging contract", () => {
  const imported = importedPackages();

  it("scans a source tree that plausibly contains the whole package", () => {
    // A regex that silently stops matching turns every assertion below into a pass.
    expect(shippedSources(join(ROOT, "src")).length).toBeGreaterThan(60);
    expect([...imported.keys()].sort()).toContain("react");
  });

  it("declares every package src imports", () => {
    const declared = new Set([
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
    ]);
    const undeclared = [...imported.keys()].filter((name) => !declared.has(name));
    expect(undeclared, "imported by src but in neither dependencies nor peerDependencies").toEqual(
      [],
    );
  });

  it("installs no runtime dependency that nothing imports", () => {
    // The `flag-icons` shape: a dependency that exists to document a contract instead of
    // stating it. The contract (the host supplies the stylesheet) is in the README now.
    const unused = Object.keys(pkg.dependencies).filter((name) => !imported.has(name));
    expect(unused, "in dependencies but imported nowhere in src/").toEqual([]);
  });

  it("keeps lucide-react a peer the consumer can version", () => {
    // Every consumer declares lucide-react itself; as a dependency here they each got a
    // second copy, and `^0.511.0` on a 0.x package is a PATCH pin — it held all three
    // behind a line that has since reached 1.x. A range is what makes it their choice.
    expect(pkg.dependencies["lucide-react"]).toBeUndefined();
    const range = pkg.peerDependencies["lucide-react"];
    expect(range).toBeDefined();
    expect(range, "a caret/tilde range on 0.x pins the patch line").not.toMatch(/^[\^~]?0\./);
    // …and still pinned for this repo's own build and tests, where the version is ours.
    expect(pkg.devDependencies["lucide-react"]).toBeDefined();
  });

  it("keeps flag-icons available to the showcase without shipping it", () => {
    expect(pkg.dependencies["flag-icons"]).toBeUndefined();
    expect(pkg.peerDependencies["flag-icons"]).toBeUndefined();
    expect(pkg.devDependencies["flag-icons"]).toBeDefined();
  });
});

/**
 * Every module this package emits is a component, a hook, or a helper those call, so
 * the RSC boundary is the package edge. Without the directive a consumer on a server-
 * component default gets the error from inside `node_modules`, pointing at a file its
 * author never wrote.
 */
describe("the build marks the package as client code", () => {
  it("emits a \"use client\" banner", async () => {
    const config = (await import("../../tsup.config")).default as { banner?: { js?: string } };
    expect(config.banner?.js).toBe('"use client";');
  });
});
