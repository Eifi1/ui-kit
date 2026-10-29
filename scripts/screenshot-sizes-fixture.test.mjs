#!/usr/bin/env node
/**
 * The size sweep's two checks against their fixture (docs/text-size-harmonization.md
 * §10.17, §10.22) — report-only by themselves, the release gate with `--gate-truncation`
 * (`npm run check:sweep`, since 0.34, which runs this file first). Outside
 * `npm run check`: it drives Chromium, and jsdom lays nothing out, so the unit tests can
 * only pin classes.
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
 * The browser is the sweep's (`npx playwright-core install chromium-headless-shell`, once);
 * its CHROMIUM and LD_LIBRARY_PATH (a machine without libasound points it at a copy) are
 * passed through. The four variants run at once there, and their blocks still come out
 * in order, which the per-variant parse below relies on.
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
// Exit 2 is the script failing, not a check: most often no browser, which its message
// says how to install. That message is the whole report.
if (report.code === 2) {
  console.error(`✖ the sweep could not run:\n${report.out}`);
  process.exit(1);
}
// One block per variant: the page line, then its findings until the next page line.
const blocks = report.out.split(/\n(?=fixture--)/).filter((b) => b.startsWith("fixture--"));
expect(blocks.length === 4, `four variants, got ${blocks.length}`);
// Run at once, printed in order (TST-6): each variant's block whole, in VARIANTS order.
const order = blocks.map((b) => b.split(/\s/)[0]).join(" ");
expect(
  order === "fixture--360-xlarge fixture--390-normal fixture--390-large fixture--390-xlarge",
  `variants in order, got ${order}`,
);
for (const block of blocks) {
  const name = block.split(/\s/)[0];
  const truncated = block.match(/^ {4}TRUNCATED .*$/gm) ?? [];
  const pinned = block.match(/^ {4}PINNED .*$/gm) ?? [];
  if (name.endsWith("-normal")) {
    expect(truncated.length === 0 && pinned.length === 0, `${name}: no checks at Normal`);
    continue;
  }
  expect(truncated.length === 1, `${name}: one TRUNCATED, got ${truncated.length}`);
  expect(
    /\[fixture-cut\] «An ellipsis that cuts» 120px ellipsis <[a-z]+[^>]*>: "A label far too long/.test(
      truncated[0] ?? "",
    ),
    `${name}: the cut one, named by slot and heading`,
  );
  expect(pinned.length === 1, `${name}: one PINNED, got ${pinned.length}`);
  expect(
    /\[fixture-tall\] «A tall sticky box» sticky \d+px \(60 % of the viewport\)/.test(pinned[0] ?? ""),
    `${name}: the tall sticky box`,
  );
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
