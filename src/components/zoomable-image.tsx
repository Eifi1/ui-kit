import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from "react";
import type {
  ComponentPropsWithRef,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  SyntheticEvent,
  CSSProperties,
} from "react";
import { Shrink, ZoomIn, ZoomOut } from "lucide-react";

import { cn } from "../lib/cn";
import { prefersReducedMotion } from "../lib/reduced-motion";
import {
  ZOOM_STEP,
  clampZoom,
  detailZoom,
  maxZoomFor,
  panView,
  pinchView,
  wheelZoomFactor,
  zoomAt,
  zoomPercent,
} from "../lib/zoom-view";
import type { PinchStart, ZoomFrame, ZoomPoint, ZoomView } from "../lib/zoom-view";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { useAnnounce } from "../hooks/use-announce";
import { useAuthedSrc } from "../hooks/use-authed-src";
import type { AuthedFetcher } from "../hooks/use-authed-src";
import { ImageStates, DEFAULT_AUTHED_IMAGE_LABELS } from "./authed-image";
import { ButtonGroup } from "./button-group";
import { IconButton } from "./icon-button";
import { THIN_SCROLLBAR_CLASS } from "./scroll-area";
import { DEFAULT_ZOOMABLE_IMAGE_LABELS } from "./zoomable-image-labels";

export interface ZoomableImageLabels {
  /** The picture box's accessible name (a focusable region), given the image's `alt`
   *  (`""` for none). */
  viewer: (alt: string) => string;
  /** The box's description: the keys. The buttons say the rest. */
  hint: string;
  /** The zoom buttons' group. */
  controls: string;
  zoomIn: string;
  zoomOut: string;
  /** The button (and the 0 key) back to fit-to-width. */
  fit: string;
  /** Announced after a zoom: the per cent of the picture's own size, rounded. */
  level: (percent: number) => string;
  /** Announced on the way back to fit-to-width. */
  fitted: string;
}

// Defined in ./zoomable-image-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_ZOOMABLE_IMAGE_LABELS };

export interface ZoomableImageProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The picture's URL — an API path when a {@link fetcher} is given. A new `src` starts
   *  over at fit-to-width and at the top. */
  src: string | null | undefined;
  /** Required: the picture's text alternative. `""` for none; the box is still named. */
  alt: string;
  /** The app's authenticated GET (see {@link useAuthedSrc}), as AuthedImage's. Left out,
   *  `src` is loaded by the browser as usual. */
  fetcher?: AuthedFetcher | null;
  /**
   * The picture's own size in px, when the app knows it before the file arrives (an
   * upload's stored metadata). The box then takes its final height from the first frame,
   * instead of growing when the picture decodes, and the zoom works before it has. Once
   * decoded, the picture's real size wins. Give both or neither.
   */
  naturalWidth?: number;
  naturalHeight?: number;
  /**
   * The tallest the box grows, as a CSS length (`"75svh"`, `"32rem"`) or px. Default
   * `"75svh"`: at fit-to-width a picture shorter than that is shown whole, and a taller
   * one — a receipt screenshot, ten times taller than wide — scrolls inside it. The small
   * viewport unit, not `dvh`: a box that changed height as a phone's address bar hides
   * would move everything under it while the page scrolls.
   */
  maxHeight?: number | string;
  /** The most it zooms, as a multiple of the fitted width. Default 6, or the picture's
   *  own size (100 %) where that is further, so the full detail is always in reach. */
  maxZoom?: number;
  labels?: LabelOverride<ZoomableImageLabels>;
}

/** How long a step of the buttons, the keys or a double-tap eases for. Gestures follow
 *  the fingers frame by frame and never ease: an eased pinch reads as lag. */
const STEP_MS = 160;
/** A touch that moves less than this is still a tap. */
const TAP_SLOP_PX = 10;
/** Two taps this close in time and place are a double tap. */
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 40;
/** Zooms this close to 1 are fit-to-width (a float that came back from a pinch). */
const FIT_EPSILON = 0.001;

type Gesture =
  | { kind: "pan"; pointerId: number; from: ZoomView; x: number; y: number }
  | { kind: "pinch"; ids: [number, number]; start: PinchStart };

