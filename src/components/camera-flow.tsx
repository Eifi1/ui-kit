import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LabelOverride } from "../i18n/kit-labels";
import { CameraCapture, type CameraFacing } from "./camera-capture";
import type { CameraLabels } from "./camera-labels";

/** @internal What {@link useCameraFlow} is told. */
export interface CameraFlowOptions {
  /** Several photos per opening: the viewfinder stays up and counts them, and they are
   *  handed over together on its finish button. */
  multiple: boolean;
  /** With `multiple`, the shot that reaches this finishes. */
  maxFiles?: number;
  facing: CameraFacing;
  fileName?: string;
  labels?: LabelOverride<CameraLabels>;
  /** The caller's upload is in flight: the viewfinder holds its shutter and ways out. */
  busy?: boolean;
  /** The photos of one opening, once — never empty. */
  onPhotos: (photos: File[]) => void;
  /** The viewfinder could not stream (a denied permission, no camera, a canvas that cannot
   *  draw): it has closed, and `taken` is what it took before that — the caller's to
   *  keep, and the camera app (the `capture` input) is next. Called inside the refusal
   *  that answered the tap, so an input clicked here may still open. */
  onUnavailable: (taken: File[]) => void;
}

/** @internal */
export interface CameraFlow {
  /** Open the viewfinder. `false` where this browser cannot stream at all (no
   *  `getUserMedia`: an insecure context) — the caller opens its `capture` input then,
   *  inside the same tap. */
  start: () => boolean;
  /** The viewfinder while it is open; render it anywhere (it portals). */
  element: ReactNode;
}

/**
 * @internal The camera's half of {@link CameraButton}, shared with AttachButton's Camera
 * tile (0.66): the viewfinder, the photos of one opening held in a ref, and `maxFiles`
 * counted per shot. Screening and what happens without a stream are the caller's —
 * CameraButton hands each camera-app photo over on its own, AttachButton keeps the pages
 * of one scan together.
 */
export function useCameraFlow({
  multiple,
  maxFiles,
  facing,
  fileName,
  labels,
  busy,
  onPhotos,
  onUnavailable,
}: CameraFlowOptions): CameraFlow {
  const [open, setOpen] = useState(false);
  // The photos of this opening, in a ref: each arrives from an encoding callback, and one
  // that reads a count from state can be a render behind the photo before it — the
  // state is only the number the viewfinder shows. `live` is whether the viewfinder is
  // still this caller's to feed: a photo encoded after it closed hands nothing over.
  const shots = useRef<File[]>([]);
  const live = useRef(false);
  const [shotCount, setShotCount] = useState(0);

  const start = () => {
    // Only the absence of `getUserMedia` is decided here (an insecure context); a denied
    // permission or a missing camera is the viewfinder's to find, with itself on screen.
    if (typeof navigator === "undefined" || typeof navigator.mediaDevices?.getUserMedia !== "function") return false;
    shots.current = [];
    live.current = true;
    setShotCount(0);
    setOpen(true);
    return true;
  };
  /** Close the viewfinder; hand back what it took. */
  const close = (): File[] => {
    const taken = shots.current;
    shots.current = [];
    live.current = false;
    setShotCount(0);
    setOpen(false);
    return taken;
  };
  const finish = () => {
    const taken = close();
    if (taken.length > 0) onPhotos(taken);
  };
  const capture = (photo: File) => {
    if (!live.current) return;
    shots.current = [...shots.current, photo];
    const full = maxFiles !== undefined && shots.current.length >= maxFiles;
    if (!multiple || full) finish();
    else setShotCount(shots.current.length);
  };

  const element = open ? (
    <CameraCapture
      shotCount={shotCount}
      busy={busy}
      facing={facing}
      fileName={fileName}
      labels={labels}
      onCapture={capture}
      onDone={multiple ? finish : undefined}
      onCancel={() => void close()}
      onUnavailable={() => onUnavailable(close())}
    />
  ) : null;

  return { start, element };
}
