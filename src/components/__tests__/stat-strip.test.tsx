import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatStrip } from "../stat-strip";
import { StatTile } from "../stat-tile";
import { UiKitProvider } from "../../i18n/kit-labels";
import * as barrel from "../../index";

/**
 * StatStrip (0.66): a quiet row of three to six figures — no cards, a hairline above and
 * below — built from StatTile, so a tile keeps its loading, its link and its formatting.
 */
describe("StatStrip", () => {
  const strip = (container: HTMLElement) => container.firstElementChild as HTMLElement;

  it("is a grid between two hairlines, its tiles plain: no card, no fill, no padding", () => {
    const { container } = render(
      <StatStrip>
        <StatTile label="Experiments" value={42} />
        <StatTile label="Visitors" value={1200} />
        <StatTile label="Topics" value={9} />
      </StatStrip>,
    );
    expect(strip(container)).toHaveClass("grid", "border-y", "border-subtle");
    const tiles = container.querySelectorAll("[data-variant]");
    expect(tiles).toHaveLength(3);
    for (const tile of tiles) {
      expect(tile).toHaveAttribute("data-variant", "plain");
      expect(tile).not.toHaveClass("shadow-sm");
    }
  });

  it("leaves a tile's own variant alone", () => {
    const { container } = render(
      <StatStrip>
        <StatTile label="A" value={1} variant="inset" />
        <StatTile label="B" value={2} />
        <StatTile label="C" value={3} />
      </StatStrip>,
    );
    expect(container.querySelector('[data-variant="inset"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-variant="plain"]')).toHaveLength(2);
  });

  it("is two columns on a phone, three below lg (two for four tiles), one row from lg", () => {
    const tiles = (n: number) => Array.from({ length: n }, (_, i) => <StatTile key={i} label={`T${i}`} value={i} />);
    const three = strip(render(<StatStrip>{tiles(3)}</StatStrip>).container);
    expect(three).toHaveClass(
      "grid-cols-2",
      "sm:grid-cols-3",
      "lg:grid-flow-col",
      "lg:auto-cols-fr",
      "lg:grid-cols-none",
    );
    const four = strip(render(<StatStrip>{tiles(4)}</StatStrip>).container);
    expect(four).toHaveClass("grid-cols-2", "lg:grid-flow-col");
    expect(four).not.toHaveClass("sm:grid-cols-3");
    const six = strip(render(<StatStrip>{tiles(6)}</StatStrip>).container);
    expect(six).toHaveClass("sm:grid-cols-3");
  });

  it("keeps a tile's number formatting and its link", () => {
    render(
      <UiKitProvider locale="de-DE">
        <StatStrip>
          <StatTile label="Umsatz" value={1234.5} currency="EUR" href="/umsatz" />
          <StatTile label="Besucher" value={1240000} compact />
          <StatTile label="Themen" value={9} />
        </StatStrip>
      </UiKitProvider>,
    );
    expect(screen.getByText(/1\.234,50\s€/)).toBeInTheDocument();
    expect(screen.getByText(/1,2\sMio\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Umsatz" })).toHaveAttribute("href", "/umsatz");
  });

  it("loading: every tile shows its skeleton, and the strip says Loading once", () => {
    const { container } = render(
      <StatStrip loading>
        <StatTile label="A" value={1} />
        <StatTile label="B" value={2} />
        <StatTile label="C" value={3} />
      </StatStrip>,
    );
    expect(strip(container)).toHaveAttribute("aria-busy", "true");
    expect(within(strip(container)).getAllByText("Loading…")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(container.querySelectorAll('[aria-busy="true"][data-variant="plain"]')).toHaveLength(3);
  });

  it("a tile's own loading still speaks for itself", () => {
    render(
      <StatStrip>
        <StatTile label="A" value={1} loading />
        <StatTile label="B" value={2} />
        <StatTile label="C" value={3} />
      </StatStrip>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.getAllByText("Loading…")).toHaveLength(1);
  });

  it("is exported from the barrel", () => {
    expect(barrel.StatStrip).toBe(StatStrip);
  });
});
