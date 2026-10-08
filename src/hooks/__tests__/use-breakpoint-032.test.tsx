import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BREAKPOINT_REM, breakpointQuery, useBreakpoint, usePhoneLayout, type Breakpoint } from "../use-breakpoint";
import { TEXT_SCALE, TEXT_SIZES, applyTextSize } from "../../theme/text-size";

/**
 * Breakpoints that follow the text size (docs/text-size-harmonization.md §3.3, §10.4):
 * the JS answer must be the CSS one. `useBreakpoint("md")` moves with the size exactly
 * as `md:` does, and tokens.css's variants are the same numbers as `BREAKPOINT_REM`.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

/** A `matchMedia` that evaluates `(min-width: Npx)` / `(max-width: Npx)` against a fixed
 *  viewport width, as a browser would. */
function viewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    const matches = min ? width >= Number(min[1]) : max ? width <= Number(max[1]) : false;
    return { matches, media: query, addEventListener() {}, removeEventListener() {} };
  });
}

describe("breakpointQuery", () => {
  it("keeps the kit's px queries at Normal, character for character", () => {
    expect(breakpointQuery("max-md", 1, 16)).toBe("(max-width: 767px)");
    expect(breakpointQuery("md", 1, 16)).toBe("(min-width: 768px)");
    expect(breakpointQuery("max-sm", 1, 16)).toBe("(max-width: 639px)");
    expect(breakpointQuery("xl", 1, 16)).toBe("(min-width: 1280px)");
    expect(breakpointQuery("3xl", 1, 16)).toBe("(min-width: 2400px)");
  });

  it("scales with the text size", () => {
    expect(breakpointQuery("md", TEXT_SCALE.large, 16)).toBe("(min-width: 960px)");
    expect(breakpointQuery("md", TEXT_SCALE.xlarge, 16)).toBe("(min-width: 1152px)");
    expect(breakpointQuery("max-md", TEXT_SCALE.xlarge, 16)).toBe("(max-width: 1151px)");
  });

  it("follows a browser default other than 16 px, as a media query's rem does", () => {
    expect(breakpointQuery("md", 1, 20)).toBe("(min-width: 960px)");
  });
});

describe("useBreakpoint / usePhoneLayout follow the text size", () => {
  it("a 1000 px window is md at Normal and Large, and the phone layout at Extra large", () => {
    viewport(1000);
    const { result } = renderHook(() => ({ md: useBreakpoint("md"), phone: usePhoneLayout(), lg: useBreakpoint("lg") }));
    expect(result.current).toEqual({ md: true, phone: false, lg: false });

    act(() => applyTextSize("large"));
    expect(result.current).toEqual({ md: true, phone: false, lg: false });

    act(() => applyTextSize("xlarge"));
    expect(result.current).toEqual({ md: false, phone: true, lg: false });

    act(() => applyTextSize("normal"));
    expect(result.current.md).toBe(true);
  });

  it("an 800 px tablet leaves the phone layout only at Normal", () => {
    viewport(800);
    const { result } = renderHook(() => usePhoneLayout());
    expect(result.current).toBe(false);
    act(() => applyTextSize("large"));
    expect(result.current).toBe(true);
  });

  it("answers the fallback without matchMedia", () => {
    const { result } = renderHook(() => ({ a: useBreakpoint("md", true), b: usePhoneLayout() }));
    expect(result.current).toEqual({ a: true, b: false });
  });
});

describe("tokens.css's breakpoint variants are the same numbers", () => {
  const CSS = Object.values(
    import.meta.glob<string>("../../../tokens.css", { query: "?raw", import: "default", eager: true }),
  )[0];

  /** The three thresholds a variant declares, in rem, Normal → Extra large. */
  function thresholds(variant: string): number[] {
    const start = CSS.indexOf(`@custom-variant ${variant} {`);
    expect(start, `@custom-variant ${variant} is missing`).toBeGreaterThan(-1);
    const body = CSS.slice(start, CSS.indexOf("\n}", start));
    return [...body.matchAll(/width\s*[<>]=?\s*([\d.]+)rem/g)].map((m) => Number(m[1]));
  }

  for (const name of Object.keys(BREAKPOINT_REM) as Breakpoint[]) {
    for (const variant of [name, `max-${name}`]) {
      it(`${variant}: ${BREAKPOINT_REM[name]}rem × ${TEXT_SIZES.map((s) => TEXT_SCALE[s]).join(" / ")}`, () => {
        expect(thresholds(variant)).toEqual(TEXT_SIZES.map((s) => BREAKPOINT_REM[name] * TEXT_SCALE[s]));
      });
    }
  }

  it("scopes each query to its size inside :where(), Normal by exclusion", () => {
    const body = CSS.slice(CSS.indexOf("@custom-variant md {"), CSS.indexOf("\n}", CSS.indexOf("@custom-variant md {")));
    expect(body).toContain("&:where(:not([data-text-size$=large] *))");
    expect(body).toContain("&:where([data-text-size=large] *)");
    expect(body).toContain("&:where([data-text-size=xlarge] *)");
  });

  it("sets the root size in percent, and the size and contrast variants", () => {
    expect(CSS).toMatch(/html\[data-text-size="large"\]\s*\{\s*font-size:\s*125%;/);
    expect(CSS).toMatch(/html\[data-text-size="xlarge"\]\s*\{\s*font-size:\s*150%;/);
    expect(CSS).toContain("@custom-variant large (&:where([data-text-size$=large], [data-text-size$=large] *));");
    expect(CSS).toContain("@custom-variant xlarge (&:where([data-text-size=xlarge], [data-text-size=xlarge] *));");
    expect(CSS).toContain("@custom-variant contrast (&:where([data-contrast=more], [data-contrast=more] *));");
    expect(CSS).toMatch(/--text-micro:\s*0\.625rem;/);
    expect(CSS).toMatch(/--text-caption:\s*0\.6875rem;/);
    expect(CSS).toMatch(/:root\s*\{\s*--focus-ring-width:\s*2px;/);
    expect(CSS).toMatch(/:root\[data-contrast="more"\]\s*\{\s*--focus-ring-width:\s*3px;/);
  });
});
