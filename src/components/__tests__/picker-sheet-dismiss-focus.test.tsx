import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntityCombobox } from "../entity-combobox";
import { MultiSelect } from "../multi-select";
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
