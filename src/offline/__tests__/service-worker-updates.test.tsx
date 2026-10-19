import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createServiceWorkerUpdates, useServiceWorkerUpdate } from "../service-worker-updates";
import type { RegisterServiceWorker } from "../service-worker-updates";

/** 0.46 (kastlan K3): registered once at start, the prompt anywhere later. */

function fakeRegister() {
  let onNeedRefresh: (() => void) | undefined;
  const update = vi.fn(async (_reload?: boolean) => {});
  const register = vi.fn<RegisterServiceWorker>((options) => {
    onNeedRefresh = options.onNeedRefresh;
    return update;
  });
  return { register, update, fire: () => onNeedRefresh?.() };
}

describe("createServiceWorkerUpdates", () => {
  it("registers once, however often start runs", () => {
    const sw = fakeRegister();
    const updates = createServiceWorkerUpdates(sw.register);
    expect(sw.register).not.toHaveBeenCalled();
    updates.start();
    updates.start();
    expect(sw.register).toHaveBeenCalledTimes(1);
  });

  it("a waiting version before the prompt mounts is still seen by it (the sign-in page case)", () => {
    const sw = fakeRegister();
    const updates = createServiceWorkerUpdates(sw.register);
    updates.start();
    sw.fire();
    const { result } = renderHook(() => useServiceWorkerUpdate(updates));
    expect(result.current.needRefresh).toBe(true);
  });

  it("the hook's answer is PwaUpdatePrompt's props: reload activates, dismiss hides", () => {
    const sw = fakeRegister();
    const updates = createServiceWorkerUpdates(sw.register);
    const { result } = renderHook(() => useServiceWorkerUpdate(updates));
    expect(result.current.needRefresh).toBe(false);
    // Reload before start does nothing and does not throw.
    result.current.onReload();
    updates.start();
    act(() => sw.fire());
    expect(result.current.needRefresh).toBe(true);
    result.current.onReload();
    expect(sw.update).toHaveBeenCalledWith(true);
    act(() => result.current.onDismiss());
    expect(result.current.needRefresh).toBe(false);
  });
});
