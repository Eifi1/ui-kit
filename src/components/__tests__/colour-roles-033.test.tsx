import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button, IconButton } from "../ui";
import { Chip } from "../chip";
import { CalculatorButton } from "../calculator";
import { NumberPadSheet } from "../numpad-sheet";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * 0.33's colour roles in the kit's own components (docs/colour-roles-harmonization.md
 * §5, §12). Each class here stands for a measured pair: the ratios themselves are held
 * in every shipped preset by theme/__tests__/tokens-css-audit.test.ts. This file pins
 * that the components paint with those pairs.
 */

const cls = (el: Element) => el.className.split(/\s+/);

/** B′'s hover (§12.1, §12.10): the body ink at 7 %, translucent. */
const HOVER_INK = "hover:bg-[color-mix(in_srgb,var(--text-primary)_7%,transparent)]";

describe("B′: a control that can sit on any surface hovers with the translucent ink", () => {
  it("Button secondary and ghost — no longer the well, which is the page in light", () => {
    for (const variant of ["secondary", "ghost"] as const) {
      const { unmount } = render(<Button variant={variant}>Save</Button>);
      const c = cls(screen.getByRole("button"));
      expect(c, variant).toContain(HOVER_INK);
      expect(c, variant).not.toContain("hover:bg-[var(--bg-surface-2)]");
      unmount();
    }
  });

  it("IconButton muted, and the ghost IconButton", () => {
    render(
      <>
        <IconButton tone="muted" aria-label="More">x</IconButton>
        <IconButton aria-label="Edit">x</IconButton>
      </>,
    );
    expect(cls(screen.getByRole("button", { name: "More" }))).toContain(HOVER_INK);
    expect(cls(screen.getByRole("button", { name: "Edit" }))).toContain(HOVER_INK);
  });

  it("a danger ghost hovers onto the danger wash, where its red text keeps 4.5:1", () => {
    render(<Button variant="ghost" tone="danger">Remove</Button>);
    const c = cls(screen.getByRole("button"));
    expect(c).toContain("hover:bg-[var(--danger-bg)]");
    expect(c).not.toContain(HOVER_INK);
  });
});

