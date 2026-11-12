import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceSettings, resetDeviceSettings } from "../../lib/device-settings";
import { DEFAULT_FEEDBACK_SWIPE, feedbackSwipePlan } from "../../feedback/feedback-swipe";
import { DEFAULT_FEEDBACK_STATUS_LABELS } from "../../feedback/feedback-labels";
import {
  DEFAULT_TRANSLATION_REVIEW_SWIPE,
  translationReviewSwipePlan,
  type TranslationRow,
} from "../../lib/translation-review";
import {
  FEEDBACK_SWIPE_SURFACE,
  SWIPE_NONE,
  TRANSLATION_REVIEW_SWIPE_SURFACE,
  createSwipeSettingsStore,
  swipeBindingFrom,
  type SwipeSurface,
} from "../swipe-settings-store";

/**
 * The swipe settings' store (0.61): keksdose's `swipe-prefs-store.ts`, moved into the kit
 * with the kit's two lists as surfaces and an app's own beside them. What the store reads
 * is checked against the surfaces it was made with, keksdose's stored bindings move in
 * under the new key without a binding lost, and the hand-off is the `{ start, end }` the
 * kit's inbox and review panel take.
 */

let n = 0;
const fresh = (what: string) => `test-swipe-${what}-${++n}`;
const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null") as unknown;

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

/** keksdose's budget list, as it declares its own surface. */
const BUDGET: SwipeSurface<"fund" | "unassign" | "reduce_overfunded" | "goal"> = {
  actions: ["fund", "unassign", "reduce_overfunded", "goal"],
  defaults: { right: ["fund", SWIPE_NONE], left: ["unassign", "goal"] },
};

const SURFACES = {
  budget: BUDGET,
  feedback: FEEDBACK_SWIPE_SURFACE,
  translations: TRANSLATION_REVIEW_SWIPE_SURFACE,
};

/**
 * What keksdose's store (v4, live #515) holds under `keksdose-swipe-prefs` for someone who
 * rebound their feedback list and saved their defaults, transactions and accounts included
 * — keksdose's own lists, which it declares as surfaces of its own.
 */
const KEKSDOSE_V4 = {
  state: {
    surfaces: {
      transactions: { right: ["advance", "advance_far"], left: ["revert", "delete"] },
      accounts: { right: ["open_transactions", "add_transaction"], left: ["reconcile", "archive"] },
      budget: { right: ["goal", "none"], left: ["unassign", "goal"] },
      feedback: { right: ["done", "none"], left: ["wont_do", "postpone"] },
      translations: { right: ["approve", "clear"], left: ["edit", "none"] },
    },
    baseline: {
      transactions: { right: ["advance", "advance_far"], left: ["revert", "delete"] },
      accounts: { right: ["open_transactions", "add_transaction"], left: ["reconcile", "archive"] },
      budget: { right: ["fund", "none"], left: ["unassign", "goal"] },
      feedback: { right: ["advance", "none"], left: ["postpone", "none"] },
      translations: { right: ["approve", "none"], left: ["edit", "none"] },
    },
  },
  version: 4,
};

describe("the kit's surfaces", () => {
  it("ship the kit's own default bindings, read left to right, two stages a side", () => {
    expect(FEEDBACK_SWIPE_SURFACE.defaults).toEqual({
      right: [...(DEFAULT_FEEDBACK_SWIPE.end ?? [])],
      left: [...(DEFAULT_FEEDBACK_SWIPE.start ?? [])],
    });
    expect(FEEDBACK_SWIPE_SURFACE.defaults).toEqual({ right: ["advance", "done"], left: ["postpone", "wont_do"] });
    expect(TRANSLATION_REVIEW_SWIPE_SURFACE.defaults).toEqual({
      right: [...(DEFAULT_TRANSLATION_REVIEW_SWIPE.end ?? []), SWIPE_NONE],
      left: [...(DEFAULT_TRANSLATION_REVIEW_SWIPE.start ?? []), SWIPE_NONE],
    });
  });

  it("offer exactly the ids the kit's plans bind", () => {
    // Each id bound through the kit's own plan on a row it applies to: an id offered that
    // the plan did not know would be a picker option that binds a drag doing nothing.
    const labels = DEFAULT_FEEDBACK_STATUS_LABELS;
    for (const id of FEEDBACK_SWIPE_SURFACE.actions) {
      const plan = feedbackSwipePlan({ end: [id] }, { status: "READY" } as never, { change: () => {}, labels });
      expect(plan?.end?.map((panel) => panel.id)).toEqual([id]);
    }
    const row = { text: "Hallo", status: "unreviewed", review: { status: "approved" } } as unknown as TranslationRow;
    for (const id of TRANSLATION_REVIEW_SWIPE_SURFACE.actions) {
      expect(translationReviewSwipePlan({ end: [id] }, row, { canClear: true }).end).toEqual([id]);
    }
  });
});

