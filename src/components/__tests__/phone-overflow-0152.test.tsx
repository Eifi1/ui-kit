import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs } from "../ui";
import { ToggleGroup } from "../toggle-group";

/** lenkbank's 390px pass (L3, L4). Classes only: jsdom has no layout. */
describe("no tab outgrows its strip (L3)", () => {
  it("caps the tab and truncates a long detail line, keeping it in the name", () => {
    const detail = "Spurstangenkraft links · Spurstangenkraft rechts · Reibung 140,0 N · 31 Punkte";
    render(<Tabs tabs={[{ id: "a", label: "Blatt 1", detail }]} active="a" onChange={() => {}} />);
    const tab = screen.getByRole("tab", { name: new RegExp(detail) });
    expect(tab.className).toContain("max-w-full");
    expect(screen.getByText(detail).className).toContain("truncate");
  });
});

describe("ToggleGroup overflow (L4)", () => {
  const options = ["Sprung", "Rampe", "Sinus", "Sweep", "Bewegung"].map((v) => ({ value: v, label: v }));
  it("truncates by default", () => {
    render(<ToggleGroup aria-label="Signal" options={options} value="Sinus" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Bewegung" }).className).toContain("truncate");
    expect(screen.getByRole("radiogroup").className).not.toContain("flex-wrap");
  });

  it("wraps with overflow=\"wrap\" and never truncates a label", () => {
    render(<ToggleGroup aria-label="Signal" options={options} value="Sinus" onChange={() => {}} overflow="wrap" />);
    expect(screen.getByRole("radiogroup").className).toContain("flex-wrap");
    const option = screen.getByRole("radio", { name: "Bewegung" });
    expect(option.className).not.toContain("truncate");
    expect(option.className).toContain("whitespace-nowrap");
  });
});
