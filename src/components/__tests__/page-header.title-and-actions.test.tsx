import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageHeader } from "../page-header";

const group = (name: string) => screen.getByRole("button", { name }).parentElement!;

describe("PageHeader truncateTitle (keksdose G6a)", () => {
  it("breaks words by default", () => {
    render(<PageHeader title="Payees" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveClass("break-words");
    expect(h1).not.toHaveClass("truncate");
  });

  it("cuts to one line inside a title block that may shrink, with the full text in the heading", () => {
    const long = "Payees with a name far too long for a phone-width header row";
    render(
      <PageHeader title={long} truncateTitle mobileLayout="inline" actions={<button type="button">Add</button>} />,
    );
    const h1 = screen.getByRole("heading", { level: 1, name: long });
    // At Normal; from Large up it wraps (text size §10.17, round 0.34 T1).
    expect(h1).toHaveClass("truncate-until-large");
    expect(h1).not.toHaveClass("break-words");
    expect(h1).not.toHaveAttribute("title");
    expect(h1.parentElement!).toHaveClass("min-w-0", "flex-1");
  });
});

describe("PageHeader secondaryActions (keksdose G6b)", () => {
  const header = (mobileLayout?: "stacked" | "inline") =>
    render(
      <PageHeader
        title="Budget"
        mobileLayout={mobileLayout}
        actions={<button type="button">Next month</button>}
        secondaryActions={<button type="button">Collapse all</button>}
      />,
    );

  it("keeps DOM order title, actions, secondary — the phone's visual order", () => {
    header("inline");
    const [heading, primary, secondary] = [
      screen.getByRole("heading"),
      screen.getByRole("button", { name: "Next month" }),
      screen.getByRole("button", { name: "Collapse all" }),
    ];
    expect(heading.compareDocumentPosition(primary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(primary.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("inline: wraps the secondary group to its own full-width row on a phone, joins the row from sm", () => {
    header("inline");
    // Without truncateTitle the inline row wraps at every width (keksdose H1).
    const row = group("Next month").parentElement!;
    expect(row).toHaveClass("flex-wrap");
    expect(group("Collapse all")).toHaveClass("basis-full", "sm:basis-auto", "sm:order-1");
    expect(group("Next month")).toHaveClass("sm:order-2");
  });

  it("stacked: a column already, so no wrap and no basis — only the sm order swap", () => {
    header();
    expect(group("Next month").parentElement!).not.toHaveClass("flex-wrap");
    expect(group("Collapse all")).not.toHaveClass("basis-full");
    expect(group("Collapse all")).toHaveClass("sm:order-1");
  });

  it("leaves the order untouched without one", () => {
    render(<PageHeader title="Budget" mobileLayout="inline" actions={<button type="button">Next month</button>} />);
    expect(group("Next month")).not.toHaveClass("sm:order-2");
  });
});

describe("PageHeader actionsAlign (keksdose G8)", () => {
  it("adds no alignment by default", () => {
    render(<PageHeader title="Reports" actions={<button type="button">EUR</button>} />);
    expect(group("EUR").parentElement!).toHaveClass("sm:items-start");
    expect([...group("EUR").classList].some((c) => c.includes("self-"))).toBe(false);
  });

  it("stacked: aligns the ROW from sm up, so title and actions centre on each other (keksdose H2)", () => {
    render(<PageHeader title="Reports" actionsAlign="center" actions={<button type="button">EUR</button>} />);
    const row = group("EUR").parentElement!;
    expect(row).toHaveClass("sm:items-center");
    expect(row).not.toHaveClass("sm:items-start");
    expect(row).not.toHaveClass("items-center");
  });

  it("inline: aligns the row at every width, the secondary group with it", () => {
    render(
      <PageHeader
        title="Reports"
        mobileLayout="inline"
        actionsAlign="end"
        actions={<button type="button">EUR</button>}
        secondaryActions={<button type="button">Export</button>}
      />,
    );
    const row = group("EUR").parentElement!;
    expect(row).toHaveClass("items-end");
    expect(row).not.toHaveClass("items-center");
    expect(group("Export").parentElement).toBe(group("EUR").parentElement);
  });
});

describe("PageHeader inline keeps whole words in the title (keksdose H1)", () => {
  it("never shrinks the title below its longest word, and wraps the actions instead", () => {
    render(
      <PageHeader
        title="Monatsbudget"
        size="compact"
        mobileLayout="inline"
        actions={<button type="button">Next month</button>}
        secondaryActions={<button type="button">Collapse all</button>}
      />,
    );
    const block = screen.getByRole("heading", { level: 1 }).parentElement!;
    expect(block).toHaveClass("min-w-min");
    expect(block).not.toHaveClass("min-w-0");
    const row = group("Next month").parentElement!;
    expect(row).toHaveClass("flex-wrap");
    expect(row).not.toHaveClass("sm:flex-nowrap");
  });

  it("truncateTitle keeps the shrinking block — that is the point of truncating", () => {
    render(<PageHeader title="Payees" truncateTitle mobileLayout="inline" actions={<button type="button">Add</button>} />);
    expect(screen.getByRole("heading", { level: 1 }).parentElement!).toHaveClass("min-w-0");
    expect(group("Add").parentElement!).not.toHaveClass("flex-wrap");
  });
});

describe("PageHeader secondaryActions share the actions' wrapped row (keksdose, after H1)", () => {
  type Callback = () => void;
  let callbacks: Callback[] = [];
  const rects = new Map<Element, { top: number; bottom: number; height: number }>();

  beforeEach(() => {
    callbacks = [];
    rects.clear();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: Callback) {
          callbacks.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const r = rects.get(this) ?? { top: 0, bottom: 0, height: 0 };
      return { ...r, left: 0, right: 0, width: 0, x: 0, y: r.top, toJSON: () => ({}) } as DOMRect;
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const budget = () =>
    render(
      <PageHeader
        title="Monatsbudget"
        size="compact"
        mobileLayout="inline"
        actions={<button type="button">Next month</button>}
        secondaryActions={<button type="button">Collapse all</button>}
      />,
    );
  const layout = (actionsTop: number) => {
    const title = screen.getByRole("heading", { level: 1 }).parentElement!;
    rects.set(title, { top: 0, bottom: 28, height: 28 });
    rects.set(group("Next month"), { top: actionsTop, bottom: actionsTop + 32, height: 32 });
    act(() => callbacks.forEach((cb) => cb()));
  };

  it("drops the full-width basis once the actions sit below the title", () => {
    budget();
    layout(36);
    expect(group("Collapse all")).not.toHaveClass("basis-full");
    expect(group("Collapse all")).toHaveClass("sm:basis-auto");
  });

  it("keeps its own row while the actions share the title's row", () => {
    budget();
    layout(0);
    expect(group("Collapse all")).toHaveClass("basis-full");
  });

  it("keeps the 0.14.0 layout without layout (jsdom)", () => {
    budget();
    act(() => callbacks.forEach((cb) => cb()));
    expect(group("Collapse all")).toHaveClass("basis-full");
  });
});
