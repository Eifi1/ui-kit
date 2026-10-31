import { act, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBreakpoint } from "../use-breakpoint";
import { useMediaQuery } from "../use-media-query";
import { applyTextSize } from "../../theme/text-size";
import { viewportMatchMedia } from "../../test/viewport";

/**
 * 0.52 code review, use-breakpoint.ts: `useBreakpoint` asks a new query when the text size
 * changes, and `useMediaQuery` read its answer only at mount, correcting it in an effect —
 * so the first commit after the change still answered the OLD query. Switching to Large
 * in a 700 px window drew the tour card un-docked (and FormActions in its old placement)
 * for a frame, then jumped; a layout effect in that commit read the wrong answer.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

describe("useMediaQuery when its query changes", () => {
  it("answers the new query in the commit that asks it", () => {
    vi.stubGlobal("matchMedia", viewportMatchMedia(700));
    const committed: boolean[] = [];
    renderHook(() => {
      const phone = useBreakpoint("max-sm");
      useLayoutEffect(() => {
        committed.push(phone);
      });
    });
    expect(committed).toEqual([false]);
    // `max-sm` is (width < 640px) at Normal, (width < 800px) at Large.
    act(() => applyTextSize("large"));
    expect(committed).toEqual([false, true]);
  });

  it("still follows the query it asks when the viewport changes, and moves to a new one", () => {
    vi.stubGlobal("matchMedia", viewportMatchMedia(700));
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query, false), {
      initialProps: { query: "(min-width: 600px)" },
    });
    expect(result.current).toBe(true);
    rerender({ query: "(min-width: 800px)" });
    expect(result.current).toBe(false);
    rerender({ query: "(min-width: 600px)" });
    expect(result.current).toBe(true);
  });

  it("catches a change between the render and its subscription, which fires no event to it", () => {
    let reads = 0;
    vi.stubGlobal("matchMedia", (media: string) => ({
      media,
      // False for the render's read, true by the time the effect subscribes.
      get matches() {
        reads += 1;
        return reads > 1;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { result } = renderHook(() => useMediaQuery("(min-width: 600px)", false));
    expect(result.current).toBe(true);
  });
});
