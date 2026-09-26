import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Minus, Plus } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ButtonGroup, ButtonGroupLink } from "../button-group";
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

describe("ButtonGroup — elevated, gapped, link members", () => {
  it("elevated fills and shadows the joined frame", () => {
    render(
      <ButtonGroup aria-label="Map" elevated>
        <Button>A</Button>
      </ButtonGroup>,
    );
    const cls = screen.getByRole("group").className;
    expect(cls).toContain("bg-[var(--bg-surface)]");
    expect(cls).toContain("shadow-lg");
    expect(cls).toContain("[&>*]:rounded-none");
  });

  it("variant=gapped keeps each member's own shape, apart, with nothing stripped", () => {
    render(
      <div dir="rtl">
        <ButtonGroup aria-label="Zoom" variant="gapped" elevated>
          <IconButton variant="overlay" aria-label="Zoom out">
            <Minus />
          </IconButton>
          <IconButton variant="overlay" aria-label="Zoom in">
            <Plus />
          </IconButton>
        </ButtonGroup>
      </div>,
    );
    const group = screen.getByRole("group", { name: "Zoom" });
    expect(group).toHaveAttribute("data-variant", "gapped");
    expect(group.className).toContain("gap-1");
    expect(group.className).not.toContain("rounded-none");
    expect(group.className).not.toContain("border-s");
    // The shadow goes on the discs, not on the tooltip's square wrapper.
    expect(group.className).toContain("[&>button]:shadow-md");
    expect(group.className).not.toContain("[&>*]:shadow");
    expect(group.className).not.toMatch(PHYSICAL);
    expect(screen.getByRole("button", { name: "Zoom out" }).className).toContain("rounded-full");
  });

  it("gapped vertical stacks", () => {
    render(
      <ButtonGroup aria-label="Zoom" variant="gapped" orientation="vertical">
        <Button>A</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole("group").className).toContain("flex-col");
  });

  it("joins link members, bare or under a tooltip, with logical corners", () => {
    render(
      <ButtonGroup aria-label="Pages">
        <ButtonGroupLink href="/a" current>
          A
        </ButtonGroupLink>
        <Tooltip label="B page">
          <ButtonGroupLink href="/b">B</ButtonGroupLink>
        </Tooltip>
      </ButtonGroup>,
    );
    const cls = screen.getByRole("group").className;
    expect(cls).toMatch(/\[&>\*>a\]:rounded-none/);
    expect(cls).toMatch(/\[&>:last-child>a\]:rounded-e-md/);
    const a = screen.getByRole("link", { name: "A" });
    expect(a).toHaveAttribute("href", "/a");
    expect(a).toHaveAttribute("aria-current", "page");
    expect(a.className).toContain("bg-[var(--brand-bg)]");
    expect(screen.getByRole("link", { name: "B" })).not.toHaveAttribute("aria-current");
  });

  it("renders a link member through renderLink, keeping the button look", () => {
    const onClick = vi.fn();
    render(
      <ButtonGroup aria-label="Pages">
        <Button>Export</Button>
        <ButtonGroupLink
          href="/report"
          onClick={onClick}
          renderLink={({ href, children, ...p }) => (
            <a data-router="" href={`#${href}`} {...p}>
              {children}
            </a>
          )}
        >
          Open report
        </ButtonGroupLink>
      </ButtonGroup>,
    );
    const link = screen.getByRole("link", { name: "Open report" });
    expect(link).toHaveAttribute("data-router");
    expect(link).toHaveAttribute("href", "#/report");
    expect(link.parentElement).toBe(screen.getByRole("group"));
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keyboard: buttons and links each keep a tab stop, in order", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <ButtonGroup aria-label="Pages" elevated>
        <Button onClick={onExport}>Export</Button>
        <ButtonGroupLink href="/report">Open report</ButtonGroupLink>
      </ButtonGroup>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Export" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onExport).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(screen.getByRole("link", { name: "Open report" })).toHaveFocus();
  });
});
