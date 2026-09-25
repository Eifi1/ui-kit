import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CommandPalette, type CommandItem } from "../command-palette";

/**
 * What keksdose's transaction search needed before it could move onto the palette:
 * a query committed on ↵ rather than on every keystroke (it is the URL's `q`), a clear
 * "×" that drops that `q` (#423), `data-private` on rows that name payees and
 * accounts, and the phone's full-screen surface.
 */

const ITEMS: CommandItem[] = [
  { id: "a", label: "Accounts", group: "Pages", onSelect: () => {} },
  { id: "b", label: "Budgets", group: "Pages", onSelect: () => {} },
];
const search = (q: string) => ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
const field = () => screen.getByRole("combobox");

describe('CommandPalette searchOn="submit"', () => {
  it("edits a draft while typing and commits on Enter", async () => {
    const spy = vi.fn(search);
    const onQueryChange = vi.fn();
    render(<CommandPalette open onClose={vi.fn()} search={spy} searchOn="submit" onQueryChange={onQueryChange} />);
    await waitFor(() => expect(screen.getByRole("option", { name: "Accounts" })).toBeInTheDocument());

    fireEvent.change(field(), { target: { value: "bud" } });
    expect(field()).toHaveValue("bud");
    expect(onQueryChange).not.toHaveBeenCalled();
    // Results stay on the committed (empty) query.
    await new Promise((r) => setTimeout(r, 200));
    expect(spy).not.toHaveBeenCalledWith("bud");
    expect(screen.getByRole("option", { name: "Accounts" })).toBeInTheDocument();

    fireEvent.keyDown(field(), { key: "Enter" });
    expect(onQueryChange).toHaveBeenCalledWith("bud");
    await waitFor(() => expect(screen.queryByRole("option", { name: "Accounts" })).toBeNull());
    expect(screen.getByRole("option", { name: "Budgets" })).toBeInTheDocument();
  });

  it("chooses the highlighted row on Enter once nothing new is typed", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        open
        onClose={onClose}
        search={() => [{ id: "x", label: "Exact", group: "G", onSelect }]}
        searchOn="submit"
      />,
    );
    await waitFor(() => expect(screen.getByRole("option", { name: "Exact" })).toBeInTheDocument());
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("commits through the submit button, which only shows for an uncommitted draft", () => {
    const onQueryChange = vi.fn();
    render(<CommandPalette open onClose={vi.fn()} search={search} searchOn="submit" onQueryChange={onQueryChange} />);
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
    fireEvent.change(field(), { target: { value: "acc" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onQueryChange).toHaveBeenCalledWith("acc");
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
  });

  it("controlled: the draft follows an outside change of the committed query", () => {
    function Harness() {
      const [q, setQ] = useState("acc");
      return (
        <>
          <button type="button" onClick={() => setQ("bud")}>
            back
          </button>
          <CommandPalette open onClose={vi.fn()} search={search} query={q} onQueryChange={setQ} searchOn="submit" />
        </>
      );
    }
    render(<Harness />);
    expect(field()).toHaveValue("acc");
    fireEvent.change(field(), { target: { value: "accx" } });
    act(() => screen.getByRole("button", { name: "back", hidden: true }).click());
    expect(field()).toHaveValue("bud");
  });

  it("drops an uncommitted draft when it closes", () => {
    const props = { onClose: vi.fn(), search, searchOn: "submit" as const, query: "acc", onQueryChange: vi.fn() };
    const { rerender } = render(<CommandPalette open {...props} />);
    fireEvent.change(field(), { target: { value: "draft" } });
    rerender(<CommandPalette open={false} {...props} />);
    rerender(<CommandPalette open {...props} />);
    expect(field()).toHaveValue("acc");
  });
});

describe("CommandPalette clear", () => {
  it("shows only with text, and empties the query in input mode", () => {
    const onQueryChange = vi.fn();
    render(<CommandPalette open onClose={vi.fn()} search={search} onQueryChange={onQueryChange} />);
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    fireEvent.change(field(), { target: { value: "acc" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(field()).toHaveValue("");
    expect(onQueryChange).toHaveBeenLastCalledWith("");
    expect(field()).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("commits the empty query in submit mode", () => {
    const onQueryChange = vi.fn();
    render(
      <CommandPalette open onClose={vi.fn()} search={search} searchOn="submit" query="acc" onQueryChange={onQueryChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onQueryChange).toHaveBeenCalledWith("");
    expect(field()).toHaveValue("");
  });

  it("takes its name from the labels", () => {
    render(<CommandPalette open onClose={vi.fn()} search={search} query="x" labels={{ clear: "Suche leeren" }} />);
    expect(screen.getByRole("button", { name: "Suche leeren" })).toBeInTheDocument();
  });
});

describe("CommandPalette data-private", () => {
  const rows: CommandItem[] = [
    { id: "p", label: "ACME GmbH", hint: "12,50 €", group: "Payees", onSelect: () => {} },
    { id: "s", label: "Settings", group: "Pages", onSelect: () => {}, redact: false },
    { id: "r", label: "Secret", group: "Pages", onSelect: () => {}, redact: true },
  ];

  it("is off by default, and a row can opt in", async () => {
    render(<CommandPalette open onClose={vi.fn()} search={() => rows} />);
    const secret = await screen.findByText("Secret");
    expect(secret).toHaveAttribute("data-private");
    expect(screen.getByText("ACME GmbH")).not.toHaveAttribute("data-private");
  });

  it("redactLabels marks label and hint, and a row can opt out", async () => {
    render(<CommandPalette open onClose={vi.fn()} search={() => rows} redactLabels />);
    expect(await screen.findByText("ACME GmbH")).toHaveAttribute("data-private");
    expect(screen.getByText("12,50 €")).toHaveAttribute("data-private");
    expect(screen.getByText("Settings")).not.toHaveAttribute("data-private");
  });
});

describe("CommandPalette on a phone", () => {
  let phone = true;
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: phone,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });
  afterEach(() => {
    phone = true;
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("fills the screen inside the safe areas, with a close button", () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} search={search} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-fullscreen");
    expect(dialog.className).toContain("h-full");
    expect(dialog.className).not.toContain("max-h-[70vh]");
    expect(dialog.style.paddingTop).toContain("safe-area-inset-top");
    expect(dialog.style.paddingBottom).toContain("safe-area-inset-bottom");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays a card with fullScreenOnPhone={false}", () => {
    render(<CommandPalette open onClose={vi.fn()} search={search} fullScreenOnPhone={false} />);
    expect(screen.getByRole("dialog")).not.toHaveAttribute("data-fullscreen");
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("stays a card above the breakpoint", () => {
    phone = false;
    render(<CommandPalette open onClose={vi.fn()} search={search} />);
    expect(screen.getByRole("dialog")).not.toHaveAttribute("data-fullscreen");
    expect(screen.getByRole("dialog").className).toContain("max-h-[70vh]");
  });
});
