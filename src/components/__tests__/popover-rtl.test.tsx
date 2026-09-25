import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Popover } from "../popover";

/**
 * The panel is portalled to <body>. It was always aligned to the trigger's `rect.right`
 * and lost any `dir` the trigger inherited, so in an RTL subtree it opened hanging off
 * the wrong edge and laid its own contents out left-to-right.
 */
const TRIGGER = { top: 100, bottom: 130, left: 300, right: 400, width: 100, height: 30, x: 300, y: 100 };

beforeEach(() => {
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.textContent === "Open" && this.tagName === "BUTTON") return { ...TRIGGER, toJSON: () => TRIGGER } as DOMRect;
    return original.call(this);
  });
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(768);
});
afterEach(() => vi.restoreAllMocks());

function renderPopover(dir?: "rtl", panelDir?: "ltr") {
  render(
    <div dir={dir}>
      <Popover
        width={200}
        dir={panelDir}
        trigger={({ toggle, ref }) => (
          <button type="button" ref={ref} onClick={toggle}>
            Open
          </button>
        )}
      >
        {() => <p>panel</p>}
      </Popover>
    </div>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  return screen.getByRole("dialog");
}

describe("Popover direction", () => {
  it("aligns the panel's right edge to the trigger's in LTR", () => {
    const panel = renderPopover();
    expect(panel).toHaveAttribute("dir", "ltr");
    expect(panel.style.left).toBe("200px"); // 400 - 200
  });

  it("aligns the panel's left edge to the trigger's in RTL, and carries dir across the portal", () => {
    const panel = renderPopover("rtl");
    expect(panel).toHaveAttribute("dir", "rtl");
    expect(panel.style.left).toBe("300px");
  });

  it("lets a caller's own dir win", () => {
    const panel = renderPopover("rtl", "ltr");
    expect(panel).toHaveAttribute("dir", "ltr");
  });
});
