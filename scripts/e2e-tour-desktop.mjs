#!/usr/bin/env node
/**
 * The guided form tour on a desktop, in a real browser (0.50.1, keksdose B1; the phone's
 * sibling is e2e-tour-phone.mjs). On a fine pointer the tour focuses a field step's first
 * control on arrival (docs/tours-harmonization.md §11.8); a picker that opens on focus
 * opened its list then, and the list, a later layer (§11.6), covered the card with its Next.
 *
 * It drives the showcase's "Guided form tour" specimen (#/tour) at 1280×800 with a mouse
 * (`pointer: fine`), in LTR and RTL:
 *
 *   1. "Guide me" starts at the amount step; typing unlocks Next, which moves on;
 *   2. arrival on the category step (a Combobox): the field has focus, its list is closed,
 *      and the card and its Next are seen (`elementFromPoint` hits), inside the viewport;
 *   3. ArrowDown opens the list from the keyboard; Escape closes only the list;
 *   4. a click on the field opens the list (the person's own "open"); whether that list
 *      overlaps the card is REPORTED, not checked (§11.6: a list the field opens is above
 *      the card by design);
 *   5. a pick unlocks Next, and the card is seen again.
 *
 * Not part of `npm run check`, like the phone e2e; run it by hand:
 *
 *   node scripts/e2e-tour-desktop.mjs [--url http://localhost:4170/] [--variants ltr,rtl]
 */
/* global document -- the measures run in the page, not in Node. */
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
const variants = (arg("--variants") ?? "ltr,rtl").split(",");
const W = 1280;
const H = 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runVariant(browser, base, dir) {
  const results = [];
  const notes = [];
  const check = (name, ok, detail = "") => results.push([name, !!ok, detail]);
  const context = await browser.newContext({
    viewport: { width: W, height: H },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await page.goto(`${base}#/tour`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    if (dir === "rtl") await page.evaluate(() => (document.documentElement.dir = "rtl"));
    const status = page.getByTestId("gt-status");
    await status.waitFor({ timeout: 30_000 });
    const index = async () => /index (\d+)/.exec((await status.textContent()) ?? "")?.[1] ?? "idle";
    const card = page.locator("[data-tour-card]");
    const geometry = () =>
      page.evaluate(() => {
        const r = (el) => {
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return {
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            width: b.width,
            height: b.height,
          };
        };
        const seen = (el) => {
          const b = el?.getBoundingClientRect();
          if (!b) return false;
          const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          return !!hit && el.contains(hit);
        };
        const cardEl = document.querySelector("[data-tour-card]");
        const next = cardEl
          ? [...cardEl.querySelectorAll("button")].find((b) => /^(Next|Done)$/.test(b.textContent.trim()))
          : null;
        const field = document.querySelector('[data-tour="gt-category"]');
        const list = [...document.querySelectorAll('[role="listbox"]')].find(
          (l) => l.getBoundingClientRect().height > 0,
        );
        return {
          card: r(cardEl),
          cardSeen: seen(cardEl),
          nextSeen: seen(next),
          nextLocked: next?.getAttribute("aria-disabled") === "true",
          focusInField: !!field && field.contains(document.activeElement),
          expanded: field?.querySelector('[role="combobox"]')?.getAttribute("aria-expanded") ?? null,
          list: r(list),
          overlayDir: document.querySelector("[data-tour-overlay]")?.getAttribute("dir"),
        };
      });
    const overlap = (a, b) =>
      !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const inView = (b) => !!b && b.left >= 0 && b.right <= W && b.top >= 0 && b.bottom <= H;

    // 1. Guide me → the amount step; type, Next.
    await page.getByRole("button", { name: "New transaction" }).click();
    await page.getByRole("button", { name: "Guide me" }).click();
    await card.waitFor();
    await sleep(400);
    check("1 starts at the amount step", (await index()) === "2", await status.textContent());
    await page.keyboard.type("12");
    await sleep(200);
    await card.getByRole("button", { name: "Next" }).click();
    await sleep(500);
    check("1 Next moves on to the category", (await index()) === "3", await status.textContent());

    // 2. Arrival on the Combobox step: focused, closed, card unobstructed.
    let g = await geometry();
    check("2 the category field has focus", g.focusInField);
    check(
      "2 its list stays closed on the tour's focus",
      g.expanded === "false" && !g.list,
      `aria-expanded=${g.expanded} list=${JSON.stringify(g.list)}`,
    );
    check("2 the card is seen (elementFromPoint)", g.cardSeen);
    check("2 the card's Next is seen and locked", g.nextSeen && g.nextLocked);
    check("2 the card is inside the viewport", inView(g.card), JSON.stringify(g.card));
    check("2 the card takes the page's direction", g.overlayDir === dir, `dir=${g.overlayDir}`);

    // 3. ArrowDown opens; Escape closes only the list.
    await page.keyboard.press("ArrowDown");
    await sleep(300);
    g = await geometry();
    check("3 ArrowDown opens the list", g.expanded === "true" && !!g.list);
    await page.keyboard.press("Escape");
    await sleep(300);
    g = await geometry();
    check("3 Escape closes only the list", g.expanded === "false" && (await index()) === "3" && g.cardSeen);

    // 4. The person's click opens the list; its overlap with the card is reported.
    await page.locator('[data-tour="gt-category"] [role="combobox"]').click();
    await sleep(300);
    g = await geometry();
    check("4 a click opens the list", g.expanded === "true" && !!g.list);
    notes.push(
      `user-opened list ${overlap(g.list, g.card) ? "OVERLAPS" : "is clear of"} the card` +
        ` (list ${JSON.stringify(g.list)}, card ${JSON.stringify(g.card)}; card still seen: ${g.cardSeen})`,
    );

    // 5. A pick unlocks Next.
    await page.getByRole("option", { name: "Rent" }).click();
    await sleep(400);
    g = await geometry();
    check("5 a pick unlocks Next, the card is seen", !g.nextLocked && g.nextSeen && g.cardSeen);
    check("no page errors", errors.length === 0, errors.join(" | "));
  } catch (error) {
    check("ran to the end", false, String(error).split("\n")[0]);
  } finally {
    await context.close();
  }
  return { results, notes };
}

const given = arg("--url");
const server = given ? { url: given, stop: () => {} } : await startDev(Number(process.env.SHOWCASE_PORT ?? 4182));
let failed = 0;
const browser = await chromium.launch();
try {
  for (const dir of variants) {
    const { results, notes } = await runVariant(browser, server.url, dir);
    console.log(`\ndesktop-${dir}`);
    for (const [name, ok, detail] of results) {
      if (!ok) failed++;
      console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  — ${detail}` : ""}`);
    }
    for (const note of notes) console.log(`  NOTE  ${note}`);
  }
} finally {
  await browser.close();
  server.stop();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
