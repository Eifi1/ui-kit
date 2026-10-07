#!/usr/bin/env node
/**
 * The showcase search's example index, extracted from the source rather than kept by hand.
 *
 * Every specimen on a showcase page is an `<Example label="…">`, and its heading id is
 * `slugify(label)` — so the search can jump to a section only if it knows, per page, which
 * labels that page renders. A hand-written list would drift the first time someone adds an
 * example; this reads them out of the code instead.
 *
 * WHY A SCRIPT AND NOT `import.meta.glob(…, { query: "?raw" })`. The raw glob would hand the
 * browser the section files' full source — 1.1 MB of it — to find a few hundred labels, and
 * a regex over that source cannot tell WHICH PAGE a label belongs to: several section files
 * export more than one page's component (`overlays.tsx` is both Dialogs and Popovers), and
 * a page's `Body` in routes.tsx composes several. Answering that needs the syntax tree:
 *
 *   1. routes.tsx: each page object's `slug` and the section components its `Body` renders,
 *      resolved through the file's `lazySection(() => import("./sections/…"), "X")`
 *      declarations (or plain `import { X } from "./sections/…"` lines);
 *   2. each section file: the `<Example>` labels inside every top-level function, and the
 *      local (or imported sibling-section) components that function renders, followed
 *      transitively — so a label inside a helper component lands on the page that renders
 *      the helper.
 *
 * The TypeScript compiler (already a dev dependency) parses; nothing is type-checked. A
 * label that is not a string literal cannot be indexed statically and FAILS the run, rather
 * than quietly leaving a section out of the search.
 *
 * THE SERVER KIT GROUP (0.31) has no section files: a page there is `serverPage({ slug,
 * serverModules: [...] })` in routes.tsx, and its headings and members come from the
 * server-kit release's api.json (scripts/sync-server-kit.mjs copies it). So for those pages
 * the labels are read from that file — one `<h3>` per module and kind of member, the rule
 * showcase/src/server-kit/api.ts `kindHeading` writes — and a second module,
 * search/server-kit.generated.ts, carries every module and member for the search, so the
 * top bar finds `apply_patch` without loading the 270 kB export. A module the export has
 * and no page shows, or a page naming a module the export lacks, fails the run.
 *
 * Two guards keep the output honest, both in showcase/src/__tests__/search.test.tsx:
 *   - `--check` in the suite: the committed file equals a fresh extraction;
 *   - every page is rendered and its `main h3[id]` headings compared with this index, so
 *     the static reading is checked against what the page actually puts in the DOM.
 *
 * Usage:
 *   node scripts/gen-showcase-search-index.mjs          rewrite the generated module
 *   node scripts/gen-showcase-search-index.mjs --check  exit 1 if it is stale
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "showcase/src");
const ROUTES = join(SRC, "routes.tsx");
const OUT = join(SRC, "search/examples.generated.ts");
const SERVER_KIT_API = join(SRC, "server-kit/api.json");
const SERVER_OUT = join(SRC, "search/server-kit.generated.ts");

const errors = [];

function parse(file) {
  return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** `./sections/foo` (relative to `from`) → absolute .tsx path, or undefined if not a local file. */
