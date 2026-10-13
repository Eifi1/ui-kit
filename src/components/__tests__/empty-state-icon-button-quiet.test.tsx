import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../empty-state";
import { IconButton } from "../icon-button";

describe("EmptyState — headingAs and node slots", () => {
  it("keeps a <div> title by default", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Nothing here").tagName).toBe("DIV");
  });

  it("renders the title as the heading level asked for", () => {
    render(<EmptyState headingAs="h2" title="Something went wrong" />);
    const heading = screen.getByRole("heading", { level: 2, name: "Something went wrong" });
    expect(heading.className).toContain("font-medium");
  });

  it("takes nodes for title and hint (keksdose's error boundary)", () => {
    render(
      <EmptyState
        headingAs="h3"
        title={
          <>
            Crashed: <code>TypeError</code>
          </>
        }
        hint={
          <>
            Try <a href="/">home</a>
          </>
        }
      />,
    );
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.querySelector("code")).toHaveTextContent("TypeError");
    expect(screen.getByRole("link", { name: "home" })).toBeInTheDocument();
  });

  it("renders no hint line for an empty or false hint", () => {
    const { container, rerender } = render(<EmptyState title="t" hint="" />);
    expect(container.querySelector(".mt-1")).toBeNull();
    rerender(<EmptyState title="t" hint={false} />);
    expect(container.querySelector(".mt-1")).toBeNull();
  });
});

describe("IconButton quiet", () => {
  it("keeps each tone's resting look by default", () => {
    const { rerender } = render(<IconButton tone="danger" aria-label="x">x</IconButton>);
    expect(screen.getByRole("button").className).toContain("text-placeholder");
    expect(screen.getByRole("button")).toHaveClass("hover:text-danger");
    rerender(<IconButton tone="warning" aria-label="x">x</IconButton>);
    expect(screen.getByRole("button")).toHaveClass("text-warning");
    expect(screen.getByRole("button").className).not.toContain("text-placeholder");
    rerender(<IconButton tone="info" aria-label="x">x</IconButton>);
    expect(screen.getByRole("button")).toHaveClass("text-info");
  });

  it("quiet={false} keeps danger red at rest, for a lone destructive action on touch", () => {
    render(
      <IconButton tone="danger" quiet={false} aria-label="Delete all">
        x
      </IconButton>,
    );
    const cls = screen.getByRole("button").className;
    expect(screen.getByRole("button")).toHaveClass("text-danger");
    expect(cls).toContain("hover:bg-danger-soft");
    expect(cls).not.toContain("text-placeholder");
    // Toned: the glyph does not change on hover, so there is nothing to pin when disabled.
    expect(cls).not.toContain("disabled:hover:text-");
  });

  it("quiet on warning/info waits for the pointer, like danger does", () => {
    for (const tone of ["warning", "info"] as const) {
      const { unmount } = render(
        <IconButton tone={tone} quiet aria-label="x">
          x
        </IconButton>,
      );
      const cls = screen.getByRole("button").className;
      expect(screen.getByRole("button")).toHaveClass("text-placeholder");
      expect(screen.getByRole("button")).toHaveClass(`hover:text-${tone}`);
      expect(cls).toContain("disabled:hover:text-placeholder");
      unmount();
    }
  });

  it("ignores quiet on muted and default", () => {
    const { rerender } = render(<IconButton tone="muted" quiet={false} aria-label="x">x</IconButton>);
    expect(screen.getByRole("button").className).toContain("text-placeholder");
    rerender(<IconButton quiet aria-label="x">x</IconButton>);
    expect(screen.getByRole("button").className).not.toContain("text-placeholder");
  });
});
