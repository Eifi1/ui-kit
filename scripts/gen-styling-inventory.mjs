#!/usr/bin/env node
/**
 * Generate the README's styling inventory — the role utilities — from `tokens.css`.
 *
 * The rule apps follow is "write `text-muted`, not `text-[var(--text-muted)]`" (colour
 * roles §7, round 0.34 Q6), and until 0.34 the only list of those names was the
 * `@theme inline` block itself: 0 hits for "role utilit" in the README every app's agent
 * reads from `node_modules` (refactor audit 2026-10, DOC-4). A hand-kept table would go
 * stale the first time a role gains a utility, so this one is a re-render of the block,
 * like the export inventory (`scripts/gen-export-inventory.mjs`) is a re-render of the
 * build.
 *
 * What it reads, all from `tokens.css` with its comments stripped:
 *   - `@theme inline { --<namespace>-<name>: var(--<token>); }` → one utility per line,
 *     rendered as a matrix: a row per token, a column per property. Rows follow the
 *     order the tokens are declared in the file, so families stay together. The block is
 *     parsed by src/eslint/role-utilities.ts (`parseThemeInline`, imported from source —
 *     Node strips its types), the parser `npm run check:tokens` and `@eifi1/ui-kit/eslint`
 *     read their table with since 0.35, so the README cannot name a utility they miss.
 *   - the plain colour classes (`.text-money-pos { color: var(--money-income); }`),
 *     which take no variants and so are listed apart;
 *   - `@custom-variant` and `@utility` names, and the plain `@theme { … }` values, so a
 *     new variant or utility shows up in the README on the next run.
 *
 * A namespace role-utilities.ts does not know, or a property this script has no column
 * for, FAILS the run rather than being dropped: a role that silently fell out of the table
 * is the defect this file exists to prevent.
 *
 * Usage:
 *   node scripts/gen-styling-inventory.mjs           rewrite the block in README.md
 *   node scripts/gen-styling-inventory.mjs --check    exit 1 if the block is stale
 *
 * Neither needs a build: it reads `tokens.css`, which is source.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseThemeInline, stripCssComments, themeBlocks } from "../src/eslint/role-utilities.ts";

const ROOT = resolve(import.meta.dirname, "..");
const TOKENS = join(ROOT, "tokens.css");
const README = join(ROOT, "README.md");

const BEGIN = "<!-- BEGIN GENERATED: styling — node scripts/gen-styling-inventory.mjs -->";
const END = "<!-- END GENERATED: styling -->";

/**
 * The matrix's columns: role-utilities.ts's properties (ROLE_NAMESPACES), in reading
 * order. The width and offset namespaces carry DOC-7's utilities (`ring-focus`,
 * `outline-focus`, `ring-offset-surface`, 0.34).
 */
const COLUMNS = [
  { property: "text", heading: "`text-*`" },
  { property: "bg", heading: "`bg-*`" },
  { property: "border", heading: "`border-*` `divide-*`" },
  { property: "ring-offset", heading: "`ring-offset-*`" },
  { property: "ring", heading: "`ring-*`" },
  { property: "ring-width", heading: "`ring-*` (width)" },
  { property: "outline", heading: "`outline-*`" },
  { property: "outline-width", heading: "`outline-*` (width)" },
  { property: "fill", heading: "`fill-*`" },
  { property: "stroke", heading: "`stroke-*`" },
];

/* ── Parsing ──────────────────────────────────────────────────────────────── */

const source = readFileSync(TOKENS, "utf8");
// The text `parseThemeInline` reports its block's offsets in.
const css = stripCssComments(source);

const inline = parseThemeInline(source);
if (!inline) {
  console.error("tokens.css has no `@theme inline` block — the role utilities are gone, or this parser is.");
  process.exit(2);
}

/** `[{ utility, property, token }]` in block order; `token` is the `var()` read, or the raw value. */
function roleUtilities() {
  return inline.declarations.map(({ variable, property, utility, token, value }) => {
    if (!property) {
      console.error(
        `tokens.css @theme inline: --${variable} is in a namespace src/eslint/role-utilities.ts does not know.\n` +
          "Add it to ROLE_NAMESPACES there (property → Tailwind namespace), and a column to COLUMNS in\n" +
          "scripts/gen-styling-inventory.mjs.",
      );
      process.exit(2);
    }
    if (!COLUMNS.some((c) => c.property === property)) {
      console.error(
        `tokens.css @theme inline: --${variable} is a \`${property}\` utility, which has no column in the README's table.\n` +
          "Add it to COLUMNS in scripts/gen-styling-inventory.mjs.",
      );
      process.exit(2);
    }
    return { utility, property, token: token ?? value };
  });
}

/** Where a token is first declared, outside the theme block that only reads it; tokens
 *  declared nowhere (a raw value) sort last, in block order. */
function declaredAt(token) {
  if (!token.startsWith("--")) return Infinity;
  const re = new RegExp(`(?:^|[\\s;{])${token.replace(/[-]/g, "\\-")}\\s*:`, "g");
  for (const m of css.matchAll(re)) {
    if (!inline.ranges.some(({ start, end }) => m.index >= start && m.index < end)) return m.index;
  }
  return Infinity;
}

