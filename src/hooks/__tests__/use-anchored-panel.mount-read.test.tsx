import { useRef } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAnchoredPanel } from "../use-anchored-panel";

/**
 * 0.48.2 (keksdose K-052-2): `readViewport` ran as `useState`'s initializer, so EVERY
 * anchored panel read `visualViewport` while it rendered — closed ones too. In Chromium
 * that read forces a style and layout pass on a dirty DOM; a bulk bar's pickers mounting
 * on the first ticked row of a 1000-row register paid a full layout of the table (55–62
 * ms in keksdose's profile, ~300 ms in the kit's probe). A closed panel reads nothing
 * now; an open one reads in its layout effect, before paint, as it always also did.
 */

function Panel({ open }: { open: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const p = useAnchoredPanel(ref, open);
  return (
    <button ref={ref} data-testid="trigger" data-max={p.maxHeight} data-above={String(p.above)}>
      trigger
    </button>
  );
}

function stubVisualViewport() {
  const reads = { n: 0 };
  const vv = {
    get height() {
      reads.n++;
      return 700;
    },
    get offsetTop() {
      reads.n++;
      return 0;
    },
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vi.stubGlobal("visualViewport", vv);
  return reads;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAnchoredPanel reads the viewport only while open", () => {
  it("a closed panel reads no viewport geometry on mount or re-render", () => {
    const reads = stubVisualViewport();
    const { rerender } = render(<Panel open={false} />);
    rerender(<Panel open={false} />);
    expect(reads.n).toBe(0);
  });

  it("an open panel still measures the viewport before paint", () => {
    const reads = stubVisualViewport();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 600,
      bottom: 630,
      left: 10,
      right: 110,
      width: 100,
      height: 30,
      x: 10,
      y: 600,
      toJSON: () => ({}),
    });
    render(<Panel open />);
    expect(reads.n).toBeGreaterThan(0);
    // 70 px below a trigger at 630 of a 700 px viewport: the panel flips above.
    expect(screen.getByTestId("trigger")).toHaveAttribute("data-above", "true");
  });
});