/**
 * A picture shown inline, in the page's flow, that zooms where it is: fitted to the box's
 * width, pinch and two-finger pan on a touch screen, ⌘/Ctrl + wheel (and a trackpad
 * pinch), the − / fit / + buttons and the + − 0 keys on a desktop, and a double-tap or
 * double-click between fit-to-width and the picture's own pixels (100 %). Not a modal:
 * for a set of photos opened full screen, {@link Lightbox}.
 *
 * keksdose's receipt preview (live #505): a receipt shared as one long screenshot,
 * 1220×11615, fitted whole into its frame was a sliver about 60px wide on a phone, and a
 * zoom that scaled the sliver never widened it. Here a picture always takes the box's
 * width and a zoom widens it, the box's own scroll being the pan — the geometry is
 * lib/zoom-view.ts.
 *
 * The box GROWS with the picture, up to `maxHeight`, and scrolls past that. A fixed
 * height would letterbox a landscape photo or scroll a short one; a box as tall as the
 * picture would make the receipt four screens long, with the zoom buttons three screens
 * below the line being read. While zoomed the box keeps its fitted height (from the
 * picture's shape, `aspect-ratio`), so a zoom never moves the page around it.
 *
 * The page scroll is never trapped at rest: at fit-to-width a one-finger swipe is the
 * browser's own (`touch-action: pan-y`), so it scrolls the receipt and, at its end, the
 * page, and a plain wheel does the same. Only two fingers, a modified wheel, and — once
 * zoomed — a drag on the picture are the viewer's; the page still scrolls outside it.
 *
 * Right-to-left: the box is laid out left to right (`dir="ltr"`), since a picture has no
 * reading direction and the pan's scroll offsets then mean the same in every page; the
 * buttons sit at the end corner of the page's own direction.
 */
export function ZoomableImage(props: ZoomableImageProps) {
  // Keyed on the picture: a new one starts at fit and at the top. Remounting is React's
  // own reset of everything at once; an effect would reset it a render late, with the
  // last picture's pan applied to the new one for a frame.
  return <ZoomableImageView key={props.src ?? ""} {...props} />;
}

