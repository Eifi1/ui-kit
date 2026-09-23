import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { MultiSelect } from "../multi-select";
import { DropdownPanel, useDropdown } from "../dropdown";

/**
 * The ARIA the package already knew how to write, applied to the pickers.
 *
 * `CommandPalette` has had `role="combobox"` + `aria-expanded` + `aria-controls` +
 * `aria-activedescendant` over a `role="listbox"`/`role="option"` panel since it was
 * written, and it was the only thing in ~20,000 lines that did (audit §a11y, "neither
 * pattern was ever generalised"). Everything below is that same model, moved onto the
 * six pickers three applications actually use.
 *
 * What a reader got before: a field-styled `<button>` with no role but `button`,
 * carrying an `aria-invalid` that role does not support; a list of rows whose
 * highlight lived only in a background colour; and, in `MultiSelect`, a checked state
 * that existed ONLY as a decorative `<span>` — "selected" was imperceptible without
 * sight.
 *
 * These assert the keyboard and the announced state, never the implementation: the
 * active option is read back through `aria-activedescendant` and resolved by id, so
 * the id scheme is free to change and this file is not.
 */
const OPTIONS = [
  { value: "a", label: "Checking" },
  { value: "b", label: "Savings" },
  { value: "c", label: "Credit card" },
];

/** The option the field currently points at — resolved through the DOM, the way a
 *  screen reader resolves it, rather than by knowing what the ids look like. */
function activeOption(field: HTMLElement): HTMLElement | null {
  const id = field.getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
}

