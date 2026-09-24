import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Search } from "lucide-react";
import { Autocomplete, type AutocompleteProps } from "../autocomplete";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import type { ComboOption } from "../combobox-core";

/**
 * The 0.7 follow-ups to the combobox family, from keksdose's 0.6 adoption notes
 * (`ui-kit-input-proposals.md`, "Gaps found adopting 0.6.0", item 3) and lenkbank:
 *
 *  - an option can be `disabled` — listed, announced, passed over, never taken;
 *  - Autocomplete's list can be kept shut from outside (`open` / `onOpenChange`),
 *    which keksdose did with `minChars={Infinity}`;
 *  - Autocomplete has a compact `size="sm"`, and its icon follows the size;
 *  - the floating label is a real `<label for>`, so `getByLabelText` and helpers that
 *    walk `<label htmlFor>` find the input.
 */
const ROWS: ComboOption<string>[] = [
  { value: "1", label: "Bahnhofstrasse 1" },
  {
    value: "2",
    label: "Bahnhofstrasse 2",
    disabled: true,
    sublabel: "Read-only",
  },
  { value: "3", label: "Bahnhofstrasse 3" },
  { value: "4", label: "Bahnhofstrasse 4", disabled: true },
];

function AutoHarness(props: Partial<AutocompleteProps<string>> & { initial?: string }) {
  const { initial = "", onChange, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <Autocomplete<string>
      label="Address"
      options={ROWS}
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

/** The option the given field points at, resolved by id the way a reader does. */
function activeOf(el: HTMLElement): HTMLElement | null {
  const id = el.getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
}

describe("Autocomplete disabled options", () => {
  const field = () => screen.getByRole("combobox", { name: "Address" });
  function open() {
    render(<AutoHarness onSelect={onSelect} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "Bahn" } });
  }
  let onSelect = vi.fn();
  beforeEach(() => {
    onSelect = vi.fn();
  });

  it("lists a disabled row with aria-disabled", () => {
    open();
    expect(screen.getByRole("option", { name: /Bahnhofstrasse 2/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("option", { name: "Bahnhofstrasse 1" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("passes it over with the arrows, both ways", () => {
    open();
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    expect(activeOf(field())).toHaveTextContent("Bahnhofstrasse 1");
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    expect(activeOf(field())).toHaveTextContent("Bahnhofstrasse 3");
    // The last row is disabled too: Down stays where it is.
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    expect(activeOf(field())).toHaveTextContent("Bahnhofstrasse 3");
    fireEvent.keyDown(field(), { key: "ArrowUp" });
    expect(activeOf(field())).toHaveTextContent("Bahnhofstrasse 1");
  });

  it("Up from nothing highlighted lands on the last TAKEABLE row", () => {
    open();
    fireEvent.keyDown(field(), { key: "ArrowUp" });
    expect(activeOf(field())).toHaveTextContent("Bahnhofstrasse 3");
  });

  it("a click on it takes nothing and leaves the list open", () => {
    open();
    fireEvent.click(screen.getByRole("option", { name: /Bahnhofstrasse 2/ }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(field()).toHaveValue("Bahn");
    expect(field()).toHaveAttribute("aria-expanded", "true");
  });

  it("hovering it does not move the highlight onto it", () => {
    open();
    fireEvent.mouseEnter(screen.getByRole("option", { name: /Bahnhofstrasse 2/ }));
    expect(field()).not.toHaveAttribute("aria-activedescendant");
  });
});

describe("Autocomplete open / onOpenChange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const field = () => screen.getByRole("combobox", { name: "Address" });

  it("open={false} keeps the list shut through focus, typing and ↓ — and asks nothing", async () => {
    const load = vi.fn(async () => ROWS);
    const onOpenChange = vi.fn();
    render(
      <AutoHarness
        options={undefined}
        loadOptions={load}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "Bahn" } });
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(load).not.toHaveBeenCalled();
    // It still says what the user asked for, so a caller can let go when it likes.
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("an Escape with the list held shut reaches the caller", () => {
    const onKeyDown = vi.fn();
    render(<AutoHarness initial="Bahn" open={false} onKeyDown={onKeyDown} />);
    fireEvent.focus(field());
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("letting go (open={undefined}) hands back a list as open as focus says", () => {
    function Toggle() {
      const [hold, setHold] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setHold(false)}>
            release
          </button>
          <AutoHarness initial="Bahn" open={hold ? false : undefined} />
        </>
      );
    }
    render(<Toggle />);
    fireEvent.focus(field());
    expect(field()).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "release" }));
    expect(field()).toHaveAttribute("aria-expanded", "true");
  });

  it("reports open and shut, uncontrolled", () => {
    const onOpenChange = vi.fn();
    render(<AutoHarness onOpenChange={onOpenChange} />);
    fireEvent.focus(field());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.blur(field());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it("open={true} shows the list without focus", () => {
    render(<AutoHarness initial="Bahn" open />);
    expect(field()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });
});

describe("Autocomplete size", () => {
  it('size="sm" is the compact field, with a smaller icon', () => {
    render(
      <Autocomplete value="" onChange={vi.fn()} aria-label="Search" size="sm" icon={<Search />} />,
    );
    const input = screen.getByRole("combobox", { name: "Search" });
    expect(input.className).toContain("h-7");
    expect(input.className).toContain("text-xs");
    expect(input.className).toContain("ps-7");
    expect(input).not.toHaveAttribute("size");
    const icon = input.parentElement!.querySelector("[aria-hidden]")!;
    expect(icon.className).toContain("[&>svg]:size-3.5");
  });

  it("the default field keeps its 16px icon", () => {
    render(<Autocomplete value="" onChange={vi.fn()} aria-label="Search" icon={<Search />} />);
    const input = screen.getByRole("combobox", { name: "Search" });
    expect(input.className).not.toContain("h-7");
    const icon = input.parentElement!.querySelector("[aria-hidden]")!;
    expect(icon.className).toContain("[&>svg]:size-4");
  });

  it('a labelled field ignores "sm", as Select does; a number is the native attribute', () => {
    render(
      <>
        <Autocomplete value="" onChange={vi.fn()} label="Labelled" size="sm" />
        <Autocomplete value="" onChange={vi.fn()} aria-label="Native" size={12} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Labelled" }).className).not.toContain("h-7");
    expect(screen.getByRole("combobox", { name: "Native" })).toHaveAttribute("size", "12");
  });
});

describe("the floating label is a real <label for>", () => {
  it("Combobox", () => {
    render(<Combobox value="" onChange={vi.fn()} options={["Rewe"]} label="Payee" />);
    const input = screen.getByLabelText("Payee");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).not.toHaveAttribute("aria-label");
    const label = document.querySelector(`label[for="${input.id}"]`);
    expect(label).toHaveTextContent("Payee");
    expect(screen.getByRole("combobox", { name: "Payee" })).toBe(input);
  });

  it("Combobox with a caller id labels that id", () => {
    render(<Combobox id="payee" value="" onChange={vi.fn()} options={[]} label="Payee" />);
    expect(screen.getByLabelText("Payee")).toHaveAttribute("id", "payee");
  });

  it("InlineEntityCombobox", () => {
    render(
      <InlineEntityCombobox<string>
        value={null}
        onChange={vi.fn()}
        options={ROWS}
        label="Account"
      />,
    );
    const input = screen.getByLabelText("Account");
    expect(input).toHaveAttribute("role", "combobox");
    expect(screen.getByRole("combobox", { name: "Account" })).toBe(input);
  });

  it("Autocomplete, still named by aria-labelledby as before", () => {
    render(<Autocomplete value="" onChange={vi.fn()} label="Address" />);
    const input = screen.getByLabelText("Address");
    const label = document.querySelector(`label[for="${input.id}"]`)!;
    expect(input).toHaveAttribute("aria-labelledby", label.id);
    expect(screen.getByRole("combobox", { name: "Address" })).toBe(input);
  });
});

describe("InlineEntityCombobox disabled options", () => {
  function setup(onChange = vi.fn()) {
    render(
      <InlineEntityCombobox<string>
        value={null}
        onChange={onChange}
        options={ROWS}
        label="Street"
      />,
    );
    const input = screen.getByRole("combobox", { name: "Street" });
    fireEvent.focus(input);
    return { input, onChange };
  }

  it("passes a disabled row over and never takes it", () => {
    const { input, onChange } = setup();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeOf(input)).toHaveTextContent("Bahnhofstrasse 3");
    const disabled = screen.getByRole("option", { name: /Bahnhofstrasse 2/ });
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    fireEvent.mouseDown(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("typing a disabled option's label in full does not commit it", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "Bahnhofstrasse 2" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });
});

describe("EntityCombobox disabled options", () => {
  function setup(onChange = vi.fn()) {
    const options: ComboOption<string>[] = [
      { value: "a", label: "Closed", disabled: true },
      { value: "b", label: "Checking" },
      { value: "c", label: "Savings" },
      { value: "d", label: "Archived", disabled: true },
    ];
    render(
      <EntityCombobox<string> label="Account" value={null} onChange={onChange} options={options} />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    return { search: screen.getByRole("textbox"), onChange };
  }

  it("opens on the first takeable row, and Home/End skip the disabled ends", () => {
    const { search } = setup();
    expect(activeOf(search)).toHaveTextContent("Checking");
    fireEvent.keyDown(search, { key: "End" });
    expect(activeOf(search)).toHaveTextContent("Savings");
    fireEvent.keyDown(search, { key: "Home" });
    expect(activeOf(search)).toHaveTextContent("Checking");
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(activeOf(search)).toHaveTextContent("Checking");
  });

  it("a press on a disabled row chooses nothing", () => {
    const { onChange } = setup();
    const row = screen.getByRole("option", { name: "Closed" });
    expect(row).toHaveAttribute("aria-disabled", "true");
    fireEvent.mouseDown(row);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
