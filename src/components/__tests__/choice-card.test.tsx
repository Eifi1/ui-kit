import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChoiceCard, ChoiceCardGroup } from "../choice-card";

/**
 * ChoiceCard is a native input with a card for a label. Pinned: the card is the hit
 * area, the NAME is the title alone (the description is a description), and the group
 * keeps a multiple value in option order.
 */

describe("ChoiceCard", () => {
  it("is a native checkbox named by its title and described by its description", () => {
    const onCheckedChange = vi.fn();
    render(
      <ChoiceCard
        title="Set up recurring rent"
        description="Creates a monthly rent invoice"
        onCheckedChange={onCheckedChange}
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Set up recurring rent" });
    expect(box.tagName).toBe("INPUT");
    expect(box).toHaveAccessibleDescription("Creates a monthly rent invoice");
    // A click on the description — anywhere on the card — toggles it.
    fireEvent.click(screen.getByText("Creates a monthly rent invoice"));
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders a radio when asked, and carries an error as a description", () => {
    render(<ChoiceCard type="radio" name="r" title="Manager" error="Pick a role" />);
    const radio = screen.getByRole("radio", { name: "Manager" });
    expect(radio).toHaveAttribute("aria-invalid", "true");
    expect(radio).toHaveAccessibleDescription("Pick a role");
  });
});

const ROLES = [
  { value: "owner", title: "Owner", description: "Everything" },
  { value: "manager", title: "Manager" },
  { value: "viewer", title: "Viewer" },
] as const;
type Role = (typeof ROLES)[number]["value"];

describe("ChoiceCardGroup", () => {
  it("single: radios sharing a name, in a fieldset named by its legend", () => {
    function Single() {
      const [role, setRole] = useState<Role | null>(null);
      return (
        <ChoiceCardGroup legend="Role" options={[...ROLES]} value={role} onChange={setRole} />
      );
    }
    render(<Single />);
    expect(screen.getByRole("group", { name: "Role" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(new Set(radios.map((r) => r.getAttribute("name"))).size).toBe(1);
    fireEvent.click(screen.getByText("Manager"));
    expect(screen.getByRole("radio", { name: "Manager" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Owner" })).not.toBeChecked();
  });

  it("multiple: checkboxes, and the value stays in option order", () => {
    const onChange = vi.fn();
    render(
      <ChoiceCardGroup
        multiple
        aria-label="Roles"
        options={[...ROLES]}
        value={["viewer"]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Owner" }));
    expect(onChange).toHaveBeenCalledWith(["owner", "viewer"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Viewer" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("disables every card through the fieldset", () => {
    render(
      <ChoiceCardGroup legend="Role" options={[...ROLES]} value="owner" onChange={vi.fn()} disabled />,
    );
    for (const r of screen.getAllByRole("radio")) expect(r).toBeDisabled();
  });
});
