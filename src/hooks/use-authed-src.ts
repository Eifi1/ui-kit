import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fetch a file with the app's own credentials and hand back an object URL for it.
 *
 * A plain `<img src="/api/v1/…">` cannot carry a Bearer token, so the browser gets a
 * 401 and the image — and any "open it" link built on the same path — fails. Both apps
 * solved this once each, by hand: kastlan's `shared/components/authed-image.tsx` (ported
 * from keksdose) and its `useDocumentBlobUrl` for floor plans. This is that code, once,
 * with the two things neither copy did: a loading/error state a caller can render, and
 * an abort when the URL changes mid-flight (a stale response used to overwrite the new
 * one's object URL — and leak the old one, since nothing revoked it).
 *
 * The kit does no auth of its own: the caller hands over a {@link AuthedFetcher} — its
 * axios client, its `fetch` with the header — and the kit only manages the blob's life:
 *
 *   - created when the bytes arrive,
 *   - revoked when the URL changes, the fetcher reports an error, or the component
 *     unmounts — so a long gallery session does not accumulate blobs,
 *   - never exposed as a token-bearing URL: the object URL is `blob:` and local.
 */

/**
 * The app's authenticated GET. Resolve to the file's bytes: a `Blob` (axios with
 * `responseType: "blob"`), or a `Response` (plain `fetch`), whose `ok` is checked here.
 *
 * Honour `signal` if you can — a thumbnail scrolled past, or a lightbox paged on, then
 * stops downloading. Ignoring it is safe; the result of a superseded call is discarded
 * either way.
 */
export type AuthedFetcher = (url: string, init: { signal: AbortSignal }) => Promise<Blob | Response>;

/** `idle`: no URL. `loading`: the fetch is in flight. `ready`: `src` is usable.
 *  `error`: the fetch failed (see `error`). */
export type AuthedSrcStatus = "idle" | "loading" | "ready" | "error";

export interface UseAuthedSrcOptions {
  /**
   * How to fetch. Left out (or `null`), the URL is used as it is — `src` is the URL and
   * the status `ready` at once — so a component that takes an OPTIONAL fetcher (the
   * image grid, the lightbox) has one code path for public and protected images.
   */
  fetcher?: AuthedFetcher | null;
  /** `false` holds the fetch — a lightbox slide that is not on screen. Default `true`. */
  enabled?: boolean;
}

export interface UseAuthedSrcResult {
  /** The object URL (or, without a fetcher, the URL itself); `null` until ready. */
  src: string | null;
  status: AuthedSrcStatus;
  /** What the fetcher threw, when `status` is `error`. */
  error: unknown;
  /** The blob's MIME type, once fetched (`""` when the server sent none). `undefined`
   *  without a fetcher — nothing was fetched to ask. Lets a caller that does not know
   *  whether a URL is an image or a PDF find out. */
  type: string | undefined;
  /** Fetch again — after an `error`, or to pick up a changed file at the same URL. */
  retry: () => void;
}

interface State {
  /** Which request this state belongs to — see the effect. */
  key: string | null;
  src: string | null;
  status: AuthedSrcStatus;
  error: unknown;
  type: string | undefined;
}

async function toBlob(res: Blob | Response): Promise<Blob> {
  if (typeof Response !== "undefined" && res instanceof Response) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }
  return res as Blob;
}

/**
 * `useAuthedSrc(url, { fetcher })` — see the module note.
 *
 * ```tsx
 * const fetcher: AuthedFetcher = (url, { signal }) =>
 *   apiClient.get(url, { responseType: "blob", signal }).then((r) => r.data);
 * const { src, status } = useAuthedSrc(photo.file_path, { fetcher });
 * ```
 *
 * The fetcher is read through a ref, so an inline arrow does not refetch on every
 * render; a change of `url` (or `retry`) does.
 */
export function useAuthedSrc(
  url: string | null | undefined,
  { fetcher, enabled = true }: UseAuthedSrcOptions = {},
): UseAuthedSrcResult {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  const hasFetcher = !!fetcher;
  const [attempt, setAttempt] = useState(0);
  const key = url && enabled && hasFetcher ? `${attempt}|${url}` : null;
  const [state, setState] = useState<State>({
    key: null,
    src: null,
    status: "idle",
    error: undefined,
    type: undefined,
  });

  useEffect(() => {
    const fetchFn = fetcherRef.current;
    if (!key || !url || !fetchFn) return;
    const controller = new AbortController();
    let created: string | null = null;
    let active = true;
    // No "loading" state is set here: a key the state does not describe yet already
    // reads as loading (see the end of the hook).
    fetchFn(url, { signal: controller.signal })
      .then(toBlob)
      .then((blob) => {
        if (!active) return;
        created = URL.createObjectURL(blob);
        setState({ key, src: created, status: "ready", error: undefined, type: blob.type });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ key, src: null, status: "error", error, type: undefined });
      });
    return () => {
      // `active` first: an in-flight response that lands after this must neither set
      // state on an unmounted component nor create a blob nobody will revoke.
      active = false;
      controller.abort();
      if (created) URL.revokeObjectURL(created);
    };
  }, [key, url]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!url || !enabled) {
    return { src: null, status: "idle", error: undefined, type: undefined, retry };
  }
  if (!hasFetcher) {
    return { src: url, status: "ready", error: undefined, type: undefined, retry };
  }
  // Until the effect for THIS key has run, the state still describes the previous URL
  // — a render in between must not show the old picture under the new name.
  if (state.key !== key) {
    return { src: null, status: "loading", error: undefined, type: undefined, retry };
  }
  return { src: state.src, status: state.status, error: state.error, type: state.type, retry };
}
