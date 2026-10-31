import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { drainTasks } from "../../test/tasks";
import { GlobalSearch } from "../global-search";
import type { SearchEntry } from "../search-index";

/**
 * 0.52 code review, tour.tsx (its root-cause note): the palette loads on the first open
 * since 0.34 (MOD-1), and a fetch that failed — a tab left open across a deploy, a
 * local-first app offline — threw out of `React.lazy` on every render while the palette
 * was mounted. `GlobalSearch` sits in the top bar, above the route error boundaries in
 * these apps, so pressing ⌘K took the whole shell down: the white page 0.52 fixed for
 * tours. Now the search closes, the page stays, and the next open fetches again.
 *
 * In a file of its own: a module loads once per test file.
 */
const palette = vi.hoisted(() => ({ fail: true, loads: 0 }));
vi.mock("../command-palette", async (importOriginal) => {
  palette.loads += 1;
  if (palette.fail) throw new TypeError("Failed to fetch dynamically imported module: /assets/command-palette-9f8e.js");
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
afterEach(() => {
  vi.restoreAllMocks();
});

const ENTRIES: SearchEntry[] = [{ id: "budget", title: "Budget", group: "Pages", href: "/budget" }];

function TopBar() {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <GlobalSearch entries={ENTRIES} open={open} onOpenChange={setOpen} />
      <p>The page</p>
      <output data-testid="open">{String(open)}</output>
    </MemoryRouter>
  );
}

const isOpen = () => screen.getByTestId("open").textContent === "true";

const pressCtrlK = () =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }));
  });

describe("GlobalSearch — the palette's chunk fails to load", () => {
  it("closes the search and keeps the page; the next open fetches again", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TopBar />);

    pressCtrlK();
    await drainTasks();
    expect(screen.getByText("The page")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(isOpen()).toBe(false);
    expect(logged).toHaveBeenCalled();
    expect(palette.loads).toBe(1);

    // The next open fetches again, once: still offline, the search closes again.
    pressCtrlK();
    await drainTasks();
    expect(palette.loads).toBe(2);
    expect(isOpen()).toBe(false);

    // Back online, or the deploy's new chunk is there: the next open shows the palette.
    palette.fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("dialog", { name: "Search" })).toBeInTheDocument();
    expect(palette.loads).toBe(3);
    expect(screen.getByText("The page")).toBeInTheDocument();
  });
});
