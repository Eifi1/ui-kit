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
 * Extra large. They run at once, in four contexts of one browser, and each one's lines
 * are held back until the variants before it have printed, so the output reads in order
 * (refactor audit 2026-10 TST-6: the run was 324 page loads in a row, ~25 minutes).
 *
 * Two more checks at Large and Extra large (0.33, docs/text-size-harmonization.md
 * §10.17, §10.22). Report-only by themselves; with `--gate-truncation` either one fails
 * the run, and since 0.34 a release is gated that way (`npm run check:sweep`, below):
 *  - **TRUNCATED** (`measureTruncation`): a one-line ellipsis, or a line clamp, that cuts
 *    its text. An overflow check cannot see it — the box holds, only its words are gone
 *    ("Payment r…") — and §4 says text wraps at Large. Normal keeps its ellipses. A
 *    deliberate one (a value one tap away) sits under `data-truncate-ok`, with the
 *    reason in a code comment; never on a name or an email.
 *  - **PINNED** (`measurePinned`): a `fixed`, or vertically `sticky`, box taller than
 *    half the viewport. It grows with the text and leaves no room for what it is pinned
 *    over, which is neither an overflow nor a truncation. A dialog (and what holds one)
 *    covers the screen by design; a deliberate case sits under `data-pinned-ok`.
 *
 * Usage:
 *   npm run check:sweep      the release gate (0.34): the fixture test below, then the
 *                            showcase build, then every page with `--pages all
 *                            --no-screens --gate-truncation`. CI runs it on a release PR
 *                            (ci.yml's `sweep` job; refactor plan 2026-10, decision 2: the
 *                            one check that runs in CI first, to keep Chromium off the
 *                            shared machine). Not part of `npm run check` or
 *                            `npm run release`; run it by hand to see a result before CI.
 *
 *   npx vite build --config showcase/vite.config.ts --logLevel warn   (once)
 *   node scripts/screenshot-sizes.mjs [--out DIR] [--pages start,inputs,…|all] [--url URL]
 *                                     [--no-screens] [--no-truncation] [--no-pinned]
 *                                     [--gate-truncation] [--serial]
 *
 *   --out    where the screenshots go (default: $TMPDIR/ui-kit-sizes)
 *   --pages  showcase slugs (default: the representative pages below); `all` is every
 *            slug in showcase/src/routes.tsx
 *   --url    a showcase already being served; without it the script starts
 *            `vite preview` on SHOWCASE_PREVIEW_PORT (default 4179, so it never takes
 *            the 4171 an editor task wants) and stops it at the end. A `file://…html`
 *            page is loaded as it is (the fixture below)
 *   --no-screens       measure without screenshots: faster, and less memory on a shared
 *                      machine
 *   --truncation / --no-truncation   the TRUNCATED check (on by default)
 *   --pinned / --no-pinned           the PINNED check (on by default)
 *   --gate-truncation  exit 3 on a TRUNCATED or PINNED finding — the release gate since
 *                      0.34, through `npm run check:sweep`
 *   --serial           the variants one after another, as before: one renderer instead
 *                      of four, for a machine short of memory
 *
 * The checks' own test, outside `npm run check` (it needs Chromium; jsdom lays nothing
 * out): `node scripts/screenshot-sizes-fixture.test.mjs`, which runs this script on
 * scripts/fixtures/screenshot-sizes-fixture.html and expects one finding of each.
 * `npm run check:sweep` runs it first, so the gate checks itself before the long run.
 *
 * The browser (TST-5): `playwright-core` is a devDependency, pinned `~1.63.0`, and the
 * run uses the Chromium headless shell that release of it expects — never one borrowed
 * from an app's node_modules or picked from the cache by name. It installs no browser
 * itself; once per machine (and after a bump):
 *
 *   npx playwright-core install chromium-headless-shell
 *
 * CI adds `--with-deps` for the system libraries. When the browser is missing, the run
 * stops with that command.
 *
 * Environment:
 *   CHROMIUM         another browser executable, instead of playwright's own — for a
 *                    machine that cannot download it; a revision the client does not
 *                    pin is unsupported, so the gate's verdict is CI's
 *   LD_LIBRARY_PATH  handed to the browser — for a machine missing a library the headless
 *                    shell links against (libasound). ~/.local/lib, where a user without
 *                    root puts one, is appended when it exists, so the release gate runs
 *                    without it being set
 *
 * Exits 1 when any page overflows, so it can gate a release run; 3 with
 * `--gate-truncation` and a TRUNCATED or PINNED finding (an overflow still answers 1);
 * 2 when the script itself fails.
 */
