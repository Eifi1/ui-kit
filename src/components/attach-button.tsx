import { useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ComponentPropsWithoutRef, MouseEvent, ReactNode, Ref } from "react";
import { flushSync } from "react-dom";
import { Camera, Check, FolderOpen, Images, Paperclip, Scan } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { hasContent } from "../lib/presence";
import { mergeRefs } from "../lib/refs";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { useHasCamera } from "../hooks/use-has-camera";
import { useMediaQuery } from "../hooks/use-media-query";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import {
  matchesAccept,
  useFilePicker,
  type FilePickHandler,
  type FileRejection,
  type FileScreenOptions,
} from "../hooks/use-file-picker";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { DISABLED_REASON_LINE_CLASS } from "./field-parts";
import { FOCUS_RING } from "./focus-ring";
import { IconButton, type IconButtonProps } from "./icon-button";
import { Popover } from "./popover";
import { useCommitReason, type CommitScope } from "./write-lock";
import type { CameraFacing } from "./camera-capture";
import { useCameraFlow } from "./camera-flow";
import { DEFAULT_CAMERA_LABELS, type CameraLabels } from "./camera-labels";
import type { FileDropzoneProps } from "./file-dropzone";
import { DEFAULT_ATTACH_LABELS, type AttachLabels } from "./attach-button-labels";

export type { AttachLabels } from "./attach-button-labels";
export { DEFAULT_ATTACH_LABELS } from "./attach-button-labels";

/** A way in AttachButton offers, as a tile (phone sheet, inline row) or a menu row
 *  (desktop). Always in this order: Camera · Photos · Files · Screenshot. */
export type AttachTile = "camera" | "photos" | "files" | "screenshot";

/**
 * Where files came from, as `onFiles` and `onReject` are told: a tile, or — through
 * {@link attachDropzoneProps}, the same options on a `FileDropzone` — `"drop"` (a drop on
 * the zone, or its own Browse). `"paste"` is for a host that routes its own paste through
 * the same handler, so one switch covers every way in.
 */
export type AttachSource = AttachTile | "drop" | "paste";

/**
 * The options a pick is screened by and handed over with — one object for an
 * {@link AttachButton} and the `FileDropzone` round it ({@link attachDropzoneProps}), so a
 * drop and a tile pick are screened alike.
 */
export interface AttachOptions extends FileScreenOptions {
  /** The files that passed, and where they came from. Never called with an empty array.
   *  The camera's pages arrive ONCE, on its finish button, all together. */
  onFiles: (files: File[], source: AttachSource) => void;
  /** The files that did not, with the kit's translated sentence each (`filePicker`) —
   *  also spoken. */
  onReject?: (rejections: FileRejection[], source: AttachSource) => void;
  /** Several files per pick, several pages per camera opening (`maxFiles` caps both: the
   *  shot that reaches it finishes). */
  multiple?: boolean;
  /**
   * `"each"` (default): every file is screened on its own, the good ones are kept and the
   * rest refused — FileButton's rule. `"whole"`: one refused file refuses the whole pick
   * (keksdose's scan: the pages of one receipt go together or not at all), with one
   * sentence (`filePicker.rejectedPick`) — FileDropzone's `onPick`.
   */
  pick?: "each" | "whole";
}

type ButtonOwnProps = ComponentPropsWithoutRef<typeof Button>;

