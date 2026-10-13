// Drag-to-zoom for cartesian charts — the public face of ./chart-zoom-core, which holds
// the HOC, the shared x window and the arithmetic (its header says how a drag picks its
// axes). `SeriesChart` is how an app zooms; `SharedXZoom` gives a column of charts one x
// window.
//
// 0.34 (refactor audit 2026-10, API-6b = MOD-10): the arithmetic and the HOC leave the
// public surface in 0.35. They were exported because lenkbank's, later Kurvenschmiede's,
// own tests used them; no file in any of the three apps names one today. The kit's own
// modules import them from the core, so their removal is the block below.
import * as core from "./chart-zoom-core";

export { SharedXZoom } from "./chart-zoom-core";
export type {
  ZoomAxes,
  ZoomAxesSetting,
  ZoomBinding,
  ZoomDrag,
  ZoomFitSeries,
  ZoomFitSource,
  ZoomRow,
  ZoomSelection,
  ZoomState,
  ZoomTarget,
} from "./chart-zoom-core";

/* ── Deprecated 0.34, removed in 0.35 ─────────────────────────────────────
 * Each is the core's own value under its old public name: SeriesChart draws the zoom
 * these compute, and a chart's `zoomAxes` prop is what an app sets. */

/** @deprecated 0.34 — a series without `axis` is on the chart's single y axis, `"y"`;
 *  removed in 0.35 (API-6b). */
export const DEFAULT_Y_AXIS = core.DEFAULT_Y_AXIS;
/** @deprecated 0.34 — SeriesChart's zoom, which reads it; removed in 0.35 (API-6b). */
export const ZOOM_SQUARE_ENOUGH = core.ZOOM_SQUARE_ENOUGH;
/** @deprecated 0.34 — SeriesChart's zoom, which reads it; removed in 0.35 (API-6b). */
export const ZOOM_MIN_DRAG = core.ZOOM_MIN_DRAG;
/** @deprecated 0.34 — SeriesChart's zoom, which reads a drag this way; removed in 0.35
 *  (API-6b). */
export const zoomAxesFor = core.zoomAxesFor;
/** @deprecated 0.34 — SeriesChart's zoom, which reads a drag this way; removed in 0.35
 *  (API-6b). */
export const selectionFromDrag = core.selectionFromDrag;
/** @deprecated 0.34 — SeriesChart fits its axes with it; removed in 0.35 (API-6b). */
export const axisExtent = core.axisExtent;
/** @deprecated 0.34 — SeriesChart's zoom, which refits the axes a drag did not name;
 *  removed in 0.35 (API-6b). */
export const fitYToX = core.fitYToX;
/** @deprecated 0.34 — SeriesChart's zoom, which refits the axes a drag did not name;
 *  removed in 0.35 (API-6b). */
export const fitXToY = core.fitXToY;
/** @deprecated 0.34 — SeriesChart's zoom, which keeps its own state; removed in 0.35
 *  (API-6b). */
export const NO_ZOOM = core.NO_ZOOM;
/** @deprecated 0.34 — SeriesChart's zoom, which keeps its own state; removed in 0.35
 *  (API-6b). */
export const zoomAfter = core.zoomAfter;
/** @deprecated 0.34 — SeriesChart's zoom, which keeps its own state; removed in 0.35
 *  (API-6b). */
export const zoomDomains = core.zoomDomains;
/** @deprecated 0.34 — SeriesChart's `zoomAxes` prop, which says what its default is;
 *  removed in 0.35 (API-6b). */
export const defaultZoomAxes = core.defaultZoomAxes;
/** @deprecated 0.34 — SeriesChart, which is a chart wrapped in it, and SharedXZoom;
 *  removed in 0.35 (API-6b). */
export const withChartZoom = core.withChartZoom;
