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
 *      resolved through the file's `import { X } from "./sections/…"` lines;
 *   2. each section file: the `<Example>` labels inside every top-level function, and the
 *      local (or imported sibling-section) components that function renders, followed
 *      transitively — so a label inside a helper component lands on the page that renders
 *      the helper.
 *
 * The TypeScript compiler (already a dev dependency) parses; nothing is type-checked. A
 * label that is not a string literal cannot be indexed statically and FAILS the run, rather
 * than quietly leaving a section out of the search.
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
      if (slug && body && ts.isStringLiteral(slug.initializer)) {
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
  return pages.map(({ slug, refs }) => ({
    slug,
    labels: refs.flatMap((ref) => {
      const imp = imports.get(ref);
      return imp ? labelsOf(imp.file, imp.name) : [];
    }),
  }));
}

export function extract() {
  const out = {};
  for (const { slug, labels } of pageBodies()) {
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
  const index = extract();
  const text = render(index);
  if (errors.length) {
    console.error(`✖ cannot index these examples statically:\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  if (process.argv.includes("--check")) {
    const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    if (current !== text) {
      console.error(`✖ ${OUT.slice(ROOT.length + 1)} is stale — run node scripts/gen-showcase-search-index.mjs`);
      process.exit(1);
    }
    console.log("✓ showcase search index is up to date");
  } else {
    writeFileSync(OUT, text);
    const count = Object.values(index).reduce((n, l) => n + l.length, 0);
    console.log(`✓ wrote ${OUT.slice(ROOT.length + 1)}: ${count} examples`);
  }
}
