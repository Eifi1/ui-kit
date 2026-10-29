#!/usr/bin/env node
/**
 * The guided form tour on a phone, in a real browser (docs/tours-harmonization.md §11.10,
 * contract round 054 §13): jsdom lays nothing out and has no number pad, so whether the
 * tour's card is SEEN over a full-screen sheet, docks clear of the pad and lets the sheet
 * body scroll can only be checked here.
 *
 * It drives the showcase's "Guided form tour" specimen (#/tour, showcase/src/sections/
 * tour-guided-form.tsx) at 390×844 with touch (`pointer: coarse`), in four variants:
 * LTR and RTL, at Normal and Large text. For each:
 *
 *   1. arrival at a `gate` step on the amount field inside the FullBleedDialog: the card
 *      is visible (an `elementFromPoint` at its centre hits it), the ring is drawn, no
 *      scrim and no shields dim the sheet, the card is docked and inside the viewport;
 *   2. Next is locked; tapping the field opens the number pad, which paints ABOVE the
 *      card; typing on it unlocks Next, and the card docks clear of the pad and the field;
 *   3. the pad's Done advances the tour;
 *   4. on the category step the picker opens above the card, and a pick unlocks Next,
 *      which is pressable;
 *   5. Escape: in the open pad it closes only the pad (which commits, as its Done does);
 *      in the open picker only the picker; from the card it skips the tour and the sheet
 *      stays open;
 *   6. the `awaitGate` step on Save advances only on `release` (not on the click);
 *   4b. the ring frames the category field together with its own warning line underneath
 *      (the line its `aria-describedby` names, keksdose S1);
 *   7. the note, low in the sheet, is scrolled into view by the sheet body, and
 *      `window.scrollY` is unchanged.
 *
 * Not part of `npm run check` (no Chromium on the shared machine, refactor plan 2026-10,
 * decision 2); run it by hand:
 *
 *   node scripts/e2e-tour-phone.mjs [--url http://localhost:4170/] [--variants ltr-normal,rtl-large]
 *
 * Without --url it starts the showcase dev server on SHOWCASE_PORT (default 4182) and
 * stops it at the end. Exit 1 on any failed check. The browser is the repository's
 * playwright-core with its headless shell, as scripts/screenshot-sizes.mjs.
 */
