import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  matchOfferedLanguage,
  resolveAccountLanguage,
  useAccountLanguage,
  type UseAccountLanguageOptions,
} from "../use-account-language";

/**
 * The language on a device (docs/settings-harmonization.md §6.2, §10.8): device → account
 * → browser → default; the account applies at sign-in unless the device chose; a pick
 * writes the device and the account, except in a demo; nothing writes the account by
 * itself.
 */

const OFFERED = ["en", "de-CH", "fr"];

describe("matchOfferedLanguage", () => {
  it("normalises case and separator and matches exactly first", () => {
    expect(matchOfferedLanguage("DE_ch", OFFERED)).toBe("de-CH");
    expect(matchOfferedLanguage("fr", OFFERED)).toBe("fr");
  });

  it("falls back to the offered tag of the same language", () => {
    expect(matchOfferedLanguage("de", OFFERED)).toBe("de-CH");
    expect(matchOfferedLanguage("de-DE", OFFERED)).toBe("de-CH");
    expect(matchOfferedLanguage("en-GB", OFFERED)).toBe("en");
  });

  it("answers null for anything else", () => {
    expect(matchOfferedLanguage("it", OFFERED)).toBeNull();
    expect(matchOfferedLanguage("", OFFERED)).toBeNull();
    expect(matchOfferedLanguage(null, OFFERED)).toBeNull();
  });
});

describe("resolveAccountLanguage — the order", () => {
  const base = { offered: OFFERED, fallback: "en", browser: ["fr-FR", "en"] };

  it("takes the device's own choice first", () => {
    expect(resolveAccountLanguage({ ...base, device: "de-CH", account: "fr" })).toEqual({ language: "de-CH", source: "device" });
  });

  it("then the account", () => {
    expect(resolveAccountLanguage({ ...base, device: null, account: "de" })).toEqual({ language: "de-CH", source: "account" });
  });

  it("then the browser, the first offered of its languages", () => {
    expect(resolveAccountLanguage({ ...base, device: null, account: undefined })).toEqual({ language: "fr", source: "browser" });
    expect(resolveAccountLanguage({ ...base, device: null, account: null, browser: ["it", "en-US"] })).toEqual({
      language: "en",
      source: "browser",
    });
  });

  it("then the default", () => {
    expect(resolveAccountLanguage({ ...base, device: "xx", account: "yy", browser: ["it"] })).toEqual({
      language: "en",
      source: "default",
    });
  });
});

function setup(overrides: Partial<UseAccountLanguageOptions> = {}) {
  const setDevice = vi.fn();
  const save = vi.fn(() => Promise.resolve());
  const initial: UseAccountLanguageOptions = {
    account: undefined,
    device: null,
    setDevice,
    save,
    offered: OFFERED,
    fallback: "en",
    browser: ["fr"],
    ...overrides,
  };
  const hook = renderHook((props: UseAccountLanguageOptions) => useAccountLanguage(props), { initialProps: initial });
  return { ...hook, setDevice, save, initial };
}

describe("useAccountLanguage", () => {
  it("adopts the account's language at sign-in on a device without a choice — and writes nothing", () => {
    const { result, rerender, setDevice, save, initial } = setup();
    expect(result.current).toMatchObject({ language: "fr", source: "browser" });
    rerender({ ...initial, account: "de-CH" });
    expect(result.current).toMatchObject({ language: "de-CH", source: "account" });
    expect(setDevice).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps the device's own choice at sign-in", () => {
    const { result, rerender, save, initial } = setup({ device: "en" });
    rerender({ ...initial, device: "en", account: "de-CH" });
    expect(result.current).toMatchObject({ language: "en", source: "device" });
    expect(save).not.toHaveBeenCalled();
  });

  it("writes the device and the account on a pick", async () => {
    const { result, setDevice, save } = setup({ account: "de-CH" });
    await act(() => result.current.pick("fr"));
    expect(setDevice).toHaveBeenCalledWith("fr");
    expect(save).toHaveBeenCalledWith("fr");
  });

  it("keeps a demo's pick on the device", async () => {
    const { result, setDevice, save } = setup({ account: "de-CH", isDemo: true });
    await act(() => result.current.pick("fr"));
    expect(setDevice).toHaveBeenCalledWith("fr");
    expect(save).not.toHaveBeenCalled();
  });

  it("writes only the device while signed out", async () => {
    const { result, setDevice, save } = setup({ account: undefined });
    await act(() => result.current.pick("de-CH"));
    expect(setDevice).toHaveBeenCalledWith("de-CH");
    expect(save).not.toHaveBeenCalled();
  });

  it("hands back a failing save, with the device already switched", async () => {
    const failure = new Error("422");
    const { result, setDevice } = setup({ account: "en", save: () => Promise.reject(failure) });
    await expect(result.current.pick("fr")).rejects.toBe(failure);
    expect(setDevice).toHaveBeenCalledWith("fr");
  });
});
