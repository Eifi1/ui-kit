import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard, useCopyToClipboard } from "../use-copy-to-clipboard";

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else delete (navigator as { clipboard?: unknown }).clipboard;
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (document as { execCommand?: unknown }).execCommand;
});

describe("copyToClipboard", () => {
  it("uses the Clipboard API when there is one", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    await expect(copyToClipboard("DE89")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("DE89");
  });

  it("falls back to execCommand when the API is missing (plain-http LAN build)", async () => {
    setClipboard(undefined);
    const exec = vi.fn().mockReturnValue(true);
    (document as { execCommand?: unknown }).execCommand = exec;
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();
    await expect(copyToClipboard("x")).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.activeElement).toBe(button);
    button.remove();
  });

  it("falls back when the API refuses, and reports false when both fail", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    (document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(false);
    await expect(copyToClipboard("x")).resolves.toBe(false);
  });
});

describe("useCopyToClipboard", () => {
  it("is copied only when the copy worked, and returns to idle", async () => {
    vi.useFakeTimers();
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    const { result } = renderHook(() => useCopyToClipboard({ resetAfter: 1000 }));
    expect(result.current.state).toBe("idle");
    await act(async () => {
      await result.current.copy("a");
    });
    expect(result.current.state).toBe("copied");
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.state).toBe("idle");
  });

  it("says failed — not copied — when it failed (keksdose's bug)", async () => {
    setClipboard(undefined);
    const { result } = renderHook(() => useCopyToClipboard());
    let ok = true;
    await act(async () => {
      ok = await result.current.copy("a");
    });
    expect(ok).toBe(false);
    expect(result.current.state).toBe("failed");
  });
});
