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

/**
 * keksdose K1 (live #401): a flipped panel was placed by a `top` that assumed it was
 * `maxHeight` tall. The panel is as tall as its content, so a three-row address list
 * (~80 px) under a 256 px cap sat ~176 px above its field. Flipped, it is placed by
 * `bottom` now, which holds its foot `gap` above the trigger at any content height.
 */
describe("anchoredPanelPlacement's bottom edge (keksdose K1)", () => {
  /** Where a panel placed by `bottom` ends, in the layout viewport's coordinates. */
  const footOf = (p: { bottom: number }, layoutHeight: number) => layoutHeight - p.bottom;

  it("keeps a flipped panel's foot gap above the trigger, whatever its content height", () => {
    // The phone from the report, 406×816, keyboard up: 450 px visible, the field low in it.
    const phone = { top: 0, height: 450, layoutHeight: 816 };
    const field = { top: 380, bottom: 424 };
    const p = anchoredPanelPlacement(field, phone, { preferredHeight: 256 });
    expect(p.above).toBe(true);
    expect(p.maxHeight).toBe(256);
    // Placed by `bottom`, any panel ends 4 px above the field, three rows or thirty.
    expect(footOf(p, 816)).toBe(field.top - 4);
    // Placed by `top`, which assumes the full cap, three rows (~80 px) ended 176 px
    // higher than that: the report's floating list.
    expect(footOf(p, 816) - (p.top + 80)).toBe(176);
  });

  it("measures bottom from the LAYOUT viewport, not the visible region the keyboard leaves", () => {
    // Keyboard up and the visual viewport panned 200 px down the layout one: the rect
    // and `position: fixed` both live in layout space, which runs on behind the keyboard.
    const panned = { top: 200, height: 400, layoutHeight: 816 };
    const p = anchoredPanelPlacement({ top: 560, bottom: 600 }, panned);
    expect(p.above).toBe(true);
    expect(p.bottom).toBe(816 - (560 - 4));
    // Still capped to what is on screen: the head never rises past the visible top.
    expect(footOf(p, 816) - p.maxHeight).toBeGreaterThanOrEqual(200 + 8);
  });

  it("takes top + height as the layout height when the box does not say", () => {
    const p = at(760);
    expect(p.above).toBe(true);
    expect(p.bottom).toBe(1000 - (760 - 4));
  });

  it("gives `top` and `bottom` as the two edges of a maxHeight-tall panel, on either side", () => {
    for (const p of [at(100), at(760)]) {
      expect(p.top + p.maxHeight + p.bottom).toBe(1000);
    }
    // Below, `top` is the anchored edge, as it always was.
    expect(at(100).top).toBe(100 + 36 + 4);
  });

  it("lets the foot give way only when not even the floor fits above, so the head stays on screen", () => {
    // 78 px above the field, less than the 96 px floor: the panel overlaps its trigger,
    // as `top` always had it, rather than putting its search box off the top.
    const tiny = { top: 0, height: 150 };
    const p = anchoredPanelPlacement({ top: 90, bottom: 126 }, tiny);
    expect(p.above).toBe(true);
    expect(p.maxHeight).toBe(96);
    expect(footOf(p, 150) - p.maxHeight).toBe(8);
  });
});
