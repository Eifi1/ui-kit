import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { TourProvider, useTour, type TourStep } from "../tour";

// The overlay is its own chunk since 0.52 (refactor audit 2026-10-30, MOD-1): loaded once
// up front, as an app's bundle has it by the time a tour starts; React.lazy still resolves
// it a render after the start, which the waits below cover.
beforeAll(async () => {
  await import("../tour-overlay");
});

/**
 * keksdose dev#611–613 (R9): an app that hides its own floating help launcher while any
 * `aria-modal` is open has to except the tour, which spotlights that very launcher. It
 * recognised the overlay by its `pointer-events-none` class; `data-tour-overlay` is the
 * stable marker, on the root of every step, interactive or not.
 */

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

describe("Tour overlay marker", () => {
  it("carries data-tour-overlay on its dialog root while a tour runs, and is gone after", async () => {
    let engine: Engine | null = null;
    render(
      <TourProvider>
        <Capture
          onEngine={(e) => {
            engine = e;
          }}
        />
      </TourProvider>,
    );
    expect(document.querySelector("[data-tour-overlay]")).toBeNull();
    act(() => engine!.start(STEPS));
    const dialog = await screen.findByRole("dialog", { name: "Welcome" });
    expect(dialog).toHaveAttribute("data-tour-overlay");
    expect(document.querySelectorAll("[data-tour-overlay]")).toHaveLength(1);
    // The selector keksdose's launcher writes: every modal but the tour's.
    expect(document.querySelector('[aria-modal="true"]:not([data-tour-overlay])')).toBeNull();
    act(() => engine!.stop());
    expect(document.querySelector("[data-tour-overlay]")).toBeNull();
  });
});
