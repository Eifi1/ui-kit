import { render, screen } from "@testing-library/react";
import { Minus, Plus } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ButtonGroup } from "../button-group";
import { Button, IconButton } from "../ui";
import { Tooltip } from "../tooltip";

const PHYSICAL = /(?:^|\s|:)(?:rounded-(?:l|r|tl|tr|bl|br)|border-(?:l|r)|ml|mr|pl|pr|left|right)-/;

describe("ButtonGroup", () => {
  it("is a named group, and every member keeps its own tab stop", () => {
    render(
      <ButtonGroup aria-label="Tree">
        <Button>Collapse all</Button>
        <Button>Expand all</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "Tree" });
    expect(group).toHaveAttribute("data-orientation", "horizontal");
    for (const b of screen.getAllByRole("button")) expect(b).not.toHaveAttribute("tabindex");
  });

  it("horizontal joins with LOGICAL edges and corners, so RTL mirrors correctly", () => {
    render(
      <div dir="rtl">
        <ButtonGroup aria-label="Tree">
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>
      </div>,
    );
    const cls = screen.getByRole("group").className;
    expect(cls).toMatch(/\[&>\*:not\(:first-child\)\]:border-s/);
    expect(cls).toMatch(/\[&>:first-child\]:rounded-s-md/);
    expect(cls).toMatch(/\[&>:last-child\]:rounded-e-md/);
    expect(cls).not.toMatch(PHYSICAL);
  });

  it("vertical stacks and joins on the block axis", () => {
    render(
      <ButtonGroup aria-label="Zoom" orientation="vertical">
        <IconButton aria-label="Zoom in">
          <Plus />
        </IconButton>
        <IconButton aria-label="Zoom out">
          <Minus />
        </IconButton>
      </ButtonGroup>,
    );
    const cls = screen.getByRole("group", { name: "Zoom" }).className;
    expect(cls).toMatch(/flex-col/);
    expect(cls).toMatch(/\[&>\*:not\(:first-child\)\]:border-t/);
    expect(cls).toMatch(/\[&>:first-child\]:rounded-t-md/);
    expect(cls).toMatch(/\[&>:last-child\]:rounded-b-md/);
  });

  it("reaches a Tooltip-wrapped IconButton's corners too", () => {
    render(
      <ButtonGroup aria-label="Zoom">
        <Tooltip label="Zoom in">
          <IconButton aria-label="Zoom in">
            <Plus />
          </IconButton>
        </Tooltip>
        <Tooltip label="Zoom out">
          <IconButton aria-label="Zoom out">
            <Minus />
          </IconButton>
        </Tooltip>
      </ButtonGroup>,
    );
    const cls = screen.getByRole("group").className;
    expect(cls).toMatch(/\[&>:first-child>button\]:rounded-s-md/);
    expect(cls).toMatch(/\[&>\*>button\]:rounded-none/);
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
  });
});
