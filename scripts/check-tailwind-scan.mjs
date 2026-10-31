#!/usr/bin/env node
/**
 * The documented adoption step is a Tailwind @source path, and a wrong one is SILENT:
 * the app builds, runs, and renders unstyled. The showcase follows the same
 * instruction against this repo's own source, so its emitted CSS proves that the scan
 * reaches the package. `pointer-events-auto` comes from the kit's overlays and from
 * almost nothing else.
 *
 * And the documented lines themselves, as an app runs them (at the end): README's and
 * ADOPTING's `@source` lines, compiled over this build's dist/ installed under an app's
 * node_modules. They must reach the kit's classes and scan no `.d.ts` or `.map` file —
 * their comments and `sourcesContent` became utilities in every app's stylesheet
 * (refactor audit 2026-10-30, MOD-3).
 *
 * Run after `npm run build` and `npm run build:showcase`. Part of `npm run check`,
 * which CI calls as it is.
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Scanner } from "@tailwindcss/oxide";
import { compile } from "tailwindcss";

const dir = "showcase/dist/assets";
let css;
try {
  css = readdirSync(dir).filter((f) => f.endsWith(".css"));
} catch {
  console.error(`✖ ${dir} is missing — run \`npm run build:showcase\` first`);
  process.exit(1);
}
if (css.length === 0) {
  console.error(`✖ no stylesheet in ${dir}`);
  process.exit(1);
}
const text = css.map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("\n");
for (const cls of ["pointer-events-auto", "sr-only"]) {
  if (!text.includes(cls)) {
    console.error(`✖ ${cls} is missing from the showcase CSS — the @source scan is not reaching src/`);
    process.exit(1);
  }
}
console.log("✓ the showcase CSS carries the kit utilities");

/**
 * 0.32 (docs/text-size-harmonization.md §10.5): the text-size and contrast CSS has to
 * SURVIVE the build, not just be written. `--focus-ring-width` lives in a block holding
 * only custom properties — which Tailwind 4.3.3 keeps (0.33 corrected the belief that it
 * strips one; docs/colour-roles-harmonization.md §3.1), and this is what proves it; the
 * breakpoint variants are redefinitions whose whole point is that Tailwind's own query
 * for `md:` is no longer emitted. Checked on the minified output, as an app gets it.
 */