describe("createSwipeSettingsStore", () => {
  it("starts on every surface's defaults, and persists under the app's key", () => {
    const key = fresh("defaults");
    const { useSwipeSettings } = createSwipeSettingsStore({ storageKey: key, surfaces: SURFACES });
    expect(useSwipeSettings.getState().surfaces).toEqual({
      budget: { right: ["fund", "none"], left: ["unassign", "goal"] },
      feedback: { right: ["advance", "done"], left: ["postpone", "wont_do"] },
      translations: { right: ["approve", "none"], left: ["edit", "none"] },
    });
    act(() => useSwipeSettings.getState().bind("feedback", "left", 1, "done"));
    expect(stored(key)).toMatchObject({
      state: { surfaces: { feedback: { right: ["advance", "done"], left: ["postpone", "done"] } }, baseline: null },
      version: 1,
    });
  });

  it("binds one stage of one side of one surface and nothing else", () => {
    const { useSwipeSettings } = createSwipeSettingsStore({ storageKey: fresh("bind"), surfaces: SURFACES });
    act(() => useSwipeSettings.getState().bind("budget", "right", 1, "goal"));
    const { surfaces } = useSwipeSettings.getState();
    expect(surfaces.budget).toEqual({ right: ["fund", "goal"], left: ["unassign", "goal"] });
    expect(surfaces.feedback).toEqual(FEEDBACK_SWIPE_SURFACE.defaults);
  });

  it("binds an id the surface does not offer as the empty slot, and ignores a surface it does not have", () => {
    const { useSwipeSettings } = createSwipeSettingsStore({ storageKey: fresh("bind-unknown"), surfaces: SURFACES });
    const before = useSwipeSettings.getState().surfaces;
    act(() => useSwipeSettings.getState().bind("feedback", "right", 0, "approve"));
    expect(useSwipeSettings.getState().surfaces.feedback.right).toEqual([SWIPE_NONE, "done"]);
    act(() => useSwipeSettings.getState().bind("transactions", "right", 0, "advance"));
    expect(useSwipeSettings.getState().surfaces.transactions).toBeUndefined();
    expect(useSwipeSettings.getState().surfaces.budget).toBe(before.budget);
  });

  it("reads a stored blob against the surfaces: unknown ids empty, short sides padded, surfaces back-filled or dropped", () => {
    const key = fresh("normalise");
    localStorage.setItem(
      key,
      JSON.stringify({
        state: {
          surfaces: {
            // `assign` was retired (keksdose dev#473): its picker would render blank.
            budget: { right: ["assign", "fund"], left: ["goal"] },
            // A side that is no list takes the surface's default.
            feedback: { right: "advance", left: [7, "wont_do", "done"] },
            // A surface this app no longer offers.
            transactions: { right: ["advance", "advance_far"], left: ["revert", "delete"] },
          },
          baseline: { budget: { right: ["assign"], left: [] } },
        },
        version: 1,
      }),
    );
    const { useSwipeSettings } = createSwipeSettingsStore({ storageKey: key, surfaces: SURFACES });
    const { surfaces, baseline } = useSwipeSettings.getState();
    expect(surfaces).toEqual({
      budget: { right: [SWIPE_NONE, "fund"], left: ["goal", SWIPE_NONE] },
      feedback: { right: ["advance", "done"], left: [SWIPE_NONE, "wont_do"] },
      translations: TRANSLATION_REVIEW_SWIPE_SURFACE.defaults,
    });
    // The baseline through the same path: a surface missing from it is not a hole.
    expect(baseline).toEqual({
      budget: { right: [SWIPE_NONE, SWIPE_NONE], left: [SWIPE_NONE, SWIPE_NONE] },
      feedback: FEEDBACK_SWIPE_SURFACE.defaults,
      translations: TRANSLATION_REVIEW_SWIPE_SURFACE.defaults,
    });
  });

  it("comes back to the person's defaults once saved, and to the shipped ones on resetToShipped", () => {
    const { useSwipeSettings } = createSwipeSettingsStore({ storageKey: fresh("baseline"), surfaces: SURFACES });
    const state = () => useSwipeSettings.getState();
    act(() => state().bind("feedback", "right", 0, "wont_do"));
    act(() => state().reset());
    expect(state().surfaces.feedback.right).toEqual(["advance", "done"]);

    act(() => state().bind("feedback", "right", 0, "wont_do"));
    act(() => state().saveAsDefault());
    act(() => state().bind("feedback", "right", 0, "postpone"));
    act(() => state().reset());
    expect(state().surfaces.feedback.right).toEqual(["wont_do", "done"]);

    act(() => state().resetToShipped());
    expect(state().surfaces.feedback.right).toEqual(["advance", "done"]);
    expect(state().baseline).toBeNull();
  });

  it("joins the reset of this device's settings: the shipped bindings and no saved defaults", () => {
    const key = fresh("device-reset");
    const { useSwipeSettings } = createSwipeSettingsStore({ storageKey: key, surfaces: SURFACES });
    expect(deviceSettings().find((entry) => entry.key === key)).toMatchObject({ kind: "appearance" });
    act(() => useSwipeSettings.getState().bind("budget", "left", 0, "fund"));
    act(() => useSwipeSettings.getState().saveAsDefault());
    act(() => void resetDeviceSettings());
    expect(useSwipeSettings.getState().surfaces.budget).toEqual(BUDGET.defaults);
    expect(useSwipeSettings.getState().baseline).toBeNull();
  });
});

