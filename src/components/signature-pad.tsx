import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Eraser, Keyboard, PenLine, Undo2 } from "lucide-react";
import { cn } from "../lib/cn";
import { useAnnounce } from "../hooks/use-announce";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, FIELD_INVALID, Input } from "./ui";

/**
 * A drawn signature, captured on a canvas and handed back as a PNG data URL.
 *
 * Kastlan wrote the first one (`features/handover/components/signature-pad.tsx`) for
 * the handover protocol, where tenant and inspector each sign on the same phone. This
 * keeps its contract — draw, get a PNG — and fixes what a copy per app would keep
 * getting wrong:
 *
 *  1. **Strokes are data, not pixels.** Each stroke is kept as a list of points, and
 *     the canvas is a VIEW of them. That is what lets a resize (a phone rotating
 *     mid-signature) keep the drawing instead of wiping it — setting `canvas.width`
 *     clears the bitmap, so a pixels-only pad loses everything — and what makes undo
 *     one `pop()`. The pixel buffer is sized to `devicePixelRatio`, so a stroke is
 *     sharp on a 3× screen rather than upscaled from a 1× bitmap.
 *  2. **Smooth, and pressure-aware.** Segments are quadratic curves through the
 *     midpoints between samples, so a fast stroke is a curve, not a polyline; a pen
 *     that reports pressure varies the width, a mouse or finger (whose `pressure` is a
 *     constant 0.5, or junk) draws at the base width.
 *  3. **Two inks.** On screen the ink is the computed `color` of the canvas, which is
 *     `--text-primary` — so it reads in the dark theme, where a hard-coded near-black
 *     stroke vanished into the surface. The exported PNG is re-rendered from the same
 *     strokes in `exportInk` (near-black by default) on a transparent background. A
 *     signature is a DOCUMENT artefact: it is printed on the protocol, shown on a white
 *     card, embedded in a PDF — none of which follow the signer's theme. Exporting
 *     the on-screen ink would have produced a pale-grey-on-transparent PNG for every
 *     dark-mode signer, invisible on white paper.
 *
 * **Accessibility.** A canvas has no content a screen reader or a keyboard can reach,
 * and no amount of ARIA changes that — drawing is a pointer act. What the pad does:
 * the canvas is `role="img"`, named by the visible label and described by the
 * instructions and by its state ("Nothing drawn yet" / "Signature drawn"), so a
 * screen-reader user knows what the box is and whether it holds anything; undo and
 * clear are real buttons, and their effect is announced. What it cannot do is let
 * someone sign without a pointer — hence `allowTypedName`, which offers a typed name
 * instead. It is OPT-IN, because whether a typed name counts as a signature is a
 * product and legal decision, not a UI one (Kastlan's handover accepts one; a flow
 * that needs a drawn mark would not). Where a drawn mark is not strictly required,
 * turn it on.
 */

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string the pad renders or speaks. */
export interface SignaturePadLabels {
  /** Visible label above the pad, and the canvas's accessible name. The `label`
   *  prop overrides it per instance. */
  label: string;
  /** Under the label, and part of the canvas's description. */
  instructions: string;
  /** Appended to the instructions when `allowTypedName` is on. */
  typedFallbackHint: string;
  /** The canvas's state for a screen reader. */
  empty: string;
  signed: string;
  undo: string;
  clear: string;
  /** Only rendered when `onSave` is given. */
  save: string;
  /** The mode switch (`allowTypedName`). */
  useTyped: string;
  useDrawn: string;
  /** Label of the typed-name field. */
  typedName: string;
  /** Live-region messages after the matching button. */
  cleared: string;
  undone: string;
  /** {@link SignatureView}: what it says when there is no signature to show. */
  viewEmpty: string;
  /** {@link SignatureView}: the saved PNG's alternative text. */
  viewDrawn: string;
  /** {@link SignatureView}: the accessible name of a typed-name signature. */
  viewTyped: (name: string) => string;
}

export const DEFAULT_SIGNATURE_PAD_LABELS: SignaturePadLabels = {
  label: "Signature",
  instructions: "Sign in the box with a mouse, your finger or a pen.",
  typedFallbackHint: "If you cannot draw, type your name instead.",
  empty: "Nothing drawn yet",
  signed: "Signature drawn",
  undo: "Undo last stroke",
  clear: "Clear",
  save: "Save signature",
  useTyped: "Type name instead",
  useDrawn: "Draw instead",
  typedName: "Full name",
  cleared: "Signature cleared",
  undone: "Last stroke removed",
  viewEmpty: "Not signed",
  viewDrawn: "Handwritten signature",
  viewTyped: (name) => `Signed with the typed name ${name}`,
};

