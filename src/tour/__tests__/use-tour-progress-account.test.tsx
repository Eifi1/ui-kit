import { act, render, renderHook } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";
import type { TourInfo } from "../tour-info";
import {
  completeTour,
  resetTourProgress,
  signOutTourProgress,
  useTourProgress,
  type TourProgressAccount,
  type TourProgressBody,
} from "../use-tour-progress";

/**
 * docs/tours-harmonization.md §10.2.4–§10.2.8, §10.3: the device key as the account's
 * cache, the `:pending` record, adopt, sign-out. Without `account` the 0.44 suite
 * (use-tour-progress.test.tsx) runs untouched.
 */

let n = 0;
/** A fresh key per test: the store and the accounts are module-wide, as in an app. */
const freshKey = () => `test.tours-account.${++n}`;

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

/** Let the queued sync and the account's promises run. */
async function settle() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

const later = (a: string | undefined, b: string) =>
  a === undefined || a === "" ? b : b === "" ? a : Date.parse(b) > Date.parse(a) ? b : a;

/** An account as server-kit's service answers it: the later completion wins, forget deletes. */
function fakeAccount(stored: Record<string, string> = {}, extra: Partial<TourProgressAccount> = {}) {
  const server = { ...stored };
  const saves: TourProgressBody[] = [];
  const account: TourProgressAccount = {
    load: vi.fn(async () => ({ completed: { ...server } })),
    save: vi.fn(async (body: TourProgressBody) => {
      saves.push(JSON.parse(JSON.stringify(body)) as TourProgressBody);
      for (const [id, at] of Object.entries(body.completed ?? {})) server[id] = later(server[id], at);
      for (const id of body.forget ?? []) delete server[id];
      return { completed: { ...server } };
    }),
    ...extra,
  };
  return { account, server, saves };
}

