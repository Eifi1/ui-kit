import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWIPE_TONE } from "../../../src/components/swipeable-row";
import { SWIPE_TONE_LOOKS } from "../sections/swipeable-row-demo";
import { ColourRoles033Demo } from "../sections/colour-roles-033-demo";
import { CheckoutReturn033Demo } from "../sections/billing-033-demo";
import { RowActions033Demo } from "../sections/text-size-033-demo";

/**
 * The 0.33 specimens' own wiring — what the page shards cannot see, since they only
 * mount each page and compare its headings with the search index: the swipe gallery
 * stays the kit's recipe, the guard specimen reports what it says it reports, the
 * checkout's way back goes from "processing" to landed, and the tour-anchor finder says
 * where `[data-tour]` lands inline and collapsed.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => vi.stubGlobal("ResizeObserver", ResizeObserverStub));
afterAll(() => vi.unstubAllGlobals());
afterEach(() => localStorage.clear());

describe("the swipe page's tone gallery", () => {
  it("is the kit's SWIPE_TONE, class for class", () => {
    expect(SWIPE_TONE_LOOKS).toEqual(SWIPE_TONE);
  });
});

describe("the colour roles page", () => {
  it("reports the pretend app's undeclared variables, and the palette one only with refusePalette", () => {
    render(<ColourRoles033Demo />);
    const list = screen.getByRole("list", { name: "undeclaredCssVariables(sources)" });
    const lines = () => within(list).getAllByRole("listitem").map((li) => li.textContent);
    // Kurvenschmiede's `--surface`, a bare `--app-nav-h`, and an `@theme inline` name that
    // Tailwind never emits — not the chart key, the runtime write, the comment, the
    // fallback or the listed Radix variable.
    expect(lines()).toEqual([
      "/src/features/control/control-basics.tsx:2 --surface",
      "/src/layout/sticky-bar.tsx:3 --app-nav-h",
      "/src/features/accounts/row.tsx:1 --text-color-muted",
    ]);
    fireEvent.click(screen.getByLabelText("refusePalette"));
    expect(lines()).toContain(
      "/src/features/sync/sync-status.tsx:1 --color-rose-500 (a Tailwind palette colour; refusePalette is on)",
    );
    // The guard refuses a vacuous run rather than passing it.
    expect(screen.getByText(/^throws: undeclaredCssVariables: only 3 source file\(s\)/)).toBeInTheDocument();
  });

  it("reads '—' for every measured ratio where there is no canvas to resolve a colour", () => {
    const { container } = render(<ColourRoles033Demo />);
    const ratios = [...container.querySelectorAll("[data-ratio]")].map((el) => el.textContent);
    expect(ratios.length).toBeGreaterThan(40);
    expect(new Set(ratios)).toEqual(new Set(["—"]));
  });
});

describe("the subscription page's way back from the checkout", () => {
  it("drops the marker, shows processing, and lands once the overview has moved", async () => {
    render(<CheckoutReturn033Demo />);
    fireEvent.click(screen.getByRole("button", { name: "Buy Gardener — and come back" }));
    expect(await screen.findByText(/Your payment is being processed/)).toBeInTheDocument();
    // `?checkout=done` was consumed and replaced away.
    expect(screen.getByText("/settings/subscription")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "The provider's webhook lands" }));
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    await waitFor(() => expect(screen.queryByText(/Your payment is being processed/)).not.toBeInTheDocument());
    expect(screen.getByText(/onLanded\(\)/)).toBeInTheDocument();
  });
});

describe("the text-size page's row actions", () => {
  it("finds the tour anchor on the action's own button inline, and on the overlay in the ⋯ box collapsed", () => {
    render(<RowActions033Demo />);
    const find = screen.getByRole("button", { name: /^Find \[data-tour=/ });
    fireEvent.click(find);
    expect(screen.getByText(/anchor: 1 match · the action's own <button>/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "menu" }));
    fireEvent.click(find);
    expect(screen.getByText(/anchor: 1 match · an overlay <span aria-hidden>.*holds the button: true/)).toBeInTheDocument();
  });
});
