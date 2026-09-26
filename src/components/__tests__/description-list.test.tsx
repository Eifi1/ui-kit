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

describe("DescriptionList 0.10.0", () => {
  it("layout=stacked is a borderless grid, term above detail, n columns wide", () => {
    const { container } = render(
      <DescriptionList layout="stacked" columns={3}>
        <DescriptionItem term="Lease number">L-104</DescriptionItem>
        <DescriptionItem term="Start">2024-04-01</DescriptionItem>
        <DescriptionItem term="Notes" span="full">
          Keys handed over
        </DescriptionItem>
        <DescriptionItem term="Rent" span={2} numeric>
          1’850.00
        </DescriptionItem>
      </DescriptionList>,
    );
    const dl = container.querySelector("dl")!;
    expect(dl.parentElement!.className).toContain("@container");
    expect(dl).toHaveAttribute("data-layout", "stacked");
    expect(dl.className).toContain("grid");
    expect(dl.className).toContain("@xl:grid-cols-3");
    expect(dl.className).not.toContain("@3xl:grid-cols-4");
    expect(dl.className).not.toContain("divide-y");
    const [first, , notes, rent] = Array.from(dl.children) as HTMLElement[];
    // Term first, detail under it; no card border.
    expect(first.firstElementChild!.tagName).toBe("DT");
    expect(first.className).not.toContain("border");
    expect(notes.className).toContain("col-span-full");
    expect(rent.className).toContain("@xs:col-span-2");
    // A stacked figure keeps the term's start edge.
    expect(rent.querySelector("dd")!.className).toContain("tabular-nums");
    expect(rent.querySelector("dd")!.className).not.toContain("text-end");
  });

  it("clamps a stacked span to the list's columns", () => {
    const { container } = render(
      <DescriptionList layout="stacked" columns={2}>
        <DescriptionItem term="Notes" span={4}>
          Long
        </DescriptionItem>
      </DescriptionList>,
    );
    const item = container.querySelector("dl > div")!;
    expect(item.className).toContain("@xs:col-span-2");
    expect(item.className).not.toContain("col-span-3");
  });

  it("density=tight is 11px on a 2px rhythm without rules", () => {
    const { container } = render(
      <DescriptionList density="tight" numeric>
        <DescriptionItem term="Signed up">12</DescriptionItem>
        <DescriptionItem term="Verified">9</DescriptionItem>
      </DescriptionList>,
    );
    const dl = container.querySelector("dl")!;
    expect(dl.className).toContain("text-[11px]");
    expect(dl.className).not.toContain("divide-y");
    expect(dl.firstElementChild!.className).toContain("py-px");
  });

  it("columns caps a card grid without knowing the gap", () => {
    const { container } = render(
      <DescriptionList layout="cards" density="compact" columns={2} minCardWidth="0px">
        <DescriptionItem term="Activity">-40.00</DescriptionItem>
        <DescriptionItem term="Available">60.00</DescriptionItem>
      </DescriptionList>,
    );
    const style = container.querySelector("dl")!.getAttribute("style")!;
    expect(style).toContain("max(0px, (100% - 1 * 0.5rem) / 2)");
    // Without `columns` the template is exactly what it was.
    const { container: plain } = render(
      <DescriptionList layout="cards">
        <DescriptionItem term="a">b</DescriptionItem>
      </DescriptionList>,
    );
    expect(plain.querySelector("dl")!.style.gridTemplateColumns).toBe(
      "repeat(auto-fill, minmax(min(100%, 10rem), 1fr))",
    );
  });

  it("prose lightens card details; values keep their weight", () => {
    const { container } = render(
      <DescriptionList layout="cards">
        <DescriptionItem term="Opened">2024-01-03</DescriptionItem>
        <DescriptionItem term="Stream" prose>
          The bench reads the stream at 1 kHz and averages it.
        </DescriptionItem>
      </DescriptionList>,
    );
    const [value, prose] = Array.from(container.querySelectorAll("dd"));
    expect(value.className).toContain("font-medium");
    expect(value.className).toContain("text-[var(--text-primary)]");
    expect(prose.className).toContain("font-normal");
    expect(prose.className).not.toContain("font-medium");
    expect(prose.className).toContain("text-[var(--text-secondary)]");

    const { container: list } = render(
      <DescriptionList layout="cards" prose>
        <DescriptionItem term="a">Words</DescriptionItem>
        <DescriptionItem term="b" prose={false}>
          42
        </DescriptionItem>
      </DescriptionList>,
    );
    const [p, v] = Array.from(list.querySelectorAll("dd"));
    expect(p.className).toContain("font-normal");
    expect(v.className).toContain("font-medium");
  });
});
