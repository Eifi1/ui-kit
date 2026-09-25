import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WizardSummary } from "../wizard-summary";

/**
 * The review step. Its whole reason to exist is the edit button — "sections are data,
 * not children, because 'jump back to step N' is the point and a caller assembling its
 * own cards invariably drops it" — and nothing checked that the button reaches the step
 * the section came from. A summary whose edit buttons all jump to step 0 renders
 * perfectly.
 */
const SECTIONS = [
  {
    label: "Account",
    stepIndex: 0,
    items: [
      { label: "Name", value: "Giro" },
      { label: "Currency", value: "EUR" },
    ],
  },
  {
    label: "Opening balance",
    stepIndex: 2,
    items: [{ label: "Amount", value: <strong>€1,200.00</strong> }],
  },
];

describe("WizardSummary", () => {
  it("shows every section's label/value pairs", () => {
    render(<WizardSummary sections={SECTIONS} onEditStep={vi.fn()} />);
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Giro")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    // A value may be a node, not only a string — a badge or a link belongs here.
    expect(screen.getByText("€1,200.00").tagName).toBe("STRONG");
  });

  it("jumps back to the step a section CAME FROM, not to its position in the list", () => {
    // The second section is index 1 in `sections` and step 2 in the wizard. Anything
    // that passed the array index would be indistinguishable on a summary whose
    // sections happen to be in step order, which most are.
    const onEditStep = vi.fn();
    render(<WizardSummary sections={SECTIONS} onEditStep={onEditStep} />);
    const [, second] = screen.getAllByRole("button", { name: "Edit" });
    fireEvent.click(second);
    expect(onEditStep).toHaveBeenCalledWith(2);
  });

  it("uses the caller's labels when it has them, and English when it does not", () => {
    const { unmount } = render(<WizardSummary sections={SECTIONS} onEditStep={vi.fn()} />);
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    unmount();

    render(
      <WizardSummary
        sections={SECTIONS}
        onEditStep={vi.fn()}
        labels={{ reviewTitle: "Prüfen", edit: "Ändern" }}
      />,
    );
    expect(screen.getByText("Prüfen")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ändern" })).toHaveLength(2);
  });

  it("renders nothing but the heading for an empty section list", () => {
    render(<WizardSummary sections={[]} onEditStep={vi.fn()} />);
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toEqual([]);
  });
});

describe("WizardSummary (0.8.0)", () => {
  it("disables every edit button while `disabled`", () => {
    const onEditStep = vi.fn();
    render(<WizardSummary sections={SECTIONS} onEditStep={onEditStep} disabled />);
    const buttons = screen.getAllByRole("button", { name: "Edit" });
    expect(buttons).toHaveLength(2);
    for (const b of buttons) expect(b).toBeDisabled();
    fireEvent.click(buttons[0]);
    expect(onEditStep).not.toHaveBeenCalled();
  });

  it("renders a section with no stepIndex without an edit button", () => {
    // File-level counts belong to no step; they used to be parked under one just to
    // have an index to jump to.
    render(
      <WizardSummary
        sections={[...SECTIONS, { label: "File", items: [{ label: "Transactions", value: 812 }] }]}
        onEditStep={vi.fn()}
      />,
    );
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  it("needs no onEditStep when no section names a step", () => {
    render(<WizardSummary sections={[{ label: "File", items: [{ label: "Rows", value: 3 }] }]} />);
    expect(screen.queryAllByRole("button")).toEqual([]);
  });
});
