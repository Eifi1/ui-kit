import { useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { FileText } from "lucide-react";

import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import type { AuthedFetcher } from "../hooks/use-authed-src";
import { AuthedImage } from "./authed-image";
import { Lightbox, imageItemKind } from "./lightbox";
import type { ImageItem, LightboxLabels } from "./lightbox";

export interface ImageGridLabels {
  /** The list's accessible name. */
  list: string;
  /** An open button's name when an item's `alt` is empty: "Image 3 of 7". */
  item: (index: number, count: number) => string;
  /** The name of the group of per-image actions, given the image's name. */
  actions: (name: string) => string;
}

export const DEFAULT_IMAGE_GRID_LABELS: ImageGridLabels = {
  list: "Images",
  item: (index, count) => `Image ${index} of ${count}`,
  actions: (name) => `Actions for ${name}`,
};

export interface ImageGridProps extends Omit<ComponentPropsWithoutRef<"ul">, "children"> {
  items: readonly ImageItem[];
  /** The app's authenticated GET — thumbnails and the lightbox fetch through it. Only
   *  images are fetched for the grid; a file (PDF) tile shows its icon and name. */
  fetcher?: AuthedFetcher | null;
  /**
   * Per-image actions — a delete, an edit. Rendered BESIDE the open button (on top of
   * the thumbnail's corner), never inside it: a button inside a button is invalid HTML
   * and a screen reader flattens it into the outer one's name, where it cannot be
   * reached. Use `IconButton variant="overlay"` for controls that sit on a photo.
   */
  renderActions?: (item: ImageItem, index: number) => ReactNode;
  /**
   * What a tile's click does. Left out, the grid opens its own {@link Lightbox} on that
   * image. Given, the grid opens nothing — for a caller that keeps the lightbox's
   * index in the URL, or that opens something else.
   */
  onOpen?: (index: number) => void;
  /**
   * A fixed column count. Left out, the grid is responsive: as many columns of at
   * least {@link minTileSize} px as fit, so the same grid is three across in a card on
   * a phone and eight across on a desktop page — no breakpoints to choose.
   */
  columns?: number;
  /** The smallest a tile may be in the responsive layout. Default 96 (px). */
  minTileSize?: number;
  /** `square` (default) crops to a square; `video` to 16:9; `auto` keeps each image's
   *  own proportions (a floor plan), within a square-ish box. */
  aspect?: "square" | "video" | "auto";
  /** Props for the built-in lightbox (ignored with {@link onOpen}). */
  lightbox?: {
    loop?: boolean;
    zoom?: boolean;
    download?: boolean;
    onDownload?: (item: ImageItem, index: number) => void;
    labels?: Partial<LightboxLabels>;
  };
  labels?: Partial<ImageGridLabels>;
}

const ASPECT_CLASS = {
  square: "aspect-square",
  video: "aspect-video",
  auto: "aspect-[4/3]",
} as const;

/**
 * A grid of thumbnails that open in a {@link Lightbox} — kastlan's room and defect
 * photos (room-inspector, unit-rooms-tab) and its floor plans (unit-floor-plan), each
 * of which drew its own `grid grid-cols-N` of `<img>` that nothing could open, with no
 * loading state and nowhere to put a delete.
 *
 * Each tile is a real `<button>` named by the image's alt, with the actions beside it
 * and the caption below it — outside the button, so the name stays the alt and the
 * caption is read once. Placeholders come from {@link AuthedImage}: a skeleton while
 * loading, a "couldn't load" tile on failure.
 */
export function ImageGrid({
  items,
  fetcher,
  renderActions,
  onOpen,
  columns,
  minTileSize = 96,
  aspect = "square",
  lightbox,
  labels: labelsProp,
  className,
  style,
  ...rest
}: ImageGridProps) {
  const labels = useKitLabels("imageGrid", DEFAULT_IMAGE_GRID_LABELS, labelsProp);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = items.length;

  const gridStyle: CSSProperties = {
    gridTemplateColumns:
      columns !== undefined
        ? `repeat(${columns}, minmax(0, 1fr))`
        : `repeat(auto-fill, minmax(min(${minTileSize}px, 100%), 1fr))`,
    ...style,
  };

  return (
    <>
      <ul
        aria-label={labels.list}
        {...rest}
        className={cn("grid gap-2", className)}
        style={gridStyle}
      >
        {items.map((item, i) => {
          const name = item.alt || labels.item(i + 1, count);
          const kind = imageItemKind(item);
          const actions = renderActions?.(item, i);
          return (
            <li key={item.key ?? item.src} className="relative min-w-0">
              <button
                type="button"
                aria-label={name}
                onClick={() => (onOpen ? onOpen(i) : setOpenIndex(i))}
                className={cn(
                  "block w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-hover)]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]",
                  ASPECT_CLASS[aspect],
                )}
              >
                {kind === "file" ? (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-[var(--text-secondary)]">
                    <FileText aria-hidden className="size-6 shrink-0 text-[var(--text-muted)]" />
                    <span aria-hidden className="line-clamp-2 break-all">{item.fileName ?? item.alt}</span>
                  </span>
                ) : (
                  <AuthedImage
                    src={item.thumbnailSrc ?? item.src}
                    // The button is named already; the picture inside it is decoration
                    // to a reader, or the name would be read twice.
                    alt=""
                    fetcher={fetcher}
                    loading="lazy"
                    wrapperClassName="h-full w-full"
                    className={cn("h-full w-full", aspect === "auto" ? "object-contain" : "object-cover")}
                  />
                )}
              </button>
              {actions !== undefined && actions !== null && actions !== false && (
                <div
                  role="group"
                  aria-label={labels.actions(name)}
                  className="absolute end-1 top-1 flex gap-1"
                >
                  {actions}
                </div>
              )}
              {item.caption !== undefined && item.caption !== null && item.caption !== false && (
                <div className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{item.caption}</div>
              )}
            </li>
          );
        })}
      </ul>
      {!onOpen && (
        <Lightbox
          open={openIndex !== null}
          onClose={() => setOpenIndex(null)}
          items={items}
          index={openIndex ?? 0}
          onIndexChange={setOpenIndex}
          fetcher={fetcher}
          {...lightbox}
        />
      )}
    </>
  );
}
