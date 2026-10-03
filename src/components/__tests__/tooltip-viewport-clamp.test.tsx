import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Tooltip, type TooltipSide } from "../tooltip";

/**
 * keksdose G7: an in-place bubble centred on a trigger at a row's start edge hung off a
 * phone screen, so keksdose pinned `portal` there. The in-place bubble (default and
 * `lazy`) now measures itself on open and slides back along its cross axis to stay
 * inside the viewport minus the 4px margin. jsdom has no layout, so each test stubs the
 * bubble's rect as the CSS would have placed it and a 360px-wide phone window.
 *
 * Since 0.25 the slide is a margin (`margin-left` across, `margin-top` up and down), not a
 * `transform`: Blink did not take back the page width a transform-only change had already
 * been counted into (live #381; see `shiftStyle`).
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
    expect(bubble().style.marginLeft).toBe("114px");
  });

  it("does the same for the always-mounted default bubble", () => {
    stubBubbleRect({ left: -110, top: 100, width: 280, height: 40 });
    const { bubble } = renderTooltip();
    expect(bubble().style.marginLeft).toBe("114px");
  });

  it("RTL: a label at the right edge is slid left, by the same physical maths", () => {
    // Trigger near the right edge of an RTL row: right edge at 460 on a 360px screen.
    stubBubbleRect({ left: 180, top: 100, width: 280, height: 40 });
    const { bubble } = renderTooltip({ lazy: true, dir: "rtl" });
    expect(bubble().style.marginLeft).toBe("-104px");
  });

  it("side placements slide along y only, never over their own trigger", () => {
    // A `start` bubble poking above the top of the window; x overflow is left alone.
    stubBubbleRect({ left: -50, top: -20, width: 200, height: 60 });
    const { bubble } = renderTooltip({ lazy: true, side: "start" });
    expect(bubble().style.marginTop).toBe("24px");
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
    expect(bubble().style.marginLeft).toBe("114px");
    act(() => {
      fireEvent.mouseLeave(trigger);
    });
    expect(screen.getByRole("tooltip", { hidden: true }).style.marginLeft).toBe("");
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
    expect(screen.getByRole("tooltip").style.marginLeft).toBe("");
  });
});

/**
 * keksdose run 72, live #381: on a 406px phone the sync icon's `bottom` bubble sat at
 * 102–422 and the page grew to 426px — and the clamp, comparing against
 * `window.innerWidth`, saw the GROWN layout viewport (Chromium's mobile emulation
 * measured 430) and found the bubble inside it. It now measures the root's client width,
 * which stays the screen's.
 */
describe("Tooltip viewport clamp measures the glass, not the grown window (live #381)", () => {
  afterEach(() => {
    // Back to jsdom's own (a prototype getter that answers 0).
    delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
  });

  function phone(clientWidth: number, windowWidth: number) {
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: clientWidth });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: windowWidth });
  }

  it("slides the sync bubble back inside 406 although the window says 430", () => {
    phone(406, 430);
    stubBubbleRect({ left: 102, top: 48, width: 320, height: 40 });
    const { bubble } = renderTooltip({ side: "bottom", lazy: true });
    // 406 - 4 - 422
    expect(bubble().style.marginLeft).toBe("-20px");
    // A layout change, so the page's overflow is measured again; never a transform.
    expect(bubble().style.transform).toBe("");
  });

  it("still leaves a bubble that fits the glass alone", () => {
    phone(406, 430);
    stubBubbleRect({ left: 40, top: 48, width: 320, height: 40 });
    const { bubble } = renderTooltip({ side: "bottom" });
    expect(bubble().getAttribute("style")).toBeNull();
  });

  it("RTL: a bubble wider than the room keeps its START (right) edge", () => {
    phone(300, 300);
    stubBubbleRect({ left: -40, top: 100, width: 320, height: 40 });
    const { bubble } = renderTooltip({ lazy: true, dir: "rtl" });
    // right edge 280 -> 296
    expect(bubble().style.marginLeft).toBe("16px");
  });

  it("LTR: the same bubble keeps its left edge", () => {
    phone(300, 300);
    stubBubbleRect({ left: -40, top: 100, width: 320, height: 40 });
    const { bubble } = renderTooltip({ lazy: true });
    expect(bubble().style.marginLeft).toBe("44px");
  });

  it("measures with its wrapper clipped, so the measurement never widens the page, then unclips", () => {
    phone(406, 406);
    const seen: string[] = [];
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute("role") === "tooltip") seen.push(this.parentElement!.style.overflow);
      const r = { left: 102, top: 48, width: 320, height: 40, x: 102, y: 48, right: 422, bottom: 88 };
      return { ...r, toJSON: () => r } as DOMRect;
    });
    const { trigger, bubble } = renderTooltip({ side: "bottom" });
    expect(seen).toEqual(["clip"]);
    expect(trigger.style.overflow).toBe("");
    expect(bubble().style.marginLeft).toBe("-20px");
  });

  it("re-measures (clipped again) when the label changes while open", () => {
    phone(406, 406);
    const seen: string[] = [];
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute("role") === "tooltip") seen.push(this.parentElement!.style.overflow);
      const r = { left: 40, top: 48, width: 320, height: 40, x: 40, y: 48, right: 360, bottom: 88 };
      return { ...r, toJSON: () => r } as DOMRect;
    });
    const { rerender } = render(
      <Tooltip label="Syncing…" side="bottom" lazy>
        <button type="button">s</button>
      </Tooltip>,
    );
    act(() => {
      fireEvent.mouseEnter(screen.getByRole("button"));
    });
    rerender(
      <Tooltip label="Synced at 03:05 PM" side="bottom" lazy>
        <button type="button">s</button>
      </Tooltip>,
    );
    expect(seen).toEqual(["clip", "clip"]);
    expect(screen.getByRole("button").parentElement!.style.overflow).toBe("");
  });

  it("the portalled bubble is placed against the glass too", () => {
    phone(406, 430);
    stubBubbleRect({ left: 0, top: 0, width: 320, height: 40 });
    render(
      <Tooltip label="Synced at 03:05 PM — Tap to sync now and refresh this page" side="bottom" portal>
        <button type="button">Sync</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button").parentElement!;
    const rect = { left: 254, right: 286, top: 8, bottom: 40, width: 32, height: 32, x: 254, y: 8 };
    trigger.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
    act(() => {
      fireEvent.mouseEnter(trigger);
    });
    // 406 - 320 - 4: on the glass, where the window's 430 would have allowed 106.
    expect(parseFloat(screen.getByRole("tooltip").style.left)).toBe(82);
  });
});

