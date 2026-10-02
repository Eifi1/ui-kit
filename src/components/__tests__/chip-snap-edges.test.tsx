import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chip, refreshChipEdges } from "../chip";

/**
 * `snapEdges` (0.18.0, keksdose dev #576): at a fractional device-pixel ratio the chip
 * is widened so `(2·left + width) · dpr` is whole — its two side borders then
 * rasterise as mirror images. jsdom has no layout, so each chip's box is mocked from
 * its `data-left` / `data-width` (and `data-right` for an end-anchored chip, whose left
 * moves as it grows); a written min-width widens the mocked box as it would a real one.
 */

function box(el: HTMLElement): { left: number; width: number } {
  const natural = Number(el.dataset.width ?? 0);
  const min = parseFloat(el.style.minWidth) || 0;
  const width = Math.max(natural, min);
  const left = el.dataset.right ? Number(el.dataset.right) - width : Number(el.dataset.left ?? 0);
  return { left, width };
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const { left, width } = box(this);
    return { left, width, x: left, y: 0, top: 0, bottom: 20, right: left + width, height: 20, toJSON() {} } as DOMRect;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ratio = (dpr: number) => vi.stubGlobal("devicePixelRatio", dpr);
const chip = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-testid=c]")!;

describe("Chip snapEdges", () => {
  it("is off by default: no min-width, no centring, nothing to snap", () => {
    ratio(1.25);
    const { container } = render(
      <Chip data-testid="c" data-left="31" data-width="59.66">
        FAILED
      </Chip>,
    );
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("");
    expect(chip(container).className).not.toContain("justify-center");
  });

  it("at 1.25 widens the chip from where it sits, so 2·left + width is a multiple of 4", () => {
    ratio(1.25);
    const { container } = render(
      <div>
        {/* left 30 → 2·30 + 60 = 120 ✓; left 31 → 62 + 62 = 124 ✓ (60 would leave 2) */}
        <Chip snapEdges data-testid="c" data-left="30.4" data-width="59.66">
          FAILED
        </Chip>
        <Chip snapEdges data-testid="d" data-left="31" data-width="59.66">
          FAILED
        </Chip>
      </div>,
    );
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("60px");
    expect(container.querySelector<HTMLElement>("[data-testid=d]")!.style.minWidth).toBe("62px");
    // The added pixels are split either side of the label, not stacked at the end.
    expect(chip(container).className).toContain("justify-center");
  });

  it("steps an end-anchored chip (RTL, justify-end) until the edges agree", () => {
    ratio(1.25);
    // left = 201 − width: 2·(201 − w) + w = 402 − w ≡ 0 (mod 4) → w ≡ 2 (mod 4).
    const { container } = render(
      <Chip snapEdges data-testid="c" data-right="201" data-width="55.3">
        Needs review
      </Chip>,
    );
    act(() => refreshChipEdges());
    const { left, width } = box(chip(container));
    expect(width).toBe(58);
    expect((2 * Math.round(left) + width) % 4).toBe(0);
  });

  it("writes nothing at an integer or a half ratio, and clears its own pin when the ratio becomes one", () => {
    ratio(2);
    const { container } = render(
      <Chip snapEdges data-testid="c" data-left="31" data-width="59.66">
        FAILED
      </Chip>,
    );
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("");
    // 1.5 is measured symmetric already: no layout change for nothing.
    ratio(1.5);
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("");
    ratio(1.25);
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("62px");
    ratio(1);
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("");
  });

  it("leaves a chip alone that is not laid out, or a dot chip with no border to snap", () => {
    ratio(1.25);
    const { container } = render(
      <div>
        <Chip snapEdges data-testid="c" data-left="31">
          hidden
        </Chip>
        <Chip snapEdges variant="dot" tone="danger" data-testid="d" data-left="31" data-width="40.2">
          Overdue
        </Chip>
      </div>,
    );
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("");
    expect(container.querySelector<HTMLElement>("[data-testid=d]")!.style.minWidth).toBe("");
  });

  it("only ever clears the min-width it wrote — an app's own survives switching it off", () => {
    ratio(1.25);
    const { container, rerender } = render(
      <Chip snapEdges data-testid="c" data-left="31" data-width="59.66">
        FAILED
      </Chip>,
    );
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("62px");
    rerender(
      <Chip data-testid="c" data-left="31" data-width="59.66">
        FAILED
      </Chip>,
    );
    expect(chip(container).style.minWidth).toBe("");
    chip(container).style.minWidth = "80px";
    act(() => refreshChipEdges());
    expect(chip(container).style.minWidth).toBe("80px");
  });

  it("snaps the visible pill of a split chip (link + ×) while the ref still reaches the link", () => {
    ratio(1.25);
    const ref = vi.fn();
    const { container } = render(
      <Chip snapEdges ref={ref} href="/x" onRemove={() => {}} data-testid="c">
        Tag
      </Chip>,
    );
    const pill = chip(container).parentElement!;
    pill.dataset.left = "31";
    pill.dataset.width = "70.5";
    act(() => refreshChipEdges());
    expect(pill.style.minWidth).toBe("74px"); // 62 + 74 = 136 = 4·34
    expect(ref).toHaveBeenLastCalledWith(chip(container));
    expect(chip(container).tagName).toBe("A");
  });

  it("forwards the ref on a plain chip as before", () => {
    const ref = { current: null as HTMLElement | null };
    const { container } = render(
      <Chip snapEdges ref={ref} onClick={() => {}} data-testid="c">
        Toggle
      </Chip>,
    );
    expect(ref.current).toBe(chip(container));
  });
});
