#!/usr/bin/env node
/**
 * Generate the README's export inventory from the build, instead of by hand.
 *
 * The hand-written inventory named 93 of 263 exports; 167 were never mentioned anywhere —
 * and the part it did name went stale in the direction that costs most, advertising five
 * wizard exports through 0.4.0 and 0.4.1 that had already been deleted. A list nobody can
 * finish is a list nobody can trust, and it is the npm landing page.
 *
 * `dist/index.d.ts` is already the answer: it is the barrel, compiled. So the inventory is
 * a re-render of what the build produces, not a document. Each name is listed under the
 * module that DECLARES it, in the order the barrel first reaches that module.
 *
 * The declarations are tsc's, one `.d.ts` per module (scripts/build-dts.mjs, TST-3), so
 * the barrel is mostly `export * from "./components/button.js"`, and a module may re-export
 * another's names. Following that by hand is what TypeScript's checker does: it answers
 * which names an entry exports, where each is declared, and whether it is a value or a
 * type (a `type`-only re-export counts as a type). Until 0.34 the declarations were
 * rollup-plugin-dts chunks with content-hashed names, which this script had to trace back
 * by regex; reading them through the checker does not care about the layout.
 *
 * The STANDALONE entries follow the barrel, one table each from the entry's own `.d.ts`
 * (0.52, refactor audit 2026-10-30 DOC-4). They share no name with the barrel
 * (public-surface.test.ts holds that), so until 0.52 the inventory — which apps' agents read
 * from node_modules — counted `/sync`, `/offline`, `/rhf` and `/dates` and named none of
 * their members, and said everything was reachable from the barrel: kastlan imports
 * `/sync` in 19 files and could not find `createSyncEngine` in it. An entry is standalone
 * when it exports a name the barrel does not; a re-slicing exports only barrel names (the
 * same test refuses anything else), so nothing here keeps a list that could drift.
 *
 * Usage:
 *   node scripts/gen-export-inventory.mjs           rewrite the block in README.md
 *   node scripts/gen-export-inventory.mjs --check    exit 1 if the block is stale
 *
 * Both need `npm run build` to have run: this reads `dist/`, which is gitignored.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const README = join(ROOT, "README.md");

const BEGIN = "<!-- BEGIN GENERATED: exports — node scripts/gen-export-inventory.mjs -->";
const END = "<!-- END GENERATED: exports -->";

/** Areas in the order the barrel introduces them; anything unlisted sorts after, by name. */
const AREA_TITLES = {
  lib: "lib — pure helpers",
  hooks: "hooks",
  theme: "theme, palettes, colour",
  components: "components",
  shell: "shell",
  feedback: "feedback",
  wizard: "wizard",
  tour: "tour",
  search: "search",
  root: "root",
};

/* ── The build, read through TypeScript ───────────────────────────────────── */

/** `dist/components/ui.d.ts` → `components/ui`, POSIX-separated on every platform. */
const moduleId = (fileName) =>
  relative(DIST, fileName)
    .replace(/\\/g, "/")
    .replace(/\.d\.ts$/, "");

const entryName = (subpath) => (subpath === "." ? "@eifi1/ui-kit" : `@eifi1/ui-kit/${subpath.slice(2)}`);

/**
 * The entry points with a declaration file of their own, in `exports` order. A pattern
 * (`./i18n/*` → `./dist/i18n/locales/*.d.ts`) is one entry per declaration file it
 * matches, in name order, each carrying the pattern's name as its `family`.
 */
function entryPoints() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  return Object.entries(pkg.exports).flatMap(([subpath, target]) => {
    const dts = typeof target === "object" ? target.types : null;
    if (!dts) return [];
    if (!dts.includes("*"))
      return existsSync(join(ROOT, dts)) ? [{ name: entryName(subpath), file: join(ROOT, dts) }] : [];
    const [dir, suffix] = dts.split("*");
    if (!dir.endsWith("/") || suffix.includes("/") || !existsSync(join(ROOT, dir))) return [];
    return readdirSync(join(ROOT, dir))
      .filter((file) => file.endsWith(suffix))
      .sort()
      .map((file) => ({
        name: entryName(subpath.replace("*", file.slice(0, -suffix.length))),
        file: join(ROOT, dir, file),
        family: entryName(subpath),
      }));
  });
}

