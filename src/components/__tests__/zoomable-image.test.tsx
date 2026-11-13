import { act, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ZoomableImage } from "../zoomable-image";
import type { ZoomableImageProps } from "../zoomable-image";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { stubDesktop } from "../../test/viewport";

/**
 * keksdose live #505: a receipt the supermarket's app shares as one long screenshot,
 * 1220×11615. Here in a 305px box (a phone's preview column) capped at 600px, so the
 * picture's own pixels are exactly 4x the fit and every figure below is a round one.
 *
 * jsdom lays nothing out and decodes no image: the box's client size is set on the
 * element, the picture's natural size on the `<img>` before its `load` is fired, and the
 * box's scroll offsets are read back as the pan (jsdom keeps what is set, unclamped —
 * the clamping asserted here is the component's own). jsdom 30 has `PointerEvent`, so
 * the gestures are real pointer events with ids, types and coordinates.
 */
const W = 305;
const H = 600;

function view(props: Partial<ZoomableImageProps> = {}) {
  const utils = render(<ZoomableImage src="/receipt.png" alt="Receipt" {...props} />);
  const box = screen.getByRole("region");
  Object.defineProperty(box, "clientWidth", { configurable: true, value: W });
  Object.defineProperty(box, "clientHeight", { configurable: true, value: H });
  return { ...utils, box, img: () => screen.getByAltText(props.alt ?? "Receipt") };
}

function decode(img: HTMLElement, width = 1220, height = 11615) {
  Object.defineProperty(img, "naturalWidth", { configurable: true, value: width });
  Object.defineProperty(img, "naturalHeight", { configurable: true, value: height });
  fireEvent.load(img);
}

const width = (img: HTMLElement) => img.style.width;
const scroll = (box: HTMLElement) => [box.scrollLeft, box.scrollTop];
const button = (name: string) => screen.getByRole("button", { name });

