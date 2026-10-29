#!/usr/bin/env node
/**
 * Dependabot, locally: run by .husky/pre-push before `npm run check` (Marcel, 2026-10-16:
 * "Copy the Keksdose approach"; keksdose's scripts/check-dependencies.py).
 *
 * Two halves, with different weights:
 *
 * 1. GitHub's open Dependabot ALERTS (a vulnerable dependency) BLOCK the push: one
 *    `gh api` call. Offline, or without a `gh` login, it warns and lets the push through —
 *    `npm run check` still runs `npm audit --audit-level=high`, which needs no GitHub.
 * 2. Newer minor and patch versions of the DIRECT dependencies are a REPORT only:
 *    something upstream released this morning must not stop a push. Majors are left out,
 *    as dependabot.yml left them out (a major is taken by hand with its migration).
 *
 * This replaces Dependabot's npm version-update PRs, switched off in
 * .github/dependabot.yml (keksdose measured their CI at 43 % of its Actions minutes).
 * The GitHub Actions pins keep their monthly Dependabot PR: no local tool lists those.
 *
 * Exit 1 only for an open alert. `SKIP_DEPENDENCY_CHECK=1` skips the whole check.
 */
import { spawnSync } from "node:child_process";

const REPO = "Eifi1/ui-kit";

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 });
}

const major = (version) => Number.parseInt(String(version).split(".")[0], 10) || 0;

function alerts() {
  const result = run("gh", ["api", `repos/${REPO}/dependabot/alerts?state=open&per_page=100`]);
  if (result.status !== 0) {
    const why = (result.stderr || "").trim().slice(0, 120) || result.error?.message || "failed";
    console.log(`⚠ Dependabot alerts not checked (gh: ${why}).`);
    return 0;
  }
  const found = JSON.parse(result.stdout || "[]");
  if (found.length === 0) {
    console.log("✓ No open Dependabot alerts.");
    return 0;
  }
  console.log(`✗ ${found.length} open Dependabot alert(s) — fix before pushing:`);
  for (const alert of found) {
    const dep = alert.dependency?.package ?? {};
    const adv = alert.security_advisory ?? {};
    const fix = alert.security_vulnerability?.first_patched_version?.identifier ?? "?";
    console.log(
      `  - ${dep.ecosystem} ${dep.name}: ${adv.severity} — ${adv.summary} (fixed in ${fix}) ${alert.html_url ?? ""}`,
    );
  }
  return 1;
}

function npmUpdates() {
  // `npm outdated` exits 1 when anything is outdated; its JSON is on stdout either way.
  const result = run("npm", ["outdated", "--json"]);
  let data;
  try {
    data = JSON.parse(result.stdout || "{}");
  } catch {
    return ["npm outdated gave no answer"];
  }
  const lines = [];
  for (const name of Object.keys(data).sort()) {
    const { current, wanted, latest } = data[name];
    if (!current || !latest || current === latest) continue;
    let target = latest;
    if (major(latest) !== major(current)) {
      // The newest within this major is still worth a line.
      if (!wanted || wanted === current || major(wanted) !== major(current)) continue;
      target = wanted;
    }
    lines.push(`npm  ${name} ${current} → ${target}`);
  }
  return lines;
}

function main() {
  if (process.env.SKIP_DEPENDENCY_CHECK) return 0;
  const status = alerts();
  const updates = npmUpdates();
  if (updates.length > 0) {
    console.log(`ℹ ${updates.length} minor/patch update(s) available — not blocking; take them in the next round:`);
    for (const line of updates) console.log(`  ${line}`);
  } else {
    console.log("✓ Direct dependencies are current (minor/patch).");
  }
  return status;
}

process.exit(main());