/* ── Types ───────────────────────────────────────────────────────────────── */

/** How the value handed back was made. */
export interface SignatureDetail {
  method: "drawn" | "typed";
  /** The name as typed, when `method` is `"typed"` — the PNG shows it, but a host
   *  that stores a typed name as TEXT (Kastlan does) wants the string. */
  typedName?: string;
}

/** The imperative handle: `ref.current.toDataURL()` at submit time, for a form that
 *  does not want to mirror the value into state on every stroke. */
export interface SignaturePadHandle {
  /** Remove every stroke and the typed name. Fires `onChange(null)`. */
  clear: () => void;
  /** The PNG, rendered in `exportInk` — or `null` while nothing is signed. */
  toDataURL: () => string | null;
  isEmpty: () => boolean;
}

export interface SignaturePadProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /** Visible label; defaults to `labels.label`. */
  label?: ReactNode;
  /** Replaces `labels.instructions` for this instance (e.g. a legal note). */
  description?: ReactNode;
  /**
   * After every finished stroke, undo, clear and typed-name edit: the PNG, or `null`
   * once the pad is empty. Not called mid-stroke — encoding a PNG per pointer move
   * would stall the drawing on a phone.
   */
  onChange?: (dataUrl: string | null, detail: SignatureDetail) => void;
  /** Renders a Save button, enabled once something is signed. */
  onSave?: (dataUrl: string, detail: SignatureDetail) => void;
  disabled?: boolean;
  /** Paints the pad as wrong and sets `aria-invalid`. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** Message under the pad; implies `invalid` and is attached with
   *  `aria-describedby`, like the kit's other fields. */
  error?: ReactNode;
  /** Offer a typed name as an alternative to drawing. See the accessibility note. */
  allowTypedName?: boolean;
  /** Ink of the exported PNG. Default near-black, legible on white. */
  exportInk?: string;
  /** Fill behind the exported PNG. Default transparent. */
  exportBackground?: string;
  /** Base stroke width in CSS pixels. Default 2.5. */
  lineWidth?: number;
  /** Classes for the canvas — its height, chiefly (default `h-40`). */
  canvasClassName?: string;
  /** User-facing strings; see {@link SignaturePadLabels}. */
  labels?: Partial<SignaturePadLabels>;
}

/* ── Drawing ─────────────────────────────────────────────────────────────── */

interface Point {
  x: number;
  y: number;
  /** 0–1. A constant 0.5 for anything that is not a pen. */
  p: number;
}

type Stroke = Point[];

const DEFAULT_EXPORT_INK = "#111111";

// A handwriting face where the platform has one, `cursive` everywhere else. Only
// ever used to render a typed name onto the canvas.
const SCRIPT_FONT = `"Segoe Script", "Bradley Hand", "Brush Script MT", cursive`;

/** Width multiplier from pressure: 0.5 (the no-pen constant) is exactly 1. */
const pressureWidth = (p: number) => 0.4 + 1.2 * p;

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: (a.p + b.p) / 2 });

/**
 * Segment `i` (1 ≤ i < n) of a stroke: a quadratic from the midpoint before sample
 * `i - 1` to the midpoint after it, with the sample as the control point. The live
 * drawing and the full repaint both go through here, so a stroke looks the same
 * before and after a resize.
 */
function drawSegment(ctx: CanvasRenderingContext2D, pts: Stroke, i: number, scale: number, width: number) {
  const a = i === 1 ? pts[0] : mid(pts[i - 2], pts[i - 1]);
  const c = pts[i - 1];
  const b = mid(pts[i - 1], pts[i]);
  ctx.lineWidth = width * scale * pressureWidth((a.p + b.p) / 2);
  ctx.beginPath();
  ctx.moveTo(a.x * scale, a.y * scale);
  ctx.quadraticCurveTo(c.x * scale, c.y * scale, b.x * scale, b.y * scale);
  ctx.stroke();
}