function readBuild() {
  if (!existsSync(join(DIST, "index.d.ts"))) {
    console.error("dist/index.d.ts not found — run `npm run build` first.");
    process.exit(2);
  }
  const entries = entryPoints();
  const program = ts.createProgram(
    entries.map((e) => e.file),
    {
      noEmit: true,
      skipLibCheck: true,
      types: [],
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  );
  const checker = program.getTypeChecker();
  const exportsOf = (file) => {
    const symbol = checker.getSymbolAtLocation(program.getSourceFile(file));
    return symbol ? checker.getExportsOfModule(symbol) : [];
  };
  return { program, checker, entries, exportsOf };
}

/** A package entry point (`index`, `chart`, …): top-level in dist/, never a name's home. */
const isEntryPoint = (id) => !id.includes("/");

/**
 * The module an exported name is listed under, and whether the importer gets a type.
 *
 * A pass-through re-export (`export { X } from "../lib/clipping"`, or `export *`) is
 * followed to the module that declares X. A module that imports a name and exports it as
 * its own (`import { X } from "./x-labels"; export { X };` — how each component offers
 * its `DEFAULT_*_LABELS` since 0.34) is where X is listed: that is the module an app reads
 * it from. `export type` (or `import type`) anywhere on the way makes X a type for the
 * importer, whatever X is.
 */
function describe(checker, symbol, entry = "dist/index.d.ts") {
  let current = symbol;
  let typeOnly = false;
  let owner = null;
  while (current.flags & ts.SymbolFlags.Alias) {
    const declaration = current.declarations?.[0];
    if (current.declarations?.some((d) => ts.isTypeOnlyImportOrExportDeclaration(d))) typeOnly = true;
    if (!owner && declaration && ts.isExportSpecifier(declaration) && !declaration.parent.parent.moduleSpecifier) {
      const id = moduleId(declaration.getSourceFile().fileName);
      if (!isEntryPoint(id)) owner = id;
    }
    const next = checker.getImmediateAliasedSymbol(current);
    if (!next || next === current) break;
    current = next;
  }
  const declaration = current.declarations?.[0];
  if (!declaration || current.flags & ts.SymbolFlags.Alias) {
    // A re-export of something that is not there: the declarations are broken, and a
    // README listing it would only hide that.
    console.error(`✖ ${entry} exports \`${symbol.name}\`, which resolves to no declaration.`);
    process.exit(2);
  }
  return {
    id: owner ?? moduleId(declaration.getSourceFile().fileName),
    isType: typeOnly || !(current.flags & ts.SymbolFlags.Value),
  };
}

/**
 * The barrel, as `[{ id, names: [{ name, isType }] }]`. Modules come in the order the
 * barrel names them (its curated order). A subpath entry it re-exports whole
 * (`export * from "./chart.js"`, since 0.34, MOD-5) is read in place, its modules in the
 * order that entry names them. A module it reaches only through another module's
 * re-export comes after those.
 */
function inventory({ program, checker, exportsOf }) {
  const indexFile = join(DIST, "index.d.ts");
  const modules = new Map();
  const nameModules = (fileName) => {
    for (const statement of program.getSourceFile(fileName).statements.filter(ts.isExportDeclaration)) {
      const target = statement.moduleSpecifier && checker.getSymbolAtLocation(statement.moduleSpecifier);
      const file = target?.declarations?.[0]?.getSourceFile().fileName;
      if (!file) continue;
      if (isEntryPoint(moduleId(file))) nameModules(file);
      else if (!modules.has(moduleId(file))) modules.set(moduleId(file), []);
    }
  };
  nameModules(indexFile);
  for (const symbol of exportsOf(indexFile)) {
    const { id, isType } = describe(checker, symbol);
    if (!modules.has(id)) modules.set(id, []);
    modules.get(id).push({ name: symbol.name, isType });
  }
  return [...modules].filter(([, names]) => names.length > 0).map(([id, names]) => ({ id, names }));
}

/**
 * The standalone entries, as `[{ title, label, rows: [{ key, names }] }]`, in `exports`
 * order. A plain entry is one table, a row per module that declares its names, in the
 * order the entry first reaches them. A pattern's entries share one table, a row each.
 */
function standaloneInventory({ checker, entries, exportsOf }) {
  const barrel = new Set(exportsOf(entries[0].file).map((symbol) => symbol.name));
  const sections = new Map();
  for (const entry of entries.slice(1)) {
    const symbols = exportsOf(entry.file);
    if (!symbols.some((symbol) => !barrel.has(symbol.name))) continue;
    const named = symbols.map((symbol) => ({ symbol, ...describe(checker, symbol, entry.name) }));
    if (entry.family) {
      if (!sections.has(entry.family))
        sections.set(entry.family, { title: entry.family, label: "Entry point", rows: [] });
      sections.get(entry.family).rows.push({
        key: entry.name,
        names: named.map(({ symbol, isType }) => ({ name: symbol.name, isType })),
      });
      continue;
    }
    const modules = new Map();
    for (const { symbol, id, isType } of named) {
      if (!modules.has(id)) modules.set(id, []);
      modules.get(id).push({ name: symbol.name, isType });
    }
    sections.set(entry.name, {
      title: entry.name,
      label: "Module",
      rows: [...modules].map(([key, names]) => ({ key, names })),
    });
  }
  return [...sections.values()];
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

const byName = (a, b) => a.name.localeCompare(b.name, "en");

function renderNames(names) {
  const values = names.filter((n) => !n.isType).sort(byName);
  const typeNames = names.filter((n) => n.isType).sort(byName);
  return [...values.map((n) => `\`${n.name}\``), ...typeNames.map((n) => `_\`${n.name}\`_`)].join(", ");
}

function renderEntryPoints({ entries, exportsOf }) {
  const rows = entries.map(({ name, file }) => `| \`${name}\` | ${exportsOf(file).length} |`);
  return ["| Entry point | Names |", "|---|---|", ...rows].join("\n");
}

function render(build) {
  const groups = inventory(build);
  const total = groups.reduce((n, g) => n + g.names.length, 0);
  const typeCount = groups.reduce((n, g) => n + g.names.filter((x) => x.isType).length, 0);
  const standalone = standaloneInventory(build);
  const standaloneEntries = standalone.reduce((n, s) => n + (s.label === "Module" ? 1 : s.rows.length), 0);
  const standaloneTotal = standalone.reduce((n, s) => n + s.rows.reduce((m, r) => m + r.names.length, 0), 0);

  const areas = new Map();
  for (const group of groups) {
    const area = group.id.includes("/") ? group.id.split("/")[0] : "root";
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area).push(group);
  }

  const out = [
    BEGIN,
    "",
    `**${total} names from ${groups.length} modules** in the main barrel — ${total - typeCount} values and ` +
      `${typeCount} types — and ${standaloneTotal} more in ${standaloneEntries} standalone entries. ` +
      "_Italic_ is a type-only export.",
    "",
    "Generated from `dist/index.d.ts` and each standalone entry's own `.d.ts` by",
    "`node scripts/gen-export-inventory.mjs`; the counts are pinned by",
    "`src/__tests__/public-surface.test.ts`. Do not edit between the markers.",
    "",
    renderEntryPoints(build),
    "",
    "The main barrel's names first; the standalone entries follow and share no name with it.",
    "Every other subpath is a re-slicing of the barrel, never a second API.",
    "",
  ];

  for (const [area, members] of areas) {
    out.push(`### ${AREA_TITLES[area] ?? area}`, "", "| Module | Exports |", "|---|---|");
    for (const group of members) {
      out.push(`| \`${group.id}\` | ${renderNames(group.names)} |`);
    }
    out.push("");
  }

  for (const section of standalone) {
    out.push(`### ${section.title} (standalone)`, "", `| ${section.label} | Exports |`, "|---|---|");
    for (const row of section.rows) out.push(`| \`${row.key}\` | ${renderNames(row.names)} |`);
    out.push("");
  }

  out.push(END);
  return out.join("\n");
}

/* ── Write, or refuse ─────────────────────────────────────────────────────── */

const build = readBuild();
const block = render(build);
const readme = readFileSync(README, "utf8");
const start = readme.indexOf(BEGIN);
const stop = readme.indexOf(END);

if (start === -1 || stop === -1) {
  console.error(`README.md has no generated-exports block. Add the markers:\n${BEGIN}\n${END}`);
  process.exit(2);
}

const current = readme.slice(start, stop + END.length);

if (process.argv.includes("--check")) {
  if (current === block) {
    console.log("README export inventory is current.");
    process.exit(0);
  }
  // Naming what is missing, not just "differs": the failure this guards against is an
  // export the README never mentions, and that is the sentence worth printing.
  const documented = new Set([...current.matchAll(/`([A-Za-z0-9_$]+)`/g)].map((m) => m[1]));
  const missing = [
    ...inventory(build).flatMap((g) => g.names),
    ...standaloneInventory(build).flatMap((s) => s.rows.flatMap((r) => r.names)),
  ]
    .map((n) => n.name)
    .filter((name) => !documented.has(name));
  console.error("README export inventory is stale — run `node scripts/gen-export-inventory.mjs`.");
  if (missing.length) {
    console.error(`${missing.length} export(s) the README does not name:\n  ${missing.join("\n  ")}`);
  }
  process.exit(1);
}

writeFileSync(README, readme.slice(0, start) + block + readme.slice(stop + END.length));
console.log(`README export inventory written: ${block.split("\n").length} lines.`);
