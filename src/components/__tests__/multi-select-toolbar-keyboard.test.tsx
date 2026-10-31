import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MultiSelect } from "../multi-select";

/**
 * MultiSelect's "Select all" and "Clear" are reachable from the keyboard on a desktop,
 * and keep the focus they are pressed with (refactor audit 2026-10-30, INP-9).
 *
 * The panel turned every Tab into "close and return to the trigger" and its rows are not
 * tab stops, so the two buttons could not be reached at all: a keyboard user cleared
 * thirty ticks one Enter at a time. And a pressed "Clear" set `disabled` on itself, which
 * drops the focus it held to <body> (INP-4's class; JumpCalendar's arrows are the rule).
 */

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

function Host({ initial = [] as string[], onChange = vi.fn() }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <MultiSelect
      label="Accounts"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

/**
 * Opens the panel and lets its opening frame run, which puts focus in the search box. The
 * panel focuses the box a frame after it opens (`combobox-core`'s `requestAnimationFrame`),
 * and a Tab pressed before that frame was undone by it: Enter then went to the search box
 * and toggled the highlighted row — a run in three under load. A frame asked for now runs
 * after the panel's, however loaded the machine is (focus-trap.tab-stops.test's rule).
 */
async function open() {
  const trigger = screen.getByRole("combobox", { name: /Accounts/ });
  fireEvent.click(trigger);
  const search = screen.getByRole("textbox");
  await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(search).toHaveFocus();
  return { trigger, search };
}

const button = (name: string) => screen.getByRole("button", { name });

describe("MultiSelect's toolbar from the keyboard", () => {
  it("Tab walks search box → Select all → Clear, and past the last closes to the trigger", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const { trigger, search } = await open();
    await user.tab();
    expect(button("Select all")).toHaveFocus();
    await user.tab();
    expect(button("Clear")).toHaveFocus();
    await user.tab({ shift: true });
    expect(button("Select all")).toHaveFocus();
    await user.tab({ shift: true });
    expect(search).toHaveFocus();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("keys on a toolbar button are the button's, not the list's", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    await open();
    await user.tab();
    await user.keyboard("{Enter}");
    // Select all, not the highlighted row's toggle.
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);
  });

  // 0.52 code review, combobox-core.tsx: once a toolbar button's keys were its own, a
  // MOUSE press on one — which focuses a button in Chrome and Firefox — left the arrows
  // dead: they reached the button, not the list, where until 0.52 they had moved the
  // highlight. A press keeps the focus in the search box, as a press on a row does.
  it("a pointer press on a toolbar button leaves the keys with the list", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    const { search } = await open();
    const first = search.getAttribute("aria-activedescendant");
    await user.click(button("Select all"));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);
    expect(search).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(search.getAttribute("aria-activedescendant")).not.toBe(first);
  });

  it("Clear keeps its focus once it has nothing left to clear, and refuses the next press", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Host initial={["a"]} onChange={onChange} />);
    await open();
    await user.tab();
    await user.tab();
    const clear = button("Clear");
    expect(clear).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(clear).toHaveFocus();
    expect(clear).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
