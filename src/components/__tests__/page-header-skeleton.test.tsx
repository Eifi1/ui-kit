import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../button";
import { PageHeader, type PageHeaderMobileLayout, type PageHeaderSize } from "../page-header";
import { PageHeaderSkeleton } from "../page-header-skeleton";

/**
 * 0.55: PageHeader's outline. keksdose drew it by hand for its page outline
 * (app/page-skeleton.tsx: `h-7 w-40` for its `compact` title, `h-9 w-48` for the
 * actions); the heights are the header's to know. jsdom lays nothing out, so what is
 * pinned is that the outline is built from the header's OWN class strings — the rows,
 * the gaps, the title's type — and each line is its type's line box.
 */
const part = (c: HTMLElement, name: string) => c.querySelectorAll(`[data-skeleton-part="${name}"]`);

describe("PageHeaderSkeleton (0.55)", () => {
  it("announces nothing by default, and every placeholder is hidden", () => {
    const { container } = render(<PageHeaderSkeleton />);
    expect(screen.queryByRole("status")).toBeNull();
    for (const el of container.querySelectorAll("[data-skeleton]")) {
      expect(el.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it("is one status region with its label when given one", () => {
    render(<PageHeaderSkeleton label="Loading the page…" />);
    expect(screen.getByRole("status")).toHaveTextContent(/^Loading the page…$/);
  });

  it("draws the title, one action, and the optional lines asked for", () => {
    const { container, rerender } = render(<PageHeaderSkeleton />);
    expect(part(container, "title")).toHaveLength(1);
    expect(part(container, "action")).toHaveLength(1);
    expect(part(container, "breadcrumbs")).toHaveLength(0);
    expect(part(container, "eyebrow")).toHaveLength(0);
    expect(part(container, "description")).toHaveLength(0);

    rerender(<PageHeaderSkeleton actions={3} breadcrumbs eyebrow description />);
    expect(part(container, "action")).toHaveLength(3);
    expect(part(container, "breadcrumbs")).toHaveLength(1);
    expect(part(container, "eyebrow")).toHaveLength(1);
    expect(part(container, "description")).toHaveLength(1);

    rerender(<PageHeaderSkeleton actions={0} />);
    expect(part(container, "action")).toHaveLength(0);
  });

  it.each<[PageHeaderSize, PageHeaderMobileLayout]>([
    ["md", "stacked"],
    ["compact", "inline"],
    ["sm", "stacked"],
  ])("lays out as the header does: size %s, %s", (size, mobileLayout) => {
    const header = render(
      <PageHeader
        size={size}
        mobileLayout={mobileLayout}
        title="Invoices"
        description="All of them"
        eyebrow="Books"
        actions={<Button>New</Button>}
      />,
    ).container;
    const outline = render(
      <PageHeaderSkeleton size={size} mobileLayout={mobileLayout} eyebrow description />,
    ).container;

    const heading = header.querySelector("h1")!;
    const headerRoot = header.firstElementChild!;
    const headerRow = headerRoot.lastElementChild!;
    const outlineRoot = outline.querySelector('[aria-hidden="true"]')!;
    const outlineRow = outlineRoot.lastElementChild!;

    expect(outlineRoot.className).toBe(headerRoot.className);
    expect(outlineRow.className).toBe(headerRow.className);
    // The actions' box, with the phone's full-width stack at Large for `stacked`.
    expect(outlineRow.lastElementChild!.className).toBe(headerRow.lastElementChild!.className);

    // Each line is its type's line box: the title's type and `1lh` of it.
    const title = part(outline, "title")[0];
    for (const cls of heading.className.split(" ").filter((c) => /^(sm:)?text-(lg|xl|2xl)$/.test(c))) {
      expect(title).toHaveClass(cls);
    }
    expect(title).toHaveClass("h-[1lh]");
    expect(part(outline, "description")[0]).toHaveClass("mt-1", "text-sm", "h-[1lh]");
    expect(part(outline, "eyebrow")[0]).toHaveClass("text-micro", "mb-1", "h-[1lh]");
  });

  it("outlines an action as a md Button's box, with the touch target from Large up", () => {
    const { container } = render(<PageHeaderSkeleton />);
    const action = part(container, "action")[0];
    // A text-sm line, py-2 and the outlined variants' 1px border (button-look.ts).
    expect(action).toHaveClass("text-sm", "h-[calc(1lh+1rem+2px)]", "large:min-h-[48px]");
    const button = render(<Button>New</Button>).getByRole("button");
    expect(button).toHaveClass("py-2", "text-sm", "border", "large:min-h-[48px]");
  });

  it("puts props and ref on its root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<PageHeaderSkeleton ref={ref} className="mb-4" data-testid="outline" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveClass("mb-4");
    expect(ref.current).toHaveAttribute("data-skeleton-preset", "page-header");
  });
});