type PointerKind = "touch" | "mouse" | "pen";
function pointer(
  type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel",
  el: HTMLElement,
  id: number,
  x: number,
  y: number,
  kind: PointerKind = "touch",
) {
  fireEvent[type](el, { pointerId: id, pointerType: kind, isPrimary: id === 1, clientX: x, clientY: y, button: 0 });
}
const tap = (el: HTMLElement, x: number, y: number) => {
  pointer("pointerDown", el, 1, x, y);
  pointer("pointerUp", el, 1, x, y);
};
/** A mouse click on the picture at fit: nothing to drag, but ⌘/Ctrl + wheel is now its own. */
const clickInto = (el: HTMLElement) => {
  pointer("pointerDown", el, 1, 100, 100, "mouse");
  pointer("pointerUp", el, 1, 100, 100, "mouse");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ZoomableImage: fit to width", () => {
  it("shows the picture at the box's width, in a box named after it that scrolls past its height", () => {
    const { box, img } = view();
    expect(box).toHaveAccessibleName("Zoomable image: Receipt");
    expect(box).toHaveAccessibleDescription("Press + or − to zoom and 0 to fit the width.");
    expect(box).toHaveAttribute("tabindex", "0");
    expect(box).toHaveClass("overflow-auto");
    expect(box.style.maxHeight).toBe("75svh");
    expect(width(img())).toBe("100%");
    expect(img()).toHaveClass("max-w-none", "h-auto");
  });

  it("takes its height from the decoded picture's shape, and only then offers the zoom", () => {
    const { box, img } = view();
    // Nothing to zoom before the shape is known: the pan's limits are the picture's height.
    expect(box.style.aspectRatio).toBe("");
    expect(screen.queryByRole("group", { name: "Zoom" })).toBeNull();
    decode(img());
    expect(box.style.aspectRatio).toBe("1220 / 11615");
    expect(img()).toHaveAttribute("width", "1220");
    expect(img()).toHaveAttribute("height", "11615");
    expect(screen.getByRole("group", { name: "Zoom" })).toBeInTheDocument();
  });

  it("reserves the box from naturalWidth / naturalHeight before the file arrives", () => {
    const { box, img } = view({ naturalWidth: 1220, naturalHeight: 11615, maxHeight: 480 });
    expect(box.style.aspectRatio).toBe("1220 / 11615");
    expect(box.style.maxHeight).toBe("480px");
    expect(img()).toHaveAttribute("height", "11615");
    expect(button("Zoom in")).toBeInTheDocument();
    // The decoded size wins over the one the app gave.
    decode(img(), 1000, 3000);
    expect(box.style.aspectRatio).toBe("1000 / 3000");
  });

  it("drops the zoom and the reserved shape when the picture cannot be loaded", () => {
    const { box, img } = view({ naturalWidth: 1220, naturalHeight: 11615 });
    fireEvent.error(img());
    expect(screen.getByRole("img", { name: "Receipt: image couldn’t be loaded" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
    expect(box.style.aspectRatio).toBe("");
  });

  it("leaves the page scrollable at rest: the vertical swipe stays the browser's", () => {
    const { box, img } = view();
    decode(img());
    expect(box).toHaveClass("touch-pan-y");
    // A one-finger drag at fit is not the viewer's: no pan of its own, no capture of the page.
    pointer("pointerDown", box, 1, 100, 300);
    pointer("pointerMove", box, 1, 100, 100);
    expect(scroll(box)).toEqual([0, 0]);
    expect(width(img())).toBe("100%");
  });

  it("is laid out left to right in a right-to-left page; the buttons follow the page", () => {
    render(
      <div dir="rtl">
        <ZoomableImage src="/r.png" alt="R" naturalWidth={10} naturalHeight={100} />
      </div>,
    );
    expect(screen.getByRole("region")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("group", { name: "Zoom" }).closest("[dir]")).toHaveAttribute("dir", "rtl");
  });
});

describe("ZoomableImage: buttons and keys", () => {
  it("zooms in about the middle, refuses at fit and at the ceiling, and fits again", async () => {
    const { box, img } = view();
    decode(img());
    // At fit, − and fit refuse — focusable, `aria-disabled`, so the press that gets back
    // here keeps its focus.
    expect(button("Zoom out")).toHaveAttribute("aria-disabled", "true");
    expect(button("Fit to width")).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(button("Zoom in"));
    expect(width(img())).toBe("150%");
    // The middle (152.5, 300) stays put: (152.5 + 0) × 1.5 − 152.5, (300 + 0) × 1.5 − 300.
    expect(scroll(box)).toEqual([76.25, 150]);
    expect(box).toHaveClass("touch-none");
    expect(button("Zoom out")).not.toHaveAttribute("aria-disabled");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Zoom 38%"));

    // 1.5 → 2.25 → 3.375 → 5.0625 → 6, the ceiling.
    for (let i = 0; i < 4; i += 1) fireEvent.click(button("Zoom in"));
    expect(width(img())).toBe("600%");
    expect(button("Zoom in")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button("Zoom in"));
    expect(width(img())).toBe("600%");

    fireEvent.click(button("Fit to width"));
    expect(width(img())).toBe("100%");
    expect(scroll(box)).toEqual([0, 0]);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Fitted to width"));
  });

  it("takes + = − 0 on the box, and leaves Ctrl/⌘ with them to the browser's page zoom", () => {
    const { box, img } = view();
    decode(img());
    fireEvent.keyDown(box, { key: "+" });
    expect(width(img())).toBe("150%");
    fireEvent.keyDown(box, { key: "=" });
    expect(width(img())).toBe("225%");
    fireEvent.keyDown(box, { key: "-" });
    expect(width(img())).toBe("150%");
    fireEvent.keyDown(box, { key: "0" });
    expect(width(img())).toBe("100%");

    // Not taken, not prevented: the reader who needs larger type keeps the browser's zoom.
    expect(fireEvent.keyDown(box, { key: "+", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(box, { key: "+", metaKey: true })).toBe(true);
    expect(width(img())).toBe("100%");
    // Any other key is the box's own (the arrows scroll it natively).
    expect(fireEvent.keyDown(box, { key: "ArrowDown" })).toBe(true);
  });

  it("ignores the keys while there is nothing to zoom", () => {
    const { box, img } = view();
    expect(fireEvent.keyDown(box, { key: "+" })).toBe(true);
    expect(width(img())).toBe("100%");
  });

  it("honours maxZoom", () => {
    const { box, img } = view({ maxZoom: 2 });
    decode(img());
    for (let i = 0; i < 3; i += 1) fireEvent.keyDown(box, { key: "+" });
    expect(width(img())).toBe("200%");
  });
});

describe("ZoomableImage: double-tap and double-click", () => {
  it("double-click toggles between fit and the picture's own pixels, about the click", () => {
    const { box, img } = view();
    decode(img());
    pointer("pointerDown", box, 1, 100, 200, "mouse");
    pointer("pointerUp", box, 1, 100, 200, "mouse");
    fireEvent.doubleClick(box, { clientX: 100, clientY: 200 });
    // 1220 over 305: 4x is 100 %. The point under the cursor stays there: 100 × 4 − 100.
    expect(width(img())).toBe("400%");
    expect(scroll(box)).toEqual([300, 600]);
    fireEvent.doubleClick(box, { clientX: 100, clientY: 200 });
    expect(width(img())).toBe("100%");
    expect(scroll(box)).toEqual([0, 0]);
  });

  it("double-tap does the same on a touch screen, and the dblclick a phone adds does not undo it", () => {
    const { box, img } = view();
    decode(img());
    tap(box, 100, 200);
    expect(width(img())).toBe("100%");
    tap(box, 102, 198);
    expect(width(img())).toBe("400%");
    // Some phone browsers follow a double tap with a synthesised dblclick; toggled by it
    // too, the picture would be back at fit before anyone saw it zoom.
    fireEvent.doubleClick(box, { clientX: 100, clientY: 200 });
    expect(width(img())).toBe("400%");
    tap(box, 100, 200);
    tap(box, 100, 200);
    expect(width(img())).toBe("100%");
  });

  it("does not take two slow taps, two far apart, or a drag for a double tap", () => {
    const { box, img } = view();
    decode(img());
    const at = (type: "pointerDown" | "pointerUp", x: number, y: number, time: number) => {
      const ev = createEvent[type](box, {
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        clientX: x,
        clientY: y,
      });
      Object.defineProperty(ev, "timeStamp", { value: time });
      fireEvent(box, ev);
    };
    at("pointerDown", 100, 200, 1000);
    at("pointerUp", 100, 200, 1050);
    at("pointerDown", 100, 200, 1500);
    at("pointerUp", 100, 200, 1550);
    expect(width(img())).toBe("100%");
    tap(box, 100, 200);
    tap(box, 250, 500);
    expect(width(img())).toBe("100%");
    tap(box, 100, 200);
    pointer("pointerDown", box, 1, 100, 200);
    pointer("pointerMove", box, 1, 100, 260);
    pointer("pointerUp", box, 1, 100, 260);
    expect(width(img())).toBe("100%");
  });

  it("does not take a tap the browser cancelled (its own scroll) as a tap", () => {
    const { box, img } = view();
    decode(img());
    tap(box, 100, 200);
    pointer("pointerDown", box, 1, 100, 200);
    pointer("pointerCancel", box, 1, 100, 200);
    expect(width(img())).toBe("100%");
  });
});

describe("ZoomableImage: pinch and pan", () => {
  it("pinches about the fingers' midpoint, pans with two fingers, and pans on the finger left", async () => {
    const { box, img } = view();
    decode(img());
    pointer("pointerDown", box, 1, 100, 100);
    pointer("pointerDown", box, 2, 200, 100);
    // Off from the second finger on, before any movement: or the browser scrolls under it.
    expect(box).toHaveClass("touch-none");

    // 100px apart to 200px: 2x, about the midpoint (150, 100), which then moves to (200, 100).
    pointer("pointerMove", box, 2, 300, 100);
    expect(width(img())).toBe("200%");
    expect(scroll(box)).toEqual([100, 100]);

    // Both fingers 40px up, still 200 apart: the zoom holds and the picture follows them.
    pointer("pointerMove", box, 1, 100, 60);
    pointer("pointerMove", box, 2, 300, 60);
    expect(width(img())).toBe("200%");
    expect(scroll(box)).toEqual([100, 140]);

    // One finger up: the pinch ends, is announced, and the other finger pans on from here.
    pointer("pointerUp", box, 2, 300, 60);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Zoom 50%"));
    pointer("pointerMove", box, 1, 60, 30);
    expect(scroll(box)).toEqual([140, 170]);
    expect(width(img())).toBe("200%");
  });

  it("keeps a one-finger pan inside the picture", () => {
    const { box, img } = view();
    decode(img());
    fireEvent.click(button("Zoom in"));
    pointer("pointerDown", box, 1, 100, 100);
    pointer("pointerMove", box, 1, -5000, -100000);
    // At 1.5x: 457.5 wide in 305, and 457.5 × 11615 / 1220 tall in 600.
    expect(box.scrollLeft).toBe(152.5);
    expect(box.scrollTop).toBeCloseTo(457.5 * (11615 / 1220) - 600);
    pointer("pointerMove", box, 1, 9000, 9000);
    expect(scroll(box)).toEqual([0, 0]);
  });

  it("does not zoom below fit or past the ceiling with a pinch", () => {
    const { box, img } = view();
    decode(img());
    pointer("pointerDown", box, 1, 100, 100);
    pointer("pointerDown", box, 2, 200, 100);
    pointer("pointerMove", box, 2, 110, 100);
    expect(width(img())).toBe("100%");
    pointer("pointerMove", box, 2, 5000, 100);
    expect(width(img())).toBe("600%");
  });

  it("starts each touch afresh, whatever a lost pointerup left behind", () => {
    const { box, img } = view();
    decode(img());
    // A finger whose lift never arrived …
    pointer("pointerDown", box, 1, 100, 100);
    // … and the next touch (primary again) is one finger, not the second of a pinch.
    fireEvent.pointerDown(box, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(box, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 300, clientY: 100 });
    expect(width(img())).toBe("100%");
    expect(box).toHaveClass("touch-pan-y");
  });

  it("drags a zoomed picture with the mouse, and leaves a fitted one alone", () => {
    const { box, img } = view();
    decode(img());
    expect(box).toHaveClass("cursor-zoom-in");
    pointer("pointerDown", box, 1, 100, 100, "mouse");
    pointer("pointerMove", box, 1, 50, 40, "mouse");
    expect(scroll(box)).toEqual([0, 0]);
    pointer("pointerUp", box, 1, 50, 40, "mouse");

    fireEvent.keyDown(box, { key: "+" });
    const [left, top] = scroll(box);
    expect(box).toHaveClass("cursor-grab");
    pointer("pointerDown", box, 1, 100, 100, "mouse");
    expect(box).toHaveClass("cursor-grabbing");
    pointer("pointerMove", box, 1, 50, 40, "mouse");
    expect(scroll(box)).toEqual([left + 50, top + 60]);
    pointer("pointerUp", box, 1, 50, 40, "mouse");
    expect(box).toHaveClass("cursor-grab");
  });
});

describe("ZoomableImage: wheel and touchmove", () => {
  it("zooms on ⌘/Ctrl + wheel (a trackpad pinch) about the cursor, and leaves a plain wheel to scroll", () => {
    const { box, img } = view();
    decode(img());
    clickInto(box);
    // Not prevented: the box, then the page, scrolls as anywhere else.
    expect(fireEvent.wheel(box, { deltaY: 100, clientX: 100, clientY: 100 })).toBe(true);
    expect(width(img())).toBe("100%");

    expect(fireEvent.wheel(box, { deltaY: -100, ctrlKey: true, clientX: 100, clientY: 100 })).toBe(false);
    const zoom = Math.exp(0.2);
    expect(parseFloat(width(img()))).toBeCloseTo(zoom * 100);
    expect(box.scrollLeft).toBeCloseTo(100 * zoom - 100);
    expect(box.scrollTop).toBeCloseTo(100 * zoom - 100);

    expect(fireEvent.wheel(box, { deltaY: 500, metaKey: true, clientX: 100, clientY: 100 })).toBe(false);
    expect(width(img())).toBe("100%");
  });

  it("does not take the wheel before there is anything to zoom", () => {
    const { box } = view();
    expect(fireEvent.wheel(box, { deltaY: -100, ctrlKey: true })).toBe(true);
  });

  it("keeps two fingers from the browser's scroll and page zoom, and leaves one alone", () => {
    const { box, img } = view();
    decode(img());
    const move = (fingers: number) => {
      const ev = new Event("touchmove", { bubbles: true, cancelable: true });
      Object.defineProperty(ev, "touches", { value: Array.from({ length: fingers }, () => ({})) });
      return fireEvent(box, ev);
    };
    expect(move(1)).toBe(true);
    expect(move(2)).toBe(false);
  });
});

/** WebKit's GestureEvent, as Safari dispatches it for a two-finger pinch: jsdom has none,
 *  so a plain cancelable Event carrying the fields Safari gives it. */
function gesture(
  el: HTMLElement,
  type: "gesturestart" | "gesturechange" | "gestureend",
  scale: number,
  x: number,
  y: number,
) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(ev, { scale: { value: scale }, clientX: { value: x }, clientY: { value: y } });
  return fireEvent(el, ev);
}

describe("ZoomableImage: Safari's gesture events", () => {
  it("zooms on desktop Safari's trackpad pinch about the cursor, from the level the pinch began at", async () => {
    const { box, img } = view();
    decode(img());
    clickInto(box);
    // Prevented, or Safari zooms the whole page.
    expect(gesture(box, "gesturestart", 1, 100, 100)).toBe(false);
    expect(width(img())).toBe("100%");
    expect(gesture(box, "gesturechange", 1.5, 100, 100)).toBe(false);
    expect(width(img())).toBe("150%");
    // The point under the cursor stays there: (0 + 100) × 1.5 − 100.
    expect(scroll(box)).toEqual([50, 50]);
    // `scale` counts from the pinch's start, not from the last event: 1 × 2, not 1.5 × 2.
    gesture(box, "gesturechange", 2, 100, 100);
    expect(width(img())).toBe("200%");
    expect(scroll(box)).toEqual([100, 100]);
    expect(gesture(box, "gestureend", 2, 100, 100)).toBe(false);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Zoom 50%"));

    // The next pinch counts from 2, where it began: 2 × 2 is the picture's own pixels.
    gesture(box, "gesturestart", 1, 100, 100);
    gesture(box, "gesturechange", 2, 100, 100);
    expect(width(img())).toBe("400%");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Zoom 100%"));
    // Kept between fit and the ceiling, as the wheel is.
    gesture(box, "gesturechange", 10, 100, 100);
    expect(width(img())).toBe("600%");
    expect(button("Zoom in")).toHaveAttribute("aria-disabled", "true");
    gesture(box, "gesturechange", 0.1, 100, 100);
    expect(width(img())).toBe("100%");
    expect(scroll(box)).toEqual([0, 0]);
    gesture(box, "gestureend", 0.1, 100, 100);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Fitted to width"));
  });

  it("leaves a Safari pinch to the page before there is anything to zoom", () => {
    const { box, img } = view();
    expect(gesture(box, "gesturestart", 1, 100, 100)).toBe(true);
    expect(gesture(box, "gesturechange", 2, 100, 100)).toBe(true);
    expect(width(img())).toBe("100%");
  });

  it("leaves a touch screen's pinch to its pointers: iOS's gesture events beside them are only prevented", () => {
    const { box, img } = view();
    decode(img());
    // iOS Safari sends one pinch twice: as pointer events, which the touch pinch follows,
    // and as gesture events. A gesturechange that runs ahead of the pointers moves nothing.
    pointer("pointerDown", box, 1, 100, 100);
    pointer("pointerDown", box, 2, 200, 100);
    expect(gesture(box, "gesturestart", 1, 150, 100)).toBe(false);
    expect(gesture(box, "gesturechange", 2, 200, 100)).toBe(false);
    expect(width(img())).toBe("100%");
    pointer("pointerMove", box, 2, 300, 100);
    expect(width(img())).toBe("200%");
    expect(scroll(box)).toEqual([100, 100]);
    expect(gesture(box, "gesturechange", 3, 200, 100)).toBe(false);
    expect(width(img())).toBe("200%");
    pointer("pointerUp", box, 2, 300, 100);
    pointer("pointerUp", box, 1, 100, 100);
    expect(gesture(box, "gestureend", 3, 200, 100)).toBe(false);

    // Two fingers that land together: their `gesturestart` may come before either pointerdown.
    gesture(box, "gesturestart", 1, 150, 100);
    pointer("pointerDown", box, 1, 100, 100);
    pointer("pointerDown", box, 2, 200, 100);
    gesture(box, "gesturechange", 1.5, 150, 100);
    expect(width(img())).toBe("200%");
  });
});

describe("ZoomableImage: ⌘/Ctrl + wheel and Safari's pinch only once engaged (Marcel, 2026-11-13)", () => {
  /** The picture, decoded, beside a button elsewhere on the page. */
  function page() {
    const utils = view();
    decode(utils.img());
    render(<button type="button">Elsewhere</button>);
    return utils;
  }
  const elsewhere = () => screen.getByRole("button", { name: "Elsewhere" });
  const ctrlWheel = (box: HTMLElement, deltaY: number) =>
    fireEvent.wheel(box, { deltaY, ctrlKey: true, clientX: 100, clientY: 100 });
  /** Past the quiet spell that ends a wheel's burst. */
  const quiet = () => act(() => vi.advanceTimersByTime(1000));
  afterEach(() => vi.useRealTimers());

  it("leaves both to the page over a picture nobody has pressed into or focused: not prevented, nothing zoomed", () => {
    const { box, img } = page();
    // The page zoom of a reader who enlarges the page with Ctrl + wheel, the pointer over the receipt.
    expect(ctrlWheel(box, -100)).toBe(true);
    expect(fireEvent.wheel(box, { deltaY: -100, metaKey: true, clientX: 100, clientY: 100 })).toBe(true);
    expect(gesture(box, "gesturestart", 1, 100, 100)).toBe(true);
    expect(gesture(box, "gesturechange", 2, 100, 100)).toBe(true);
    expect(gesture(box, "gestureend", 2, 100, 100)).toBe(true);
    expect(width(img())).toBe("100%");
    expect(scroll(box)).toEqual([0, 0]);
  });

  it("takes them once pressed into, by any pointer, anywhere on it, and lets go on a press outside", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { box, img } = page();
    // A mouse press at fit: nothing to drag, but the reader has pressed into the picture.
    pointer("pointerDown", box, 1, 100, 100, "mouse");
    pointer("pointerUp", box, 1, 100, 100, "mouse");
    expect(ctrlWheel(box, -100)).toBe(false);
    expect(parseFloat(width(img()))).toBeCloseTo(Math.exp(0.2) * 100);
    quiet();
    fireEvent.click(button("Fit to width"));
    expect(width(img())).toBe("100%");

    fireEvent.pointerDown(elsewhere());
    expect(ctrlWheel(box, -100)).toBe(true);
    expect(gesture(box, "gesturestart", 1, 100, 100)).toBe(true);
    expect(width(img())).toBe("100%");

    // A pen on the zoom buttons, as much as a press on the picture.
    fireEvent.pointerDown(button("Fit to width"), { pointerType: "pen" });
    expect(gesture(box, "gesturestart", 1, 100, 100)).toBe(false);
    expect(gesture(box, "gesturechange", 1.5, 100, 100)).toBe(false);
    expect(width(img())).toBe("150%");
  });

  it("takes them while it holds the focus, and lets go when the focus leaves it at fit", () => {
    const { box, img } = page();
    act(() => box.focus());
    expect(gesture(box, "gesturestart", 1, 100, 100)).toBe(false);
    expect(gesture(box, "gestureend", 1, 100, 100)).toBe(false);
    act(() => elsewhere().focus());
    expect(ctrlWheel(box, -100)).toBe(true);
    expect(width(img())).toBe("100%");
    // Tabbing back in takes them again.
    act(() => button("Zoom in").focus());
    expect(ctrlWheel(box, -100)).toBe(false);
    expect(parseFloat(width(img()))).toBeCloseTo(Math.exp(0.2) * 100);
  });

  it("stays engaged while zoomed, whatever is pressed or focused elsewhere, until it is back at fit", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { box, img } = page();
    // Zoomed from a script (no press, no focus): zoomed alone engages it.
    fireEvent.click(button("Zoom in"));
    fireEvent.pointerDown(elsewhere());
    act(() => elsewhere().focus());
    expect(ctrlWheel(box, -100)).toBe(false);
    expect(parseFloat(width(img()))).toBeCloseTo(150 * Math.exp(0.2));
    quiet();
    fireEvent.keyDown(box, { key: "0" });
    expect(width(img())).toBe("100%");
    expect(ctrlWheel(box, -100)).toBe(true);
    expect(width(img())).toBe("100%");
  });

  it("lets a turn it took run to its end, out to fit, before the page has the wheel back", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { box, img } = page();
    fireEvent.click(button("Zoom in"));
    fireEvent.pointerDown(elsewhere());
    // Engaged by the zoom alone; turned out to fit …
    expect(ctrlWheel(box, 500)).toBe(false);
    expect(width(img())).toBe("100%");
    // … and the rest of that turn is the picture's, not a page zoom starting halfway through it.
    expect(ctrlWheel(box, 100)).toBe(false);
    quiet();
    expect(ctrlWheel(box, 100)).toBe(true);
  });

  it("leaves a touch screen's two fingers as they were: an engagement in themselves", () => {
    const { box, img } = page();
    fireEvent.pointerDown(elsewhere());
    pointer("pointerDown", box, 1, 100, 100);
    pointer("pointerDown", box, 2, 200, 100);
    expect(gesture(box, "gesturestart", 1, 150, 100)).toBe(false);
    pointer("pointerMove", box, 2, 300, 100);
    expect(width(img())).toBe("200%");
    expect(gesture(box, "gesturechange", 2, 200, 100)).toBe(false);
    expect(width(img())).toBe("200%");
  });
});