/** The last half-segment, from the final midpoint to the final sample. Drawn once the
 *  stroke is finished — while drawing, the pen is still there and it would be redrawn
 *  on every move. A single tap is a dot. */
function drawTail(ctx: CanvasRenderingContext2D, pts: Stroke, scale: number, width: number) {
  const last = pts[pts.length - 1];
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(last.x * scale, last.y * scale, (width * scale * pressureWidth(last.p)) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const from = pts.length === 2 ? pts[0] : mid(pts[pts.length - 2], last);
  ctx.lineWidth = width * scale * pressureWidth(last.p);
  ctx.beginPath();
  ctx.moveTo(from.x * scale, from.y * scale);
  ctx.lineTo(last.x * scale, last.y * scale);
  ctx.stroke();
}

function prepare(ctx: CanvasRenderingContext2D, ink: string, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
}

/** A typed name, as large as fits, on the pad's baseline. */
function drawName(ctx: CanvasRenderingContext2D, name: string, w: number, h: number) {
  let size = Math.min(48, h * 0.45);
  ctx.font = `italic ${size}px ${SCRIPT_FONT}`;
  const room = w * 0.85;
  const measured = ctx.measureText(name).width;
  if (measured > room) {
    size = Math.max(12, (size * room) / measured);
    ctx.font = `italic ${size}px ${SCRIPT_FONT}`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, w / 2, h * 0.68);
}

/* ── The component ───────────────────────────────────────────────────────── */

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  {
    label,
    description,
    onChange,
    onSave,
    disabled,
    invalid,
    error,
    allowTypedName,
    exportInk = DEFAULT_EXPORT_INK,
    exportBackground,
    lineWidth = 2.5,
    canvasClassName,
    labels: labelsProp,
    className,
    ...rest
  },
  ref,
) {
  // Prop > <UiKitProvider> > English, like every labelled component in the kit.
  const labels = useKitLabels("signaturePad", DEFAULT_SIGNATURE_PAD_LABELS, labelsProp);
  const { announce, regionProps } = useAnnounce();
  const labelId = useId();
  const descId = useId();
  const statusId = useId();
  const errorId = useId();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  /**
   * What is on the pad lives in a ref, not in state: a pointer move must not
   * re-render, and `onChange` has to see the pad AFTER a change, from inside the
   * handler that made it — before React has rendered anything. The state below
   * mirrors the parts the markup needs (empty or not, which mode, the field's text).
   */
  const scene = useRef<{ strokes: Stroke[]; mode: "drawn" | "typed"; name: string }>({
    strokes: [],
    mode: "drawn",
    name: "",
  });
  const live = useRef<{ id: number; stroke: Stroke } | null>(null);
  /**
   * The canvas width, in CSS px, the stored points are relative to. Fixed by the
   * first stroke; a later resize scales the drawing UNIFORMLY by `width / refWidth`,
   * so a rotated phone shows the same signature larger or smaller, never stretched.
   */
  const refWidth = useRef(0);
  const [strokeCount, setStrokeCount] = useState(0);
  const [mode, setMode] = useState<"drawn" | "typed">("drawn");
  const [typedName, setTypedName] = useState("");

  const typed = mode === "typed";
  const isEmpty = typed ? typedName.trim() === "" : strokeCount === 0;

  // Everything the paint and export paths read that can change between renders, so
  // the observers below subscribe once instead of on every keystroke.
  const opts = useRef({ lineWidth, exportInk, exportBackground });
  useEffect(() => {
    opts.current = { lineWidth, exportInk, exportBackground };
  }, [lineWidth, exportInk, exportBackground]);

  const sceneEmpty = () => {
    const s = scene.current;
    return s.mode === "typed" ? s.name.trim() === "" : s.strokes.length === 0;
  };

  /** The whole scene, painted into `ctx` at `w`×`h` CSS px. */
  const paintInto = useCallback((ctx: CanvasRenderingContext2D, ink: string, w: number, h: number, dpr: number) => {
    const { lineWidth: width } = opts.current;
    const s = scene.current;
    prepare(ctx, ink, dpr);
    if (s.mode === "typed") {
      if (s.name.trim()) drawName(ctx, s.name.trim(), w, h);
      return;
    }
    const scale = refWidth.current > 0 ? w / refWidth.current : 1;
    for (const stroke of s.strokes) {
      for (let i = 1; i < stroke.length; i += 1) drawSegment(ctx, stroke, i, scale, width);
      drawTail(ctx, stroke, scale, width);
    }
    const pending = live.current?.stroke;
    if (pending) for (let i = 1; i < pending.length; i += 1) drawSegment(ctx, pending, i, scale, width);
  }, []);

  /** The ink on screen: the canvas's own computed `color`, i.e. `--text-primary`. */
  const screenInk = (canvas: HTMLCanvasElement) =>
    // Read as `color` rather than as the custom property: `--text-primary` is whatever
    // the palette wrote (a `color-mix()` in some presets), which a 2D context may not
    // parse; `color` has already been resolved by the browser.
    getComputedStyle(canvas).color || opts.current.exportInk;

  /** Repaint the visible canvas from the scene, in the theme's ink. */
  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintInto(ctx, screenInk(canvas), canvas.width / dpr, canvas.height / dpr, dpr);
  }, [paintInto]);

  /** Size the bitmap to the element × devicePixelRatio, then repaint. */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    // Assigning `width` clears the bitmap even when the value is unchanged, so only
    // when it moved — and the repaint puts the strokes back either way.
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    repaint();
  }, [repaint]);

  useLayoutEffect(() => {
    resize();
  }, [resize]);

  // A changed base width redraws what is already there.
  useEffect(() => {
    repaint();
  }, [lineWidth, repaint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanups: Array<() => void> = [];
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
      cleanups.push(() => ro.disconnect());
    }
    // The ink follows the theme, and the theme is a class (`.dark`) or inline
    // variables (the palette store) on <html> — neither of which tells a canvas.
    if (typeof MutationObserver !== "undefined") {
      const mo = new MutationObserver(() => repaint());
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
      cleanups.push(() => mo.disconnect());
    }
    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    if (mq?.addEventListener) {
      mq.addEventListener("change", repaint);
      cleanups.push(() => mq.removeEventListener("change", repaint));
    }
    return () => cleanups.forEach((fn) => fn());
  }, [resize, repaint]);

  /** The PNG, re-rendered off-screen in the export ink — `null` while empty. */
  const exportPng = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || sceneEmpty()) return null;
    const { exportInk: ink, exportBackground: bg } = opts.current;
    const dpr = window.devicePixelRatio || 1;
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, out.width, out.height);
    }
    paintInto(ctx, ink, out.width / dpr, out.height / dpr, dpr);
    return out.toDataURL("image/png");
  }, [paintInto]);

  const detail = (): SignatureDetail => {
    const s = scene.current;
    return s.mode === "typed" ? { method: "typed", typedName: s.name.trim() } : { method: "drawn" };
  };

  /** After every change to the scene: sync the markup's mirror, repaint, tell the host. */
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const commit = () => {
    const s = scene.current;
    setStrokeCount(s.strokes.length);
    setMode(s.mode);
    setTypedName(s.name);
    repaint();
    onChangeRef.current?.(exportPng(), detail());
  };

  const clearScene = () => {
    scene.current = { ...scene.current, strokes: [], name: "" };
    live.current = null;
    refWidth.current = 0;
    commit();
  };

  useImperativeHandle(ref, () => ({ clear: clearScene, toDataURL: exportPng, isEmpty: sceneEmpty }));

  /* ── Pointer ── */

  const toPoint = (e: { clientX: number; clientY: number; pressure: number; pointerType: string }, rect: DOMRect): Point => {
    const scale = refWidth.current > 0 && rect.width > 0 ? rect.width / refWidth.current : 1;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
      // Only a pen's pressure means anything: a mouse reports 0.5 while pressed and
      // touch hardware reports 0, 1 or noise.
      p: e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // One stroke at a time: a palm resting beside the pen is a second pointer.
    if (disabled || typed || live.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    canvas.setPointerCapture?.(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    if (refWidth.current === 0) refWidth.current = rect.width || 1;
    live.current = { id: e.pointerId, stroke: [toPoint(e, rect)] };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const pending = live.current;
    if (!pending || pending.id !== e.pointerId) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    // Coalesced events: the samples the browser merged into this one move. A fast
    // flick on a 120 Hz pen is otherwise a handful of long straight chords.
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const events = samples.length > 0 ? samples : [e];
    const ctx = canvas.getContext("2d");
    if (ctx) prepare(ctx, screenInk(canvas), window.devicePixelRatio || 1);
    const scale = refWidth.current > 0 && rect.width > 0 ? rect.width / refWidth.current : 1;
    for (const ev of events) {
      pending.stroke.push(toPoint(ev, rect));
      // Only the newest segment — a full repaint per move is O(ink) on every event.
      if (ctx) drawSegment(ctx, pending.stroke, pending.stroke.length - 1, scale, opts.current.lineWidth);
    }
  };

  const endStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const pending = live.current;
    if (!pending || pending.id !== e.pointerId) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    live.current = null;
    scene.current = { ...scene.current, strokes: [...scene.current.strokes, pending.stroke] };
    commit();
  };

  /* ── Buttons ── */

  const undo = () => {
    if (disabled || scene.current.strokes.length === 0) return;
    const strokes = scene.current.strokes.slice(0, -1);
    if (strokes.length === 0) refWidth.current = 0;
    scene.current = { ...scene.current, strokes };
    commit();
    announce(labels.undone);
  };

  const clear = () => {
    if (disabled || sceneEmpty()) return;
    clearScene();
    announce(labels.cleared);
  };

  const switchMode = () => {
    if (disabled) return;
    scene.current = { ...scene.current, mode: scene.current.mode === "drawn" ? "typed" : "drawn" };
    commit();
  };

  const onTypedChange = (name: string) => {
    scene.current = { ...scene.current, name };
    commit();
  };

  const save = () => {
    if (disabled) return;
    const png = exportPng();
    if (png) onSave?.(png, detail());
  };

  const hasError = error !== undefined && error !== null && error !== false && error !== "";
  const isInvalid = Boolean(invalid) || hasError;
  const describedBy = [descId, statusId, hasError ? errorId : null].filter(Boolean).join(" ");

  // `aria-disabled` rather than `disabled` on undo/clear: they disable THEMSELVES
  // (clear empties the pad, the last undo does too), and a natively disabled button
  // drops keyboard focus to <body> the moment it is activated.
  const softDisabled = "aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

  return (
    <div {...rest} className={cn("relative space-y-1.5", className)} data-empty={isEmpty || undefined}>
      <div>
        <span id={labelId} className="block text-sm font-medium text-[var(--text-primary)]">
          {label ?? labels.label}
        </span>
        <p id={descId} className="text-xs text-[var(--text-muted)]">
          {description ?? labels.instructions}
          {allowTypedName && !typed ? ` ${labels.typedFallbackHint}` : null}
        </p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          role="img"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          // No `aria-invalid` / `aria-disabled`: `img` supports neither. The error
          // reaches a screen reader through `aria-describedby`; the attributes below
          // are for styling and tests.
          data-invalid={isInvalid || undefined}
          data-disabled={disabled || undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          className={cn(
            // `touch-none` stops the page scrolling under a finger that is signing.
            "block h-40 w-full touch-none select-none rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]",
            typed || disabled ? "cursor-default" : "cursor-crosshair",
            disabled && "opacity-60",
            isInvalid && FIELD_INVALID,
            canvasClassName,
          )}
        />
        {/* The signing line — where people expect to sign. Decoration only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-[var(--border-strong)]"
        />
        <span id={statusId} className="sr-only">
          {isEmpty ? labels.empty : labels.signed}
        </span>
      </div>

      {typed && (
        <Input
          label={labels.typedName}
          value={typedName}
          autoComplete="name"
          disabled={disabled}
          onChange={(e) => onTypedChange(e.target.value)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!typed && (
          <Button
            type="button"
            variant="ghost"
            onClick={undo}
            aria-disabled={disabled || strokeCount === 0 || undefined}
            className={softDisabled}
          >
            <Undo2 aria-hidden="true" className="size-4" />
            {labels.undo}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={clear}
          aria-disabled={disabled || isEmpty || undefined}
          className={softDisabled}
        >
          <Eraser aria-hidden="true" className="size-4" />
          {labels.clear}
        </Button>
        {allowTypedName && (
          <Button
            type="button"
            variant="secondary"
            onClick={switchMode}
            disabled={disabled}
          >
            {typed ? <PenLine aria-hidden="true" className="size-4" /> : <Keyboard aria-hidden="true" className="size-4" />}
            {typed ? labels.useDrawn : labels.useTyped}
          </Button>
        )}
        {onSave && (
          <Button type="button" variant="brand" onClick={save} disabled={disabled || isEmpty} className="ms-auto">
            {labels.save}
          </Button>
        )}
      </div>

      {hasError && (
        <p id={errorId} className="mt-1 text-[11px] leading-tight text-[var(--danger)]">
          {error}
        </p>
      )}
      {/* Rendered from the start and never unmounted — see useAnnounce. */}
      <div {...regionProps} />
    </div>
  );
});
SignaturePad.displayName = "SignaturePad";

