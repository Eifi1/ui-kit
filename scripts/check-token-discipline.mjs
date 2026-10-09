#!/usr/bin/env node
/**
 * A ratchet on hardcoded colour utilities in `src/`.
 *
 * The audit counted 815 Tailwind palette-scale colour utilities against 85 token
 * references — an 11:1 ratio — and that is the whole reason a consumer could not
 * re-skin this kit without forking it. `--text-muted` and `--text-secondary` were
 * added specifically to replace `text-slate-500` and had ZERO component usages,
 * while `text-slate-500` had 68.
 *
 * Fixing that once is not enough: without a gate the next component reaches for
 * `bg-slate-800` and nothing objects. So this counts what is left and fails if the
 * number goes UP. When you legitimately remove some, lower BUDGET in the same
 * commit — that is what makes it a ratchet rather than a ceiling.
 *
 * A SECOND RATCHET since 0.33 (docs/colour-roles-harmonization.md §2.5, §7.4): the role
 * utilities. `tokens.css` names every role for its own property (`text-muted`,
 * `bg-surface-2`, `border-subtle` …), and the kit's ~1,750 `text-[var(--text-muted)]`-style
 * classes stay — a mechanical rewrite would churn hundreds of class assertions here and
 * in the apps — but they may only become fewer. New and touched code uses the utilities.
 *
 * Run: `npm run check:tokens`
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Lower this whenever the real count drops. Never raise it.
 *
 * 815 -> 2. The two survivors are both deliberate and both carry a comment saying so:
 *   - account-settings.tsx  `bg-white` behind a QR code, which a camera needs at
 *     maximum contrast regardless of theme.
 *   - swipeable-row.tsx     `text-white` on a swipe action whose fill the caller
 *     supplies, so there is no token that knows what it is sitting on.
 * If you get these to zero, delete the budget and assert on zero instead.
 */
const BUDGET = Number(process.env.TOKEN_BUDGET ?? "2");

/**
 * The second ratchet: `[var(--role)]` classes where a role utility exists. Lower this
 * whenever the real count drops; never raise it. Started in 0.33 at the day's count,
 * 1,580 (2026-10-09), after the swipes, Chip solid, the badge, the keypads and B′ had
 * moved to the utilities.
 */
const ROLE_BUDGET = Number(process.env.ROLE_CLASS_BUDGET ?? "1580");

const SRC = resolve(import.meta.dirname, "..", "src");

// Palette-scale colour utilities, with any variant prefix (dark:, hover:, md:, …).
// Both families: the NEUTRALS a component reaches for instead of a surface/text token,
// and the COLOURS it reaches for instead of --brand / --danger / --warning / --info /
// --money-* / the --chart-N ramp.
//
// `neutral` is the one family that needs its shade (0.33, §7.3): `bg-neutral` and
// `text-neutral-contrast` are the kit's own role utilities now, and Tailwind's
// `neutral` palette is only ever used with a number.
const NEUTRAL = "slate|gray|zinc|neutral-\\d{2,3}|stone|white|black";
const COLOURED =
  "indigo|sky|blue|emerald|green|teal|amber|yellow|orange|rose|red|violet|purple|fuchsia|pink|cyan|lime";
const PROP =
  "bg|text|border|ring|fill|stroke|placeholder|divide|outline|decoration|from|to|via|accent|caret|shadow";
const HARDCODED = new RegExp(
  `\\b(?:[a-z][a-z0-9-]*:)*(?:${PROP})-(?:${NEUTRAL}|${COLOURED})(?:-\\d{2,3})?(?:\\/\\d{1,3})?\\b`,
  "g",
);

/**
 * Strip comments before counting.
 *
 * Several of these colours are only NAMED in prose — tour.tsx explains that a previous
 * treatment was `ring-2 ring-white/80` over a scrim, which is documentation of a
 * decision, not a hardcoded colour. Counting it would make the budget unpayable and
 * would punish the comments this package is unusually good at.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// Allowed: a scrim is not a surface, and `text-white` on a coloured fill is the
// fill's contrast colour, which has its own token only where the fill is known.
const ALLOWED = [
  // A scrim is not a surface: a backdrop is deliberately absolute black/white at an
  // alpha, and tinting it with the page would make it disappear on a dark theme.
  /^bg-black\/\d+$/,
  /^bg-white\/\d+$/,
  // A hairline drawn OVER an arbitrary colour (a palette swatch), where a token would
  // be invisible against half the swatches it has to outline.
  /^ring-black\/\d+$/,
  /^ring-white\/\d+$/,
  // tokens.css sets `accent-color: var(--brand)` in @layer base, and its comment records
  // that an explicit `accent-*` utility is MEANT to win over it (feedback #264).
  /^accent-/,
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === "__tests__") continue; // tests may assert on literal classes
      out.push(...walk(p));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

const perFile = [];
let total = 0;
for (const file of walk(SRC)) {
  const hits = (stripComments(readFileSync(file, "utf8")).match(HARDCODED) ?? []).filter(
    // Match the allowlist against the BARE utility: `dark:ring-white/10` is the same
    // decision as `ring-white/10` and should not need its own entry.
    (h) => !ALLOWED.some((re) => re.test(h.replace(/^(?:[a-z][a-z0-9-]*:)+/, ""))),
  );
  if (hits.length) {
    perFile.push([file.slice(SRC.length + 1), hits.length]);
    total += hits.length;
  }
}

perFile.sort((a, b) => b[1] - a[1]);

/* ── The role-class ratchet (0.33) ────────────────────────────────────────────────── */

