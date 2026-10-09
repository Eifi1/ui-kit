#!/usr/bin/env node
/**
 * The size sweep's two report-only checks against their fixture
 * (docs/text-size-harmonization.md §10.17, §10.22). Outside `npm run check`: it drives
 * Chromium, and jsdom lays nothing out, so the unit tests can only pin classes.
 *
 *   node scripts/screenshot-sizes-fixture.test.mjs
 *
 * At each Large and Extra large variant the fixture must give exactly one TRUNCATED
 * finding — the ellipsis that cuts, not the one that fits, the one under
 * `data-truncate-ok` or the `.sr-only` one — and exactly one PINNED finding: the sticky
 * box of 60 % of the viewport, not the one of 40 %, the sticky column or the dialog. At
 * Normal, neither check runs. Report-only, the run exits 0; `--gate-truncation` makes it
 * 3. Exits 1 on a failed expectation.
 *
 * The browser is the sweep's: its PLAYWRIGHT_CORE, CHROMIUM and LD_LIBRARY_PATH (a
 * machine without libasound points it at a copy) are passed through.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const fixture = pathToFileURL(resolve(ROOT, "scripts/fixtures/screenshot-sizes-fixture.html")).href;

function sweep(...extra) {
  const run = spawnSync(
    process.execPath,
    ["scripts/screenshot-sizes.mjs", "--url", fixture, "--pages", "fixture", "--no-screens", ...extra],
    { cwd: ROOT, encoding: "utf8", env: process.env },
  );
  return { code: run.status, out: `${run.stdout}${run.stderr}` };
}

const failures = [];
const expect = (ok, what) => {
  if (!ok) failures.push(what);
};

const report = sweep();
// One block per variant: the page line, then its findings until the next page line.
const blocks = report.out.split(/\n(?=fixture--)/).filter((b) => b.startsWith("fixture--"));
expect(blocks.length === 4, `four variants, got ${blocks.length}`);
for (const block of blocks) {
  const name = block.split(/\s/)[0];
  const truncated = block.match(/^ {4}TRUNCATED .*$/gm) ?? [];
  const pinned = block.match(/^ {4}PINNED .*$/gm) ?? [];
  if (name.endsWith("-normal")) {
    expect(truncated.length === 0 && pinned.length === 0, `${name}: no checks at Normal`);
    continue;
  }
  expect(truncated.length === 1, `${name}: one TRUNCATED, got ${truncated.length}`);
  expect(/\[fixture-cut\] «An ellipsis that cuts» 120px ellipsis: "A label far too long/.test(truncated[0] ?? ""), `${name}: the cut one, named by slot and heading`);
  expect(pinned.length === 1, `${name}: one PINNED, got ${pinned.length}`);
  expect(/\[fixture-tall\] «A tall sticky box» sticky \d+px \(60 % of the viewport\)/.test(pinned[0] ?? ""), `${name}: the tall sticky box`);
}
expect(report.code === 0, `report-only exits 0, got ${report.code}`);
expect(/TRUNCATED: 3 in 3 runs \(report-only\)/.test(report.out), "the TRUNCATED total");
expect(/PINNED: 3 in 3 runs \(report-only\)/.test(report.out), "the PINNED total");

const gated = sweep("--gate-truncation");
expect(gated.code === 3, `--gate-truncation exits 3, got ${gated.code}`);
const off = sweep("--gate-truncation", "--no-truncation", "--no-pinned");
expect(off.code === 0, `both checks off exits 0, got ${off.code}`);

if (failures.length) {
  console.error(`✖ ${failures.length} failed:\n  ${failures.join("\n  ")}\n\n${report.out}`);
  process.exit(1);
}
console.log("✓ the size sweep's TRUNCATED and PINNED checks hold on their fixture");