function resolveLocal(from, spec) {
  if (!spec.startsWith(".")) return undefined;
  const base = resolve(dirname(from), spec);
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`]) {
    if (existsSync(candidate) && candidate.endsWith(".tsx")) return candidate;
  }
  return undefined;
}

/** The named imports of a file that point at other local .tsx modules: local name → {file, name}. */
function localImports(sf) {
  const map = new Map();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const file = resolveLocal(sf.fileName, stmt.moduleSpecifier.text);
    const bindings = stmt.importClause?.namedBindings;
    if (!file || !bindings || !ts.isNamedImports(bindings)) continue;
    for (const el of bindings.elements) {
      map.set(el.name.text, { file, name: (el.propertyName ?? el.name).text });
    }
  }
  // routes.tsx loads its sections lazily (showcase/src/lib/lazy-section.ts):
  //   const Fields = lazySection(() => import("./sections/fields"), "Fields");
  // which is the same binding as `import { Fields } from "./sections/fields"`.
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      const call = decl.initializer;
      if (!ts.isIdentifier(decl.name) || !call || !ts.isCallExpression(call)) continue;
      if (!ts.isIdentifier(call.expression) || call.expression.text !== "lazySection") continue;
      const [loader, name] = call.arguments;
      const dyn = loader && ts.isArrowFunction(loader) ? loader.body : undefined;
      const spec =
        dyn && ts.isCallExpression(dyn) && dyn.expression.kind === ts.SyntaxKind.ImportKeyword
          ? dyn.arguments[0]
          : undefined;
      const file = spec && ts.isStringLiteral(spec) ? resolveLocal(sf.fileName, spec.text) : undefined;
      if (!file || !name || !ts.isStringLiteral(name)) {
        const { line } = sf.getLineAndCharacterOfPosition(stmt.getStart());
        errors.push(`${sf.fileName.slice(ROOT.length + 1)}:${line + 1}: lazySection() the index cannot read`);
        continue;
      }
      map.set(decl.name.text, { file, name: name.text });
    }
  }
  return map;
}

function tagName(node) {
  const tag = node.tagName;
  return ts.isIdentifier(tag) ? tag.text : undefined;
}

/** A JSX attribute's value when it is a plain string: "x", {"x"} or {`x`}. */
function literalAttr(attr) {
  const init = attr.initializer;
  if (!init) return undefined;
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression) {
    const e = init.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  }
  return undefined;
}

/**
 * Per top-level function of a section file: the ordered steps it renders — either an
 * Example label, or a reference to another component (local or imported) to follow.
 */
const fileCache = new Map();
function sectionFile(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  const sf = parse(file);
  const imports = localImports(sf);
  const fns = new Map();
  const collect = (name, body) => {
    const steps = [];
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = tagName(node);
        if (tag === "Example") {
          const attr = node.attributes.properties.find(
            (p) => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === "label",
          );
          const label = attr && literalAttr(attr);
          if (label === undefined) {
            const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
            errors.push(`${file.slice(ROOT.length + 1)}:${line + 1}: <Example> without a literal label`);
          } else steps.push({ label });
        } else if (tag && /^[A-Z]/.test(tag)) {
          steps.push({ ref: tag });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
    fns.set(name, steps);
  };
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) collect(stmt.name.text, stmt.body);
    else if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) collect(decl.name.text, decl.initializer);
      }
    }
  }
  const entry = { fns, imports };
  fileCache.set(file, entry);
  return entry;
}

/** Every Example label component `name` of `file` renders, following references. */
function labelsOf(file, name, seen = new Set()) {
  const key = `${file}#${name}`;
  if (seen.has(key)) return [];
  seen.add(key);
  const { fns, imports } = sectionFile(file);
  const steps = fns.get(name);
  if (!steps) {
    // Re-exported through this file from another one.
    const imp = imports.get(name);
    return imp ? labelsOf(imp.file, imp.name, seen) : [];
  }
  const out = [];
  for (const step of steps) {
    if ("label" in step) out.push(step.label);
    else if (fns.has(step.ref)) out.push(...labelsOf(file, step.ref, seen));
    else if (imports.has(step.ref)) {
      const imp = imports.get(step.ref);
      out.push(...labelsOf(imp.file, imp.name, seen));
    }
  }
  return out;
}

/* ── The Server kit group ── */

const PACKAGE = "eifi1_server_kit";
// The same order and titles as showcase/src/server-kit/api.ts (KIND_ORDER, kindTitle);
// the per-page test compares the headings a page renders with what is written here.
const KIND_ORDER = ["function", "class", "model", "enum", "protocol", "constant"];
const KIND_TITLES = {
  function: "Functions",
  class: "Classes",
  model: "Models",
  enum: "Enums",
  protocol: "Protocols",
  constant: "Constants",
};
const kindTitle = (kind) => KIND_TITLES[kind] ?? `${kind.charAt(0).toUpperCase()}${kind.slice(1)}s`;
const MAIL_MODULE = "mail";

