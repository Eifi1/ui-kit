import { describe, expect, it } from "vitest";

import {
  DETAIL_ZOOM_MIN,
  MAX_ZOOM,
  actualSizeZoom,
  clampView,
  clampZoom,
  detailZoom,
  maxZoomFor,
  panLimits,
  panView,
  pinchView,
  wheelZoomFactor,
  zoomAt,
  zoomPercent,
} from "../zoom-view";
import type { ZoomFrame } from "../zoom-view";

/** keksdose live #505's receipt, 1220×11615, in a 305px box capped at 600px: fitted, it
 *  is 305 wide and 2903.75 tall — 4x under its own pixels. */
const RECEIPT: ZoomFrame = { width: 305, height: 600, ratio: 11615 / 1220 };
/** A 4:3 photo whose fitted height is exactly the box's. */
const PHOTO: ZoomFrame = { width: 400, height: 300, ratio: 0.75 };
const FIT = { zoom: 1, left: 0, top: 0 };

describe("panLimits", () => {
  it("is how far the widened picture hangs out of the box", () => {
    expect(panLimits(PHOTO, 1)).toEqual({ left: 0, top: 0 });
    expect(panLimits(PHOTO, 2)).toEqual({ left: 400, top: 300 });
    // A tall picture scrolls at fit already, and only vertically.
    expect(panLimits(RECEIPT, 1).left).toBe(0);
    expect(panLimits(RECEIPT, 1).top).toBeCloseTo(305 * (11615 / 1220) - 600);
  });
});

describe("clampZoom / clampView", () => {
  it.each([
    [0.5, 6, 1],
    [1, 6, 1],
    [3, 6, 3],
    [9, 6, 6],
    // A ceiling under fit zooms nothing rather than shrinking the picture.
    [3, 0.5, 1],
  ])("clampZoom(%s, %s) = %s", (zoom, max, expected) => {
    expect(clampZoom(zoom, max)).toBe(expected);
  });

  it("keeps the pan inside the picture", () => {
    expect(clampView(PHOTO, { zoom: 2, left: -50, top: 9999 })).toEqual({ zoom: 2, left: 0, top: 300 });
    expect(clampView(PHOTO, { zoom: 1, left: 20, top: 20 })).toEqual(FIT);
  });
});

describe("zoomAt", () => {
  it("keeps the point under the anchor where it is", () => {
    // The picture point under (100, 200) at fit is (100, 200); at 4x it is (400, 800),
    // so the box scrolls by (300, 600) to keep it under the same spot.
    expect(zoomAt(RECEIPT, FIT, 4, { x: 100, y: 200 })).toEqual({ zoom: 4, left: 300, top: 600 });
    // And back: the same point, the same spot.
    expect(zoomAt(RECEIPT, { zoom: 4, left: 300, top: 600 }, 1, { x: 100, y: 200 })).toEqual(FIT);
  });

  it("zooms about the box's middle by default", () => {
    expect(zoomAt(PHOTO, FIT, 2)).toEqual({ zoom: 2, left: 200, top: 150 });
  });

  it("clamps what the anchor asks for: zooming out at an edge never shows past it", () => {
    expect(zoomAt(PHOTO, { zoom: 2, left: 400, top: 300 }, 1.5, { x: 0, y: 0 })).toEqual({
      zoom: 1.5,
      left: 200,
      top: 150,
    });
  });
});

describe("panView", () => {
  it("moves the picture with the pointer, the scroll the other way, inside the picture", () => {
    const from = { zoom: 2, left: 200, top: 150 };
    expect(panView(PHOTO, from, -40, 30)).toEqual({ zoom: 2, left: 240, top: 120 });
    expect(panView(PHOTO, from, -5000, 5000)).toEqual({ zoom: 2, left: 400, top: 0 });
  });
});

