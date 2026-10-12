import { act, render, renderHook, screen } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { breakpointQuery, usePhoneLayout } from "../../hooks/use-breakpoint";
import { applyTextSize, TEXT_SCALE } from "../../theme/text-size";
import { stubResizeObserver, stubViewportWidth, viewportMatchMedia } from "..";

/**
 * `@eifi1/ui-kit/testing`'s environment stubs (0.34, refactor audit 2026-10, TST-10): what
 * an app's suite gets instead of a hand-written `matchMedia` that answers one string.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
});

describe("viewportMatchMedia", () => {
  const at = (width: number, query: string, options = {}) => viewportMatchMedia(width, options)(query).matches;

  it("answers the kit's own width queries from the width, as a browser does", () => {
    expect(at(375, breakpointQuery("max-md", 1, 16))).toBe(true);
    expect(at(1280, breakpointQuery("max-md", 1, 16))).toBe(false);
    expect(at(768, "(min-width: 768px)")).toBe(true);
    expect(at(767.5, "(min-width: 768px)")).toBe(false);
    expect(at(767.5, "(max-width: 767px)")).toBe(false);
    expect(at(767.5, "(width < 768px)")).toBe(true);
    expect(at(800, "(width >= 800px)")).toBe(true);
    expect(at(800, "(width > 800px)")).toBe(false);
    expect(at(800, "(width <= 800px)")).toBe(true);
  });

  it("reads rem as the browser's 16 px, and combines `and` and comma lists", () => {
    expect(at(768, "(min-width: 48rem)")).toBe(true);
    expect(at(700, "(min-width: 40rem) and (max-width: 47.9rem)")).toBe(true);
    expect(at(800, "(min-width: 40rem) and (max-width: 47.9rem)")).toBe(false);
    expect(at(800, "(width < 100px), (min-width: 780px)")).toBe(true);
    expect(at(800, "screen and (min-width: 780px)")).toBe(true);
  });

  it("stays right at Large text, where the phone query is (width < 960px)", () => {
    const large = breakpointQuery("max-md", TEXT_SCALE.large, 16);
    expect(large).toBe("(width < 960px)");
    expect(at(800, large)).toBe(true);
    expect(at(1280, large)).toBe(false);
  });

  it("answers the features it is given, and false to everything else", () => {
    expect(at(375, "(pointer: coarse)")).toBe(false);
    expect(at(375, "(pointer: fine)")).toBe(true);
    expect(at(375, "(pointer: coarse)", { coarse: true })).toBe(true);
    expect(at(375, "(hover: none)", { coarse: true })).toBe(true);
    expect(at(375, "(prefers-reduced-motion: reduce)")).toBe(false);
    expect(at(375, "(prefers-reduced-motion: reduce)", { reducedMotion: true })).toBe(true);
    expect(at(375, "(prefers-color-scheme: dark)", { dark: true })).toBe(true);
    expect(at(375, "(prefers-color-scheme: light)", { dark: true })).toBe(false);
    expect(at(375, "(prefers-contrast: more)", { moreContrast: true })).toBe(true);
    expect(at(375, "(display-mode: standalone)")).toBe(false);
    expect(at(375, "print")).toBe(false);
  });

  it("returns a whole MediaQueryList, listeners included", () => {
    const list = viewportMatchMedia(375)("(width < 768px)");
    expect(list.media).toBe("(width < 768px)");
    expect(() => {
      list.addEventListener("change", () => {});
      list.removeEventListener("change", () => {});
      list.addListener(() => {});
      list.removeListener(() => {});
    }).not.toThrow();
  });
});

describe("stubViewportWidth", () => {
  it("drives the kit's hooks, follows the text size, and its undo leaves no matchMedia", () => {
    expect("matchMedia" in window).toBe(false);
    const undo = stubViewportWidth(800);
    const { result } = renderHook(() => usePhoneLayout());
    expect(result.current).toBe(false);
    act(() => applyTextSize("large"));
    expect(result.current).toBe(true);
    undo();
    expect("matchMedia" in window).toBe(false);
  });

  it("puts back a matchMedia that was there before", () => {
    const outer = stubViewportWidth(375);
    const before = window.matchMedia;
    const inner = stubViewportWidth(1280);
    expect(window.matchMedia("(width < 768px)").matches).toBe(false);
    inner();
    expect(window.matchMedia).toBe(before);
    expect(window.matchMedia("(width < 768px)").matches).toBe(true);
    outer();
  });
});

describe("stubResizeObserver", () => {
  /** Shows the width its own ResizeObserver last reported. */
  function Measured() {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState<number | null>(null);
    useEffect(() => {
      const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
      observer.observe(ref.current!);
      return () => observer.disconnect();
    }, []);
    return <div ref={ref}>{width === null ? "unmeasured" : `${width} px`}</div>;
  }

  it("calls an observer back only when the test resizes what it watches", () => {
    const ro = stubResizeObserver();
    try {
      const { unmount } = render(<Measured />);
      const box = screen.getByText("unmeasured");
      expect(ro.observed()).toEqual([box]);
      act(() => ro.resize(document.body, { width: 999, height: 10 }));
      expect(box).toHaveTextContent("unmeasured");
      act(() => ro.resize(box, { width: 320, height: 40 }));
      expect(box).toHaveTextContent("320 px");
      unmount();
      expect(ro.observed()).toEqual([]);
    } finally {
      ro.restore();
    }
  });

  it("reports the box sizes a measuring hook reads, and unobserve stops the reports", () => {
    const ro = stubResizeObserver();
    try {
      const target = document.createElement("div");
      const seen: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => seen.push(...entries));
      observer.observe(target);
      ro.resize(target, { width: 120, height: 30 });
      expect(seen[0].borderBoxSize[0]).toEqual({ inlineSize: 120, blockSize: 30 });
      expect(seen[0].contentBoxSize[0]).toEqual({ inlineSize: 120, blockSize: 30 });
      expect(seen[0].contentRect).toMatchObject({ width: 120, height: 30, right: 120, bottom: 30 });
      observer.unobserve(target);
      ro.resize(target, { width: 1, height: 1 });
      expect(seen).toHaveLength(1);
    } finally {
      ro.restore();
    }
    expect("ResizeObserver" in globalThis).toBe(false);
  });
});
