import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusDot, statusDotColor, type StatusDotTone } from "../status-dot";

const TONES: StatusDotTone[] = [
  "brand", "neutral", "success", "warning", "danger", "info", "income", "expense",
  "blue", "indigo", "purple", "teal", "orange",
];

/** The role utility that paints each colour (tokens.css, `@theme inline`): the dot's class
 *  since 0.34. A colour without one — the money pair, `--text-muted` as a fill — keeps
 *  `bg-[var(--…)]`. */
const ROLE_BG: Record<string, string> = {
  "var(--brand)": "bg-brand",
  "var(--success)": "bg-success",
  "var(--warning)": "bg-warning",
  "var(--danger)": "bg-danger",
  "var(--info)": "bg-info",
  "var(--hue-blue)": "bg-hue-blue",
  "var(--hue-indigo)": "bg-hue-indigo",
  "var(--hue-purple)": "bg-hue-purple",
  "var(--hue-teal)": "bg-hue-teal",
  "var(--hue-orange)": "bg-hue-orange",
};

describe("statusDotColor", () => {
  it("is the CSS colour the dot's own class paints, tone for tone", () => {
    expect(statusDotColor("teal")).toBe("var(--hue-teal)");
    for (const tone of TONES) {
      const { container, unmount } = render(<StatusDot tone={tone} />);
      const colour = statusDotColor(tone);
      expect(container.firstElementChild).toHaveClass(ROLE_BG[colour] ?? `bg-[${colour}]`);
      unmount();
    }
  });
});