describe("ZoomableImage: motion", () => {
  /** The animation frames, run by hand at a given time: what the browser would paint. */
  function stubFrames() {
    const frames = new Map<number, FrameRequestCallback>();
    let next = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.set((next += 1), cb);
      return next;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => frames.delete(handle));
    return {
      pending: () => frames.size,
      run: (at: number) =>
        act(() => {
          for (const [handle, cb] of [...frames]) {
            frames.delete(handle);
            cb(at);
          }
        }),
    };
  }

  it("eases a step when motion is welcome", () => {
    stubDesktop();
    const frames = stubFrames();
    const { img } = view();
    decode(img());
    const t0 = performance.now();
    fireEvent.click(button("Zoom in"));
    // Nothing painted yet; half-way through the ease-out it is most of the way there.
    expect(width(img())).toBe("100%");
    frames.run(t0 + 80);
    const mid = parseFloat(width(img()));
    expect(mid).toBeGreaterThan(125);
    expect(mid).toBeLessThan(150);
    frames.run(t0 + 1000);
    expect(width(img())).toBe("150%");
    expect(frames.pending()).toBe(0);
  });

  it("jumps under prefers-reduced-motion", () => {
    stubDesktop({ reducedMotion: true });
    const frames = stubFrames();
    const { img } = view();
    decode(img());
    fireEvent.click(button("Zoom in"));
    expect(width(img())).toBe("150%");
    expect(frames.pending()).toBe(0);
  });

  it("a touch stops a step mid-way", () => {
    stubDesktop();
    const frames = stubFrames();
    const { box, img } = view();
    decode(img());
    fireEvent.click(button("Zoom in"));
    pointer("pointerDown", box, 1, 100, 100);
    expect(frames.pending()).toBe(0);
    expect(width(img())).toBe("100%");
  });
});

