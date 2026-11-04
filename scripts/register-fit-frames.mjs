#!/usr/bin/env node
/**
 * keksdose's register fit, measured in the kit (0.51.2 leftovers): loads
 * scripts/fixtures/register-fit/ — a `virtualize`d DataTable shaped as keksdose's register,
 * whose rows, tiles and font arrive at random moments as in an app — N times per window
 * width in Chromium, and logs per animation frame the table's width against its scroller,
 * the columns drawn, the data rows drawn and the `<colgroup>` lock. keksdose's own harness
 * (.feedback-live/kit0512-frames.mjs, kit0512-analyse.py) logs the same on its production
 * build, which needs its backend and a token; this one needs neither.
 *
 * Per width it reports what keksdose's analysis did, and two more:
 *  - the column sets the loads END with, and how many of each (one set per width is the
 *    goal: the same content at the same width);
 *  - the loads that drew the table wider than its scroller after the rows came, and for
 *    how long (ms and frames), and how many loads still end that way;
 *  - how often the drawn set changed after the rows came, and the flip-flops (a set left
 *    and seen again);
 *  - how many data rows the first frame with rows drew (0.51.2: the window's rows came a
 *    frame after the data), and whether that frame was already too wide.
 *
 * `--scenario edit` goes on after the load as keksdose N2 did (0.49 review 3): it scrolls
 * the table down past a row with a wider cell and back, so `virtualize`'s column lock keeps
 * the width it grew to, then edits — a refetch of the same rows, one of them wider — and
 * reports both phases the same way. The set it ends with is compared with a fresh load of
 * the edited rows, `--start edited`: the same content at the same width.
 *
 * Not part of `npm run check` (it needs Chromium; jsdom lays nothing out). The browser is
 * the kit's own (playwright-core, its headless shell: scripts/e2e-showcase-server.mjs).
 *
 * Usage:
 *   node scripts/register-fit-frames.mjs [--loads 10] [--widths 1124,1280,1440]
 *        [--height 1162] [--secs 4] [--font system|web] [--font-delay 600]
 *        [--scenario load|edit] [--start edited] [--nav 270] [--query k=v&…]
 *        [--dist DIR | --build-only DIR] [--json FILE] [--label NAME]
 *
 *   --dist        a fixture built before (by --build-only), served as it is: how two
 *                 builds of the kit are compared (build one, change the source, build
 *                 the other). Without it the fixture is built from the working tree.
 *   --build-only  build the fixture into DIR and stop.
 *   --secs        how long a load is logged before the scenario goes on.
 *   --font web    a web font with `font-display: swap`, served up to --font-delay ms late
 *                 (random per load). Default `system`, as keksdose (Tailwind's stack).
 *   --nav         the fixture's sidebar, px: 270 leaves the scroller at the viewport less
 *                 367px, keksdose's chrome (1124 → 757, 1280 → 913, 1440 → 1073).
 *   --query       more of the fixture's own parameters (`rows=`, `seed=`, `monthly=`;
 *                 main.tsx). `monthly=24` puts the wide monthly row among the first rows
 *                 the window keeps once scrolled back to the top, the edit scenario's case.
 *   --json       every load's frame log, one JSON line each, for a later look.
 *
 * On a shared machine, wait for memory first (one browser at a time, closed at the end).
 */
import { createReadStream, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, loadPlaywright } from "./e2e-showcase-server.mjs";

/* global document, requestAnimationFrame, window -- the logger and the scenario run in the page, not in Node. */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = join(ROOT, "scripts/fixtures/register-fit");
// A woff2 that is in node_modules anyway (vitest's report UI): the `--font web` case only.
const FONT = join(ROOT, "node_modules/@vitest/istanbul-lib-report/dist/reports/html/assets/readex-pro.woff2");

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const LOADS = Number(option("loads", 10));
const WIDTHS = option("widths", "1124,1280,1440").split(",").map(Number);
const HEIGHT = Number(option("height", 1162));
const SECS = Number(option("secs", 4));
const FONT_MODE = option("font", "system");
const FONT_DELAY = Number(option("font-delay", 600));
const SCENARIO = option("scenario", "load");
const START = option("start", "");
const QUERY = option("query", "");
const NAV = Number(option("nav", 270));
const LABEL = option("label", "");
const JSON_OUT = option("json", null);

