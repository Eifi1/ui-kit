import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FullBleedDialog } from "../full-bleed-dialog";

/**
 * The header strip was an unnamed `div`, so a full-screen phone editor built on this
 * announced as just "dialog" — which is why keksdose's budget-table phone editor stayed
 * on `DialogFrame fullBleed` (its comment says so). `title` is a real heading, and the
 * dialog's name.
 */
describe("FullBleedDialog title", () => {
  it("renders the title as an h2 that names the dialog", () => {
    render(
      <FullBleedDialog open onClose={() => {}} closeLabel="Close" title="Groceries">
        <p>body</p>
      </FullBleedDialog>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Groceries" });
    const dialog = screen.getByRole("dialog", { name: "Groceries" });
    expect(dialog).toHaveAttribute("aria-labelledby", heading.id);
  });

  it("takes the heading level from headingAs", () => {
    render(
      <FullBleedDialog open onClose={() => {}} closeLabel="Close" title="Groceries" headingAs="h3">
        <p>body</p>
      </FullBleedDialog>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Groceries" })).toBeInTheDocument();
  });

  it("keeps the free header slot beside the title, outside the name", () => {
    render(
      <FullBleedDialog
        open
        onClose={() => {}}
        closeLabel="Close"
        title="Groceries"
        header={<span>€ 120.00</span>}
      >
        <p>body</p>
      </FullBleedDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Groceries" });
    expect(within(dialog).getByText("€ 120.00")).toBeInTheDocument();
  });

  it("lets the caller's own name win", () => {
    render(
      <FullBleedDialog open onClose={() => {}} closeLabel="Close" title="Groceries" aria-label="Edit category">
        <p>body</p>
      </FullBleedDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Edit category" });
    expect(dialog).not.toHaveAttribute("aria-labelledby");
  });

  it("without a title, stays as it was: no heading, no labelledby", () => {
    render(
      <FullBleedDialog open onClose={() => {}} closeLabel="Close" header={<span>Row</span>}>
        <p>body</p>
      </FullBleedDialog>,
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByText("Row")).toBeInTheDocument();
  });
});
