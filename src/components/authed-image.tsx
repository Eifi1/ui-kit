import { useState } from "react";
import type { ImgHTMLAttributes, ReactNode } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { SKELETON_CLASS } from "./skeleton";
import { useAuthedSrc } from "../hooks/use-authed-src";
import type { AuthedFetcher, UseAuthedSrcResult } from "../hooks/use-authed-src";

/** The two states an image can be in besides "there". */
export interface AuthedImageLabels {
  /** Read out while the bytes are on their way (the skeleton itself is silent). */
  loading: string;
  /** Shown, small, in place of an image that could not be fetched or decoded. */
  loadError: string;
  /** The failed tile's accessible name, given the image's alt. */
  failedImage: (alt: string) => string;
}

export const DEFAULT_AUTHED_IMAGE_LABELS: AuthedImageLabels = {
  loading: "Loading image…",
  loadError: "Image couldn’t be loaded",
  failedImage: (alt) => `${alt}: image couldn’t be loaded`,
};

export interface AuthedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "children"> {
  /** The image's URL — an API path when a {@link fetcher} is given. */
  src: string | null | undefined;
  /** Required: an image without a text alternative is a gap a reader falls into.
   *  `""` for a purely decorative one. */
  alt: string;
  /** The app's authenticated GET (see {@link useAuthedSrc}). Left out, `src` is loaded
   *  by the browser as usual and this is an `<img>` with loading and error states. */
  fetcher?: AuthedFetcher | null;
  /** Classes for the box around the image (the placeholders fill it). */
  wrapperClassName?: string;
  /**
   * Wrap the image in a link to itself, opening in a new tab — kastlan's
   * `AuthedImage` did, because an object URL is the only address of a protected image
   * a browser tab can open. The link's href is the `blob:` URL, never the API path.
   */
  link?: boolean;
  /** Replaces the default skeleton while loading. */
  loadingFallback?: ReactNode;
  /** Replaces the default "couldn't load" tile. */
  errorFallback?: ReactNode;
  labels?: Partial<AuthedImageLabels>;
}

/**
 * An image with a loading state, an error state and — given a `fetcher` — the app's
 * authentication. Replaces kastlan's `shared/components/authed-image.tsx`, which
 * rendered NOTHING until the blob arrived and nothing at all if it never did: a card
 * with a photo slot either had the photo or was silently shorter.
 *
 * Two failures are one state here: the fetch failing (401, 404, offline) and the
 * browser failing to decode what arrived (`onError` on the `<img>`, e.g. a PDF served
 * where an image was expected).
 */
export function AuthedImage({
  src,
  alt,
  fetcher,
  wrapperClassName,
  className,
  link,
  loadingFallback,
  errorFallback,
  labels: labelsProp,
  onLoad,
  onError,
  ...rest
}: AuthedImageProps) {
  const labels = useKitLabels("authedImage", DEFAULT_AUTHED_IMAGE_LABELS, labelsProp);
  const fetched = useAuthedSrc(src, { fetcher });
  return (
    <ImageStates
      fetched={fetched}
      alt={alt}
      labels={labels}
      className={className}
      wrapperClassName={wrapperClassName}
      link={link}
      loadingFallback={loadingFallback}
      errorFallback={errorFallback}
      imgProps={rest}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

/**
 * The rendering half of {@link AuthedImage}, for a caller that already holds a
 * {@link useAuthedSrc} result (the lightbox needs the object URL for its download link
 * as well). Internal to the package.
 */
export function ImageStates({
  fetched,
  alt,
  labels,
  className,
  wrapperClassName,
  link,
  loadingFallback,
  errorFallback,
  imgProps,
  onLoad,
  onError,
}: {
  fetched: UseAuthedSrcResult;
  alt: string;
  labels: AuthedImageLabels;
  className?: string;
  wrapperClassName?: string;
  link?: boolean;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  imgProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "children" | "onLoad" | "onError">;
  onLoad?: ImgHTMLAttributes<HTMLImageElement>["onLoad"];
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
}) {
  // Decode state, per src: keyed so a new picture starts over rather than inheriting
  // the previous one's "loaded" or "broken".
  const [decode, setDecode] = useState<{ src: string | null; state: "loaded" | "error" } | null>(null);
  const decoded = decode && decode.src === fetched.src ? decode.state : "pending";
  const failed = fetched.status === "error" || decoded === "error";
  const waiting = !failed && (fetched.status === "loading" || (fetched.src !== null && decoded === "pending"));

  const img = fetched.src !== null && !failed && (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- load/error are resource events, not interactions
    <img
      {...imgProps}
      src={fetched.src}
      alt={alt}
      onLoad={(e) => {
        setDecode({ src: fetched.src, state: "loaded" });
        onLoad?.(e);
      }}
      onError={(e) => {
        setDecode({ src: fetched.src, state: "error" });
        onError?.(e);
      }}
      className={cn(
        // Kept in the tree while it decodes (the browser needs it there to load at
        // all), but invisible, so the skeleton is what shows.
        decoded === "pending" && "opacity-0",
        className,
      )}
    />
  );

  return (
    <span
      data-image-state={failed ? "error" : waiting ? "loading" : fetched.status === "idle" ? "idle" : "ready"}
      className={cn("relative block overflow-hidden", wrapperClassName)}
      aria-busy={waiting || undefined}
    >
      {link && img && fetched.src ? (
        <a href={fetched.src} target="_blank" rel="noreferrer noopener" className="block h-full w-full">
          {img}
        </a>
      ) : (
        img
      )}
      {waiting &&
        (loadingFallback ?? (
          <span className={cn(SKELETON_CLASS, "absolute inset-0 block rounded-none")}>
            <span className="sr-only">{labels.loading}</span>
          </span>
        ))}
      {failed &&
        (errorFallback ?? (
          <span
            // `role="img"` with the alt as its name: the picture that failed still
            // occupies its place in the reading order, and "couldn't be loaded" is
            // the one fact a reader needs about it.
            role="img"
            aria-label={alt ? labels.failedImage(alt) : labels.loadError}
            className="flex h-full min-h-16 w-full flex-col items-center justify-center gap-1 bg-[var(--bg-hover)] p-2 text-center text-xs text-[var(--text-muted)]"
          >
            <ImageOff aria-hidden className="size-5 shrink-0" />
            <span aria-hidden className="line-clamp-2">{labels.loadError}</span>
          </span>
        ))}
    </span>
  );
}
