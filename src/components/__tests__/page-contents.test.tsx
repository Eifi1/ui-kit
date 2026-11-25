import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { PAGE_CONTENTS_BAR_TARGET, PageContents, PageContentsLayout, useScrollSpy } from "../page-contents";
import type { ReactElement } from "react";
import { UiKitProvider } from "../../i18n/kit-labels";

const ITEMS = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three", level: 2 as const },
];

describe("PageContents", () => {
  it("is a named landmark whose entries link to their headings", () => {
    render(<PageContents items={ITEMS} />);
    const nav = screen.getByRole("navigation", { name: "On this page" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Two" })).toHaveAttribute("href", "#two");
  });

  it("builds hrefs through hrefFor, for routers where #id is a route", () => {
    render(<PageContents items={ITEMS} hrefFor={(id) => `#/page#${id}`} />);
    expect(screen.getByRole("link", { name: "One" })).toHaveAttribute("href", "#/page#one");
  });

  it("marks the current entry for a screen reader, and only that one", () => {
    render(<PageContents items={ITEMS} activeId="two" />);
    expect(screen.getByRole("link", { name: "Two" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: "One" })).not.toHaveAttribute("aria-current");
  });

  it("keeps a clicked entry current until the reader scrolls themselves", () => {
    render(<PageContents items={ITEMS} activeId="one" />);
    fireEvent.click(screen.getByRole("link", { name: "Three" }));
    expect(screen.getByRole("link", { name: "Three" })).toHaveAttribute("aria-current", "location");
    act(() => {
      window.dispatchEvent(new WheelEvent("wheel"));
    });
    expect(screen.getByRole("link", { name: "One" })).toHaveAttribute("aria-current", "location");
  });

  it("indents a level-2 entry", () => {
    render(<PageContents items={ITEMS} />);
    expect(screen.getByRole("link", { name: "Three" }).className).toContain("ps-6");
  });

  it("takes its title from the provider, and a prop over it", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ pageContents: { title: "Auf dieser Seite" } }}>
        <PageContents items={ITEMS} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Auf dieser Seite" })).toBeInTheDocument();
    rerender(
      <UiKitProvider labels={{ pageContents: { title: "Auf dieser Seite" } }}>
        <PageContents items={ITEMS} labels={{ title: "Inhalt" }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Inhalt" })).toBeInTheDocument();
  });

  it("the disclosure variant folds the list under a summary", () => {
    const { container } = render(<PageContents items={ITEMS} variant="disclosure" />);
    expect(container.querySelector("details summary")).toHaveTextContent("On this page");
  });

  it("renders nothing for no entries", () => {
    const { container } = render(<PageContents items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PageContents variant="bar" (0.66, Staunlabor)', () => {
  // The headings the bar jumps to, in the document the way a page has them.
  function page(ui: ReactElement) {
    const result = render(
      <>
        {ui}
        <h2 id="one">One</h2>
        <h2 id="two">Two</h2>
        <h2 id="three">Three</h2>
      </>,
    );
    const scrolls: Array<{ id: string; options: unknown }> = [];
    for (const id of ["one", "two", "three"]) {
      const el = document.getElementById(id)!;
      el.scrollIntoView = (options?: unknown) => scrolls.push({ id, options });
    }
    return { ...result, scrolls };
  }
  const reduced = (on: boolean) => {
    window.matchMedia = ((query: string) => ({
      matches: on && query.includes("reduce"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  };
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("is a named landmark with one row of entries, sticky, and no visible title", () => {
    render(<PageContents items={ITEMS} variant="bar" activeId="two" />);
    const nav = screen.getByRole("navigation", { name: "On this page" });
    expect(nav.className).toMatch(/\bsticky\b/);
    expect(nav.className).toContain("print:hidden");
    expect(nav).not.toHaveTextContent("On this page");
    expect(nav.querySelector("ul")!.className).toContain("overflow-x-auto");
    expect(screen.getByRole("link", { name: "Two" })).toHaveAttribute("aria-current", "location");
    // One row: a level-2 entry is not indented.
    expect(screen.getByRole("link", { name: "Three" }).className).not.toContain("ps-6");
  });

  it("an app's className sets where it sticks (top-14 under a TopBar)", () => {
    render(<PageContents items={ITEMS} variant="bar" className="top-14" />);
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("top-14");
    expect(nav.className).not.toMatch(/\btop-0\b/);
  });

  it("a click scrolls to the heading and focuses it, without a history entry", () => {
    reduced(false);
    const { scrolls } = page(<PageContents items={ITEMS} variant="bar" />);
    const link = screen.getByRole("link", { name: "Two" });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(scrolls).toEqual([{ id: "two", options: { behavior: "smooth", block: "start" } }]);
    const heading = document.getElementById("two")!;
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(heading);
    // The href stays, for a new tab and for copying.
    expect(link).toHaveAttribute("href", "#two");
  });

  it("moves at once for a reader who asked for less motion", () => {
    reduced(true);
    const { scrolls } = page(<PageContents items={ITEMS} variant="bar" />);
    fireEvent.click(screen.getByRole("link", { name: "Three" }));
    expect(scrolls).toEqual([{ id: "three", options: { behavior: "auto", block: "start" } }]);
  });

  it("leaves a modified click to the browser (new tab, new window)", () => {
    const { scrolls } = page(<PageContents items={ITEMS} variant="bar" />);
    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }]) {
      const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...mod });
      screen.getByRole("link", { name: "Two" }).dispatchEvent(click);
      expect(click.defaultPrevented).toBe(false);
    }
    expect(scrolls).toEqual([]);
  });

  it("leaves the jump to an app that took the click in onClickCapture", () => {
    const { scrolls } = page(<PageContents items={ITEMS} variant="bar" onClickCapture={(e) => e.preventDefault()} />);
    fireEvent.click(screen.getByRole("link", { name: "Two" }));
    expect(scrolls).toEqual([]);
  });

  it("brings the current entry into the middle of a row wider than the screen", () => {
    const { rerender } = render(<PageContents items={ITEMS} variant="bar" activeId="one" />);
    const row = screen.getByRole("navigation").querySelector("ul")!;
    const calls: unknown[] = [];
    Object.defineProperty(row, "scrollWidth", { configurable: true, value: 600 });
    Object.defineProperty(row, "clientWidth", { configurable: true, value: 300 });
    row.scrollTo = ((options: unknown) => calls.push(options)) as typeof row.scrollTo;
    const entry = row.querySelector<HTMLElement>('[data-entry="three"]')!;
    Object.defineProperty(entry, "offsetLeft", { configurable: true, value: 400 });
    Object.defineProperty(entry, "offsetWidth", { configurable: true, value: 100 });
    rerender(<PageContents items={ITEMS} variant="bar" activeId="three" />);
    expect(calls).toEqual([expect.objectContaining({ left: 300 })]);
  });

  it("exports the scroll margin a target carries under a TopBar and the bar", () => {
    expect(PAGE_CONTENTS_BAR_TARGET).toBe("scroll-mt-32");
  });
});

describe("PageContentsLayout", () => {
  it("puts the rail before the page in DOM order at start, after it at end", () => {
    const layout = (position: "start" | "end") =>
      render(
        <PageContentsLayout position={position} contents={<span>rail</span>}>
          <p>page</p>
        </PageContentsLayout>,
      );
    const start = layout("start");
    const [a, b] = [start.getByText("rail"), start.getByText("page")];
    expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    start.unmount();
    const end = layout("end");
    const [c, d] = [end.getByText("rail"), end.getByText("page")];
    expect(d.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("useScrollSpy", () => {
  function heading(id: string, top: number) {
    const el = document.createElement("h3");
    el.id = id;
    el.getBoundingClientRect = () => ({ top }) as DOMRect;
    document.body.appendChild(el);
    return el;
  }
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("answers the last heading above the reading line", () => {
    // jsdom's window is 768 tall: the line sits at 15% ≈ 115px.
    heading("a", -300);
    heading("b", 40);
    heading("c", 500);
    const { result } = renderHook(() => useScrollSpy(["a", "b", "c"]));
    expect(result.current).toBe("b");
  });

  it("answers the first before any heading has reached the line", () => {
    heading("a", 400);
    heading("b", 900);
    const { result } = renderHook(() => useScrollSpy(["a", "b"]));
    expect(result.current).toBe("a");
  });
});

describe("the rail wraps long entries instead of a native title (keksdose dev#523)", () => {
  it("puts no title attribute on its links", () => {
    render(<PageContents items={ITEMS} />);
    for (const link of screen.getAllByRole("link")) expect(link).not.toHaveAttribute("title");
  });
});
