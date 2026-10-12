import { useRef, useState, type CSSProperties } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Autocomplete } from "../autocomplete";
import { Combobox } from "../combobox";
import { DropdownPanel, useDropdown } from "../dropdown";
import { EntityCombobox } from "../entity-combobox";
import { Popover } from "../popover";
import type { ComboOption } from "../combobox-core";

/**
 * keksdose K1 (live #401): an address Autocomplete low on a phone page flipped above its
 * field and its three rows floated ~176 px over it. Every panel on `useAnchoredPanel`
 * placed a flipped panel by a `top` worked out for a panel `maxHeight` tall, and each is
 * only as tall as its content. Flipped, they are placed by `bottom` now, which pins the
 * panel's foot `gap` above the trigger; `top` is cleared.
 *
 * jsdom has no `visualViewport`, so the layout viewport is `innerHeight`, 768 here, and
 * the trigger sits near its bottom: 20 px of room below, ~690 above.
 */
const LOW = { top: 700, bottom: 736, left: 100, right: 400, width: 300, height: 36, x: 100, y: 700 };
const HIGH = { ...LOW, top: 100, bottom: 136, y: 100 };
/** 768 − (700 − 4): the foot 4 px above the trigger, counted from the bottom. */
const FLIPPED_BOTTOM = "72px";

let anchor = LOW;
let isAnchor: (el: Element) => boolean = () => false;

beforeEach(() => {
  anchor = LOW;
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    return isAnchor(this) ? ({ ...anchor, toJSON: () => anchor } as DOMRect) : original.call(this);
  });
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(768);
});
afterEach(() => vi.restoreAllMocks());

/** The input's own box, the one Autocomplete and Combobox anchor to. */
const wrapsCombobox = (el: Element) =>
  el.tagName === "DIV" && Array.from(el.children).some((c) => c.matches('input[role="combobox"]'));

/** The portalled box that carries the placement. */
function placed(inside: HTMLElement): HTMLElement {
  let el: HTMLElement | null = inside;
  while (el && !el.style.top && !el.style.bottom) el = el.parentElement;
  if (!el) throw new Error("no placed ancestor");
  return el;
}

const ADDRESSES: ComboOption<string>[] = [
  { value: "1", label: "Bahnhofstrasse 1, 8001 Zürich" },
  { value: "2", label: "Bahnhofstrasse 12, 8001 Zürich" },
  { value: "3", label: "Bahnhofplatz 3, 3011 Bern" },
];

function AddressField() {
  const [value, setValue] = useState("");
  return <Autocomplete<string> label="Address" value={value} onChange={setValue} options={ADDRESSES} />;
}

function openAutocomplete() {
  render(<AddressField />);
  const field = screen.getByRole("combobox", { name: "Address" });
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value: "Bahnhof" } });
  return placed(screen.getByRole("listbox"));
}

function openPopover(style?: CSSProperties) {
  render(
    <Popover
      style={style}
      trigger={({ toggle, ref }) => (
        <button type="button" ref={ref} onClick={toggle}>
          Open
        </button>
      )}
    >
      {() => <p>Three short lines</p>}
    </Popover>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  return screen.getByRole("dialog");
}

describe("a flipped anchored panel is placed by its bottom edge (keksdose K1)", () => {
  it("Autocomplete: the short list ends on the field instead of floating a cap's height above", () => {
    isAnchor = wrapsCombobox;
    const panel = openAutocomplete();
    expect(panel.style.bottom).toBe(FLIPPED_BOTTOM);
    // Not 700 − 4 − 256 = 440px: the top a 256 px list would have had.
    expect(panel.style.top).toBe("");
    expect(panel.style.maxHeight).toBe("256px");
  });

  it("Autocomplete: below the trigger it is still placed by `top`, with no `bottom`", () => {
    isAnchor = wrapsCombobox;
    anchor = HIGH;
    const panel = openAutocomplete();
    expect(panel.style.top).toBe("140px");
    expect(panel.style.bottom).toBe("");
  });

  it("Popover: flipped, it is placed by `bottom`, and a caller's `top` cannot pull it off", () => {
    isAnchor = (el) => el.tagName === "BUTTON" && el.textContent === "Open";
    const panel = openPopover({ top: 12 });
    expect(panel.style.bottom).toBe(FLIPPED_BOTTOM);
    // Not 700 − 4 − 320 = 376px, nor the caller's 12px.
    expect(panel.style.top).toBe("");
    expect(panel.style.maxHeight).toBe("320px");
  });

  it("Popover: below the trigger it keeps `top`", () => {
    isAnchor = (el) => el.tagName === "BUTTON" && el.textContent === "Open";
    anchor = HIGH;
    const panel = openPopover();
    expect(panel.style.top).toBe("140px");
    expect(panel.style.bottom).toBe("");
  });

  it("follows the trigger across the flip while open, dropping the edge it no longer uses", () => {
    isAnchor = (el) => el.tagName === "BUTTON" && el.textContent === "Open";
    anchor = HIGH;
    const panel = openPopover();
    expect(panel.style.top).toBe("140px");
    anchor = LOW;
    fireEvent.scroll(window);
    expect(panel.style.bottom).toBe(FLIPPED_BOTTOM);
    expect(panel.style.top).toBe("");
  });

  it("EntityCombobox (ComboboxPanel): flipped, placed by `bottom`", () => {
    isAnchor = (el) => el.tagName === "BUTTON" && el.getAttribute("role") === "combobox";
    render(<EntityCombobox<string> label="Account" value={null} options={ADDRESSES} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    const panel = placed(screen.getByRole("listbox"));
    expect(panel.style.bottom).toBe(FLIPPED_BOTTOM);
    expect(panel.style.top).toBe("");
  });

  it("Combobox's suggestion list: flipped, placed by `bottom`", () => {
    isAnchor = wrapsCombobox;
    render(<Combobox label="Payee" value="" onChange={() => {}} options={["Migros", "Coop"]} />);
    fireEvent.focus(screen.getByRole("combobox", { name: /Payee/ }));
    const panel = placed(screen.getByRole("listbox"));
    expect(panel.style.bottom).toBe(FLIPPED_BOTTOM);
    expect(panel.style.top).toBe("");
  });

  it("DropdownPanel (anchored): flipped, placed by `bottom`, a caller's `top` cleared", () => {
    isAnchor = (el) => el.tagName === "BUTTON" && el.textContent === "CHF";
    function Harness() {
      const { open, setOpen, wrapperRef, panelRef } = useDropdown();
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <div ref={wrapperRef}>
          <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
            CHF
          </button>
          {open && (
            <DropdownPanel anchorRef={triggerRef} panelRef={panelRef} style={{ top: 12 }}>
              <li>EUR</li>
            </DropdownPanel>
          )}
        </div>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "CHF" }));
    const panel = placed(screen.getByText("EUR"));
    expect(panel.style.bottom).toBe(FLIPPED_BOTTOM);
    expect(panel.style.top).toBe("");
  });
});
