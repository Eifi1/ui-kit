import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { CommandPalette, type CommandItem } from "../command-palette";

/**
 * Modal plumbing and ARIA structure of the palette: per-instance ids, the failed-search
 * state, the focus trap / restore / scroll lock every other modal in the kit has,
 * Escape from anywhere inside, and listbox grouping.
 */
const ITEMS: CommandItem[] = [
  { id: "a", label: "Accounts", group: "Pages", onSelect: () => {} },
  { id: "b", label: "Budget", group: "Pages", onSelect: () => {} },
  { id: "c", label: "New transaction", group: "Actions", onSelect: () => {} },
];

const PROTO = Element.prototype as unknown as { scrollIntoView?: () => void };
const JSDOM_HAS_IT = "scrollIntoView" in Element.prototype;
beforeAll(() => {
  if (!JSDOM_HAS_IT) PROTO.scrollIntoView = () => {};
});
afterAll(() => {
  if (!JSDOM_HAS_IT) delete PROTO.scrollIntoView;
});

function Harness({ search = () => ITEMS }: { search?: (q: string) => CommandItem[] | Promise<CommandItem[]> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open palette
      </button>
      <CommandPalette open={open} onClose={() => setOpen(false)} search={search} />
    </>
  );
}

async function openIt() {
  const opener = screen.getByRole("button", { name: "Open palette" });
  act(() => opener.focus());
  fireEvent.click(opener);
  const field = await screen.findByRole("combobox");
  await waitFor(() => expect(field).toHaveFocus());
  return { opener, field };
}

describe("CommandPalette ids", () => {
  it("gives two palettes on one page their own list and option ids", async () => {
    render(
      <>
        <CommandPalette open onClose={() => {}} search={() => ITEMS} />
        <CommandPalette open onClose={() => {}} search={() => ITEMS} />
      </>,
    );
    await screen.findAllByText("Accounts");
    const [a, b] = screen.getAllByRole("combobox");
    const listA = a.getAttribute("aria-controls")!;
    const listB = b.getAttribute("aria-controls")!;
    expect(listA).not.toBe(listB);
    expect(document.getElementById(listA)).toHaveAttribute("role", "listbox");
    // Each field's active descendant resolves inside ITS OWN list.
    expect(document.getElementById(listA)).toContainElement(
      document.getElementById(a.getAttribute("aria-activedescendant")!),
    );
    expect(document.getElementById(listB)).toContainElement(
      document.getElementById(b.getAttribute("aria-activedescendant")!),
    );
    expect(a.getAttribute("aria-activedescendant")).not.toBe(b.getAttribute("aria-activedescendant"));
  });
});

describe("CommandPalette failed search", () => {
  it("clears the stale results and shows the error label when the provider rejects", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const search = vi.fn((q: string) => (q ? Promise.reject(new Error("offline")) : Promise.resolve(ITEMS)));
    render(<Harness search={search} />);
    const { field } = await openIt();
    await screen.findByText("Accounts");

    fireEvent.change(field, { target: { value: "acc" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Search failed. Try again.");
    expect(screen.queryByText("Accounts")).not.toBeInTheDocument();
    expect(screen.queryByText("No results")).not.toBeInTheDocument();
    expect(field).not.toHaveAttribute("aria-activedescendant");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("recovers on the next successful search", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const search = vi.fn((q: string) => (q === "x" ? Promise.reject(new Error("offline")) : Promise.resolve(ITEMS)));
    render(<Harness search={search} />);
    const { field } = await openIt();
    fireEvent.change(field, { target: { value: "x" } });
    await screen.findByRole("alert");
    fireEvent.change(field, { target: { value: "xy" } });
    await screen.findByText("Accounts");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    error.mockRestore();
  });

  it("takes a translated error label", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <CommandPalette
        open
        onClose={() => {}}
        search={() => {
          throw new Error("sync throw");
        }}
        labels={{ error: "Suche fehlgeschlagen" }}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Suche fehlgeschlagen");
    error.mockRestore();
  });
});

describe("CommandPalette as a modal", () => {
  it("returns focus to the opener on close", async () => {
    render(<Harness />);
    const { opener } = await openIt();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("keeps Tab inside the dialog", async () => {
    render(<Harness />);
    await openIt();
    await screen.findByText("Accounts");
    const options = screen.getAllByRole("option");
    const last = options[options.length - 1];
    act(() => last.focus());
    fireEvent.keyDown(last, { key: "Tab" });
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("locks body scroll while open and releases it on close", async () => {
    render(<Harness />);
    await openIt();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on Escape when focus is on a row rather than the field", async () => {
    render(<Harness />);
    await openIt();
    await screen.findByText("Accounts");
    const row = screen.getAllByRole("option")[1];
    act(() => row.focus());
    fireEvent.keyDown(row, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("CommandPalette structure", () => {
  it("groups options under a labelled role=group inside the listbox", async () => {
    render(<CommandPalette open onClose={() => {}} search={() => ITEMS} />);
    await screen.findByText("Accounts");
    const listbox = screen.getByRole("listbox");
    const groups = within(listbox).getAllByRole("group");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAccessibleName("Pages");
    expect(groups[1]).toHaveAccessibleName("Actions");
    expect(within(groups[0]).getAllByRole("option").map((o) => o.textContent)).toEqual(["Accounts", "Budget"]);
    // No list/listitem semantics left between the listbox and its options.
    expect(within(listbox).queryAllByRole("listitem")).toHaveLength(0);
    expect(within(listbox).queryAllByRole("list")).toHaveLength(0);
  });

  it("aligns option text to the reading start, not the physical left", async () => {
    render(<CommandPalette open onClose={() => {}} search={() => ITEMS} />);
    await screen.findByText("Accounts");
    const option = screen.getAllByRole("option")[0];
    expect(option.className).toContain("text-start");
    expect(option.className).not.toContain("text-left");
  });
});
