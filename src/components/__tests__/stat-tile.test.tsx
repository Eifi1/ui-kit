import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StatTile, StatTileGrid } from "../stat-tile";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("StatTile", () => {
  it("formats a number value with Intl in the given locale and currency", () => {
    render(<StatTile label="Revenue" value={1234.5} currency="EUR" locale="de-DE" />);
    expect(screen.getByText(/1\.234,50\s€/)).toBeInTheDocument();
  });

  it("formats in the provider's locale, and compactly on request", () => {
    render(
      <UiKitProvider locale="en-US">
        <StatTile label="Users" value={12400} compact />
      </UiKitProvider>,
    );
    expect(screen.getByText("12K")).toBeInTheDocument();
  });

  it("renders a pre-formatted value as given, with a unit beside it", () => {
    render(<StatTile label="Lag" value="12.5" unit="ms" />);
    expect(screen.getByText("12.5")).toBeInTheDocument();
    expect(screen.getByText("ms")).toBeInTheDocument();
  });

  it("says 'No data' for a missing value rather than drawing a zero", () => {
    render(<StatTile label="Size" value={null} />);
    expect(screen.getByText("No data")).toHaveClass("sr-only");
    expect(screen.queryByText("0")).toBeNull();
  });

  it("states a delta with an arrow AND words, unjudged by default", () => {
    const { container } = render(<StatTile label="Users" value={40} delta={{ value: 5, label: "vs last week" }} />);
    expect(screen.getByText("Up 5")).toHaveClass("sr-only");
    expect(screen.getByText("vs last week")).toBeInTheDocument();
    expect(container.querySelector("svg[aria-hidden]")).not.toBeNull();
    expect(screen.getByText("Up 5").parentElement!.className).toContain("--text-muted");
  });

  it("judges by goodDirection: a falling cost is good news", () => {
    render(<StatTile label="Cost" value={80} delta={-20} goodDirection="down" />);
    const spoken = screen.getByText("Down 20 (better)");
    expect(spoken.parentElement!.className).toContain("--success");
  });

  it("calls a rise bad when down is good", () => {
    render(<StatTile label="Errors" value={3} delta={2} goodDirection="down" />);
    expect(screen.getByText("Up 2 (worse)").parentElement!.className).toContain("--danger");
  });

  it("reads a percent delta as a ratio", () => {
    render(<StatTile label="Rate" value="4%" delta={{ value: -0.125, unit: "percent" }} locale="en-US" />);
    expect(screen.getByText("Down 12.5%")).toBeInTheDocument();
  });

  it("takes delta words from the provider", () => {
    render(
      <UiKitProvider labels={{ statTile: { increase: (a) => `Plus ${a}` } }}>
        <StatTile label="X" value={1} delta={1} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Plus 1")).toBeInTheDocument();
  });

  it("tones a signed value by its sign, and each sub-value by its own", () => {
    render(
      <StatTile
        label="Net"
        value={-50}
        tone="signed"
        subValues={[
          { label: "AUG", value: 120 },
          { label: "JUL", value: -30 },
        ]}
      />,
    );
    expect(screen.getByText("-50").className).toContain("--money-expense");
    expect(screen.getByText("120").className).toContain("--money-income");
    expect(screen.getByText("-30").className).toContain("--money-expense");
    expect(screen.getByText("AUG").tagName).toBe("DT");
  });

  it("tags every figure data-private when sensitive", () => {
    const { container } = render(
      <StatTile label="Balance" value={10} delta={2} subValues={[{ label: "AUG", value: 8 }]} trend={[1, 2]} sensitive />,
    );
    // Value, delta, the one sub-value and the sparkline.
    expect(container.querySelectorAll("[data-private]")).toHaveLength(4);
    expect(container.querySelector("svg[role=img]")).toHaveAttribute("data-private");
  });

  it("tags nothing by default", () => {
    const { container } = render(<StatTile label="Rate" value={10} delta={2} />);
    expect(container.querySelector("[data-private]")).toBeNull();
  });

  it("names the trend sparkline after the tile and speaks in its format", () => {
    render(<StatTile label="Spend" value={40} currency="USD" locale="en-US" trend={[10, 40]} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Spend: Rising from $10.00 to $40.00");
  });

  it("shows a hint behind a '?' button", () => {
    render(<StatTile label="Share" value="50%" hint="Matched over placeable spend" />);
    expect(screen.getByRole("button", { name: "Matched over placeable spend" })).toBeInTheDocument();
  });

  it("is busy and withholds the figures while loading", () => {
    const { container } = render(<StatTile label="Users" value={3} delta={1} trend={[1, 2]} loading />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading…")).toHaveClass("sr-only");
    expect(screen.queryByText("3")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("becomes a stretched link named by its label and described by its value", () => {
    render(<StatTile label="Invoices" value={12} href="/invoices" />);
    const link = screen.getByRole("link", { name: "Invoices" });
    expect(link).toHaveAttribute("href", "/invoices");
    expect(link).toHaveAccessibleDescription("12");
    expect(link.className).toContain("after:absolute");
  });

  it("hands the link to a router through renderLink", () => {
    const renderLink = vi.fn(({ href, children, ...rest }) => (
      <a data-router="" href={`#${href}`} {...rest}>
        {children}
      </a>
    ));
    render(<StatTile label="Leases" value={3} href="/leases" renderLink={renderLink} />);
    expect(screen.getByRole("link", { name: "Leases" })).toHaveAttribute("data-router");
  });

  it("becomes a button on onClick", () => {
    const onClick = vi.fn();
    render(<StatTile label="Units" value={9} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Units" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps its hint reachable above the stretched link", () => {
    render(<StatTile label="Units" value={9} href="/u" hint="Rentable units" />);
    expect(screen.getByRole("button", { name: "Rentable units" }).className).toContain("z-10");
  });

  it("keeps every sr-only node in a positioned ancestor", () => {
    const { container } = render(
      <StatTile label="X" value={null} delta={1} />,
    );
    for (const el of container.querySelectorAll(".sr-only")) {
      let node = el.parentElement;
      let positioned = false;
      while (node && node !== container) {
        if (/(^|\s)(relative|absolute|fixed|sticky)(\s|$)/.test(node.className)) positioned = true;
        node = node.parentElement;
      }
      expect(positioned).toBe(true);
    }
  });
});

describe("StatTileGrid", () => {
  it("fits columns to its own width, not the viewport", () => {
    const { container } = render(
      <StatTileGrid minTileWidth="12rem">
        <StatTile label="A" value={1} />
      </StatTileGrid>,
    );
    expect((container.firstElementChild as HTMLElement).style.gridTemplateColumns).toBe(
      "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
    );
  });
});
