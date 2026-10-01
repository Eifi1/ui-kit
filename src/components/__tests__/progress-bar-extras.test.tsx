import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "../progress-bar";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("ProgressBar max={null} (unlimited)", () => {
  it("draws no bar and shows the value with 'Unlimited'", () => {
    const { container } = render(<ProgressBar label="Seats" value={1234} max={null} locale="en-US" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("meter")).toBeNull();
    expect(container.querySelector('[data-part="unlimited"]')).toHaveTextContent("1,234 · Unlimited");
    expect(container.firstElementChild).toHaveAttribute("data-state", "unlimited");
  });

  it("formats through formatValue (max = Infinity) and translates", () => {
    const { container } = render(
      <UiKitProvider labels={{ progressBar: { unlimited: "Unbegrenzt" } }}>
        <ProgressBar value={3} max={null} formatValue={(v, max) => `${v} files (${max})`} />
      </UiKitProvider>,
    );
    expect(container.querySelector('[data-part="unlimited"]')).toHaveTextContent("3 files (Infinity) · Unbegrenzt");
  });
});

describe("ProgressBar hint and overage", () => {
  it("describes the bar with the hint", () => {
    render(<ProgressBar value={3} max={5} aria-label="Seats" hint="Resets on the 1st" aria-describedby="own" />);
    const bar = screen.getByRole("progressbar");
    const ids = bar.getAttribute("aria-describedby")!.split(" ");
    expect(ids[0]).toBe("own");
    expect(document.getElementById(ids[1])).toHaveTextContent("Resets on the 1st");
  });

  it("says how far past max, the bar staying full", () => {
    const { container, rerender } = render(<ProgressBar value={12} max={10} aria-label="Units" overage locale="en-US" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10");
    expect(container.querySelector('[data-part="overage"]')).toHaveTextContent("2 over the limit");
    rerender(<ProgressBar value={12} max={10} aria-label="Units" overage={(over) => `CHF ${over} extra`} />);
    expect(container.querySelector('[data-part="overage"]')).toHaveTextContent("CHF 2 extra");
    rerender(<ProgressBar value={8} max={10} aria-label="Units" overage />);
    expect(container.querySelector('[data-part="overage"]')).toBeNull();
  });
});

describe("ProgressBar legend extras", () => {
  const segments = [
    { key: "fixed", label: "Fixed", value: 0.6 },
    { key: "flex", label: "Flexible", value: 0.4 },
    { key: "free", label: "Free", value: 0, legendOnly: true },
  ];

  it("lists legend-only entries without drawing them or naming them in the valuetext", () => {
    const { container } = render(
      <ProgressBar max={1} aria-label="Split" segments={segments} legend locale="en-US" />,
    );
    const bar = screen.getByRole("meter");
    expect(container.querySelectorAll('[data-part="segment"]')).toHaveLength(2);
    expect(bar.getAttribute("aria-valuetext")).not.toContain("Free");
    const rows = container.querySelectorAll('[data-part="legend"] li');
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveTextContent("Free");
    expect(rows[2]).toHaveTextContent("0%");
  });

  it("legendValue replaces the row's figure, handed the formatted share", () => {
    const { container } = render(
      <ProgressBar
        max={1}
        aria-label="Split"
        segments={segments}
        legend
        locale="en-US"
        legendValue={(seg, share, i) => (
          <span data-testid={`v-${i}`}>
            {share} · {seg.key}
          </span>
        )}
      />,
    );
    expect(screen.getByTestId("v-0")).toHaveTextContent("60% · fixed");
    expect(screen.getByTestId("v-2")).toHaveTextContent("0% · free");
    expect(container.querySelectorAll('[data-part="legend"] li')).toHaveLength(3);
  });
});

describe("ProgressBar sensitive (keksdose 0.17 Q6)", () => {
  const segments = [
    { value: 40, label: "Rent" },
    { value: 25, label: "Food" },
  ];

  it("tags the printed figures data-private and leaves names and the track readable", () => {
    const { container } = render(
      <ProgressBar sensitive segments={segments} legend label="Spending" showValue aria-label="x" />,
    );
    const values = container.querySelectorAll('[data-part="legend-value"]');
    expect(values).toHaveLength(2);
    values.forEach((v) => expect(v).toHaveAttribute("data-private", ""));
    expect(container.querySelector('[data-part="value"]')).toHaveAttribute("data-private", "");
    expect(screen.getByText("Rent")).not.toHaveAttribute("data-private");
    expect(screen.getByRole("meter")).not.toHaveAttribute("data-private");
  });

  it("tags a legendValue's own node, the unlimited figure and the overage line", () => {
    const { container, rerender } = render(
      <ProgressBar sensitive segments={segments} legend legendValue={(_s, f) => <b>{f}!</b>} aria-label="x" />,
    );
    expect(screen.getByText("40%!").closest("[data-private]")).not.toBeNull();
    rerender(<ProgressBar sensitive value={7} max={null} label="Seats" />);
    expect(container.querySelector('[data-part="unlimited"]')).toHaveAttribute("data-private", "");
    rerender(<ProgressBar sensitive value={120} overage aria-label="Usage" />);
    expect(container.querySelector('[data-part="overage"]')).toHaveAttribute("data-private", "");
  });

  it("tags nothing by default", () => {
    const { container } = render(<ProgressBar segments={segments} legend showValue label="S" />);
    expect(container.querySelector("[data-private]")).toBeNull();
  });
});
