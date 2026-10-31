#!/usr/bin/env node
/**
 * Verify the PUBLISH ARTIFACT, not the working tree.
 *
 * Both of the defects that reached consumers in 0.4.x were invisible to every check the
 * repo had, because every check ran against `src/` or against `dist/` by relative path:
 *
 *   - `recharts`/`react-router` were declared optional peers while the barrel imported
 *     them statically. `npm test` passed (the peers are devDependencies here) and the CI
 *     grep passed (it only looked for the string "recharts" in dist/index.js).
 *   - The documented Tailwind `@source` path pointed into `src/`, which `files` did not
 *     publish. Nothing ever installed the tarball, so nothing noticed.
 *
 * This packs the real tarball, installs it into a scratch project with ONLY the declared
 * required peers, and imports every entry point BY PACKAGE NAME, which is the only way to
 * exercise the `exports` map. Run it locally with `npm run verify:package`.
 *
 * An entry that exists to hold an OPTIONAL peer (`/rhf` holds react-hook-form) is
 * checked both ways: without the peer it must fail on exactly that peer — which is
 * what proves the main barrel and every other entry did not need it, since they have
 * just been imported without it — and with the peer installed it must load.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkApi } from "./check-api-compat.mjs";
import { closure, importsOf } from "./lib/imports.mjs";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// `--quiet` (how `npm run check` calls it): the ~40-line walk is held back and a passing
// run prints one line. The first failure prints everything held so far, and the rest of
// the run is verbose — a failure always arrives with the steps that led to it.
let quiet = process.argv.includes("--quiet");
const held = [];
const log = (msg) => (quiet ? held.push(msg) : console.log(msg));

let failures = 0;
let passed = 0;
const fail = (msg) => {
  failures++;
  if (quiet) {
    quiet = false;
    for (const line of held) console.log(line);
  }
  console.error(`  ✗ ${msg}`);
};
// A step that throws (npm install failing, say) exits without reaching fail(): the held
// steps still say how far it got.
process.on("exit", (code) => {
  if (code !== 0 && quiet) for (const line of held) console.log(line);
});
const ok = (msg) => {
  passed++;
  log(`  ✓ ${msg}`);
};

log("• packing");
// npm < 11 answers a list of packs; npm 11+ an object keyed by package name.
const packedJson = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", tmpdir()], root));
const packed = Array.isArray(packedJson) ? packedJson : Object.values(packedJson);
const tarball = join(tmpdir(), packed[0].filename);
const shipped = new Set(packed[0].files.map((f) => f.path));

log("• the tarball contains what the docs promise");
for (const need of ["LICENSE", "tokens.css", "dist/index.js", "dist/index.d.ts"]) {
  if (shipped.has(need)) ok(need);
  else fail(`${need} is missing from the tarball`);
}
// The pay page (docs/billing-harmonization.md §14.4): the static page an app serves on its
// pay host, Paddle's Apple Pay file under `.well-known/` (a dot-directory, which a packing
// rule could drop silently), and the bin that copies them.
for (const need of [
  "dist/pay/index.html",
  "dist/pay/pay.js",
  "dist/pay/pay.css",
  "dist/pay/.well-known/apple-developer-merchantid-domain-association",
  "dist/bin/eifi1-pay-page.mjs",
]) {
  if (shipped.has(need)) ok(need);
  else fail(`${need} is missing from the tarball`);
}
// README and ADOPTING.md both tell consumers to point Tailwind's @source at a directory
// inside the package. Whichever directory that is, it has to be in the tarball.
for (const dir of ["dist", "src"]) {
  if ([...shipped].some((f) => f.startsWith(`${dir}/`))) ok(`${dir}/ ships (a documented @source target)`);
  else fail(`${dir}/ is not in the tarball, but the docs name it as an @source target`);
}
// One declaration file per module, beside its .js: since 0.34 tsc emits them per module
// (scripts/build-dts.mjs, TST-3), where tsup's roll-up hoisted them into hashed chunks. A
// .js without its .d.ts is a module a consumer's typecheck cannot see; a .d.ts without
// its .js is a leftover the build should not have shipped.
{
  const isModule = (f) => /^dist\/.+\.js$/.test(f) && !/^dist\/(pay|bin)\//.test(f);
  const modules = [...shipped].filter(isModule);
  const noDts = modules.filter((f) => !shipped.has(f.replace(/\.js$/, ".d.ts")));
  const noJs = [...shipped].filter((f) => /^dist\/.+\.d\.ts$/.test(f) && !shipped.has(f.replace(/\.d\.ts$/, ".js")));
  if (noDts.length === 0 && noJs.length === 0) ok(`${modules.length} modules, each with its own .d.ts`);
  else {
    if (noDts.length) fail(`${noDts.length} module(s) ship without a .d.ts: ${noDts.slice(0, 5).join(", ")}`);
    if (noJs.length) fail(`${noJs.length} .d.ts file(s) ship without a module: ${noJs.slice(0, 5).join(", ")}`);
  }
}

log("• installing into a scratch project with ONLY the required peers");
const required = Object.keys(pkg.peerDependencies ?? {}).filter((p) => !pkg.peerDependenciesMeta?.[p]?.optional);
const scratch = mkdtempSync(join(tmpdir(), "uikit-verify-"));
try {
  writeFileSync(
    join(scratch, "package.json"),
    JSON.stringify({ name: "scratch", private: true, version: "1.0.0", type: "module" }, null, 2),
  );
  // lucide-react at the FLOOR of its peer range, not at the devDependency (MOD-2, refactor
  // audit 2026-10-30): the kit builds and tests against 1.x while all three apps run 0.577,
  // and 198 icon names exist only in 1.x. One of those imported passed every kit gate and
  // would have broken all three apps' builds on adoption; at the floor, the probe below
  // refuses the module at link time ("does not provide an export named …").
  const AT_FLOOR = new Set(["lucide-react"]);
  const deps = required
    .map((p) => {
      if (!AT_FLOOR.has(p)) return `${p}@${(pkg.devDependencies ?? {})[p] ?? "latest"}`;
      const floor = /^>=\s*(\d+\.\d+\.\d+)/.exec(pkg.peerDependencies[p])?.[1];
      if (floor) return `${p}@${floor}`;
      fail(`${p}'s peer range "${pkg.peerDependencies[p]}" names no >= floor to install`);
      return null;
    })
    .filter(Boolean);
  log(`  required peers: ${required.join(", ") || "(none)"}`);
  run("npm", ["install", "--no-audit", "--no-fund", "--silent", tarball, ...deps], scratch);
  ok("npm install succeeded");

  log("• every exports entry resolves BY PACKAGE NAME");
  // A pattern entry ("./i18n/*") is expanded to every file it matches in the INSTALLED
  // package, so each translation is imported by the name an app writes.
  const installed = join(scratch, "node_modules", pkg.name);
  const subpaths = Object.entries(pkg.exports)
    .filter(([k]) => !k.endsWith(".css") && k !== "./package.json")
    .flatMap(([k, target]) => {
      if (!k.includes("*")) return [k];
      const [dir, suffix] = target.import.replace(/^\.\//, "").split("*");
      const found = readdirSync(join(installed, dir))
        .filter((f) => f.endsWith(suffix))
        .map((f) => k.replace("*", f.slice(0, -suffix.length)));
      if (found.length === 0) fail(`${k} matches no file in ${dir}`);
      return found;
    });
  const probe = join(scratch, "probe.mjs");
  const specifierOf = (s) => s.replace(/^\./, pkg.name);
  // One line per entry: `OK <subpath> <export count>` or `ERR <subpath> <message>`.
  const probeLines = (entries) =>
    entries
      .map(
        (s) =>
          `try { const m = await import(${JSON.stringify(specifierOf(s))}); console.log("OK ${s} " + Object.keys(m).length); }` +
          ` catch (e) { console.log("ERR ${s} " + e.message.split("\\n")[0]); }`,
      )
      .join("\n");
  const runProbe = (source) => {
    writeFileSync(probe, source);
    return run("node", [probe], scratch).trim().split("\n");
  };

  // Entries that exist to hold optional peers, and those peers. 0.45: `/offline` holds the
  // TanStack persister and idb-keyval (docs/local-first-harmonization.md §1.6).
  const optionalEntries = {
    "./rhf": ["react-hook-form"],
    "./offline": [
      "@tanstack/react-query",
      "@tanstack/react-query-persist-client",
      "@tanstack/query-async-storage-persister",
      "idb-keyval",
    ],
    // 0.46: `/sync` alone imports Dexie (§2.3); `/offline` loads without it.
    "./sync": ["dexie"],
    // 0.50: `/testing/react` drives components through Testing Library; `/testing` stays pure.
    "./testing/react": ["@testing-library/react"],
  };
  for (const [entry, peers] of Object.entries(optionalEntries)) {
    if (!subpaths.includes(entry)) fail(`${entry} is not in the exports map`);
    for (const peer of peers) if (!pkg.peerDependenciesMeta?.[peer]?.optional) fail(`${peer} is not an optional peer`);
  }
  const plain = subpaths.filter((s) => !(s in optionalEntries));
  for (const line of runProbe(probeLines(plain))) {
    if (line.startsWith("OK")) ok(line.slice(3));
    else fail(line.slice(4));
  }

  log("• an optional peer's entry needs that peer, and nothing else does");
  for (const [entry, peers] of Object.entries(optionalEntries)) {
    const [line] = runProbe(probeLines([entry]));
    // Resolution failure names the package it could not find. Anything else — a load
    // that succeeds, or fails on a package that is not one of the entry's peers — means
    // the entry is not what the manifest says it is.
    const missing = peers.find((peer) => line.includes(`'${peer}'`) || line.includes(`'${peer}/`));
    if (line.startsWith("ERR") && missing) ok(`${entry} refuses to load without ${missing}`);
    else fail(`${entry} without ${peers.join(", ")}: expected a missing-package error, got "${line}"`);
  }
  const optionalPeers = [...new Set(Object.values(optionalEntries).flat())];
  run(
    "npm",
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--silent",
      ...optionalPeers.map((p) => `${p}@${(pkg.devDependencies ?? {})[p] ?? "latest"}`),
    ],
    scratch,
  );
  for (const line of runProbe(probeLines(Object.keys(optionalEntries)))) {
    if (line.startsWith("OK")) ok(`${line.slice(3)} (with ${optionalPeers.join(", ")} installed)`);
    else fail(line.slice(4));
  }

  log("• push-worker is worker-safe: no package, a handler that runs in plain Node");
  // 0.46 (notifications §10.6 rule 5): a service worker bundles `@eifi1/ui-kit/push-worker`,
  // so its static closure may hold no bare import at all — React or a component's package
  // would land in the worker. Walked in the INSTALLED package, as a bundler sees it.
  {
    const { files, packages } = closure(join(installed, "dist", "push-worker.js"));
    if (packages.size === 0) ok(`dist/push-worker.js reaches ${files.size} module(s) and no package`);
    else fail(`dist/push-worker.js reaches ${[...packages].join(", ")}`);
    const [outcome] = runProbe(
      `import { handlePushSubscriptionChange } from ${JSON.stringify(specifierOf("./push-worker"))};\n` +
        `let listener; const scope = { addEventListener: (_t, l) => { listener = l; }, registration: { pushManager: {} } };\n` +
        `handlePushSubscriptionChange(scope, { pushKey: async () => "", replace: async () => {}, onOutcome: (o) => console.log(o) });\n` +
        `listener({ oldSubscription: null });`,
    );
    if (outcome === "no_previous") ok("handlePushSubscriptionChange runs by package name without a DOM");
    else fail(`handlePushSubscriptionChange by package name answered ${outcome}`);
  }

  log("• table-text is pure and reads what it promises");
  // Every module the entry reaches, by every import form (scripts/lib/imports.mjs, DUP-13).
  const tableText = closure(join(installed, "dist", "table-text.js"));
  if (tableText.packages.size === 0) ok(`dist/table-text.js reaches ${tableText.files.size} module(s) and no package`);
  else fail(`dist/table-text.js reaches ${[...tableText.packages].join(", ")}`);
  const [parsed] = runProbe(
    `import { parseTable } from ${JSON.stringify(specifierOf("./table-text"))};\n` +
      `console.log(JSON.stringify(parseTable("s;F\\n0,5;1,25", { decimal: "whole-text" })));`,
  );
  const expected = JSON.stringify({ rows: [[0.5, 1.25]], header: ["s", "F"], decimalComma: true, skipped: [] });
  if (parsed === expected) ok("parseTable reads a German export by package name");
  else fail(`parseTable by package name answered ${parsed}`);

  log("• currencies is data an app's build reads in plain Node");
  // 0.34.1: keksdose's Vite plugin imports it while Vite loads its config — Node, no DOM,
  // nothing but the module itself. It imports nothing at all, relative or bare: a kit
  // module behind it could reach React or a stylesheet later (packaging-contract.test.ts
  // holds the same rule on src/).
  const currencyImports = importsOf(join(installed, "dist", "currencies.js"));
  if (currencyImports.length === 0) ok("dist/currencies.js imports nothing");
  else fail(`dist/currencies.js imports ${currencyImports.join(", ")}`);
  const [countries] = runProbe(
    `import { CURRENCIES, CURRENCY_COUNTRIES } from ${JSON.stringify(specifierOf("./currencies"))};\n` +
      `console.log(JSON.stringify([typeof window, CURRENCY_COUNTRIES.CHF, CURRENCY_COUNTRIES.EUR, Object.keys(CURRENCY_COUNTRIES).length === CURRENCIES.length]));`,
  );
  if (countries === JSON.stringify(["undefined", "ch", "eu", true]))
    ok("CURRENCY_COUNTRIES loads by package name without a DOM");
  else fail(`the currencies entry by package name answered ${countries}`);

  log("• eslint is a plugin an app's ESLint config loads in plain Node");
  // Round 0.35 R5: an app's eslint.config.js imports it — Node, no DOM, and no `eslint` of
  // its own (that is the app's). It imports no package, carries this tarball's version
  // (ESLint's cache keys on it) and its role table: the rule is driven here without
  // ESLint, through the context it reads, on a class with a variant and an opacity.
  const eslintDir = join(installed, "dist", "eslint");
  const eslintImports = new Set(
    readdirSync(eslintDir)
      .filter((f) => f.endsWith(".js"))
      .flatMap((f) => [...closure(join(eslintDir, f)).packages]),
  );
  if (eslintImports.size === 0) ok("dist/eslint reaches no package");
  else fail(`dist/eslint reaches ${[...eslintImports].join(", ")}`);
  const [lint] = runProbe(
    `import plugin from ${JSON.stringify(specifierOf("./eslint"))};\n` +
      `const text = '"p-2 hover:text-[var(--text-muted)]/70 bg-[var(--chart-1)]"', fixed = [];\n` +
      `const rule = plugin.rules["role-utilities"];\n` +
      `rule.create({ sourceCode: { text }, report: (r) => fixed.push(r.fix({ replaceTextRange: ([a, b], s) => text.slice(0, a) + s + text.slice(b) })) })\n` +
      `  .Literal({ type: "Literal", value: text.slice(1, -1), range: [0, text.length], loc: { start: { line: 1, column: 0 }, end: { line: 1, column: text.length } } });\n` +
      `console.log(JSON.stringify([typeof window, plugin.meta.version, plugin.configs.recommended.rules, fixed]));`,
  );
  const lintExpected = JSON.stringify([
    "undefined",
    pkg.version,
    { "@eifi1/ui-kit/role-utilities": "error" },
    ['"p-2 hover:text-muted/70 bg-[var(--chart-1)]"'],
  ]);
  if (lint === lintExpected) ok("the role-utilities rule fixes a class by package name without ESLint");
  else fail(`the eslint entry by package name answered ${lint}`);

  log("• the pay page's bin writes an app's page, and refuses a wrong pairing");
  const bin = join(scratch, "node_modules", ".bin", "eifi1-pay-page");
  const payOut = join(scratch, "srv-pay");
  // 0.39 (§15.2.6): the host's app from the kit's map, moved to another site.
  const page = ["--app", "keksdose", "--app-url", "https://app.example"];
  if (!existsSync(bin)) fail("npm linked no eifi1-pay-page into node_modules/.bin");
  else {
    try {
      run(bin, ["--out", payOut, "--token", "test_verify", "--environment", "sandbox", ...page], scratch);
      const written = JSON.parse(readFileSync(join(payOut, "pay-config.json"), "utf8"));
      const files = ["index.html", "pay.js", "pay.css", ".well-known/apple-developer-merchantid-domain-association"];
      const missing = files.filter((f) => !existsSync(join(payOut, f)));
      if (
        missing.length === 0 &&
        written.token === "test_verify" &&
        written.environment === "sandbox" &&
        written.app === "keksdose" &&
        written.apps?.keksdose?.returnUrl === "https://app.example/settings/subscription" &&
        written.apps?.kastlan?.returnUrl === "https://kastlan.app/admin/billing"
      ) {
        ok("eifi1-pay-page wrote the page and its pay-config.json");
      } else fail(`eifi1-pay-page wrote ${JSON.stringify(written)}, missing ${missing.join(", ") || "nothing"}`);
    } catch (e) {
      fail(`eifi1-pay-page failed: ${e.stderr || e.message}`);
    }
    try {
      run(
        bin,
        ["--out", join(scratch, "srv-pay-wrong"), "--token", "test_verify", "--environment", "live", ...page],
        scratch,
      );
      fail("eifi1-pay-page accepted a sandbox token for live");
    } catch (e) {
      if (e.status === 1 && /sandbox token/.test(e.stderr ?? "")) ok("eifi1-pay-page refuses a sandbox token for live");
      else fail(`eifi1-pay-page refused a wrong pairing oddly: ${e.stderr || e.message}`);
    }
    try {
      run(bin, ["--out", join(scratch, "srv-pay-old"), "--app-name", "Example"], scratch);
      fail("eifi1-pay-page accepted the 0.33 flags");
    } catch (e) {
      if (e.status === 2 && /--app <tag>/.test(e.stderr ?? ""))
        ok("eifi1-pay-page refuses the 0.33 flags, naming --app");
      else fail(`eifi1-pay-page refused the 0.33 flags oddly: ${e.stderr || e.message}`);
    }
  }
  // Served beside Paddle.js and nothing else: one classic script that loads nothing.
  const payJs = readFileSync(join(installed, "dist", "pay", "pay.js"), "utf8");
  if (/^\s*import\s|\bimport\(|\brequire\(/m.test(payJs)) fail("dist/pay/pay.js loads a module");
  else ok("dist/pay/pay.js loads nothing");

  log("• testing is pure and knows the installed kit's tokens");
  // The guard an app runs from its own suite (docs/colour-roles-harmonization.md §8.3):
  // browser-safe, no package imports, and its token list baked from this tarball's
  // tokens.css — `@theme inline` names and AppShell's `--app-nav-h` left out.
  const testingDir = join(scratch, "node_modules", pkg.name, "dist", "testing");
  // `react.js` is the sibling entry `@eifi1/ui-kit/testing/react` (0.50), which needs Testing
  // Library by design; checked on its own below.
  // Walked, not read file by file: a `testing/*.js` importing `../lib/x.js` that reaches
  // React passed the old per-file scan (DUP-13).
  const testingImports = new Set(
    readdirSync(testingDir)
      .filter((f) => f.endsWith(".js") && f !== "react.js")
      .flatMap((f) => [...closure(join(testingDir, f)).packages]),
  );
  if (testingImports.size === 0) ok("dist/testing reaches no package");
  else fail(`dist/testing reaches ${[...testingImports].join(", ")}`);
  const testingReactImports = [...closure(join(testingDir, "react.js")).packages];
  if (testingReactImports.join() === "@testing-library/react") ok("dist/testing/react.js reaches Testing Library only");
  else fail(`dist/testing/react.js reaches ${testingReactImports.join(", ") || "nothing"}`);
  const [guard] = runProbe(
    `import { KIT_CSS_VARIABLES, undeclaredCssVariables } from ${JSON.stringify(specifierOf("./testing"))};\n` +
      `const files = Object.fromEntries(Array.from({ length: 10 }, (_, i) => ["f" + i + ".tsx", i ? "" : 'const a = "fill-[var(--surface)] bg-[var(--bg-surface)]";']));\n` +
      `console.log(JSON.stringify([KIT_CSS_VARIABLES.has("--text-muted"), KIT_CSS_VARIABLES.has("--text-color-muted"), KIT_CSS_VARIABLES.has("--app-nav-h"), undeclaredCssVariables(files)]));`,
  );
  if (guard === JSON.stringify([true, false, false, ["f0.tsx:1 --surface"]]))
    ok("undeclaredCssVariables finds an undeclared token by package name");
  else fail(`the testing entry by package name answered ${guard}`);

  log("• the public types against the last release's (check:api)");
  // API-1, refactor audit 2026-10-30: the installed tarball's .d.ts against the previous
  // release packed from npm's cache. Every changed name is listed; each must be named in
  // this release's adopt doc under "must change" (scripts/check-api-compat.mjs).
  try {
    const api = checkApi(installed, { log });
    if (api.skipped) ok("check:api skipped (see above)");
    else if (api.ok) ok(`check:api: every changed public name since ${api.previous} is in the adopt doc`);
    else
      fail(
        `check:api: ${api.unannounced.map((c) => c.name).join(", ")} changed since ${api.previous} and no adopt doc ` +
          'names it under a **Must change:** lead (or a "(breaking)" heading)',
      );
  } catch (error) {
    fail(`check:api could not run: ${error.message}`);
  }

  log("• the CSS entry is reachable as a file");
  const css = join(scratch, "node_modules", pkg.name, "tokens.css");
  if (existsSync(css)) ok("tokens.css");
  else fail("tokens.css is not installed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
  rmSync(tarball, { force: true });
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
if (quiet) console.log(`✓ package artifact verified: ${passed} checks on the packed, installed tarball`);
else console.log("\nPackage artifact verified.");
