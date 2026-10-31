#!/usr/bin/env node
/**
 * The commit-message rules are the SHARED ones: every file in scripts/shared-commit-rules.json
 * `files[]` — scripts/check-commit-msg.cjs and scripts/check-pushed-commits.cjs (the pre-push
 * hook's check of every pushed commit, 0.46) — is a byte-for-byte copy of the file of that
 * path in Eifi1/shared-workflows, pinned to the commit in the pin file: the same rules every
 * app's shared commit-check action runs. Copies rather than the action because ui-kit checks
 * LOCALLY first: the husky commit-msg and pre-push hooks and `npm run check` need the rules
 * on disk, and CI runs those same npm scripts (see CONTRIBUTING → The gates).
 *
 * This check fails when a copy no longer matches the pinned upstream file (someone
 * edited it here, or the pin moved without a sync). Offline — a network error, no answer
 * at all — it says so and passes: the pre-push hook must not need a network. Never under
 * CI, which always has one and is where it is enforced. An HTTP answer that is not 200 is
 * a failure everywhere: a 404 is a wrong pin or a moved upstream file, and a 429 or 5xx
 * verified nothing (refactor audit 2026-10-30, TST-7; until then any failure passed as
 * "offline", in CI too).
 * While the pin waits for its tag ("v1.3.1 (pending tag)", no commit yet) it says so and
 * passes too. A newer shared tag is reported, not failed: taking it is a decision, made
 * with `npm run sync:commit-rules -- <tag>`.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const pin = JSON.parse(readFileSync(new URL("./shared-commit-rules.json", import.meta.url), "utf8"));
if (!/^[0-9a-f]{40}$/.test(pin.commit)) {
  console.log(`• shared commit rules not verified: the pin is ${pin.tag}, no commit yet`);
  process.exit(0);
}

/** No answer at all: fetch's own network failure, or the timeout below. */
const isNetworkError = (error) =>
  error instanceof TypeError || error?.name === "AbortError" || error?.name === "TimeoutError";

const differ = [];
for (const file of pin.files) {
  const url = `https://raw.githubusercontent.com/${pin.repo}/${pin.commit}/${file.path}`;
  let res;
  let text;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    // The body read too: the timeout bounds it, and a connection can drop after the
    // headers. Outside the try, it crashed the script with an unhandled TimeoutError
    // (0.52 code review).
    if (res.ok) text = await res.text();
  } catch (error) {
    if (!isNetworkError(error) || process.env.CI) {
      console.error(`✖ shared commit rules not verified: ${url}: ${error.message}`);
      process.exit(1);
    }
    console.log(`• shared commit rules not verified (offline: ${error.message}); CI verifies them`);
    process.exit(0);
  }
  if (!res.ok) {
    console.error(
      `✖ shared commit rules not verified: HTTP ${res.status} for ${url}.\n` +
        "  Is the pin in scripts/shared-commit-rules.json right, and the file still at that path?",
    );
    process.exit(1);
  }
  const local = readFileSync(new URL("../" + file.vendoredAs, import.meta.url), "utf8");
  if (text !== local) differ.push(file);
}

if (differ.length) {
  console.error(
    differ
      .map((f) => `✖ ${f.vendoredAs} differs from ${pin.repo}@${pin.tag} (${pin.commit.slice(0, 8)}) ${f.path}.`)
      .join("\n") +
      "\n  The commit rules are shared: change them in shared-workflows, then run\n" +
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
