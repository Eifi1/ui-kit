import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DescriptionItem, DescriptionList } from "../description-list";

describe("DescriptionList", () => {
  it("is a real <dl> of dt/dd pairs, conditional children included", () => {
    const iban: string | null = null;
    const { container } = render(
      <DescriptionList>
        <DescriptionItem term="Opened">2024-01-03</DescriptionItem>
        {iban && <DescriptionItem term="IBAN">{iban}</DescriptionItem>}
        <DescriptionItem term="Owner">Ada</DescriptionItem>
      </DescriptionList>,
    );
    const dl = container.querySelector("dl")!;
    expect(dl.querySelectorAll("dt")).toHaveLength(2);
    expect(dl.querySelectorAll("dd")).toHaveLength(2);
    // Each pair is a <div> directly in the <dl> — the one wrapper HTML allows there.
    for (const group of Array.from(dl.children)) {
      expect(group.tagName).toBe("DIV");
      expect(group.firstElementChild!.tagName).toBe("DT");
      expect(group.lastElementChild!.tagName).toBe("DD");
    }
    expect(screen.getAllByRole("term")).toHaveLength(2);
    expect(screen.getAllByRole("definition")).toHaveLength(2);
  });

  it("rows stack on a narrow container and go two-column from @sm", () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionItem term="Opened">today</DescriptionItem>
      </DescriptionList>,
    );
    expect(container.querySelector("dl")!.className).toMatch(/@container/);
    const row = container.querySelector("dl > div")!;
    expect(row.className).toMatch(/grid-cols-1/);
    expect(row.className).toMatch(/@sm:grid-cols-/);
  });

  it("numeric: tabular, end-aligned details, and the row never stacks", () => {
    const { container } = render(
      <DescriptionList numeric>
        <DescriptionItem term="Net">1,200.00</DescriptionItem>
        <DescriptionItem term="Note" numeric={false}>
          text
        </DescriptionItem>
      </DescriptionList>,
    );
    const [net, note] = Array.from(container.querySelectorAll("dd"));
    expect(net.className).toMatch(/tabular-nums/);
    expect(net.className).toMatch(/text-end/);
    expect(net.parentElement!.className).not.toMatch(/grid-cols-1/);
    expect(note.className).not.toMatch(/text-end/);
  });

  it("cards: a grid of bordered cards", () => {
    const { container } = render(
      <DescriptionList layout="cards" minCardWidth="8rem">
        <DescriptionItem term="Balance">12</DescriptionItem>
      </DescriptionList>,
    );
    const dl = container.querySelector("dl")!;
    expect(dl).toHaveAttribute("data-layout", "cards");
    expect(dl.style.gridTemplateColumns).toContain("8rem");
    expect(dl.querySelector("div")!.className).toMatch(/border/);
  });

  it("compact tightens the rhythm", () => {
    const { container } = render(
      <DescriptionList density="compact">
        <DescriptionItem term="A">1</DescriptionItem>
      </DescriptionList>,
    );
    expect(container.querySelector("dl")!.className).toMatch(/text-xs/);
    expect(container.querySelector("dl > div")!.className).toMatch(/py-1\.5/);
  });

  it("hint puts a named ? button beside the term", () => {
    render(
      <DescriptionList>
        <DescriptionItem term="APR" hint="Annual percentage rate">
          4.1%
        </DescriptionItem>
      </DescriptionList>,
    );
    const term = screen.getByRole("term");
    expect(within(term).getByRole("button", { name: "Annual percentage rate" })).toBeInTheDocument();
  });

  it("uses logical alignment only, so RTL needs no class change", () => {
    const { container } = render(
      <div dir="rtl">
        <DescriptionList numeric>
          <DescriptionItem term="Net">5</DescriptionItem>
        </DescriptionList>
      </div>,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/\b(text-left|text-right|ml-|mr-|pl-|pr-)/);
    expect(container.querySelector("dd")!.className).toMatch(/text-end/);
  });
});
