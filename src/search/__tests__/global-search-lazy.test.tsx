import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { MemoryRouter } from "react-router";
import { GlobalSearch } from "../global-search";
import type { SearchEntry } from "../search-index";

/**
 * MOD-1 (refactor audit 2026-10): `GlobalSearch` sits in keksdose's and kastlan's top bar
 * on every page, and its palette (~5.5 kB gzip) is drawn only once somebody searches — so
 * the palette's module loads on the first open, and from then on the palette stays
 * mounted, as it always was.
 *
 * Stays mounted because a closed palette holds state the next open shows: the results of
 * the last search. With an owner-held query (keksdose binds it to the URL's `q`) a reopen
 * shows those at once; a palette mounted anew on each open would say "No results" for
 * the length of its debounce first.
 *
 * In a file of its own: a module loads once per test file.
 */
const loaded = vi.hoisted(() => ({ palette: 0 }));
vi.mock("../command-palette", async (importOriginal) => {
  loaded.palette += 1;
  return importOriginal();
});

const PROTO = Element.prototype as unknown as { scrollIntoView?: () => void };
const JSDOM_HAS_IT = "scrollIntoView" in Element.prototype;
beforeAll(() => {
  if (!JSDOM_HAS_IT) PROTO.scrollIntoView = () => {};
});
afterAll(() => {
  if (!JSDOM_HAS_IT) delete PROTO.scrollIntoView;
});

const ENTRIES: SearchEntry[] = [
  { id: "budget", title: "Budget", group: "Pages", href: "/budget" },
  { id: "accounts", title: "Accounts", group: "Pages", href: "/accounts" },
];

const toggle: { current: (open: boolean) => void } = { current: () => {} };

/** The owner keeps the query and the open state, as keksdose's top bar does. */
function Owner() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("budg");
  // A state setter is stable: handed out once.
  useEffect(() => {
    toggle.current = setOpen;
  }, []);
  return (
    <MemoryRouter>
      <GlobalSearch entries={ENTRIES} open={open} onOpenChange={setOpen} query={query} onQueryChange={setQuery} />
    </MemoryRouter>
  );
}

describe("GlobalSearch — loading the palette", () => {
  it("loads the palette on the first open, by the trigger or by ⌘K, and keeps it mounted after", async () => {
    render(<Owner />);
    // Let anything eager settle: a preload on mount would show up here.
    await act(async () => {});
    expect(loaded.palette).toBe(0);
    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    });
    expect(await screen.findByRole("option", { name: "Budget" }, { timeout: 5000 })).toBeInTheDocument();
    expect(loaded.palette).toBe(1);

    act(() => toggle.current(false));
    expect(screen.queryByRole("dialog")).toBeNull();
    // The trigger opens it again, and the last search's row is there in the same render —
    // not after the palette's 150 ms debounce, as it would be from a fresh mount.
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("option", { name: "Budget" })).toBeInTheDocument();
    expect(screen.queryByText("No results")).toBeNull();
    expect(loaded.palette).toBe(1);
  });
});
