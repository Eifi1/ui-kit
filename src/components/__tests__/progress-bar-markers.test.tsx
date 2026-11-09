import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "../progress-bar";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * 0.58: `markers` — a tick across the track at a recommendation, a target, a limit.
 * keksdose's food-pyramid meters (food-pyramid-card) drew theirs over the kit's bar by
 * hand, an `aria-hidden` span: a reader heard the share and never what it was measured
 * against. jsdom lays nothing out, so this pins the wiring — where each tick is told to
 * stand, its colour, the room the bar keeps, and what a reader hears.
 */

const ticks = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>('[data-part="marker"]'));
const at = (tick: HTMLElement) => Number(tick.style.getPropertyValue("--progress-marker-at"));

describe("ProgressBar markers", () => {
  it("draws a tick at each value, clamped into the scale, and leaves a non-finite one out", () => {
    const { container } = render(
      <ProgressBar
        variant="meter"
        value={30}
        min={0}
        max={200}
        aria-label="Fruit"
        markers={[
          { value: 100, label: "Recommended" },
          { value: 250, label: "Limit" },
          { value: -10, label: "Floor" },
          { value: Number.NaN, label: "Nothing" },
        ]}
      />,
    );
    const drawn = ticks(container);
    expect(drawn.map(at)).toEqual([0.5, 1, 0]);
    // Decoration: what a reader hears is the description.
    for (const tick of drawn) expect(tick).toHaveAttribute("aria-hidden", "true");
    // Logical, so it mirrors with the fill under RTL; whole inside the track at 0 and 1.
    expect(drawn[0].className).toContain("start-[calc((100%_-_2px)*var(--progress-marker-at))]");
    expect(drawn[0]).toHaveClass("w-[2px]", "absolute", "-inset-y-1");
  });

  it("says every marker in the bar's description, its value unclamped, before the hint", () => {
    render(
      <ProgressBar
        variant="meter"
        value={30}
        aria-label="Fruit"
        hint="Per week"
        aria-describedby="own"
        markers={[
          { value: 50, label: "Recommended" },
          { value: 120, label: "Limit" },
        ]}
        locale="en-US"
      />,
    );
    const meter = screen.getByRole("meter", { name: "Fruit" });
    const ids = meter.getAttribute("aria-describedby")!.split(" ");
    expect(ids[0]).toBe("own");
    expect(document.getElementById(ids[1])).toHaveTextContent("Recommended: 50%, Limit: 120%");
    expect(document.getElementById(ids[2])).toHaveTextContent("Per week");
    // Hidden, and read all the same: the reader hears it, the screen shows the ticks.
    expect(document.getElementById(ids[1])).toHaveAttribute("hidden");
    expect(meter).toHaveAccessibleDescription(/Recommended: 50%, Limit: 120%/);
    // The value is the bar's own and stays so.
    expect(meter).toHaveAttribute("aria-valuetext", "30%");
  });

  it("says a marker through formatValue, its own valueText, or its label alone", () => {
    const { container, rerender } = render(
      <ProgressBar
        value={3}
        max={10}
        aria-label="Files"
        formatValue={(v, max) => `${v} of ${max} files`}
        markers={[{ value: 8, label: "Target" }]}
      />,
    );
    const description = () => container.querySelector('[data-part="markers"]');
    expect(description()).toHaveTextContent("Target: 8 of 10 files");
    // keksdose's meter runs to twice the recommendation; its formatValue states the
    // whole reading whatever it is handed.
    rerender(
      <ProgressBar
        variant="meter"
        value={30}
        aria-label="Fruit"
        formatValue={() => "15% of the plate, 25% recommended"}
        markers={[{ value: 50, label: "Recommended", valueText: "25%" }]}
      />,
    );
    expect(description()).toHaveTextContent(/^Recommended: 25%$/);
    rerender(
      <ProgressBar
        variant="meter"
        value={30}
        aria-label="Fruit"
        markers={[{ value: 50, label: "Recommended 25%", valueText: null }]}
      />,
    );
    expect(description()).toHaveTextContent(/^Recommended 25%$/);
  });

  it("puts a node label where the catalogue puts the field", () => {
    const { container } = render(
      <UiKitProvider labels={{ common: { fieldValue: (field, value) => `${value} — ${field}` } }}>
        <ProgressBar
          variant="meter"
          value={30}
          aria-label="Fruit"
          markers={[{ value: 50, label: <b>Recommended</b>, key: "rec" }]}
          locale="en-US"
        />
      </UiKitProvider>,
    );
    const description = container.querySelector('[data-part="markers"]')!;
    expect(description).toHaveTextContent("50% — Recommended");
    expect(description.querySelector("b")).toHaveTextContent("Recommended");
  });

  it("colours a tick by its tone, the body text colour without one", () => {
    const { container } = render(
      <ProgressBar
        value={30}
        aria-label="Budget"
        markers={[
          { value: 50, label: "Plan" },
          { value: 90, label: "Limit", tone: "danger" },
        ]}
      />,
    );
    const [plan, limit] = ticks(container);
    expect(plan.className).toContain("bg-[var(--text-primary)]");
    expect(limit).toHaveClass("bg-danger");
  });

  it("keeps room for the ticks only where nothing next to the bar gives it", () => {
    const frame = (container: HTMLElement) => container.querySelector('[data-part="track-frame"]')!;
    const marker = [{ value: 50, label: "Recommended" }];
    // Alone: 4px of the track's own above and below.
    const { container, rerender } = render(<ProgressBar value={30} aria-label="x" markers={marker} />);
    expect(frame(container)).toHaveClass("mt-1", "mb-1");
    // A label row above (its own mb-1) and a hint below (its own mt-1).
    rerender(<ProgressBar value={30} label="Fruit" hint="Per week" markers={marker} />);
    expect(frame(container)).not.toHaveClass("mt-1");
    expect(frame(container)).not.toHaveClass("mb-1");
    // The frame holds the track, which keeps every attribute it had.
    expect(frame(container).firstElementChild).toHaveAttribute("role", "progressbar");
  });

  it("draws over the parts of a segmented bar, on the same scale", () => {
    const { container } = render(
      <ProgressBar
        aria-label="Spending"
        max={1}
        segments={[
          { value: 0.4, label: "Rent" },
          { value: 0.2, label: "Food" },
        ]}
        markers={[{ value: 0.75, label: "Budget" }]}
        locale="en-US"
      />,
    );
    expect(ticks(container).map(at)).toEqual([0.75]);
    expect(screen.getByRole("meter")).toHaveAccessibleDescription("Budget: 75%");
  });

  it('is built from spans under as="span", the description too', () => {
    const { container } = render(
      <button type="button">
        <ProgressBar as="span" value={40} aria-label="Budget" markers={[{ value: 60, label: "Plan" }]} />
      </button>,
    );
    expect(container.querySelector("button div")).toBeNull();
    expect(container.querySelector('[data-part="markers"]')!.tagName).toBe("SPAN");
    // The hidden description is not part of the button's name.
    expect(screen.getByRole("button")).not.toHaveAccessibleName(/Plan/);
  });

  it("changes nothing without markers", () => {
    const { container } = render(<ProgressBar value={30} aria-label="x" hint="h" />);
    expect(container.querySelector('[data-part="track-frame"]')).toBeNull();
    expect(container.querySelector('[data-part="markers"]')).toBeNull();
    expect(screen.getByRole("progressbar").parentElement).toBe(container.firstElementChild);
  });
});
