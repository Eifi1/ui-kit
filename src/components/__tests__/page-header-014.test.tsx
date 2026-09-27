import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "../page-header";

const classes = (el: Element) => el.className.split(/\s+/);
const group = (name: string) => screen.getByRole("button", { name }).parentElement!;

describe("PageHeader truncateTitle (keksdose G6a)", () => {
  it("breaks words by default", () => {
    render(<PageHeader title="Payees" />);
    const h1 = classes(screen.getByRole("heading", { level: 1 }));
    expect(h1).toContain("break-words");
    expect(h1).not.toContain("truncate");
  });

  it("cuts to one line inside a title block that may shrink, with the full text in the heading", () => {
    const long = "Payees with a name far too long for a phone-width header row";
    render(
      <PageHeader title={long} truncateTitle mobileLayout="inline" actions={<button type="button">Add</button>} />,
    );
    const h1 = screen.getByRole("heading", { level: 1, name: long });
    expect(classes(h1)).toContain("truncate");
    expect(classes(h1)).not.toContain("break-words");
    expect(h1).not.toHaveAttribute("title");
    expect(classes(h1.parentElement!)).toEqual(expect.arrayContaining(["min-w-0", "flex-1"]));
  });
});

describe("PageHeader secondaryActions (keksdose G6b)", () => {
  const header = (mobileLayout?: "stacked" | "inline") =>
    render(
      <PageHeader
        title="Budget"
        mobileLayout={mobileLayout}
        actions={<button type="button">Next month</button>}
        secondaryActions={<button type="button">Collapse all</button>}
      />,
    );

  it("keeps DOM order title, actions, secondary — the phone's visual order", () => {
    header("inline");
    const [heading, primary, secondary] = [
      screen.getByRole("heading"),
      screen.getByRole("button", { name: "Next month" }),
      screen.getByRole("button", { name: "Collapse all" }),
    ];
    expect(heading.compareDocumentPosition(primary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(primary.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("inline: wraps the secondary group to its own full-width row on a phone, joins the row from sm", () => {
    header("inline");
    const row = classes(group("Next month").parentElement!);
    expect(row).toEqual(expect.arrayContaining(["flex-wrap", "sm:flex-nowrap"]));
    expect(classes(group("Collapse all"))).toEqual(
      expect.arrayContaining(["basis-full", "sm:basis-auto", "sm:order-1"]),
    );
    expect(classes(group("Next month"))).toContain("sm:order-2");
  });

  it("stacked: a column already, so no wrap and no basis — only the sm order swap", () => {
    header();
    expect(classes(group("Next month").parentElement!)).not.toContain("flex-wrap");
    expect(classes(group("Collapse all"))).not.toContain("basis-full");
    expect(classes(group("Collapse all"))).toContain("sm:order-1");
  });

  it("leaves the header untouched without one", () => {
    render(<PageHeader title="Budget" mobileLayout="inline" actions={<button type="button">Next month</button>} />);
    expect(classes(group("Next month"))).not.toContain("sm:order-2");
    expect(classes(group("Next month").parentElement!)).not.toContain("flex-wrap");
  });
});

describe("PageHeader actionsAlign (keksdose G8)", () => {
  it("adds no alignment by default", () => {
    render(<PageHeader title="Reports" actions={<button type="button">EUR</button>} />);
    expect(classes(group("EUR")).some((c) => c.includes("self-"))).toBe(false);
  });

  it("stacked: aligns from sm up only (a phone's column would centre horizontally)", () => {
    render(<PageHeader title="Reports" actionsAlign="center" actions={<button type="button">EUR</button>} />);
    const cls = classes(group("EUR"));
    expect(cls).toContain("sm:self-center");
    expect(cls).not.toContain("self-center");
  });

  it("inline: aligns at every width, and the secondary group with it", () => {
    render(
      <PageHeader
        title="Reports"
        mobileLayout="inline"
        actionsAlign="end"
        actions={<button type="button">EUR</button>}
        secondaryActions={<button type="button">Export</button>}
      />,
    );
    expect(classes(group("EUR"))).toContain("self-end");
    expect(classes(group("Export"))).toContain("self-end");
  });
});
