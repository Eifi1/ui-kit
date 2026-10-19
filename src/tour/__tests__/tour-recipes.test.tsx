import { act, render } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "../../components/toast";
import { TourProvider, useTour, type TourStep } from "../tour";
import type { TourInfo } from "../tour-info";
import { completeTour, resetTourProgress, type UseTourProgressOptions } from "../use-tour-progress";

/**
 * docs/tours-harmonization.md §9.8 (round 0.45): the recipes from the 0.44 adoptions, run
 * as an app would run them — the app's own provider wrapper, the real engine, no mock of
 * the kit's `TourProvider`, the toast spied where it lives.
 */

// ── The app's side, as in the guide ─────────────────────────────────────────────
const TOUR_KEY = "test.tour-recipes";
const TOUR_PROGRESS: UseTourProgressOptions = { storageKey: TOUR_KEY };

type TourDef = { id: string; titleKey: string; points: number; updated?: { date: string; reason?: string } };
type Translate = (key: string) => string;

/** One tour → its `TourInfo` (what `start(steps, {tour})` takes)… */
function tourInfo(def: TourDef, t: Translate): TourInfo {
  return { id: def.id, title: t(def.titleKey), group: "start", points: def.points, updated: def.updated };
}
/** …and the list mapper is that, mapped (the catalogue, the menu). */
const tourInfos = (defs: readonly TourDef[], t: Translate) => defs.map((def) => tourInfo(def, t));

function AppTourProvider({ children }: { children: ReactNode }) {
  return (
    <TourProvider
      progress={TOUR_PROGRESS}
      onComplete={(tour, { awarded }) => {
        if (awarded && tour) toast.success(`+${tour.points}`, { icon: "🏆" });
      }}
    >
      {children}
    </TourProvider>
  );
}

// ── The test's side ─────────────────────────────────────────────────────────────
const t: Translate = (key) => `t:${key}`;
const BUDGET: TourDef = { id: "budget", titleKey: "tour.budget", points: 5 };
const ONE_STEP: TourStep[] = [{ title: "Only", body: "One step." }];

let engine: ReturnType<typeof useTour>;
function Engine() {
  const e = useTour();
  useEffect(() => {
    engine = e;
  });
  return null;
}

/** Start the tour and step past its last step: the provider records, then `onComplete`. */
function finish(def: TourDef) {
  act(() => engine.start(ONE_STEP, { tour: tourInfo(def, t) }));
  act(() => engine.next());
}

describe("tour recipes (§9.8)", () => {
  // The file shares one localStorage and the kit's per-key store (KS): each test starts clean.
  beforeEach(() => act(() => resetTourProgress(TOUR_KEY)));
  afterEach(() => vi.restoreAllMocks());

  it("the toast shows only when a completion is awarded, through the real provider", () => {
    const success = vi.spyOn(toast, "success").mockReturnValue("t1");
    render(
      <AppTourProvider>
        <Engine />
      </AppTourProvider>,
    );
    finish(BUDGET);
    expect(success).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith("+5", { icon: "🏆" });

    finish(BUDGET); // a replay: awarded false
    expect(success).toHaveBeenCalledTimes(1);

    act(() => engine.start(ONE_STEP, { tour: tourInfo(BUDGET, t) }));
    act(() => engine.stop()); // a skip records nothing
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("starts clean although the test before finished the tour (resetTourProgress in beforeEach)", () => {
    const success = vi.spyOn(toast, "success").mockReturnValue("t1");
    render(
      <AppTourProvider>
        <Engine />
      </AppTourProvider>,
    );
    finish(BUDGET);
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("an update awards again; a seed with completeTour sets the scene", () => {
    const success = vi.spyOn(toast, "success").mockReturnValue("t1");
    completeTour(TOUR_KEY, "budget", "2026-09-01T10:00:00Z");
    render(
      <AppTourProvider>
        <Engine />
      </AppTourProvider>,
    );
    finish(BUDGET); // already done: nothing
    expect(success).not.toHaveBeenCalled();
    finish({ ...BUDGET, updated: { date: "2026-10-01" } }); // reset by the update: awarded
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("the single-tour mapper and the list mapper agree", () => {
    const defs = [BUDGET, { id: "goals", titleKey: "tour.goals", points: 3 }];
    expect(tourInfos(defs, t)[1]).toEqual(tourInfo(defs[1], t));
  });
});
