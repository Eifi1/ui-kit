import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../ui";

describe("EmptyState variant=inline (keksdose's hand-written muted lines)", () => {
  it("is one quiet row with no dashed box", () => {
    const { container } = render(
      <EmptyState variant="inline" title="No notifications" hint="You're all caught up" icon={<svg />} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain("border-dashed");
    expect(root.className).toContain("flex-wrap");
    expect(root.className).toContain("items-center");
    expect(screen.getByText("No notifications").className).not.toContain("font-medium");
    expect(screen.getByText("You're all caught up").tagName).toBe("SPAN");
    // The glyph shrinks to the text.
    expect(root.querySelector("[aria-hidden]")!.className).toContain("[&_svg]:size-4");
  });

  it("keeps the box by default", () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("border-dashed");
  });

  it("still takes a heading level and a caller's className", () => {
    const { container } = render(
      <EmptyState variant="inline" headingAs="h3" title="Nothing" className="justify-start" />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Nothing" })).toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).className).toContain("justify-start");
    expect((container.firstElementChild as HTMLElement).className).not.toContain("justify-center");
  });
});

describe("EmptyState tone (kastlan's error state and its no-defects note)", () => {
  it("colours icon and title for danger, leaving the hint muted", () => {
    const { container } = render(
      <EmptyState tone="danger" icon={<svg />} title="Something went wrong" hint="Try again" />,
    );
    expect(container.querySelector("[aria-hidden]")!.className).toContain("text-[var(--danger)]");
    expect(screen.getByText("Something went wrong").className).toContain("text-[var(--danger)]");
    expect(screen.getByText("Try again").className).not.toContain("--danger");
  });

  it("colours icon and title for success, inline too", () => {
    const { container } = render(
      <EmptyState variant="inline" tone="success" icon={<svg />} title="No defects recorded" />,
    );
    expect(container.querySelector("[aria-hidden]")!.className).toContain("text-[var(--success)]");
    expect(screen.getByText("No defects recorded").className).toContain("text-[var(--success)]");
  });

  it("stays muted without a tone", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here").className).toContain("text-[var(--text-secondary)]");
  });
});

describe("EmptyState inline size (keksdose's panel empty lines)", () => {
  it("sm is 12px, start-aligned and tight", () => {
    const { container } = render(<EmptyState variant="inline" size="sm" title="No holdings yet" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("text-xs");
    expect(root.className).toContain("justify-start");
    expect(root.className).toContain("text-start");
    expect(root.className).not.toContain("justify-center");
    expect(root.className).not.toContain("py-4");
    expect(screen.getByText("No holdings yet").className).toContain("text-xs");
  });

  it("md stays the centred 14px line it was", () => {
    const { container } = render(<EmptyState variant="inline" title="Nothing" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("justify-center");
    expect(root.className).toContain("text-sm");
  });
});
