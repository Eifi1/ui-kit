// Which `[var(--token)]` classes have a role utility, and what it is called — the one
// definition `@eifi1/ui-kit/eslint`'s `role-utilities` rule and `npm run check:tokens`
// (scripts/check-token-discipline.mjs) both read (round 0.35 R5, Kurvenschmiede's Q6).
//
// The table itself is role-utilities.generated.ts, re-rendered from tokens.css's
// `@theme inline` block by scripts/gen-role-utilities.mjs with the parser below; the
// check fails while it is stale. So tokens.css stays the source: a role that gains a
// utility there is flagged in the kit and in the apps from the next release on. The
// README's role-utility table (scripts/gen-styling-inventory.mjs) reads the block with
// the same parser since 0.37, so the README, the check and the plugin cannot disagree.
//
// This module imports NOTHING, and its TypeScript is erasable only (no enum, no
// namespace, no parameter property): the check imports it from source under Node's type
// stripping, before any build, and the plugin ships it to an app's ESLint, which is
// plain Node with no React and no stylesheet.

/**
 * The properties a role utility exists for, each with the Tailwind theme namespace it is
 * declared in. `ring-width` and `outline-width` are a width typed `length:` —
 * `ring-[length:var(--focus-ring-width)]` is `ring-focus`. `divide-*` and the side borders
 * (`border-t-*`, `border-x-*` …) read `border`'s, as Tailwind does.
 */
export const ROLE_NAMESPACES = {
  text: "text-color",
  bg: "background-color",
  border: "border-color",
  ring: "ring-color",
  "ring-offset": "ring-offset-color",
  outline: "outline-color",
  fill: "fill",
  stroke: "stroke",
  "ring-width": "ring-width",
  "outline-width": "outline-width",
} as const;

export type RoleProperty = keyof typeof ROLE_NAMESPACES;

/**
 * Per property, each token that has a role utility → the utility's name after the
 * property's prefix: `border: { "--border": ["subtle"] }` is `border-subtle`. A list,
 * because nothing stops two names from reading one token; one name is a fix, several a
 * choice.
 */
export type RoleUtilityTable = {
  readonly [P in RoleProperty]: Readonly<Record<string, readonly string[]>>;
};

/** One `--<namespace>-<name>: <value>;` of the `@theme inline` block. */
export interface ThemeInlineDeclaration {
  /** The theme variable without its dashes: `text-color-muted`, `ring-width-focus`. */
  variable: string;
  /** The property whose namespace it is in; `null` for a namespace ROLE_NAMESPACES lacks. */
  property: RoleProperty | null;
  /** The name after the namespace, `muted`; `null` with `property`. */
  name: string | null;
  /** The utility it makes: `text-muted`, `ring-focus` (a width is `ring-*` like a colour). */
  utility: string | null;
  /** The token the value reads, `--text-muted`; `null` unless the value is a bare `var()`. */
  token: string | null;
  /** The value as written, trimmed. */
  value: string;
}

/** The `@theme inline` block: where it stands, and every declaration in it in block order. */
export interface ThemeInlineBlock {
  /** Its first and one-past-last offset in `stripCssComments(css)`, not in `css`. */
  start: number;
  end: number;
  declarations: ThemeInlineDeclaration[];
}

/** `css` without its comments: a declaration commented out is not one. */
export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const PROPERTIES = Object.keys(ROLE_NAMESPACES) as RoleProperty[];

/**
 * tokens.css's `@theme inline` block, read once for every reader: the table below, and
 * the README's (scripts/gen-styling-inventory.mjs), which fails on a `property: null`
 * where the table leaves it out. `null` when there is no such block — the role utilities
 * are gone, or this parser is. Theme blocks hold only declarations, so the first `}`
 * closes it; no namespace is another's prefix, so the first that fits is the one.
 */
export function parseThemeInline(css: string): ThemeInlineBlock | null {
  const block = /@theme\s+inline\s*\{([^}]*)\}/.exec(stripCssComments(css));
  if (!block) return null;
  const declarations = [...block[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, variable, raw]) => {
    const value = raw.trim();
    const property = PROPERTIES.find((p) => variable.startsWith(`${ROLE_NAMESPACES[p]}-`)) ?? null;
    const name = property && variable.slice(ROLE_NAMESPACES[property].length + 1);
    return {
      variable,
      property,
      name,
      utility: property && `${property.replace(/-width$/, "")}-${name}`,
      token: /^var\((--[a-z0-9-]+)\)$/.exec(value)?.[1] ?? null,
      value,
    };
  });
  return { start: block.index, end: block.index + block[0].length, declarations };
}

/**
 * The table `tokens.css` declares: every `--<namespace>-<name>: var(--<token>)` in its
 * `@theme inline` block, in block order, each property present (in ROLE_NAMESPACES' order)
 * even when it has none. `null` when there is no such block.
 */
export function roleUtilitiesFromCss(css: string): RoleUtilityTable | null {
  const block = parseThemeInline(css);
  if (!block) return null;
  const table = Object.fromEntries(PROPERTIES.map((p) => [p, {}])) as Record<RoleProperty, Record<string, string[]>>;
  for (const { property, name, token } of block.declarations) {
    if (property && name && token) (table[property][token] ??= []).push(name);
  }
  return table;
}

/**
 * `text-[var(--text-muted)]`, `hover:bg-[var(--bg-hover)]`, `border-t-[var(--border)]`,
 * `focus-visible:ring-[var(--brand)]/40`, `ring-offset-[var(--bg-surface)]`,
 * `ring-[length:var(--focus-ring-width)]`. Preceded by a start, a space, a quote or a
 * variant's colon, which the match does not include — nor the variants before it or an
 * opacity or `!` after it — so replacing the match keeps all of them.
 */
const ROLE_CLASS =
  /(?<=^|[\s"'`:])(text|bg|border(?:-[xytrblse])?|divide|ring-offset|ring|outline|fill|stroke)-\[(length:)?var\((--[a-zA-Z0-9-]+)\)\]/g;

export interface RoleClassHit {
  /** Where the class starts in the scanned text, after its variants. */
  index: number;
  /** The class as written, without variants or opacity: `border-t-[var(--border)]`. */
  found: string;
  /** The role utilities that paint the same: `["border-t-subtle"]`. */
  utilities: string[];
}

/**
 * Every `[var(--token)]` class in `text` whose token has a role utility on that property.
 * A token with no utility there (`text-[var(--chart-1)]`, `--status-*`,
 * `bg-[var(--border)]` as a divider's fill) is not a hit: `[var(--…)]` is right for it.
 */
export function findRoleClasses(text: string, table: RoleUtilityTable): RoleClassHit[] {
  if (!text.includes("var(--")) return [];
  const hits: RoleClassHit[] = [];
  for (const m of text.matchAll(ROLE_CLASS)) {
    const [found, prop, length, token] = m;
    // `border-t` and `divide` read `border`'s names; a `length:` hint reads the widths.
    const key = length ? `${prop}-width` : prop.startsWith("border-") || prop === "divide" ? "border" : prop;
    const names = (table as Partial<Record<string, Readonly<Record<string, readonly string[]>>>>)[key]?.[token];
    if (names?.length) hits.push({ index: m.index, found, utilities: names.map((name) => `${prop}-${name}`) });
  }
  return hits;
}