/* ── Read-only ───────────────────────────────────────────────────────────── */

export interface SignatureViewProps extends ComponentPropsWithoutRef<"figure"> {
  /** The saved PNG — what `SignaturePad` handed to `onChange`/`onSave`, as stored. */
  value?: string | null;
  /**
   * A signature given as a typed name (`detail.typedName`), for a host that stores the
   * text rather than its PNG. Rendered in the same script face the pad draws it in.
   * Ignored while `value` is set.
   */
  typedName?: string | null;
  /** Visible caption above the signature; defaults to `labels.label`. `null` hides it
   *  (the image keeps its alternative text) — for a signature block whose own heading
   *  already says whose signature it is. */
  label?: ReactNode;
  /**
   * The exported PNG is dark ink on a transparent ground (`exportInk`), which is
   * invisible on the dark theme's surface. By default the image is colour-inverted
   * under `.dark`, so the ink reads light; `false` keeps the pixels as stored — for a
   * PNG exported with its own `exportBackground`, which inverting would turn black.
   */
  adaptInk?: boolean;
  /** Classes for the frame — its height, chiefly (default `h-40`, the pad's). */
  frameClassName?: string;
  /** User-facing strings; see {@link SignaturePadLabels} (`view*`). */
  labels?: Partial<SignaturePadLabels>;
}