/**
 * Which tokens have a utility, per property, read from `tokens.css`'s `@theme inline`
 * block — so a role that gains a utility starts counting the day it does. `divide-*` and
 * the side borders (`border-t-*`, `border-x-*` …) read `--border-color-*`, as Tailwind does.
 * The money classes are plain and take no variants, so `text-[var(--money-income)]` is not
 * counted: a site that needs `hover:` has no other way to write it (§12.4).
 */
const THEME = /@theme inline\s*\{([^}]*)\}/.exec(
  readFileSync(resolve(import.meta.dirname, "..", "tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
)?.[1];
if (!THEME) {
  console.error("✖ tokens.css has no @theme inline block — the role utilities are gone, or this parser is");
  process.exit(1);
}
const NAMESPACE = {
  text: "text-color",
  bg: "background-color",
  border: "border-color",
  ring: "ring-color",
  outline: "outline-color",
  fill: "fill",
  stroke: "stroke",
};
const withUtility = {};
for (const [prop, ns] of Object.entries(NAMESPACE)) {
  withUtility[prop] = new Set(
    [...THEME.matchAll(new RegExp(`--${ns}-[a-z0-9-]+\\s*:\\s*var\\((--[a-z0-9-]+)\\)`, "g"))].map((m) => m[1]),
  );
}
withUtility.divide = withUtility.border;

// `text-[var(--text-muted)]`, `hover:bg-[var(--bg-hover)]`, `border-t-[var(--border)]`,
// `focus-visible:ring-[var(--brand)]/40`. Preceded by a start, a space, a quote or a
// variant's colon, so `ring-offset-[var(--bg-surface)]` is not read as a `ring-`.
const ROLE_CLASS =
  /(?:^|[\s"'`:])(text|bg|border(?:-[xytrblse])?|divide|ring|outline|fill|stroke)-\[var\((--[a-zA-Z0-9-]+)\)\]/g;

const rolePerFile = [];
let roleTotal = 0;
for (const file of walk(SRC)) {
  let n = 0;
  for (const [, prop, token] of stripComments(readFileSync(file, "utf8")).matchAll(ROLE_CLASS)) {
    if (withUtility[prop.split("-")[0]]?.has(token)) n++;
  }
  if (n) {
    rolePerFile.push([file.slice(SRC.length + 1), n]);
    roleTotal += n;
  }
}
rolePerFile.sort((a, b) => b[1] - a[1]);

let failed = false;
if (total > BUDGET) {
  // The per-file tally is the lead for a failure; a passing run is one line.
  for (const [file, n] of perFile) console.error(`  ${String(n).padStart(4)}  ${file}`);
  console.error(`\nhardcoded colour utilities in src/: ${total}  (budget ${BUDGET})`);
  console.error(
    `\n::error::${total - BUDGET} new hardcoded colour utilit${total - BUDGET === 1 ? "y" : "ies"}.\n` +
      `Use a token from tokens.css instead — --text-muted, --bg-hover, --border, --danger, …\n` +
      `If the colour genuinely has no token, add one rather than raising this budget.`,
  );
  failed = true;
} else {
  console.log(`✓ hardcoded colour utilities in src/: ${total}  (budget ${BUDGET})`);
  if (total < BUDGET) {
    console.log(`  Budget is ${BUDGET - total} above the real count — lower TOKEN_BUDGET to ${total}.`);
  }
}

if (roleTotal > ROLE_BUDGET) {
  for (const [file, n] of rolePerFile.slice(0, 30)) console.error(`  ${String(n).padStart(4)}  ${file}`);
  console.error(`\n[var(--role)] classes with a role utility in src/: ${roleTotal}  (budget ${ROLE_BUDGET})`);
  console.error(
    `\n::error::${roleTotal - ROLE_BUDGET} new [var(--role)] class${roleTotal - ROLE_BUDGET === 1 ? "" : "es"}.\n` +
      `Use the role utility instead: text-[var(--text-muted)] → text-muted, bg-[var(--bg-surface-2)] →\n` +
      `bg-surface-2, border-[var(--border)] → border-subtle, bg-[var(--danger-bg)] → bg-danger-soft …\n` +
      `(tokens.css, the @theme inline block). Never raise this budget.`,
  );
  failed = true;
} else {
  console.log(`✓ [var(--role)] classes with a role utility in src/: ${roleTotal}  (budget ${ROLE_BUDGET})`);
  if (roleTotal < ROLE_BUDGET) {
    console.log(`  Budget is ${ROLE_BUDGET - roleTotal} above the real count — lower ROLE_CLASS_BUDGET to ${roleTotal}.`);
  }
}
if (failed) process.exit(1);
