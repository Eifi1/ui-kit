/**
 * @vitest-environment node
 *
 * Node, not jsdom: this file reads the manifest and loads `tsup.config.ts`, and tsup
 * pulls in esbuild, which refuses to start under jsdom ("new TextEncoder().encode(\"\")
 * instanceof Uint8Array" is false there). Nothing here renders.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  devDependencies: Record<string, string>;
  exports: Record<string, unknown>;
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

/** Every import specifier in one module, relative ones included. */
function specifiersOf(file: string): string[] {
  const source = stripComments(readFileSync(file, "utf8"));
  return [STATIC, BARE, DYNAMIC].flatMap((pattern) =>
    [...source.matchAll(pattern)].map(([, specifier]) => specifier),
  );
}

const isRelative = (specifier: string) => specifier.startsWith(".") || specifier.startsWith("/");

function importedPackages(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of shippedSources(join(ROOT, "src"))) {
    for (const specifier of specifiersOf(file)) {
      if (isRelative(specifier)) continue;
      const name = packageOf(specifier);
      found.set(name, [...(found.get(name) ?? []), file.slice(ROOT.length + 1)]);
    }
  }
  return found;
}

/** `./foo` from a module, as tsc resolves it: extensionless, or a directory index. */
function resolveRelative(from: string, specifier: string): string | null {
  const base = resolve(dirname(from), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * The packages an ENTRY POINT reaches, following its relative imports to the end —
 * what a consumer's bundler and typecheck actually load for `import … from` it. A file
 * scan cannot answer this: a module that imports react-hook-form is harmless until the
 * barrel re-exports it, and then it is every consumer's install.
 */
function packagesReachedFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const specifier of specifiersOf(file)) {
      if (!isRelative(specifier)) packages.add(packageOf(specifier));
      else {
        const next = resolveRelative(file, specifier);
        if (next) walk(next);
      }
    }
  };
  walk(join(ROOT, entry));
  return packages;
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
 * react-hook-form is an OPTIONAL peer, and the promise that makes is "install the kit
 * without it and nothing you import breaks". The main barrel shipped a react-hook-form
 * hook once and removed it for exactly that (see the wizard section of src/index.ts);
 * `@eifi1/ui-kit/rhf` is the isolated answer, and these hold the isolation.
 */
describe("react-hook-form stays behind @eifi1/ui-kit/rhf", () => {
  it("is imported by the rhf entry's modules and nowhere else", () => {
    const importers = importedPackages().get("react-hook-form") ?? [];
    // Not vacuous: the adapter itself must be seen importing it.
    expect(importers.length).toBeGreaterThan(0);
    const outside = importers.filter((file) => !/^src\/rhf(\.ts|\/)/.test(file));
    expect(outside, "react-hook-form imported outside src/rhf*").toEqual([]);
  });

  it("is an optional peer, and a devDependency for this repo's own tests", () => {
    expect(pkg.peerDependencies["react-hook-form"]).toBeDefined();
    expect(pkg.peerDependenciesMeta?.["react-hook-form"]?.optional).toBe(true);
    expect(pkg.devDependencies["react-hook-form"]).toBeDefined();
    expect(pkg.dependencies["react-hook-form"]).toBeUndefined();
  });

  it("is not reached from the main barrel, however deep the re-export", () => {
    const fromBarrel = packagesReachedFrom("src/index.ts");
    // The walk is real: the barrel reaches react and (through components/chart) recharts.
    expect(fromBarrel).toContain("react");
    expect(fromBarrel).toContain("recharts");
    expect(fromBarrel).not.toContain("react-hook-form");
    expect(packagesReachedFrom("src/rhf.ts")).toContain("react-hook-form");
  });

  it("is an exports entry", () => {
    expect(pkg.exports["./rhf"]).toEqual({ types: "./dist/rhf.d.ts", import: "./dist/rhf.js" });
  });
});

describe("@eifi1/ui-kit/table-text is pure", () => {
  it("reaches no package at all — no React, nothing for a script or a worker to install", () => {
    expect([...packagesReachedFrom("src/table-text.ts")]).toEqual([]);
  });

  it("is an exports entry", () => {
    expect(pkg.exports["./table-text"]).toEqual({
      types: "./dist/table-text.d.ts",
      import: "./dist/table-text.js",
    });
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
