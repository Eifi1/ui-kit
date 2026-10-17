import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTourProgress } from "../use-tour-progress";

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
});
