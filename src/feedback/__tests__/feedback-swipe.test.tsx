import { describe, expect, it, vi } from "vitest";
import { FEEDBACK_STATUS_ORDER, type FeedbackStatus } from "../feedback-inbox";
import { DEFAULT_FEEDBACK_STATUS_LABELS } from "../feedback-labels";
import {
  DEFAULT_FEEDBACK_SWIPE,
  FEEDBACK_SWIPE_ACTIONS,
  feedbackSwipeOmitShown,
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
  it("offers keksdose's default: advance then done toward the end, postpone then won't do toward the start", () => {
    expect(FEEDBACK_SWIPE_ACTIONS).toEqual(["advance", "done", "postpone", "wont_do"]);
    // 0.60, keksdose live #515: the short drag toward the start parks a row, the long one
    // dismisses it.
    expect(DEFAULT_FEEDBACK_SWIPE).toEqual({ start: ["postpone", "wont_do"], end: ["advance", "done"] });
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "OPEN")).toEqual({
      start: ["Postponed", "Won't do"],
      end: ["Ready to implement", "Done"],
    });
  });

  it("commits through the undoable change, with the target status", () => {
    const { out, change } = plan(DEFAULT_FEEDBACK_SWIPE, "OPEN");
    out?.end?.[0].onCommit();
    expect(change).toHaveBeenLastCalledWith(at("OPEN"), "READY");
    out?.end?.[1].onCommit();
    expect(change).toHaveBeenLastCalledWith(at("OPEN"), "DONE");
    out?.start?.[0].onCommit();
    expect(change).toHaveBeenLastCalledWith(at("OPEN"), "POSTPONED");
    out?.start?.[1].onCommit();
    expect(change).toHaveBeenLastCalledWith(at("OPEN"), "WONT_DO");
  });

  it("drops what the row cannot take, and the ladder closes up behind it", () => {
    // DONE: no advance, no done — postpone and won't do are what is left.
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "DONE")).toEqual({ start: ["Postponed", "Won't do"], end: [] });
    // POSTPONED, off the chain: no advance, so done moves to the first threshold; no
    // postpone, so won't do moves to the first threshold on its side.
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "POSTPONED")).toEqual({ start: ["Won't do"], end: ["Done"] });
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "WONT_DO")).toEqual({ start: ["Postponed"], end: ["Done"] });
  });

  it("drops a longer drag to the same effect", () => {
    // NEEDS_LIVE_TEST: advance already goes to DONE, so `done` behind it would add nothing.
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "NEEDS_LIVE_TEST")).toEqual({
      start: ["Postponed", "Won't do"],
      end: ["Done"],
    });
    expect(labelsOf({ end: ["done", "done"] }, "OPEN")).toEqual({ start: [], end: ["Done"] });
  });

  it('drops keksdose\'s "none" fillers and ids it does not know', () => {
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

  it("paints each panel by tone, which carries its fill's foreground (0.33)", () => {
    // 0.26 wrote each fill's contrast colour into the classes; since 0.33 the panel
    // names a tone and SwipeableRow paints it — the soft wash idle, the fill and its
    // `-contrast` armed — so no class string is left to get the pair wrong.
    const { out } = plan({ start: ["postpone", "wont_do"], end: ["advance", "done"] }, "OPEN");
    const [advance, done] = out?.end ?? [];
    const [postpone, wontDo] = out?.start ?? [];
    // Postpone is POSTPONED's own neutral, not danger's: a row parked, not refused (#515).
    expect([advance.tone, done.tone, postpone.tone, wontDo.tone]).toEqual(["info", "success", "neutral", "danger"]);
    for (const panel of [advance, done, postpone, wontDo]) {
      // The class pair it replaced went in 0.35 (round 0.35 R1).
      expect(panel).not.toHaveProperty("className");
      expect(panel).not.toHaveProperty("armedClassName");
    }
  });

  it("never throws on any status, known or not", () => {
    for (const status of [...FEEDBACK_STATUS_ORDER, "ESCALATED" as FeedbackStatus]) {
      expect(() => plan(DEFAULT_FEEDBACK_SWIPE, status)).not.toThrow();
    }
  });
});

describe("the chain with READY (feedback contract §8.2)", () => {
  it("goes OPEN → READY → IN_PROGRESS, so triage is one advance", async () => {
    const { nextFeedbackStatus } = await import("../feedback-inbox");
    expect(nextFeedbackStatus("OPEN")).toBe("READY");
    expect(nextFeedbackStatus("READY")).toBe("IN_PROGRESS");
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "READY")).toEqual({
      start: ["Postponed", "Won't do"],
      end: ["In progress", "Done"],
    });
  });

  it("goes IN_EVALUATION → NEEDS_LIVE_TEST → DONE, and done still jumps (0.60, keksdose live #513)", async () => {
    const { nextFeedbackStatus } = await import("../feedback-inbox");
    expect(nextFeedbackStatus("IN_EVALUATION")).toBe("NEEDS_LIVE_TEST");
    expect(nextFeedbackStatus("NEEDS_LIVE_TEST")).toBe("DONE");
    // The short drag to the deploy stage, the long one straight to DONE: two stages now.
    expect(labelsOf(DEFAULT_FEEDBACK_SWIPE, "IN_EVALUATION")).toEqual({
      start: ["Postponed", "Won't do"],
      end: ["Test when live", "Done"],
    });
    const { out, change } = plan(DEFAULT_FEEDBACK_SWIPE, "IN_EVALUATION");
    out?.end?.[0].onCommit();
    expect(change).toHaveBeenLastCalledWith(at("IN_EVALUATION"), "NEEDS_LIVE_TEST");
  });
});

describe("the plan's ids and the desktop column (keksdose dev#598 item 3)", () => {
  it("names every action by its binding id", () => {
    const { out } = plan(DEFAULT_FEEDBACK_SWIPE, "OPEN");
    expect(out?.end?.map((a) => a.id)).toEqual(["advance", "done"]);
    expect(out?.start?.map((a) => a.id)).toEqual(["postpone", "wont_do"]);
  });

  it("feedbackSwipeOmitShown leaves out what the status cell already offers, without reading labels", () => {
    // OPEN: the status cell shows READY (advance's target) and WONT_DO, so Done is left.
    const kept = (status: FeedbackStatus) => {
      const { out } = plan(DEFAULT_FEEDBACK_SWIPE, status);
      return [...(out?.end ?? []), ...(out?.start ?? [])]
        .filter((a) => !feedbackSwipeOmitShown(a, at(status)))
        .map((a) => a.id);
    };
    expect(kept("OPEN")).toEqual(["done"]);
    // IN_PROGRESS: advance goes to IN_EVALUATION, a step the cell shows; DONE is two away.
    expect(kept("IN_PROGRESS")).toEqual(["done"]);
    // IN_EVALUATION: advance goes to NEEDS_LIVE_TEST and done to DONE, both in the cell;
    // postpone and won't do are its verdicts.
    expect(kept("IN_EVALUATION")).toEqual([]);
    // An action without an id (an app's own) is never omitted.
    expect(feedbackSwipeOmitShown({ label: "Ready to implement", tone: "info", onCommit: () => {} }, at("OPEN"))).toBe(
      false,
    );
  });
});