/* global document, getComputedStyle, window, Node -- the measures run in the page, not in Node. */
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, loadPlaywright, SetupError, startPreview } from "./e2e-showcase-server.mjs";

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
  // 0.33 (§10.17): the parts the truncation check is about — the label above a field,
  // the file names, the account cards, the roster, the plan cards, the composer, lists.
  "fields",
  "files",
  "auth-account",
  "user-admin",
  "subscription",
  "feedback-compose",
  "lists-menus",
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

/** A switch: `--name`. */
function flag(name) {
  return process.argv.includes(`--${name}`);
}

/** A check that is on unless `--no-name` turns it off. */
function on(name) {
  return !flag(`no-${name}`);
}

/** Every page of the showcase: the slugs in showcase/src/routes.tsx, groups and pages. */
function allSlugs() {
  const source = readFileSync(join(ROOT, "showcase/src/routes.tsx"), "utf8");
  return [...new Set([...source.matchAll(/\bslug: "([a-z0-9-]+)"/g)].map((m) => m[1]))];
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

/**
 * Runs in the page, once per document, before the two checks below: what they share —
 * which boxes are not there to be read, and how a finding names its place. On `window`,
 * so each check stays one function `page.evaluate` can send.
 */
function installSweepHelpers() {
  const DIALOG = '[role="dialog"], [role="alertdialog"], [aria-modal="true"]';
  /** No box, or one nobody sees: zero size, `display: none` (no client rects),
   *  `visibility: hidden`. */
  const invisible = (el) => {
    const box = el.getBoundingClientRect();
    return (
      el.getClientRects().length === 0 ||
      box.width === 0 ||
      box.height === 0 ||
      getComputedStyle(el).visibility === "hidden"
    );
  };
  /** Out of the reading: an `aria-hidden` overlay, and the showcase's device-preview
   *  frames (another document, measured on its own pages). */
  const offstage = (el) =>
    el.closest('[aria-hidden="true"]') !== null ||
    el.tagName === "IFRAME" ||
    el.closest("figure")?.querySelector(":scope > div > iframe") != null;
  /** The nearest `[data-slot]` — the kit part — and the nearest heading before the box,
   *  which in the showcase is the example's. */
  const placeOf = (el) => {
    const slot = el.closest("[data-slot]")?.getAttribute("data-slot") ?? "";
    let heading = "";
    for (const h of document.querySelectorAll("h1, h2, h3, h4")) {
      if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) heading = h.textContent.trim();
      else break;
    }
    return { slot, heading };
  };
  /** The box itself, short — `<span.truncate.text-sm>` — so a finding can be traced to
   *  the class that cut it without opening the page. */
  const tagOf = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4) : [];
    return `<${el.tagName.toLowerCase()}${cls.map((c) => "." + c).join("")}>`;
  };
  window.__sizeSweep = { DIALOG, invisible, offstage, placeOf, tagOf };
}

/**
 * Runs in the page, at Large and Extra large: every one-line ellipsis and line clamp
 * that cuts its text (§10.17). Skips what is not read — no box, hidden, `.sr-only`,
 * `aria-hidden`, the device-preview frames — and `[data-truncate-ok]` subtrees. Each
 * finding is marked `data-truncation-offender=n`.
 */
function measureTruncation() {
  const { invisible, offstage, placeOf, tagOf } = window.__sizeSweep;
  const findings = [];
  for (const el of document.body.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    const oneLine =
      s.textOverflow === "ellipsis" && /hidden|clip/.test(s.overflowX) && s.whiteSpace.startsWith("nowrap");
    const clamped = s.webkitLineClamp && s.webkitLineClamp !== "none";
    const cut = oneLine ? el.scrollWidth > el.clientWidth + 1 : clamped ? el.scrollHeight > el.clientHeight + 1 : false;
    if (!cut) continue;
    if (invisible(el) || offstage(el)) continue;
    if (el.closest(".sr-only, .sr-only-fixed, [data-truncate-ok]")) continue;
    el.setAttribute("data-truncation-offender", String(findings.length));
    findings.push({
      ...placeOf(el),
      kind: oneLine ? "ellipsis" : "clamp",
      box: tagOf(el),
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
      width: Math.round(el.getBoundingClientRect().width),
    });
  }
  return findings;
}

/**
 * Runs in the page, at Large and Extra large: every box pinned over the page — computed
 * `position: fixed`, or `sticky` with a `top` or `bottom` (a sticky column pins
 * sideways and is left out), the outermost only — taller than half the viewport
 * (§10.22). For `fixed`, the part inside the viewport; for `sticky`, its height, so a
 * box counts before it pins. Skips what `measureTruncation` skips, a dialog and what
 * holds one, and `[data-pinned-ok]` subtrees. Each finding is marked
 * `data-pinned-offender=n`.
 */