const pendingOf = (key: string) => JSON.parse(localStorage.getItem(`${key}:pending`) ?? "null");
const cacheOf = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null");
const refusal = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe("useTourProgress with an account", () => {
  it("paints from the cache at once, then the account's answer replaces it", async () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ budget: "2026-09-01T10:00:00.000Z" }));
    localStorage.setItem(`${storageKey}:pending`, JSON.stringify({ synced: true, completed: {}, forget: [] }));
    const { account } = fakeAccount({ import: "2026-10-01T10:00:00.000Z" });
    const { result } = renderHook(() => useTourProgress({ storageKey, account }));
    expect(result.current.completed).toEqual({ budget: "2026-09-01T10:00:00.000Z" });
    await settle();
    expect(account.load).toHaveBeenCalledTimes(1);
    expect(account.save).not.toHaveBeenCalled();
    expect(result.current.completed).toEqual({ import: "2026-10-01T10:00:00.000Z" });
  });

  it("uploads a never-synced device record whole on its first load, once", async () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ budget: "2026-09-01T10:00:00.000Z", old: "" }));
    const { account, saves } = fakeAccount({ import: "2026-10-01T10:00:00.000Z" });
    const { result, unmount } = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    expect(saves).toEqual([{ completed: { budget: "2026-09-01T10:00:00.000Z", old: "" } }]);
    expect(result.current.completed).toEqual({
      budget: "2026-09-01T10:00:00.000Z",
      old: null,
      import: "2026-10-01T10:00:00.000Z",
    });
    expect(pendingOf(storageKey)).toEqual({ synced: true, completed: {}, forget: [] });
    unmount();
    // Synced now: a later page sends nothing, it loads.
    signOutTourProgress(storageKey);
    localStorage.setItem(storageKey, JSON.stringify({ budget: "2026-09-01T10:00:00.000Z" }));
    renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    expect(account.save).toHaveBeenCalledTimes(1);
    expect(account.load).toHaveBeenCalledTimes(1);
  });

  it("a completion goes to the cache and the pending record at once, as ONE PATCH, cleared by the answer", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T09:00:00Z"));
    const storageKey = freshKey();
    const { account, saves } = fakeAccount();
    const { result } = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    let awarded = false;
    act(() => {
      awarded = result.current.complete("budget");
      result.current.complete("import");
    });
    // `awarded` is the device's answer against the cache (§10.2.4).
    expect(awarded).toBe(true);
    expect(result.current.completed).toEqual({
      budget: "2026-10-19T09:00:00.000Z",
      import: "2026-10-19T09:00:00.000Z",
    });
    expect(pendingOf(storageKey).completed).toEqual({
      budget: "2026-10-19T09:00:00.000Z",
      import: "2026-10-19T09:00:00.000Z",
    });
    await settle();
    expect(saves).toEqual([{ completed: { budget: "2026-10-19T09:00:00.000Z", import: "2026-10-19T09:00:00.000Z" } }]);
    expect(pendingOf(storageKey)).toEqual({ synced: true, completed: {}, forget: [] });
    expect(cacheOf(storageKey)).toEqual({ budget: "2026-10-19T09:00:00.000Z", import: "2026-10-19T09:00:00.000Z" });
  });

  it.each([
    ["offline", null],
    ["a 5xx", 503],
    ["a 401", 401],
  ])("%s keeps the pending record; it goes out on `online`", async (_name, status) => {
    const storageKey = freshKey();
    const { account, saves } = fakeAccount();
    const { result } = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    const save = account.save as ReturnType<typeof vi.fn>;
    if (status === null) Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    else save.mockRejectedValueOnce(refusal(status));
    act(() => {
      result.current.complete("budget");
    });
    await settle();
    expect(saves).toEqual([]);
    expect(Object.keys(pendingOf(storageKey).completed)).toEqual(["budget"]);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await settle();
    expect(saves).toHaveLength(1);
    expect(Object.keys(saves[0].completed!)).toEqual(["budget"]);
    expect(pendingOf(storageKey).completed).toEqual({});
  });

  it.each([403, 422])("a %s drops the pending record and logs", async (status) => {
    const storageKey = freshKey();
    const { account } = fakeAccount();
    const { result } = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    (account.save as ReturnType<typeof vi.fn>).mockRejectedValueOnce(refusal(status));
    act(() => {
      result.current.complete("budget");
    });
    await settle();
    expect(pendingOf(storageKey).completed).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`(${status})`), expect.anything());
    // The cache keeps the mark: the device still says done.
    expect(result.current.completed.budget).toBeTruthy();
  });

  it("“Mark as not done” sends `forget`", async () => {
    const storageKey = freshKey();
    localStorage.setItem(`${storageKey}:pending`, JSON.stringify({ synced: true, completed: {}, forget: [] }));
    const { account, saves, server } = fakeAccount({ budget: "2026-09-01T10:00:00.000Z" });
    const { result } = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    expect(result.current.completed.budget).toBe("2026-09-01T10:00:00.000Z");
    act(() => result.current.reset("budget"));
    expect(result.current.completed).toEqual({});
    expect(pendingOf(storageKey).forget).toEqual(["budget"]);
    await settle();
    expect(saves).toEqual([{ forget: ["budget"] }]);
    expect(server).toEqual({});
  });
});

