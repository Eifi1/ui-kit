import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackStatusTransitions } from "../../feedback/feedback-inbox";

/**
 * Keksdose live #339 — a screenshot of the feedback list's status column with the
 * "In evaluation" bubble sitting across the row beneath it.
 *
 * The icon row has no visible labels, so each button needs a tooltip; the bubble opened
 * DOWNWARD, which in a queue you triage by running the pointer down it is precisely the
 * row you are about to reach. It was covered every time you paused on one.
 *
 * Two things fix it, and only one of them is the direction:
 *   - `side="top"` puts the bubble over the row you have just left.
 *   - `portal` frees it from the DataTable's scroller, which clips an absolutely
 *     positioned bubble, and gives `placeTooltip` the chance to flip it back DOWN for
 *     the first row, where there is no room above.
 *
 * ⚠️ jsdom lays nothing out, so this cannot show that the bubble misses the next row.
 * What it holds is the pair of decisions: the trigger renders no in-flow bubble of its
 * own (the portal branch), and the label is reachable by hovering rather than only by
 * accessible name — which is the whole reason the tooltip is there.
 */
const statuses = ["IN_PROGRESS", "IN_EVALUATION", "DONE"] as const;

const renderRow = () =>
  render(
    <FeedbackStatusTransitions
      status="IN_EVALUATION"
      statuses={[...statuses]}
      canEdit
      onPick={vi.fn()}
      variant="icon"
      // A total map, because `label` is asked for EVERY status the control can show,
      // not only the three passed in.
      label={(s) =>
        ({
          OPEN: "Open",
          IN_PROGRESS: "In progress",
          IN_EVALUATION: "In evaluation",
          NEEDS_LIVE_TEST: "Test when live",
          POSTPONED: "Postponed",
          DONE: "Done",
          WONT_DO: "Won't do",
        })[s]
      }
    />,
  );

describe("the status column's tooltips (live #339)", () => {
  it("portals the bubble instead of nesting it in the row", () => {
    const { container } = renderRow();
    // The non-portal branch renders the bubble as a sibling INSIDE the trigger span,
    // where the table's scroller clips it and no flip is possible. Nothing with
    // role="tooltip" may exist in this subtree before a hover.
    expect(container.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
  });

  it("shows the status name on hover, above the trigger", () => {
    renderRow();
    const button = screen.getByRole("button", { name: "In evaluation" });
    fireEvent.mouseEnter(button.parentElement!);
    // One bubble, carrying the name — the label the icon does not show.
    const bubble = screen.getByRole("tooltip");
    expect(bubble).toHaveTextContent("In evaluation");
    // Portalled: out of the row entirely, so nothing in the list can clip it.
    expect(button.contains(bubble)).toBe(false);
  });

  it("still names every button for assistive technology", () => {
    // The tooltip is a pointer affordance; the accessible name is the real label and
    // must not depend on it.
    renderRow();
    for (const name of ["In progress", "In evaluation", "Done"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
