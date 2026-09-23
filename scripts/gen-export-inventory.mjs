#!/usr/bin/env node
/**
 * Generate the README's export inventory from the build, instead of by hand.
 *
 * The hand-written inventory named 93 of 263 exports; 167 were never mentioned anywhere —
 * and the part it did name went stale in the direction that costs most, advertising five
 * wizard exports through 0.4.0 and 0.4.1 that had already been deleted. A list nobody can
 * finish is a list nobody can trust, and it is the npm landing page.
 *
 * `dist/index.d.ts` is already the answer: tsup's declaration rollup emits one
 * `export { … } from './<module>.js'` line per source module, in the barrel's own curated
 * order. So the inventory is a re-render of a file the build produces, not a document.
 *
 * Two wrinkles the rollup introduces, both handled below:
 *   - it hoists shared declarations into a CONTENT-HASHED chunk
 *     (`data-table-filters-aXyf0Xub.d.ts`) whose name changes whenever those declarations
 *     change. Printed raw it would be both meaningless to a reader and a source of README
 *     churn on every build, so each name is traced back to the module that re-exports it.
 *   - it drops the `type` markers in `index.d.ts` but keeps them in the per-module files,
 *     so the value/type split is recovered from those.
 *
 * Usage:
 *   node scripts/gen-export-inventory.mjs           rewrite the block in README.md
 *   node scripts/gen-export-inventory.mjs --check    exit 1 if the block is stale
 *
 * Both need `npm run build` to have run: this reads `dist/`, which is gitignored.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const SRC = join(ROOT, "src");
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

/* ── Parsing ──────────────────────────────────────────────────────────────── */

/**
 * Every `export { … }` statement in a `.d.ts`, with its entries.
 *
 * `local` is the name as the declaring module knows it and `exported` the name the
 * importer sees — they differ only for the rollup chunk, where `type ColumnFilter as C`
 * mangles the alias. Both are needed: the type marker travels with `local`, and the chunk
 * is traced by `exported`.
 */
function parseExports(text) {
  const statements = [];
  const re = /export\s+(type\s+)?\{([^}]*)\}\s*(?:from\s*['"]([^'"]+)['"])?\s*;/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const allTypes = Boolean(m[1]);
    const entries = [];
    for (const raw of m[2].split(",")) {
      const part = raw.trim();
      if (!part) continue;
      const entry = /^(type\s+)?([A-Za-z0-9_$]+)(?:\s+as\s+([A-Za-z0-9_$]+))?$/.exec(part);
      if (!entry) continue;
      entries.push({
        local: entry[2],
        exported: entry[3] ?? entry[2],
        isType: allTypes || Boolean(entry[1]),
      });
    }
    statements.push({ from: m[3] ?? null, entries });
  }
  return statements;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** `./components/ui.js` → `components/ui`. */
