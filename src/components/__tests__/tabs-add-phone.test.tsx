import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs } from "../ui";

/** Below md the add button is a lone "+": the label is visually hidden but still its name. */
describe("Tabs add button on phones", () => {
  it("keeps the label as the name and hides it visually below md on a scrolling strip", () => {
    render(
      <Tabs
        tabs={[{ id: "a", label: "A" }]}
        active="a"
        onChange={() => {}}
        onAdd={() => {}}
        addLabel="Add loop"
      />,
    );
    const add = screen.getByRole("button", { name: "Add loop" });
    expect(add.className).toContain("relative");
    expect(screen.getByText("Add loop").className).toContain("max-md:sr-only");
  });
});
