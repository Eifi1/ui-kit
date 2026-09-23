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
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
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
  const subpaths = Object.keys(pkg.exports).filter((k) => !k.endsWith(".css") && k !== "./package.json");
  const probe = join(scratch, "probe.mjs");
  writeFileSync(
    probe,
    subpaths
      .map(
        (s) =>
          `try { const m = await import(${JSON.stringify(s.replace(/^\./, pkg.name))}); console.log("OK ${s} " + Object.keys(m).length); }` +
          ` catch (e) { console.log("ERR ${s} " + e.message.split("\\n")[0]); }`,
      )
      .join("\n"),
  );
  for (const line of run("node", [probe], scratch).trim().split("\n")) {
    if (line.startsWith("OK")) ok(line.slice(3));
    else fail(line.slice(4));
  }

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
