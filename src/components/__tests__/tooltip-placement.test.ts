import { placeTooltip } from "../tooltip";
import type { AnchorRect } from "../../hooks/use-anchored-rect";

/**
 * Where a portalled tooltip ends up (Steering Design feedback #126).
 *
 * The bug it is about: a `side="left"` hint — which is what every `FieldHint`
 * is — on a form near the left edge of the window put its bubble off the screen,
 * and a capped bubble can only wrap, not move, so the first half of the sentence
 * was simply not there.
 */

const VIEWPORT = { width: 1000, height: 800 };
const SIZE = { width: 200, height: 40 };

function trigger(left: number, top: number, width = 16, height = 16): AnchorRect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

describe("placeTooltip", () => {
  it("keeps the side it was asked for when the bubble fits there", () => {
    const placed = placeTooltip(trigger(500, 400), "left", SIZE, VIEWPORT);
    expect(placed.side).toBe("left");
    // Its right edge sits a gap short of the trigger's left one.
    expect(placed.left + SIZE.width).toBe(500 - 4);
  });

  it("turns a left-hand bubble round when the trigger is near the left edge", () => {
    const placed = placeTooltip(trigger(20, 400), "left", SIZE, VIEWPORT);
    expect(placed.side).toBe("right");
    expect(placed.left).toBe(20 + 16 + 4);
  });

  it("turns a right-hand bubble round when the trigger is near the right edge", () => {
    const placed = placeTooltip(trigger(970, 400), "right", SIZE, VIEWPORT);
    expect(placed.side).toBe("left");
    expect(placed.left + SIZE.width).toBe(970 - 4);
  });

  it("keeps the asked-for side when neither side has room", () => {
    // A bubble wider than the window has nowhere better to go, so the request
    // stands and the clamp below is what makes it readable.
    const placed = placeTooltip(trigger(400, 400), "left", { width: 1200, height: 40 }, VIEWPORT);
    expect(placed.side).toBe("left");
  });

  it("clamps the cross axis, which is what a centred bubble needs", () => {
    // `top` places the bubble centred over the trigger: at x = 10 that puts a
    // 200px bubble 90px off the left of the screen with the side still correct.
    const placed = placeTooltip(trigger(10, 400), "top", SIZE, VIEWPORT);
    expect(placed.side).toBe("top");
    expect(placed.left).toBe(4);
  });

  it("never leaves the bubble past the far edge either", () => {
    const placed = placeTooltip(trigger(990, 780), "bottom", SIZE, VIEWPORT);
    expect(placed.left + SIZE.width).toBeLessThanOrEqual(VIEWPORT.width - 4);
    expect(placed.top + SIZE.height).toBeLessThanOrEqual(VIEWPORT.height - 4);
  });

  it("pins a bubble bigger than the window to the near corner, not the far one", () => {
    // The start of a label is the half worth keeping.
    const placed = placeTooltip(trigger(400, 400), "top", { width: 1200, height: 900 }, VIEWPORT);
    expect(placed.left).toBe(4);
    expect(placed.top).toBe(4);
  });
});