function measurePinned() {
  const { DIALOG, invisible, offstage, placeOf, tagOf } = window.__sizeSweep;
  const vh = window.innerHeight;
  const pinnedAs = (el) => {
    const s = getComputedStyle(el);
    if (s.position === "fixed") return "fixed";
    if (s.position === "sticky" && (s.top !== "auto" || s.bottom !== "auto")) return "sticky";
    return null;
  };
  const findings = [];
  for (const el of document.body.querySelectorAll("*")) {
    const how = pinnedAs(el);
    if (!how) continue;
    // The outermost only: a sticky header inside a fixed sheet is the sheet's.
    let inner = false;
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (pinnedAs(node)) {
        inner = true;
        break;
      }
    }
    if (inner || invisible(el) || offstage(el)) continue;
    if (el.closest(`.sr-only, .sr-only-fixed, [data-pinned-ok], ${DIALOG}`) || el.querySelector(DIALOG)) continue;
    const box = el.getBoundingClientRect();
    const height = how === "fixed" ? Math.min(box.bottom, vh) - Math.max(box.top, 0) : box.height;
    if (height <= vh / 2) continue;
    el.setAttribute("data-pinned-offender", String(findings.length));
    findings.push({
      ...placeOf(el),
      how,
      box: tagOf(el),
      height: Math.round(height),
      share: Math.round((height / vh) * 100),
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 50),
    });
  }
  return findings;
}

/** A finding's line under its page. */
function findingLine(label, f, detail) {
  const where = [f.slot && `[${f.slot}]`, f.heading && `«${f.heading}»`].filter(Boolean).join(" ");
  return `    ${label} ${where ? where + " " : ""}${detail}`;
}

/**
 * Lines from variants that run at once, printed as if they had run one after another:
 * the first unfinished variant prints as it goes, and a later one's lines wait until
 * every variant before it has finished. The fixture test reads the output as one block
 * per variant, and so does a person.
 */
function inOrder(count) {
  const held = Array.from({ length: count }, () => []);
  const finished = Array(count).fill(false);
  let current = 0;
  return {
    line(index, text) {
      if (index === current) console.log(text);
      else held[index].push(text);
    },
    finish(index) {
      finished[index] = true;
      while (current < count && finished[current]) {
        current += 1;
        for (const text of held[current] ?? []) console.log(text);
        held[current] = [];
      }
    },
  };
}

