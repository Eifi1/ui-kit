import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tooltip } from "../tooltip";

/**
 * `side="start" | "end"` follow the reading direction; `left` / `right` stay physical.
 * The CSS variant resolves it with logical insets, the portalled one against the
 * trigger's `dir` — and the portalled bubble carries that `dir`, since it leaves the
 * subtree it would have inherited it from.
 */
function portalled(side: "start" | "end" | "left", dir: "ltr" | "rtl") {
  // A trigger 100px wide at x=200, in a window wide enough for either side.
  const rect = { left: 200, right: 300, top: 100, bottom: 120, width: 100, height: 20, x: 200, y: 100 };
  render(
    <div dir={dir}>
      <Tooltip label="Hint" side={side} portal>
        <button type="button">Trigger</button>
      </Tooltip>
    </div>,
  );
  const button = screen.getByRole("button", { name: "Trigger" });
  const trigger = button.parentElement!;
  trigger.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
  fireEvent.mouseEnter(trigger);
  return screen.getByRole("tooltip");
}

describe("Tooltip — logical sides", () => {
  it("CSS variant: start/end are logical insets, left/right physical ones", () => {
    const { rerender } = render(
      <Tooltip label="Hint" side="end">
        <button type="button">A</button>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip", { hidden: true }).className).toMatch(/\bstart-full\b/);
    rerender(
      <Tooltip label="Hint" side="start">
        <button type="button">A</button>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip", { hidden: true }).className).toMatch(/\bend-full\b/);
    rerender(
      <Tooltip label="Hint" side="left">
        <button type="button">A</button>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip", { hidden: true }).className).toMatch(/\bright-full\b/);
  });

  it("portal: `end` sits right of the trigger in LTR and left of it in RTL", () => {
    const ltr = portalled("end", "ltr");
    expect(ltr).toHaveAttribute("dir", "ltr");
    expect(parseFloat(ltr.style.left)).toBeGreaterThanOrEqual(300);
  });

  it("portal: `end` in RTL is the physical left, and the bubble carries dir=rtl", () => {
    const rtl = portalled("end", "rtl");
    expect(rtl).toHaveAttribute("dir", "rtl");
    expect(parseFloat(rtl.style.left)).toBeLessThan(200);
  });

  it("portal: `start` in RTL is the physical right; `left` stays left in RTL", () => {
    expect(parseFloat(portalled("start", "rtl").style.left)).toBeGreaterThanOrEqual(300);
  });

  it("portal: physical `left` ignores the direction", () => {
    expect(parseFloat(portalled("left", "rtl").style.left)).toBeLessThan(200);
  });
});
