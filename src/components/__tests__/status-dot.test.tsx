import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusDot, statusDotColor, type StatusDotTone } from "../status-dot";

const TONES: StatusDotTone[] = [
  "brand", "neutral", "success", "warning", "danger", "info", "income", "expense",
  "blue", "indigo", "purple", "teal", "orange",
];

describe("statusDotColor", () => {
  it("is the CSS colour the dot's own class paints, tone for tone", () => {
    expect(statusDotColor("teal")).toBe("var(--hue-teal)");
    for (const tone of TONES) {
      const { container, unmount } = render(<StatusDot tone={tone} />);
      expect(container.firstElementChild).toHaveClass(`bg-[${statusDotColor(tone)}]`);
      unmount();
    }
  });
});