describe("ZoomableImage: a new picture, and the words", () => {
  it("starts a new src over at fit and at the top", () => {
    const { box, img, rerender } = view();
    decode(img());
    fireEvent.keyDown(box, { key: "+" });
    expect(width(img())).toBe("150%");
    rerender(<ZoomableImage src="/other.png" alt="Receipt" />);
    expect(width(img())).toBe("100%");
    expect(screen.getByRole("region").scrollTop).toBe(0);
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
  });

  it("speaks the provider's catalogue, and the labels prop wins", async () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <ZoomableImage src="/beleg.png" alt="Beleg" naturalWidth={1220} naturalHeight={11615} />
        <ZoomableImage src="/b.png" alt="" naturalWidth={10} naturalHeight={10} labels={{ zoomIn: "Näher" }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("region", { name: "Zoombares Bild: Beleg" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Zoombares Bild" })).toBeInTheDocument();
    // Swiss: "ss" for "ß".
    expect(screen.getAllByRole("button", { name: "Vergrössern" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Näher" })).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "Zoom" })).toHaveLength(2);
  });

  it("loads through the app's fetcher, as AuthedImage does", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => "blob:receipt" });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
    try {
      const fetcher = vi.fn(async () => new Blob(["png"], { type: "image/png" }));
      render(<ZoomableImage src="/api/files/7" alt="Receipt" fetcher={fetcher} />);
      expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
      const img = await screen.findByAltText("Receipt");
      expect(fetcher).toHaveBeenCalledWith("/api/files/7", expect.objectContaining({ signal: expect.anything() }));
      expect(img).toHaveAttribute("src", "blob:receipt");
      decode(img);
      expect(button("Zoom in")).toBeInTheDocument();
    } finally {
      Reflect.deleteProperty(URL, "createObjectURL");
      Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  });
});
