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
 * `bg-surface-2`, `border-subtle` …). 0.33 left the kit's ~1,750 `text-[var(--text-muted)]`-style
 * classes under a falling count; 0.34 moved them all (round 0.34 Q1, a codemod), so the
 * count is zero and stays there. A `[var(--…)]` class is still right where no role
 * utility of the same token and property exists (the chart colours, `--status-*`,
 * `bg-[var(--border)]` as a divider …) — this counts only the ones that have one. Since
 * DOC-7 (refactor audit 2026-10) that includes the money colours, a ring in
 * `--brand-contrast`, the ring offsets (`ring-offset-surface`) and the focus frame's
 * width (`ring-[length:var(--focus-ring-width)]` → `ring-focus`).
 *
 * Since 0.35 (round 0.35 R5, Kurvenschmiede's Q6) the apps hold their own markup to the
 * same rule with `@eifi1/ui-kit/eslint`, and both read one definition:
 * src/eslint/role-utilities.ts (the matcher, and the parser of the `@theme inline` block)
 * and its table, role-utilities.generated.ts. This imports them from source — Node strips
 * their types — and fails while the table is stale.
 *
 * Run: `npm run check:tokens`
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { findRoleClasses, roleUtilitiesFromCss } from "../src/eslint/role-utilities.ts";
import { ROLE_UTILITIES } from "../src/eslint/role-utilities.generated.ts";

/**
 * Lower this whenever the real count drops. Never raise it.
 *
 * 815 -> 2 -> 1. The survivor is deliberate and carries a comment saying so:
 *   - account-settings.tsx  `bg-white` behind a QR code, which a camera needs at
 *     maximum contrast regardless of theme.
 * The other, swipeable-row.tsx's `text-white` on a caller-supplied fill, went with
 * SwipeAction's deprecated `className` / `armedClassName` in 0.35 (round 0.35 R1).
 * If you get this to zero, delete the budget and assert on zero instead.
 */
const BUDGET = Number(process.env.TOKEN_BUDGET ?? "1");

/**
 * The second ratchet: `[var(--role)]` classes where a role utility exists. Never raise
 * it. Started in 0.33 at the day's count, 1,580 (2026-10-09), after the swipes, Chip
 * solid, the badge, the keypads and B′ had moved to the utilities; 1,576 once the rest of
 * the round had landed (ButtonGroupLink's and ActionCard's brand as text among it). 0 since
 * 0.34: the codemod of round 0.34 Q1 moved the remaining 1,578 to the utilities — three
 * above the budget, which 0.34's HelpPopover commit had added.
 */
const ROLE_BUDGET = Number(process.env.ROLE_CLASS_BUDGET ?? "0");

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
 * Which tokens have a utility, per property, as tokens.css's `@theme inline` block declares
 * them — so a role that gains a utility starts counting the day it does. The table both
 * this and `@eifi1/ui-kit/eslint` read is that block re-rendered; a stale one fails here,
 * before it can let an app's lint miss the new role. `divide-*` and the side borders
 * (`border-t-*`, `border-x-*` …) read `--border-color-*`, as Tailwind does. The money
 * colours are theme names since 0.34 (`text-money-income`, with variants), so
 * `text-[var(--money-income)]` counts like any role. A width typed `length:` —
 * `ring-[length:var(--focus-ring-width)]` — is read against the WIDTH namespaces, where
 * `ring-focus` lives. The matcher (src/eslint/role-utilities.ts) reads `text-[var(--text-muted)]`,
 * `hover:bg-[var(--bg-hover)]`, `border-t-[var(--border)]`, `focus-visible:ring-[var(--brand)]/40`,
 * `ring-offset-[var(--bg-surface)]` and `focus-visible:ring-[length:var(--focus-ring-width)]`,
 * preceded by a start, a space, a quote or a variant's colon.
 */
const declared = roleUtilitiesFromCss(readFileSync(resolve(import.meta.dirname, "..", "tokens.css"), "utf8"));
if (!declared) {
  console.error("✖ tokens.css has no @theme inline block — the role utilities are gone, or this parser is");
  process.exit(1);
}
if (JSON.stringify(declared) !== JSON.stringify(ROLE_UTILITIES)) {
  console.error(
    "✖ src/eslint/role-utilities.generated.ts is not tokens.css's @theme inline block — run:\n" +
      "    node scripts/gen-role-utilities.mjs\n" +
      "  (this check and @eifi1/ui-kit/eslint both read that table)",
  );
  process.exit(1);
}

const rolePerFile = [];
let roleTotal = 0;
for (const file of walk(SRC)) {
  const n = findRoleClasses(stripComments(readFileSync(file, "utf8")), ROLE_UTILITIES).length;
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
      `bg-surface-2, border-[var(--border)] → border-subtle, bg-[var(--danger-bg)] → bg-danger-soft,\n` +
      `ring-offset-[var(--bg-surface)] → ring-offset-surface, ring-[length:var(--focus-ring-width)] → ring-focus …\n` +
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