describe("moving keksdose's stored bindings in (legacy)", () => {
  const LEGACY = "keksdose-swipe-prefs";

  it("reads a keksdose v4 value as it is: every binding and the saved defaults kept", () => {
    localStorage.setItem(LEGACY, JSON.stringify(KEKSDOSE_V4));
    const key = fresh("v4");
    const { useSwipeSettings } = createSwipeSettingsStore({
      storageKey: key,
      surfaces: SURFACES,
      legacy: { storageKey: LEGACY },
    });
    const { surfaces, baseline } = useSwipeSettings.getState();
    expect(surfaces.feedback).toEqual({ right: ["done", "none"], left: ["wont_do", "postpone"] });
    expect(surfaces.translations).toEqual({ right: ["approve", "clear"], left: ["edit", "none"] });
    expect(surfaces.budget).toEqual({ right: ["goal", "none"], left: ["unassign", "goal"] });
    expect(baseline?.feedback).toEqual({ right: ["advance", "none"], left: ["postpone", "none"] });
    // Moved: under the new key in the kit's format, the old key gone.
    expect(stored(key)).toMatchObject({ version: 1, state: { surfaces: { feedback: { right: ["done", "none"] } } } });
    expect(localStorage.getItem(LEGACY)).toBeNull();
  });

  it("hands the old state and its version to the app's own steps first", () => {
    const v3 = {
      state: { surfaces: { feedback: { right: ["advance", "done"], left: ["wont_do", "none"] } }, baseline: null },
      version: 3,
    };
    localStorage.setItem(LEGACY, JSON.stringify(v3));
    // keksdose's v3 → v4 (live #515): a left side still on v3's shipped one moves on.
    const migrate = vi.fn((state: unknown, version: number) => {
      const s = state as { surfaces: Record<string, { right: string[]; left: string[] }>; baseline: unknown };
      const { feedback } = s.surfaces;
      if (version >= 4 || feedback.left.join() !== "wont_do,none") return s;
      return { ...s, surfaces: { ...s.surfaces, feedback: { ...feedback, left: ["postpone", "wont_do"] } } };
    });
    const { useSwipeSettings } = createSwipeSettingsStore({
      storageKey: fresh("v3"),
      surfaces: SURFACES,
      legacy: { storageKey: LEGACY, migrate },
    });
    expect(migrate).toHaveBeenCalledWith(v3.state, 3);
    expect(useSwipeSettings.getState().surfaces.feedback.left).toEqual(["postpone", "wont_do"]);
  });

  it("leaves both keys alone once the new one holds a value", () => {
    const key = fresh("moved");
    localStorage.setItem(key, JSON.stringify({ state: { surfaces: { feedback: { right: ["done"] } } }, version: 1 }));
    localStorage.setItem(LEGACY, JSON.stringify(KEKSDOSE_V4));
    const { useSwipeSettings } = createSwipeSettingsStore({
      storageKey: key,
      surfaces: SURFACES,
      legacy: { storageKey: LEGACY },
    });
    expect(useSwipeSettings.getState().surfaces.feedback.right).toEqual(["done", SWIPE_NONE]);
    expect(localStorage.getItem(LEGACY)).not.toBeNull();
  });

  it("keeps the old key when the browser refuses the new one", () => {
    localStorage.setItem(LEGACY, JSON.stringify(KEKSDOSE_V4));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const { useSwipeSettings } = createSwipeSettingsStore({
      storageKey: fresh("quota"),
      surfaces: SURFACES,
      legacy: { storageKey: LEGACY },
    });
    expect(useSwipeSettings.getState().surfaces.feedback).toEqual(FEEDBACK_SWIPE_SURFACE.defaults);
    expect(JSON.parse(localStorage.getItem(LEGACY) ?? "null")).toEqual(KEKSDOSE_V4);
  });

  it("moves nothing when the app's steps throw", () => {
    localStorage.setItem(LEGACY, JSON.stringify(KEKSDOSE_V4));
    const key = fresh("throws");
    const { useSwipeSettings } = createSwipeSettingsStore({
      storageKey: key,
      surfaces: SURFACES,
      legacy: {
        storageKey: LEGACY,
        migrate: () => {
          throw new Error("old shape");
        },
      },
    });
    expect(useSwipeSettings.getState().surfaces.feedback).toEqual(FEEDBACK_SWIPE_SURFACE.defaults);
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(LEGACY)).not.toBeNull();
  });
});

