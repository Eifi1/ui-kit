import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  TEXT_SCALE,
  TEXT_SIZES,
  TEXT_SIZE_INLINE_SCRIPT,
  applyPersistedTextSize,
  applyTextSize,
  createTextSizeStore,
  readPersistedTextSize,
  resolveTextSize,
  useTextSize,
} from "../text-size";

/**
 * The text size's mechanism (docs/text-size-harmonization.md §3.1, §10.3, §10.6): the
 * frozen vocabulary and storage, the pre-paint call with and without the account's last
 * known value, the inline snippet that must say the same, the store, and `useTextSize`
 * following `<html data-text-size>` whoever wrote it.
 */

const KEY = "test-text-size";
const root = () => document.documentElement;

afterEach(() => {
  localStorage.clear();
  root().removeAttribute("data-text-size");
});

function store(size: unknown) {
  localStorage.setItem(KEY, JSON.stringify({ state: { size }, version: 1 }));
}

describe("the vocabulary", () => {
  it("is server-kit's TEXT_SIZES, in order, with their scales", () => {
    expect(TEXT_SIZES).toEqual(["normal", "large", "xlarge"]);
    expect(TEXT_SCALE).toEqual({ normal: 1, large: 1.25, xlarge: 1.5 });
  });

  it("resolves the device's choice, then the account's, then Normal", () => {
    expect(resolveTextSize("large", "xlarge")).toBe("large");
    expect(resolveTextSize(null, "xlarge")).toBe("xlarge");
    expect(resolveTextSize("huge", "tiny")).toBe("normal");
    expect(resolveTextSize(undefined, undefined)).toBe("normal");
  });
});

describe("readPersistedTextSize — the frozen format", () => {
  it("reads {state:{size}} and nothing else", () => {
    store("xlarge");
    expect(readPersistedTextSize(KEY)).toBe("xlarge");
    store(null);
    expect(readPersistedTextSize(KEY)).toBeNull();
    store("huge");
    expect(readPersistedTextSize(KEY)).toBeNull();
    localStorage.setItem(KEY, "{not json");
    expect(readPersistedTextSize(KEY)).toBeNull();
    localStorage.removeItem(KEY);
    expect(readPersistedTextSize(KEY)).toBeNull();
  });
});

describe("applyPersistedTextSize — pre-paint", () => {
  it("puts the device's choice on <html> and returns it", () => {
    store("large");
    expect(applyPersistedTextSize(KEY)).toBe("large");
    expect(root().getAttribute("data-text-size")).toBe("large");
  });

  it("paints Normal with nothing stored and no account", () => {
    expect(applyPersistedTextSize(KEY)).toBe("normal");
    expect(root().getAttribute("data-text-size")).toBe("normal");
  });

  it("falls back to the account's last known value on a device without a choice (§10.3)", () => {
    expect(applyPersistedTextSize(KEY, { account: () => "xlarge" })).toBe("xlarge");
    expect(root().getAttribute("data-text-size")).toBe("xlarge");
  });

  it("lets the device's own choice win over the account", () => {
    store("normal");
    expect(applyPersistedTextSize(KEY, { account: () => "xlarge" })).toBe("normal");
  });

  it("treats a throwing or unknown account value as none", () => {
    expect(
      applyPersistedTextSize(KEY, {
        account: () => {
          throw new Error("no persisted user");
        },
      }),
    ).toBe("normal");
    expect(applyPersistedTextSize(KEY, { account: () => "huge" })).toBe("normal");
    expect(applyPersistedTextSize(KEY, { account: () => null })).toBe("normal");
  });
});

describe("TEXT_SIZE_INLINE_SCRIPT — the boot splash's copy", () => {
  const snippet = new Function(`return ${TEXT_SIZE_INLINE_SCRIPT}`)() as (
    key: string,
    account?: () => unknown,
  ) => void;

  const cases: [string, unknown, (() => unknown) | undefined][] = [
    ["a stored size", "large", undefined],
    ["a stored size over the account", "normal", () => "xlarge"],
    ["the account without a stored size", null, () => "large"],
    ["an unknown stored value, falling to the account", "huge", () => "xlarge"],
    ["nothing at all", undefined, undefined],
    ["a throwing account", null, () => {
      throw new Error("x");
    }],
    ["an unknown account value", null, () => "tiny"],
  ];

  for (const [name, stored, account] of cases) {
    it(`agrees with applyPersistedTextSize: ${name}`, () => {
      if (stored !== undefined) store(stored);
      const expected = applyPersistedTextSize(KEY, { account: account as (() => string) | undefined });
      root().removeAttribute("data-text-size");
      snippet(KEY, account);
      expect(root().getAttribute("data-text-size")).toBe(expected);
    });
  }

  it("never throws, even on malformed storage", () => {
    localStorage.setItem(KEY, "{not json");
    expect(() => snippet(KEY)).not.toThrow();
    expect(root().getAttribute("data-text-size")).toBe("normal");
  });
});

describe("createTextSizeStore", () => {
  it("persists the device's choice in the frozen format", () => {
    const { useTextSizeStore } = createTextSizeStore(KEY);
    expect(useTextSizeStore.getState().size).toBeNull();
    // Nothing written until a choice is made: an unchosen device stays unchosen.
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => useTextSizeStore.getState().setSize("xlarge"));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ state: { size: "xlarge" }, version: 1 });
    expect(readPersistedTextSize(KEY)).toBe("xlarge");
  });

  it("rehydrates only a known size", () => {
    store("huge");
    const { useTextSizeStore } = createTextSizeStore(KEY);
    expect(useTextSizeStore.getState().size).toBeNull();
  });

  it("applies device → account → Normal on <html>", () => {
    const { useTextSizeStore, useApplyTextSize } = createTextSizeStore(KEY);
    const { result, rerender } = renderHook(({ account }: { account?: string | null }) => useApplyTextSize({ account }), {
      initialProps: { account: undefined as string | null | undefined },
    });
    expect(result.current).toBe("normal");
    expect(root().getAttribute("data-text-size")).toBe("normal");

    rerender({ account: "large" });
    expect(result.current).toBe("large");
    expect(root().getAttribute("data-text-size")).toBe("large");

    act(() => useTextSizeStore.getState().setSize("xlarge"));
    expect(result.current).toBe("xlarge");
    expect(root().getAttribute("data-text-size")).toBe("xlarge");

    // Forgetting the device's choice hands the size back to the account.
    act(() => useTextSizeStore.getState().setSize(null));
    expect(root().getAttribute("data-text-size")).toBe("large");
  });
});

describe("useTextSize", () => {
  function Probe() {
    const { size, scale } = useTextSize();
    return <output>{`${size} ${scale}`}</output>;
  }

  it("answers Normal without an attribute", () => {
    render(<Probe />);
    expect(screen.getByRole("status")).toHaveTextContent("normal 1");
  });

  it("follows applyTextSize at once", () => {
    render(<Probe />);
    act(() => applyTextSize("xlarge"));
    expect(screen.getByRole("status")).toHaveTextContent("xlarge 1.5");
  });

  it("follows a writer that is not the kit (the inline snippet, a test)", async () => {
    render(<Probe />);
    await act(async () => {
      root().setAttribute("data-text-size", "large");
      // MutationObserver callbacks are microtasks.
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("large 1.25");
  });
});
