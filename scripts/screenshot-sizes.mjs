#!/usr/bin/env node
/**
 * The showcase at the text sizes, in a real browser (docs/text-size-harmonization.md §8,
 * §9): jsdom lays nothing out, so whether a page holds at 125 % and 150 % — a 390 px
 * phone is 260 px of layout at Extra large, a 360 px one 240 — can only be seen here.
 *
 * For every page × variant it loads the BUILT showcase at `?text-size=` (stores.ts reads
 * it before the first paint and never stores it), screenshots the first screen, and
 * reports horizontal overflow: the document's `scrollWidth > clientWidth`, the `<main>`
 * scroller's likewise, and the outermost elements that reach past the viewport outside
 * any clipping scroller. A page that overflows also gets a full-page JPEG and a shot of
 * the screen its first offender is on.
 *
 * Variants: 360 px at Extra large (the narrowest case), and 390 px at Normal, Large and
 * Extra large.
 *
 * Usage:
 *   npx vite build --config showcase/vite.config.ts --logLevel warn   (once)
 *   node scripts/screenshot-sizes.mjs [--out DIR] [--pages start,inputs,…] [--url URL]
 *
 *   --out    where the screenshots go (default: $TMPDIR/ui-kit-sizes)
 *   --pages  showcase slugs (default: fifteen representative pages, below)
 *   --url    a showcase already being served; without it the script starts
 *            `vite preview` on SHOWCASE_PREVIEW_PORT (default 4179, so it never takes
 *            the 4171 an editor task wants) and stops it at the end
 *
 * Environment:
 *   PLAYWRIGHT_CORE  a playwright-core package directory (default: the one resolvable from
 *                    here, else ../keksdose/node_modules/playwright-core)
 *   CHROMIUM         the browser executable (default: the newest Chromium headless shell
 *                    under ~/.cache/ms-playwright)
 *   LD_LIBRARY_PATH  handed to the browser as is — for a machine missing a library the
 *                    headless shell links against (libasound)
 *
 * Exits 1 when any page overflows, so it can gate a release run.
 */
/* global document, getComputedStyle -- `measure` runs in the page, not in Node. */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const DEFAULT_PAGES = [
  "overview",
  "inputs",
  "forms",
  "pickers",
  "buttons",
  "chips-toggles",
  "feedback",
  "description-list",
  "data-table",
  "layout",
  "series-chart",
  "stats",
  "calendar-heatmap",
  "settings",
  "shell",
];

/** width × height in CSS px, and the text size. */
const VARIANTS = [
  { width: 360, height: 780, size: "xlarge" },
  { width: 390, height: 844, size: "normal" },
  { width: 390, height: 844, size: "large" },
  { width: 390, height: 844, size: "xlarge" },
];

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE,
    join(ROOT, "node_modules/playwright-core"),
    resolve(ROOT, "../keksdose/node_modules/playwright-core"),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (existsSync(join(dir, "package.json"))) return createRequire(join(dir, "package.json"))(dir);
  }
  throw new Error(`playwright-core not found (tried ${candidates.join(", ")}); set PLAYWRIGHT_CORE`);
}

function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const cache = join(homedir(), ".cache/ms-playwright");
  const shells = existsSync(cache)
    ? readdirSync(cache)
        .filter((name) => name.startsWith("chromium_headless_shell-"))
        .sort()
        .reverse()
    : [];
  for (const shell of shells) {
    const exe = join(cache, shell, "chrome-headless-shell-linux64/chrome-headless-shell");
    if (existsSync(exe)) return exe;
  }
  throw new Error(`no Chromium headless shell under ${cache}; set CHROMIUM`);
}

/** Starts `vite preview` on `port` and resolves once it answers. */
async function startPreview(port) {
  const child = spawn("npx", ["vite", "preview", "--config", "showcase/vite.config.ts"], {
    cwd: ROOT,
    env: { ...process.env, SHOWCASE_PREVIEW_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    // Its own process group, so stopping it stops vite and not only the npx above it.
    detached: true,
  });
  const stop = () => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  };
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`vite preview exited:\n${log}`);
    try {
      if ((await fetch(url)).ok) return { stop, url };
    } catch {
      /* not up yet */
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  stop();
  throw new Error(`vite preview did not answer on ${url}:\n${log}`);
}

