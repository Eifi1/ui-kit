import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Autocomplete } from "../autocomplete";
import { ChipInput } from "../chip-input";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { MultiSelect } from "../multi-select";
import { CommandPalette } from "../../search/command-palette";
import { isImeEnter } from "../../lib/ime";

/**
 * Round 0.34 Wave 2, BUG-9: the Enter that confirms an IME composition (Chinese,
 * Japanese) picked an option or submitted. Typing 北京 with a pinyin IME is "beijing",
 * then Enter — the IME's Enter, which chooses the candidate. EntityCombobox took the
 * highlighted row with it, and Combobox called `onSubmit` (in keksdose that creates a
 * category). Kurvenschmiede ships zh.
 *
 * Simulated in jsdom, not typed through a real IME: `isComposing` while the composition
 * is open, and `keyCode` 229, which is how Safari reports the Enter that ended one.
 */

const OPTIONS = [
  { value: "a1", label: "Checking" },
  { value: "a2", label: "Savings" },
];
const COMPOSING = { key: "Enter", isComposing: true };
const SAFARI = { key: "Enter", keyCode: 229 };

describe("isImeEnter", () => {
  it("is an Enter inside a composition, or Safari's keyCode 229", () => {
    expect(isImeEnter(new KeyboardEvent("keydown", COMPOSING))).toBe(true);
    const safari = new KeyboardEvent("keydown", { key: "Enter" });
    Object.defineProperty(safari, "keyCode", { value: 229 });
    expect(isImeEnter(safari)).toBe(true);
    expect(isImeEnter(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(false);
    expect(isImeEnter(new KeyboardEvent("keydown", { key: "a", isComposing: true }))).toBe(false);
  });
});

describe("a composing Enter neither picks nor submits (BUG-9)", () => {
  it.each([
    ["isComposing", COMPOSING],
    ["keyCode 229", SAFARI],
  ])("EntityCombobox (%s)", async (_how, ime) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EntityCombobox<string> label="Account" value={null} onChange={onChange} options={OPTIONS} />);
    await user.click(screen.getByRole("combobox", { name: /Account/ }));
    const search = screen.getByPlaceholderText(/Search/);
    await waitFor(() => expect(search).toHaveFocus());
    fireEvent.keyDown(search, ime);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // The Enter after the composition is the user's, and takes the row.
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("a1");
  });

  it.each([
    ["isComposing", COMPOSING],
    ["keyCode 229", SAFARI],
  ])("Combobox (%s): no row taken and no onSubmit", async (_how, ime) => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<Combobox label="Payee" value="" onChange={onChange} onSubmit={onSubmit} options={["Rewe", "Migros"]} />);
    const field = screen.getByRole("combobox", { name: "Payee" });
    act(() => field.focus());
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, ime);
    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    // The Enter after the composition takes the highlighted row, as before.
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("Rewe");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Combobox: a composing Enter with nothing highlighted does not submit", () => {
    const onSubmit = vi.fn();
    render(<Combobox label="Payee" value="beijing" onChange={() => {}} onSubmit={onSubmit} options={[]} />);
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Payee" }), COMPOSING);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("InlineEntityCombobox", () => {
    const onChange = vi.fn();
    render(<InlineEntityCombobox<string> label="Account" value={null} onChange={onChange} options={OPTIONS} />);
    const field = screen.getByRole("combobox", { name: "Account" });
    act(() => field.focus());
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, COMPOSING);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("a1");
  });

  it("MultiSelect", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MultiSelect
        label="Tags"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
        values={[]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: /Tags/ }));
    const search = screen.getByPlaceholderText(/Search/);
    await waitFor(() => expect(search).toHaveFocus());
    fireEvent.keyDown(search, COMPOSING);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["a"]);
  });

  it("ChipInput: the draft is not committed", () => {
    const onChange = vi.fn();
    render(<ChipInput label="Tags" value={[]} onChange={onChange} />);
    const field = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.change(field, { target: { value: "beijing" } });
    fireEvent.keyDown(field, COMPOSING);
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveValue("beijing");
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["beijing"]);
  });

  it("Autocomplete", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Autocomplete<string> label="Address" value="Example" onChange={() => {}} onSelect={onSelect} options={[
      { value: "1", label: "Example Street 1" },
    ]} />);
    const field = screen.getByRole("combobox", { name: "Address" });
    await user.click(field);
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, COMPOSING);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("CommandPalette", async () => {
    const onSelect = vi.fn();
    render(
      <CommandPalette
        open
        onClose={() => {}}
        search={() => [{ id: "1", label: "Budgets", group: "Pages", onSelect }]}
      />,
    );
    const field = screen.getByRole("combobox");
    await waitFor(() => expect(screen.getByRole("option", { name: /Budgets/ })).toBeInTheDocument());
    fireEvent.keyDown(field, COMPOSING);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