/* global document, getComputedStyle, window, Node -- the measures run in the page, not in Node. */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startDev } from "./e2e-showcase-server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { chromium } = require("playwright-core");

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const ALL = ["ltr-normal", "rtl-normal", "ltr-large", "rtl-large"];
const variants = (arg("--variants") ?? ALL.join(",")).split(",");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One variant's run: a list of [check, ok, detail]. */
async function runVariant(browser, base, variant) {
  const [dir, size] = variant.split("-");
  const results = [];
  const check = (name, ok, detail = "") => results.push([name, !!ok, detail]);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await page.goto(`${base}?text-size=${size}#/tour`, { waitUntil: "networkidle", timeout: 60_000 });
    if (dir === "rtl") await page.evaluate(() => (document.documentElement.dir = "rtl"));
    const status = page.getByTestId("gt-status");
    await status.waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: "New transaction" }).scrollIntoViewIfNeeded();
    const scrollY0 = await page.evaluate(() => window.scrollY);

    /** Open the form and start "Guide me"; resolves on the amount step. */
    const guide = async () => {
      if (!(await page.locator('[role="dialog"][data-kit-layer]').count())) {
        await page.getByRole("button", { name: "New transaction" }).tap();
      }
      await page.getByRole("button", { name: "Guide me" }).tap();
      await page.locator("[data-tour-card]").waitFor();
      await sleep(400);
    };
    const index = async () => /index (\d+)/.exec((await status.textContent()) ?? "")?.[1] ?? "idle";
    const geometry = () =>
      page.evaluate(() => {
        const r = (el) => {
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { top: b.top, left: b.left, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
        };
        const card = document.querySelector("[data-tour-card]");
        const c = r(card);
        const hit = c ? document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2) : null;
        const pad = document.querySelector('[data-tour-obstruction][role="group"]');
        const p = r(pad);
        const padHit = p ? document.elementFromPoint(p.left + p.width / 2, p.top + p.height / 2) : null;
        const ring = document.querySelector("[data-tour-overlay] .rounded-lg");
        return {
          card: c,
          cardSeen: !!(card && hit && card.contains(hit)),
          cardOverflow: card ? card.scrollWidth - card.clientWidth : 0,
          docked: card?.getAttribute("data-tour-docked") ?? null,
          bare: document.querySelector("[data-tour-overlay]")?.hasAttribute("data-tour-bare") ?? false,
          shields: document.querySelectorAll("[data-tour-shield]").length,
          ringShadow: ring ? getComputedStyle(ring).boxShadow : "",
          pad: p,
          padOnTop: !!(pad && padHit && pad.contains(padHit)),
          padAfterTour:
            !!pad &&
            !!document.querySelector("[data-tour-layer]") &&
            !!(
              document.querySelector("[data-tour-layer]").compareDocumentPosition(pad) &
              Node.DOCUMENT_POSITION_FOLLOWING
            ),
          field: r(document.querySelector('[data-tour="gt-amount"]')),
          memo: r(document.querySelector('[data-tour="gt-memo"]')),
          ring: r(ring),
          category: r(document.querySelector('[data-tour="gt-category"]')),
          categoryNote: r(document.querySelector('[data-testid="gt-category-note"]')),
          dir: document.querySelector("[data-tour-overlay]")?.getAttribute("dir"),
          next: document.querySelector("[data-tour-card] button[aria-disabled]")?.getAttribute("aria-disabled") ?? null,
          scrollY: window.scrollY,
        };
      });
    const overlap = (a, b) =>
      !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

    // 1. Arrival on the amount gate step, over the full-screen sheet.
    await guide();
    let g = await geometry();
    check("1 starts at the amount step (Guide me, at)", (await index()) === "2", await status.textContent());
    check("1 card visible over the sheet (elementFromPoint)", g.cardSeen);
    check(
      "1 ring drawn, no scrim, no shields",
      g.bare && g.shields === 0 && g.ringShadow && !g.ringShadow.includes("9999"),
      `bare=${g.bare} shields=${g.shields}`,
    );
    check(
      "1 card docked and inside the viewport",
      g.docked && g.card.left >= 0 && g.card.right <= 390 && g.card.top >= 0 && g.card.bottom <= 844,
      `${g.docked} ${JSON.stringify(g.card)}`,
    );
    check("1 card text does not overflow", g.cardOverflow <= 0, `overflow ${g.cardOverflow}px`);
    check("1 card takes the page's direction", g.dir === dir, `dir=${g.dir}`);

    // 2. Locked Next; the pad paints above the card and the card docks clear of it.
    check("2 Next locked", g.next === "true");
    await page.locator('[data-tour="gt-amount"] input').first().tap();
    const pad = page.locator('[data-tour-obstruction][role="group"]');
    await pad.waitFor({ timeout: 5000 });
    await pad.getByRole("button", { name: "1", exact: true }).tap();
    await pad.getByRole("button", { name: "2", exact: true }).tap();
    await sleep(600);
    g = await geometry();
    check("2 pad paints above the card", g.padOnTop && g.padAfterTour);
    check("2 typing unlocks Next", g.next === null, `aria-disabled=${g.next}`);
    check(
      "2 card clear of the pad and the field",
      !overlap(g.card, g.pad) && !overlap(g.card, g.field),
      JSON.stringify({ card: g.card, pad: g.pad, field: g.field }),
    );
    check("2 card text does not overflow (pad up)", g.cardOverflow <= 0, `overflow ${g.cardOverflow}px`);

    // 3. The pad's Done advances.
    await pad.getByRole("button", { name: /^(Done|Fertig)$/ }).tap();
    await sleep(500);
    check("3 the pad's Done advances to the category", (await index()) === "3", await status.textContent());

    // 5a. Escape in the open pad closes only the pad (the kit's pad commits on Escape as on
    // Done, so a filled gate moves on): the tour is not skipped and the sheet stays.
    await page.locator("[data-tour-card]").getByRole("button", { name: "Back" }).tap();
    await sleep(400);
    await page.locator('[data-tour="gt-amount"] input').first().tap();
    await pad.waitFor({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await sleep(500);
    const padGone = (await pad.count()) === 0;
    const after = await index();
    check(
      "5 Escape in the pad closes only the pad",
      padGone &&
        (after === "2" || after === "3") &&
        (await page.locator('[role="dialog"][data-kit-layer]').count()) === 1,
      `pad gone=${padGone} index=${after}`,
    );
    if (after === "2") {
      await page.locator("[data-tour-card]").getByRole("button", { name: "Next" }).tap();
      await sleep(400);
    }

    // 4. The ring frames the field AND its own line under it (the line its aria-describedby
    // names, keksdose S1): the frame does not run through the line.
    await sleep(400);
    g = await geometry();
    const inside = (outer, inner) =>
      !!outer &&
      !!inner &&
      outer.top <= inner.top &&
      outer.bottom >= inner.bottom &&
      outer.left <= inner.left &&
      outer.right >= inner.right;
    check(
      "4 the ring frames the category field and its own line",
      inside(g.ring, g.category) && inside(g.ring, g.categoryNote),
      JSON.stringify({ ring: g.ring, field: g.category, note: g.categoryNote }),
    );

    // 4. The picker opens above the card; Escape closes only it; a pick unlocks Next.
    await page.locator('[data-tour="gt-category"] input').first().tap();
    const sheet = page.locator('[role="dialog"][data-tour-obstruction]');
    await sheet.waitFor({ timeout: 5000 });
    await sleep(300);
    g = await geometry();
    check("4 the picker opens above the card", !g.cardSeen);
    await page.keyboard.press("Escape");
    await sleep(300);
    check(
      "5 Escape in the picker closes only the picker",
      (await sheet.count()) === 0 &&
        (await index()) === "3" &&
        (await page.locator('[role="dialog"][data-kit-layer]').count()) === 1,
    );
    await page.locator('[data-tour="gt-category"] input').first().tap();
    await sheet.waitFor({ timeout: 5000 });
    await sheet.getByRole("option", { name: "Rent" }).tap();
    await sleep(500);
    g = await geometry();
    check("4 a pick unlocks Next", g.next === null && (await sheet.count()) === 0, `aria-disabled=${g.next}`);
    await page.locator("[data-tour-card]").getByRole("button", { name: "Next" }).tap();
    await sleep(500);
    check(
      "4 Next is pressable and moves on (transfer step skipped)",
      (await index()) === "5",
      await status.textContent(),
    );

    // 7. The note, low in the sheet, scrolled into view by the sheet body.
    await sleep(300);
    g = await geometry();
    check(
      "7 the note is in view, clear of the card",
      g.memo && g.memo.top >= 0 && g.memo.bottom <= 844 && !overlap(g.card, g.memo),
      JSON.stringify({ memo: g.memo, card: g.card }),
    );
    check("7 window.scrollY unchanged", g.scrollY === scrollY0, `${scrollY0} → ${g.scrollY}`);

    // 6. Save: a click does not advance; the release does.
    await page.locator("[data-tour-card]").getByRole("button", { name: "Leave empty" }).tap();
    await sleep(400);
    check("6 Leave empty moves to Save", (await index()) === "6");
    const nextOnSave = await page.locator("[data-tour-card]").getByRole("button", { name: "Next" }).count();
    await page.locator('[data-tour="gt-save"]').tap();
    const right = await index();
    await sleep(900);
    check(
      "6 Save step: no Next, the click alone does not advance, the release does",
      nextOnSave === 0 && right === "6" && (await index()) === "7",
      `${right} → ${await index()}`,
    );
    await page.locator("[data-tour-card]").getByRole("button", { name: "Done" }).tap();
    await sleep(300);
    check("6 Done finishes the run", /finished/.test((await status.textContent()) ?? ""), await status.textContent());

    // 5b. Escape from the card skips the tour; the sheet stays open.
    await guide();
    await page.locator("[data-tour-card]").focus();
    await page.keyboard.press("Escape");
    await sleep(300);
    check(
      "5 Escape from the card skips, the sheet stays open",
      /skipped/.test((await status.textContent()) ?? "") &&
        (await page.locator('[role="dialog"][data-kit-layer]').count()) === 1,
      await status.textContent(),
    );
    check("no page errors", errors.length === 0, errors.join(" | "));
  } catch (error) {
    check("ran to the end", false, String(error).split("\n")[0]);
  } finally {
    await context.close();
  }
  return results;
}

const given = arg("--url");
const server = given ? { url: given, stop: () => {} } : await startDev(Number(process.env.SHOWCASE_PORT ?? 4182));
let failed = 0;
const browser = await chromium.launch();
try {
  for (const variant of variants) {
    const results = await runVariant(browser, server.url, variant);
    console.log(`\n${variant}`);
    for (const [name, ok, detail] of results) {
      if (!ok) failed++;
      console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  — ${detail}` : ""}`);
    }
  }
} finally {
  await browser.close();
  server.stop();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
