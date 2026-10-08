import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  FieldHint,
  IconButton,
  Select,
} from "../ui";
import { StatTile, StatTileGrid } from "../stat-tile";

/**
 * keksdose's 0.15.5 harmonisation sweep, the surfaces half: Card parts (P4), Card
 * `toneStrength` (P9), IconButton `pending` and its lazy label bubble (P6), Select's
 * FieldHint without a label line (P8), and StatTile `variant` / StatTileGrid
 * `stretch` / `loading` (P9).
 */

const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

describe("Card parts follow the card's padding (P4)", () => {
  function parts(card: Partial<Parameters<typeof Card>[0]>) {
    return render(
      <Card {...card}>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>,
    );
  }

  it("keeps the parts' own rhythm on a default card with no padding", () => {
    const { container } = parts({});
    expect(slot(container, "card-header").className).toContain("px-6");
    expect(slot(container, "card-header").className).toContain("pt-6");
    expect(slot(container, "card-content").className).toContain("px-6");
    expect(slot(container, "card-footer").className).toContain("pb-6");
  });

  it.each([
    [{ padding: "md" as const }],
    [{ padding: "sm" as const }],
    [{ variant: "inset" as const }],
    [{ variant: "outline" as const }],
  ])("drops it when the card carries its own (%o)", (card) => {
    const { container } = parts(card);
    for (const name of ["card-header", "card-content", "card-footer"]) {
      expect(slot(container, name).className).not.toMatch(/\bp[xtb]-6\b/);
    }
  });

  it("still lets a caller's class on a part win", () => {
    const { container } = render(
      <Card padding="md">
        <CardHeader className="pt-2">x</CardHeader>
      </Card>,
    );
    expect(slot(container, "card-header").className).toContain("pt-2");
  });
});

describe("CardTitle `as` (P4)", () => {
  it("is a div by default and a heading at the level asked for", () => {
    const { container, rerender } = render(<CardTitle>Security</CardTitle>);
    expect(slot(container, "card-title").tagName).toBe("DIV");
    rerender(<CardTitle as="h3">Security</CardTitle>);
    expect(screen.getByRole("heading", { level: 3, name: "Security" })).toHaveAttribute("data-slot", "card-title");
  });
});

describe("CardDescription colour (P4)", () => {
  it("uses the muted text token, not a money one", () => {
    const { container } = render(<CardDescription>Help</CardDescription>);
    const cls = slot(container, "card-description").className;
    expect(cls).toContain("text-[var(--text-muted)]");
    expect(cls).not.toContain("money");
  });
});

describe("CardHeader action column (P4)", () => {
  it("keeps the two-column switch at one class of specificity", () => {
    const { container } = render(
      <CardHeader>
        <CardTitle>T</CardTitle>
        <CardAction>A</CardAction>
      </CardHeader>,
    );
    const cls = slot(container, "card-header").className;
    // The `:has()` rule only sets a variable; the property is a one-class utility a
    // caller's `max-sm:grid-cols-1` can beat.
    expect(cls).toContain("has-data-[slot=card-action]:[--card-header-cols:1fr_auto]");
    expect(cls).toContain("grid-cols-[var(--card-header-cols,1fr)]");
    expect(cls).not.toContain("has-data-[slot=card-action]:grid-cols");
  });

  it("stacks the action under the title below sm with stackAction", () => {
    const { container } = render(
      <CardHeader stackAction>
        <CardTitle>T</CardTitle>
        <CardAction>A</CardAction>
      </CardHeader>,
    );
    const cls = slot(container, "card-header").className;
    expect(cls).toContain("max-sm:grid-cols-1");
    expect(cls).toContain("max-sm:[&>[data-slot=card-action]]:col-start-1");
  });
});

