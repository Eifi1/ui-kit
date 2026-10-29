import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "../page-header";
import { SECTION_LABEL_CLASS, SectionLabel } from "../text";
import { List, ListItem } from "../list";

describe("PageHeader size=compact (keksdose F4)", () => {
  it("is text-xl at every width, with no step up and no tight tracking", () => {
    render(<PageHeader title="Budgets" size="compact" />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Budgets" });
    expect(h1).toHaveClass("text-xl", "font-semibold");
    expect([...h1.classList].some((c) => c.startsWith("sm:text-"))).toBe(false);
    expect(h1).not.toHaveClass("tracking-tight");
  });

  it("leaves md as it was: text-xl on a phone, text-2xl from sm up", () => {
    render(<PageHeader title="Units" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-xl", "sm:text-2xl", "tracking-tight");
  });
});

describe("PageHeader mobileLayout (keksdose F4, live #263)", () => {
  const row = () => screen.getByRole("button", { name: "Search" }).parentElement!.parentElement!;

  it("stacks on a phone by default", () => {
    render(<PageHeader title="Transactions" actions={<button type="button">Search</button>} />);
    expect(row()).toHaveClass("flex-col", "sm:flex-row");
  });

  it("keeps the actions beside the title on a phone with inline", () => {
    render(<PageHeader title="Transactions" mobileLayout="inline" actions={<button type="button">Search</button>} />);
    const el = row();
    expect(el).toHaveClass("flex-row", "items-center", "justify-between");
    expect(el).not.toHaveClass("flex-col");
  });
});

describe("SectionLabel variant=band (keksdose F5)", () => {
  it("draws the bar: surface-2, bottom border, medium secondary type, uppercase", () => {
    render(
      <SectionLabel as="div" variant="band">
        Today
      </SectionLabel>,
    );
    const el = screen.getByText("Today");
    expect(el).toHaveClass(
      "bg-surface-2",
      "border-b",
      "border-subtle",
      "font-medium",
      "uppercase",
      "text-xs",
      "text-secondary",
    );
    expect(el).not.toHaveClass("font-semibold");
    expect(el).not.toHaveClass("text-muted");
  });

  it("keeps the size's font size, and lets className move the padding", () => {
    render(
      <SectionLabel as="div" variant="band" size="md" className="px-3">
        Yesterday
      </SectionLabel>,
    );
    const el = screen.getByText("Yesterday");
    expect(el).toHaveClass("text-caption");
    expect(el).toHaveClass("px-3");
    expect(el).not.toHaveClass("px-4");
  });

  it("leaves the plain label untouched", () => {
    render(<SectionLabel>Signal</SectionLabel>);
    expect(screen.getByText("Signal").className).toBe(SECTION_LABEL_CLASS.sm);
  });
});

describe("SectionLabel size=md over a chart column (lenkbank P9)", () => {
  it("is the 11px rung", () => {
    render(
      <SectionLabel as="p" size="md" className="text-center">
        Income
      </SectionLabel>,
    );
    expect(screen.getByText("Income")).toHaveClass("text-caption", "text-center");
  });
});

describe("ListItem titleLines (kastlan 44)", () => {
  const title = (text: string) => screen.getByText(text);

  it("truncates to one line by default", () => {
    render(
      <List>
        <ListItem title="Crack in the bathroom tiles" />
      </List>,
    );
    // `truncate` at Normal, a wrap at Large: the kit's one utility for it (0.33, §10.17).
    expect(title("Crack in the bathroom tiles")).toHaveClass("truncate-until-large");
  });

  it("clamps at two lines with 2", () => {
    render(
      <List>
        <ListItem title="Crack in the bathroom tiles" titleLines={2} />
      </List>,
    );
    const el = title("Crack in the bathroom tiles");
    expect(el).toHaveClass("line-clamp-2", "break-words");
    expect(el).not.toHaveClass("truncate");
    expect(el).not.toHaveClass("truncate-until-large");
  });

  it("shows every line with all, and the row keeps its name", () => {
    render(
      <List>
        <ListItem title="Crack in the bathroom tiles" titleLines="all" onClick={() => {}} />
      </List>,
    );
    const el = title("Crack in the bathroom tiles");
    expect(el).toHaveClass("break-words");
    expect(el).not.toHaveClass("truncate");
    expect([...el.classList].some((c) => c.startsWith("line-clamp"))).toBe(false);
    expect(screen.getByRole("button", { name: "Crack in the bathroom tiles" })).toBeInTheDocument();
  });
});
