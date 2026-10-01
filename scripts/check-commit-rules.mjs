#!/usr/bin/env node
/**
 * The commit-message rules are the SHARED ones: scripts/check-commit-msg.cjs is a
 * byte-for-byte copy of Eifi1/shared-workflows' actions/commit-check/check-commit-msg.cjs,
 * pinned to the commit in scripts/shared-commit-rules.json — the same rules every app's
 * shared commit-check action runs. A copy rather than the action because ui-kit checks
 * LOCALLY first: the husky commit-msg hook and `npm run check` need the rules on disk,
 * and CI runs those same npm scripts (see CONTRIBUTING → The gates).
 *
 * This check fails when the copy no longer matches the pinned upstream file (someone
 * edited it here, or the pin moved without a sync). Offline it says so and passes: the
 * pre-push hook must not need a network, and CI — which always has one — enforces it.
 * A newer shared tag is reported, not failed: taking it is a decision, made with
 * `npm run sync:commit-rules -- <tag>`.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const pin = JSON.parse(readFileSync(new URL("./shared-commit-rules.json", import.meta.url), "utf8"));
const local = readFileSync(new URL("../" + pin.vendoredAs, import.meta.url), "utf8");
const url = `https://raw.githubusercontent.com/${pin.repo}/${pin.commit}/${pin.path}`;

let upstream;
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  upstream = await res.text();
} catch (error) {
  console.log(`• shared commit rules not verified (offline: ${error.message}); CI verifies them`);
  process.exit(0);
}

if (upstream !== local) {
  console.error(
    `✖ ${pin.vendoredAs} differs from ${pin.repo}@${pin.tag} (${pin.commit.slice(0, 8)}) ${pin.path}.\n` +
      "  The commit rules are shared: change them in shared-workflows, then run\n" +
      "  npm run sync:commit-rules -- <tag>",
  );
  process.exit(1);
}

// A newer tag upstream is news, not a failure.
let newer = "";
try {
  const tags = execFileSync("git", ["ls-remote", "--tags", "--refs", `https://github.com/${pin.repo}.git`], {
    encoding: "utf8",
    timeout: 8000,
  })
    .split("\n")
    .map((line) => line.split("refs/tags/")[1])
    .filter((t) => t && /^v\d+\.\d+\.\d+$/.test(t));
  const key = (t) => t.slice(1).split(".").map(Number);
  const cmp = (a, b) => key(a).reduce((d, n, i) => d || n - key(b)[i], 0);
  const latest = tags.sort(cmp).at(-1);
  if (latest && cmp(latest, pin.tag) > 0) newer = ` — ${latest} is available: npm run sync:commit-rules -- ${latest}`;
} catch {
  /* no tag list: nothing to report */
}
console.log(`✓ commit rules match ${pin.repo}@${pin.tag}${newer}`);
