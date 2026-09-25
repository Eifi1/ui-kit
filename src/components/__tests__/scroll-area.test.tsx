import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollArea } from "../scroll-area";

/** jsdom lays nothing out; pretend every element is `content` tall in a `box` box. */
function fakeLayout(content: number, box: number) {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(content);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(box);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
}

afterEach(() => vi.restoreAllMocks());

describe("ScrollArea", () => {
  it("a labelled one is a named region", () => {
    fakeLayout(100, 100);
    render(<ScrollArea label="Activity">rows</ScrollArea>);
    expect(screen.getByRole("region", { name: "Activity" })).toBeInTheDocument();
  });

  it("an unlabelled one is a plain box, not an unnamed landmark", () => {
    fakeLayout(100, 100);
    render(<ScrollArea data-testid="box">rows</ScrollArea>);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("becomes a tab stop while its content overflows", () => {
    fakeLayout(500, 100);
    render(<ScrollArea label="Activity">rows</ScrollArea>);
    const region = screen.getByRole("region");
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveAttribute("data-overflowing", "true");
  });

  it("is no tab stop while nothing overflows", () => {
    fakeLayout(100, 100);
    render(<ScrollArea label="Activity">rows</ScrollArea>);
    expect(screen.getByRole("region")).not.toHaveAttribute("tabindex");
  });

  it("thin, token-coloured scrollbar and a visible focus indicator", () => {
    fakeLayout(100, 100);
    render(<ScrollArea label="x" orientation="horizontal" />);
    const cls = screen.getByRole("region").className;
    expect(cls).toMatch(/\[scrollbar-width:thin\]/);
    expect(cls).toMatch(/\[scrollbar-color:var\(--border-strong\)_transparent\]/);
    expect(cls).toMatch(/overflow-x-auto/);
    expect(cls).toMatch(/focus-visible:outline-\[var\(--brand\)\]/);
  });

  it("forwards a ref", () => {
    fakeLayout(100, 100);
    let node: HTMLDivElement | null = null;
    render(<ScrollArea label="x" ref={(el) => void (node = el)} />);
    expect(node).toBe(screen.getByRole("region"));
  });
});
