import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WizardStep } from "../wizard-step";

/** kastlan 43: "Add building" belongs in the step header, beside the title. */
describe("WizardStep actions", () => {
  it("renders the actions in the header, beside the title", () => {
    const { container } = render(
      <WizardStep title="Buildings" description="One row per building." actions={<button type="button">Add building</button>}>
        <p>body</p>
      </WizardStep>,
    );
    const header = container.querySelector<HTMLElement>("[data-slot=wizard-step-header]")!;
    expect(within(header).getByRole("heading", { level: 3, name: "Buildings" })).toBeInTheDocument();
    const actions = header.querySelector<HTMLElement>("[data-slot=wizard-step-actions]")!;
    expect(within(actions).getByRole("button", { name: "Add building" })).toBeInTheDocument();
    // The body comes after the header, not inside it.
    expect(within(header).queryByText("body")).toBeNull();
  });

  it("renders a header for actions alone", () => {
    const { container } = render(<WizardStep actions={<button type="button">Add</button>}>x</WizardStep>);
    expect(container.querySelector("[data-slot=wizard-step-header]")).not.toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("leaves the header as before without actions", () => {
    const { container } = render(<WizardStep title="Units" actions={false}>x</WizardStep>);
    expect(container.querySelector("[data-slot=wizard-step-actions]")).toBeNull();
    expect(container.querySelector("[data-slot=wizard-step-header]")).toHaveClass("space-y-1");
  });
});
