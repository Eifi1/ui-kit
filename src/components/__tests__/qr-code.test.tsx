import { render } from "@testing-library/react";
import { QrCode } from "../qr-code";
import { encodeQr } from "../../lib/qr-encode";

describe("QrCode", () => {
  it("draws every dark module, inside a white quiet zone of `margin` modules", () => {
    const { container } = render(<QrCode value="hello world" label="Code" margin={2} />);
    const svg = container.querySelector("svg")!;
    const { size, modules } = encodeQr("hello world");
    expect(svg).toHaveAttribute("viewBox", `0 0 ${size + 4} ${size + 4}`);
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Code");
    expect(container.querySelector("rect")).toHaveAttribute("fill", "#ffffff");

    // Re-count the dark modules from the path's runs ("M{x} {y}h{run}…").
    const d = container.querySelector("path")!.getAttribute("d")!;
    const runs = [...d.matchAll(/M(\d+) (\d+)h(\d+)/g)];
    const drawn = runs.reduce((sum, [, , , run]) => sum + Number(run), 0);
    expect(drawn).toBe(modules.flat().filter(Boolean).length);
    expect(runs[0].slice(1, 3)).toEqual(["2", "2"]); // the finder's corner, offset by the margin
  });

  it("is decorative without a label, and renders nothing for data no version holds", () => {
    const { container, rerender } = render(<QrCode value="x" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    rerender(<QrCode value={"x".repeat(3000)} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
