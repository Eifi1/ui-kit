import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CommandPalette, type CommandItem } from "../command-palette";

/**
 * keksdose binds the palette's search text to the URL's `q`, so a search survives a
 * reload and Back walks through it. That needs the text controlled from outside;
 * uncontrolled stays the default, and still starts empty on every open.
 */

const ITEMS: CommandItem[] = [
  { id: "a", label: "Accounts", group: "Pages", onSelect: () => {} },
  { id: "b", label: "Budgets", group: "Pages", onSelect: () => {} },
];
const search = (q: string) => ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

const field = () => screen.getByRole("combobox");

describe("CommandPalette query", () => {
  it("shows the controlled query and searches with it from the first open", async () => {
    const spy = vi.fn(search);
    render(<CommandPalette open onClose={vi.fn()} search={spy} query="bud" onQueryChange={vi.fn()} />);
    expect(field()).toHaveValue("bud");
    await waitFor(() => expect(screen.getByRole("option", { name: "Budgets" })).toBeInTheDocument());
    expect(screen.queryByRole("option", { name: "Accounts" })).toBeNull();
    expect(spy).toHaveBeenCalledWith("bud");
  });

  it("reports keystrokes through onQueryChange and shows only what the owner sets", () => {
    const onQueryChange = vi.fn();
    render(<CommandPalette open onClose={vi.fn()} search={search} query="" onQueryChange={onQueryChange} />);
    fireEvent.change(field(), { target: { value: "acc" } });
    expect(onQueryChange).toHaveBeenCalledWith("acc");
    // The owner did not write it back, so the field keeps the owner's value.
    expect(field()).toHaveValue("");
  });

  it("follows an outside change of the query (Back through the URL)", async () => {
    function Harness() {
      const [q, setQ] = useState("acc");
      return (
        <>
          <button type="button" onClick={() => setQ("bud")}>
            back
          </button>
          <CommandPalette open onClose={vi.fn()} search={search} query={q} onQueryChange={setQ} />
        </>
      );
    }
    render(<Harness />);
    await waitFor(() => expect(screen.getByRole("option", { name: "Accounts" })).toBeInTheDocument());
    // The palette is modal, so the page's button is reached programmatically.
    act(() => screen.getByRole("button", { name: "back", hidden: true }).click());
    expect(field()).toHaveValue("bud");
    await waitFor(() => expect(screen.getByRole("option", { name: "Budgets" })).toBeInTheDocument());
    expect(screen.queryByRole("option", { name: "Accounts" })).toBeNull();
  });

  it("does not reset a controlled query when it opens", () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(
      <CommandPalette open={false} onClose={vi.fn()} search={search} query="bud" onQueryChange={onQueryChange} />,
    );
    rerender(<CommandPalette open onClose={vi.fn()} search={search} query="bud" onQueryChange={onQueryChange} />);
    expect(field()).toHaveValue("bud");
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it("stays uncontrolled by default: types freely, starts empty on every open, and still reports", () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(
      <CommandPalette open onClose={vi.fn()} search={search} onQueryChange={onQueryChange} />,
    );
    fireEvent.change(field(), { target: { value: "bud" } });
    expect(field()).toHaveValue("bud");
    expect(onQueryChange).toHaveBeenCalledWith("bud");

    rerender(<CommandPalette open={false} onClose={vi.fn()} search={search} onQueryChange={onQueryChange} />);
    rerender(<CommandPalette open onClose={vi.fn()} search={search} onQueryChange={onQueryChange} />);
    expect(field()).toHaveValue("");
  });
});
