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

  it("revokes the object URL when the URL changes and on unmount, and aborts a superseded fetch", async () => {
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
    expect(signals[0].aborted).toBe(true);
    await waitFor(() => expect(result.current.src).toBe("blob:test/2"));
    unmount();
    expect(revoked).toEqual(["blob:test/1", "blob:test/2"]);
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
    const fetcher: AuthedFetcher = async () =>
      fail ? new Response("nope", { status: 401 }) : new Response(png());
    const { result } = renderHook(() => useAuthedSrc("/a.png", { fetcher }));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.src).toBeNull();
    expect(String(result.current.error)).toMatch(/401/);
    fail = false;
    act(() => result.current.retry());
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
    expect(
      renderHook(() => useAuthedSrc("/a.png", { fetcher, enabled: false })).result.current.status,
    ).toBe("idle");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
