import { describe, expect, it, vi } from "vitest";
import { FEEDBACK_STATUS_ORDER, type FeedbackStatus } from "../feedback-inbox";
import { DEFAULT_FEEDBACK_STATUS_LABELS } from "../feedback-labels";
import {
  DEFAULT_FEEDBACK_SWIPE,
  FEEDBACK_SWIPE_ACTIONS,
  feedbackSwipePlan,
  type FeedbackSwipeBinding,
} from "../feedback-swipe";

/**
 * §4.5 of the feedback contract: keksdose's inbox swipes (feedback #144, #404) on logical
 * ladders, modelled on 0.26's `translationReviewSwipePlan` — and every commit through the
 * undoable change (§7.10).
 */

const at = (status: FeedbackStatus) => ({ id: 7, title: "Example", status });

const plan = (binding: FeedbackSwipeBinding, status: FeedbackStatus) => {
  const change = vi.fn();
  const out = feedbackSwipePlan(binding, at(status), { change, labels: DEFAULT_FEEDBACK_STATUS_LABELS });
  return { out, change };
};

const labelsOf = (binding: FeedbackSwipeBinding, status: FeedbackStatus) => {
  const { out } = plan(binding, status);
  return out && { start: out.start?.map((a) => a.label), end: out.end?.map((a) => a.label) };
};

describe("feedbackSwipePlan", () => {
  it("offers keksdose's default: advance then done toward the end, won't do toward the start", () => {
    expect(FEEDBACK_SWIPE_ACTIONS).toEqual(["advance", "done", "wont_do"]);
    expect(DEFAULT_FEEDBACK_SWIPE).toEqual({ start: ["wont_do"], end: ["advance", "done"] });
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "OPEN")).toEqual({ start: ["Won't do"], end: ["In progress", "Done"] });
  });

  it("commits through the undoable change, with the target status", () => {
    const { out, change } = plan(DEFAULT_FEEDBACK_SWIPE, "OPEN");
    out?.end?.[0].onCommit();
    expect(change).toHaveBeenLastCalledWith(at("OPEN"), "IN_PROGRESS");
    out?.end?.[1].onCommit();
    expect(change).toHaveBeenLastCalledWith(at("OPEN"), "DONE");
    out?.start?.[0].onCommit();
    expect(change).toHaveBeenLastCalledWith(at("OPEN"), "WONT_DO");
  });

  it("drops what the row cannot take, and the ladder closes up behind it", () => {
    // DONE: no advance, no done — won't do is all that is left.
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "DONE")).toEqual({ start: ["Won't do"], end: [] });
    // Off the chain: no advance, so done moves to the first threshold.
    for (const status of ["NEEDS_LIVE_TEST", "POSTPONED"] as const) {
      expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, status)).toEqual({ start: ["Won't do"], end: ["Done"] });
    }
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "WONT_DO")).toEqual({ start: [], end: ["Done"] });
  });

  it("drops a longer drag to the same effect", () => {
    // IN_EVALUATION: advance already goes to DONE, so `done` behind it would add nothing.
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "IN_EVALUATION")).toEqual({ start: ["Won't do"], end: ["Done"] });
    expect(labelsOf({ end: ["done", "done"] }, "OPEN")).toEqual({ start: [], end: ["Done"] });
  });

  it("drops keksdose's \"none\" fillers and ids it does not know", () => {
    // keksdose's stored physical ladders, handed as { end: right, start: left }.
    const stored = { right: ["none", "wont_do"], left: ["approve", "advance"] };
    expect(labelsOf({ end: stored.right, start: stored.left }, "IN_PROGRESS")).toEqual({
      start: ["In evaluation"],
      end: ["Won't do"],
    });
  });

  it("offers no swipe when nothing is left", () => {
    expect(plan({ start: ["none"], end: [] }, "OPEN").out).toBeNull();
    expect(plan({ end: ["advance"] }, "DONE").out).toBeNull();
    expect(plan({}, "OPEN").out).toBeNull();
  });

  it("writes each panel's text in its fill's contrast colour (0.26)", () => {
    const { out } = plan({ start: ["wont_do"], end: ["advance", "done"] }, "OPEN");
    const [advance, done] = out?.end ?? [];
    const [wontDo] = out?.start ?? [];
    expect(done.className).toContain("text-[var(--success-contrast)]");
    expect(wontDo.className).toContain("text-[var(--danger-contrast)]");
    expect(wontDo.armedClassName).toContain("text-[var(--danger-contrast)]");
    expect(advance.className).toMatch(/bg-\[var\(--info\)\] text-\[var\(--info-contrast\)\]/);
  });

  it("never throws on any status, known or not", () => {
    for (const status of [...FEEDBACK_STATUS_ORDER, "ESCALATED" as FeedbackStatus]) {
      expect(() => plan(DEFAULT_FEEDBACK_SWIPE, status)).not.toThrow();
    }
  });
});
