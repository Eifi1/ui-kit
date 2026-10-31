import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { drainTasks } from "../../test/tasks";
import { TourProvider, useTour, type TourStep } from "../tour";

/**
 * 0.52 code review, tour.tsx: the overlay is its own chunk since 0.52 (refactor audit
 * 2026-10-30, MOD-1). While it loads the tour is `active` but nothing is mounted to hear a
 * key, so Escape did nothing — on a slow first start the person backed out, and the
 * overlay came up seconds later over a page they had gone back to. Before 0.52 the overlay
 * was there at once and skipped on Escape before its step was located; it does again.
 *
 * In a file of its own: the chunk loads once per test file.
 */
const overlay = vi.hoisted(() => {
  let release: () => void = () => {};
  const arrived = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { arrived, release: () => release() };
});
vi.mock("../tour-overlay", async (importOriginal) => {
  await overlay.arrived;
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

describe("Escape while the tour overlay's chunk is on its way", () => {
  it("skips the tour, and the chunk arriving later draws nothing", async () => {
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
    expect(engine!.active).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledWith("skipped");
    expect(engine!.active).toBe(false);

    overlay.release();
    await drainTasks();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("The page")).toBeInTheDocument();

    // The next start shows its first step, from the chunk that has arrived.
    act(() => engine!.start(STEPS));
    expect(await screen.findByRole("dialog", { name: "Welcome" })).toBeInTheDocument();
  });
});