describe("Card toneStrength (P9)", () => {
  it("draws the strong 2px danger frame and keeps the content in place", () => {
    const { container } = render(
      <Card tone="danger" toneStrength="strong" padding="md">
        x
      </Card>,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-2");
    expect(card.className).toContain("border-[var(--danger-border-strong)]");
    expect(card.className).toContain("p-[calc(1rem-1px)]");
    expect(card.className).not.toMatch(/\bp-4\b/);
    expect(card).toHaveAttribute("data-tone-strength", "strong");
  });

  it("is the soft 1px frame by default and does nothing on inset", () => {
    const { container, rerender } = render(<Card tone="danger">x</Card>);
    let card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-[var(--danger-border)]");
    expect(card.className).not.toContain("border-2");
    rerender(
      <Card tone="danger" toneStrength="strong" variant="inset">
        x
      </Card>,
    );
    card = container.firstElementChild as HTMLElement;
    expect(card.className).not.toContain("border-2");
    expect(card).not.toHaveAttribute("data-tone-strength");
  });
});

describe("IconButton pending (P6)", () => {
  it("swaps the glyph for a spinner, is busy, keeps its name and swallows clicks", () => {
    const onClick = vi.fn();
    render(
      <form onSubmit={(e) => { e.preventDefault(); onClick("submit"); }}>
        <IconButton type="submit" label="Save" pending onClick={onClick}>
          <svg data-testid="glyph" />
        </IconButton>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(screen.queryByTestId("glyph")).toBeNull();
    expect(button.querySelector(".animate-spin")).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is the ordinary button when not pending", () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Save" onClick={onClick}>
        <svg data-testid="glyph" />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(screen.getByTestId("glyph")).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("IconButton label bubble is lazy (P6)", () => {
  it("is out of the DOM at rest and in it on hover, describing nothing either way", () => {
    render(
      <div data-testid="row">
        <IconButton label="Delete">
          <svg />
        </IconButton>
      </div>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(screen.queryAllByRole("tooltip", { hidden: true })).toHaveLength(0);
    expect(screen.getByTestId("row").textContent).toBe("");
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Delete");
    expect(button).not.toHaveAttribute("aria-describedby");
    expect(button).toHaveAccessibleName("Delete");
  });

  it("keeps the always-mounted bubble with tooltipLazy={false}", () => {
    render(
      <IconButton label="Delete" tooltipLazy={false}>
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Delete");
  });

  it("is lazy on the link form too", () => {
    render(
      <IconButton href="#x" label="Open">
        <svg />
      </IconButton>,
    );
    expect(screen.queryAllByRole("tooltip", { hidden: true })).toHaveLength(0);
  });
});

describe("Select hint with a FieldHint (P8)", () => {
  it("renders the hint's button on a labelled Select", () => {
    render(
      <Select label="Type" hint={<FieldHint label="What the type decides" />}>
        <option>Giro</option>
      </Select>,
    );
    expect(screen.getByRole("button", { name: "What the type decides" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Type" })).toBeInTheDocument();
  });

  it("renders it on an aria-labelled Select too, where it used to be dropped", () => {
    render(
      <Select aria-label="Type" hint={<FieldHint label="What the type decides" />}>
        <option>Giro</option>
      </Select>,
    );
    expect(screen.getByRole("button", { name: "What the type decides" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Type" })).toBeInTheDocument();
  });

  it("leaves an unlabelled Select with no hint exactly as it was", () => {
    const { container } = render(
      <Select aria-label="Type" className="w-40">
        <option>Giro</option>
      </Select>,
    );
    expect(container.firstElementChild!.className).toBe("relative w-40");
  });
});

describe("StatTile variant (P9)", () => {
  it("is a framed card by default", () => {
    const { container } = render(<StatTile label="Revenue" value={1} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.className).toContain("border");
    expect(tile.className).toContain("shadow-sm");
  });

  it("drops the frame inset and plain", () => {
    const { container, rerender } = render(<StatTile label="Revenue" value={1} variant="inset" />);
    let tile = container.firstElementChild as HTMLElement;
    expect(tile.className).toContain("bg-[var(--bg-surface-2)]");
    expect(tile.className).not.toContain("shadow-sm");
    expect(tile.className).not.toMatch(/(^| )border( |$)/);
    rerender(<StatTile label="Revenue" value={1} variant="plain" />);
    tile = container.firstElementChild as HTMLElement;
    expect(tile.className).toContain("bg-transparent");
    expect(tile.className).toContain("p-0");
    expect(tile.className).not.toContain("sm:p-4");
    expect(tile).toHaveAttribute("data-variant", "plain");
  });
});

describe("StatTileGrid (P9)", () => {
  it("stretches by default and keeps column width with stretch={false}", () => {
    const { container, rerender } = render(
      <StatTileGrid>
        <StatTile label="A" value={1} />
      </StatTileGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain("auto-fit");
    rerender(
      <StatTileGrid stretch={false}>
        <StatTile label="A" value={1} />
      </StatTileGrid>,
    );
    expect(grid.style.gridTemplateColumns).toContain("auto-fill");
  });

  it("says Loading once for a loading grid, not once per tile", () => {
    const { container } = render(
      <StatTileGrid loading>
        <StatTile label="A" value={1} />
        <StatTile label="B" value={2} />
        <StatTile label="C" value={3} loading />
      </StatTileGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(grid.textContent!.match(/Loading…/g)).toHaveLength(1);
    // Every tile shows its skeleton.
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(4);
  });

  it("leaves a tile's own loading sentence alone in a grid that is not loading", () => {
    const { container } = render(
      <StatTileGrid>
        <StatTile label="A" value={1} loading />
      </StatTileGrid>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(container.textContent).toContain("Loading…");
  });
});