function ZoomableImageView({
  src,
  alt,
  fetcher,
  naturalWidth: naturalWidthProp,
  naturalHeight: naturalHeightProp,
  maxHeight = "75svh",
  maxZoom: maxZoomProp,
  labels: labelsProp,
  className,
  ...rest
}: ZoomableImageProps) {
  const labels = useKitLabels("zoomableImage", DEFAULT_ZOOMABLE_IMAGE_LABELS, labelsProp);
  const imageLabels = useKitLabels("authedImage", DEFAULT_AUTHED_IMAGE_LABELS);
  const fetched = useAuthedSrc(src, { fetcher });
  const { announce, regionProps } = useAnnounce();
  const hintId = useId();

  const [decoded, setDecoded] = useState<{ width: number; height: number } | null>(null);
  const [broken, setBroken] = useState(false);
  const failed = broken || fetched.status === "error";
  const given = naturalWidthProp && naturalHeightProp ? { width: naturalWidthProp, height: naturalHeightProp } : null;
  const natural = failed ? null : (decoded ?? given);
  // Nothing zooms before the picture's shape is known (the pan's limits are its height),
  // nor while there is no picture at all.
  const canZoom = natural !== null && fetched.src !== null;

  const [zoom, setZoom] = useState(1);
  const [atMax, setAtMax] = useState(false);
  const [pinching, setPinching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const zoomed = zoom > 1 + FIT_EPSILON;

  const boxRef = useRef<HTMLDivElement>(null);
  // The zoom the handlers act on: the state is a render behind a pinch's moves.
  const zoomRef = useRef(1);
  // The zoom the DOM is laid out at, written after every commit.
  const laidOutZoom = useRef(1);
  // The scroll a new zoom lands on, applied once the picture is laid out at that zoom —
  // set now, the browser would clamp it to the old, narrower picture.
  const pendingRef = useRef<ZoomView | null>(null);
  const frameRequest = useRef<number | null>(null);
  // Touch and pen pointers down on the box, by id, in box coordinates.
  const pointers = useRef(new Map<number, ZoomPoint>());
  const gesture = useRef<Gesture | null>(null);
  const tap = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastPointerType = useRef("");

  // After every commit, not only a changed zoom: a zoom that went 2 → 3 → 2 inside one
  // batch commits nothing new, and a scroll kept for it would wait for the next zoom. A
  // commit of some other state (the pinch flag, a lane ahead of the zoom's) leaves the
  // scroll for the commit that lays its zoom out.
  useLayoutEffect(() => {
    laidOutZoom.current = zoom;
    const box = boxRef.current;
    const pending = pendingRef.current;
    if (!box || !pending || pending.zoom !== zoom) return;
    pendingRef.current = null;
    box.scrollLeft = pending.left;
    box.scrollTop = pending.top;
  });

  useEffect(
    () => () => {
      if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
    },
    [],
  );

  const frameOf = (box: HTMLDivElement): ZoomFrame => ({
    width: box.clientWidth,
    height: box.clientHeight,
    ratio: natural ? natural.height / natural.width : 0,
  });
  const viewOf = (box: HTMLDivElement): ZoomView => {
    const pending = pendingRef.current;
    return { zoom: zoomRef.current, left: pending?.left ?? box.scrollLeft, top: pending?.top ?? box.scrollTop };
  };
  const ceiling = (box: HTMLDivElement) => maxZoomFor(natural?.width ?? 0, box.clientWidth, maxZoomProp);
  const pointIn = (box: HTMLDivElement, clientX: number, clientY: number): ZoomPoint => {
    const rect = box.getBoundingClientRect();
    return { x: clientX - rect.left - box.clientLeft, y: clientY - rect.top - box.clientTop };
  };

  /** Put `next` on screen: a new zoom renders and its scroll follows the layout; at the
   *  zoom already laid out (a pan) it is only a scroll. */
  const show = (box: HTMLDivElement, next: ZoomView) => {
    zoomRef.current = next.zoom;
    if (next.zoom === laidOutZoom.current) {
      pendingRef.current = null;
      box.scrollLeft = next.left;
      box.scrollTop = next.top;
    } else {
      pendingRef.current = next;
    }
    setZoom(next.zoom);
    setAtMax(next.zoom >= ceiling(box) - FIT_EPSILON);
  };

  const say = (box: HTMLDivElement, at: number) => {
    announce(
      at <= 1 + FIT_EPSILON ? labels.fitted : labels.level(zoomPercent(at, natural?.width ?? 0, box.clientWidth)),
    );
  };

  const stopEasing = () => {
    if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
    frameRequest.current = null;
  };

  /** A step: the buttons, the keys, a double-tap. Eased over {@link STEP_MS} — the eye
   *  follows where the picture went — unless the reader asked for less motion. Each
   *  frame is computed from the step's start, about the same point. Without `matchMedia`
   *  (jsdom) nothing paints, so it jumps, as the kit's exit animations do. */
  const stepTo = (target: number, at?: ZoomPoint) => {
    const box = boxRef.current;
    if (!box || !canZoom) return;
    stopEasing();
    const frame = frameOf(box);
    const from = viewOf(box);
    const to = clampZoom(target, ceiling(box));
    say(box, to);
    if (to === from.zoom) return;
    if (prefersReducedMotion(true) || typeof requestAnimationFrame !== "function") {
      show(box, zoomAt(frame, from, to, at));
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / STEP_MS);
      const eased = 1 - (1 - t) ** 3;
      show(box, zoomAt(frame, from, from.zoom + (to - from.zoom) * eased, at));
      frameRequest.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    frameRequest.current = requestAnimationFrame(tick);
  };
  const stepBy = (factor: number) => stepTo(zoomRef.current * factor);
  const toggleAt = (at: ZoomPoint) => {
    const box = boxRef.current;
    if (!box) return;
    stepTo(zoomRef.current > 1 + FIT_EPSILON ? 1 : detailZoom(natural?.width ?? 0, box.clientWidth, ceiling(box)), at);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Ctrl/⌘ with + − 0 is the browser's own page zoom, which a reader who needs larger
    // type relies on: never taken.
    if (!canZoom || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "+" || e.key === "=") stepBy(ZOOM_STEP);
    else if (e.key === "-") stepBy(1 / ZOOM_STEP);
    else if (e.key === "0") stepTo(1);
    else return;
    e.preventDefault();
  };

  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    // A touch screen's double tap is handled as one (below); the `dblclick` some phone
    // browsers synthesise from it would toggle straight back.
    const box = boxRef.current;
    if (!box || lastPointerType.current !== "mouse") return;
    toggleAt(pointIn(box, e.clientX, e.clientY));
  };

  const capture = (box: HTMLDivElement, pointerId: number) => {
    try {
      box.setPointerCapture?.(pointerId);
    } catch {
      // A pointer the browser no longer counts as down: nothing to capture.
    }
  };

  const startPan = (box: HTMLDivElement, pointerId: number, at: ZoomPoint) => {
    gesture.current = { kind: "pan", pointerId, from: viewOf(box), x: at.x, y: at.y };
    capture(box, pointerId);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget;
    lastPointerType.current = e.pointerType;
    if (!canZoom) return;
    stopEasing();
    const at = pointIn(box, e.clientX, e.clientY);
    if (e.pointerType === "mouse") {
      // A mouse drags a zoomed picture; at fit there is nothing beside it to reach.
      if (e.button !== 0 || zoomRef.current <= 1 + FIT_EPSILON) return;
      e.preventDefault();
      setDragging(true);
      startPan(box, e.pointerId, at);
      return;
    }
    // A primary pointer starts a new touch: no other finger is down, whatever a lost
    // `pointerup` left in the map.
    if (e.isPrimary) pointers.current.clear();
    pointers.current.set(e.pointerId, at);
    // Captured, so a finger that leaves the box still reports its moves and its lift;
    // the browser's own pan (at fit) cancels it as it would uncaptured.
    capture(box, e.pointerId);
    const down = [...pointers.current.entries()];
    if (down.length === 2) {
      const [[idA, a], [idB, b]] = down;
      tap.current = null;
      gesture.current = { kind: "pinch", ids: [idA, idB], start: { view: viewOf(box), a, b } };
      // `touch-none` from the second finger on, before any movement is delivered.
      setPinching(true);
      return;
    }
    if (down.length > 2) return;
    tap.current = { id: e.pointerId, x: at.x, y: at.y };
    // Zoomed, one finger pans the picture. At fit it is the browser's: the swipe that
    // scrolls the receipt and then the page.
    if (zoomRef.current > 1 + FIT_EPSILON) startPan(box, e.pointerId, at);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget;
    const now = gesture.current;
    const at = pointIn(box, e.clientX, e.clientY);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, at);
    const t = tap.current;
    if (t && t.id === e.pointerId && Math.hypot(at.x - t.x, at.y - t.y) > TAP_SLOP_PX) tap.current = null;
    if (!now) return;
    if (now.kind === "pinch") {
      const a = pointers.current.get(now.ids[0]);
      const b = pointers.current.get(now.ids[1]);
      if (a && b) show(box, pinchView(frameOf(box), now.start, a, b, ceiling(box)));
      return;
    }
    if (now.pointerId === e.pointerId) show(box, panView(frameOf(box), now.from, at.x - now.x, at.y - now.y));
  };

  const endPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget;
    const now = gesture.current;
    pointers.current.delete(e.pointerId);
    if (now?.kind === "pinch" && now.ids.includes(e.pointerId)) {
      setPinching(false);
      say(box, zoomRef.current);
      // Two fingers down to one is how a pinch normally becomes a pan: the finger still
      // down carries on from where the pinch left the picture (keksdose's pan seed was
      // lost there, until every finger was lifted and one touched again).
      const survivor = [...pointers.current.entries()][0];
      gesture.current = null;
      if (survivor) startPan(box, survivor[0], survivor[1]);
    } else if (now?.kind === "pan" && now.pointerId === e.pointerId) {
      gesture.current = null;
      setDragging(false);
    }

    const t = tap.current;
    if (!t || t.id !== e.pointerId) return;
    tap.current = null;
    // A cancel is the browser taking the touch over (a scroll), never a tap.
    if (e.type !== "pointerup") return;
    const last = lastTap.current;
    if (last && e.timeStamp - last.time < DOUBLE_TAP_MS && Math.hypot(t.x - last.x, t.y - last.y) < DOUBLE_TAP_PX) {
      lastTap.current = null;
      toggleAt({ x: t.x, y: t.y });
    } else {
      lastTap.current = { time: e.timeStamp, x: t.x, y: t.y };
    }
  };

  // Native listeners, because both must be able to cancel: React attaches `wheel` and
  // `touchmove` as passive, where `preventDefault` is ignored.
  const onWheel = useEffectEvent((e: WheelEvent) => {
    const box = boxRef.current;
    // A plain wheel scrolls — the box, then the page — as it would anywhere else.
    if (!box || !canZoom || !(e.ctrlKey || e.metaKey)) return;
    // Ctrl + wheel is also what a trackpad pinch arrives as; either way the browser
    // would zoom the whole page.
    e.preventDefault();
    stopEasing();
    const from = viewOf(box);
    const to = clampZoom(from.zoom * wheelZoomFactor(e.deltaY, e.deltaMode, box.clientHeight), ceiling(box));
    show(box, zoomAt(frameOf(box), from, to, pointIn(box, e.clientX, e.clientY)));
    // useAnnounce speaks the last of a burst: each call re-arms its timer.
    say(box, to);
  });
  const onTouchMove = useEffectEvent((e: TouchEvent) => {
    // Two fingers are the viewer's: without this the browser may still read them as a
    // scroll (or Safari as a page zoom) before `touch-none` lands.
    if (canZoom && e.touches.length > 1 && e.cancelable) e.preventDefault();
  });
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const wheel = (e: WheelEvent) => onWheel(e);
    const touchMove = (e: TouchEvent) => onTouchMove(e);
    box.addEventListener("wheel", wheel, { passive: false });
    box.addEventListener("touchmove", touchMove, { passive: false });
    return () => {
      box.removeEventListener("wheel", wheel);
      box.removeEventListener("touchmove", touchMove);
    };
  }, []);

  const boxStyle: CSSProperties = {
    maxHeight,
    // The box's height from the picture's shape: its fitted height, capped by
    // `maxHeight`, whatever the zoom. A scroll container's automatic minimum height is 0,
    // so the widened picture inside cannot stretch it.
    aspectRatio: natural ? `${natural.width} / ${natural.height}` : undefined,
  };

  return (
    <div {...rest} className={cn("relative", className)} data-zoomable-image="">
      {/* The box is the picture's focus stop and takes its keys: Tab reaches it, the
          arrows scroll it natively, + − 0 zoom. A region (ScrollArea's form) so it is
          announced by name on focus. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the region IS the control: its keys and double-click are the zoom's, as the arrows are its scroll's */}
      <div
        ref={boxRef}
        role="region"
        aria-label={labels.viewer(alt)}
        aria-describedby={hintId}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll box must be reachable by keyboard to be scrolled at all (WCAG 2.1.1), as ScrollArea's
        tabIndex={0}
        dir="ltr"
        data-zoomed={zoomed || undefined}
        onKeyDown={onKeyDown}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        style={boxStyle}
        className={cn(
          "relative w-full select-none overflow-auto rounded-md",
          THIN_SCROLLBAR_CLASS,
          // At rest the vertical swipe stays the browser's, so the page scrolls; off for a
          // pinch from its second finger, and while zoomed, where a drag pans the picture.
          zoomed || pinching ? "touch-none" : "touch-pan-y",
          canZoom && (zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"),
          // An OUTLINE, inset, as ScrollArea's: a ring would paint under the picture.
          "focus-visible:outline-focus focus-visible:-outline-offset-2 focus-visible:outline-brand",
        )}
      >
        <ImageStates
          fetched={fetched}
          alt={alt}
          labels={imageLabels}
          // Not clipped (the box scrolls what overflows); a skeleton's height until the
          // picture's shape is known.
          wrapperClassName={cn("w-full overflow-visible", !natural && !failed && "min-h-32")}
          className="block h-auto max-w-none"
          imgProps={{
            draggable: false,
            // The size the browser reserves before the bytes arrive, when the app gave it.
            width: natural?.width,
            height: natural?.height,
            style: { width: `${zoom * 100}%` },
          }}
          onLoad={(e: SyntheticEvent<HTMLImageElement>) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth > 0 && naturalHeight > 0) setDecoded({ width: naturalWidth, height: naturalHeight });
          }}
          onError={() => setBroken(true)}
        />
      </div>
      {canZoom && (
        // On the box that does not scroll, so they stay in reach wherever the picture is
        // scrolled to; the bottom end corner, where a thumb is.
        <ButtonGroup variant="gapped" elevated aria-label={labels.controls} className="absolute bottom-2 end-2">
          {/* `refused` at the ends, not `disabled`: the press that reaches fit is made
              with the focus on −, and a button turning disabled under it drops the focus
              to <body> (INP-4). */}
          <IconButton
            variant="overlay"
            size="sm"
            label={labels.zoomOut}
            refused={!zoomed}
            onClick={() => stepBy(1 / ZOOM_STEP)}
          >
            <ZoomOut />
          </IconButton>
          <IconButton variant="overlay" size="sm" label={labels.fit} refused={!zoomed} onClick={() => stepTo(1)}>
            <Shrink />
          </IconButton>
          <IconButton
            variant="overlay"
            size="sm"
            label={labels.zoomIn}
            refused={atMax}
            onClick={() => stepBy(ZOOM_STEP)}
          >
            <ZoomIn />
          </IconButton>
        </ButtonGroup>
      )}
      <span id={hintId} hidden>
        {labels.hint}
      </span>
      <span {...regionProps} />
    </div>
  );
}
