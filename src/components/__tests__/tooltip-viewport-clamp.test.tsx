import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Tooltip, type TooltipSide } from "../tooltip";

/**
 * keksdose G7: an in-place bubble centred on a trigger at a row's start edge hung off a
 * phone screen, so keksdose pinned `portal` there. The in-place bubble (default and
 * `lazy`) now measures itself on open and slides back along its cross axis to stay
 * inside the viewport minus the 4px margin. jsdom has no layout, so each test stubs the
 * bubble's rect as the CSS would have placed it and a 360px-wide phone window.
 */

const VIEWPORT = { width: 360, height: 640 };
let innerWidth: number;
let innerHeight: number;

beforeEach(() => {
  innerWidth = window.innerWidth;
  innerHeight = window.innerHeight;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: VIEWPORT.width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: VIEWPORT.height });
});

afterEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: innerWidth });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: innerHeight });
  vi.restoreAllMocks();
});

type Box = { left: number; top: number; width: number; height: number };

/** Every `role="tooltip"` span reports `box` — the placement the CSS alone gives it. */
function stubBubbleRect(box: Box) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute("role") !== "tooltip") return original.call(this);
    const r = { ...box, x: box.left, y: box.top, right: box.left + box.width, bottom: box.top + box.height };
    return { ...r, toJSON: () => r } as DOMRect;
  });
}

function renderTooltip(opts: { side?: TooltipSide; lazy?: boolean; dir?: "ltr" | "rtl" } = {}) {
  render(
    <div dir={opts.dir ?? "ltr"}>
      <Tooltip label="gcloud run jobs execute nightly-import --region europe-west3 --wait" side={opts.side} lazy={opts.lazy}>
        <button type="button">Command</button>
      </Tooltip>
    </div>,
  );
  const trigger = screen.getByRole("button").parentElement!;
  act(() => {
    fireEvent.mouseEnter(trigger);
  });
  return { trigger, bubble: () => screen.getByRole("tooltip") };
}

describe("Tooltip in-place viewport clamp (keksdose G7)", () => {
  it("slides a `top` bubble hanging off the start edge back in (lazy)", () => {
    // A 280px bubble centred on a trigger at x≈16: its left edge lands at -110.
    stubBubbleRect({ left: -110, top: 100, width: 280, height: 40 });
    const { bubble } = renderTooltip({ lazy: true });
    expect(bubble().style.transform).toBe("translate(114px, 0px)");
  });

  it("does the same for the always-mounted default bubble", () => {
    stubBubbleRect({ left: -110, top: 100, width: 280, height: 40 });
    const { bubble } = renderTooltip();
    expect(bubble().style.transform).toBe("translate(114px, 0px)");
  });

  it("RTL: a label at the right edge is slid left, by the same physical maths", () => {
    // Trigger near the right edge of an RTL row: right edge at 460 on a 360px screen.
    stubBubbleRect({ left: 180, top: 100, width: 280, height: 40 });
    const { bubble } = renderTooltip({ lazy: true, dir: "rtl" });
    expect(bubble().style.transform).toBe("translate(-104px, 0px)");
  });

  it("side placements slide along y only, never over their own trigger", () => {
    // A `start` bubble poking above the top of the window; x overflow is left alone.
    stubBubbleRect({ left: -50, top: -20, width: 200, height: 60 });
    const { bubble } = renderTooltip({ lazy: true, side: "start" });
    expect(bubble().style.transform).toBe("translate(0px, 24px)");
  });

  it("leaves a bubble that fits untouched: no inline style at all", () => {
    stubBubbleRect({ left: 40, top: 100, width: 280, height: 40 });
    const { bubble } = renderTooltip({ lazy: true });
    expect(bubble().getAttribute("style")).toBeNull();
  });

  it("jsdom fallback: a zero-sized (unlaid-out) bubble is not shifted", () => {
    const { bubble } = renderTooltip({ lazy: true });
    expect(bubble().getAttribute("style")).toBeNull();
  });

  it("drops the slide on close, so the next open measures from the CSS placement", () => {
    stubBubbleRect({ left: -110, top: 100, width: 280, height: 40 });
    const { trigger, bubble } = renderTooltip();
    expect(bubble().style.transform).toBe("translate(114px, 0px)");
    act(() => {
      fireEvent.mouseLeave(trigger);
    });
    expect(screen.getByRole("tooltip", { hidden: true }).style.transform).toBe("");
  });

  it("leaves the portalled bubble's placement to placeTooltip", () => {
    stubBubbleRect({ left: -110, top: 100, width: 280, height: 40 });
    render(
      <Tooltip label="Hint" portal>
        <button type="button">P</button>
      </Tooltip>,
    );
    act(() => {
      fireEvent.mouseEnter(screen.getByRole("button").parentElement!);
    });
    expect(screen.getByRole("tooltip").style.transform).toBe("");
  });
});
