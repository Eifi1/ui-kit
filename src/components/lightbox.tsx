import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, ZoomIn } from "lucide-react";

import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { useKitLabels } from "../i18n/kit-labels";
import { useAuthedSrc } from "../hooks/use-authed-src";
import type { AuthedFetcher } from "../hooks/use-authed-src";
import { FullBleedDialog } from "./full-bleed-dialog";
import { IconButton, buttonClasses } from "./ui";
import { ImageStates, DEFAULT_AUTHED_IMAGE_LABELS } from "./authed-image";
import { useAnchorDir } from "./use-anchor-dir";

/* ── The item both the grid and the lightbox show ────────────────────────── */

/** `image`: shown as a picture. `file`: anything a browser cannot put in an `<img>` —
 *  a floor plan uploaded as a PDF — shown as a file card with open and download. */
export type ImageItemKind = "image" | "file";

export interface ImageItem {
  /** React key. Defaults to `src`. */
  key?: string | number;
  /** The full-size file — what the lightbox shows and downloads. An API path when the
   *  component is given a `fetcher`. */
  src: string;
  /** A smaller rendition for the grid, when the server has one. Default: `src`. */
  thumbnailSrc?: string;
  /** Required: the picture's text alternative, and the open button's name. */
  alt: string;
  /** Shown under the thumbnail and at the foot of the lightbox. */
  caption?: ReactNode;
  /** The file's MIME type, when known (`"application/pdf"`). Decides {@link kind}. */
  mimeType?: string;
  /** Say it outright. Default: from {@link mimeType}, else from the file extension in
   *  `src`, else — for a fetched file — from the type the server sent back. */
  kind?: ImageItemKind;
  /** The name a download is saved under, and a file card's heading. */
  fileName?: string;
}

