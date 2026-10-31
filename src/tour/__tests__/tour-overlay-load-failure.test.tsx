import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { drainTasks } from "../../test/tasks";
import { TourProvider, useTour, type TourStep } from "../tour";

/**
 * 0.52 code review, tour.tsx: the overlay is its own chunk since 0.52 (refactor audit
 * 2026-10-30, MOD-1), fetched on the first start. A fetch that fails — a tab left open
 * across a deploy, a local-first app offline — rejected inside `React.lazy`, under a
 * Suspense with no boundary, and the error went up through `TourProvider`: keksdose and
 * Kurvenschmiede mount it ABOVE their app error boundary, so the whole app unmounted
 * (a white page) because somebody pressed "Take the tour". Before 0.52 a start fetched
 * nothing.
 *
 * And the app hears of it (0.52 code review, tour.tsx): the run was ended with `stop()`,
 * which calls nothing, after the start's `onStart` had run — kastlan's practice mode,
 * turned on by its launcher and off in `onSkip`/`onFinish`, stayed on with nothing on
 * screen. `onSkip("unavailable")` now.
 */

const overlay = vi.hoisted(() => ({ fail: true }));
vi.mock("../tour-overlay", async (importOriginal) => {
  if (overlay.fail) throw new TypeError("Failed to fetch dynamically imported module: /assets/tour-overlay-1a2b.js");
  return importOriginal();
});

type Engine = ReturnType<typeof useTour>;

function Capture({ onEngine }: { onEngine: (engine: Engine) => void }) {
  const engine = useTour();
  useEffect(() => {
    onEngine(engine);
  });
  return null;
}

const STEPS: TourStep[] = [
  { title: "Welcome", body: "First." },
  { title: "Done", body: "Second." },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the tour overlay's chunk fails to load", () => {
  it("ends the tour, logs the error and leaves the page; the next start fetches again", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const onSkip = vi.fn();
    let engine: Engine | null = null;
    render(
      <TourProvider>
        <Capture
          onEngine={(e) => {
            engine = e;
          }}
        />
        <p>The page</p>
      </TourProvider>,
    );

    act(() => engine!.start(STEPS, { onSkip }));
    await drainTasks();

    expect(screen.getByText("The page")).toBeInTheDocument();
    expect(engine!.active).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    // Vitest wraps a throwing mock factory's error; the fetch failure is its `cause`.
    expect(logged).toHaveBeenCalledTimes(1);
    const [[error]] = logged.mock.calls as [[{ cause?: unknown }]];
    expect(String(error.cause ?? error)).toMatch(/Failed to fetch dynamically imported module/);
    // Not the reader's skip — the run never showed a step — but the run's end all the same.
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledWith("unavailable");

    // The deploy's new chunk is there now, or the device is back online.
    overlay.fail = false;
    act(() => engine!.start(STEPS));
    expect(await screen.findByRole("dialog", { name: "Welcome" })).toBeInTheDocument();
    expect(screen.getByText("The page")).toBeInTheDocument();
  });
});
