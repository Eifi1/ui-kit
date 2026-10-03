import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Textarea } from "../ui";

/**
 * 0.25, Kurvenschmiede: under the 0.24 label strip, a line scrolled most of the way under
 * it left its lower edge showing — a row of comma tails between the strip and the first
 * whole line of a pasted table. The strip now has a lower edge that follows the scroll:
 * at most half a line left → covered solid to that line's box (the strip's bottom snaps
 * to it); more than half → a 3px soft edge; at rest or on a line boundary → nothing.
 *
 * jsdom paints nothing and scrolls nothing, so this holds what carries the fix: the
 * pseudo-element's classes, and the two custom properties the strip writes from the
 * textarea's scroll position and line height (both stubbed here). The pixels were
 * checked in Chromium — light and dark, 390px and 1280px, LTR and RTL, editable,
 * disabled and read-only — at every offset into a 20px line.
 */

const strip = () => document.querySelector<HTMLElement>("[data-slot='label-strip']")!;
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
const edge = () => strip().style.getPropertyValue("--label-strip-edge");
const solid = () => strip().style.getPropertyValue("--label-strip-edge-solid");

/** Scroll the textarea to `top` the way a browser would: the position, then the event. */
function scrollTo(field: HTMLElement, top: number) {
  Object.defineProperty(field, "scrollTop", { configurable: true, get: () => top });
  fireEvent.scroll(field);
}

/** A labelled field with a 20px line (text-sm's), set inline since jsdom has no sheet. */
function field(lineHeight = "20px") {
  render(<Textarea label="Paste a table" defaultValue={"a;b\n1,5;2,5\n".repeat(20)} style={{ lineHeight }} />);
  return screen.getByRole("textbox", { name: "Paste a table" });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Textarea label strip — its lower edge (Kurvenschmiede, 0.25)", () => {
  it("is a pseudo-element of the strip: under it, its width, its colour, nothing to click", () => {
    field();
    const c = classes(strip());
    expect(c).toEqual(
      expect.arrayContaining([
        "after:absolute",
        "after:top-full",
        "after:inset-x-0",
        "after:pointer-events-none",
        "after:content-['']",
        // As tall as the strip says, and nothing when it says nothing.
        "after:h-[var(--label-strip-edge,0px)]",
        // The strip's own surface, inherited — so disabled / [readonly] / dark follow it.
        "after:bg-inherit",
        "after:[mask-image:linear-gradient(#000_var(--label-strip-edge-solid,0px),transparent)]",
      ]),
    );
    // The strip's own surfaces are still where the edge inherits them from.
    expect(c).toEqual(
      expect.arrayContaining([
        "bg-[var(--bg-surface)]",
        "peer-disabled:bg-[var(--bg-surface-2)]",
        "peer-[[readonly]]:bg-[var(--bg-surface-2)]",
      ]),
    );
  });

  it("draws nothing at rest — an unscrolled first line is never covered", () => {
    field();
    expect(edge()).toBe("");
    expect(solid()).toBe("");
  });

  it("covers a line with half or less left below the strip, solid, to its line box", () => {
    const ta = field();
    // 76 = 3 lines + 16px: 4px of the fourth line left — its tails.
    scrollTo(ta, 76);
    expect(edge()).toBe("4px");
    expect(solid()).toBe("4px");
    // Exactly half a line left.
    scrollTo(ta, 70);
    expect(edge()).toBe("10px");
    expect(solid()).toBe("10px");
    // The last pixel of it.
    scrollTo(ta, 79);
    expect(edge()).toBe("1px");
    expect(solid()).toBe("1px");
  });

  it("softens a line with more than half left over 3px, growing from nothing as it starts to move", () => {
    const ta = field();
    scrollTo(ta, 69); // 11px left
    expect(edge()).toBe("3px");
    expect(solid()).toBe("0px");
    scrollTo(ta, 61); // gone 1px under the strip
    expect(edge()).toBe("1px");
    expect(solid()).toBe("0px");
  });

  it("clears on a line boundary and back at the top", () => {
    const ta = field();
    scrollTo(ta, 76);
    expect(edge()).toBe("4px");
    scrollTo(ta, 80); // a whole number of lines: the next line starts right at the strip
    expect(edge()).toBe("");
    expect(solid()).toBe("");
    scrollTo(ta, 76);
    scrollTo(ta, 0);
    expect(edge()).toBe("");
    expect(strip().getAttribute("style") ?? "").not.toContain("--label-strip-edge");
  });

  it("never reaches the next line, and hides every remnant of half a line or less", () => {
    const ta = field();
    for (let top = 0; top <= 200; top += 0.25) {
      scrollTo(ta, top);
      const gone = top % 20;
      const left = gone === 0 ? 0 : 20 - gone;
      const height = parseFloat(edge() || "0");
      if (top === 0 || left === 0) expect(height).toBe(0);
      // The next line starts `left` below the strip: the edge stops at or above it.
      expect(height).toBeLessThanOrEqual(left + 1e-9);
      if (left > 0 && left <= 10) {
        expect(height).toBe(left);
        expect(parseFloat(solid())).toBe(left);
      }
    }
  });

  it("follows the type: a 16px line snaps at 16px boundaries", () => {
    const ta = field("16px");
    scrollTo(ta, 60); // 3 lines + 12: 4px left
    expect(edge()).toBe("4px");
    expect(solid()).toBe("4px");
    scrollTo(ta, 64);
    expect(edge()).toBe("");
  });

  it("keeps only the soft edge when the line height is not a length", () => {
    const ta = field("normal");
    scrollTo(ta, 76);
    expect(edge()).toBe("3px");
    expect(solid()).toBe("0px");
  });

  it("lets go of the scroll on unmount", () => {
    const remove = vi.spyOn(HTMLTextAreaElement.prototype, "removeEventListener");
    const { unmount } = render(<Textarea label="Notes" defaultValue="x" />);
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("leaves an unlabelled Textarea without strip or edge", () => {
    render(<Textarea aria-label="Plain" defaultValue={"x\n".repeat(30)} />);
    expect(document.querySelector("[data-slot='label-strip']")).toBeNull();
  });
});
