import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "../progress-bar";
import { Sparkline } from "../sparkline";
import { StatTile } from "../stat-tile";

// 0.49 KIT-1: a kit component's own default formatting prints U+2212, never a hyphen.
const M = "\u2212";

describe("components print negatives with U+2212 (KIT-1)", () => {
  it("StatTile's headline", () => {
    render(<StatTile label="Balance" value={-1250.5} currency="CHF" locale="en" />);
    expect(screen.getByText(`${M}CHF 1,250.50`)).toBeInTheDocument();
  });

  it("StatTile's compact headline", () => {
    render(<StatTile label="Net" value={-12400} compact locale="en-US" />);
    expect(screen.getByText(`${M}12K`)).toBeInTheDocument();
  });

  it("Sparkline's spoken summary", () => {
    render(<Sparkline data={[-12, -40]} locale="en" />);
    expect(screen.getByRole("img")).toHaveAccessibleName(`Falling from ${M}12 to ${M}40`);
  });

  it("ProgressBar's unlimited value", () => {
    render(<ProgressBar value={-3} max={null} label="Credit" locale="en" />);
    expect(document.querySelector('[data-part="unlimited"]')?.textContent).toContain(`${M}3`);
    expect(document.body.textContent).not.toMatch(/-\d/);
  });
});