const TEXT_SIZE_CSS = [
  ["the Large root size", /html\[data-text-size="?large"?\]\{font-size:125%\}/],
  ["the Extra large root size", /html\[data-text-size="?xlarge"?\]\{font-size:150%\}/],
  ["the focus frame's width", /:root\{--focus-ring-width:2px\}/],
  ["the focus frame under More contrast", /:root\[data-contrast="?more"?\]\{--focus-ring-width:3px\}/],
  // 0.36 (docs/colour-roles-harmonization.md §13.4): the light literals and `--bg-active`
  // step for More contrast's darker well, in a block of custom properties only — and the
  // link's brand as text under the `contrast:` variant reaches the built CSS.
  ["the light More-contrast literals", /:root\[data-contrast="?more"?\]:not\(\.dark\)\{[^}]*--danger:#ba0739/],
  [
    "the light More-contrast --bg-active",
    /:root\[data-contrast="?more"?\]:not\(\.dark\)\{[^}]*--bg-active:color-mix\(in oklab, ?var\(--text-primary\) ?16%, ?var\(--bg-surface\)\)/,
  ],
  [
    "the link's brand as text under More contrast",
    /\.contrast\\:text-brand-muted:where\([^)]*data-contrast=more[^{]*\{color:var\(--brand-muted\)\}/,
  ],
  ["md: at Normal, scoped", /@media \(width>=48rem\)\{\.md\\:[^{]*:where\(:not\(\[data-text-size\$=large\] \*\)\)\{/],
  ["md: at Large", /@media \(width>=60rem\)\{\.md\\:[^{]*:where\(\[data-text-size=large\] \*\)\{/],
  ["md: at Extra large", /@media \(width>=72rem\)\{\.md\\:[^{]*:where\(\[data-text-size=xlarge\] \*\)\{/],
];
for (const [what, re] of TEXT_SIZE_CSS) {
  if (!re.test(text)) {
    console.error(`✖ the showcase CSS lost ${what} (tokens.css, §3.3/§5)`);
    process.exit(1);
  }
}
// Tailwind's own, unscaled `md:` must not fire beside the scaled one.
if (/@media \(width>=48rem\)\{\.md\\:[a-z0-9-]+\{/.test(text)) {
  console.error("✖ the showcase CSS still carries Tailwind's unscaled md: query beside the scaled one");
  process.exit(1);
}
console.log("✓ the showcase CSS carries the text-size and contrast mechanism");

/**
 * 0.33 (docs/colour-roles-harmonization.md §5, §7.4, §12.3): the colour roles.
 *
 * The new tokens are plain declarations in the `:root` / `.dark` blocks, and those
 * blocks are LIVE in an app without a palette layer (Kurvenschmiede paints them) — so
 * they have to survive the build like `--focus-ring-width` does. And a role utility the
 * kit itself uses has to reach the built CSS, with the role read at the element.
 */
const COLOUR_ROLES_CSS = [
  ["the light well (the page's colour)", /:root\{[^}]*--bg-surface-2:#ede3cf/],
  ["--warning-contrast", /--warning-contrast:/],
  ["--warning-border-strong", /--warning-border-strong:/],
  ["--neutral and its foreground", /--neutral:var\(--text-muted\)[^}]*--neutral-contrast:var\(--text-inverse\)/],
  ["the money foregrounds", /--money-income-contrast:[^}]*--money-neutral-contrast:/],
  ["the hue foregrounds", /--hue-teal-contrast:/],
  ["the lighter row hover", /--bg-hover:color-mix\(in oklab, ?var\(--text-primary\) ?5\.5%, ?var\(--bg-surface\)\)/],
  ["a text role utility", /\.text-danger-contrast\{color:var\(--danger-contrast\)\}/],
  ["a background role utility", /\.bg-danger-soft\{background-color:var\(--danger-bg\)\}/],
  [
    "a ring role utility",
    /\.focus-visible\\:ring-warning-strong:focus-visible\{--tw-ring-color:var\(--warning-border-strong\)\}/,
  ],
  // 0.34 (refactor audit 2026-10, DOC-7): the focus frame's width, a ring offset and a
  // money colour, as the kit's own markup writes them.
  [
    "the focus frame's width utility",
    /\.focus-visible\\:ring-focus:focus-visible\{--tw-ring-shadow:[^;}]*calc\(var\(--focus-ring-width\) ?\+ ?var\(--tw-ring-offset-width\)\)/,
  ],
  [
    "a ring-offset role utility",
    /\.focus-visible\\:ring-offset-surface:focus-visible\{--tw-ring-offset-color:var\(--bg-surface\)\}/,
  ],
  ["a money role utility", /\.text-money-income\{color:var\(--money-income\)\}/],
];
for (const [what, re] of COLOUR_ROLES_CSS) {
  if (!re.test(text)) {
    console.error(`✖ the showcase CSS lost ${what} (tokens.css, colour roles)`);
    process.exit(1);
  }
}

/**
 * Every role NAMESPACE, compiled from tokens.css with the installed Tailwind — whether or
 * not the kit uses a name yet, because the apps do (Kurvenschmiede strokes its plans with
 * `stroke-subtle`, kastlan rings its QR card with `ring-subtle`). Property-scoped theme
 * namespaces are Tailwind's compatibility surface rather than its headline API, so a
 * release that drops one has to fail here, not in an app's screenshot (§11).
 */
const ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const TW = dirname(require.resolve("tailwindcss/package.json", { paths: [ROOT] }));
const loadStylesheet = async (id, base) => {
  const path = { tailwindcss: join(TW, "index.css") }[id] ?? (id.startsWith("/") ? id : join(base, id));
  return { path, base: dirname(path), content: readFileSync(path, "utf8") };
};
const compiler = await compile(`@import "tailwindcss";\n@import "${join(ROOT, "tokens.css")}";\n`, {
  base: ROOT,
  loadStylesheet,
});
const NAMESPACES = [
  ["text-muted", /\.text-muted\s*\{\s*color:\s*var\(--text-muted\);/],
  ["bg-surface-2", /\.bg-surface-2\s*\{\s*background-color:\s*var\(--bg-surface-2\);/],
  ["border-subtle", /\.border-subtle\s*\{\s*border-color:\s*var\(--border\);/],
  ["divide-subtle", /\.divide-subtle[^{]*\{\s*border-color:\s*var\(--border\);/],
  ["ring-subtle", /\.ring-subtle\s*\{\s*--tw-ring-color:\s*var\(--border\);/],
  ["outline-strong", /\.outline-strong\s*\{\s*outline-color:\s*var\(--border-strong\);/],
  ["fill-surface", /\.fill-surface\s*\{\s*fill:\s*var\(--bg-surface\);/],
  ["stroke-subtle", /\.stroke-subtle\s*\{\s*stroke:\s*var\(--border\);/],
  [
    "hover:bg-brand (a variant on a former plain class)",
    /\.hover\\:bg-brand:hover\s*\{\s*background-color:\s*var\(--brand\);/,
  ],
  ["text-muted/60 (an opacity)", /color-mix\(in oklab, var\(--text-muted\) 60%, transparent\)/],
  [
    "truncate-until-large (text-size §10.17)",
    /\.truncate-until-large\s*\{[^}]*white-space:\s*nowrap;[\s\S]*?\[data-text-size\$=large\][^{]*\{\s*white-space:\s*normal;\s*overflow-wrap:\s*anywhere;/,
  ],
  // 0.33.1: the figures' sibling wraps at spaces only, so an amount never splits.
  [
    "truncate-until-large-words (figures, 0.33.1)",
    /\.truncate-until-large-words\s*\{[^}]*white-space:\s*nowrap;[\s\S]*?\[data-text-size\$=large\][^{]*\{\s*white-space:\s*normal;\s*overflow-wrap:\s*normal;/,
  ],
  // 0.34 (DOC-7): the width namespaces — `ring-focus` must stay a WIDTH, which Tailwind
  // tries only after finding no colour of that name — the ring offsets, and money.
  [
    "ring-focus",
    /\.ring-focus\s*\{\s*--tw-ring-shadow:[^;]*calc\(var\(--focus-ring-width\) \+ var\(--tw-ring-offset-width\)\)/,
  ],
  ["outline-focus", /\.outline-focus\s*\{[^}]*outline-width:\s*var\(--focus-ring-width\);/],
  ["ring-offset-surface", /\.ring-offset-surface\s*\{\s*--tw-ring-offset-color:\s*var\(--bg-surface\);/],
  [
    "hover:text-money-income (a money colour with a variant)",
    /\.hover\\:text-money-income:hover\s*\{\s*color:\s*var\(--money-income\);/,
  ],
];
const NOT_NAMES = ["bg-muted", "text-surface", "text-subtle", "fill-brand"];
const probe = compiler.build([...NAMESPACES.map(([cls]) => cls.split(" ")[0]), ...NOT_NAMES]);
for (const [cls, re] of NAMESPACES) {
  if (!re.test(probe)) {
    console.error(`✖ Tailwind no longer generates ${cls} from tokens.css's @theme inline block`);
    process.exit(1);
  }
}
for (const cls of NOT_NAMES) {
  if (probe.includes(`.${cls} {`) || probe.includes(`.${cls}{`)) {
    console.error(`✖ ${cls} exists — a role name leaked onto a property it does not belong to`);
    process.exit(1);
  }
}
if (/--text-color-muted\s*:/.test(probe)) {
  console.error("✖ the @theme block emits its names as variables — it must stay `inline` (§7.1, §8.2)");
  process.exit(1);
}
console.log("✓ the colour roles survive the build, and every role namespace compiles");

/**
 * The documented `@source` lines, run the way an app runs them (MOD-3, refactor audit
 * 2026-10-30). Measured on 0.51.7's dist with Tailwind 4.3.3: `@source ".../dist"` scans
 * 554 `.js`, 553 `.d.ts` and 553 `.js.map` files, and the JSDoc and `sourcesContent`
 * put 181 rules (11 KB) into an app's CSS, palette shades the kit's own lint refuses
 * among them (`bg-green-500` from status-dot's doc comment). The glob
 * `@source ".../dist/**\/*.js"` changes NOTHING in an app: an explicit source inside
 * the gitignored node_modules un-ignores its base folder, and the app's own root
 * detection (`**\/*`) then walks all of it. Only `@source not` keeps those files out.
 *
 * So this compiles README's lines (ADOPTING must say the same) in a scratch app — a
 * `.gitignore` naming node_modules, the kit linked in as @eifi1/ui-kit, the scanner built
 * as @tailwindcss/vite builds it: root detection plus the stylesheet's sources — and
 * fails when a `.d.ts` or `.map` file is scanned or a kit class goes missing.
 */
const KIT_SOURCE = /^\s*@source\s+(?:not\s+)?"[^"]*@eifi1\/ui-kit\/[^"]*"\s*;/gm;
const documented = (file) =>
  (readFileSync(join(ROOT, file), "utf8").match(KIT_SOURCE) ?? []).map((line) => line.trim()).sort();
const readme = documented("README.md");
const adopting = documented("ADOPTING.md");
if (readme.length === 0) {
  console.error("✖ README.md documents no @source line for @eifi1/ui-kit");
  process.exit(1);
}
if (JSON.stringify(readme) !== JSON.stringify(adopting)) {
  console.error(
    `✖ README.md and ADOPTING.md document different @source lines:\n  README:    ${readme.join("\n             ")}\n  ADOPTING:  ${adopting.join("\n             ")}`,
  );
  process.exit(1);
}
/**
 * The scan in a scratch app: what is wrong with it as a message, or null. A function, so
 * the `finally` that deletes the app runs on a failure too: `process.exit` inside the
 * `try` skipped it, and every failing run left a `uikit-tailwind-app-*` in the temp dir
 * with a symlink to this repository inside (0.52 code review).
 */
async function scanAsAnApp() {
  const app = mkdtempSync(join(tmpdir(), "uikit-tailwind-app-"));
  try {
    mkdirSync(join(app, "src"));
    mkdirSync(join(app, "node_modules", "@eifi1"), { recursive: true });
    symlinkSync(ROOT, join(app, "node_modules", "@eifi1", "ui-kit"), "dir");
    writeFileSync(join(app, ".gitignore"), "node_modules\n");
    // Each documented path, from its `@eifi1/ui-kit/` on, under the scratch app's package.
    const installed = join(app, "node_modules", "@eifi1", "ui-kit");
    const lines = readme.map((line) =>
      line.replace(/"[^"]*@eifi1\/ui-kit\/([^"]*)"/, (_, rest) => `"${join(installed, rest)}"`),
    );
    const appCompiler = await compile(
      `@import "tailwindcss";\n@import "${join(ROOT, "tokens.css")}";\n${lines.join("\n")}\n`,
      {
        base: join(app, "src"),
        loadStylesheet,
      },
    );
    const root =
      appCompiler.root === "none" ? [] : [{ ...(appCompiler.root ?? { base: app, pattern: "**/*" }), negated: false }];
    const scanner = new Scanner({ sources: [...root, ...appCompiler.sources] });
    const appCss = appCompiler.build(scanner.scan());
    const commented = scanner.files.filter((f) => /\.d\.ts$|\.map$/.test(f));
    if (commented.length > 0) {
      return (
        `✖ the documented @source lines scan ${commented.length} .d.ts / .map file(s) of the kit (${commented[0]}, …):\n` +
        "  their comments become utilities in every app's CSS. Document\n" +
        '  @source not "../../node_modules/@eifi1/ui-kit/dist/**/*.{map,d.ts}"; beside the @source line (MOD-3).'
      );
    }
    for (const cls of ["pointer-events-auto", "sr-only"]) {
      if (!appCss.includes(`.${cls}`)) {
        return `✖ ${cls} is missing from an app's CSS under the documented @source lines — the scan misses dist/`;
      }
    }
    console.log(
      `✓ the documented @source lines reach the kit's classes and scan ${scanner.files.length} files, no .d.ts or .map`,
    );
    return null;
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
}
const failure = await scanAsAnApp();
if (failure) {
  console.error(failure);
  process.exit(1);
}