function moduleId(specifier) {
  return specifier.replace(/^\.\//, "").replace(/\.js$/, "");
}

/** A module id backed by a real source file; anything else is a rollup chunk. */
function isSourceModule(id) {
  return existsSync(join(SRC, `${id}.ts`)) || existsSync(join(SRC, `${id}.tsx`));
}

/* ── The build, read once ─────────────────────────────────────────────────── */

function readBuild() {
  if (!existsSync(join(DIST, "index.d.ts"))) {
    console.error("dist/index.d.ts not found — run `npm run build` first.");
    process.exit(2);
  }

  const files = walk(DIST).map((full) => ({
    // POSIX-normalised so the chunk trace works the same on Windows.
    id: relative(DIST, full).replace(/\\/g, "/").replace(/\.d\.ts$/, ""),
    statements: parseExports(readFileSync(full, "utf8")),
  }));

  const types = new Set();
  // chunk id + the alias it exports under → the module that re-exports it under a real name.
  const fromChunk = new Map();

  for (const file of files) {
    // Top-level `dist/*.d.ts` are the package's own entry points (index, chart, shell, …).
    // They re-export the chunk under the SAME mangled aliases as the module that owns it,
    // so letting them answer the trace would attribute DataTable to `data-table` the
    // subpath rather than to `components/data-table` the module it lives in.
    const isEntryPoint = !file.id.includes("/");
    for (const statement of file.statements) {
      for (const entry of statement.entries) {
        if (entry.isType) types.add(entry.local);
      }
      if (!statement.from || isEntryPoint) continue;
      const target = moduleId(statement.from.replace(/^\.\.\//, "").replace(/^\.\//, ""));
      if (isSourceModule(target)) continue;
      for (const entry of statement.entries) {
        const key = `${target}::${entry.local}`;
        // Deterministic when two modules re-export the same declaration: shortest id wins,
        // which is the one nearest the declaration rather than a barrel above it.
        const held = fromChunk.get(key);
        if (!held || file.id.length < held.length) fromChunk.set(key, file.id);
      }
    }
  }

  return { files, types, fromChunk };
}

/** The barrel, as `[{ id, names: [{ name, isType }] }]` in `index.d.ts` order. */
function inventory({ files, types, fromChunk }) {
  const index = files.find((f) => f.id === "index");
  const modules = new Map();

  for (const statement of index.statements) {
    if (!statement.from) continue;
    const declared = moduleId(statement.from);
    for (const entry of statement.entries) {
      // `entry.local` here is the chunk's mangled alias, which is what the owning module
      // re-exports it under — the key the trace above was built with.
      const id = isSourceModule(declared)
        ? declared
        : (fromChunk.get(`${declared}::${entry.local}`) ?? declared);
      if (!modules.has(id)) modules.set(id, []);
      modules.get(id).push({ name: entry.exported, isType: types.has(entry.exported) });
    }
  }

  return [...modules].map(([id, names]) => ({ id, names }));
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

const byName = (a, b) => a.name.localeCompare(b.name, "en");

function renderNames(names) {
  const values = names.filter((n) => !n.isType).sort(byName);
  const typeNames = names.filter((n) => n.isType).sort(byName);
  return [
    ...values.map((n) => `\`${n.name}\``),
    ...typeNames.map((n) => `_\`${n.name}\`_`),
  ].join(", ");
}

function renderEntryPoints(files) {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const rows = [];
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    const dts = typeof target === "object" ? target.types : null;
    if (!dts) continue;
    const id = dts.replace(/^\.\/dist\//, "").replace(/\.d\.ts$/, "");
    const file = files.find((f) => f.id === id);
    if (!file) continue;
    // Distinct names, across re-exports AND own declarations: the rollup entry points are
    // all `export { … } from`, but a single-module subpath like `./dates` declares its
    // exports in the same file and lists them with no `from` at all.
    const names = new Set(file.statements.flatMap((s) => s.entries.map((e) => e.exported)));
    const name = subpath === "." ? "@eifi1/ui-kit" : `@eifi1/ui-kit/${subpath.slice(2)}`;
    rows.push(`| \`${name}\` | ${names.size} |`);
  }
  return ["| Entry point | Names |", "|---|---|", ...rows].join("\n");
}

function render(build) {
  const groups = inventory(build);
  const total = groups.reduce((n, g) => n + g.names.length, 0);
  const typeCount = groups.reduce((n, g) => n + g.names.filter((x) => x.isType).length, 0);

  const areas = new Map();
  for (const group of groups) {
    const area = group.id.includes("/") ? group.id.split("/")[0] : "root";
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area).push(group);
  }

  const out = [
    BEGIN,
    "",
    `**${total} names from ${groups.length} modules** — ${total - typeCount} values and ` +
      `${typeCount} types. _Italic_ is a type-only export.`,
    "",
    "Generated from `dist/index.d.ts` by `node scripts/gen-export-inventory.mjs`; the count",
    "is pinned by `src/__tests__/public-surface.test.ts`. Do not edit between the markers.",
    "",
    renderEntryPoints(build.files),
    "",
    "Everything below is reachable from the main `@eifi1/ui-kit` barrel. The subpaths are a",
    "re-slicing of it, never a second API.",
    "",
  ];

  for (const [area, members] of areas) {
    out.push(`### ${AREA_TITLES[area] ?? area}`, "", "| Module | Exports |", "|---|---|");
    for (const group of members) {
      out.push(`| \`${group.id}\` | ${renderNames(group.names)} |`);
    }
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
  const missing = inventory(build)
    .flatMap((g) => g.names.map((n) => n.name))
    .filter((name) => !documented.has(name));
  console.error("README export inventory is stale — run `node scripts/gen-export-inventory.mjs`.");
  if (missing.length) {
    console.error(`${missing.length} export(s) the README does not name:\n  ${missing.join("\n  ")}`);
  }
  process.exit(1);
}

writeFileSync(README, readme.slice(0, start) + block + readme.slice(stop + END.length));
console.log(`README export inventory written: ${block.split("\n").length} lines.`);
