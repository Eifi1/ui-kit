import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabelOverrides } from "../../i18n/kit-labels";
import {
  FEEDBACK_CATEGORY_ORDER,
  FEEDBACK_STATUS_ORDER,
  FeedbackCategoryBadge,
  FeedbackStatusBadge,
  FeedbackStatusTransitions,
  type FeedbackCategory,
  type FeedbackStatus,
} from "../feedback-inbox";
import {
  DEFAULT_FEEDBACK_CATEGORY_LABELS,
  DEFAULT_FEEDBACK_STATUS_LABELS,
  DEFAULT_FEEDBACK_TOAST_LABELS,
} from "../feedback-labels";

/**
 * 0.27.0: the status and category words are the kit's (docs/feedback-harmonization.md
 * §5) — keksdose's English as the default, the provider's catalogue over it, a caller's
 * `label` over both — so the three apps can drop their own `STATUS_LABEL` maps.
 */

// Partial provider overrides, as an app's German catalogue would hand them in. Cast
// because the namespaces are wired into UiKitLabels by the barrel round, not here.
const german = {
  feedbackStatus: { IN_EVALUATION: "Zur Prüfung", NEEDS_LIVE_TEST: "Live testen" },
  feedbackCategory: { BUG: "Fehler" },
} as unknown as UiKitLabelOverrides;

describe("the English defaults (keksdose en.json)", () => {
  it("names all eight statuses and five categories", () => {
    expect(Object.keys(DEFAULT_FEEDBACK_STATUS_LABELS)).toEqual(FEEDBACK_STATUS_ORDER);
    expect(Object.keys(DEFAULT_FEEDBACK_CATEGORY_LABELS)).toEqual(FEEDBACK_CATEGORY_ORDER);
    expect(Object.values(DEFAULT_FEEDBACK_STATUS_LABELS)).toEqual([
      "Open",
      "Ready to implement",
      "In progress",
      "In evaluation",
      "Test when live",
      "Postponed",
      "Done",
      "Won't do",
    ]);
    expect(Object.values(DEFAULT_FEEDBACK_CATEGORY_LABELS)).toEqual(["Crash", "Bug", "Idea", "Question", "Other"]);
  });

  it("words the toasts as keksdose does", () => {
    const t = DEFAULT_FEEDBACK_TOAST_LABELS;
    expect(t.statusChanged("Done", "Chart jumps")).toBe("Set to “Done”: Chart jumps");
    expect(t.statusRestored("Open", "Chart jumps")).toBe("Back to “Open”: Chart jumps");
    expect(t.statusUndo).toBe("Undo");
    expect(t.attachmentTooMany(5)).toBe("Only 5 attachments fit — the rest were left out.");
    expect(t.attachmentTooMany(1)).toBe("Only 1 attachment fits — the rest were left out.");
    expect(t.updateFailed).toBe("Could not save that change.");
    expect(t.submitted).toBe("Thanks for the feedback!");
  });
});

describe("FeedbackStatusBadge", () => {
  it("names the status itself, from the provider when it has a word", () => {
    const { rerender } = render(<FeedbackStatusBadge status="NEEDS_LIVE_TEST" />);
    expect(screen.getByText("Test when live")).toBeTruthy();
    rerender(
      <UiKitProvider labels={german}>
        <FeedbackStatusBadge status="NEEDS_LIVE_TEST" />
      </UiKitProvider>,
    );
    expect(screen.getByText("Live testen")).toBeTruthy();
  });

  it("lets a caller's label win", () => {
    render(
      <UiKitProvider labels={german}>
        <FeedbackStatusBadge status="IN_EVALUATION" label="Waiting on you" />
      </UiKitProvider>,
    );
    expect(screen.getByText("Waiting on you")).toBeTruthy();
    expect(screen.queryByText("Zur Prüfung")).toBeNull();
  });

  it("shows an unknown status's raw value rather than OPEN's name", () => {
    render(<FeedbackStatusBadge status={"ESCALATED" as unknown as FeedbackStatus} />);
    expect(screen.getByText("ESCALATED")).toBeTruthy();
  });
});

describe("FeedbackCategoryBadge", () => {
  it("names the category itself, and the provider's word over English", () => {
    const { rerender } = render(<FeedbackCategoryBadge category="CRASH" />);
    expect(screen.getByText("Crash")).toBeTruthy();
    rerender(
      <UiKitProvider labels={german}>
        <FeedbackCategoryBadge category="BUG" compact />
      </UiKitProvider>,
    );
    expect(screen.getByText("Fehler")).toBeTruthy();
  });

  it("calls an unknown category what OTHER is called, and a caller's label still wins", () => {
    const { rerender } = render(<FeedbackCategoryBadge category={"ESCALATION" as unknown as FeedbackCategory} />);
    expect(screen.getByText("Other")).toBeTruthy();
    rerender(<FeedbackCategoryBadge category="IDEA" label="Wish" />);
    expect(screen.getByText("Wish")).toBeTruthy();
  });
});

describe("FeedbackStatusTransitions", () => {
  it("labels every button from the namespace when no label is passed", () => {
    render(
      <UiKitProvider labels={german}>
        <FeedbackStatusTransitions
          status="IN_PROGRESS"
          statuses={[...FEEDBACK_STATUS_ORDER]}
          canEdit
          onPick={vi.fn()}
          variant="pill"
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Zur Prüfung" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Won't do" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "In progress" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("still takes the app's naming function over it", () => {
    render(
      <FeedbackStatusTransitions
        status="OPEN"
        statuses={["OPEN", "DONE"]}
        canEdit
        onPick={vi.fn()}
        variant="pill"
        label={(s) => `app:${s}`}
      />,
    );
    expect(screen.getByRole("button", { name: "app:DONE" })).toBeTruthy();
  });
});
