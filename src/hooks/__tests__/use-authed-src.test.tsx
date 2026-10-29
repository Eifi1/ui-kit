import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthedSrc } from "../use-authed-src";
import type { AuthedFetcher } from "../use-authed-src";

/** jsdom implements neither half of the object-URL API. */
let created: string[];
let revoked: string[];
beforeEach(() => {
  created = [];
  revoked = [];
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => {
      const url = `blob:test/${(n += 1)}`;
      created.push(url);
      return url;
    }),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn((url: string) => revoked.push(url)),
  });
});
afterEach(() => {
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

const png = () => new Blob(["x"], { type: "image/png" });

describe("useAuthedSrc", () => {
  it("fetches through the caller's fetcher and reports loading → ready with an object URL", async () => {
    const fetcher = vi.fn<AuthedFetcher>(async () => png());
    const { result } = renderHook(() => useAuthedSrc("/api/v1/photo.png", { fetcher }));
    expect(result.current.status).toBe("loading");
    expect(result.current.src).toBeNull();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.src).toBe("blob:test/1");
    expect(result.current.type).toBe("image/png");
    expect(fetcher).toHaveBeenCalledWith("/api/v1/photo.png", { signal: expect.any(AbortSignal) });
  });

  it("does not refetch because the fetcher is a new arrow on every render", async () => {
    const calls = vi.fn();
    const { result, rerender } = renderHook(() =>
      useAuthedSrc("/a.png", {
        fetcher: async () => {
          calls();
          return png();
        },
      }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender();
    rerender();
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("revokes the object URL when the URL changes and on unmount, and aborts only a fetch in flight", async () => {
    const signals: AbortSignal[] = [];
    const fetcher: AuthedFetcher = async (_url, { signal }) => {
      signals.push(signal);
      return png();
    };
    const { result, rerender, unmount } = renderHook(({ url }) => useAuthedSrc(url, { fetcher }), {
      initialProps: { url: "/a.png" },
    });
    await waitFor(() => expect(result.current.src).toBe("blob:test/1"));
    rerender({ url: "/b.png" });
    // Never the old picture under the new URL, not even for one render.
    expect(result.current.src).toBeNull();
    expect(result.current.status).toBe("loading");
    expect(revoked).toEqual(["blob:test/1"]);
    // The first request had finished: there is nothing to cancel, so no abort is sent.
    expect(signals[0].aborted).toBe(false);
    await waitFor(() => expect(result.current.src).toBe("blob:test/2"));
    unmount();
    expect(revoked).toEqual(["blob:test/1", "blob:test/2"]);
    expect(signals[1].aborted).toBe(false);
  });

  it("aborts a request still in flight when the URL changes or the hook unmounts", async () => {
    const signals: AbortSignal[] = [];
    const fetcher: AuthedFetcher = (_url, { signal }) => {
      signals.push(signal);
      return new Promise<Blob>(() => {});
    };
    const { rerender, unmount } = renderHook(({ url }) => useAuthedSrc(url, { fetcher }), {
      initialProps: { url: "/a.png" },
    });
    rerender({ url: "/b.png" });
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    unmount();
    expect(signals[1].aborted).toBe(true);
  });

  it("a response that lands after the URL changed creates nothing and sets nothing", async () => {
    let release!: (b: Blob) => void;
    const fetcher: AuthedFetcher = (url) =>
      url === "/slow.png" ? new Promise<Blob>((r) => (release = r)) : Promise.resolve(png());
    const { result, rerender } = renderHook(({ url }) => useAuthedSrc(url, { fetcher }), {
      initialProps: { url: "/slow.png" },
    });
    rerender({ url: "/fast.png" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => release(png()));
    expect(created).toHaveLength(1);
    expect(result.current.src).toBe(created[0]);
  });

  it("reports an error (a thrown fetcher, or a Response that is not ok) and can retry", async () => {
    let fail = true;
    const fetcher: AuthedFetcher = async () => (fail ? new Response("nope", { status: 401 }) : new Response(png()));
    const { result } = renderHook(() => useAuthedSrc("/a.png", { fetcher }));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.src).toBeNull();
    expect(String(result.current.error)).toMatch(/401/);
    fail = false;
    act(() => result.current.retry());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  // BUG-3 (refactor audit 2026-10): Lightbox passes `enabled: open`, so closing and
  // reopening the same photo repeats the key. Its first open's blob was revoked on
  // close; the reopen must not hand it back as "ready", not even for one render.
  it("reopening the same URL (enabled false → true) never returns the revoked object URL", async () => {
    const fetcher: AuthedFetcher = async () => png();
    const seen: { status: string; src: string | null }[] = [];
    const { result, rerender } = renderHook(
      ({ enabled }) => {
        const r = useAuthedSrc("/photos/7", { fetcher, enabled });
        seen.push({ status: r.status, src: r.src });
        return r;
      },
      { initialProps: { enabled: true } },
    );
    await waitFor(() => expect(result.current.src).toBe("blob:test/1"));
    rerender({ enabled: false });
    expect(result.current.status).toBe("idle");
    expect(revoked).toEqual(["blob:test/1"]);
    seen.length = 0;
    rerender({ enabled: true });
    // The reopen's first render: loading, with nothing to show yet.
    expect(seen[0]).toEqual({ status: "loading", src: null });
    await waitFor(() => expect(result.current.src).toBe("blob:test/2"));
    expect(seen.some((s) => s.src !== null && revoked.includes(s.src))).toBe(false);
  });

  // The same repeat through paging: A is on screen, B is still loading, and the user
  // pages back to A. A's blob went with the move to B.
  it("paging back to a URL before the next one loaded never returns its revoked object URL", async () => {
    let releaseB!: (b: Blob) => void;
    const fetcher: AuthedFetcher = (url) =>
      url === "/b.png" ? new Promise<Blob>((r) => (releaseB = r)) : Promise.resolve(png());
    const seen: (string | null)[] = [];
    const { result, rerender } = renderHook(
      ({ url }) => {
        const r = useAuthedSrc(url, { fetcher });
        seen.push(r.src);
        return r;
      },
      { initialProps: { url: "/a.png" } },
    );
    await waitFor(() => expect(result.current.src).toBe("blob:test/1"));
    rerender({ url: "/b.png" });
    expect(revoked).toEqual(["blob:test/1"]);
    seen.length = 0;
    rerender({ url: "/a.png" });
    expect(result.current).toMatchObject({ status: "loading", src: null });
    await waitFor(() => expect(result.current.src).toBe("blob:test/2"));
    expect(seen).not.toContain("blob:test/1");
    // B's late answer is discarded, as before.
    await act(async () => releaseB(png()));
    expect(result.current.src).toBe("blob:test/2");
  });

  // The other half of the same repeat: an error from the first open is not the
  // reopen's answer either — the reopen fetches again, and says so.
  it("reopening after an error reports loading, not the old error", async () => {
    let fail = true;
    const fetcher: AuthedFetcher = async () => {
      if (fail) throw new Error("offline");
      return png();
    };
    const { result, rerender } = renderHook(({ enabled }) => useAuthedSrc("/a.png", { fetcher, enabled }), {
      initialProps: { enabled: true },
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    rerender({ enabled: false });
    fail = false;
    rerender({ enabled: true });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("without a fetcher the URL is used as it is; without a URL (or disabled) it is idle", () => {
    expect(renderHook(() => useAuthedSrc("/public.png")).result.current).toMatchObject({
      src: "/public.png",
      status: "ready",
    });
    const fetcher = vi.fn<AuthedFetcher>(async () => png());
    expect(renderHook(() => useAuthedSrc(null, { fetcher })).result.current.status).toBe("idle");
    expect(renderHook(() => useAuthedSrc("/a.png", { fetcher, enabled: false })).result.current.status).toBe("idle");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