describe("adopt (§10.2.5)", () => {
  it("discard: removes the old key on the first load, uploads nothing; twice is a no-op", async () => {
    const old = freshKey();
    localStorage.setItem(old, JSON.stringify(["addBuilding", "invoices"]));
    const { result: oldReader } = renderHook(() => useTourProgress({ storageKey: old }));
    expect(Object.keys(oldReader.current.completed)).toEqual([]); // no migrate: unread, not shown
    const storageKey = `${old}:42`;
    const { account, saves } = fakeAccount({}, { adopt: { storageKey: old, discard: true } });
    renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    expect(localStorage.getItem(old)).toBeNull();
    expect(saves).toEqual([]);
    expect(account.load).toHaveBeenCalledTimes(1);
    // A second account on the device: the old key is gone, nothing happens.
    const second = `${old}:43`;
    const other = fakeAccount({}, { adopt: { storageKey: old, discard: true } });
    renderHook(() => useTourProgress({ storageKey: second, account: other.account }));
    await settle();
    expect(other.saves).toEqual([]);
    expect(localStorage.getItem(old)).toBeNull();
  });

  it("migrate: the old record goes to the FIRST account once, then the key is removed", async () => {
    const old = freshKey();
    localStorage.setItem(old, JSON.stringify(["budget"]));
    const fromIds = (raw: unknown) =>
      Array.isArray(raw) ? Object.fromEntries(raw.map((id) => [String(id), null])) : undefined;
    const first = fakeAccount({}, { adopt: { storageKey: old, migrate: fromIds } });
    const { result } = renderHook(() => useTourProgress({ storageKey: `${old}:1`, account: first.account }));
    await settle();
    expect(first.saves).toEqual([{ completed: { budget: "" } }]);
    expect(result.current.completed).toEqual({ budget: null });
    expect(localStorage.getItem(old)).toBeNull();
    const second = fakeAccount({}, { adopt: { storageKey: old, migrate: fromIds } });
    const { result: theirs } = renderHook(() => useTourProgress({ storageKey: `${old}:2`, account: second.account }));
    await settle();
    expect(second.saves).toEqual([]);
    expect(theirs.current.completed).toEqual({});
  });

  it("warns in development when the account key is the key adopt takes over (both forms)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = freshKey();
    renderHook(() =>
      useTourProgress({ storageKey: a, account: fakeAccount({}, { adopt: { storageKey: a, discard: true } }).account }),
    );
    const b = freshKey();
    renderHook(() =>
      useTourProgress({ storageKey: b, account: fakeAccount({}, { adopt: { storageKey: b } }).account }),
    );
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain(`"${a}"`);
  });
});

