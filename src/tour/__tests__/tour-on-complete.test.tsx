import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { TourProvider, useTour, type TourStep } from "../tour";
import type { TourInfo } from "../tour-info";
import { useTourProgress, type UseTourProgressOptions } from "../use-tour-progress";

/**
 * docs/tours-harmonization.md §9.6: the provider records a finished tour once, through the
 * shared progress store, then calls `onComplete`, then the start's own `onFinish`.
 */

let n = 0;
const freshKey = () => `test.tour-complete.${++n}`;

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

const STEPS: TourStep[] = [
  { title: "Welcome", body: "First." },
  { title: "Done", body: "Second." },
];
const BUDGET: TourInfo = { id: "budget", title: "Budget", group: "start", points: 10 };

type Engine = ReturnType<typeof useTour>;

function Capture({ onEngine }: { onEngine: (engine: Engine) => void }) {
  const engine = useTour();
  useEffect(() => {
    onEngine(engine);
  });
  return null;
}

/** The page's own reader of the key, beside the provider. */
function Reader({ storageKey }: { storageKey: string }) {
  const { completed } = useTourProgress({ storageKey });
  return <p data-testid="reader">{Object.keys(completed).join(",")}</p>;
}

function setup(props: { progress?: UseTourProgressOptions; onComplete?: Parameters<typeof TourProvider>[0]["onComplete"] }, extra?: ReactNode) {
  const engine: { current: Engine | null } = { current: null };
  const tree = (p: typeof props) => (
    <TourProvider {...p}>
      <Capture
        onEngine={(e) => {
          engine.current = e;
        }}
      />
      {extra}
    </TourProvider>
  );
  const view = render(tree(props));
  return { engine: () => engine.current!, rerender: (p: typeof props) => view.rerender(tree(p)) };
}

/** Start, then step past the last step. */
function runThrough(engine: () => Engine, opts: Parameters<Engine["start"]>[1]) {
  act(() => engine().start(STEPS, opts));
  act(() => engine().next());
  act(() => engine().next());
}

