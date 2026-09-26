import { isValidElement } from "react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `toast` against a MOCKED sonner: what exactly each call hands over. The rendering
 * side — labels, theme, position, the same-id replacement — is in toast.test.tsx,
 * against the real one.
 */
const sonner = vi.hoisted(() => {
  const fn = () => vi.fn((_: unknown, data?: { id?: string | number }) => data?.id ?? 0);
  const toast = Object.assign(fn(), {
    success: fn(),
    error: fn(),
    warning: fn(),
    info: fn(),
    loading: fn(),
    custom: fn(),
    dismiss: vi.fn(),
  });
  return { toast, Toaster: () => null };
});
vi.mock("sonner", () => sonner);

import { toast, TOAST_ACTION_DURATION } from "../toast";

/** The last call's arguments on one of the mocked methods, once the lazy import has
 *  delivered it. */
async function lastCall(method: ReturnType<typeof vi.fn>) {
  await vi.waitFor(() => expect(method).toHaveBeenCalled());
  return method.mock.calls.at(-1) as [unknown, Record<string, unknown>];
}

beforeEach(() => vi.clearAllMocks());

describe("toast — the pass-through to sonner", () => {
  it("hands message and options to the method of the same name, with the kit's id", async () => {
    const id = toast.success("Saved", { description: "Two rows" });
    const [message, data] = await lastCall(sonner.toast.success);
    expect(message).toBe("Saved");
    expect(data).toEqual({ id, description: "Two rows" });
    expect(typeof id).toBe("string");
  });

  it("routes each tone, the plain call and `message`", async () => {
    toast("plain");
    toast.message("also plain");
    toast.error("e");
    toast.warning("w");
    toast.info("i");
    toast.loading("l");
    await vi.waitFor(() => expect(sonner.toast).toHaveBeenCalledTimes(2));
    expect(sonner.toast.mock.calls.map((c) => c[0])).toEqual(["plain", "also plain"]);
    for (const [m, text] of [
      [sonner.toast.error, "e"],
      [sonner.toast.warning, "w"],
      [sonner.toast.info, "i"],
      [sonner.toast.loading, "l"],
    ] as const) {
      expect(m).toHaveBeenCalledWith(text, expect.objectContaining({ id: expect.any(String) }));
    }
  });

  it("keeps a caller's id, so the same id replaces the toast on screen", async () => {
    expect(toast.success("one", { id: "save" })).toBe("save");
    const [, data] = await lastCall(sonner.toast.success);
    expect(data.id).toBe("save");
  });

  it("passes cancel, callbacks, className and style through untouched", async () => {
    const onDismiss = vi.fn();
    const onAutoClose = vi.fn();
    const cancel = { label: "No", onClick: vi.fn() };
    toast.info("x", { cancel, onDismiss, onAutoClose, className: "c", style: { color: "red" } });
    const [, data] = await lastCall(sonner.toast.info);
    expect(data).toMatchObject({ cancel, onDismiss, onAutoClose, className: "c", style: { color: "red" } });
  });

  it("dismisses one toast or all of them", async () => {
    toast.dismiss("a");
    toast.dismiss();
    await vi.waitFor(() => expect(sonner.toast.dismiss).toHaveBeenCalledTimes(2));
    expect(sonner.toast.dismiss.mock.calls).toEqual([["a"], [undefined]]);
  });

  it("passes custom's render function with an id", async () => {
    const render = () => <div>mine</div>;
    const id = toast.custom(render);
    const [fn, data] = await lastCall(sonner.toast.custom);
    expect(fn).toBe(render);
    expect(data.id).toBe(id);
  });
});

describe("toast — an action's default duration", () => {
  it("gives a toast with an action long enough to reach the button", async () => {
    toast.success("Deleted", { action: { label: "Undo", onClick: () => {} } });
    const [, data] = await lastCall(sonner.toast.success);
    expect(data.duration).toBe(TOAST_ACTION_DURATION);
    expect(TOAST_ACTION_DURATION).toBeGreaterThanOrEqual(8000);
  });

  it("lets an explicit duration win", async () => {
    toast.success("Deleted", { duration: 3000, action: { label: "Undo", onClick: () => {} } });
    const [, data] = await lastCall(sonner.toast.success);
    expect(data.duration).toBe(3000);
  });

  it("sets none without an action, leaving the Toaster's default", async () => {
    toast.success("Saved");
    const [, data] = await lastCall(sonner.toast.success);
    expect("duration" in data).toBe(false);
  });
});

describe("toast — redact", () => {
  it("wraps the message and the description in data-private", async () => {
    toast.error("DE89 3704 0044", { redact: true, description: "Konto 12" });
    const [message, data] = await lastCall(sonner.toast.error);
    for (const node of [message, data.description]) {
      expect(isValidElement(node)).toBe(true);
      expect((node as ReactElement<Record<string, unknown>>).props["data-private"]).toBe("");
    }
    expect((message as ReactElement<{ children: unknown }>).props.children).toBe("DE89 3704 0044");
    expect("redact" in data).toBe(false);
  });

  it("leaves them alone without it", async () => {
    toast.error("plain", { description: "desc" });
    const [message, data] = await lastCall(sonner.toast.error);
    expect(message).toBe("plain");
    expect(data.description).toBe("desc");
  });
});

describe("toast.promise", () => {
  it("shows loading, then success under the same id", async () => {
    const id = toast.promise(Promise.resolve(3), {
      loading: "Saving…",
      success: (n) => `Saved ${n}`,
      error: "Failed",
    });
    const [pending, loadingData] = await lastCall(sonner.toast.loading);
    expect(pending).toBe("Saving…");
    expect(loadingData.id).toBe(id);
    const [done, doneData] = await lastCall(sonner.toast.success);
    expect(done).toBe("Saved 3");
    expect(doneData.id).toBe(id);
    expect(sonner.toast.error).not.toHaveBeenCalled();
  });

  it("shows the error in place when it rejects, and runs finally", async () => {
    const onFinally = vi.fn();
    const id = toast.promise(() => Promise.reject(new Error("nope")), {
      loading: "Saving…",
      success: "Saved",
      error: (e) => `Failed: ${(e as Error).message}`,
      finally: onFinally,
    });
    const [message, data] = await lastCall(sonner.toast.error);
    expect(message).toBe("Failed: nope");
    expect(data.id).toBe(id);
    await vi.waitFor(() => expect(onFinally).toHaveBeenCalled());
  });

  it("dismisses the loading toast when there is nothing to say", async () => {
    const id = toast.promise(Promise.resolve(), { loading: "Working…" });
    await vi.waitFor(() => expect(sonner.toast.dismiss).toHaveBeenCalledWith(id));
  });
});

describe("toast.undo / toast.redo", () => {
  it("offers the step back as the action, success-toned, with the long duration", async () => {
    const onUndo = vi.fn();
    toast.undo("Transaction deleted", { onUndo });
    const [message, data] = await lastCall(sonner.toast.success);
    expect(message).toBe("Transaction deleted");
    const action = data.action as { label: string; onClick: () => void };
    expect(action.label).toBe("Undo");
    expect(data.duration).toBe(TOAST_ACTION_DURATION);
    action.onClick();
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("takes a tone and a label of its own", async () => {
    const onRedo = vi.fn();
    toast.redo("Restored", { onRedo, tone: "info", label: "Delete again" });
    const [, data] = await lastCall(sonner.toast.info);
    const action = data.action as { label: string; onClick: () => void };
    expect(action.label).toBe("Delete again");
    action.onClick();
    expect(onRedo).toHaveBeenCalledOnce();
  });
});
