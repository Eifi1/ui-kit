import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "../button";
import { Card } from "../card";
import { IconButton } from "../icon-button";
import { Chip } from "../chip";
import { CalculatorButton } from "../calculator";
import { NumberPadSheet } from "../numpad-sheet";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { stubPhone } from "../../test/viewport";

/**
 * 0.33's colour roles in the kit's own components (docs/colour-roles-harmonization.md
 * §5, §12). Each class here stands for a measured pair: the ratios themselves are held
 * in every shipped preset by theme/__tests__/tokens-css-audit.test.ts. This file pins
 * that the components paint with those pairs.
 */

/** B′'s hover (§12.1, §12.10): the body ink at 7 %, translucent. */
const HOVER_INK = "hover:bg-[color-mix(in_srgb,var(--text-primary)_7%,transparent)]";

describe("B′: a control that can sit on any surface hovers with the translucent ink", () => {
  it("Button secondary and ghost — no longer the well, which is the page in light", () => {
    for (const variant of ["secondary", "ghost"] as const) {
      const { unmount } = render(<Button variant={variant}>Save</Button>);
      const el = screen.getByRole("button");
      expect(el, variant).toHaveClass(HOVER_INK);
      expect(el, variant).not.toHaveClass("hover:bg-surface-2");
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
    expect(screen.getByRole("button", { name: "More" })).toHaveClass(HOVER_INK);
    expect(screen.getByRole("button", { name: "Edit" })).toHaveClass(HOVER_INK);
  });

  it("a danger ghost hovers onto the danger wash, where its red text keeps 4.5:1", () => {
    render(<Button variant="ghost" tone="danger">Remove</Button>);
    const el = screen.getByRole("button");
    expect(el).toHaveClass("hover:bg-danger-soft");
    expect(el).not.toHaveClass(HOVER_INK);
  });
});

describe("--border is a line, not a fill under text (§12.9)", () => {
  it("Button primary hovers onto --bg-active", () => {
    render(<Button>Save</Button>);
    const el = screen.getByRole("button");
    expect(el).toHaveClass("hover:bg-active");
    expect(el).not.toHaveClass("hover:bg-[var(--border)]");
  });

  it("the calculator: digits hover onto --bg-active, operators rest on it", () => {
    render(<CalculatorButton value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Open calculator" }));
    const panel = screen.getByRole("dialog");
    const digit = within(panel).getByRole("button", { name: "7" });
    expect(digit).toHaveClass("bg-surface-2", "text-primary", "hover:bg-active");
    for (const name of ["Plus", "Clear"]) {
      const key = within(panel).getByRole("button", { name });
      expect(key, name).toHaveClass("bg-active", "hover:bg-surface-2");
      // `--border` in any form: `[var(--border)]`, or a role utility's `subtle` (0.34).
      expect(key.className, name).not.toMatch(/var\(--border\)\]|-subtle(?![\w-])/);
    }
  });

  it("the phone pad: operators on --bg-active, a pressed digit too", () => {
    render(<NumberPadSheet value="1" onChange={() => {}} onDone={() => {}} />);
    expect(screen.getByRole("button", { name: "Plus" })).toHaveClass("bg-active", "active:bg-surface-2");
    expect(screen.getByRole("button", { name: "7" })).toHaveClass("bg-surface-2", "active:bg-active");
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
    expect(screen.getByTestId("warning")).toHaveClass("bg-warning", "text-warning-contrast");
    expect(screen.getByTestId("income")).toHaveClass("bg-money-pos", "text-money-income-contrast");
    // A count pill keeps the inverse pair — louder than the neutral fill, on purpose.
    expect(screen.getByTestId("neutral")).toHaveClass("bg-inverse", "text-inverse");
  });

  it("Chip outline brand writes the brand as text: --brand-muted", () => {
    render(<Chip tone="brand" variant="outline" data-testid="brand">New</Chip>);
    const el = screen.getByTestId("brand");
    expect(el).toHaveClass("text-brand-muted");
    expect(el).not.toHaveClass("text-brand");
  });
});

describe("warning's loud line (§5.2)", () => {
  it("Card toneStrength=strong draws --warning-border-strong, not the warning text colour", () => {
    // In dark, --warning stood 13:1 off the card and shouted; amber-600 is 4.8:1 and up.
    render(
      <Card tone="warning" toneStrength="strong" padding="md" data-testid="card">
        Payment overdue
      </Card>,
    );
    const el = screen.getByTestId("card");
    expect(el).toHaveClass("border-2", "border-warning-strong");
    expect(el).not.toHaveClass("border-[var(--warning)]");
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
    // replaces the row's own `hover:bg-hover`, which would read as "not
    // selected" — and sits 1.04:1 from a light well.
    const selected = "bg-surface-2 hover:bg-surface-2 hover:outline hover:-outline-offset-1 hover:outline-strong";
    render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} onRowClick={() => {}} rowClassName={() => selected} />
      </MemoryRouter>,
    );
    const row = screen.getAllByRole("row")[1];
    expect(row).toHaveClass(...selected.split(" "));
    expect(row).not.toHaveClass("hover:bg-hover");
  });

  describe("on a phone, the row actions' swipes", () => {
    beforeEach(() => {
      stubPhone();
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
      expect(dragTo(60, "Edit")).toHaveClass("bg-brand-soft", "text-brand-muted");
      expect(dragTo(-60, "Delete")).toHaveClass("bg-danger-soft", "text-danger");
    });
  });
});
