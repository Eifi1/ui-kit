import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { completeTour, resetTourProgress, useTourProgress } from "../use-tour-progress";

/** docs/tours-harmonization.md §2.6, §6.2 (device progress, migrate, notify) and §8. */

let n = 0;
/** A fresh key per test: the store is module-wide, as it is in an app. */
const freshKey = () => `test.tours.${++n}`;

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** keksdose's zustand `persist` store, as it sits in localStorage (tour-progress-store.ts). */
const KEKSDOSE = JSON.stringify({
  state: { completed: { budget: "2026-09-01T10:00:00.000Z", import: "2026-09-03T08:00:00.000Z" } },
  version: 1,
});
const fromKeksdose = (raw: unknown) => {
  const state = (raw as { state?: { completed?: Record<string, string> } } | null)?.state;
  return state?.completed;
};
/** kastlan's id list (completions.ts before 0.42's record). */
const fromKastlan = (raw: unknown) =>
  Array.isArray(raw) ? Object.fromEntries(raw.map((id) => [String(id), null])) : undefined;

describe("useTourProgress", () => {
  it("records a completion with its date under the app's key, and reads it back", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-17T09:00:00Z"));
    const storageKey = freshKey();
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    expect(result.current.completed).toEqual({});
    let first = false;
    act(() => {
      first = result.current.complete("budget");
    });
    expect(first).toBe(true);
    expect(result.current.completed).toEqual({ budget: "2026-10-17T09:00:00.000Z" });
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ budget: "2026-10-17T09:00:00.000Z" });
  });

  it("keeps the first completion: a replay changes nothing and awards nothing", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ budget: "2026-09-01T10:00:00.000Z" }));
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    let again = true;
    act(() => {
      again = result.current.complete("budget");
    });
    expect(again).toBe(false);
    expect(result.current.completed.budget).toBe("2026-09-01T10:00:00.000Z");
  });

  it("a completion from before the tour's update is replaced, and counts again (§8)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-17T09:00:00Z"));
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ budget: "2026-09-01T10:00:00.000Z" }));
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    const tour = { id: "budget", updated: { date: "2026-10-10", reason: "Moved." } };
    let counted = false;
    act(() => {
      counted = result.current.complete(tour);
    });
    expect(counted).toBe(true);
    expect(result.current.completed.budget).toBe("2026-10-17T09:00:00.000Z");
    act(() => {
      counted = result.current.complete(tour);
    });
    expect(counted).toBe(false);
  });

  it("reset forgets one completion", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ a: "2026-09-01", b: null }));
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    act(() => result.current.reset("a"));
    expect(result.current.completed).toEqual({ b: null });
  });

  it("reads keksdose's zustand store through migrate, and writes its own shape after", () => {
    const storageKey = "keksdose-tour-progress";
    localStorage.setItem(storageKey, KEKSDOSE);
    const { result } = renderHook(() => useTourProgress({ storageKey, migrate: fromKeksdose }));
    expect(result.current.completed).toEqual({
      budget: "2026-09-01T10:00:00.000Z",
      import: "2026-09-03T08:00:00.000Z",
    });
    act(() => result.current.reset("import"));
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ budget: "2026-09-01T10:00:00.000Z" });
    expect(result.current.completed).toEqual({ budget: "2026-09-01T10:00:00.000Z" });
  });

  it("reads kastlan's id array through migrate, completed without a date", () => {
    const storageKey = "kastlan.tours.completions";
    localStorage.setItem(storageKey, JSON.stringify(["create-estate", "create-invoice"]));
    const { result } = renderHook(() => useTourProgress({ storageKey, migrate: fromKastlan }));
    expect(result.current.completed).toEqual({ "create-estate": null, "create-invoice": null });
  });

  it("reads kastlan's 0.42 record without migrate, an empty date as none", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ a: "", b: "2026-10-01T00:00:00Z", junk: 3 }));
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    expect(result.current.completed).toEqual({ a: null, b: "2026-10-01T00:00:00Z" });
  });

  it("an unreadable value, or a migrate that throws, reads as nothing done", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, "not json");
    const { result } = renderHook(() =>
      useTourProgress({
        storageKey,
        migrate: () => {
          throw new Error("boom");
        },
      }),
    );
    expect(result.current.completed).toEqual({});
  });

  it("blocked storage throws nowhere, and keeps the marks for this page's life", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const storageKey = freshKey();
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    expect(result.current.completed).toEqual({});
    act(() => {
      result.current.complete("a");
    });
    expect(Object.keys(result.current.completed)).toEqual(["a"]);
  });

  it("two readers in one tab agree without a reload (the in-tab emitter, ka F3)", () => {
    const storageKey = freshKey();
    const page = renderHook(() => useTourProgress({ storageKey }));
    const menu = renderHook(() => useTourProgress({ storageKey }));
    act(() => {
      page.result.current.complete("a");
    });
    expect(Object.keys(menu.result.current.completed)).toEqual(["a"]);
  });

  it("another tab's write arrives through the storage event", () => {
    const storageKey = freshKey();
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    act(() => {
      localStorage.setItem(storageKey, JSON.stringify({ x: "2026-10-01" }));
      window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
    });
    expect(result.current.completed).toEqual({ x: "2026-10-01" });
    // Another key's event changes nothing.
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    });
    expect(result.current.completed).toEqual({ x: "2026-10-01" });
  });

  it("keeps the record's identity while nothing changes", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ a: null }));
    const { result, rerender } = renderHook(() => useTourProgress({ storageKey }));
    const before = result.current.completed;
    rerender();
    expect(result.current.completed).toBe(before);
  });

  it("three readers of one key, each with its own inline migrate, render without a loop (kastlan B1)", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify(["a", "b"]));
    const calls = vi.fn();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    function Reader({ name }: { name: string }) {
      // A new arrow every render, in every reader: the shape kastlan has in three places.
      const { completed } = useTourProgress({
        storageKey,
        migrate: (raw) => {
          calls();
          return fromKastlan(raw);
        },
      });
      return <p data-testid={name}>{Object.keys(completed).join(",")}</p>;
    }
    function Page() {
      return (
        <>
          <Reader name="page" />
          <Reader name="menu" />
          <Reader name="header" />
        </>
      );
    }
    const { rerender } = render(<Page />);
    rerender(<Page />);
    for (const name of ["page", "menu", "header"]) expect(screen.getByTestId(name)).toHaveTextContent("a,b");
    // migrate ran once for the stored text, not once per reader or per render.
    expect(calls).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
  });

  it("does not run migrate on the kit's own shape", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ a: "2026-09-01", b: null }));
    const migrate = vi.fn(() => ({ wrong: null }));
    const { result } = renderHook(() => useTourProgress({ storageKey, migrate }));
    expect(result.current.completed).toEqual({ a: "2026-09-01", b: null });
    expect(migrate).not.toHaveBeenCalled();
  });

  it("resetTourProgress clears the key and the page's memory, and every reader moves at once", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ a: "2026-09-01" }));
    const page = renderHook(() => useTourProgress({ storageKey }));
    const menu = renderHook(() => useTourProgress({ storageKey }));
    act(() => resetTourProgress(storageKey));
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(page.result.current.completed).toEqual({});
    expect(menu.result.current.completed).toEqual({});

    // Storage refuses writes: the mark lives in memory, and the reset forgets it too.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    act(() => {
      page.result.current.complete("b");
    });
    expect(Object.keys(menu.result.current.completed)).toEqual(["b"]);
    act(() => resetTourProgress(storageKey));
    expect(page.result.current.completed).toEqual({});
    expect(menu.result.current.completed).toEqual({});
  });

  it("one written form: a completion without a date is stored as \"\" and read as null (§9.6.6)", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ a: null }));
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    act(() => {
      result.current.complete("b");
    });
    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    expect(stored.a).toBe("");
    expect(result.current.completed.a).toBeNull();
  });
});