let serverApi;
function serverKitApi() {
  if (serverApi === undefined) {
    serverApi = existsSync(SERVER_KIT_API) ? JSON.parse(readFileSync(SERVER_KIT_API, "utf8")) : null;
    if (!serverApi) errors.push(`${SERVER_KIT_API.slice(ROOT.length + 1)} is missing — run node scripts/sync-server-kit.mjs`);
  }
  return serverApi;
}

function serverModule(short) {
  return serverKitApi()?.modules.find((m) => m.name === `${PACKAGE}.${short}`);
}

/** The kinds a module has, in page order: KIND_ORDER, then any other in export order. */
function kindsOf(mod) {
  const kinds = KIND_ORDER.filter((k) => mod.members.some((m) => m.kind === k));
  for (const m of mod.members) if (!kinds.includes(m.kind)) kinds.push(m.kind);
  return kinds;
}

/** A Server kit page's `<h3>` labels: per module, its mails (the mail module), then one
 *  per kind of member — "auth · Functions". */
function serverLabels(slug, modules) {
  const api = serverKitApi();
  if (!api) return [];
  const labels = [];
  for (const short of modules) {
    const mod = serverModule(short);
    if (!mod) {
      errors.push(`routes.tsx: /${slug} names ${PACKAGE}.${short}, which server-kit ${api.kit_version} does not have`);
      continue;
    }
    if (short === MAIL_MODULE && api.mails.length) labels.push(`${short} · Rendered mails`);
    for (const kind of kindsOf(mod)) labels.push(`${short} · ${kindTitle(kind)}`);
  }
  return labels;
}

/** slug → the section components its Body renders, from routes.tsx. */
function pageBodies() {
  const sf = parse(ROUTES);
  const imports = localImports(sf);
  const pages = [];
  const prop = (obj, key) =>
    obj.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === key);
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const slug = prop(node, "slug");
      const body = prop(node, "Body");
      const server = prop(node, "serverModules");
      if (slug && server && ts.isStringLiteral(slug.initializer)) {
        const list = server.initializer;
        if (!ts.isArrayLiteralExpression(list) || !list.elements.every((e) => ts.isStringLiteral(e))) {
          const { line } = sf.getLineAndCharacterOfPosition(server.getStart());
          errors.push(`showcase/src/routes.tsx:${line + 1}: serverModules the index cannot read`);
        } else {
          pages.push({ slug: slug.initializer.text, refs: [], serverModules: list.elements.map((e) => e.text) });
        }
      } else if (slug && body && ts.isStringLiteral(slug.initializer)) {
        const refs = [];
        const walk = (n) => {
          if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
            const tag = tagName(n);
            if (tag) refs.push(tag);
          }
          ts.forEachChild(n, walk);
        };
        if (ts.isIdentifier(body.initializer)) refs.push(body.initializer.text);
        else walk(body.initializer);
        pages.push({ slug: slug.initializer.text, refs });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return pages.map(({ slug, refs, serverModules }) => ({
    slug,
    serverModules,
    labels: serverModules
      ? serverLabels(slug, serverModules)
      : refs.flatMap((ref) => {
          const imp = imports.get(ref);
          return imp ? labelsOf(imp.file, imp.name) : [];
        }),
  }));
}

/**
 * The search's Server kit entries: per module its page, summary and members. Every module
 * of the export must be on a page — a release that adds one fails here until routes.tsx
 * gives it one.
 */
export function extractServerKit(pages = pageBodies()) {
  const api = serverKitApi();
  if (!api) return undefined;
  const pageOf = new Map();
  for (const { slug, serverModules } of pages) for (const short of serverModules ?? []) pageOf.set(short, slug);
  const modules = [];
  for (const mod of api.modules) {
    const short = mod.name.slice(PACKAGE.length + 1);
    const page = pageOf.get(short);
    if (!page) {
      errors.push(`server-kit ${api.kit_version} has ${mod.name}, and no Server kit page in routes.tsx shows it`);
      continue;
    }
    modules.push({ page, module: short, summary: mod.summary, members: mod.members.map((m) => [m.name, m.kind]) });
  }
  return { version: api.kit_version, modules };
}

