import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, X } from "lucide-react";
import { DEFAULT_COMMON_LABELS, useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { takeEscape, useDismissLayer } from "../hooks/use-dismiss";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { Spinner } from "./spinner";
import { DEFAULT_CAMERA_LABELS, type CameraLabels } from "./camera-labels";

export type { CameraLabels } from "./camera-labels";
export { DEFAULT_CAMERA_LABELS } from "./camera-labels";

/** Which camera to ask for: the back one (`"environment"`), or the one facing the user. */
export type CameraFacing = "environment" | "user";

/**
 * Ask for more pixels than a photo of a document needs, and take what the device gives —
 * keksdose's constraints (invoices/camera-capture.tsx:21). Its scan pipeline keeps a long
 * edge of 1600 px, and 2560 clears that with room on a phone that has it, while staying an
 * `ideal` the browser may narrow rather than an `exact` it can refuse. `facingMode` is an
 * ideal for the same reason: a laptop with only a front camera opens that one instead of
 * failing the whole request.
 */
const constraints = (facing: CameraFacing): MediaStreamConstraints => ({
  video: { facingMode: { ideal: facing }, width: { ideal: 2560 }, height: { ideal: 1440 } },
  audio: false,
});

/** keksdose's JPEG quality for a frame: it is the ORIGINAL — nothing re-encodes it before
 *  the app's server sees it — so above a cropper's 0.85. */
const JPEG_QUALITY = 0.92;

export interface CameraCaptureProps {
  /** One photo, each time the shutter is pressed: the live frame as a JPEG `File` at the
   *  frame's own size, named `{fileName}-{timestamp}.jpg`. The viewfinder stays up — the
   *  caller closes it (unmounts it) when it has what it wanted. */
  onCapture: (file: File) => void;
  /** Leave with nothing: the ✕, Escape and the phone's Back. None of them while `busy`. */
  onCancel: () => void;
  /**
   * There is no stream to be had: no `navigator.mediaDevices` (an insecure context), a
   * permission denied, no camera, or a canvas the frame cannot be drawn on. The caller
   * closes the viewfinder and falls back to a file input with `capture`, which is where
   * the photo used to come from before this component — so nothing regresses. Read live:
   * an inline arrow is fine.
   */
  onUnavailable: () => void;
  /** Finish: shown, as `labels.done(shotCount)`, once `shotCount` is above 0. Leave it out
   *  for a camera that takes one photo and closes. */
  onDone?: () => void;
  /** Photos taken so far — the caller keeps them, this only counts (keksdose's receipt
   *  in several pages). Default 0. */
  shotCount?: number;
  /** The caller's upload is in flight: the shutter, the finish and every way out stop. */
  busy?: boolean;
  /** Which camera, as an `ideal`. Default `"environment"`. Read when the camera opens. */
  facing?: CameraFacing;
  /** The captured file's name before its timestamp. Default `"photo"`; keksdose's is
   *  `"receipt"`, which its review screen shows. */
  fileName?: string;
  /** Per-instance overrides of the `camera` label namespace. */
  labels?: LabelOverride<CameraLabels>;
}

/**
 * The camera, in the page: a full-screen viewfinder with a shutter — keksdose's
 * `CameraCapture` (invoices/camera-capture.tsx:64, live #292 round five), for every app.
 * Mounted is open; the caller unmounts it to close it.
 *
 * Five rounds of keksdose's live #292 went into the file input's `capture` attribute, and
 * the last one settled it: production served `accept="image/*" capture="environment"` with
 * no `multiple` — the shape every round had concluded was the fix — and Android Chrome
 * showed its Camera-or-Files sheet anyway (*"Still happening on my phone showing version
 * v0.4.47"*). `capture` is a HINT a browser is free to ignore, it says nothing when it has,
 * and a desktop ignores it outright and opens a file dialog. `getUserMedia` is not a hint:
 * it opens the camera or it rejects, and a rejection is something to act on —
 * `onUnavailable` hands the user to the `capture` input, so an insecure context, a denied
 * permission or a home-screen PWA that will not stream lands where the old button did. A
 * webcam is a camera on every device that has one.
 *
 * What a dialog owes the page is the kit's: Escape (as an Escape layer, so it closes this
 * and not the dialog behind it), a focus trap that starts on the CONTAINER (so an Enter
 * does not fire the shutter), no scrolling behind it, and the phone's Back closing it
 * instead of leaving the page. Not a `FullBleedDialog`: that is a surface panel with a
 * bordered header, and a viewfinder is black edge to edge, the shutter in the media
 * tokens (`IconButton variant="shutter"`), white on the picture in either theme.
 *
 * Portalled to `<body>`, out of whatever transformed or clipped box the button sits in —
 * and a click inside it stops there: React carries a portal's events up its own tree, and
 * a `FileDropzone` round the button (keksdose's Take photo sits in the zone's body) would
 * read a tap on the shutter as a tap on the zone and open the file picker.
 */
export function CameraCapture({
  onCapture,
  onCancel,
  onUnavailable,
  onDone,
  shotCount = 0,
  busy = false,
  facing = "environment",
  fileName = "photo",
  labels: labelsProp,
}: CameraCaptureProps) {
  const labels = useKitLabels("camera", DEFAULT_CAMERA_LABELS, labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Every way out but the finish button, and none of them while an upload is in flight:
  // the layer stays on the stack while `busy` (an Escape then does nothing, rather than
  // reaching the dialog behind), and a Back mid-upload spends its entry and leaves the
  // camera up, so a second Back still leaves. Both handlers are read live.
  const leave = () => {
    if (!busy) onCancel();
  };
  useDismissLayer(true, leave);
  useFocusTrap(dialogRef);
  useBodyScrollLock(true);
  useOverlayHistory(true, leave);

  // Held in a ref so the open-the-camera effect can depend on NOTHING: a caller passes an
  // inline arrow and re-renders on every photo it keeps, and a dependency on it would stop
  // the stream and ask for the permission again each time. Assigned in an effect, not in
  // render, which is what `react-hooks/refs` asks (useLongPress keeps its callback so).
  const bail = useRef(onUnavailable);
  useEffect(() => {
    bail.current = onUnavailable;
  });
  // Read once, when the camera opens; a `facing` that changes later is not a reason to
  // stop the stream and ask again.
  const facingAtOpen = useRef(facing);

  useEffect(() => {
    let cancelled = false;
    const media = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    // `typeof … === "function"`: `MediaDevices` declares `getUserMedia` non-optional, and
    // the runtime this guard is for is the one with no `mediaDevices` at all.
    if (typeof media?.getUserMedia === "function") {
      media.getUserMedia(constraints(facingAtOpen.current)).then(
        (stream) => {
          if (cancelled) {
            // Closed while the permission prompt was up: nothing else will ever stop
            // this stream, and a live track keeps the camera light on.
            for (const track of stream.getTracks()) track.stop();
            return;
          }
          streamRef.current = stream;
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            // `autoPlay` usually starts it; some browsers still want the call, and jsdom
            // has none. Neither outcome is worth a failure.
            try {
              void video.play()?.catch(() => {});
            } catch {
              /* not implemented (jsdom) */
            }
          }
          setReady(true);
        },
        () => {
          if (!cancelled) bail.current();
        },
      );
    } else {
      bail.current();
    }
    // ONE cleanup for both branches: a cleanup on only the branch that started something
    // is how a stream outlives its viewfinder.
    return () => {
      cancelled = true;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
    };
  }, []);

  // A frame is being encoded (a JPEG of a 2560 px frame takes a moment), and a tap
  // meanwhile is not a second photo: one encoding at a time, so photos arrive one by one,
  // in order. A ref, not a disabled shutter: a native `disabled` would drop the keyboard's
  // focus to <body> on every shot.
  const encoding = useRef(false);
  // An encoding that finishes after the viewfinder closed hands nothing over.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const shoot = () => {
    const video = videoRef.current;
    // `videoWidth` is 0 until the first frame has arrived; a shot then is a 0×0 photo.
    if (encoding.current || !video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    // A viewfinder that cannot be photographed is worse than none: the shutter would click
    // and nothing would happen. The file input is the honest answer.
    if (!context) {
      bail.current();
      return;
    }
    context.drawImage(video, 0, 0);
    encoding.current = true;
    canvas.toBlob(
      (blob) => {
        encoding.current = false;
        if (!mounted.current) return;
        if (!blob) {
          bail.current();
          return;
        }
        // The timestamp keeps the photos of one subject in the order they were taken.
        onCapture(new File([blob], `${fileName}-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the dialog
       container, per the APG dialog pattern: `onKeyDown` hands Escape to the layer stack for
       whatever inside holds focus, and `onClick` only keeps a tap inside from reaching the
       button's React ancestors (see above). */
    <div
      ref={dialogRef}
      data-kit-layer=""
      data-camera-capture=""
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      // For the focus trap, which focuses the container (see above).
      tabIndex={-1}
      // A backdrop, not a surface: black round a letterboxed frame in either theme, as a
      // camera app is — the scrim's rule in check-token-discipline, at full opacity, since
      // a page showing through round the picture is not a viewfinder.
      className="fixed inset-0 z-50 flex flex-col bg-black/100 outline-none"
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        takeEscape(e);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-media-ink">
        {/* Polite: after a shot this says how many there are now, and a screen reader
            should hear it without the shutter losing focus. */}
        <span className="min-w-0 text-sm" aria-live="polite">
          {shotCount > 0 ? labels.taken(shotCount) : labels.hint}
        </span>
        {/* The overlay disc keeps its contrast whatever the frame behind it shows. */}
        <IconButton variant="overlay" onClick={onCancel} disabled={busy} label={common.cancel}>
          <X />
        </IconButton>
      </div>

      {/* `object-contain`, never `cover`: a document is framed at its edges, and a preview
          that crops them shows something the photo will not be. */}
      <div className="relative min-h-0 flex-1">
        <video ref={videoRef} autoPlay muted playsInline className="size-full object-contain" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-media-ink">
            {/* Decorative: the words beside it are the status. */}
            <Spinner label={null} className="size-5" /> {labels.starting}
          </div>
        )}
      </div>

      {/* Three columns, the shutter in the middle one: centred on the SCREEN, not in what
          is left beside the finish button, and the finish button may wrap at a large text
          size rather than push the shutter off centre. Padded for a phone's home
          indicator, as FullBleedDialog's footer is. */}
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-3"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <span />
        {/* No tooltip over a viewfinder: the glyph is the shutter, the name is spoken. */}
        <IconButton
          variant="shutter"
          size="2xl"
          onClick={shoot}
          disabled={!ready || busy}
          label={labels.shutter}
          tooltip={false}
        >
          <Camera />
        </IconButton>
        <div className="flex justify-end">
          {onDone && shotCount > 0 && (
            <Button type="button" disabled={busy} onClick={onDone}>
              <Check aria-hidden className="size-4" />
              {labels.done(shotCount)}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
