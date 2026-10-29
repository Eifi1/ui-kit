#!/usr/bin/env node
/**
 * Take the shared commit rules at a tag: `npm run sync:commit-rules -- v1.3.1`.
 * Resolves the tag to its commit, copies every upstream file listed in
 * scripts/shared-commit-rules.json `files[]` (check-commit-msg.cjs, check-pushed-commits.cjs)
 * over the local copy byte for byte, and moves the pin. Then run `npm run check` — the new
 * rules apply to every commit not yet on origin/main.
 *
 * `npm run sync:commit-rules -- --from ../shared-workflows` copies the files from a local
 * checkout instead and leaves the pin alone (a tag still pending: the pin says so, and
 * check:commit-rules passes until the tag exists and this is run with it).
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const pinFile = new URL("./shared-commit-rules.json", import.meta.url);
const pin = JSON.parse(readFileSync(pinFile, "utf8"));
const local = (file) => new URL("../" + file.vendoredAs, import.meta.url);

if (process.argv[2] === "--from") {
  const source = resolve(process.argv[3] ?? "");
  for (const file of pin.files) copyFileSync(resolve(source, file.path), local(file));
  console.log(`✓ copied ${pin.files.length} file(s) from ${source}; the pin still says ${pin.tag}`);
  process.exit(0);
}

const tag = process.argv[2] ?? pin.tag;
if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  console.error(`✖ name the tag to take (the pin says "${pin.tag}"): npm run sync:commit-rules -- vX.Y.Z`);
  process.exit(1);
}
const refs = execFileSync(
  "git",
  ["ls-remote", "--tags", `https://github.com/${pin.repo}.git`, `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
  {
    encoding: "utf8",
  },
)
  .trim()
  .split("\n")
  .filter(Boolean);
if (!refs.length) {
  console.error(`✖ no tag ${tag} in ${pin.repo}`);
  process.exit(1);
}
// An annotated tag lists its object and then `^{}`, the commit; prefer the commit.
const commit = (refs.find((r) => r.endsWith("^{}")) ?? refs[0]).split(/\s+/)[0];
// Fetch every file before writing any, so a failed fetch leaves the copies and the pin as they were.
const bodies = [];
for (const file of pin.files) {
  const res = await fetch(`https://raw.githubusercontent.com/${pin.repo}/${commit}/${file.path}`);
  if (!res.ok) {
    console.error(`✖ could not fetch ${file.path} at ${tag}: HTTP ${res.status}`);
    process.exit(1);
  }
  bodies.push(await res.text());
}
pin.files.forEach((file, i) => writeFileSync(local(file), bodies[i]));
writeFileSync(pinFile, JSON.stringify({ ...pin, tag, commit }, null, 2) + "\n");
console.log(`✓ ${pin.files.map((f) => f.vendoredAs).join(", ")} are now ${pin.repo}@${tag} (${commit.slice(0, 8)})`);
