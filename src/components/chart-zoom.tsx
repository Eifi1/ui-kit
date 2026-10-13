// Drag-to-zoom for cartesian charts — the public face of ./chart-zoom-core, which holds
// the HOC, the shared x window and the arithmetic (its header says how a drag picks its
// axes). `SeriesChart` is how an app zooms; `SharedXZoom` gives a column of charts one x
// window.
//
// Those two and the zoom's types are all that is public. The arithmetic and the HOC were
// too until 0.35 (refactor audit 2026-10, API-6b = MOD-10; deprecated in 0.34): exported
// because lenkbank's, later Kurvenschmiede's, own tests used them, and named by no file in
// any of the three apps since. The kit's own modules import them from the core.
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
