import { useState, type ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldSuggestion } from "../field-parts";
import { Input } from "../input";
import { Combobox } from "../combobox";
import { ToggleGroup } from "../toggle-group";

/**
 * INP-2 (refactor audit 2026-11-22): FieldSuggestion's Clear takes the caption — and so
 * itself — away in the commit it was pressed in, so a keyboard Clear left the focus on
 * <body>. The focus goes to the field the caption describes first, quietly (a picker
 * stays shut), as SearchField's and DateField's clear do.
 */

/** A field whose suggestion is there until Clear empties it — keksdose's "Last used". */
function Suggested({ field }: { field: (value: string, hint: ReactNode, set: (v: string) => void) => ReactNode }) {
  const [value, setValue] = useState("a");
  const hint = value ? <FieldSuggestion from="Last used" onClear={() => setValue("")} /> : undefined;
  return <>{field(value, hint, setValue)}</>;
}

function clear() {
  const button = screen.getByRole("button", { name: /^Clear the suggestion/ });
  act(() => button.focus());
  fireEvent.click(button);
  expect(screen.queryByRole("button", { name: /^Clear the suggestion/ })).toBeNull();
}

describe("FieldSuggestion's Clear gives the focus to its field", () => {
  it("Input", () => {
    render(
      <Suggested
        field={(value, hint, set) => (
          <Input label="Account" value={value} onChange={(e) => set(e.target.value)} hint={hint} />
        )}
      />,
    );
    clear();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Account" }));
  });

  it("Combobox, which stays shut", () => {
    render(
      <Suggested
        field={(value, hint, set) => (
          <Combobox label="Payee" value={value} onChange={set} options={["a", "Coop"]} hint={hint} />
        )}
      />,
    );
    clear();
    expect(document.activeElement).toBe(screen.getByRole("combobox", { name: /Payee/ }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("a group: its first control", () => {
    render(
      <Suggested
        field={(value, hint, set) => (
          <ToggleGroup
            label="Kind"
            value={value}
            onChange={set}
            options={[
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ]}
            hint={hint}
          />
        )}
      />,
    );
    clear();
    // The group's tab stop: with nothing chosen now, its first option.
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Alpha" }));
  });

  it("drawn outside a kit field: the control whose description names the caption", () => {
    function SplitRow() {
      const [value, setValue] = useState("Groceries");
      return (
        <>
          <input aria-label="Category" aria-describedby="memo-cat" value={value} onChange={() => {}} />
          {value && (
            <p id="memo-cat">
              <FieldSuggestion from="From the memo" field="Category" onClear={() => setValue("")} />
            </p>
          )}
        </>
      );
    }
    render(<SplitRow />);
    clear();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Category" }));
  });
});
