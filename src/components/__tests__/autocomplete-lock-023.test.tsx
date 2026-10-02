import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Autocomplete, type AutocompleteProps } from "../autocomplete";
import type { ComboOption } from "../combobox-core";
import { WriteLockProvider } from "../write-lock";

/**
 * Autocomplete joins the Combobox family's write lock (0.23, keksdose G2): `commit` /
 * `disabledReason`, as on InlineEntityCombobox's text input — focusable and
 * `aria-disabled`, `readOnly`, the reason in the kit Tooltip and on
 * `aria-describedby`, no list and no lookup, Enter swallowed, and nothing reaching
 * `onChange`, `onSelect` or `onOpenChange(true)`.
 */

const PLACES: ComboOption<string>[] = [
  { value: "1", label: "Example Street 1, 0000 Sampletown" },
  { value: "2", label: "Example Street 12, 0000 Sampletown" },
];

function Harness(props: Partial<AutocompleteProps<string>> & { initial?: string }) {
  const { initial = "Example", onChange, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <Autocomplete<string>
      label="Address"
      options={PLACES}
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

const field = () => screen.getByRole("combobox", { name: "Address" });

function described(el: HTMLElement) {
  return (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);
}

async function settle(ms = 300) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("Autocomplete: the write lock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a disabledReason keeps it focusable and readOnly, opens nothing, changes nothing, says why", async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <Harness
        disabledReason="The address is confirmed"
        onChange={onChange}
        onSelect={onSelect}
        onOpenChange={onOpenChange}
      />,
    );
    const input = field();
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute("aria-disabled", "true");
    expect(input).toHaveAttribute("readonly");
    act(() => input.focus());
    expect(input).toHaveFocus();

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.change(input, { target: { value: "Example Street" } });
    await settle();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("Example");
    expect(onChange).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(true);

    expect(described(input)).toContain("The address is confirmed");
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("The address is confirmed");
  });

  it("asks no loadOptions, even with `open` held true", async () => {
    const load = vi.fn(async () => PLACES);
    render(<Harness loadOptions={load} open disabledReason="Locked" initial="Example Street" />);
    fireEvent.focus(field());
    await settle(1000);
    expect(load).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("swallows Enter — no form submit, no caller's Enter — and passes the other keys on", () => {
    const onKeyDown = vi.fn();
    render(<Harness disabledReason="Locked" onKeyDown={onKeyDown} />);
    expect(fireEvent.keyDown(field(), { key: "Enter" })).toBe(false);
    expect(onKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("`commit` locks under a locked WriteLockProvider, with the lock's reason over its own", () => {
    render(
      <WriteLockProvider locked reason="Read-only demo — saving is disabled">
        <Harness commit disabledReason="Its own reason" />
      </WriteLockProvider>,
    );
    expect(field()).toHaveAttribute("aria-disabled", "true");
    expect(described(field())).toContain("Read-only demo — saving is disabled");
    expect(described(field())).not.toContain("Its own reason");
  });

  it("without `commit` it stays live under the lock — a search whose result is draft state", async () => {
    const onSelect = vi.fn();
    render(
      <WriteLockProvider locked>
        <Harness onSelect={onSelect} />
      </WriteLockProvider>,
    );
    expect(field()).not.toHaveAttribute("aria-disabled");
    fireEvent.focus(field());
    await settle();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("option")[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("a lock arriving while the list is up takes the list away", async () => {
    const ui = (reason?: string) => <Harness disabledReason={reason} />;
    const { rerender } = render(ui());
    fireEvent.focus(field());
    await settle();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    rerender(ui("Locked"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-expanded", "false");
  });
});
