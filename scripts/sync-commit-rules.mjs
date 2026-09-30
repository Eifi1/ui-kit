#!/usr/bin/env node
/**
 * Take the shared commit rules at a tag: `npm run sync:commit-rules -- v1.3.0`.
 * Resolves the tag to its commit, copies the upstream check-commit-msg.cjs over the
 * local one byte for byte, and moves the pin in scripts/shared-commit-rules.json. Then
 * run `npm run check` — the new rules apply to every commit not yet on origin/main.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const pinFile = new URL("./shared-commit-rules.json", import.meta.url);
const pin = JSON.parse(readFileSync(pinFile, "utf8"));
const tag = process.argv[2] ?? pin.tag;
const refs = execFileSync("git", ["ls-remote", "--tags", `https://github.com/${pin.repo}.git`, `refs/tags/${tag}`, `refs/tags/${tag}^{}`], {
  encoding: "utf8",
}).trim().split("\n").filter(Boolean);
if (!refs.length) {
  console.error(`✖ no tag ${tag} in ${pin.repo}`);
  process.exit(1);
}
// An annotated tag lists its object and then `^{}`, the commit; prefer the commit.
const commit = (refs.find((r) => r.endsWith("^{}")) ?? refs[0]).split(/\s+/)[0];
const res = await fetch(`https://raw.githubusercontent.com/${pin.repo}/${commit}/${pin.path}`);
if (!res.ok) {
  console.error(`✖ could not fetch ${pin.path} at ${tag}: HTTP ${res.status}`);
  process.exit(1);
}
writeFileSync(new URL("../" + pin.vendoredAs, import.meta.url), await res.text());
writeFileSync(pinFile, JSON.stringify({ ...pin, tag, commit }, null, 2) + "\n");
console.log(`✓ ${pin.vendoredAs} is now ${pin.repo}@${tag} (${commit.slice(0, 8)})`);
