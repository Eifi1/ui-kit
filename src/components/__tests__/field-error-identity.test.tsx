import { useState } from "react";
import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input, Select, Textarea } from "../ui";
import { NumberField } from "../number-field";

/**
 * A field's `error` coming and going must not REMOUNT the control.
 *
 * Without a message a field rendered bare; with one it was wrapped in a `<div>` with
 * the message. A different element at that spot in the tree is a different subtree to
 * React, so the `<input>` was thrown away and a fresh one mounted: focus dropped to
 * `<body>`, the caret went with it, and an uncontrolled field lost what was typed.
 * Kurvenschmiede's ConfirmPasswordDialog clears its error on change, so the first
 * keystroke after a wrong password knocked the user out of the field.
 */

/** Renders `field(error)` and hands back the setter, so a test can flip the message
 *  from outside without moving focus (a button would take it). */
function mount(field: (error: ReactNode) => ReactNode) {
  let setError: (e: ReactNode) => void = () => {};
  function Harness() {
    const [error, set] = useState<ReactNode>(undefined);
    setError = set;
    return <div className="flex gap-2">{field(error)}</div>;
  }
  render(<Harness />);
  return (e: ReactNode) => act(() => setError(e));
}

type TextControl = HTMLInputElement | HTMLTextAreaElement;

/** Focus, type, show the message, type, clear it, type: the same element all along,
 *  still focused, holding everything typed, the caret where it was put. */
async function typeThroughToggle(control: () => TextControl, setError: (e: ReactNode) => void) {
  const user = userEvent.setup();
  const el = control();
  await user.click(el);
  await user.type(el, "ab");

  setError("That is wrong");
  expect(control()).toBe(el);
  expect(document.activeElement).toBe(el);
  expect(el).toHaveAccessibleDescription("That is wrong");
  await user.keyboard("c");

  // A caret in the middle survives the message going away.
  el.setSelectionRange(1, 1);
  setError(undefined);
  expect(control()).toBe(el);
  expect(document.activeElement).toBe(el);
  expect(el.selectionStart).toBe(1);
  expect(el).not.toHaveAttribute("aria-describedby");
  await user.keyboard("d");

  expect(el).toHaveValue("adbc");
}

describe("a field keeps its control while `error` toggles", () => {
  it("Input, labelled and uncontrolled", async () => {
    const setError = mount((error) => <Input label="Name" defaultValue="" error={error} />);
    await typeThroughToggle(() => screen.getByLabelText("Name"), setError);
  });

  it("Input, unlabelled — the bare <input> in a flex row", async () => {
    const setError = mount((error) => (
      <Input aria-label="Name" className="flex-1" defaultValue="" error={error} />
    ));
    await typeThroughToggle(() => screen.getByLabelText("Name"), setError);
  });

  it("Input, password with the reveal toggle", async () => {
    const setError = mount((error) => (
      <Input type="password" label="Password" defaultValue="" error={error} />
    ));
    await typeThroughToggle(() => screen.getByLabelText("Password"), setError);
  });

  it("Input, unlabelled password", async () => {
    const setError = mount((error) => (
      <Input type="password" aria-label="Password" defaultValue="" error={error} />
    ));
    await typeThroughToggle(() => screen.getByLabelText("Password"), setError);
  });

  it("Textarea, labelled and unlabelled", async () => {
    const setA = mount((error) => <Textarea label="Reason" defaultValue="" error={error} />);
    await typeThroughToggle(() => screen.getByLabelText("Reason"), setA);
    const setB = mount((error) => <Textarea aria-label="Note" defaultValue="" error={error} />);
    await typeThroughToggle(() => screen.getByLabelText("Note"), setB);
  });

  it("Select, labelled and unlabelled", async () => {
    for (const [name, props] of [
      ["Kind", { label: "Kind" }],
      ["Size", { "aria-label": "Size" }],
    ] as const) {
      const user = userEvent.setup();
      const setError = mount((error) => (
        <Select {...props} defaultValue="a" error={error}>
          <option value="a">A</option>
          <option value="b">B</option>
        </Select>
      ));
      const select = screen.getByLabelText(name);
      select.focus();
      await user.selectOptions(select, "b");
      setError("Pick another");
      expect(screen.getByLabelText(name)).toBe(select);
      expect(document.activeElement).toBe(select);
      setError(undefined);
      expect(screen.getByLabelText(name)).toBe(select);
      expect(document.activeElement).toBe(select);
      expect(select).toHaveValue("b");
    }
  });

  it("NumberField", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const setError = mount((error) => (
      <NumberField label="Wheelbase" value={null} nullable onCommit={onCommit} error={error} />
    ));
    const input = screen.getByLabelText("Wheelbase") as HTMLInputElement;
    await user.click(input);
    await user.type(input, "12");
    setError("Too short");
    expect(screen.getByLabelText("Wheelbase")).toBe(input);
    expect(document.activeElement).toBe(input);
    await user.keyboard("3");
    input.setSelectionRange(1, 1);
    setError(null);
    expect(screen.getByLabelText("Wheelbase")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    await user.keyboard("4");
    expect(input).toHaveValue("1423");
    // Still mid-edit: nothing committed, because focus never left.
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("the real trigger: a message the field clears on its own first keystroke", async () => {
    const user = userEvent.setup();
    function ConfirmPassword() {
      const [value, setValue] = useState("");
      const [error, setError] = useState<string | undefined>("Wrong password");
      return (
        <Input
          type="password"
          label="Password"
          value={value}
          error={error}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
        />
      );
    }
    render(<ConfirmPassword />);
    const input = screen.getByLabelText("Password");
    await user.click(input);
    await user.keyboard("hunter2");
    expect(screen.getByLabelText("Password")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue("hunter2");
  });
});

describe("what a field without `error` renders is unchanged", () => {
  it("an Input that never passes `error` is still a bare <input>", () => {
    const { container } = render(<Input aria-label="Bare" className="flex-1" />);
    expect(container.firstElementChild?.tagName).toBe("INPUT");
    expect(container.firstElementChild).toHaveClass("flex-1");
  });

  it("a field that passes `error` keeps one plain box, message or not, className on the field", () => {
    const { container, rerender } = render(
      <Input aria-label="Bare" className="flex-1" error={undefined} />,
    );
    const box = container.firstElementChild!;
    expect(box.tagName).toBe("DIV");
    expect(box.getAttribute("class")).toBeNull();
    expect(box.firstElementChild).toHaveClass("flex-1");
    expect(box.children).toHaveLength(1);
    rerender(<Input aria-label="Bare" className="flex-1" error="Nope" />);
    // The same box as before, now with the message under the field.
    expect(container.firstElementChild).toBe(box);
    expect(box.children).toHaveLength(2);
    expect(box.lastElementChild).toHaveTextContent("Nope");
  });
});