describe("the binding out", () => {
  it("is the kit's { start, end }: right is the end of a left-to-right line, the empty slots left out", () => {
    expect(swipeBindingFrom({ right: ["done", SWIPE_NONE], left: [SWIPE_NONE, "wont_do"] })).toEqual({
      end: ["done"],
      start: ["wont_do"],
    });
    expect(swipeBindingFrom({ right: ["done", SWIPE_NONE], left: [SWIPE_NONE, "wont_do"] }, { dir: "rtl" })).toEqual({
      end: ["wont_do"],
      start: ["done"],
    });
    expect(swipeBindingFrom(undefined)).toEqual({ start: [], end: [] });
  });

  it("is what FeedbackInbox and TranslationReviewPanel take, the same object until the surface is rebound", () => {
    const { useSwipeSettings, useSwipeBinding } = createSwipeSettingsStore({
      storageKey: fresh("hook"),
      surfaces: SURFACES,
    });
    const { result, rerender } = renderHook(() => ({
      feedback: useSwipeBinding("feedback"),
      translations: useSwipeBinding("translations"),
    }));
    expect(result.current.feedback).toEqual(DEFAULT_FEEDBACK_SWIPE);
    expect(result.current.translations).toEqual(DEFAULT_TRANSLATION_REVIEW_SWIPE);
    const first = result.current.feedback;
    act(() => useSwipeSettings.getState().bind("budget", "right", 0, "goal"));
    rerender();
    expect(result.current.feedback).toBe(first);
    act(() => useSwipeSettings.getState().bind("feedback", "left", 0, SWIPE_NONE));
    expect(result.current.feedback).toEqual({ start: ["wont_do"], end: ["advance", "done"] });

    // Through the kit's own plan: on an OPEN row the short drag toward the start is now
    // "Won't do", the long one gone.
    const plan = feedbackSwipePlan(result.current.feedback, { status: "OPEN" } as never, {
      change: () => {},
      labels: DEFAULT_FEEDBACK_STATUS_LABELS,
    });
    expect(plan?.start?.map((panel) => panel.id)).toEqual(["wont_do"]);
  });
});