/** `.text-money-pos { color: var(--money-income); … }` — unlayered, so no variants. */
function plainClasses() {
  return [
    ...css.matchAll(
      /^\.((?:text|bg|border)-[a-z0-9-]+)\s*\{\s*(?:color|background-color|border-color)\s*:\s*var\((--[a-z0-9-]+)\)\s*;([^}]*)\}/gm,
    ),
  ].map(([, name, token, rest]) => ({ name, token, note: /opacity\s*:\s*([0-9.]+)/.exec(rest)?.[1] }));
}

const names = (re) => [...css.matchAll(re)].map((m) => m[1]);

/* ── Rendering ────────────────────────────────────────────────────────────── */

const code = (s) => `\`${s}\``;

function renderMatrix(utilities) {
  const used = COLUMNS.filter((c) => utilities.some((u) => u.property === c.property));
  const rows = new Map();
  utilities.forEach((u, i) => {
    if (!rows.has(u.token)) rows.set(u.token, { order: i, cells: new Map() });
    const cells = rows.get(u.token).cells;
    cells.set(u.property, [...(cells.get(u.property) ?? []), u.utility]);
  });
  const sorted = [...rows].sort(([a, ra], [b, rb]) => declaredAt(a) - declaredAt(b) || ra.order - rb.order);
  return [
    `| Token | ${used.map((n) => n.heading).join(" | ")} |`,
    `|---|${used.map(() => "---").join("|")}|`,
    ...sorted.map(
      ([token, { cells }]) =>
        `| ${code(token)} | ${used.map((c) => (cells.get(c.property) ?? []).map(code).join(" ")).join(" | ")} |`,
    ),
  ].join("\n");
}

function render() {
  const utilities = roleUtilities();
  const tokens = new Set(utilities.map((u) => u.token));
  const plain = plainClasses();
  const variants = names(/@custom-variant\s+([a-z0-9-]+)/g);
  const custom = names(/@utility\s+([a-z0-9-]+)/g);
  // The plain `@theme { … }` block (font sizes, breakpoints): values to list, no role
  // utilities, so parseThemeInline does not read it; found by the same block finder
  // (DUP-13, refactor audit 2026-10-30).
  const theme = themeBlocks(css, { inline: false })[0]?.body;
  const themeValues = theme
    ? [...theme.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => {
        if (name.startsWith("text-")) return `${code(name)} (font size ${value.trim()})`;
        if (name.startsWith("breakpoint-"))
          return `${code(`${name.slice(11)}:`)} (breakpoint, ${value.trim()} at Normal)`;
        return `${code(`--${name}`)} (${value.trim()})`;
      })
    : [];

  const out = [
    BEGIN,
    "",
    `**${utilities.length} role utilities over ${tokens.size} tokens.** Find the token, then take the utility in`,
    "the column of the property you set. An empty cell is deliberate: the namespaces are",
    "property-scoped, so `bg-muted` and `text-surface` do not exist.",
    "",
    "Generated from `tokens.css` (its `@theme inline` block, variants and utilities) by",
    "`node scripts/gen-styling-inventory.mjs`; `--check` fails on a stale block. Do not edit",
    "between the markers.",
    "",
    renderMatrix(utilities),
    "",
  ];
  if (plain.length) {
    out.push(
      "Plain classes (unlayered, so they win over Tailwind's colour utilities and take **no** variants): " +
        plain.map((p) => `${code(p.name)} (${code(p.token)}${p.note ? `, opacity ${p.note}` : ""})`).join(", ") +
        ".",
      "",
    );
  }
  if (variants.length) out.push(`Variants: ${variants.map((v) => code(`${v}:`)).join(" ")}.`, "");
  if (custom.length) out.push(`Utilities: ${custom.map(code).join(", ")}.`, "");
  if (themeValues.length) out.push(`Theme values: ${themeValues.join(", ")}.`, "");
  out.push(END);
  return { block: out.join("\n"), utilities };
}

/* ── Write, or refuse ─────────────────────────────────────────────────────── */

const { block, utilities } = render();
const readme = readFileSync(README, "utf8");
const start = readme.indexOf(BEGIN);
const stop = readme.indexOf(END);

if (start === -1 || stop === -1) {
  console.error(`README.md has no generated-styling block. Add the markers:\n${BEGIN}\n${END}`);
  process.exit(2);
}

const current = readme.slice(start, stop + END.length);

if (process.argv.includes("--check")) {
  if (current === block) {
    console.log("README styling inventory is current.");
    process.exit(0);
  }
  // Name what the README lacks, as the export inventory does: a role utility nobody can
  // find is the failure this guards against.
  const documented = new Set([...current.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));
  const missing = utilities.map((u) => u.utility).filter((name) => !documented.has(name));
  console.error("README styling inventory is stale — run `node scripts/gen-styling-inventory.mjs`.");
  if (missing.length) {
    console.error(
      `${missing.length} role utilit${missing.length === 1 ? "y" : "ies"} the README does not name:\n  ${missing.join("\n  ")}`,
    );
  }
  process.exit(1);
}

writeFileSync(README, readme.slice(0, start) + block + readme.slice(stop + END.length));
console.log(`README styling inventory written: ${block.split("\n").length} lines.`);