describe("completeTour", () => {
  it("writes the kit's shape, keeps the other marks, and moves this tab's readers without a storage event", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-17T09:00:00Z"));
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ a: "2026-09-01T10:00:00.000Z" }));
    const page = renderHook(() => useTourProgress({ storageKey }));
    const menu = renderHook(() => useTourProgress({ storageKey }));
    const dispatch = vi.spyOn(window, "dispatchEvent");

    act(() => completeTour(storageKey, "b"));
    act(() => completeTour(storageKey, { id: "c" }, "2026-10-01T08:00:00Z"));
    act(() => completeTour(storageKey, "d", new Date("2026-10-02T08:00:00Z")));
    act(() => completeTour(storageKey, "e", null));

    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({
      a: "2026-09-01T10:00:00.000Z",
      b: "2026-10-17T09:00:00.000Z",
      c: "2026-10-01T08:00:00Z",
      d: "2026-10-02T08:00:00.000Z",
      e: "",
    });
    expect(dispatch.mock.calls.some(([event]) => event.type === "storage")).toBe(false);
    for (const reader of [page, menu]) {
      expect(reader.result.current.completed).toEqual({
        a: "2026-09-01T10:00:00.000Z",
        b: "2026-10-17T09:00:00.000Z",
        c: "2026-10-01T08:00:00Z",
        d: "2026-10-02T08:00:00.000Z",
        e: null,
      });
    }
  });

  it("seeds a key before any reader mounts", () => {
    const storageKey = freshKey();
    completeTour(storageKey, "budget", "2026-09-01");
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    expect(result.current.completed).toEqual({ budget: "2026-09-01" });
    expect(result.current.complete("budget")).toBe(false);
  });
});

