import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";

// The overlay is its own chunk since 0.52 (refactor audit 2026-10-30, MOD-1): loaded once
// up front, as an app's bundle has it by the time a tour starts; React.lazy still resolves
// it a render after the start, which the waits below cover.
beforeAll(async () => {
  await import("../tour-overlay");
});

/**
 * A step's `beforeStep` that rejects, or has not settled yet (refactor audit 2026-10-30,
 * FLW-5).
 *
 * The await had no `try`: a rejection skipped the locate, so the tour stayed `active`
 * and drew nothing — no card, no scrim, no Escape layer — while the document key
 * listener still advanced it from the bare page. That listener also let Enter or →
 * jump past a step whose `beforeStep` was still running.
 */

function Launcher({ steps, onSkip }: { steps: TourStep[]; onSkip?: () => void }) {
  const { start, index, active } = useTour();
  return (
    <>
      <button type="button" onClick={() => start(steps, { onSkip })}>
        Take the tour
      </button>
      <output data-testid="state">{active ? `step ${index}` : "idle"}</output>
    </>
  );
}

function renderTour(steps: TourStep[], onSkip?: () => void) {
  return render(
    <TourProvider>
      <Launcher steps={steps} onSkip={onSkip} />
      <button type="button" data-tour="target">
        Target
      </button>
    </TourProvider>,
  );
}

async function flush() {
  await act(async () => {
    for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
  });
}

const state = () => screen.getByTestId("state").textContent;
const press = async (key: string) => {
  fireEvent.keyDown(document.body, { key });
  await flush();
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Tour beforeStep that fails or is still running", () => {
  it("a rejected beforeStep still shows its step, and the error goes to the console", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("the route did not load");
    renderTour([
      { title: "Welcome", body: "First.", beforeStep: () => Promise.reject(failure) },
      { title: "Rows", body: "Second." },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Welcome");
    expect(error).toHaveBeenCalledWith(failure);
    // Shown, so its keys are the shown step's: Enter goes on to the next.
    await press("Enter");
    expect(state()).toBe("step 1");
  });

  it("a beforeStep that throws synchronously still locates its target", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderTour([
      {
        title: "Filters",
        body: "Here.",
        target: '[data-tour="target"]',
        beforeStep: () => {
          throw new Error("no panel to open");
        },
      },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    // The target measures 0×0 in jsdom: the finder gives up after its 45 frames and
    // centres the card. The suite's 5 s, not 1 s: 45 real frames under the loaded check.
    expect(await screen.findByRole("dialog")).toHaveTextContent("Filters");
  });

  it("Enter and the arrows wait for a beforeStep still running", async () => {
    let arrive!: () => void;
    renderTour([
      { title: "Welcome", body: "First." },
      { title: "Filters", body: "Second.", beforeStep: () => new Promise<void>((r) => (arrive = r)) },
      { title: "Rows", body: "Third." },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    // The overlay is a chunk of its own (MOD-1): the card is there a render later.
    expect(await screen.findByRole("dialog")).toHaveTextContent("Welcome");

    await press("Enter");
    expect(state()).toBe("step 1");
    expect(screen.queryByRole("dialog")).toBeNull();
    // Filters' beforeStep is still running: nothing on screen to move on from.
    await press("Enter");
    await press("ArrowRight");
    expect(state()).toBe("step 1");

    await act(async () => arrive());
    await flush();
    expect(screen.getByRole("dialog")).toHaveTextContent("Filters");
  });

  it("Escape skips a step whose beforeStep is still running", async () => {
    const onSkip = vi.fn();
    renderTour(
      [
        { title: "Welcome", body: "First." },
        { title: "Filters", body: "Second.", beforeStep: () => new Promise<void>(() => {}) },
      ],
      onSkip,
    );
    fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    // The overlay is a chunk of its own (MOD-1): the card is there a render later.
    await screen.findByRole("dialog");
    await press("Enter");
    expect(state()).toBe("step 1");
    await press("Escape");
    expect(state()).toBe("idle");
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
