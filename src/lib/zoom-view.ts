/**
 * The geometry of a picture zoomed inside a scroll box: the pure half of `ZoomableImage`
 * (components/zoomable-image.tsx), kept apart so every number can be checked on its own.
 * Internal (not exported from the package).
 *
 * The model is keksdose's for a receipt shared as one long screenshot (live #505, a
 * 1220×11615 picture): the picture is fitted to the box's WIDTH, and a zoom WIDENS it
 * (zoom 2 is twice the box's width) instead of scaling it inside a box as wide as it was.
 * A transform would keep the layout box at its fitted width, so the box's scroll range
 * would never grow and a zoomed picture could not be panned by scrolling; widened, the
 * box's own scroll offsets ARE the pan, and the browser's scrollbars, wheel and arrow
 * keys pan it with no code here.
 *
 * Units: `zoom` is a multiple of the fitted width (1 = fit to width). `left` / `top` are
 * the box's scroll offsets, in CSS px. A point is in CSS px from the box's top-left
 * corner (inside its border).
 */

export interface ZoomPoint {
  x: number;
  y: number;
}

/** The box the picture is shown in, and the picture's shape. */
export interface ZoomFrame {
  /** The box's client width: the fitted picture's width. */
  width: number;
  /** The box's client height: how much of the picture shows at once. */
  height: number;
  /** The picture's natural height over its natural width (10 for a 1:10 receipt). */
  ratio: number;
}

/** What is on screen: the zoom and the scroll offsets. */
export interface ZoomView {
  zoom: number;
  left: number;
  top: number;
}

/** The most a zoom reaches by default, as a multiple of the fitted width — unless the
 *  picture's own pixels are further (see {@link maxZoomFor}). 6x is keksdose's touch
 *  ceiling: past it a phone photo of a till receipt has no detail left to show. */
export const MAX_ZOOM = 6;

/** What one press of + or − (a button or a key) multiplies the zoom by. Multiplicative,
 *  so each press looks like the same step at any zoom: 1, 1.5, 2.25, 3.4 … */
export const ZOOM_STEP = 1.5;

/** A double-tap or double-click zooms at least this far, where the picture's own pixels
 *  are hardly wider than the box (see {@link detailZoom}). */
export const DETAIL_ZOOM_MIN = 2;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The largest scroll offsets at `zoom`: how far the widened picture hangs out of the box. */
export function panLimits(frame: ZoomFrame, zoom: number): { left: number; top: number } {
  const width = frame.width * zoom;
  return {
    left: Math.max(0, width - frame.width),
    top: Math.max(0, width * frame.ratio - frame.height),
  };
}

/** `zoom` kept between fit (1) and `max`. A `max` below 1 is read as 1: nothing zooms. */
export function clampZoom(zoom: number, max: number): number {
  return clamp(zoom, 1, Math.max(1, max));
}

/** The view with its pan kept inside the picture: a drag cannot fling it off screen. */
export function clampView(frame: ZoomFrame, view: ZoomView): ZoomView {
  const limit = panLimits(frame, view.zoom);
  return { zoom: view.zoom, left: clamp(view.left, 0, limit.left), top: clamp(view.top, 0, limit.top) };
}

/** The box's middle — where a button or a key zooms about. */
export function frameCentre(frame: ZoomFrame): ZoomPoint {
  return { x: frame.width / 2, y: frame.height / 2 };
}

/**
 * Zoom from `from` to `zoom`, keeping the point of the picture under `at` (a double tap,
 * the wheel's cursor; the box's middle by default) where it is on screen. That point is
 * `(scroll + at) / zoom` in fitted units before and after, so the new scroll is that
 * point at the new zoom, less `at`.
 */
export function zoomAt(frame: ZoomFrame, from: ZoomView, zoom: number, at: ZoomPoint = frameCentre(frame)): ZoomView {
  const k = zoom / from.zoom;
  return clampView(frame, { zoom, left: (from.left + at.x) * k - at.x, top: (from.top + at.y) * k - at.y });
}

