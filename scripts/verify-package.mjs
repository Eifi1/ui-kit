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

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

console.log("• packing");
const packed = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", tmpdir()], root));
const tarball = join(tmpdir(), packed[0].filename);
const shipped = new Set(packed[0].files.map((f) => f.path));

console.log("• the tarball contains what the docs promise");
for (const need of ["LICENSE", "tokens.css", "dist/index.js", "dist/index.d.ts"]) {
  if (shipped.has(need)) ok(need);
  else fail(`${need} is missing from the tarball`);
}
// README and ADOPTING.md both tell consumers to point Tailwind's @source at a directory
// inside the package. Whichever directory that is, it has to be in the tarball.
for (const dir of ["dist", "src"]) {
  if ([...shipped].some((f) => f.startsWith(`${dir}/`))) ok(`${dir}/ ships (a documented @source target)`);
  else fail(`${dir}/ is not in the tarball, but the docs name it as an @source target`);
}

console.log("• installing into a scratch project with ONLY the required peers");
const required = Object.keys(pkg.peerDependencies ?? {}).filter(
  (p) => !pkg.peerDependenciesMeta?.[p]?.optional,
);
const scratch = mkdtempSync(join(tmpdir(), "uikit-verify-"));
try {
  writeFileSync(
    join(scratch, "package.json"),
    JSON.stringify({ name: "scratch", private: true, version: "1.0.0", type: "module" }, null, 2),
  );
  const deps = required.map((p) => `${p}@${(pkg.devDependencies ?? {})[p] ?? "latest"}`);
  console.log(`  required peers: ${required.join(", ") || "(none)"}`);
  run("npm", ["install", "--no-audit", "--no-fund", "--silent", tarball, ...deps], scratch);
  ok("npm install succeeded");

  console.log("• every exports entry resolves BY PACKAGE NAME");
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

  // Entries that exist to hold an optional peer, and that peer.
  const optionalEntries = { "./rhf": "react-hook-form" };
  for (const [entry, peer] of Object.entries(optionalEntries)) {
    if (!subpaths.includes(entry)) fail(`${entry} is not in the exports map`);
    if (!pkg.peerDependenciesMeta?.[peer]?.optional) fail(`${peer} is not an optional peer`);
  }
  const plain = subpaths.filter((s) => !(s in optionalEntries));
  for (const line of runProbe(probeLines(plain))) {
    if (line.startsWith("OK")) ok(line.slice(3));
    else fail(line.slice(4));
  }

  console.log("• an optional peer's entry needs that peer, and nothing else does");
  for (const [entry, peer] of Object.entries(optionalEntries)) {
    const [line] = runProbe(probeLines([entry]));
    // Resolution failure names the package it could not find. Anything else — a load
    // that succeeds, or fails on a different package — means the entry is not what
    // the manifest says it is.
    if (line.startsWith("ERR") && line.includes(`'${peer}'`)) ok(`${entry} refuses to load without ${peer}`);
    else fail(`${entry} without ${peer}: expected a missing-package error, got "${line}"`);
  }
  const optionalPeers = [...new Set(Object.values(optionalEntries))];
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

  console.log("• table-text is pure and reads what it promises");
  const tableText = join(scratch, "node_modules", pkg.name, "dist", "lib", "table-text.js");
  const bare = [...readFileSync(tableText, "utf8").matchAll(/\bfrom\s*["']([^."'][^"']*)["']/g)].map(
    (m) => m[1],
  );
  if (bare.length === 0) ok("dist/lib/table-text.js imports no package");
  else fail(`dist/lib/table-text.js imports ${bare.join(", ")}`);
  const [parsed] = runProbe(
    `import { parseTable } from ${JSON.stringify(specifierOf("./table-text"))};\n` +
      `console.log(JSON.stringify(parseTable("s;F\\n0,5;1,25", { decimal: "whole-text" })));`,
  );
  const expected = JSON.stringify({ rows: [[0.5, 1.25]], header: ["s", "F"], decimalComma: true, skipped: [] });
  if (parsed === expected) ok("parseTable reads a German export by package name");
  else fail(`parseTable by package name answered ${parsed}`);

  console.log("• the CSS entry is reachable as a file");
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
console.log("\nPackage artifact verified.");
