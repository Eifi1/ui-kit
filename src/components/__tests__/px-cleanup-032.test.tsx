import { afterEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { cn } from "../../lib/cn";
import { applyTextSize } from "../../theme/text-size";
import { lengthPx, remPx } from "../../hooks/use-breakpoint";
import { CAPTION_CLASS, SECTION_LABEL_CLASS, SectionLabel } from "../text";
import { Chip } from "../chip";
import { Popover } from "../popover";
import { alertFrameClass } from "../alert-banner";

/**
 * The px clean-up of 0.32 (docs/text-size-harmonization.md §3.2): the kit's 10 and 11 px
 * type became the named rem sizes `text-micro` / `text-caption`, and the geometry that
 * holds text — paddings, popover widths — follows the root font size.
 */
afterEach(() => applyTextSize("normal"));

describe("the named sizes merge as sizes", () => {
  it("keeps text-caption beside a colour, where plain tailwind-merge dropped it", () => {
    // Unregistered, `text-caption` read as a COLOUR and the later colour replaced it.
    expect(cn("text-caption text-[var(--text-muted)]")).toBe("text-caption text-[var(--text-muted)]");
    expect(cn("text-micro", "text-[var(--brand)]")).toBe("text-micro text-[var(--brand)]");
  });

  it("lets a later size replace an earlier one, both ways", () => {
    expect(cn("text-xs", "text-caption")).toBe("text-caption");
    expect(cn("text-caption", "text-sm")).toBe("text-sm");
    expect(cn("text-micro", "text-caption")).toBe("text-caption");
  });
});

describe("the shared type constants are rem", () => {
  it("SECTION_LABEL_CLASS, CAPTION_CLASS and the band use the named sizes, no px", () => {
    expect(SECTION_LABEL_CLASS.xs).toContain("text-micro");
    expect(SECTION_LABEL_CLASS.md).toContain("text-caption");
    expect(CAPTION_CLASS).toContain("text-caption");
    for (const cls of [...Object.values(SECTION_LABEL_CLASS), CAPTION_CLASS]) expect(cls).not.toMatch(/text-\[\d+px\]/);
    render(
      <SectionLabel as="p" variant="band" size="xs">
        Yesterday
      </SectionLabel>,
    );
    expect(screen.getByText("Yesterday").className).toContain("text-micro");
  });

  it("Chip's caps and xs type are rem, and caps still replaces the size's own", () => {
    render(
      <>
        <Chip caps size="md" data-testid="caps">
          Paid
        </Chip>
        <Chip size="xs" data-testid="xs">
          Goal
        </Chip>
      </>,
    );
    const caps = screen.getByTestId("caps").className;
    expect(caps).toContain("text-caption");
    expect(caps).not.toMatch(/\btext-sm\b/);
    expect(screen.getByTestId("xs").className).toContain("text-caption");
  });
});

describe("geometry that holds text follows the root size", () => {
  it("pads a coloured AlertBanner by the neutral padding less the border's extra pixel", () => {
    expect(alertFrameClass("warning")).toContain("p-[calc(0.75rem-1px)]");
    expect(alertFrameClass("warning", "sm")).toContain("px-[calc(0.625rem-1px)] py-[calc(0.375rem-1px)]");
    expect(alertFrameClass("neutral")).toContain("p-3");
  });

  it("reads a rem length in px at the size in force", () => {
    expect(remPx(1)).toBe(16);
    expect(lengthPx("18rem", remPx(1.5))).toBe(432);
    expect(lengthPx(240, remPx(1.5))).toBe(240);
    expect(lengthPx(undefined, 16)).toBeUndefined();
  });

  const openPopover = (width?: number | `${number}rem`) => {
    render(
      <Popover width={width} trigger={({ toggle, ref }) => <button ref={ref} onClick={toggle}>Open</button>}>
        {() => <p>panel</p>}
      </Popover>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Open" }));
    });
    return screen.getByRole("dialog");
  };

  it("draws the default popover 18rem wide — 288 px at Normal, 360 at Large", () => {
    expect(openPopover().style.width).toBe("288px");
  });

  it("grows a rem popover with the text size", () => {
    applyTextSize("large");
    expect(openPopover().style.width).toBe("360px");
  });

  it("keeps a numeric width px, as before", () => {
    applyTextSize("xlarge");
    expect(openPopover(240).style.width).toBe("240px");
  });

  it("never draws a popover wider than the viewport less its margins", () => {
    applyTextSize("xlarge");
    const width = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    try {
      const panel = openPopover("18rem");
      expect(panel.style.width).toBe("344px");
      expect(panel.style.left).toBe("8px");
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    }
  });
});
