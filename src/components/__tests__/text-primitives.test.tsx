import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CAPTION_CLASS, Caption, SECTION_LABEL_CLASS, SectionLabel } from "../text";
import { StatusDot } from "../status-dot";
import { PageHeader } from "../page-header";
import { LegendGroup } from "../toggle-legend";

describe("SectionLabel", () => {
  it("is an h3 by default, and the level the caller names", () => {
    const { rerender } = render(<SectionLabel>Signal</SectionLabel>);
    expect(screen.getByRole("heading", { level: 3, name: "Signal" })).toBeInTheDocument();
    rerender(<SectionLabel as="h2">Signal</SectionLabel>);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<SectionLabel as="span">Signal</SectionLabel>);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("draws the same label LegendGroup draws at xs", () => {
    render(
      <>
        <SectionLabel size="xs">Mine</SectionLabel>
        <LegendGroup title="Legend">x</LegendGroup>
      </>,
    );
    const legend = screen.getByText("Legend").className.split(/\s+/);
    for (const cls of SECTION_LABEL_CLASS.xs.split(/\s+/)) expect(legend).toContain(cls);
    expect(screen.getByText("Mine").className).toContain("uppercase");
  });
});

describe("Caption", () => {
  it("is an 11px snug muted paragraph", () => {
    render(<Caption>Written by the shortcut.</Caption>);
    const p = screen.getByText("Written by the shortcut.");
    expect(p.tagName).toBe("P");
    for (const cls of CAPTION_CLASS.split(/\s+/)) expect(p.className).toContain(cls);
  });
});

describe("StatusDot", () => {
  it("is hidden from assistive technology without a label", () => {
    const { container } = render(<StatusDot tone="danger" />);
    const dot = container.firstElementChild!;
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot.className).toContain("bg-[var(--danger)]");
  });

  it("is an image with a name when given aria-label", () => {
    render(<StatusDot tone="success" aria-label="Online" />);
    expect(screen.getByRole("img", { name: "Online" })).toBeInTheDocument();
  });

  it("shows a visible label and hides the dot itself", () => {
    const { container } = render(<StatusDot tone="warning" size="lg" label="Renovation" />);
    expect(screen.getByText("Renovation")).toBeInTheDocument();
    const dot = container.querySelector(".rounded-full")!;
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot.className).toContain("size-3");
    expect(dot.className).toContain("bg-[var(--warning)]");
  });

  it("uses ProgressBar's tone names, money pair included, and rings on request", () => {
    const { container } = render(<StatusDot tone="income" ring />);
    const dot = container.firstElementChild!;
    expect(dot.className).toContain("bg-[var(--money-income)]");
    expect(dot.className).toContain("ring-[var(--bg-surface)]");
  });
});

describe("PageHeader", () => {
  it("renders an h1 title, description, eyebrow, breadcrumbs and actions", () => {
    render(
      <PageHeader
        title="Building A"
        eyebrow="Property"
        description="12 units"
        breadcrumbs={<nav aria-label="Breadcrumb">trail</nav>}
        actions={<button type="button">Edit</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Building A" })).toBeInTheDocument();
    expect(screen.getByText("Property").className).toContain("uppercase");
    expect(screen.getByText("12 units")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" }).parentElement!.className).toContain("flex-wrap");
  });

  it("stacks on phones and sits side by side from sm up", () => {
    render(<PageHeader title="T" actions={<button type="button">Go</button>} as="h2" />);
    const row = screen.getByRole("heading", { level: 2 }).parentElement!.parentElement!;
    expect(row.className).toContain("flex-col");
    expect(row.className).toContain("sm:flex-row");
  });
});
