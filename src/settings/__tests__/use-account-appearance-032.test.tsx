import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  resolveAccountAppearance,
  useAccountAppearance,
  type UseAccountAppearanceOptions,
} from "../use-account-appearance";

/**
 * The text size and contrast follow the account like the language (docs/
 * text-size-harmonization.md §2.2, §2.6, §6): device → account → default; nothing writes
 * the account on its own; a pick writes the device and the account, except in a demo.
 */

describe("resolveAccountAppearance — the order", () => {
  it("takes the device's own choice first", () => {
    expect(
      resolveAccountAppearance({ textSize: "large", contrast: "standard" }, { text_size: "xlarge", contrast: "more" }),
    ).toEqual({
      textSize: "large",
      contrast: "standard",
      sources: { textSize: "device", contrast: "device" },
    });
  });

  it("then the account's", () => {
    expect(resolveAccountAppearance({ textSize: null, contrast: null }, { text_size: "xlarge", contrast: "more" })).toEqual({
      textSize: "xlarge",
      contrast: "more",
      sources: { textSize: "account", contrast: "account" },
    });
  });

  it("then the default: Normal, and System for contrast", () => {
    expect(resolveAccountAppearance({}, { text_size: null, contrast: null })).toEqual({
      textSize: "normal",
      contrast: "system",
      sources: { textSize: "default", contrast: "default" },
    });
    expect(resolveAccountAppearance({ textSize: "huge" }, undefined).sources.textSize).toBe("default");
  });

  it("treats each value on its own", () => {
    const r = resolveAccountAppearance({ textSize: "large", contrast: null }, { text_size: null, contrast: "more" });
    expect(r.sources).toEqual({ textSize: "device", contrast: "account" });
  });
});

function setup(overrides: Partial<UseAccountAppearanceOptions> = {}) {
  const setDevice = vi.fn();
  const save = vi.fn(() => Promise.resolve("saved"));
  const options: UseAccountAppearanceOptions = {
    account: { text_size: null, contrast: null },
    device: { textSize: null, contrast: null },
    setDevice,
    save,
    ...overrides,
  };
  const hook = renderHook((props: UseAccountAppearanceOptions) => useAccountAppearance(props), { initialProps: options });
  return { ...hook, setDevice, save, options };
}

describe("useAccountAppearance", () => {
  it("never writes on its own — not on render, not when the account arrives", () => {
    const { rerender, setDevice, save, options } = setup({ account: undefined });
    rerender({ ...options, account: { text_size: "xlarge", contrast: "more" } });
    rerender({ ...options, account: { text_size: "large", contrast: "standard" } });
    expect(setDevice).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("adopts the account's values on a device without its own", () => {
    const { result, rerender, options } = setup({ account: undefined });
    expect(result.current.textSize).toBe("normal");
    rerender({ ...options, account: { text_size: "xlarge", contrast: "more" } });
    expect(result.current.textSize).toBe("xlarge");
    expect(result.current.contrast).toBe("more");
    expect(result.current.sources.textSize).toBe("account");
  });

  it("a pick writes the device, then the account, one field each", async () => {
    const { result, setDevice, save } = setup();
    await act(async () => {
      await expect(result.current.pickTextSize("large")).resolves.toBe("saved");
    });
    expect(setDevice).toHaveBeenLastCalledWith({ textSize: "large" });
    expect(save).toHaveBeenLastCalledWith({ text_size: "large" });

    await act(async () => {
      await result.current.pickContrast("system");
    });
    expect(setDevice).toHaveBeenLastCalledWith({ contrast: "system" });
    expect(save).toHaveBeenLastCalledWith({ contrast: "system" });
  });

  it("a demo writes only the device (§6)", async () => {
    const { result, setDevice, save } = setup({ isDemo: true });
    await act(async () => {
      await result.current.pickTextSize("xlarge");
      await result.current.pickContrast("more");
    });
    expect(setDevice).toHaveBeenCalledTimes(2);
    expect(save).not.toHaveBeenCalled();
  });

  it("signed out writes only the device", async () => {
    const { result, setDevice, save } = setup({ account: null });
    await act(async () => {
      await result.current.pickTextSize("large");
    });
    expect(setDevice).toHaveBeenCalledWith({ textSize: "large" });
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps the device's pick when the save fails, and hands the failure back", async () => {
    const save = vi.fn(() => {
      throw new Error("offline");
    });
    const { result, setDevice } = setup({ save });
    await act(async () => {
      await expect(result.current.pickContrast("more")).rejects.toThrow("offline");
    });
    expect(setDevice).toHaveBeenCalledWith({ contrast: "more" });
  });
});
