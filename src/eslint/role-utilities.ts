// Which `[var(--token)]` classes have a role utility, and what it is called — the one
// definition `@eifi1/ui-kit/eslint`'s `role-utilities` rule and `npm run check:tokens`
// (scripts/check-token-discipline.mjs) both read (round 0.35 R5, Kurvenschmiede's Q6).
//
// The table itself is role-utilities.generated.ts, re-rendered from tokens.css's
// `@theme inline` block by scripts/gen-role-utilities.mjs with the parser below; the
// check fails while it is stale. So tokens.css stays the source: a role that gains a
// utility there is flagged in the kit and in the apps from the next release on.
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

/**
 * The table `tokens.css` declares: every `--<namespace>-<name>: var(--<token>)` in its
 * `@theme inline` block, in block order. `null` when there is no such block — the role
 * utilities are gone, or this parser is.
 */
export function roleUtilitiesFromCss(css: string): RoleUtilityTable | null {
  const theme = /@theme inline\s*\{([^}]*)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ""))?.[1];
  if (theme === undefined) return null;
  const table = {} as Record<RoleProperty, Record<string, string[]>>;
  for (const prop of Object.keys(ROLE_NAMESPACES) as RoleProperty[]) {
    const names: Record<string, string[]> = {};
    const declared = new RegExp(`--${ROLE_NAMESPACES[prop]}-([a-z0-9-]+)\\s*:\\s*var\\((--[a-z0-9-]+)\\)`, "g");
    for (const [, name, token] of theme.matchAll(declared)) (names[token] ??= []).push(name);
    table[prop] = names;
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