/**
 * A saved signature, shown — the read side of {@link SignaturePad}: the same frame and
 * signing line, none of the drawing chrome (no canvas, buttons, instructions or live
 * region). A separate component rather than a `readOnly` pad because there is nothing
 * of the pad to reuse: the pad's scene is STROKES, and a stored signature is a PNG
 * (or a name) that cannot be turned back into them.
 *
 * Kastlan's handover protocol, reopened after signing, is the case: two signatures
 * that must be visible, and must not look editable.
 */
export function SignatureView({
  value,
  typedName,
  label,
  adaptInk = true,
  frameClassName,
  labels: labelsProp,
  className,
  ...rest
}: SignatureViewProps) {
  const labels = useKitLabels("signaturePad", DEFAULT_SIGNATURE_PAD_LABELS, labelsProp);
  const name = typedName?.trim() ?? "";
  const kind = value ? "drawn" : name ? "typed" : "empty";
  const caption = label === undefined ? labels.label : label;
  const captionId = useId();
  const captioned = caption !== null && caption !== false;
  return (
    <figure
      // Named explicitly: the figcaption-to-figure name is not computed everywhere.
      aria-labelledby={captioned ? captionId : undefined}
      {...rest}
      className={cn("m-0 space-y-1.5", className)}
      data-empty={kind === "empty" || undefined}
    >
      {captioned && (
        <figcaption id={captionId} className="block text-sm font-medium text-[var(--text-primary)]">{caption}</figcaption>
      )}
      <div
        className={cn(
          "relative flex h-40 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-surface)]",
          frameClassName,
        )}
      >
        {kind === "drawn" && (
          <img
            src={value as string}
            alt={labels.viewDrawn}
            className={cn("relative max-h-full max-w-full object-contain", adaptInk && "dark:invert")}
          />
        )}
        {kind === "typed" && (
          // One name for the whole thing: the visible text alone would be read as a bare
          // name, with nothing saying it IS the signature.
          <span
            role="img"
            aria-label={labels.viewTyped(name)}
            className="relative max-w-[85%] truncate px-2 text-4xl italic text-[var(--text-primary)]"
            style={{ fontFamily: SCRIPT_FONT }}
          >
            {name}
          </span>
        )}
        {kind === "empty" && (
          <span className="relative text-xs text-[var(--text-muted)]">{labels.viewEmpty}</span>
        )}
        {/* The signing line, as on the pad. Decoration only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-[var(--border-strong)]"
        />
      </div>
    </figure>
  );
}
