import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { PageContents, PageContentsLayout, useScrollSpy } from "../page-contents";
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