export interface AttachButtonProps
  extends
    AttachOptions,
    // `type` is fixed (a trigger never submits a form); the content is the kit's own
    // (paperclip + `labels.trigger`). Button's `refused` is not passed on: it would
    // refuse the trigger and not the tiles — `disabledReason` refuses every way in.
    Omit<ButtonOwnProps, "type" | "children" | "accept" | "capture" | "multiple" | "refused" | "onChange"> {
  /** Which ways in to offer, of those that apply (see {@link attachTiles}). Default: all
   *  four (Screenshot only with `onCaptureScreenshot`). The order is always the kit's. */
  sources?: readonly AttachTile[];
  /** Snapshot the app and return it as a File: given, a Screenshot tile. The sheet or menu
   *  closes BEFORE it is called, so it is not in the picture. */
  onCaptureScreenshot?: () => Promise<File | null>;
  /**
   * `"sheet"` (default): one trigger — a bottom sheet of tiles on a phone, a menu at the
   * button on a desktop. `"inline"`: the tiles as a row of buttons in place, one tap each
   * (keksdose's scan page, inside a `FileDropzone`'s `renderBody`, so a desktop still
   * drops). Either way, where only one way in applies there is nothing to choose: the
   * trigger (or the one button) opens it directly.
   */
  layout?: "sheet" | "inline";
  /** The viewfinder's options, as CameraButton has them: the file name before the
   *  timestamp (default `"photo"`), which camera (default the back one), its words. */
  camera?: { fileName?: string; facing?: CameraFacing; labels?: LabelOverride<CameraLabels> };
  /** Busy — the upload is in flight: Button's spinner and `aria-busy` (never the native
   *  `disabled`, which would drop the focus), and nothing opens. */
  pending?: boolean;
  /** Why nothing can be attached: Button's `disabledReason` on the trigger (or on every
   *  inline tile, the reason said once under the row) — focusable, nothing opens, and a
   *  pick or a camera page that arrives late is refused too. Wins over `disabled`. */
  disabledReason?: ReactNode;
  /** The pick COMMITS (an upload on hand-over): under a locked `WriteLockProvider` it
   *  takes the `disabledReason` path with the lock's reason, as FileButton's does. */
  commit?: CommitScope;
  /** The trigger as an icon button: the paperclip alone, `labels.trigger` its name and
   *  tooltip. `layout="sheet"` only. */
  iconOnly?: boolean;
  /** Per-instance overrides of the `attach` label namespace. */
  labels?: LabelOverride<AttachLabels>;
  /** The trigger `<button>` (`layout="sheet"`). */
  ref?: Ref<HTMLButtonElement>;
}

/* ── Which tiles ─────────────────────────────────────────────────────────── */

/** Image extensions an `accept` may name instead of a MIME type. */
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
  ".bmp",
  ".tif",
  ".tiff",
  ".svg",
]);

const isImageToken = (token: string) => token.startsWith("image/") || IMAGE_EXTENSIONS.has(token);

/** What the viewfinder hands over, to ask `accept` whether a photo may come in at all. */
const PHOTO_PROBE = () => new File([], "photo.jpg", { type: "image/jpeg" });

/** One tile: which, and what its input's `accept` attribute says (camera, screenshot: unused). */
export interface AttachTileSpec {
  tile: AttachTile;
  accept: string;
}

/**
 * @internal Which tiles apply, and each picker's `accept` — the kit's derivation, from
 * keksdose's input to the draft (2026-11-16, its point 1 and 2):
 *
 * - **Chromium decides by `accept`.** On Android it offers its camera for any `accept`
 *   with an `image/` type and skips its own chooser only when EVERY type is `image/` or
 *   `video/` (an empty `accept` counts as images). So on a touch screen (coarse pointer)
 *   Photos asks for the image subset of `accept` (the gallery), and Files for the rest
 *   (the document picker) — each hidden when its subset is empty. An empty `accept`
 *   takes anything: Photos asks for `image/*`, Files for anything.
 * - **On a desktop (fine pointer) Photos is Files**: one OS dialog either way, so Photos
 *   goes and Files takes the whole `accept` — unless `sources` leaves Files out, when
 *   Photos stays (images only, as asked).
 * - **Camera** where a JPEG may come in (the viewfinder's photos are `image/jpeg`) and
 *   {@link useHasCamera} does not positively say there is none.
 * - **Screenshot** with a capture to call.
 *
 * Screening is not this: every tile's pick is screened against the WHOLE `accept`, so a
 * PDF chosen through the gallery's "Browse" is still taken where `accept` takes it.
 */
