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

  it("asks for a React that has every React API src imports", () => {
    // BUG-13 (refactor audit 2026-10): five modules import `useEffectEvent`, stable only
    // from React 19.2, while the peers said `>=19`. On 19.0 or 19.1 the build refuses the
    // import, or the sign-in page throws "useEffectEvent is not a function". An API newer
    // than 19.0 goes in this table with its first version, and the floor follows it.
    const SINCE: Record<string, [major: number, minor: number]> = { useEffectEvent: [19, 2] };
    const NAMED_FROM_REACT = /^\s*import\s*\{([^}]*)\}\s*from\s*["']react["']/gm;
    const used = new Set<string>();
    for (const file of shippedSources(join(ROOT, "src"))) {
      for (const [, names] of stripComments(readFileSync(file, "utf8")).matchAll(NAMED_FROM_REACT)) {
        for (const name of names.split(",")) used.add(name.trim().replace(/^type\s+/, ""));
      }
    }
    // Not vacuous: the scan must see the hook that made this test.
    expect(used).toContain("useEffectEvent");
    const need = [...used]
      .map((name) => SINCE[name])
      .filter(Boolean)
      .reduce<[number, number]>((a, b) => (b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) ? b : a), [19, 0]);
    for (const peer of ["react", "react-dom"]) {
      const floor = /^>=\s*(\d+)(?:\.(\d+))?/.exec(pkg.peerDependencies[peer] ?? "");
      expect(floor, `${peer}'s peer range starts with >=`).not.toBeNull();
      const [major, minor] = [Number(floor![1]), Number(floor![2] ?? 0)];
      expect(
        major > need[0] || (major === need[0] && minor >= need[1]),
        `${peer} peer ${pkg.peerDependencies[peer]} is below ${need.join(".")}`,
      ).toBe(true);
    }
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

/**
 * 0.45 (docs/local-first-harmonization.md §1.6): the persisted query cache needs TanStack
 * Query and idb-keyval, optional peers of `@eifi1/ui-kit/offline` alone — the same rule as
 * react-hook-form's. An app that never persists a cache installs none of them.
 */
describe("the offline peers stay behind @eifi1/ui-kit/offline", () => {
  const PEERS = [
    "@tanstack/react-query",
    "@tanstack/react-query-persist-client",
    "@tanstack/query-async-storage-persister",
    "idb-keyval",
  ];

  it.each(PEERS)("%s is imported by the offline entry's modules and nowhere else", (peer) => {
    const importers = importedPackages().get(peer) ?? [];
    expect(importers.length).toBeGreaterThan(0);
    const outside = importers.filter((file) => !/^src\/offline(\.ts|\/)/.test(file));
    expect(outside, `${peer} imported outside src/offline*`).toEqual([]);
  });

  it.each(PEERS)("%s is an optional peer, and a devDependency for this repo's own tests", (peer) => {
    expect(pkg.peerDependencies[peer]).toBeDefined();
    expect(pkg.peerDependenciesMeta?.[peer]?.optional).toBe(true);
    expect(pkg.devDependencies[peer]).toBeDefined();
    expect(pkg.dependencies[peer]).toBeUndefined();
  });

  it("none is reached from the main barrel, however deep the re-export", () => {
    const fromBarrel = packagesReachedFrom("src/index.ts");
    expect(fromBarrel).toContain("react");
    for (const peer of PEERS) expect(fromBarrel).not.toContain(peer);
    const fromOffline = packagesReachedFrom("src/offline.ts");
    for (const peer of PEERS) expect(fromOffline).toContain(peer);
  });

  it("is an exports entry", () => {
    expect(pkg.exports["./offline"]).toEqual({ types: "./dist/offline.d.ts", import: "./dist/offline.js" });
  });
});

/**
 * 0.46 (docs/local-first-harmonization.md §2.3): Dexie is an optional peer of
 * `@eifi1/ui-kit/sync` alone. `/offline` stays importable without it, and `/sync` never loads
 * `/offline`'s TanStack and idb-keyval peers: the leaf utilities both export live in one
 * module that reaches no package.
 */
describe("dexie stays behind @eifi1/ui-kit/sync", () => {
  const OFFLINE_PEERS = [
    "@tanstack/react-query",
    "@tanstack/react-query-persist-client",
    "@tanstack/query-async-storage-persister",
    "idb-keyval",
  ];

  it("is imported by the sync entry's modules and nowhere else", () => {
    const importers = importedPackages().get("dexie") ?? [];
    expect(importers.length).toBeGreaterThan(0);
    expect(importers.filter((file) => !/^src\/sync(\.ts|\/)/.test(file))).toEqual([]);
  });

  it("is an optional peer, and a devDependency for this repo's own tests", () => {
    expect(pkg.peerDependencies.dexie).toBeDefined();
    expect(pkg.peerDependenciesMeta?.dexie?.optional).toBe(true);
    expect(pkg.devDependencies.dexie).toBeDefined();
    expect(pkg.dependencies.dexie).toBeUndefined();
  });

  it("/sync reaches dexie and none of /offline's peers; /offline and the barrel never reach dexie", () => {
    const fromSync = packagesReachedFrom("src/sync.ts");
    expect(fromSync).toContain("dexie");
    for (const peer of OFFLINE_PEERS) expect(fromSync).not.toContain(peer);
    expect(packagesReachedFrom("src/offline.ts")).not.toContain("dexie");
    expect(packagesReachedFrom("src/index.ts")).not.toContain("dexie");
    expect([...packagesReachedFrom("src/offline/local-first.ts")]).toEqual([]);
    expect([...packagesReachedFrom("src/sync/testing.ts")]).toEqual([]);
  });

  it("are exports entries", () => {
    expect(pkg.exports["./sync"]).toEqual({ types: "./dist/sync.d.ts", import: "./dist/sync.js" });
    expect(pkg.exports["./sync/testing"]).toEqual({ types: "./dist/sync/testing.d.ts", import: "./dist/sync/testing.js" });
  });
});

describe("@eifi1/ui-kit/testing is pure (0.33)", () => {
  // The guard an app runs from its own test suite (docs/colour-roles-harmonization.md
  // §8.3): browser-safe like the rest of the kit, so it runs under jsdom or node alike.
  it("reaches no package at all — no React, no node:fs", () => {
    expect([...packagesReachedFrom("src/testing/index.ts")]).toEqual([]);
  });

  it("is an exports entry", () => {
    expect(pkg.exports["./testing"]).toEqual({
      types: "./dist/testing/index.d.ts",
      import: "./dist/testing/index.js",
    });
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

describe("@eifi1/ui-kit/dates is pure (MOD-6)", () => {
  // kastlan imports it on 8 lines, keksdose on 2; until 0.34 nothing pinned it.
  it("reaches no package at all — date strings need no React", () => {
    expect([...packagesReachedFrom("src/lib/dates.ts")]).toEqual([]);
  });

  it("is an exports entry", () => {
    expect(pkg.exports["./dates"]).toEqual({
      types: "./dist/lib/dates.d.ts",
      import: "./dist/lib/dates.js",
    });
  });
});

/**
 * `@eifi1/ui-kit/currencies` is read by an app's BUILD, in Node, when Vite loads its config:
 * keksdose's flag subset takes its country codes from it (0.35). Until then that plugin
 * parsed `country: "xx"` out of dist/components/currency-select.js, 0.34 moved the list, and
 * 91 of its test files failed at load. So the entry is data and nothing else — not even
 * another kit module, whose own imports could reach React or a stylesheet later.
 * scripts/verify-package.mjs imports it by package name in plain Node.
 */
describe("@eifi1/ui-kit/currencies is pure data (0.35)", () => {
  it("imports nothing — no package, no stylesheet, no other kit module", () => {
    expect(specifiersOf(join(ROOT, "src/currencies.ts"))).toEqual([]);
    expect([...packagesReachedFrom("src/currencies.ts")]).toEqual([]);
  });

  it("is what the pickers read, so the data and the flags cannot drift", () => {
    const readers = shippedSources(join(ROOT, "src"))
      .filter((file) => specifiersOf(file).some((s) => isRelative(s) && resolveRelative(file, s) === join(ROOT, "src/currencies.ts")))
      .map((file) => file.slice(ROOT.length + 1));
    expect(readers).toEqual(expect.arrayContaining(["src/components/currency-option-list.tsx", "src/components/number-input.tsx"]));
  });

  it("is an exports entry", () => {
    expect(pkg.exports["./currencies"]).toEqual({
      types: "./dist/currencies.d.ts",
      import: "./dist/currencies.js",
    });
  });
});

/**
 * recharts is ~433 KB, and keeping it out of every app's entry chunk is why the build is
 * unbundled at all (tsup.config.ts). The barrel re-exports the chart kit, so it does reach
 * recharts (asserted above) — but only through the chart kit's own modules. A component
 * outside it that imports recharts (a tooltip borrowing a chart helper, say) would put it
 * behind every Button, and no check saw that until 0.34 (MOD-6, refactor audit 2026-10).
 * The same rule as react-hook-form's: a peer belongs to the modules of its entry.
 */
describe("recharts stays inside the chart kit (MOD-6)", () => {
  it("is imported only by modules @eifi1/ui-kit/chart exports", () => {
    const entry = join(ROOT, "src/chart.ts");
    const chartModules = new Set(
      specifiersOf(entry)
        .filter(isRelative)
        .map((specifier) => resolveRelative(entry, specifier))
        .filter((file): file is string => file !== null)
        .map((file) => file.slice(ROOT.length + 1)),
    );
    const importers = importedPackages().get("recharts") ?? [];
    // Not vacuous: the chart itself must be seen importing it, and be on the entry.
    expect(importers).toContain("src/components/chart.tsx");
    expect(chartModules).toContain("src/components/chart.tsx");
    const outside = importers.filter((file) => !chartModules.has(file));
    expect(outside, "recharts imported by a module src/chart.ts does not export").toEqual([]);
  });
});

/**
 * README's "What you install alongside it" table, against the manifest (DOC-3, refactor
 * audit 2026-10). CONTRIBUTING calls the table load-bearing: it is what an app installs
 * from. It had drifted twice over — `recharts >=3` against a declared `>=3.8`, and the
 * optional `modern-screenshot` missing — because nothing compared the two.
 */
describe("README's install table says what package.json declares (DOC-3)", () => {
  const lines = readFileSync(join(ROOT, "README.md"), "utf8").split("\n");
  const heading = lines.indexOf("### What you install alongside it");
  const start = lines.findIndex((line, i) => i > heading && line.startsWith("| Package"));
  const end = lines.findIndex((line, i) => i > start && !line.startsWith("|"));
  /** Package → its row's "Declared as" cell; a row may name several packages. */
  const table = new Map<string, string>();
  for (const line of lines.slice(start + 2, end)) {
    const [, packages = "", declared = ""] = line.split("|").map((cell) => cell.trim());
    for (const [, name] of packages.matchAll(/`([^`]+)`/g)) table.set(name, declared);
  }
  const peerRow = (declared: string) => ({
    peer: declared.startsWith("peer"),
    range: /`([^`]+)`/.exec(declared)?.[1],
    optional: /\*\*optional\*\*/.test(declared),
  });

  it("finds the table", () => {
    expect(heading).toBeGreaterThan(-1);
    expect(table.size).toBeGreaterThan(5);
  });

  it("lists every peer with its range, and says which are optional", () => {
    const rows = Object.keys(pkg.peerDependencies).map((name) => [name, peerRow(table.get(name) ?? "")]);
    const declared = Object.entries(pkg.peerDependencies).map(([name, range]) => [
      name,
      { peer: true, range, optional: pkg.peerDependenciesMeta?.[name]?.optional === true },
    ]);
    expect(rows).toEqual(declared);
  });

  it("names no peer the manifest does not declare", () => {
    const extra = [...table]
      .filter(([name, declared]) => peerRow(declared).peer && !(name in pkg.peerDependencies))
      .map(([name]) => name);
    expect(extra).toEqual([]);
  });

  it("lists exactly the runtime dependencies", () => {
    const listed = [...table].filter(([, declared]) => declared === "dependency").map(([name]) => name);
    expect(listed.sort()).toEqual(Object.keys(pkg.dependencies).sort());
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
