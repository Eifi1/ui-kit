import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "../page-header";
import { SECTION_LABEL_CLASS, SectionLabel } from "../text";
import { List, ListItem } from "../list";

const classes = (el: Element) => el.className.split(/\s+/);

describe("PageHeader size=compact (keksdose F4)", () => {
  it("is text-xl at every width, with no step up and no tight tracking", () => {
    render(<PageHeader title="Budgets" size="compact" />);
    const h1 = classes(screen.getByRole("heading", { level: 1, name: "Budgets" }));
    expect(h1).toEqual(expect.arrayContaining(["text-xl", "font-semibold"]));
    expect(h1.some((c) => c.startsWith("sm:text-"))).toBe(false);
    expect(h1).not.toContain("tracking-tight");
  });

  it("leaves md as it was: text-xl on a phone, text-2xl from sm up", () => {
    render(<PageHeader title="Units" />);
    expect(classes(screen.getByRole("heading", { level: 1 }))).toEqual(
      expect.arrayContaining(["text-xl", "sm:text-2xl", "tracking-tight"]),
    );
  });
});

describe("PageHeader mobileLayout (keksdose F4, live #263)", () => {
  const row = () => screen.getByRole("button", { name: "Search" }).parentElement!.parentElement!;

  it("stacks on a phone by default", () => {
    render(<PageHeader title="Transactions" actions={<button type="button">Search</button>} />);
    expect(classes(row())).toEqual(expect.arrayContaining(["flex-col", "sm:flex-row"]));
  });

  it("keeps the actions beside the title on a phone with inline", () => {
    render(
      <PageHeader title="Transactions" mobileLayout="inline" actions={<button type="button">Search</button>} />,
    );
    const cls = classes(row());
    expect(cls).toEqual(expect.arrayContaining(["flex-row", "items-center", "justify-between"]));
    expect(cls).not.toContain("flex-col");
  });
});

describe("SectionLabel variant=band (keksdose F5)", () => {
  it("draws the bar: surface-2, bottom border, medium secondary type, uppercase", () => {
    render(
      <SectionLabel as="div" variant="band">
        Today
      </SectionLabel>,
    );
    const cls = classes(screen.getByText("Today"));
    expect(cls).toEqual(
      expect.arrayContaining([
        "bg-[var(--bg-surface-2)]",
        "border-b",
        "border-[var(--border)]",
        "font-medium",
        "uppercase",
        "text-xs",
        "text-[var(--text-secondary)]",
      ]),
    );
    expect(cls).not.toContain("font-semibold");
    expect(cls).not.toContain("text-[var(--text-muted)]");
  });

  it("keeps the size's font size, and lets className move the padding", () => {
    render(
      <SectionLabel as="div" variant="band" size="md" className="px-3">
        Yesterday
      </SectionLabel>,
    );
    const cls = classes(screen.getByText("Yesterday"));
    expect(cls).toContain("text-caption");
    expect(cls).toContain("px-3");
    expect(cls).not.toContain("px-4");
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
    expect(classes(screen.getByText("Income"))).toEqual(expect.arrayContaining(["text-caption", "text-center"]));
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
    expect(classes(title("Crack in the bathroom tiles"))).toContain("truncate-until-large");
  });

  it("clamps at two lines with 2", () => {
    render(
      <List>
        <ListItem title="Crack in the bathroom tiles" titleLines={2} />
      </List>,
    );
    const cls = classes(title("Crack in the bathroom tiles"));
    expect(cls).toEqual(expect.arrayContaining(["line-clamp-2", "break-words"]));
    expect(cls).not.toContain("truncate");
    expect(cls).not.toContain("truncate-until-large");
  });

  it("shows every line with all, and the row keeps its name", () => {
    render(
      <List>
        <ListItem title="Crack in the bathroom tiles" titleLines="all" onClick={() => {}} />
      </List>,
    );
    const cls = classes(title("Crack in the bathroom tiles"));
    expect(cls).toContain("break-words");
    expect(cls).not.toContain("truncate");
    expect(cls.some((c) => c.startsWith("line-clamp"))).toBe(false);
    expect(screen.getByRole("button", { name: "Crack in the bathroom tiles" })).toBeInTheDocument();
  });
});
