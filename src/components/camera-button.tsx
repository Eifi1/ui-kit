import { useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { hasContent } from "../lib/presence";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { useHasCamera } from "../hooks/use-has-camera";
import { useFilePicker, type FileRejection, type FileScreenOptions } from "../hooks/use-file-picker";
import { Button } from "./button";
import { useCommitReason, type CommitScope } from "./write-lock";
import { CameraCapture, type CameraFacing } from "./camera-capture";
import { DEFAULT_CAMERA_LABELS, type CameraLabels } from "./camera-labels";

type ButtonOwnProps = ComponentPropsWithoutRef<typeof Button>;

export interface CameraButtonProps
  extends
    FileScreenOptions,
    // `type` is fixed to "button" (a camera trigger never submits a form); the content is
    // the button's own — the camera's word, or the picker's where there is no camera.
    Omit<ButtonOwnProps, "type" | "children" | "accept" | "capture" | "multiple"> {
  /** The photos, screened like a {@link FileButton}'s pick: `accept`, `maxSize`,
   *  `isValid`, and `maxFiles` under `multiple`. Never called with an empty array. */
  onFiles: (files: File[]) => void;
  /** The photos that did not pass, with a translated message each — also spoken. */
  onReject?: (rejections: FileRejection[]) => void;
  /**
   * Several photos in one hand-over: the viewfinder stays up after each shot, counts them,
   * and hands them over together on its finish button (keksdose's receipt in several
   * pages, feedback #141); ✕ discards them. With `maxFiles`, the shot that reaches it
   * finishes. Without a camera, the picker takes several files. The `capture` fallback
   * cannot: a camera app returns one photo per trip, and Chrome drops `capture` from an
   * input that also says `multiple` — so there each trip is one `onFiles`.
   */
  multiple?: boolean;
  /** What the pickers take. Default `"image/*"`. The viewfinder's photos are
   *  `image/jpeg`, so a narrower `accept` should keep that. */
  accept?: string;
  /** Which camera. Default `"environment"`, the back one. */
  facing?: CameraFacing;
  /**
   * Where the device has no camera ({@link useHasCamera}): `"picker"` (default) — the
   * button opens the file picker for photos, under `labels.choosePhoto`; `"hide"` — no
   * button at all, for a caller that has its own "Upload photo" beside it (kastlan's room
   * inspector, keksdose's upload box — *"If there is no device to take a photo can the
   * take photo button be hidden?"*). `useHasCamera` fails open, so this hides only where
   * the browser positively reported no camera.
   */
  noCamera?: "picker" | "hide";
  /** The viewfinder's file name before its timestamp. Default `"photo"`. */
  fileName?: string;
  /** Busy — the upload is in flight: Button's spinner and `aria-busy`, no picker, and an
   *  open viewfinder holds its shutter and its ways out. */
  pending?: boolean;
  /** Why the camera is not available: Button's `disabledReason`, with the pickers' half —
   *  focusable, the reason in the tooltip, nothing opens. Wins over `disabled`. */
  disabledReason?: ReactNode;
  /** The photo COMMITS (an upload that starts on hand-over): under a locked
   *  `WriteLockProvider` it takes the `disabledReason` path with the lock's reason, as
   *  {@link FileButton}'s `commit` does. */
  commit?: CommitScope;
  /** Per-instance overrides of the `camera` label namespace. */
  labels?: LabelOverride<CameraLabels>;
  /** The `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * "Take photo": the camera where the device has one, the file picker for photos where it
 * has none — and the photos handed to the app as `File`s (kastlan reuse audit 2026-11-02,
 * proposal 8).
 *
 * kastlan's handover writes it as two {@link FileButton}s per photo row — "Camera" with
 * `accept="image/*" capture="environment"` and "Upload photo" beside it
 * (room-inspector.tsx:208, unit-rooms-tab.tsx:96; defects-step.tsx:295 has the second
 * alone) — so on a desktop "Camera" opens a file dialog, and on Android it can open the
 * Camera-or-Files sheet, because `capture` is a hint. keksdose spent five rounds of live
 * #292 learning that and ended where this does:
 *
 *  - **No camera, no camera button** ({@link useHasCamera}, keksdose's use-has-camera.ts):
 *    the plain picker under its own word, or nothing (`noCamera="hide"`).
 *  - **A camera opens in the page** ({@link CameraCapture}, keksdose's camera-capture.tsx):
 *    `getUserMedia` opens it or refuses, where `capture` may be ignored without a word —
 *    and a desktop's webcam is a camera too.
 *  - **Refused, the old way still works**: no `mediaDevices` (an insecure context), a
 *    denied permission or a canvas that cannot draw falls back to the `capture` input —
 *    one file per trip, no `multiple` on it. The fallback opens from the refusal; if the
 *    permission prompt took longer than the browser's activation window it may not open,
 *    and the next tap — refused at once now — does.
 *
 * Every photo, from the viewfinder or either input, goes through the same screening as a
 * {@link FileButton}'s pick and reaches `onFiles`, or `onReject` with the reason.
 *
 * ```tsx
 * <CameraButton variant="ghost" size="sm" noCamera="hide" onFiles={([photo]) => upload(photo)} />
 * <FileButton variant="ghost" size="sm" accept="image/*" onFiles={([photo]) => upload(photo)}>
 *   <Upload aria-hidden className="size-3.5" /> {t("uploadPhoto")}
 * </FileButton>
 * ```
 */
export function CameraButton({
  onFiles,
  onReject,
  multiple = false,
  accept = "image/*",
  maxSize,
  maxFiles,
  isValid,
  invalidMessage,
  facing = "environment",
  noCamera = "picker",
  fileName,
  pending,
  disabled,
  disabledReason: ownDisabledReason,
  commit,
  labels: labelsProp,
  size,
  onClick,
  ref,
  ...rest
}: CameraButtonProps) {
  const labels = useKitLabels("camera", DEFAULT_CAMERA_LABELS, labelsProp);
  const hasCamera = useHasCamera();
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);
  // What takes no photo: busy, disabled, or locked with a reason (FileButton's rule).
  const refusing = Boolean(disabled || pending) || locked;
  const screening = { accept, maxSize, maxFiles, isValid, invalidMessage, onFiles, onReject, disabled: refusing };
  // The file picker: the button where there is no camera, and the screening of what the
  // viewfinder took (`take`, which honours `multiple` and `maxFiles`).
  const picker = useFilePicker({ ...screening, multiple });
  // The camera app, where the viewfinder cannot stream. Never `multiple` (see the prop).
  const cameraPicker = useFilePicker({ ...screening, capture: facing });
  const [open, setOpen] = useState(false);
  // The photos of this opening, in a ref: each arrives from an encoding callback, and one
  // that reads a count from state can be a render behind the photo before it — the
  // state is only the number the viewfinder shows. `live` is whether the viewfinder is
  // still this button's to feed: a photo encoded after it closed hands nothing over.
  const shots = useRef<File[]>([]);
  const live = useRef(false);
  const [shotCount, setShotCount] = useState(0);

  if (!hasCamera && noCamera === "hide") return null;

  const openCamera = () => {
    // Only the absence of `getUserMedia` is decided here (an insecure context); a denied
    // permission or a missing camera is the viewfinder's to find, with itself on screen.
    if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
      shots.current = [];
      live.current = true;
      setShotCount(0);
      setOpen(true);
    } else {
      cameraPicker.open();
    }
  };
  /** Close the viewfinder; with `handOver`, give the app what was taken. */
  const close = (handOver: boolean) => {
    const taken = shots.current;
    shots.current = [];
    live.current = false;
    setShotCount(0);
    setOpen(false);
    if (handOver && taken.length > 0) picker.take(taken);
  };
  const capture = (photo: File) => {
    if (!live.current) return;
    shots.current = [...shots.current, photo];
    const full = maxFiles !== undefined && shots.current.length >= maxFiles;
    if (!multiple || full) close(true);
    else setShotCount(shots.current.length);
  };

  // `Button` is a plain function component; under React 19 `ref` is an ordinary prop and
  // reaches the `<button>` through its `...rest` (FileButton's widening, for the same reason).
  const refProp = { ref } as { ref?: Ref<HTMLButtonElement> };
  const Icon = hasCamera ? Camera : ImagePlus;

  return (
    <>
      <Button
        {...rest}
        {...refProp}
        type="button"
        size={size}
        disabled={disabled}
        pending={pending}
        // Resolved here rather than passed on as `commit`: the pickers have to know it is
        // locked too, and one resolution keeps them from disagreeing.
        disabledReason={locked ? disabledReason : undefined}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || refusing) return;
          if (hasCamera) openCamera();
          else picker.open();
        }}
      >
        {/* The glyph's size beside the word, as the feedback attachment's buttons have it. */}
        <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-4"} />
        {hasCamera ? labels.takePhoto : labels.choosePhoto}
      </Button>
      {picker.element}
      {cameraPicker.element}
      {open && (
        <CameraCapture
          shotCount={shotCount}
          busy={pending}
          facing={facing}
          fileName={fileName}
          labels={labelsProp}
          onCapture={capture}
          onDone={multiple ? () => close(true) : undefined}
          onCancel={() => close(false)}
          onUnavailable={() => {
            // What was already taken is the user's — handed over, not dropped — and the
            // camera app is next. The input is mounted beside the button throughout, so it
            // can be clicked now, inside the refusal that answered the tap.
            close(true);
            cameraPicker.open();
          }}
        />
      )}
    </>
  );
}
