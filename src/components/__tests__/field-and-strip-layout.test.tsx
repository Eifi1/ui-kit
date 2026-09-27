import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MapPin } from "lucide-react";
import { Autocomplete } from "../autocomplete";
import { NumberInput } from "../number-input";
import { EntityCombobox } from "../entity-combobox";
import { FIELD_TRIGGER, FieldHint, Select, Tabs } from "../ui";

/**
 * Layout defects the showcase caught on a phone, pinned at the class/attribute level
 * jsdom can see. jsdom has no layout, so what is asserted here is the rule that
 * produces the geometry (a min-height, a placement class, a mask computed from a
 * measured overflow) — the screenshots were the check that the rule is the right one.
 */

describe("FIELD_TRIGGER holds a line box open", () => {
  it("the shared trigger class gives its first child one line of height", () => {
    expect(FIELD_TRIGGER).toContain("[&>:first-child]:min-h-[1lh]");
  });

  it("reaches an EntityCombobox with no value and no placeholder — the trigger that collapsed", () => {
    render(<EntityCombobox<number> aria-label="Tenant" options={[{ value: 1, label: "Ada" }]} value={null} onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: /Tenant/ }).className).toContain("[&>:first-child]:min-h-[1lh]");
  });
});

describe("Select hint: text goes under the field, a FieldHint stays on the label line", () => {
  it("a string hint is a caption below the field, describing the select", () => {
    render(<Select label="Theme" hint="Managed by your organisation" disabled defaultValue="dark"><option value="dark">Dark</option></Select>);
    const select = screen.getByRole("combobox", { name: "Theme" });
    const caption = screen.getByText("Managed by your organisation");
    expect(caption.tagName).toBe("P");
    // Not inside the field's own `relative` box, where it sat on top of the label and value.
    expect(select.parentElement?.contains(caption)).toBe(false);
    expect(select.getAttribute("aria-describedby")).toBe(caption.id);
  });

  it("the caption comes before the error in aria-describedby, after the caller's own", () => {
    render(
      <Select label="Language" hint="Used for reports" error="Pick one." aria-describedby="own">
        <option value="">—</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Language" });
    const ids = select.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(ids[0]).toBe("own");
    expect(document.getElementById(ids[1])?.textContent).toBe("Used for reports");
    expect(document.getElementById(ids[2])?.textContent).toBe("Pick one.");
  });

  it("a FieldHint still rides the label line and adds no caption", () => {
    render(
      <Select label="Account" hint={<FieldHint label="Where the money lands" />}>
        <option>Checking</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Account" });
    const hint = screen.getByRole("button", { name: "Where the money lands" });
    expect(select.parentElement?.contains(hint)).toBe(true);
    expect(select.getAttribute("aria-describedby")).toBeNull();
  });
});

describe("Autocomplete leading icon with a floating label", () => {
  it("sits on the value's line, not the middle of the box where the label is", () => {
    const { container } = render(
      <Autocomplete<string> label="Address" icon={<MapPin />} value="" onChange={() => {}} options={[]} />,
    );
    const icon = container.querySelector("span[aria-hidden] > svg")?.parentElement;
    expect(icon?.className).toContain("top-[calc(1rem+1px)]");
    expect(icon?.className).not.toContain("top-1/2");
  });

  it("stays centred on an unlabelled field", () => {
    const { container } = render(
      <Autocomplete<string> aria-label="Address" icon={<MapPin />} value="" onChange={() => {}} options={[]} />,
    );
    const icon = container.querySelector("span[aria-hidden] > svg")?.parentElement;
    expect(icon?.className).toContain("top-1/2");
  });
});

describe("Tabs", () => {
  const LOOPS = [
    { id: "a", label: "40 km/h", detail: "loop 1" },
    { id: "b", label: "80 km/h", detail: "loop 2" },
  ];

  it("the open chip's detail takes the chip's ink on a wrapped strip", () => {
    render(<Tabs tabs={LOOPS} active="b" onChange={() => {}} wrap />);
    const open = screen.getByText("loop 2");
    expect(open.className).toContain("text-[var(--brand-contrast)]");
    // From `md` up the strip is an underline again, and the detail muted again.
    expect(open.className).toContain("md:text-[var(--text-muted)]");
    expect(screen.getByText("loop 1").className).not.toContain("brand-contrast");
  });

  it("an unwrapped strip's detail stays muted", () => {
    render(<Tabs tabs={LOOPS} active="b" onChange={() => {}} />);
    expect(screen.getByText("loop 2").className).not.toContain("brand-contrast");
  });

  describe("overflow", () => {
    afterEach(() => vi.restoreAllMocks());

    const size = (el: HTMLElement, scrollWidth: number, clientWidth: number) => {
      Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
      Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
    };

    it("paints nothing while the tabs fit", () => {
      render(<Tabs tabs={LOOPS} active="a" onChange={() => {}} />);
      const strip = screen.getByRole("tablist");
      expect(strip.style.maskImage).toBe("");
      expect(strip.hasAttribute("data-overflow")).toBe(false);
    });

    it("fades the end that has tabs behind it, then both ends once scrolled", () => {
      render(<Tabs tabs={LOOPS} active="a" onChange={() => {}} style={{ marginTop: 4 }} />);
      const strip = screen.getByRole("tablist");
      size(strip, 400, 200);
      fireEvent.scroll(strip);
      expect(strip.getAttribute("data-overflow")).toBe("end");
      // A caller's own style survives the mask.
      expect(strip.style.marginTop).toBe("4px");
      strip.scrollLeft = 100;
      fireEvent.scroll(strip);
      expect(strip.getAttribute("data-overflow")).toBe("both");
    });

    it("in RTL the hidden tabs are at the end, which is the left", () => {
      render(
        <div dir="rtl" style={{ direction: "rtl" }}>
          <Tabs tabs={LOOPS} active="a" onChange={() => {}} />
        </div>,
      );
      const strip = screen.getByRole("tablist");
      size(strip, 400, 200);
      fireEvent.scroll(strip);
      expect(strip.getAttribute("data-overflow")).toBe("end");
      // …and `mask-image` is physical: the fade is drawn on the LEFT, where an RTL
      // strip's end is.
      expect(strip.style.maskImage).toMatch(/^linear-gradient\(to right, transparent, /);
    });

    it("scrolls a newly opened tab behind the edge into the strip, clear of the fade", () => {
      const { rerender } = render(<Tabs tabs={LOOPS} active="a" onChange={() => {}} />);
      const strip = screen.getByRole("tablist");
      size(strip, 400, 200);
      const scrollBy = vi.fn();
      strip.scrollBy = scrollBy as unknown as typeof strip.scrollBy;
      vi.spyOn(strip, "getBoundingClientRect").mockReturnValue({ left: 0, right: 200 } as DOMRect);
      const second = screen.getByRole("tab", { name: /80 km\/h/ });
      vi.spyOn(second, "getBoundingClientRect").mockReturnValue({ left: 150, right: 260 } as DOMRect);
      rerender(<Tabs tabs={LOOPS} active="b" onChange={() => {}} />);
      expect(scrollBy).toHaveBeenCalledWith({ left: 84 });
    });
  });
});

describe("NumberInput hint: text goes under the field, a FieldHint stays on the label line", () => {
  it("a string hint is a caption below the field, after the caller's own description", () => {
    render(<NumberInput label="Rate" value="" onChange={() => {}} hint="Nominal, per year" aria-describedby="own" />);
    const input = screen.getByLabelText("Rate");
    const caption = screen.getByText("Nominal, per year");
    expect(caption.tagName).toBe("P");
    expect(input.parentElement?.contains(caption)).toBe(false);
    expect(input.getAttribute("aria-describedby")).toBe(`own ${caption.id}`);
  });

  it("a FieldHint still rides the label line and adds no caption", () => {
    render(<NumberInput label="Rate" value="" onChange={() => {}} hint={<FieldHint label="Nominal" />} />);
    const input = screen.getByLabelText("Rate");
    expect(input.parentElement?.contains(screen.getByRole("button", { name: "Nominal" }))).toBe(true);
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });
});