/** A one-finger (or mouse) drag of `dx`, `dy` from where it started: the picture follows
 *  the pointer, so the scroll moves the other way. */
export function panView(frame: ZoomFrame, from: ZoomView, dx: number, dy: number): ZoomView {
  return clampView(frame, { zoom: from.zoom, left: from.left - dx, top: from.top - dy });
}

/** Where a two-finger gesture started: the view, and the two fingers. */
export interface PinchStart {
  view: ZoomView;
  a: ZoomPoint;
  b: ZoomPoint;
}

const distance = (a: ZoomPoint, b: ZoomPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: ZoomPoint, b: ZoomPoint): ZoomPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * A two-finger gesture, pinch and pan at once: the zoom follows the fingers' spread, and
 * the point of the picture that was under their midpoint stays under it as the midpoint
 * moves. Measured from the START every time, not from the last move, so rounding never
 * accumulates and a gesture that returns to where it began is back at its first view.
 */
export function pinchView(frame: ZoomFrame, start: PinchStart, a: ZoomPoint, b: ZoomPoint, maxZoom: number): ZoomView {
  const before = distance(start.a, start.b);
  const zoom = before > 0 ? clampZoom((start.view.zoom * distance(a, b)) / before, maxZoom) : start.view.zoom;
  const from = midpoint(start.a, start.b);
  const to = midpoint(a, b);
  const k = zoom / start.view.zoom;
  return clampView(frame, {
    zoom,
    left: (start.view.left + from.x) * k - to.x,
    top: (start.view.top + from.y) * k - to.y,
  });
}

/**
 * What a wheel turn (or a trackpad pinch, which browsers deliver as a wheel with
 * `ctrlKey`) multiplies the zoom by. Exponential in the delta, so a turn and its reverse
 * cancel, and a trackpad's many small deltas add up to what one notch does: a 100px
 * notch is ×0.82 or ×1.22. Lines (`deltaMode` 1) count 16px each, pages the box's height.
 */
export function wheelZoomFactor(deltaY: number, deltaMode: number, pageHeight: number): number {
  const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * pageHeight : deltaY;
  return Math.exp(-px * 0.002);
}

/** The zoom at which the picture shows its own pixels one to one ("100 %"): its natural
 *  width over the box's. 1 while either is unknown. */
export function actualSizeZoom(naturalWidth: number, frameWidth: number): number {
  return naturalWidth > 0 && frameWidth > 0 ? naturalWidth / frameWidth : 1;
}

/**
 * Where a double-tap or double-click takes a fitted picture: its own pixels (100 %), the
 * sharpest view there is — but at least {@link DETAIL_ZOOM_MIN}, since a picture hardly
 * wider than the box would otherwise move by a few per cent and read as a gesture that
 * did nothing. Kept under `maxZoom`.
 */
export function detailZoom(naturalWidth: number, frameWidth: number, maxZoom: number): number {
  return clampZoom(Math.max(actualSizeZoom(naturalWidth, frameWidth), DETAIL_ZOOM_MIN), maxZoom);
}

/** The ceiling: the caller's `max`, or {@link MAX_ZOOM} — raised to the picture's own
 *  pixels where those are further, so 100 % is always in reach (a 4000px photo in a
 *  300px box is 13x). */
export function maxZoomFor(naturalWidth: number, frameWidth: number, max?: number): number {
  return Math.max(1, max ?? Math.max(MAX_ZOOM, actualSizeZoom(naturalWidth, frameWidth)));
}

/** The zoom as the per cent of the picture's own size a reader is told, rounded; of the
 *  fitted width while the natural size or the box's is unknown. */
export function zoomPercent(zoom: number, naturalWidth: number, frameWidth: number): number {
  return Math.round((zoom / actualSizeZoom(naturalWidth, frameWidth)) * 100);
}
