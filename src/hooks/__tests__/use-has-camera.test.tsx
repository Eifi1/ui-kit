import { act, render, renderHook, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHasCamera } from "../use-has-camera";

/**
 * keksdose's `useHasCamera` (shared/hooks/use-has-camera.ts:28), with its fail-open rule,
 * shared by every button on the page. jsdom ships no `navigator.mediaDevices`, which is
 * also the shape of an insecure context; each test installs the answer it is about.
 */

/** A `MediaDevices` that answers `enumerateDevices` with `devices` (or rejects), and
 *  fires `devicechange` on demand. */
function withDevices(devices: { kind: string }[] | Error) {
  let answer = devices;
  const media = Object.assign(new EventTarget(), {
    enumerateDevices: vi.fn(() => (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer))),
  });
  const add = vi.spyOn(media, "addEventListener");
  const remove = vi.spyOn(media, "removeEventListener");
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: media });
  return {
    media,
    add,
    remove,
    /** A webcam plugged in or out: the next enumeration answers `next`. */
    change(next: { kind: string }[]) {
      answer = next;
      media.dispatchEvent(new Event("devicechange"));
    },
  };
}

const CAMERA = [{ kind: "videoinput" }, { kind: "audioinput" }];
const NO_CAMERA = [{ kind: "audioinput" }, { kind: "audiooutput" }];

afterEach(() => {
  Reflect.deleteProperty(navigator, "mediaDevices");
});

describe("useHasCamera", () => {
  it("is true where the browser lists a video input", async () => {
    withDevices(CAMERA);
    const { result } = renderHook(() => useHasCamera());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("is false where the browser lists devices and no video input", async () => {
    withDevices(NO_CAMERA);
    const { result } = renderHook(() => useHasCamera());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("fails open with no mediaDevices at all — an insecure context, and jsdom", async () => {
    // A positive "no" first, so the test shows an unknown is not read from the cache.
    withDevices(NO_CAMERA);
    const first = renderHook(() => useHasCamera());
    await waitFor(() => expect(first.result.current).toBe(false));
    first.unmount();
    Reflect.deleteProperty(navigator, "mediaDevices");

    const { result } = renderHook(() => useHasCamera());
    expect(result.current).toBe(true);
  });

  it("fails open when enumerateDevices rejects — a refusal is not an absence", async () => {
    withDevices(NO_CAMERA);
    const first = renderHook(() => useHasCamera());
    await waitFor(() => expect(first.result.current).toBe(false));
    first.unmount();

    withDevices(new DOMException("blocked by permissions policy", "NotAllowedError"));
    const { result } = renderHook(() => useHasCamera());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("fails open on an empty list: a browser declining to say, not a device with nothing", async () => {
    withDevices(NO_CAMERA);
    const first = renderHook(() => useHasCamera());
    await waitFor(() => expect(first.result.current).toBe(false));
    first.unmount();

    const { media } = withDevices([]);
    const { result } = renderHook(() => useHasCamera());
    await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("asks again when a camera is plugged in", async () => {
    const devices = withDevices(NO_CAMERA);
    const { result } = renderHook(() => useHasCamera());
    await waitFor(() => expect(result.current).toBe(false));
    await act(async () => devices.change(CAMERA));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("asks once for every button on the page, and a button mounted later starts from the answer", async () => {
    const { media } = withDevices(NO_CAMERA);
    const seen: boolean[] = [];
    function Probe() {
      seen.push(useHasCamera());
      return null;
    }
    const first = render(<Probe />);
    await waitFor(() => expect(seen.at(-1)).toBe(false));
    seen.length = 0;
    const second = render(<Probe />);
    // The second button's very first render already knows.
    expect(seen[0]).toBe(false);
    expect(media.enumerateDevices).toHaveBeenCalledTimes(1);

    // Every button gone, then one more: it renders "no camera" from its first render — no
    // "Take photo" for a frame on a desktop without one — and asks again behind it, since a
    // camera may have come or gone while nobody listened.
    first.unmount();
    second.unmount();
    seen.length = 0;
    render(<Probe />);
    expect(seen[0]).toBe(false);
    expect(media.enumerateDevices).toHaveBeenCalledTimes(2);
  });

  it("listens for devicechange while anyone asks, and stops when the last one goes", async () => {
    const { add, remove } = withDevices(CAMERA);
    const a = renderHook(() => useHasCamera());
    const b = renderHook(() => useHasCamera());
    expect(add).toHaveBeenCalledTimes(1);
    a.unmount();
    expect(remove).not.toHaveBeenCalled();
    b.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][1]).toBe(add.mock.calls[0][1]);
    await act(async () => {});
  });

  it("is true on the server, whatever the page found", async () => {
    function Probe() {
      return <span>{useHasCamera() ? "camera" : "none"}</span>;
    }
    withDevices(NO_CAMERA);
    const { container } = render(<Probe />);
    await waitFor(() => expect(container.textContent).toBe("none"));
    // The server has no navigator and no answer: the fail-open one, never a "none" the
    // client then has to take back.
    expect(renderToString(<Probe />)).toContain("camera");
  });
});