export function attachTiles({
  accept,
  sources,
  hasCamera,
  coarse,
  screenshot,
}: {
  accept?: string;
  sources?: readonly AttachTile[];
  hasCamera: boolean;
  coarse: boolean;
  screenshot: boolean;
}): AttachTileSpec[] {
  const wanted = new Set<AttachTile>(sources ?? ["camera", "photos", "files", "screenshot"]);
  const tokens = (accept ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const anything = tokens.length === 0;
  const images = tokens.filter(isImageToken);
  const others = tokens.filter((t) => !isImageToken(t));
  const photosAccept = anything ? "image/*" : images.join(",");
  const filesAccept = coarse ? others.join(",") : tokens.join(",");
  const tiles: AttachTileSpec[] = [];
  if (wanted.has("camera") && hasCamera && matchesAccept(PHOTO_PROBE(), accept))
    tiles.push({ tile: "camera", accept: photosAccept });
  const files = wanted.has("files") && (anything || (coarse ? others.length > 0 : true));
  const photos = wanted.has("photos") && (anything || images.length > 0) && (coarse || !files);
  if (photos) tiles.push({ tile: "photos", accept: photosAccept });
  if (files) tiles.push({ tile: "files", accept: filesAccept });
  if (wanted.has("screenshot") && screenshot) tiles.push({ tile: "screenshot", accept: "" });
  return tiles;
}

/**
 * The {@link AttachOptions} as a `FileDropzone`'s props, so the zone an inline
 * AttachButton sits in screens a drop as the tiles screen a pick: the same `accept`,
 * `maxSize`, `maxFiles`, `isValid`, `multiple` and `pick`, and `onFiles(files, "drop")`.
 *
 * ```tsx
 * const options: AttachOptions = { accept, multiple: true, maxFiles: 10, pick: "whole", onFiles, onReject };
 * <FileDropzone {...attachDropzoneProps(options)} renderBody={() => <AttachButton {...options} layout="inline" />} />
 * ```
 *
 * One difference the zone's own rule makes: given `isValid`, a FileDropzone does not
 * re-check `accept`, so here `isValid` is handed over with the `accept` check folded in
 * — a file of the wrong type is refused with `invalidMessage` (or `rejectedInvalid`)
 * rather than the type sentence.
 */
export function attachDropzoneProps(
  options: AttachOptions,
): Pick<
  FileDropzoneProps,
  | "accept"
  | "multiple"
  | "maxSize"
  | "maxFiles"
  | "isValid"
  | "invalidMessage"
  | "onFilesSelected"
  | "onReject"
  | "onPick"
> {
  const { accept = "", multiple, maxSize, maxFiles, isValid, invalidMessage, onFiles, onReject, pick } = options;
  return {
    accept,
    multiple,
    maxSize,
    maxFiles,
    isValid: isValid ? (file) => matchesAccept(file, accept) && isValid(file) : undefined,
    invalidMessage,
    onFilesSelected: (files) => onFiles(files, "drop"),
    onReject: onReject ? (rejections) => onReject(rejections, "drop") : undefined,
    onPick: pick === "whole" ? wholePick : undefined,
  };
}

/** `pick="whole"`: one refusal refuses the pick (FileDropzone's `onPick` contract). */
const wholePick: FilePickHandler = (_accepted, rejected) => (rejected.length === 0 ? undefined : false);

const TILE_ICON: Record<AttachTile, LucideIcon> = {
  camera: Camera,
  photos: Images,
  files: FolderOpen,
  screenshot: Scan,
};

/** A phone sheet's tile: icon over word, a 44 px+ target (it is 72 px tall at Normal). */
const SHEET_TILE = cn(
  "flex min-h-18 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-2 py-3",
  "text-center text-sm break-words text-primary hover:bg-hover active:bg-active",
  FOCUS_RING,
);

/* ── AttachButton ────────────────────────────────────────────────────────── */

/**
 * One way in for attachments (0.66; Marcel 2026-11-16, the AttachButton draft): the
 * camera, the photos, the files and — in feedback — a screenshot, behind one paperclip.
 *
 * The parts were the kit's already — {@link CameraButton}'s viewfinder, FileButton's
 * screening and sentences, the feedback field's screenshot — and every app assembled its
 * own: keksdose's receipt link (a paperclip that opened the file picker only), its scan
 * page, its support composer. Here they are assembled once:
 *
 * - **Phone** ({@link usePhoneLayout}): a bottom sheet — a grab handle, the title, ✕, and
 *   the tiles in one row. Escape, Back and the scrim close it; the focus goes back to the
 *   button.
 * - **Desktop**: a small menu at the button with the same entries. Dropping stays a
 *   `FileDropzone`'s job ({@link attachDropzoneProps}).
 * - **One way in applies** (a desktop without a camera, `accept` only PDFs): no chooser,
 *   the button opens that picker directly.
 * - **Every way in is screened** like a FileButton pick (`accept` — the whole of it, see
 *   {@link attachTiles} — `maxSize`, `maxFiles`, `isValid`, `pick`), and refusals reach
 *   `onReject` with the kit's sentences.
 * - **The camera's pages come together**: `multiple` keeps the viewfinder up, counts the
 *   pages against `maxFiles`, and `onFiles(pages, "camera")` fires once, on its finish
 *   button. Where the page cannot stream (an insecure context, a denied permission) the
 *   phone's camera app is the camera, one photo per trip — and the kit asks "another
 *   page?" between trips, so it still fires once.
 */
export function AttachButton(props: AttachButtonProps) {
  const {
    onFiles,
    onReject,
    accept,
    maxSize,
    maxFiles,
    isValid,
    invalidMessage,
    multiple = false,
    pick = "each",
    sources,
    onCaptureScreenshot,
    layout = "sheet",
    camera: cameraOptions,
    pending = false,
    disabled,
    disabledReason: ownDisabledReason,
    commit,
    iconOnly = false,
    labels: labelsProp,
    variant,
    size,
    className,
    onClick,
    ref,
    ...rest
  } = props;
  const labels = useKitLabels("attach", DEFAULT_ATTACH_LABELS, labelsProp);
  const cameraLabels = useKitLabels("camera", DEFAULT_CAMERA_LABELS, cameraOptions?.labels);
  const hasCamera = useHasCamera();
  const coarse = useMediaQuery("(pointer: coarse)", false);
  const phone = usePhoneLayout();
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);
  const [capturing, setCapturing] = useState(false);
  const busy = pending || capturing;
  // What takes nothing: busy, disabled, or locked with a reason (FileButton's rule). It
  // reaches the screening too, so a pick or a camera page that lands after the lock
  // (a late `change`, the viewfinder's finish) is refused as well.
  const refusing = Boolean(disabled) || busy || locked;

  const tiles = attachTiles({ accept, sources, hasCamera, coarse, screenshot: Boolean(onCaptureScreenshot) });

  // ONE screening for every way in, against the whole `accept`: the tiles' inputs narrow
  // what the dialog offers, never what is taken. Which way the files came is noted just
  // before the synchronous `take`, so `onFiles` can say it.
  const source = useRef<AttachSource>("files");
  const screen = useFilePicker({
    accept,
    maxSize,
    maxFiles,
    isValid,
    invalidMessage,
    multiple,
    onPick: pick === "whole" ? wholePick : undefined,
    onFiles: (files) => onFiles(files, source.current),
    onReject: onReject ? (rejections) => onReject(rejections, source.current) : undefined,
    disabled: refusing,
  });
  const deliver = (from: AttachSource, files: File[]) => {
    source.current = from;
    screen.take(files);
  };

  const photosInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);

  // The camera app's pages, where the viewfinder cannot stream and `multiple` asks for
  // several: one photo per trip, kept here between trips, handed over together. `null`
  // when no such scan is under way.
  const [trips, setTrips] = useState<File[] | null>(null);
  const finishTrips = (pages: File[]) => {
    setTrips(null);
    if (pages.length > 0) deliver("camera", pages);
  };
  const tookTrip = (photo: File) => {
    if (!multiple) {
      deliver("camera", [photo]);
      return;
    }
    const pages = [...(trips ?? []), photo];
    if (maxFiles !== undefined && pages.length >= maxFiles) finishTrips(pages);
    else setTrips(pages);
  };

  const cameraFlow = useCameraFlow({
    multiple,
    maxFiles,
    facing: cameraOptions?.facing ?? "environment",
    fileName: cameraOptions?.fileName,
    labels: cameraOptions?.labels,
    busy: pending,
    onPhotos: (photos) => deliver("camera", photos),
    onUnavailable: (taken) => {
      // What the viewfinder took stays the user's: the first pages of the scan, with the
      // camera app for the rest (one photo, without `multiple`, is handed over now).
      if (multiple) setTrips(taken);
      else if (taken.length > 0) deliver("camera", taken);
      captureInput.current?.click();
    },
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /** Run one tile. `close` shuts the chooser first — synchronously, so a screenshot does
   *  not show it and a picker opens from the same tap. */
  const run = (tile: AttachTile, close?: () => void) => {
    if (refusing) return;
    if (tile === "screenshot") {
      if (close) flushSync(close);
      const capture = onCaptureScreenshot;
      if (!capture) return;
      setCapturing(true);
      // `deliver` is this tap's: its screening was not yet held by the capture's own
      // `capturing`, which only keeps a second tap from starting another.
      void capture()
        .then((file) => {
          if (file) deliver("screenshot", [file]);
        })
        .finally(() => setCapturing(false));
      return;
    }
    close?.();
    if (tile === "camera") {
      if (!cameraFlow.start()) captureInput.current?.click();
    } else if (tile === "photos") photosInput.current?.click();
    else filesInput.current?.click();
  };

  const fromInput = (from: AttachSource, e: ChangeEvent<HTMLInputElement>) => {
    // Copy BEFORE the reset: `files` is a live view of the input's value.
    const picked = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = "";
    if (picked.length === 0) return;
    if (from === "camera") tookTrip(picked[0]);
    else deliver(from, picked);
  };
  const tileAccept = (tile: AttachTile) => tiles.find((t) => t.tile === tile)?.accept ?? "";
  const hidden = (
    <>
      {/* `hidden`, out of the Tab order and the tree: the tiles are the way in. One per
          way in, each with its own `accept` — the gallery and the document picker are two
          different dialogs on Android — and the camera app's, which is never `multiple`
          (Chrome drops `capture` from an input that says `multiple`). */}
      <input
        ref={photosInput}
        type="file"
        accept={tileAccept("photos") || "image/*"}
        multiple={multiple}
        disabled={refusing}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => fromInput("photos", e)}
      />
      <input
        ref={filesInput}
        type="file"
        accept={tileAccept("files") || undefined}
        multiple={multiple}
        disabled={refusing}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => fromInput("files", e)}
      />
      <input
        ref={captureInput}
        type="file"
        accept={tileAccept("camera") || "image/*"}
        capture={cameraOptions?.facing ?? "environment"}
        disabled={refusing}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => fromInput("camera", e)}
      />
      {screen.element}
      {cameraFlow.element}
      {trips !== null && trips.length > 0 && (
        <BottomSheet
          title={cameraLabels.title}
          closeLabel={labels.close}
          // ✕, Escape and Back discard the pages, as the viewfinder's ✕ does.
          onClose={() => setTrips(null)}
          opener={() => triggerRef.current}
          padBottom="1rem"
          data-attach-pages=""
        >
          <div className="space-y-3 px-4 pt-1">
            <p aria-live="polite" className="text-sm text-secondary">
              {cameraLabels.taken(trips.length)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => captureInput.current?.click()}>
                <Camera aria-hidden className="size-4" />
                {labels.anotherPage}
              </Button>
              <Button type="button" onClick={() => finishTrips(trips)}>
                <Check aria-hidden className="size-4" />
                {cameraLabels.done(trips.length)}
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );

  const reasonId = useId();

  if (tiles.length === 0) return hidden;

  const iconClass = size === "sm" ? "size-3.5" : "size-4";

  /* ── inline: the tiles as buttons, in place ── */
  if (layout === "inline") {
    return (
      <div role="group" aria-label={labels.title} data-attach="" className={cn("min-w-0", className)}>
        <div className="flex flex-wrap gap-2">
          {tiles.map(({ tile }) => {
            const Icon = TILE_ICON[tile];
            return (
              <Button
                key={tile}
                type="button"
                variant={variant ?? "secondary"}
                size={size}
                data-attach-tile={tile}
                disabled={disabled}
                pending={tile === "screenshot" ? capturing || pending : pending}
                // Refused with the reason said once, under the row (and named by each).
                refused={locked || undefined}
                aria-describedby={locked ? reasonId : undefined}
                onClick={() => run(tile)}
              >
                <Icon aria-hidden className={iconClass} />
                {labels[tile]}
              </Button>
            );
          })}
        </div>
        {locked && (
          <span id={reasonId} data-slot="disabled-reason" className={DISABLED_REASON_LINE_CLASS}>
            {disabledReason}
          </span>
        )}
        {hidden}
      </div>
    );
  }

  /* ── sheet: one trigger ── */
  const direct = tiles.length === 1 ? tiles[0].tile : null;
  const menu = !direct && !phone;

  const triggerProps = {
    ...rest,
    variant,
    size,
    disabled,
    pending: busy,
    // Resolved here rather than passed on as `commit`: the tiles have to know it is
    // locked too, and one resolution keeps them from disagreeing.
    disabledReason: locked ? disabledReason : undefined,
    "aria-haspopup": direct ? undefined : ("dialog" as const),
    className,
    iconOnly,
    label: labels.trigger,
  };
  const press = (e: MouseEvent<HTMLButtonElement>, open: () => void) => {
    onClick?.(e);
    if (e.defaultPrevented || refusing) return;
    open();
  };

  if (menu) {
    return (
      <>
        <Popover
          width="14rem"
          aria-label={labels.title}
          className="p-1"
          // React carries a click out of a portal along the component tree: a row tapped
          // in this menu would reach a FileDropzone the button sits in and open its picker
          // (RowActions' menu stops it on the panel for the same reason).
          onClick={(e) => e.stopPropagation()}
          trigger={({ open, toggle, ref: popoverRef }) => (
            <AttachTrigger
              {...triggerProps}
              ref={ref}
              ownRef={triggerRef}
              anchorRef={popoverRef}
              aria-expanded={open}
              onClick={(e) => press(e, toggle)}
            />
          )}
        >
          {(close) => (
            <ul data-attach-menu="" className="space-y-0.5">
              {tiles.map(({ tile }) => {
                const Icon = TILE_ICON[tile];
                return (
                  <li key={tile}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      stretch
                      data-attach-tile={tile}
                      className="w-full justify-start text-start"
                      onClick={() => run(tile, close)}
                    >
                      <Icon aria-hidden className="size-4" />
                      {labels[tile]}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Popover>
        {hidden}
      </>
    );
  }

  return (
    <>
      <AttachTrigger
        {...triggerProps}
        ref={ref}
        ownRef={triggerRef}
        aria-expanded={direct ? undefined : sheetOpen}
        onClick={(e) => press(e, () => (direct ? run(direct) : setSheetOpen(true)))}
      />
      {sheetOpen && (
        <BottomSheet
          title={labels.title}
          closeLabel={labels.close}
          onClose={() => setSheetOpen(false)}
          opener={() => triggerRef.current}
          padBottom="1rem"
          data-attach-sheet=""
        >
          <div
            className="grid gap-2 px-4 pt-1"
            style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
          >
            {tiles.map(({ tile }) => {
              const Icon = TILE_ICON[tile];
              return (
                <button
                  key={tile}
                  type="button"
                  data-attach-tile={tile}
                  className={SHEET_TILE}
                  onClick={() => run(tile, () => setSheetOpen(false))}
                >
                  <Icon aria-hidden className="size-6" />
                  {labels[tile]}
                </button>
              );
            })}
          </div>
        </BottomSheet>
      )}
      {hidden}
    </>
  );
}

/** The sheet layout's trigger: the paperclip and the word, or the paperclip alone. Its own
 *  component so the refs it is handed (the caller's, the Popover's anchor, AttachButton's
 *  own for giving the focus back) are merged once, not on every render of the button. */
function AttachTrigger({
  iconOnly,
  label,
  size,
  ref,
  anchorRef,
  ownRef,
  ...rest
}: Omit<ButtonOwnProps, "type" | "children"> & {
  iconOnly: boolean;
  label: string;
  ref?: Ref<HTMLButtonElement>;
  anchorRef?: Ref<HTMLButtonElement>;
  ownRef?: Ref<HTMLButtonElement>;
}) {
  const merged = useMemo(() => mergeRefs(ref, anchorRef, ownRef), [ref, anchorRef, ownRef]);
  if (iconOnly) {
    return (
      <IconButton {...(rest as IconButtonProps)} ref={merged} type="button" size={size ?? "md"} label={label}>
        <Paperclip />
      </IconButton>
    );
  }
  return (
    <Button {...rest} ref={merged} type="button" size={size}>
      <Paperclip aria-hidden className={size === "sm" ? "size-3.5" : "size-4"} />
      {label}
    </Button>
  );
}