describe("signOutTourProgress (§10.2.6)", () => {
  it("drops the cache and the snapshot, keeps :pending, sends nothing; the next person sees nothing", async () => {
    const storageKey = freshKey();
    const { account } = fakeAccount();
    const { result } = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    act(() => {
      result.current.complete("budget");
    });
    await settle();
    const calls =
      (account.load as ReturnType<typeof vi.fn>).mock.calls.length +
      (account.save as ReturnType<typeof vi.fn>).mock.calls.length;
    act(() => signOutTourProgress(storageKey));
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(result.current.completed).toEqual({});
    expect(Object.keys(pendingOf(storageKey).completed)).toEqual(["budget"]);
    expect(
      (account.load as ReturnType<typeof vi.fn>).mock.calls.length +
        (account.save as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(calls);
    // Another account on the PC: its own key, nothing of the first.
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    const next = fakeAccount();
    const { result: theirs } = renderHook(() => useTourProgress({ storageKey: freshKey(), account: next.account }));
    await settle();
    expect(theirs.current.completed).toEqual({});
    expect(next.saves).toEqual([]);
  });

  it("a 402 (a lapsed plan) parks the pending record: kept, not re-sent on this page; the next session sends it", async () => {
    const storageKey = freshKey();
    const { account, saves } = fakeAccount();
    const first = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    const save = account.save as ReturnType<typeof vi.fn>;
    save.mockRejectedValueOnce(refusal(402));
    act(() => {
      first.result.current.complete("budget");
    });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
    act(() => {
      first.result.current.complete("import");
      window.dispatchEvent(new Event("online"));
    });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
    expect(Object.keys(pendingOf(storageKey).completed).sort()).toEqual(["budget", "import"]);
    act(() => signOutTourProgress(storageKey));
    first.unmount();
    renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    expect(saves).toHaveLength(1);
    expect(Object.keys(saves[0].completed!).sort()).toEqual(["budget", "import"]);
  });

  it("a 401, then sign-out: the same person's next load sends the pending record", async () => {
    const storageKey = freshKey();
    const { account, saves, server } = fakeAccount();
    const first = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    (account.save as ReturnType<typeof vi.fn>).mockRejectedValueOnce(refusal(401));
    act(() => {
      first.result.current.complete("budget");
    });
    await settle();
    expect(saves).toEqual([]);
    act(() => signOutTourProgress(storageKey));
    first.unmount();
    const again = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    expect(saves).toHaveLength(1);
    expect(Object.keys(server)).toEqual(["budget"]);
    expect(Object.keys(again.result.current.completed)).toEqual(["budget"]);
    expect(pendingOf(storageKey).completed).toEqual({});
  });

  it("an answer that arrives after the sign-out never refills the cache", async () => {
    const storageKey = freshKey();
    localStorage.setItem(`${storageKey}:pending`, JSON.stringify({ synced: true, completed: {}, forget: [] }));
    let answer!: (value: { completed: Record<string, string> }) => void;
    const account: TourProgressAccount = {
      load: vi.fn(() => new Promise<{ completed: Record<string, string> }>((resolve) => (answer = resolve))),
      save: vi.fn(),
    };
    const { result } = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    act(() => signOutTourProgress(storageKey));
    answer({ completed: { budget: "2026-09-01T10:00:00.000Z" } });
    await settle();
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(result.current.completed).toEqual({});
  });
});

describe("the device reset and completeTour with an account", () => {
  it("resetTourProgress clears the cache only: the pending record stays", async () => {
    const storageKey = freshKey();
    const { account } = fakeAccount();
    const { result } = renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    act(() => {
      result.current.complete("budget");
    });
    act(() => resetTourProgress(storageKey));
    expect(result.current.completed).toEqual({});
    expect(Object.keys(pendingOf(storageKey).completed)).toEqual(["budget"]);
    expect(account.save).not.toHaveBeenCalled();
  });

  it("completeTour stays a device write, marked pending, with no request", async () => {
    const storageKey = freshKey();
    const { account } = fakeAccount();
    renderHook(() => useTourProgress({ storageKey, account }));
    await settle();
    completeTour(storageKey, "budget", "2026-09-01T10:00:00Z");
    await settle();
    expect(cacheOf(storageKey)).toEqual({ budget: "2026-09-01T10:00:00Z" });
    expect(pendingOf(storageKey).completed).toEqual({ budget: "2026-09-01T10:00:00Z" });
    expect(account.save).not.toHaveBeenCalled();
  });
});

describe("TourProvider with an account", () => {
  const STEPS: TourStep[] = [{ title: "Only", body: "One." }];
  const BUDGET: TourInfo = { id: "budget", title: "Budget", group: "start", points: 10 };

  it("awards as on the device, and the finish goes out as one PATCH", async () => {
    const storageKey = freshKey();
    const { account, saves } = fakeAccount();
    const onComplete = vi.fn();
    const engine: { current: ReturnType<typeof useTour> | null } = { current: null };
    function Capture() {
      const tour = useTour();
      useEffect(() => {
        engine.current = tour;
      });
      return null;
    }
    render(
      <TourProvider progress={{ storageKey, account }} onComplete={onComplete}>
        <Capture />
      </TourProvider>,
    );
    act(() => engine.current!.start(STEPS, { tour: BUDGET }));
    act(() => engine.current!.next());
    expect(onComplete).toHaveBeenCalledWith(BUDGET, { awarded: true });
    await settle();
    expect(saves).toHaveLength(1);
    expect(Object.keys(saves[0].completed!)).toEqual(["budget"]);
    act(() => engine.current!.start(STEPS, { tour: BUDGET }));
    act(() => engine.current!.next());
    expect(onComplete).toHaveBeenLastCalledWith(BUDGET, { awarded: false });
  });
});
