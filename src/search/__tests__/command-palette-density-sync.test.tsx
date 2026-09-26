import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CommandPalette, type CommandItem } from "../command-palette";

/**
 * keksdose's 0.9 audit of `CommandPalette`: taller rows for touch (`density`), and no
 * "Searching…" flash in front of a synchronous provider (its transaction search filters
 * a list it already holds).
 */

const PROTO = Element.prototype as unknown as { scrollIntoView?: () => void };
const JSDOM_HAS_IT = "scrollIntoView" in Element.prototype;
beforeAll(() => {
  if (!JSDOM_HAS_IT) PROTO.scrollIntoView = () => {};
});
afterAll(() => {
  if (!JSDOM_HAS_IT) delete PROTO.scrollIntoView;
});
afterEach(() => {
  vi.useRealTimers();
});

const ITEMS: CommandItem[] = [
  { id: "a", label: "Alpha", group: "Pages", onSelect: () => {} },
  { id: "s", label: "Loading more…", group: "Pages", kind: "status", onSelect: () => {} },
];

describe("CommandPalette density", () => {
  it("draws compact rows by default", async () => {
    render(<CommandPalette open onClose={() => {}} search={() => ITEMS} />);
    const option = await screen.findByRole("option", { name: "Alpha" });
    expect(option.className).toContain("py-2");
    expect(option.className).toContain("text-sm");
    expect(option.className).not.toContain("min-h-11");
  });

  it('gives every row, status lines included, a 44px touch target with `density="comfortable"`', async () => {
    render(<CommandPalette open onClose={() => {}} search={() => ITEMS} density="comfortable" />);
    const option = await screen.findByRole("option", { name: "Alpha" });
    expect(option.className).toContain("min-h-11");
    expect(option.className).toContain("text-base");
    expect(screen.getByText("Loading more…").closest("li")!.className).toContain("min-h-11");
  });
});

describe("CommandPalette loading hint", () => {
  const typeInto = (text: string) => fireEvent.change(screen.getByRole("combobox"), { target: { value: text } });

  it("never shows it for a synchronous provider — not on open, not through the debounce", async () => {
    vi.useFakeTimers();
    const search = vi.fn(() => ITEMS);
    render(<CommandPalette open onClose={() => {}} search={search} />);
    expect(screen.queryByText("Searching…")).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
    typeInto("al");
    expect(screen.queryByText("Searching…")).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(80));
    expect(screen.queryByText("Searching…")).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(100));
    expect(search).toHaveBeenLastCalledWith("al");
    expect(screen.queryByText("Searching…")).toBeNull();
  });

  it("shows it for an async provider while the answer is out, and through later debounces", async () => {
    vi.useFakeTimers();
    let resolve: (items: CommandItem[]) => void = () => {};
    const search = vi.fn(
      () =>
        new Promise<CommandItem[]>((r) => {
          resolve = r;
        }),
    );
    render(<CommandPalette open onClose={() => {}} search={search} />);
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    await act(async () => resolve(ITEMS));
    expect(screen.queryByText("Searching…")).toBeNull();
    // Known to be async now: the hint is up from the keystroke, before it is even asked.
    typeInto("al");
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(150));
    await act(async () => resolve(ITEMS));
    expect(screen.queryByText("Searching…")).toBeNull();
  });

  it("goes by what each call returns, so a provider that turns sync drops the hint", async () => {
    vi.useFakeTimers();
    let async = true;
    const search = vi.fn((): CommandItem[] | Promise<CommandItem[]> => (async ? Promise.resolve(ITEMS) : ITEMS));
    render(<CommandPalette open onClose={() => {}} search={search} />);
    await act(async () => vi.advanceTimersByTimeAsync(0));
    async = false;
    typeInto("a");
    await act(async () => vi.advanceTimersByTimeAsync(150));
    expect(screen.queryByText("Searching…")).toBeNull();
    typeInto("al");
    expect(screen.queryByText("Searching…")).toBeNull();
  });
});
