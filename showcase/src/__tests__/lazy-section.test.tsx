import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { lazySection, preloadSections } from "../lib/lazy-section";

function Greeting({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}

describe("lazySection", () => {
  it("suspends on first render, forwards props, and renders synchronously once loaded", async () => {
    const load = vi.fn(() => Promise.resolve({ Greeting }));
    const Lazy = lazySection(load, "Greeting");

    const first = render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy name="Ada" />
      </Suspense>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("Hello Ada")).toBeInTheDocument();
    first.unmount();

    // Loaded: no fallback, not even for one frame — a page opened twice does not flash.
    render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy name="Grace" />
      </Suspense>,
    );
    expect(screen.getByText("Hello Grace")).toBeInTheDocument();
    expect(screen.queryByText("loading")).not.toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("preload() makes the very first render synchronous", async () => {
    const Lazy = lazySection(() => Promise.resolve({ Greeting }), "Greeting");
    await Lazy.preload();
    render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy name="Linus" />
      </Suspense>,
    );
    expect(screen.getByText("Hello Linus")).toBeInTheDocument();
  });

  it("retries a load that failed", async () => {
    const load = vi
      .fn<() => Promise<{ Greeting: typeof Greeting }>>()
      .mockRejectedValueOnce(new Error("chunk gone"))
      .mockResolvedValueOnce({ Greeting });
    const Lazy = lazySection(load, "Greeting");
    await expect(Lazy.preload()).rejects.toThrow("chunk gone");
    await Lazy.preload();
    expect(load).toHaveBeenCalledTimes(2);
  });

  // TST-8: a page shard loads the sections of its own pages, not all of them.
  it("preloadSections() loads the named sections and leaves the others alone", async () => {
    const wanted = vi.fn(() => Promise.resolve({ Wanted: Greeting }));
    const other = vi.fn(() => Promise.resolve({ Other: Greeting }));
    lazySection(wanted, "Wanted");
    lazySection(other, "Other");
    await preloadSections(["Wanted", "Wanted"]);
    expect(wanted).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
  });

  it("preloadSections() rejects a name nothing registered, so a stale index fails setup", async () => {
    await expect(preloadSections(["NoSuchSection"])).rejects.toThrow(/NoSuchSection/);
  });
});