const FILE_EXTENSION = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|zip|txt|csv|rtf)(?:[?#]|$)/i;

/** What an item is, from what is known about it WITHOUT fetching it — see
 *  {@link ImageItem.kind}. `fetchedType` is the blob's type once it is in. */
export function imageItemKind(item: ImageItem, fetchedType?: string): ImageItemKind {
  if (item.kind) return item.kind;
  if (item.mimeType) return item.mimeType.startsWith("image/") ? "image" : "file";
  if (FILE_EXTENSION.test(item.src)) return "file";
  if (fetchedType && !fetchedType.startsWith("image/")) return "file";
  return "image";
}

/* ── Labels ──────────────────────────────────────────────────────────────── */

export interface LightboxLabels {
  /** The dialog's accessible name. */
  dialog: string;
  close: string;
  previous: string;
  next: string;
  /** The visible counter: "3 / 7". */
  counter: (index: number, count: number) => string;
  /** What a screen reader hears on each page turn: "Image 3 of 7". The alt follows. */
  position: (index: number, count: number) => string;
  download: string;
  /** The zoom toggle (a pressed/not-pressed button — its name does not change). */
  zoom: string;
  /** A file card's note: the file has no picture to show. */
  noPreview: string;
  /** A file card's link to the browser's own viewer (a PDF opens in its viewer). */
  openInNewTab: string;
}

export const DEFAULT_LIGHTBOX_LABELS: LightboxLabels = {
  dialog: "Image viewer",
  close: "Close",
  previous: "Previous image",
  next: "Next image",
  counter: (index, count) => `${index} / ${count}`,
  position: (index, count) => `Image ${index} of ${count}`,
  download: "Download",
  zoom: "Zoom",
  noPreview: "No preview available for this file",
  openInNewTab: "Open in new tab",
};

/* ── The component ───────────────────────────────────────────────────────── */

export interface LightboxProps {
  open: boolean;
  /** The X, Escape and the Back gesture all call this. */
  onClose: () => void;
  items: readonly ImageItem[];
  /** The item on screen (0-based). Controlled, so the grid — or a URL — can own it. */
  index: number;
  onIndexChange: (index: number) => void;
  /** The app's authenticated GET (see {@link useAuthedSrc}); left out, `src` is
   *  loaded by the browser as usual. */
  fetcher?: AuthedFetcher | null;
  /** Previous from the first goes to the last, and next from the last to the first.
   *  Default `false`: the buttons at the ends are disabled, which says where the set
   *  ends. */
  loop?: boolean;
  /** Double-click (or double-tap) the picture, or the zoom button, to see it at full
   *  size and pan by scrolling. Default `true`. Pinch zoom is the browser's own. */
  zoom?: boolean;
  /** A download link in the header. Default `true`. */
  download?: boolean;
  /**
   * Download through the app instead — kastlan's floor plans have `openDocument(id)`,
   * which knows the stored file name. Replaces the link with a button that calls this.
   */
  onDownload?: (item: ImageItem, index: number) => void;
  /** Push a history entry so Back closes the viewer. Default `true`; see
   *  `FullBleedDialog`'s `backCloses` for when to turn it off. */
  backCloses?: boolean;
  labels?: Partial<LightboxLabels>;
}

/** Swipes shorter than this are taps, and a drag that is mostly vertical is a scroll. */
const SWIPE_MIN_PX = 50;

/**
 * A full-screen viewer for a set of images (and files that are not images).
 *
 * Built on {@link FullBleedDialog} rather than beside it, so the viewer has the kit's
 * one implementation of everything an overlay owes the page: the focus trap, Escape,
 * the Back gesture closing it instead of leaving the page (`useOverlayHistory`), the
 * body-scroll lock and the enter/exit motion.
 *
 * Paging: the previous/next buttons, ←/→ (which swap in a right-to-left page — the
 * direction is read at the point the viewer is rendered, since the dialog itself is
 * portalled out of it), Home/End, and a horizontal swipe on a touch screen.
 *
 * Zoom is a TOGGLE, not a gesture: double-click (or the zoom button) shows the picture
 * at its natural size and the body scrolls to pan. Pinch-to-zoom is not implemented —
 * the browser's own page pinch still works — because a pinch handler would have to own
 * every touch on the picture, and with it the swipe.
 *
 * A non-image (a PDF floor plan) is shown as a file card: its name, "no preview", a
 * link that opens it in the browser's own viewer, and the download. An `<iframe>`
 * preview was the alternative; phone browsers render a PDF in one inconsistently or
 * not at all, and a card works everywhere.
 */
export function Lightbox({
  open,
  onClose,
  items,
  index: indexProp,
  onIndexChange,
  fetcher,
  loop = false,
  zoom: zoomEnabled = true,
  download = true,
  onDownload,
  backCloses,
  labels: labelsProp,
}: LightboxProps) {
  const labels = useKitLabels("lightbox", DEFAULT_LIGHTBOX_LABELS, labelsProp);
  const imageLabels = useKitLabels("authedImage", DEFAULT_AUTHED_IMAGE_LABELS);
  const count = items.length;
  // Clamped: the set can shrink under an open viewer (the photo on screen was deleted).
  const index = count === 0 ? 0 : Math.min(Math.max(indexProp, 0), count - 1);
  const item = items[index] as ImageItem | undefined;

  // The dialog is portalled to <body>, out of the subtree whose `dir` it would have
  // inherited; this marker stays where the viewer was rendered and reads it there.
  const anchorRef = useRef<HTMLSpanElement>(null);
  const dir = useAnchorDir(anchorRef, open);

  const fetched = useAuthedSrc(item?.src, { fetcher, enabled: open });
  const kind = item ? imageItemKind(item, fetched.type) : "image";

  const [zoomedKey, setZoomedKey] = useState<string | null>(null);
  const itemKey = item ? String(item.key ?? item.src) : null;
  // Zoom belongs to the picture it was turned on for: paging on resets it.
  const zoomed = zoomEnabled && kind === "image" && zoomedKey !== null && zoomedKey === itemKey;
  const toggleZoom = () => setZoomedKey(zoomed ? null : itemKey);

  const canPrev = loop ? count > 1 : index > 0;
  const canNext = loop ? count > 1 : index < count - 1;
  const go = (step: number) => {
    if (count === 0) return;
    let next = index + step;
    if (loop) next = (next + count) % count;
    if (next < 0 || next >= count || next === index) return;
    onIndexChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // A key meant for a control stays with it: Space/Enter on a button, typing in any
    // field a caller's caption might hold.
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    const step = horizontalStep(e.key, e.currentTarget);
    if (step !== 0) {
      e.preventDefault();
      go(step);
    } else if (e.key === "Home") {
      e.preventDefault();
      if (index !== 0) onIndexChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (index !== count - 1) onIndexChange(count - 1);
    }
  };

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    // Zoomed, a drag is a PAN of the picture, not a page turn.
    if (!start || !t || zoomed) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    // Swiping toward the START edge brings in the next picture from the end edge.
    const towardStart = dir === "rtl" ? dx > 0 : dx < 0;
    go(towardStart ? 1 : -1);
  };

  // Paging the viewer while zoomed would leave the new picture scrolled to where the
  // last one was panned; start each at its top-left.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: 0, left: 0 });
  }, [index]);

  const downloadHref = fetched.src;
  const downloadControl =
    download && item ? (
      onDownload ? (
        <IconButton size="sm" label={labels.download} onClick={() => onDownload(item, index)}>
          <Download />
        </IconButton>
      ) : downloadHref ? (
        <a
          href={downloadHref}
          // `download` names the saved file; a blob: URL has no name of its own.
          download={item.fileName ?? ""}
          className={buttonClasses("ghost", { size: "sm" })}
        >
          <Download aria-hidden className="size-4" />
          <span className="max-sm:sr-only">{labels.download}</span>
        </a>
      ) : null
    ) : null;

  const header = item ? (
    <div className="flex min-w-0 items-center gap-2">
      <span aria-hidden className="shrink-0 text-sm tabular-nums text-[var(--text-secondary)]">
        {labels.counter(index + 1, count)}
      </span>
      {/* The page turn, said — focus does not move when the picture changes, so
          without this a reader pressing → hears nothing at all. */}
      <span role="status" aria-live="polite" className="sr-only">
        {`${labels.position(index + 1, count)}${item.alt ? `: ${item.alt}` : ""}`}
      </span>
      <span className="min-w-0 flex-1" />
      {zoomEnabled && kind === "image" && (
        <IconButton size="sm" label={labels.zoom} pressed={zoomed} onClick={toggleZoom}>
          <ZoomIn />
        </IconButton>
      )}
      {downloadControl}
    </div>
  ) : null;

  const slide = !item ? null : kind === "file" ? (
    <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-[var(--border)] p-6 text-center">
      <FileText aria-hidden className="size-10 text-[var(--text-muted)]" />
      <p className="break-all font-medium text-[var(--text-primary)]">{item.fileName ?? item.alt}</p>
      <p className="text-sm text-[var(--text-muted)]">{labels.noPreview}</p>
      {fetched.src && (
        <a
          href={fetched.src}
          target="_blank"
          rel="noreferrer noopener"
          className={buttonClasses("secondary", { size: "sm" })}
        >
          <ExternalLink aria-hidden className="size-4" />
          {labels.openInNewTab}
        </a>
      )}
    </div>
  ) : (
    <ImageStates
      // Keyed by item: a new picture is a new decode, never the old one's "loaded".
      key={itemKey ?? undefined}
      fetched={fetched}
      alt={item.alt}
      labels={imageLabels}
      wrapperClassName={
        zoomed ? "max-w-none shrink-0" : "flex h-full w-full items-center justify-center"
      }
      className={cn(
        zoomed ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full object-contain",
        !zoomed && zoomEnabled && "cursor-zoom-in",
      )}
      imgProps={{
        draggable: false,
        onDoubleClick: zoomEnabled ? toggleZoom : undefined,
      }}
    />
  );

  return (
    <>
      <span ref={anchorRef} hidden />
      <FullBleedDialog
        open={open && !!item}
        onClose={onClose}
        closeLabel={labels.close}
        aria-label={labels.dialog}
        dir={dir}
        header={header}
        backCloses={backCloses}
        onKeyDown={onKeyDown}
        data-lightbox=""
        footer={
          item?.caption !== undefined && item.caption !== null && item.caption !== false ? (
            <p className="me-auto min-w-0 text-sm text-[var(--text-secondary)]">{item.caption}</p>
          ) : undefined
        }
      >
        <div
          ref={bodyRef}
          data-lightbox-stage=""
          data-zoomed={zoomed ? "" : undefined}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className={cn(
            "relative h-full min-h-48 w-full",
            zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden",
          )}
        >
          {slide}
        </div>
        {count > 1 && (
          <>
            <IconButton
              variant="overlay"
              size="lg"
              label={labels.previous}
              disabled={!canPrev}
              onClick={() => go(-1)}
              className="absolute start-3 top-1/2 -translate-y-1/2"
              tooltip={false}
            >
              <ChevronLeft className="rtl:-scale-x-100" />
            </IconButton>
            <IconButton
              variant="overlay"
              size="lg"
              label={labels.next}
              disabled={!canNext}
              onClick={() => go(1)}
              className="absolute end-3 top-1/2 -translate-y-1/2"
              tooltip={false}
            >
              <ChevronRight className="rtl:-scale-x-100" />
            </IconButton>
          </>
        )}
      </FullBleedDialog>
    </>
  );
}
