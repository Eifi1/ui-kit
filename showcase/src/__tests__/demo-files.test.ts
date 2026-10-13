import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Showcase demos live in their component's family file, not in the release that added
 * them (refactor audit 2026-10, DOC-8).
 *
 * Each round used to append a `*-0NN-demo.tsx` and a block on some page, so a component's
 * specimens were scattered over files named after releases and a page read like a
 * changelog: 88 such files in 0.34, holding 161 of the 251 lazy sections. The 0.34 merge
 * folded the worst families into one module each (form-actions.tsx, line-items.tsx,
 * confirm.tsx, tooltip.tsx, combobox.tsx, feedback-inbox/, …), each specimen keeping its
 * label and saying "Since 0.NN." in a Note. The rest go the same way when they are next
 * touched.
 *
 * A RATCHET: the count may only fall. A release adds to the family file
 * (CONTRIBUTING.md, "The showcase"). When a merge lowers the count, lower
 * {@link VERSION_NAMED} in the same commit, so the next new file fails here.
 */
const VERSION_NAMED = 53;

const SECTIONS = join(process.cwd(), "showcase/src/sections");

function versionNamed(): string[] {
  return readdirSync(SECTIONS, { recursive: true, encoding: "utf8" })
    .filter((file) => /-0\d{2,3}-demo\.tsx$/.test(file))
    .sort();
}

describe("version-named demo files", () => {
  it("only fall in number", () => {
    const files = versionNamed();
    expect(
      files.length,
      `a new *-0NN-demo.tsx: add to the component's family file instead (${files.join(", ")})`,
    ).toBeLessThanOrEqual(VERSION_NAMED);
    // Equal, not just at most: the budget follows the count down — and a pattern or folder
    // that stopped matching (a count of 0) fails here instead of passing for ever.
    expect(files.length, `fewer version-named files now: lower VERSION_NAMED to ${files.length}`).toBe(VERSION_NAMED);
  });
});
