import type { ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WriteLockProvider } from "../write-lock";
import { Input } from "../input";
import { Select } from "../select";
import { Combobox } from "../combobox";
import { Autocomplete } from "../autocomplete";
import { InlineEntityCombobox } from "../inline-entity-combobox";
import { AmountInput } from "../amount-input";
import { DatePicker } from "../date-picker";
import type { DisabledReasonDisplay } from "../field-parts";

/**
 * INP-4 (refactor audit 2026-11-22): LockFrame drew the field bare while unlocked and in
 * the reason's frame while locked, so a lock arriving or lifting REMOUNTED the field — a
 * focused one lost the focus to <body>, with its caret and selection. keksdose's add-item
 * field when another member's Done arrives by sync; kastlan's offline lock on every
 * connection drop. The control now stays at one tree position in every state.
 */

const noop = () => {};

/** Each kind of field, with `commit` and the role its control answers to. */
const FIELDS: Record<string, { field: (display: DisabledReasonDisplay) => ReactElement; role: string }> = {
  Input: {
    field: (display) => <Input label="Item" commit value="milk" onChange={noop} disabledReasonDisplay={display} />,
    role: "textbox",
  },
  Select: {
    field: (display) => (
      <Select label="Item" commit value="a" onChange={noop} disabledReasonDisplay={display}>
        <option value="a">Milk</option>
      </Select>
    ),
    role: "combobox",
  },
  Combobox: {
    field: (display) => (
      <Combobox label="Item" commit value="milk" onChange={noop} options={["milk"]} disabledReasonDisplay={display} />
    ),
    role: "combobox",
  },
  Autocomplete: {
    field: (display) => (
      <Autocomplete<string>
        label="Item"
        commit
        value="milk"
        onChange={noop}
        options={[{ value: "milk", label: "milk" }]}
        disabledReasonDisplay={display}
      />
    ),
    role: "combobox",
  },
  InlineEntityCombobox: {
    field: (display) => (
      <InlineEntityCombobox<string>
        label="Item"
        commit
        value="a"
        onChange={noop}
        options={[{ value: "a", label: "Milk" }]}
        disabledReasonDisplay={display}
      />
    ),
    role: "combobox",
  },
  AmountInput: {
    field: (display) => (
      <AmountInput label="Item" commit value="12.50" onChange={noop} disabledReasonDisplay={display} />
    ),
    role: "textbox",
  },
  DatePicker: {
    field: (display) => (
      <DatePicker
        label="Item"
        commit
        value="2026-11-22"
        onChange={noop}
        locale="en-GB"
        disabledReasonDisplay={display}
      />
    ),
    role: "combobox",
  },
};

describe.each(["tooltip", "line"] as const)("a lock flipping under a focused field (%s)", (display) => {
  it.each(Object.keys(FIELDS))("%s keeps its control and the focus", (name) => {
    const { field, role } = FIELDS[name];
    const at = (locked: boolean) => (
      <WriteLockProvider locked={locked} reason="The list is done">
        {field(display)}
      </WriteLockProvider>
    );
    const { rerender } = render(at(false));
    const control = screen.getAllByRole(role)[0];
    act(() => control.focus());
    rerender(at(true));
    expect(screen.getAllByRole(role)[0], "the same node once locked").toBe(control);
    expect(document.activeElement).toBe(control);
    expect(control).toHaveAccessibleDescription(expect.stringContaining("The list is done"));
    rerender(at(false));
    expect(screen.getAllByRole(role)[0], "the same node once unlocked").toBe(control);
    expect(document.activeElement).toBe(control);
  });
});