describe("--border is a line, not a fill under text (§12.9)", () => {
  it("Button primary hovers onto --bg-active", () => {
    render(<Button>Save</Button>);
    const c = cls(screen.getByRole("button"));
    expect(c).toContain("hover:bg-active");
    expect(c).not.toContain("hover:bg-[var(--border)]");
  });

  it("the calculator: digits hover onto --bg-active, operators rest on it", () => {
    render(<CalculatorButton value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Open calculator" }));
    const panel = screen.getByRole("dialog");
    const digit = within(panel).getByRole("button", { name: "7" });
    expect(cls(digit)).toEqual(expect.arrayContaining(["bg-surface-2", "text-primary", "hover:bg-active"]));
    for (const name of ["Plus", "Clear"]) {
      const key = within(panel).getByRole("button", { name });
      expect(cls(key), name).toEqual(expect.arrayContaining(["bg-active", "hover:bg-surface-2"]));
      expect(key.className, name).not.toContain("var(--border)]");
    }
  });

  it("the phone pad: operators on --bg-active, a pressed digit too", () => {
    render(<NumberPadSheet value="1" onChange={() => {}} onDone={() => {}} />);
    expect(cls(screen.getByRole("button", { name: "Plus" }))).toEqual(
      expect.arrayContaining(["bg-active", "active:bg-surface-2"]),
    );
    expect(cls(screen.getByRole("button", { name: "7" }))).toEqual(
      expect.arrayContaining(["bg-surface-2", "active:bg-active"]),
    );
    expect(document.body.innerHTML).not.toContain("bg-[var(--border)]");
  });
});

describe("every fill under its own foreground (§5.1)", () => {
  it("Chip solid takes the fill's -contrast, not the surface colour", () => {
    render(
      <>
        <Chip tone="warning" variant="solid" data-testid="warning">3</Chip>
        <Chip tone="income" variant="solid" data-testid="income">+</Chip>
        <Chip tone="neutral" variant="solid" data-testid="neutral">9</Chip>
      </>,
    );
    expect(cls(screen.getByTestId("warning"))).toEqual(expect.arrayContaining(["bg-warning", "text-warning-contrast"]));
    expect(cls(screen.getByTestId("income"))).toEqual(
      expect.arrayContaining(["bg-money-pos", "text-money-income-contrast"]),
    );
    // A count pill keeps the inverse pair — louder than the neutral fill, on purpose.
    expect(cls(screen.getByTestId("neutral"))).toEqual(expect.arrayContaining(["bg-inverse", "text-inverse"]));
  });

  it("Chip outline brand writes the brand as text: --brand-muted", () => {
    render(<Chip tone="brand" variant="outline" data-testid="brand">New</Chip>);
    const c = cls(screen.getByTestId("brand"));
    expect(c).toContain("text-brand-muted");
    expect(c).not.toContain("text-[var(--brand)]");
  });
});

describe("DataTable", () => {
  interface Row {
    id: number;
    name: string;
  }
  const ROWS: Row[] = [{ id: 1, name: "Alpha" }];
  const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

  it("lets a selected row keep its well and draw the outline on hover (§12.2)", () => {
    // Kurvenschmiede's selected rows: rowClassName merges last, so its `hover:` fill
    // replaces the row's own `hover:bg-[var(--bg-hover)]`, which would read as "not
    // selected" — and sits 1.04:1 from a light well.
    const selected = "bg-surface-2 hover:bg-surface-2 hover:outline hover:-outline-offset-1 hover:outline-strong";
    render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} onRowClick={() => {}} rowClassName={() => selected} />
      </MemoryRouter>,
    );
    const row = screen.getAllByRole("row")[1];
    expect(cls(row)).toEqual(expect.arrayContaining(selected.split(" ")));
    expect(cls(row)).not.toContain("hover:bg-[var(--bg-hover)]");
  });

  describe("on a phone, the row actions' swipes", () => {
    beforeEach(() => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("width <"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    });
    afterEach(() => vi.unstubAllGlobals());

    /** Drag the card by `dx` px and return the reveal panel showing `label`. */
    function dragTo(dx: number, label: string): HTMLElement {
      const slider = screen.getByText("Alpha").closest("[style*='touch-action']") as HTMLElement;
      fireEvent.pointerDown(slider, { pointerId: 1, clientX: 300, clientY: 0, button: 0, pointerType: "touch" });
      fireEvent.pointerMove(slider, { pointerId: 1, clientX: 300 + dx / 2, clientY: 0, pointerType: "touch" });
      fireEvent.pointerMove(slider, { pointerId: 1, clientX: 300 + dx, clientY: 0, pointerType: "touch" });
      const text = screen.getAllByText(label).find((el) => el.tagName === "SPAN" && !el.closest("button"))!;
      return text.closest(".absolute") as HTMLElement;
    }

    it("take the action's tone: danger for delete, brand for the rest", () => {
      render(
        <MemoryRouter>
          <DataTable
            rows={ROWS}
            columns={COLUMNS}
            rowKey={(r) => r.id}
            rowActions={[
              { kind: "edit", onAction: vi.fn() },
              { kind: "delete", onAction: vi.fn() },
            ]}
          />
        </MemoryRouter>,
      );
      // Edit is the end action (a drag right in LTR), delete the start one.
      expect(cls(dragTo(60, "Edit"))).toEqual(expect.arrayContaining(["bg-brand-soft", "text-brand-muted"]));
      expect(cls(dragTo(-60, "Delete"))).toEqual(expect.arrayContaining(["bg-danger-soft", "text-danger"]));
    });
  });
});