/** Runs in the page: how far it overflows, and what reaches past the viewport. */
function measure() {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const main = document.querySelector("main");
  const result = {
    document: doc.scrollWidth - vw,
    main: main ? main.scrollWidth - main.clientWidth : 0,
    offenders: [],
  };
  if (result.document <= 0 && result.main <= 0) return result;
  const clips = (el) => /(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowX);
  const fixed = (el) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      if (getComputedStyle(node).position === "fixed") return true;
    }
    return false;
  };
  const clipped = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (clips(node) && node !== main) return true;
    }
    return false;
  };
  const past = (el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && (box.right > vw + 1 || box.left < -1);
  };
  const describe = (el) => {
    const box = el.getBoundingClientRect();
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 6).join(".") : "";
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
    return `<${el.tagName.toLowerCase()}${cls ? "." + cls : ""}> ${Math.round(box.left)}…${Math.round(box.right)}px "${text}"`;
  };
  for (const el of document.body.querySelectorAll("*")) {
    if (!past(el) || clipped(el) || fixed(el)) continue;
    // The outermost only: a block that overflows, not each of its children too.
    const parent = el.parentElement;
    if (parent && parent !== document.body && past(parent) && !clipped(parent)) continue;
    // Marked, so the script can scroll to the first one for a screenshot.
    el.setAttribute("data-overflow-offender", String(result.offenders.length));
    result.offenders.push(describe(el));
    if (result.offenders.length >= 6) break;
  }
  return result;
}

async function main() {
  const out = resolve(arg("out", join(tmpdir(), "ui-kit-sizes")));
  const pages = arg("pages", DEFAULT_PAGES.join(",")).split(",").filter(Boolean);
  mkdirSync(out, { recursive: true });

  const given = arg("url", "");
  const preview = given ? null : await startPreview(Number(process.env.SHOWCASE_PREVIEW_PORT ?? 4179));
  const base = (given || preview.url).replace(/\/?$/, "/");

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ executablePath: findChromium(), env: { ...process.env } });
  const findings = [];
  try {
    for (const variant of VARIANTS) {
      const context = await browser.newContext({
        viewport: { width: variant.width, height: variant.height },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      for (const slug of pages) {
        const name = `${slug}--${variant.width}-${variant.size}`;
        await page.goto(`${base}?text-size=${variant.size}#/${slug}`, { waitUntil: "networkidle" });
        // The lazy section, its fonts and the first effects.
        await page.waitForTimeout(600);
        const applied = await page.evaluate(() => document.documentElement.dataset.textSize ?? "normal");
        const result = await page.evaluate(measure);
        const shot = join(out, `${name}.png`);
        await page.screenshot({ path: shot });
        const overflows = result.document > 0 || result.main > 0;
        let full;
        let offender;
        if (overflows) {
          full = join(out, `${name}--full.jpg`);
          await page.screenshot({ path: full, fullPage: true, type: "jpeg", quality: 60 });
          const first = page.locator('[data-overflow-offender="0"]');
          if (await first.count()) {
            await first.scrollIntoViewIfNeeded();
            offender = join(out, `${name}--offender.png`);
            await page.screenshot({ path: offender });
          }
        }
        findings.push({ name, applied, variant, ...result, shot, full, offender });
        const verdict = overflows
          ? `OVERFLOW document +${result.document}px, main +${result.main}px`
          : "ok";
        console.log(`${name.padEnd(36)} ${applied === variant.size ? "" : `(size ${applied}!) `}${verdict}`);
        for (const offender of result.offenders) console.log(`    ${offender}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    preview?.stop();
  }

  const bad = findings.filter((f) => f.document > 0 || f.main > 0);
  console.log(`\n${findings.length} screenshots in ${out}; ${bad.length} overflow.`);
  for (const f of bad) console.log(`  ${f.name}: ${f.offender ?? f.full}`);
  process.exitCode = bad.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
