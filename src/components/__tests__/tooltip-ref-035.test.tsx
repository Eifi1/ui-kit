import { createRef, type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tooltip } from "../tooltip";

/**
 * Round 0.35 R4: Tooltip takes a `ref` (React 19, a prop), as Card and EmptyState did in
 * 0.34. It lands where every other attribute a caller hands Tooltip lands — the trigger
 * WRAPPER, the `<span>` around the caller's child — as Popover's lands on its panel and
 * HoverMenu's on its wrapper: the element `...rest` goes to. Not the bubble, which a
 * portalled tooltip mounts only while it is up, so a ref there would be null most of the
 * time. Merged with the wrapper's own ref, which the bubble is anchored, clamped and
 * dismissed by — each case below shows that one still works.
 */
describe("Tooltip's ref is the trigger wrapper (round 0.35 R4)", () => {
  it("in place: the wrapper, and a press outside it still closes the bubble", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <>
        <Tooltip ref={ref} label="Delete" data-testid="wrapper" lazy>
          <button type="button">x</button>
        </Tooltip>
        <button type="button">Elsewhere</button>
      </>,
    );
    expect(ref.current).toBe(screen.getByTestId("wrapper"));
    expect(ref.current).toContainElement(screen.getByRole("button", { name: "x" }));
    fireEvent.mouseEnter(ref.current!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Delete");
    // The outside press is measured against the wrapper's own ref.
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("portalled: the wrapper, which the bubble is still anchored to", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Tooltip ref={ref} label="Delete" portal data-testid="wrapper">
        <button type="button">x</button>
      </Tooltip>,
    );
    expect(ref.current).toBe(screen.getByTestId("wrapper"));
    fireEvent.mouseEnter(ref.current!);
    // The bubble measures the wrapper; with no element there it would not render.
    const bubble = screen.getByRole("tooltip");
    expect(ref.current).not.toContainElement(bubble);
    expect(bubble.style.position).toBe("fixed");
  });

  it("auto-portalled in a clipping container: the wrapper, which the check still reads", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <div data-clips="" data-testid="scroller">
        <Tooltip ref={ref} label="Delete" data-testid="wrapper">
          <button type="button">x</button>
        </Tooltip>
      </div>,
    );
    expect(ref.current).toBe(screen.getByTestId("wrapper"));
    // The clipping check found the container through the wrapper's own ref: no bubble
    // inside it until hovered, and then one outside it.
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(ref.current!);
    expect(screen.getByTestId("scroller")).not.toContainElement(screen.getByRole("tooltip"));
  });

  it("a callback ref gets the wrapper, and null when it goes", () => {
    const calls = vi.fn();
    const { unmount } = render(
      <Tooltip ref={calls} label="Delete" data-testid="wrapper">
        <button type="button">x</button>
      </Tooltip>,
    );
    expect(calls).toHaveBeenLastCalledWith(screen.getByTestId("wrapper"));
    unmount();
    expect(calls).toHaveBeenLastCalledWith(null);
  });

  it("an empty label renders no wrapper, so the ref stays null — the attributes' limit too", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Tooltip ref={ref} label="">
        <button type="button">x</button>
      </Tooltip>,
    );
    expect(ref.current).toBeNull();
  });

  it("is typed to the span (checked by tsc)", () => {
    const span: ComponentProps<typeof Tooltip>["ref"] = createRef<HTMLSpanElement>();
    // @ts-expect-error — the wrapper is an HTML element, not an SVG one
    const svg: ComponentProps<typeof Tooltip>["ref"] = createRef<SVGSVGElement>();
    expect([span, svg].every(Boolean)).toBe(true);
  });
});