export function renderServerKit(data) {
  const lines = [
    "// GENERATED by scripts/gen-showcase-search-index.mjs from showcase/src/server-kit/api.json —",
    "// do not edit by hand. Re-run it after `node scripts/sync-server-kit.mjs`; the showcase suite",
    "// fails while this file is stale.",
    "",
    "/** The server-kit release the Server kit pages document. */",
    `export const SERVER_KIT_VERSION = ${JSON.stringify(data.version)};`,
    "",
    "export interface ServerKitSearchModule {",
    "  /** The Server kit page that documents it. */",
    "  page: string;",
    "  /** Its short name, `auth` for `eifi1_server_kit.auth` — also its anchor on the page. */",
    "  module: string;",
    "  summary: string;",
    "  /** [name, kind] per member; a member's anchor is `module.name`. */",
    "  members: ReadonlyArray<readonly [name: string, kind: string]>;",
    "}",
    "",
    "/** Every module of the release, in the export's order, with its members. */",
    "export const SERVER_KIT_MODULES: readonly ServerKitSearchModule[] = [",
  ];
  for (const mod of data.modules) {
    lines.push("  {");
    lines.push(`    page: ${JSON.stringify(mod.page)},`);
    lines.push(`    module: ${JSON.stringify(mod.module)},`);
    lines.push(`    summary: ${JSON.stringify(mod.summary)},`);
    lines.push("    members: [");
    for (const [name, kind] of mod.members) lines.push(`      [${JSON.stringify(name)}, ${JSON.stringify(kind)}],`);
    lines.push("    ],");
    lines.push("  },");
  }
  lines.push("];", "");
  return lines.join("\n");
}

export function extract(pages = pageBodies()) {
  const out = {};
  for (const { slug, labels } of pages) {
    if (labels.length === 0) continue;
    // One entry per label: two identical headings on a page are one anchor (the first).
    out[slug] = [...new Set(labels)];
  }
  return out;
}

export function render(index) {
  const lines = [
    "// GENERATED by scripts/gen-showcase-search-index.mjs — do not edit by hand.",
    "// Re-run `node scripts/gen-showcase-search-index.mjs` after adding, renaming or moving",
    "// an <Example>; the showcase suite fails while this file is stale.",
    "",
    "/** Per page slug, the labels of the `<Example>` sections it renders, in page order. */",
    "export const PAGE_EXAMPLE_LABELS: Readonly<Record<string, readonly string[]>> = {",
  ];
  for (const [slug, labels] of Object.entries(index)) {
    lines.push(`  ${JSON.stringify(slug)}: [`);
    for (const label of labels) lines.push(`    ${JSON.stringify(label)},`);
    lines.push("  ],");
  }
  lines.push("};", "");
  return lines.join("\n");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const pages = pageBodies();
  const index = extract(pages);
  const text = render(index);
  const server = pages.some((p) => p.serverModules) ? extractServerKit(pages) : undefined;
  const serverText = server ? renderServerKit(server) : undefined;
  if (errors.length) {
    console.error(`✖ cannot index these examples statically:\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  const outputs = [[OUT, text]];
  if (serverText) outputs.push([SERVER_OUT, serverText]);
  if (process.argv.includes("--check")) {
    for (const [file, expected] of outputs) {
      const current = existsSync(file) ? readFileSync(file, "utf8") : "";
      if (current !== expected) {
        console.error(`✖ ${file.slice(ROOT.length + 1)} is stale — run node scripts/gen-showcase-search-index.mjs`);
        process.exit(1);
      }
    }
    console.log("✓ showcase search index is up to date");
  } else {
    for (const [file, content] of outputs) writeFileSync(file, content);
    const count = Object.values(index).reduce((n, l) => n + l.length, 0);
    console.log(`✓ wrote ${OUT.slice(ROOT.length + 1)}: ${count} examples`);
    if (server) {
      const members = server.modules.reduce((n, m) => n + m.members.length, 0);
      console.log(
        `✓ wrote ${SERVER_OUT.slice(ROOT.length + 1)}: server-kit ${server.version}, ${server.modules.length} modules, ${members} members`,
      );
    }
  }
}