async function buildFixture(outDir) {
  const { build } = await import("vite");
  const { default: react } = await import("@vitejs/plugin-react");
  const { default: tailwindcss } = await import("@tailwindcss/vite");
  await build({
    root: FIXTURE,
    base: "./",
    configFile: false,
    logLevel: "warn",
    plugins: [tailwindcss(), react()],
    build: { outDir, emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  });
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };

/** The built fixture, and the font served late (a random part of FONT_DELAY per request). */
function serve(dir) {
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/font.woff2") {
      setTimeout(() => {
        res.writeHead(200, { "content-type": "font/woff2", "cache-control": "no-store" });
        createReadStream(FONT).pipe(res);
      }, Math.random() * FONT_DELAY);
      return;
    }
    const file = normalize(join(dir, path === "/" ? "index.html" : path));
    if (!file.startsWith(dir) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

/** In the page, before its scripts: one entry per frame whose state differs from the last,
 *  for `secs`. The harness adds its marks (`{ mark }`) as it acts, through `__mark`. */
function frameLogger(secs) {
  const log = [];
  let frame = 0;
  window.__frames = log;
  const t0 = performance.now();
  window.__mark = (mark) => log.push({ mark, t: Math.round(performance.now() - t0), f: frame });
  let last = "";
  const tick = () => {
    frame++;
    const table = document.querySelector("table");
    if (table) {
      const box = table.parentElement;
      const tw = Math.round(table.getBoundingClientRect().width);
      const boxW = box.clientWidth;
      const cols = [...table.querySelectorAll("thead th")]
        .map((th) => th.textContent.trim())
        .filter(Boolean)
        .join(",");
      const rows = table.querySelectorAll(":scope > tbody > tr[data-row-index]").length;
      const lock = [...table.querySelectorAll(":scope > colgroup > col")].filter((c) => c.style.width).length;
      const key = `${tw}|${boxW}|${cols}|${rows}|${lock}`;
      if (key !== last) {
        last = key;
        log.push({ t: Math.round(performance.now() - t0), f: frame, tw, boxW, cols, rows, lock });
      }
    }
    if (performance.now() - t0 < secs * 1000) requestAnimationFrame(tick);
    else {
      // The header cells' widths at the end: how close each load came to a decision.
      const heads = [...(document.querySelector("table")?.querySelectorAll("thead th") ?? [])].map(
        (th) => `${th.textContent.trim() || "·"}:${Math.round(th.getBoundingClientRect().width)}`,
      );
      log.push({ end: Math.round(performance.now() - t0), f: frame, heads: heads.join(" ") });
    }
  };
  requestAnimationFrame(tick);
}

/** `--scenario edit`, after the load: down past the yearly row and back in steps (the lock
 *  keeps what it grew to), a second's rest, then the edit and two seconds more. */
async function scrollAndEdit(page) {
  await page.evaluate(() => window.__mark("scroll"));
  for (const to of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0]) {
    await page.evaluate((at) => {
      const box = document.querySelector("table").parentElement;
      box.scrollTop = at * box.scrollHeight;
    }, to);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1000);
  await page.evaluate(() => (window.__mark("edit"), window.__edit()));
}

/**
 * One phase's verdict, as kit0512-analyse.py reads a log. The load: from the first frame
 * with rows to the first mark. A later phase: from its mark (the state the mark found
 * first) to the next mark or the end.
 */
function analyse(log, from) {
  const end = log.find((e) => e.end !== undefined);
  const marks = log.flatMap((e, i) => (e.mark !== undefined ? [i] : []));
  const at = from ? log.findIndex((e) => e.mark === from) : 0;
  if (at === -1) return { error: `no ${from} mark` };
  const next = marks.find((i) => i > at);
  const stop = next !== undefined ? log[next] : end;
  const before = from
    ? log
        .slice(0, at)
        .filter((e) => e.cols !== undefined)
        .slice(-1)
    : [];
  const states = before.concat(log.slice(at, next)).filter((e) => e.cols !== undefined);
  const drawn = states.filter((e) => e.rows > 0);
  if (!drawn.length) return { error: "no rows drawn" };
  let tooWideMs = 0;
  let tooWideFrames = 0;
  drawn.forEach((e, i) => {
    const after = drawn[i + 1] ?? stop;
    if (e.tw > e.boxW + 1) {
      tooWideMs += (after.t ?? after.end) - Math.max(e.t, from ? log[at].t : 0);
      tooWideFrames += after.f - Math.max(e.f, from ? log[at].f : 0);
    }
  });
  const sets = drawn.map((e) => e.cols);
  const changes = sets.slice(1).filter((s, i) => s !== sets[i]).length;
  const seen = [];
  let flip = false;
  for (const s of sets) {
    if (seen.length && s !== seen[seen.length - 1] && seen.includes(s)) flip = true;
    if (!seen.length || s !== seen[seen.length - 1]) seen.push(s);
  }
  const final = drawn[drawn.length - 1];
  return {
    finalCols: final.cols,
    finalOverflow: final.tw > final.boxW + 1,
    finalW: `${final.tw}/${final.boxW}`,
    tooWideMs,
    tooWideFrames,
    changes,
    flip,
    firstRows: drawn[0].rows,
    firstTooWide: drawn[0].tw > drawn[0].boxW + 1,
  };
}

const short = (cols) =>
  cols
    .split(",")
    .filter((c) => !["Date", "Payee", "Amount", "Actions"].includes(c))
    .join(",") || "(none)";

function report(width, loads) {
  const ok = loads.filter((x) => !x.load.error);
  const boxes = [...new Set(ok.map((x) => x.load.finalW.split("/")[1]))].join(",");
  console.log(
    `${LABEL ? `${LABEL} ` : ""}@ ${width} (scroller ${boxes}): ${ok.length} loads` +
      (ok.length < loads.length ? ` (${loads.length - ok.length} without rows)` : ""),
  );
  const phase = (name, of, what) => {
    const xs = ok.map(of).filter((x) => !x.error);
    const flashes = xs.filter((x) => x.tooWideMs > 0 && !x.finalOverflow);
    const sorted = (key) =>
      flashes
        .map((x) => x[key])
        .sort((a, b) => a - b)
        .join(", ");
    console.log(`  ${name}: overflow at its end ${xs.filter((x) => x.finalOverflow).length}/${xs.length}`);
    console.log(
      `    too wide ${what}, then re-fitted: ${flashes.length}/${xs.length}` +
        (flashes.length ? ` (ms: ${sorted("tooWideMs")}; frames: ${sorted("tooWideFrames")})` : ""),
    );
    console.log(
      `    set changes, per load: [${xs.map((x) => x.changes).join(", ")}]; flip-flops: ${xs.filter((x) => x.flip).length}`,
    );
    const sets = new Map();
    for (const x of xs) sets.set(x.finalCols, (sets.get(x.finalCols) ?? 0) + 1);
    for (const [cols, n] of [...sets].sort((a, b) => b[1] - a[1])) console.log(`    ${n}x ${short(cols)}   (${cols})`);
    return xs;
  };
  const load = phase("load", (x) => x.load, "after the rows came");
  const firstRows = load.map((x) => x.firstRows);
  console.log(
    `    the first frame with rows drew ${Math.min(...firstRows)}–${Math.max(...firstRows)} rows; too wide in ${
      load.filter((x) => x.firstTooWide).length
    }/${load.length}`,
  );
  if (ok[0]?.scroll) {
    phase("scroll down and back", (x) => x.scroll, "while scrolling");
    phase("edit", (x) => x.edit, "after the edit");
  }
}

async function main() {
  const buildOnly = option("build-only", null);
  let dist = option("dist", null);
  if (buildOnly || !dist) {
    dist = buildOnly ?? mkdtempSync(join(tmpdir(), "ui-kit-register-fit-"));
    await buildFixture(dist);
    if (buildOnly) {
      console.log(`built into ${dist}`);
      return;
    }
  }
  if (FONT_MODE === "web" && !existsSync(FONT)) throw new Error(`--font web needs ${FONT}`);
  const server = await serve(normalize(dist));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const query = `?font=${FONT_MODE}&nav=${NAV}${START ? `&start=${START}` : ""}${QUERY ? `&${QUERY}` : ""}`;
  // The edit scenario's seconds: twelve scroll steps, a second's rest, two after the edit.
  const logSecs = SECS + (SCENARIO === "edit" ? 6 : 0);
  const { chromium, version } = loadPlaywright();
  const browser = await launchBrowser(chromium, version);
  const json = [];
  try {
    for (const width of WIDTHS) {
      const loads = [];
      for (let run = 1; run <= LOADS; run++) {
        const ctx = await browser.newContext({ viewport: { width, height: HEIGHT } });
        await ctx.addInitScript(frameLogger, logSecs);
        const page = await ctx.newPage();
        await page.goto(base + query, { waitUntil: "commit" });
        await page.waitForTimeout(SECS * 1000);
        if (SCENARIO === "edit") await scrollAndEdit(page);
        await page.waitForFunction(() => window.__frames.some((e) => e.end !== undefined), null, {
          timeout: 30000,
        });
        const log = await page.evaluate(() => window.__frames);
        const stages = await page.evaluate(() => window.__fixture);
        await ctx.close();
        loads.push({
          run,
          stages,
          load: analyse(log, null),
          ...(SCENARIO === "edit" ? { scroll: analyse(log, "scroll"), edit: analyse(log, "edit") } : null),
        });
        json.push({ label: LABEL, width, run, stages, log });
      }
      report(width, loads);
    }
  } finally {
    server.close();
    await browser.close();
  }
  if (JSON_OUT) writeFileSync(JSON_OUT, json.map((j) => JSON.stringify(j)).join("\n") + "\n");
}

await main();