describe("a key's migrate is remembered, and an unreadable record is never overwritten (keksdose B-1, B-2)", () => {
  it("a reader without migrate first no longer hides the old completions from one with it (B-2)", async () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, KEKSDOSE);
    const bare = renderHook(() => useTourProgress({ storageKey }));
    expect(bare.result.current.completed).toEqual({});
    const withMigrate = renderHook(() => useTourProgress({ storageKey, migrate: fromKeksdose }));
    expect(Object.keys(withMigrate.result.current.completed)).toEqual(["budget", "import"]);
    // The bare reader learns the key's migrate too, without a write.
    await act(async () => {});
    expect(Object.keys(bare.result.current.completed)).toEqual(["budget", "import"]);
  });

  it("completeTour reads a zustand-v1 envelope through the key's registered migrate, keeping the old marks", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, KEKSDOSE);
    renderHook(() => useTourProgress({ storageKey, migrate: fromKeksdose }));
    act(() => completeTour(storageKey, "goals", "2026-10-01T08:00:00Z"));
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({
      budget: "2026-09-01T10:00:00.000Z",
      import: "2026-09-03T08:00:00.000Z",
      goals: "2026-10-01T08:00:00Z",
    });
  });

  it("completeTour takes {migrate} for a key no reader has registered yet", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, KEKSDOSE);
    completeTour(storageKey, "goals", "2026-10-01T08:00:00Z", { migrate: fromKeksdose });
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKey)!))).toEqual(["budget", "import", "goals"]);
  });

  it("with no migrate for an old shape, completeTour and complete throw and overwrite nothing (B-1)", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, KEKSDOSE);
    expect(() => completeTour(storageKey, "goals")).toThrow(/not the kit's shape/);
    expect(localStorage.getItem(storageKey)).toBe(KEKSDOSE);
    const { result } = renderHook(() => useTourProgress({ storageKey }));
    expect(() => result.current.complete("goals")).toThrow(/not the kit's shape/);
    expect(localStorage.getItem(storageKey)).toBe(KEKSDOSE);
  });

  it("an empty key, or the kit's shape, is written without a migrate", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, "");
    completeTour(storageKey, "a", null);
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ a: "" });
    completeTour(storageKey, "b", "2026-10-01");
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ a: "", b: "2026-10-01" });
  });
});