describe("EntityCombobox's trigger is a combobox, not a button wearing aria-invalid", () => {
  const open = () => {
    render(
      <EntityCombobox<string>
        label="Account"
        value={null}
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    return screen.getByRole("combobox", { name: /Account/ });
  };

  it("names the list it controls, and says whether it is showing", () => {
    const trigger = open();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // The id is not asserted — that it RESOLVES is the whole point.
    const listbox = screen.getByRole("listbox");
    expect(trigger.getAttribute("aria-controls")).toBe(listbox.id);
    expect(listbox.id).toBeTruthy();
  });

  it("opens on ArrowDown, per the APG keyboard model", () => {
    const trigger = open();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("carries aria-invalid on a role that supports it", () => {
    render(
      <EntityCombobox<string>
        label="Account"
        value={null}
        onChange={vi.fn()}
        options={OPTIONS}
        invalid
      />,
    );
    expect(screen.getByRole("combobox", { name: /Account/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("the open panel says which option is active, and moves it from the keyboard", () => {
  function setup(onChange = vi.fn()) {
    render(
      <EntityCombobox<string>
        label="Account"
        value={null}
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: /Account/ });
    fireEvent.click(trigger);
    // Focus lands in the panel's search box, so that is what owns the active
    // descendant — the field the user is typing into points at the row they are on.
    return { trigger, search: screen.getByRole("textbox"), onChange };
  }

  it("points at the first option as soon as it opens", () => {
    const { search } = setup();
    expect(activeOption(search)).toHaveTextContent("Checking");
    expect(activeOption(search)).toHaveAttribute("role", "option");
  });

  it("moves with Down and Up", () => {
    const { search } = setup();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(activeOption(search)).toHaveTextContent("Savings");
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(activeOption(search)).toHaveTextContent("Checking");
  });

  it("jumps to the ends with Home and End", () => {
    const { search } = setup();
    fireEvent.keyDown(search, { key: "End" });
    expect(activeOption(search)).toHaveTextContent("Credit card");
    fireEvent.keyDown(search, { key: "Home" });
    expect(activeOption(search)).toHaveTextContent("Checking");
  });

  it("commits the active option on Enter and hands focus back to the trigger", () => {
    const { trigger, search, onChange } = setup();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("listbox")).toBeNull();
    // Without this the panel unmounts under the user's focus and drops it on
    // <body> — the caret vanishes and the next Tab restarts at the top of the page.
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape and hands focus back to the trigger", () => {
    const { trigger, search } = setup();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Tab and hands focus back to the trigger", () => {
    const { trigger, search } = setup();
    fireEvent.keyDown(search, { key: "Tab" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("marks the chosen option selected, not merely highlighted", () => {
    render(
      <EntityCombobox<string>
        label="Account"
        value="b"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    // `aria-selected` is the CHOSEN state; the keyboard highlight is
    // `aria-activedescendant`. Conflating them tells a reader the row under the
    // cursor is already the answer.
    expect(screen.getByRole("option", { name: "Savings" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "Checking" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });
});

describe("MultiEntityCombobox announces a multiple selection", () => {
  it("is a multiselectable listbox whose chosen rows say so", () => {
    render(
      <MultiEntityCombobox<string>
        label="Payees"
        value={["a", "c"]}
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Payees/ }));

    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
    const chosen = screen
      .getAllByRole("option")
      .filter((o) => o.getAttribute("aria-selected") === "true")
      .map((o) => o.textContent);
    expect(chosen).toEqual(["Checking", "Credit card"]);
  });
});

describe("MultiSelect's checked state is semantic, not a decorative span", () => {
  function setup(values: (string | number)[] = [], onChange = vi.fn()) {
    render(
      <MultiSelect
        label="Categories"
        values={values}
        onChange={onChange}
        options={[
          { value: "a", label: "Groceries" },
          { value: "b", label: "Fuel" },
        ]}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: /Categories/ });
    return { trigger, onChange };
  }

  it("exposes each row as an option carrying its checked state", () => {
    const { trigger } = setup(["b"]);
    fireEvent.click(trigger);

    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
    expect(screen.getByRole("option", { name: /Groceries/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("option", { name: /Fuel/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("toggles the active row with Enter", () => {
    const { trigger, onChange } = setup([]);
    fireEvent.click(trigger);
    const search = screen.getByRole("textbox");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(activeOption(search)).toHaveTextContent("Fuel");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("closes on Escape and hands focus back to the trigger", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("the two input-shaped comboboxes point at the list they opened", () => {
  it("Combobox: aria-controls resolves and the highlight is announced", () => {
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <Combobox
          label="Payee"
          value={value}
          onChange={setValue}
          options={["Migros", "Coop", "Denner"]}
        />
      );
    }
    render(<Harness />);
    const field = screen.getByRole("combobox", { name: "Payee" });
    fireEvent.focus(field);

    expect(field.getAttribute("aria-controls")).toBe(screen.getByRole("listbox").id);
    // Nothing is highlighted until the user asks for a row, so nothing is claimed.
    expect(field).not.toHaveAttribute("aria-activedescendant");

    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(activeOption(field)).toHaveTextContent("Migros");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(activeOption(field)).toHaveTextContent("Coop");
  });

  it("Combobox: leaves Home and End to the caret, on purpose", () => {
    // The APG gives Home/End to the list only where the combobox is NOT editable.
    // Here the text is the value — a payee name long enough to want its start
    // reached — and the desktop list is capped at eight rows, so taking the two keys
    // that move a caret would buy almost nothing and cost the gesture the field is
    // actually used with. The trigger-shaped pickers above, whose search box is a
    // throwaway filter, do jump.
    render(<Combobox label="Payee" value="" onChange={vi.fn()} options={["Migros", "Coop"]} />);
    const field = screen.getByRole("combobox", { name: "Payee" });
    fireEvent.focus(field);
    fireEvent.keyDown(field, { key: "ArrowDown" });

    fireEvent.keyDown(field, { key: "End" });
    expect(activeOption(field)).toHaveTextContent("Migros");
  });

  it("InlineEntityCombobox: the rows are options and the field names the list", () => {
    render(
      <InlineEntityCombobox<string>
        label="Account"
        value="b"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    const field = screen.getByRole("combobox", { name: "Account" });
    fireEvent.focus(field);

    const listbox = screen.getByRole("listbox");
    expect(field.getAttribute("aria-controls")).toBe(listbox.id);
    expect(within(listbox).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Checking",
      "Savings",
      "Credit card",
    ]);
    expect(screen.getByRole("option", { name: "Savings" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("useDropdown finally handles Escape (audit: it had none at all)", () => {
  function Harness() {
    const { open, setOpen, wrapperRef, panelRef, triggerRef } = useDropdown();
    return (
      <div ref={wrapperRef} style={{ position: "relative" }}>
        <button ref={triggerRef} type="button" onClick={() => setOpen((v) => !v)}>
          open
        </button>
        {open && (
          <DropdownPanel anchorRef={triggerRef} panelRef={panelRef}>
            <li>
              <button type="button">CHF</button>
            </li>
          </DropdownPanel>
        )}
      </div>
    );
  }

  it("closes the panel and returns focus to the trigger", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "open" });
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "CHF" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("button", { name: "CHF" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
