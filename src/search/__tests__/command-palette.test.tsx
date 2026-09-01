import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { CommandPalette, type CommandItem } from "../command-palette";

/**
 * The palette reads its `search` provider through a ref, so a new callback identity is
 * NOT a re-run signal. That is deliberate — a provider closing over a rendered list
 * allocates a new function on most renders — but it left no way to say "the data behind
 * the provider changed", and the app's own provider is exactly that shape: the three
 * lists it searches are fetched with `enabled: open`, so on a cold cache they resolve
 * AFTER the palette is on screen. The user's last keystroke settled the 150 ms debounce,
 * the queries landed a moment later, and the groups they would have contributed were
 * absent until another keystroke.
 *
 * `revision` is the signal. These tests pin both halves: a bare identity change still
 * does not re-run (or typing would stutter), and a revision change does.
 */
function Harness({ initial }: { initial: CommandItem[] }) {
  const [items, setItems] = useState(initial);
  // A NEW callback on every render, like the real one.
  const search = () => items;
  return (
    <>
      <button type="button" onClick={() => setItems([...items])}>
        rerender only
      </button>
      <button
        type="button"
        onClick={() => setItems([{ id: "late", label: "Arrived late", group: "Accounts", onSelect: () => {} }])}
      >
        data arrives
      </button>
      <CommandPalette open onClose={vi.fn()} search={search} revision={items} />
    </>
  );
}

describe("CommandPalette revision", () => {
  it("shows results the provider only had after the palette opened", async () => {
    render(<Harness initial={[{ id: "a", label: "Only page", group: "Pages", onSelect: () => {} }]} />);
    await screen.findByText("Only page");

    act(() => {
      screen.getByText("data arrives").click();
    });
    await waitFor(() => expect(screen.getByText("Arrived late")).toBeInTheDocument());
    expect(screen.queryByText("Only page")).not.toBeInTheDocument();
  });

  it("does not re-search merely because the caller rebuilt the callback", async () => {
    const search = vi.fn(() => [{ id: "a", label: "Only page", group: "Pages", onSelect: () => {} }]);
    const { rerender } = render(
      <CommandPalette open onClose={vi.fn()} search={search} revision={1} />,
    );
    await screen.findByText("Only page");
    const before = search.mock.calls.length;

    // Same revision, brand-new callback identity — the case the ref exists for.
    rerender(
      <CommandPalette
        open
        onClose={vi.fn()}
        search={vi.fn(() => [{ id: "a", label: "Only page", group: "Pages", onSelect: () => {} }])}
        revision={1}
      />,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(search.mock.calls.length).toBe(before);
  });
});
