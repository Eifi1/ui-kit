import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntityCombobox } from "../entity-combobox";
import { MultiSelect } from "../multi-select";
import { Combobox } from "../combobox";
import { InlineEntityCombobox } from "../inline-entity-combobox";
import { stubPhone } from "../../test/viewport";

/**
 * Closing a trigger picker's phone sheet WITHOUT choosing hands focus back to the
 * trigger, as choosing a row always has (refactor audit 2026-10-30, INP-7).
 *
 * PickerSheet keeps `restoreFocus` off because Combobox and InlineEntityCombobox open
 * their sheet from the field's own `onFocus` — refocusing the field re-opens it. The six
 * ComboboxPanel pickers open on a CLICK, so for them the X, Done, Escape and Back left
 * focus on <body>: in the layout a VoiceOver or TalkBack user is in, and on a desktop at
 * Large below 960 px.
 */

beforeEach(() => {
  stubPhone();
});
afterEach(() => vi.unstubAllGlobals());

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

function openEntity() {
  render(<EntityCombobox<string> label="Shop" value={null} onChange={() => {}} options={OPTIONS} />);
  const trigger = screen.getByRole("combobox", { name: /Shop/ });
  fireEvent.click(trigger);
  return { trigger, sheet: screen.getByRole("dialog") };
}

describe("a ComboboxPanel picker's phone sheet, closed without choosing", () => {
  it("the X hands focus back to the trigger", () => {
    const { trigger, sheet } = openEntity();
    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("Escape hands focus back to the trigger", () => {
    const { trigger, sheet } = openEntity();
    fireEvent.keyDown(within(sheet).getByRole("textbox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("MultiSelect's Done hands focus back to the trigger", () => {
    render(
      <MultiSelect
        label="Accounts"
        value={[]}
        onChange={() => {}}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: /Accounts/ });
    fireEvent.click(trigger);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

/**
 * The typed comboboxes (refactor audit 2026-11-22, INP-3): they open the sheet from the
 * field's own `onFocus`, which is why INP-7 left them out — refocusing the field would
 * re-open it. `focusQuietly` (0.50.1) is the focus they take without opening, so a pick and
 * a close without one both hand the focus back to the field, and the sheet stays shut.
 */
function TypedCombobox() {
  const [value, setValue] = useState("");
  return <Combobox label="Payee" value={value} onChange={setValue} options={["Migros", "Coop"]} />;
}

function TypedEntity() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <InlineEntityCombobox<string>
      label="Category"
      value={value}
      onChange={(next) => setValue(next as string | null)}
      options={OPTIONS}
    />
  );
}

const TYPED = {
  Combobox: { mount: () => render(<TypedCombobox />), name: /Payee/, row: "Coop" },
  InlineEntityCombobox: { mount: () => render(<TypedEntity />), name: /Category/, row: "Beta" },
};

describe.each(Object.entries(TYPED))("%s's phone sheet hands the focus back to the field", (_, typed) => {
  function open() {
    typed.mount();
    const field = screen.getByRole("combobox", { name: typed.name });
    act(() => field.focus());
    const sheet = screen.getByRole("dialog");
    expect(sheet).toContainElement(document.activeElement as HTMLElement);
    return { field, sheet };
  }

  it("after a pick, and the sheet stays shut", () => {
    const { field, sheet } = open();
    fireEvent.click(within(sheet).getByRole("option", { name: typed.row }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(field);
  });

  it("after the X", () => {
    const { field, sheet } = open();
    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(field);
  });

  it("after Escape", () => {
    const { field } = open();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(field);
  });
});
