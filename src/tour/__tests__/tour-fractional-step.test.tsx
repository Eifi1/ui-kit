import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";
import { useTourUrlSync, type UseTourUrlSyncOptions } from "../use-tour-url-sync";

/**
 * A step number that is not a whole number (refactor audit 2026-10-30, FLW-9).
 *
 * `?tourStep=2.5` became `startIndex` 1.5; `startSteps` then read `steps[1.5]`, which is
 * undefined, and threw on its `when`. The URL sync's launch swallowed the error, so the
 * tour silently did not start — in kastlan after the launcher had already turned on
 * practice mode. `goToStep(2.5)` threw the same way.
 */

const STEPS: TourStep[] = [1, 2, 3, 4].map((i) => ({ title: `Step ${i}`, body: `Body ${i}` }));

function Driver() {
  const { start, goToStep, index, active } = useTour();
  return (
    <>
      <button type="button" onClick={() => start(STEPS)}>
        start
      </button>
      <button type="button" onClick={() => start(STEPS, { startIndex: 1.5 })}>
        start-at-1.5
      </button>
      <button type="button" onClick={() => goToStep(2.5)}>
        go-to-2.5
      </button>
      <output data-testid="state">{active ? `step ${index}` : "idle"}</output>
    </>
  );
}

function Sync({ launch }: { launch: UseTourUrlSyncOptions["launch"] }) {
  useTourUrlSync({ launch });
  return null;
}

const flush = () => act(async () => {});
const state = () => screen.getByTestId("state").textContent;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Tour step numbers that are not whole", () => {
  it("start at 1.5 starts at step 1", async () => {
    render(
      <TourProvider>
        <Driver />
      </TourProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "start-at-1.5" }));
    await flush();
    expect(state()).toBe("step 1");
    expect(screen.getByRole("dialog")).toHaveTextContent("Step 2");
  });

  it("goToStep(2.5) goes to step 2", async () => {
    render(
      <TourProvider>
        <Driver />
      </TourProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    await flush();
    expect(state()).toBe("step 0");
    fireEvent.click(screen.getByRole("button", { name: "go-to-2.5" }));
    await flush();
    expect(state()).toBe("step 2");
  });

  it("?tourStep=2.5 launches at step 1 (the second step, 1-based 2)", async () => {
    const launch = vi.fn<UseTourUrlSyncOptions["launch"]>((id, { startIndex }, start) =>
      start(STEPS, { id, startIndex }),
    );
    render(
      <MemoryRouter initialEntries={["/b?tour=budget&tourStep=2.5"]}>
        <TourProvider>
          <Sync launch={launch} />
          <Driver />
        </TourProvider>
      </MemoryRouter>,
    );
    await flush();
    await flush();
    expect(launch).toHaveBeenCalledWith("budget", { startIndex: 1 }, expect.any(Function), expect.anything());
    expect(state()).toBe("step 1");
  });

  it("a launch that fails says why in the console", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("prepare() failed");
    render(
      <MemoryRouter initialEntries={["/b?tour=budget"]}>
        <TourProvider>
          <Sync launch={() => Promise.reject(failure)} />
        </TourProvider>
      </MemoryRouter>,
    );
    await flush();
    await flush();
    expect(error).toHaveBeenCalledWith(failure);
  });
});