describe("TourProvider onComplete", () => {
  it("writes once, then onComplete with awarded, then the start's onFinish; a replay awards nothing", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-17T09:00:00Z"));
    const storageKey = freshKey();
    const order: string[] = [];
    const onComplete = vi.fn((tour: TourInfo | undefined, { awarded }: { awarded: boolean | undefined }) => {
      // The write has happened by now, in the kit's shape.
      order.push(`complete:${tour?.id}:${awarded}:${localStorage.getItem(storageKey)}`);
    });
    const { engine } = setup({ progress: { storageKey }, onComplete }, <Reader storageKey={storageKey} />);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    runThrough(engine, { tour: BUDGET, onFinish: () => order.push("finish") });
    expect(order).toEqual([`complete:budget:true:{"budget":"2026-10-17T09:00:00.000Z"}`, "finish"]);
    expect(setItem.mock.calls.filter(([key]) => key === storageKey)).toHaveLength(1);
    expect(onComplete.mock.calls[0][0]).toBe(BUDGET);
    // The page's reader shares the store: it moved without a reload.
    expect(screen.getByTestId("reader")).toHaveTextContent("budget");
    expect(engine().active).toBe(false);

    runThrough(engine, { tour: BUDGET });
    expect(onComplete).toHaveBeenLastCalledWith(BUDGET, { awarded: false });
    expect(setItem.mock.calls.filter(([key]) => key === storageKey)).toHaveLength(1);
    setItem.mockRestore();
  });

  it("awards again after the tour's update (§8), as complete(tour) would", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify({ budget: "2026-09-01T10:00:00.000Z" }));
    const onComplete = vi.fn();
    const { engine } = setup({ progress: { storageKey }, onComplete });
    const updated = { ...BUDGET, updated: { date: "2026-10-10" } };
    runThrough(engine, { tour: updated });
    expect(onComplete).toHaveBeenCalledWith(updated, { awarded: true });
  });

  it("reads through the app's migrate, and writes the kit's shape after", () => {
    const storageKey = freshKey();
    localStorage.setItem(storageKey, JSON.stringify(["intro"]));
    const migrate = (raw: unknown) =>
      Array.isArray(raw) ? Object.fromEntries(raw.map((id) => [String(id), null])) : undefined;
    const onComplete = vi.fn();
    const { engine } = setup({ progress: { storageKey, migrate }, onComplete });
    runThrough(engine, { tour: BUDGET });
    expect(onComplete).toHaveBeenCalledWith(BUDGET, { awarded: true });
    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    // One written form: the dateless completion is "", never null.
    expect(stored.intro).toBe("");
    expect(typeof stored.budget).toBe("string");
  });

  it("never on a skip or stop(): no write, no onComplete, no onFinish", () => {
    const storageKey = freshKey();
    const onComplete = vi.fn();
    const onFinish = vi.fn();
    const { engine } = setup({ progress: { storageKey }, onComplete });
    act(() => engine().start(STEPS, { tour: BUDGET, onFinish }));
    act(() => engine().stop());
    expect(engine().active).toBe(false);

    const onSkip = vi.fn();
    act(() => engine().start(STEPS, { tour: BUDGET, onFinish, onSkip }));
    act(() => engine().next());
    // Esc is the overlay's skip.
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("without progress, or without a tour, onComplete still fires with awarded undefined", () => {
    const storageKey = freshKey();
    const bare = vi.fn();
    const first = setup({ onComplete: bare });
    runThrough(first.engine, { tour: BUDGET });
    expect(bare).toHaveBeenCalledWith(BUDGET, { awarded: undefined });

    const noTour = vi.fn();
    const second = setup({ progress: { storageKey }, onComplete: noTour });
    runThrough(second.engine, { id: "budget" });
    expect(noTour).toHaveBeenCalledWith(undefined, { awarded: undefined });
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("the provider's migrate serves a bare reader, and an unreadable record is not overwritten (keksdose B-1, B-2)", async () => {
    const storageKey = freshKey();
    const zustand = JSON.stringify({ state: { completed: { intro: "2026-09-01T10:00:00.000Z" } }, version: 1 });
    localStorage.setItem(storageKey, zustand);
    const migrate = (raw: unknown) =>
      (raw as { state?: { completed?: Record<string, string> } } | null)?.state?.completed;
    const onComplete = vi.fn();
    const { engine } = setup({ progress: { storageKey, migrate }, onComplete }, <Reader storageKey={storageKey} />);
    await act(async () => {});
    expect(screen.getByTestId("reader")).toHaveTextContent("intro");
    runThrough(engine, { tour: BUDGET });
    expect(onComplete).toHaveBeenCalledWith(BUDGET, { awarded: true });
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKey)!))).toEqual(["intro", "budget"]);

    // A key in an old shape that no migrate reads: the finish writes nothing.
    const other = freshKey();
    localStorage.setItem(other, zustand);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const second = vi.fn();
    const onFinish = vi.fn();
    const bare = setup({ progress: { storageKey: other }, onComplete: second });
    runThrough(bare.engine, { tour: BUDGET, onFinish });
    expect(localStorage.getItem(other)).toBe(zustand);
    expect(second).toHaveBeenCalledWith(BUDGET, { awarded: false });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(bare.engine().active).toBe(false);
    expect(errors.mock.calls.some(([e]) => String(e).includes("not the kit's shape"))).toBe(true);
    errors.mockRestore();
  });

  it("in development, warns once when progress is set but a finished start carried no tour", () => {
    vi.stubEnv("VITEST", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { engine } = setup({ progress: { storageKey: freshKey() } });
    runThrough(engine, { id: "budget" });
    runThrough(engine, { id: "budget" });
    expect(warn.mock.calls.filter(([m]) => String(m).includes("carried no `tour`"))).toHaveLength(1);
    warn.mockRestore();
    vi.unstubAllEnvs();
  });

  it("mounts bare, and a start's tour is the active id", () => {
    const onFinish = vi.fn();
    const { engine } = setup({});
    act(() => engine().start(STEPS, { tour: BUDGET }));
    expect(engine().activeId).toBe("budget");
    act(() => engine().next());
    act(() => engine().next());
    runThrough(engine, { onFinish });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("a second Done before the overlay goes records and reports nothing more", () => {
    const storageKey = freshKey();
    const onComplete = vi.fn();
    const onFinish = vi.fn();
    const { engine } = setup({ progress: { storageKey }, onComplete });
    act(() => engine().start(STEPS, { tour: BUDGET, onFinish }));
    act(() => engine().next());
    act(() => {
      engine().next();
      engine().next();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("follows a storageKey change without a remount (an account switch, KS)", () => {
    const alice = freshKey();
    const bob = freshKey();
    localStorage.setItem(alice, JSON.stringify({ budget: "2026-09-01T10:00:00.000Z" }));
    const onComplete = vi.fn();
    const { engine, rerender } = setup({ progress: { storageKey: alice }, onComplete });
    const before = engine();

    rerender({ progress: { storageKey: bob }, onComplete });
    // Same provider: its engine was not remounted.
    expect(engine().start).toBe(before.start);
    runThrough(engine, { tour: BUDGET });
    expect(onComplete).toHaveBeenCalledWith(BUDGET, { awarded: true });
    expect(Object.keys(JSON.parse(localStorage.getItem(bob)!))).toEqual(["budget"]);
    expect(JSON.parse(localStorage.getItem(alice)!)).toEqual({ budget: "2026-09-01T10:00:00.000Z" });
  });
});