async function main() {
  const out = resolve(arg("out", join(tmpdir(), "ui-kit-sizes")));
  const pagesArg = arg("pages", DEFAULT_PAGES.join(","));
  const pages = pagesArg === "all" ? allSlugs() : pagesArg.split(",").filter(Boolean);
  const screens = on("screens");
  const checkTruncation = on("truncation");
  const checkPinned = on("pinned");
  const gate = flag("gate-truncation");
  mkdirSync(out, { recursive: true });

  // The browser before the preview server: a machine without it stops here, with no
  // detached `vite preview` left running.
  const { chromium, version } = loadPlaywright();
  const browser = await launchBrowser(chromium, version);
  const given = arg("url", "");
  let preview = null;
  let base = given;
  const printer = inOrder(VARIANTS.length);
  // One list per variant, joined in VARIANTS order below, so the summary reads as it did
  // when the variants ran one after another.
  const perVariant = VARIANTS.map(() => []);
  const sweepVariant = async (variant, index) => {
    const log = (line) => printer.line(index, line);
    const context = await browser.newContext({
      viewport: { width: variant.width, height: variant.height },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    try {
      const page = await context.newPage();
      for (const slug of pages) {
        const name = `${slug}--${variant.width}-${variant.size}`;
        // A fresh document per page: a hash change alone keeps the last page's state.
        // `networkidle` with a fallback: /server-feedback never goes quiet for 500 ms in
        // a row, and its 30 s timeout used to end the whole run there (0.32.1 sweep).
        await page.goto("about:blank");
        try {
          await page.goto(`${base}?text-size=${variant.size}#/${slug}`, { waitUntil: "networkidle", timeout: 15_000 });
        } catch (error) {
          if (error?.name !== "TimeoutError") throw error;
          await page.waitForTimeout(1500);
        }
        // The lazy section, its fonts and the first effects.
        await page.waitForTimeout(600);
        const applied = await page.evaluate(() => document.documentElement.dataset.textSize ?? "normal");
        const result = await page.evaluate(measure);
        // At Large and Extra large only: Normal keeps its ellipses (§10.17).
        const large = variant.size !== "normal";
        if (large && (checkTruncation || checkPinned)) await page.evaluate(installSweepHelpers);
        const truncated = large && checkTruncation ? await page.evaluate(measureTruncation) : [];
        const pinned = large && checkPinned ? await page.evaluate(measurePinned) : [];
        const overflows = result.document > 0 || result.main > 0;
        let shot;
        let full;
        let offender;
        let truncatedShot;
        let pinnedShot;
        // The first marked box of a kind, scrolled to and shot.
        const shoot = async (selector, suffix) => {
          const first = page.locator(selector);
          if (!(await first.count())) return undefined;
          await first.first().scrollIntoViewIfNeeded();
          const path = join(out, `${name}--${suffix}.png`);
          await page.screenshot({ path });
          return path;
        };
        if (screens) {
          shot = join(out, `${name}.png`);
          await page.screenshot({ path: shot });
          if (overflows) {
            full = join(out, `${name}--full.jpg`);
            await page.screenshot({ path: full, fullPage: true, type: "jpeg", quality: 60 });
            offender = await shoot('[data-overflow-offender="0"]', "offender");
          }
          if (truncated.length) truncatedShot = await shoot('[data-truncation-offender="0"]', "truncated");
          if (pinned.length) pinnedShot = await shoot('[data-pinned-offender="0"]', "pinned");
        }
        perVariant[index].push({
          name,
          applied,
          variant,
          ...result,
          truncated,
          pinned,
          shot,
          full,
          offender,
          truncatedShot,
          pinnedShot,
        });
        const verdict = [
          overflows && `OVERFLOW document +${result.document}px, main +${result.main}px`,
          truncated.length && `${truncated.length} truncated`,
          pinned.length && `${pinned.length} pinned`,
        ]
          .filter(Boolean)
          .join(", ");
        log(`${name.padEnd(36)} ${applied === variant.size ? "" : `(size ${applied}!) `}${verdict || "ok"}`);
        for (const offender of result.offenders) log(`    ${offender}`);
        for (const f of truncated) log(findingLine("TRUNCATED", f, `${f.width}px ${f.kind} ${f.box}: "${f.text}"`));
        for (const f of pinned)
          log(findingLine("PINNED", f, `${f.how} ${f.height}px (${f.share} % of the viewport) ${f.box}: "${f.text}"`));
      }
    } finally {
      await context.close();
    }
    printer.finish(index);
  };
  try {
    if (!given) preview = await startPreview(Number(process.env.SHOWCASE_PREVIEW_PORT ?? 4179));
    // A page file (the checks' fixture) is the page itself; a server is a directory.
    base = /\.html?$/.test(given) ? given : (given || preview.url).replace(/\/?$/, "/");
    if (flag("serial")) {
      for (const [index, variant] of VARIANTS.entries()) await sweepVariant(variant, index);
    } else {
      await Promise.all(VARIANTS.map(sweepVariant));
    }
  } finally {
    await browser.close();
    preview?.stop();
  }

  const findings = perVariant.flat();
  const bad = findings.filter((f) => f.document > 0 || f.main > 0);
  const cut = findings.filter((f) => f.truncated.length > 0);
  const tall = findings.filter((f) => f.pinned.length > 0);
  const count = (list, key) => list.reduce((sum, f) => sum + f[key].length, 0);
  console.log(
    `\n${findings.length} page × size runs${screens ? `, screenshots in ${out}` : ""}; ${bad.length} overflow.`,
  );
  for (const f of bad) console.log(`  ${f.name}: ${f.offender ?? f.full ?? "(no screens)"}`);
  if (checkTruncation) {
    console.log(`TRUNCATED: ${count(cut, "truncated")} in ${cut.length} runs${gate ? "" : " (report-only)"}.`);
    for (const f of cut)
      console.log(`  ${f.name}: ${f.truncated.length}${f.truncatedShot ? ` — ${f.truncatedShot}` : ""}`);
  }
  if (checkPinned) {
    console.log(`PINNED: ${count(tall, "pinned")} in ${tall.length} runs${gate ? "" : " (report-only)"}.`);
    for (const f of tall) console.log(`  ${f.name}: ${f.pinned.length}${f.pinnedShot ? ` — ${f.pinnedShot}` : ""}`);
  }
  process.exitCode = bad.length ? 1 : gate && (cut.length || tall.length) ? 3 : 0;
}

main().catch((error) => {
  console.error(error instanceof SetupError ? `✖ ${error.message}` : error);
  process.exitCode = 2;
});
