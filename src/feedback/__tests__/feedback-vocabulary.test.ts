import { describe, expect, it } from "vitest";
import { Ban, RotateCcw, Wrench } from "lucide-react";
import {
  FEEDBACK_STATUS_META,
  FEEDBACK_STATUS_ORDER,
  nextFeedbackStatus,
  selectableFeedbackStatuses,
  visibleFeedbackStatuses,
} from "../feedback-vocabulary";

/** 0.40 (docs/feedback-harmonization.md §10.2 decision 4, §10.8): REWORK, "sent back,
 *  released for work again" — after READY, next IN_PROGRESS, in the danger tint. */
describe("the REWORK status", () => {
  it("sits after READY in the order", () => {
    expect(FEEDBACK_STATUS_ORDER).toEqual([
      "OPEN",
      "READY",
      "REWORK",
      "IN_PROGRESS",
      "IN_EVALUATION",
      "NEEDS_LIVE_TEST",
      "POSTPONED",
      "DONE",
      "WONT_DO",
    ]);
  });

  it("is drawn with the Rework button's RotateCcw in the danger tint, apart from IN_PROGRESS and WONT_DO", () => {
    expect(FEEDBACK_STATUS_META.REWORK).toEqual({
      icon: RotateCcw,
      activeBg: "bg-danger-soft",
      activeText: "text-danger",
    });
    expect(FEEDBACK_STATUS_META.IN_PROGRESS.icon).toBe(Wrench);
    expect(FEEDBACK_STATUS_META.WONT_DO.icon).toBe(Ban);
  });

  it("advances IN_EVALUATION to NEEDS_LIVE_TEST and that to DONE, the pills unchanged (0.60, #513)", () => {
    expect(nextFeedbackStatus("IN_PROGRESS")).toBe("IN_EVALUATION");
    expect(nextFeedbackStatus("IN_EVALUATION")).toBe("NEEDS_LIVE_TEST");
    expect(nextFeedbackStatus("NEEDS_LIVE_TEST")).toBe("DONE");
    expect(nextFeedbackStatus("DONE")).toBeNull();
    expect(nextFeedbackStatus("POSTPONED")).toBeNull();
    expect(nextFeedbackStatus("WONT_DO")).toBeNull();
    // The pills still offer DONE from IN_EVALUATION (a fix that needs no deploy) and
    // IN_EVALUATION from DONE: the deploy stage is the advance's, never a forced stop.
    expect(visibleFeedbackStatuses("IN_EVALUATION")).toEqual([
      "IN_PROGRESS",
      "IN_EVALUATION",
      "NEEDS_LIVE_TEST",
      "POSTPONED",
      "DONE",
      "WONT_DO",
    ]);
    expect(visibleFeedbackStatuses("DONE")).toContain("IN_EVALUATION");
    expect(visibleFeedbackStatuses("NEEDS_LIVE_TEST")).toEqual(["IN_PROGRESS", "NEEDS_LIVE_TEST", "DONE", "WONT_DO"]);
  });

  it("leads to IN_PROGRESS; advancing READY still goes to IN_PROGRESS", () => {
    expect(nextFeedbackStatus("REWORK")).toBe("IN_PROGRESS");
    expect(nextFeedbackStatus("READY")).toBe("IN_PROGRESS");
    expect(nextFeedbackStatus("OPEN")).toBe("READY");
  });

  it("offers IN_PROGRESS and the off-chain verdicts from a REWORK row", () => {
    expect(visibleFeedbackStatuses("REWORK")).toEqual([
      "REWORK",
      "IN_PROGRESS",
      "NEEDS_LIVE_TEST",
      "POSTPONED",
      "WONT_DO",
    ]);
    // Nothing else moved: READY is as it was.
    expect(visibleFeedbackStatuses("READY")).toEqual([
      "OPEN",
      "READY",
      "IN_PROGRESS",
      "NEEDS_LIVE_TEST",
      "POSTPONED",
      "WONT_DO",
    ]);
  });

  it("is in the composer's list, by the order", () => {
    expect(selectableFeedbackStatuses("DONE")).toEqual(FEEDBACK_STATUS_ORDER);
    expect(selectableFeedbackStatuses("DONE")).toContain("REWORK");
  });
});