describe("pinchView", () => {
  const start = { view: FIT, a: { x: 100, y: 100 }, b: { x: 200, y: 100 } };

  it("follows the fingers' spread, about their midpoint", () => {
    // 100px apart to 200px: 2x; the midpoint (150, 100) stays put when it does not move.
    expect(pinchView(PHOTO, start, { x: 50, y: 100 }, { x: 250, y: 100 }, 6)).toEqual({
      zoom: 2,
      left: 150,
      top: 100,
    });
  });

  it("pans with the midpoint at the same time: two fingers moved together", () => {
    // Spread 200 (2x), midpoint moved from (150, 100) to (200, 60): the picture point that
    // was under the midpoint, (150, 100) at fit = (300, 200) at 2x, is under (200, 60).
    expect(pinchView(PHOTO, start, { x: 100, y: 60 }, { x: 300, y: 60 }, 6)).toEqual({
      zoom: 2,
      left: 100,
      top: 140,
    });
  });

  it("pans a fitted tall picture with two fingers and no spread", () => {
    const view = pinchView(RECEIPT, start, { x: 100, y: 40 }, { x: 200, y: 40 }, 6);
    expect(view).toEqual({ zoom: 1, left: 0, top: 60 });
  });

  it("stops at fit and at the ceiling", () => {
    expect(pinchView(PHOTO, start, { x: 140, y: 100 }, { x: 160, y: 100 }, 6).zoom).toBe(1);
    expect(pinchView(PHOTO, start, { x: 0, y: 100 }, { x: 1000, y: 100 }, 6).zoom).toBe(6);
  });

  it("measures from the start, so a gesture that returns is back where it began", () => {
    expect(pinchView(PHOTO, start, start.a, start.b, 6)).toEqual(FIT);
  });

  it("holds the zoom when the fingers started on one spot", () => {
    const same = { view: { zoom: 2, left: 0, top: 0 }, a: { x: 10, y: 10 }, b: { x: 10, y: 10 } };
    expect(pinchView(PHOTO, same, { x: 10, y: 10 }, { x: 90, y: 10 }, 6).zoom).toBe(2);
  });
});

describe("wheelZoomFactor", () => {
  it("is exponential: a turn and its reverse cancel, a notch is about ×1.22", () => {
    expect(wheelZoomFactor(-100, 0, 600)).toBeCloseTo(1.2214, 4);
    expect(wheelZoomFactor(100, 0, 600) * wheelZoomFactor(-100, 0, 600)).toBeCloseTo(1);
  });

  it("counts a line as 16px and a page as the box's height", () => {
    expect(wheelZoomFactor(-3, 1, 600)).toBeCloseTo(wheelZoomFactor(-48, 0, 600));
    expect(wheelZoomFactor(-1, 2, 600)).toBeCloseTo(wheelZoomFactor(-600, 0, 600));
  });
});

describe("the picture's own size", () => {
  it("actualSizeZoom: natural width over the box's, 1 while either is unknown", () => {
    expect(actualSizeZoom(1220, 305)).toBe(4);
    expect(actualSizeZoom(0, 305)).toBe(1);
    expect(actualSizeZoom(1220, 0)).toBe(1);
  });

  it("detailZoom: 100 %, but at least twice the fit, under the ceiling", () => {
    expect(detailZoom(1220, 305, 6)).toBe(4);
    expect(detailZoom(1220, 1000, 6)).toBe(DETAIL_ZOOM_MIN);
    expect(detailZoom(4000, 300, 6)).toBe(6);
  });

  it("maxZoomFor: the caller's, else 6 — raised so 100 % is in reach", () => {
    expect(maxZoomFor(1220, 305)).toBe(MAX_ZOOM);
    expect(maxZoomFor(4000, 250)).toBe(16);
    expect(maxZoomFor(4000, 250, 3)).toBe(3);
    expect(maxZoomFor(4000, 250, 0)).toBe(1);
  });

  it("zoomPercent: of the picture's own size, rounded; of the fit while unknown", () => {
    expect(zoomPercent(1, 1220, 305)).toBe(25);
    expect(zoomPercent(4, 1220, 305)).toBe(100);
    expect(zoomPercent(1.5, 1220, 305)).toBe(38);
    expect(zoomPercent(1.5, 0, 305)).toBe(150);
  });
});
