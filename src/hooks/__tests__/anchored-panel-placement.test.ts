import { describe, expect, it } from "vitest";
import { anchoredPanelPlacement } from "../use-anchored-panel";

/** A 1000 px tall viewport; the trigger is 36 px tall with its top at `top`. */
const viewport = { top: 0, height: 1000 };
const at = (top: number) => anchoredPanelPlacement({ top, bottom: top + 36 }, viewport);

describe("anchoredPanelPlacement", () => {
  it("opens below when the preferred height fits there", () => {
    const p = at(100);
    expect(p.above).toBe(false);
    expect(p.maxHeight).toBe(320);
    expect(p.top).toBe(140);
  });

  it("opens above when below has less than the preferred height and above has it (keksdose #384)", () => {
    // 200 px under the field, 700 above: it used to open downward, cramped to ~200 px.
    const p = at(760);
    expect(p.above).toBe(true);
    expect(p.maxHeight).toBe(320);
    expect(p.top).toBe(760 - 4 - 320);
  });

  it("does not jump sides for a few pixels when neither side fits the preferred height", () => {
    // A 600 px viewport: ~276 px below, ~276 + a little above.
    const small = { top: 0, height: 600 };
    const p = anchoredPanelPlacement({ top: 290, bottom: 326 }, small);
    expect(p.above).toBe(false);
  });

  it("opens above when it is clearly roomier, though neither side fits", () => {
    // 172 px below, 288 above, the preferred 320 nowhere: above wins by more than 48.
    const small = { top: 0, height: 520 };
    const p = anchoredPanelPlacement({ top: 300, bottom: 336 }, small);
    expect(p.above).toBe(true);
    expect(p.maxHeight).toBe(300 - 4 - 8);
  });

  it("flips from an unusable space below to any roomier side, as before", () => {
    const p = anchoredPanelPlacement({ top: 880, bottom: 916 }, viewport);
    expect(p.above).toBe(true);
  });

  it("stays below when above is no roomier", () => {
    const tiny = { top: 0, height: 260 };
    const p = anchoredPanelPlacement({ top: 40, bottom: 76 }, tiny);
    expect(p.above).toBe(false);
  });
});
