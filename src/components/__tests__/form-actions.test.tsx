import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Check } from "lucide-react";
import { FormActions } from "../form-actions";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("FormActions", () => {
  it("submits the enclosing form and calls onCancel, with the default labels", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onCancel = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <FormActions onCancel={onCancel} />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("reads its labels from the provider's form namespace", () => {
    render(
      <UiKitProvider labels={{ form: { save: "Speichern", cancel: "Abbrechen" } }}>
        <FormActions onCancel={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Speichern" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("button", { name: "Abbrechen" })).toHaveAttribute("type", "button");
  });

  it("calls onSubmit from a plain button when given", () => {
    const onSubmit = vi.fn();
    render(<FormActions onSubmit={onSubmit} submitLabel="Create" />);
    const save = screen.getByRole("button", { name: "Create" });
    expect(save).toHaveAttribute("type", "button");
    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("while pending: a spinner in the save button, which is disabled and busy", () => {
    render(<FormActions onCancel={() => {}} pending pendingLabel="Saving…" />);
    const save = screen.getByRole("button", { name: "Saving…" });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute("aria-busy", "true");
    // Decorative: the button's name stays its text.
    expect(save.querySelector("[aria-hidden].animate-spin")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("puts a destructive action at the start and aligns the row between", () => {
    const onDelete = vi.fn();
    const { container } = render(
      <FormActions onCancel={() => {}} destructive={{ label: "Delete", onClick: onDelete }} />,
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row).toHaveClass("justify-between");
    const del = screen.getByRole("button", { name: "Delete" });
    expect(row.firstElementChild).toContainElement(del);
    fireEvent.click(del);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("takes an element as the destructive action", () => {
    render(<FormActions destructive={<button type="button">Archive</button>} />);
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });

  it("sticks to the bottom, or drops its spacing in a dialog footer", () => {
    const { container, rerender } = render(<FormActions placement="sticky" />);
    const row = () => container.firstElementChild as HTMLElement;
    expect(row()).toHaveClass("sticky", "bottom-0");
    expect(row().style.paddingBottom).toContain("safe-area-inset-bottom");
    rerender(<FormActions placement="dialog" form="edit-form" />);
    expect(row()).not.toHaveClass("pt-4");
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("form", "edit-form");
  });

  it("disables save for a reason of the form's own", () => {
    render(<FormActions submitDisabled />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});

describe("FormActions 0.16 (keksdose P7)", () => {
  it("puts a neutral start slot at the row's start and aligns the row between", () => {
    const { container } = render(<FormActions start={<span>Last saved 2 min ago</span>} onSubmit={() => {}} />);
    const row = container.querySelector('[data-slot="form-actions"]')!;
    expect(row).toHaveClass("justify-between");
    expect(row.firstElementChild).toHaveTextContent("Last saved 2 min ago");
  });

  it("keeps the destructive action first when both are given", () => {
    const { container } = render(
      <FormActions destructive={{ label: "Delete", onClick: () => {} }} start={<a href="#a">View activity</a>} />,
    );
    const start = container.querySelector('[data-slot="form-actions"]')!.firstElementChild!;
    expect(start.textContent).toBe("DeleteView activity");
  });

  it("passes submitProps through to the save button without overriding its own props", () => {
    render(<FormActions onSubmit={() => {}} submitProps={{ id: "save-btn", "data-testid": "save" }} />);
    const save = screen.getByTestId("save");
    expect(save).toHaveAttribute("id", "save-btn");
    expect(save).toHaveAttribute("type", "button");
  });

  it("replaces submitIcon with the spinner while pending, instead of adding one", () => {
    const { rerender } = render(<FormActions onSubmit={() => {}} submitIcon={Check} submitLabel="Apply" />);
    const save = screen.getByRole("button", { name: "Apply" });
    expect(save.querySelector("svg")).not.toBeNull();
    expect(save.querySelector(".animate-spin")).toBeNull();
    rerender(<FormActions onSubmit={() => {}} submitIcon={Check} submitLabel="Apply" pending />);
    expect(save.querySelector("svg")).toBeNull();
    expect(save.querySelectorAll(".animate-spin")).toHaveLength(1);
    expect(save).toHaveTextContent("Apply");
  });

  it("drops the nav offset when sticky within a container", () => {
    const { container, rerender } = render(<FormActions placement="sticky" />);
    const row = () => container.querySelector<HTMLElement>('[data-slot="form-actions"]')!;
    expect(row().style.bottom).toContain("--app-nav-h");
    expect(row()).toHaveAttribute("data-sticky-within", "viewport");
    rerender(<FormActions placement="sticky" stickyWithin="container" />);
    expect(row().style.bottom).toBe("0px");
    expect(row()).toHaveAttribute("data-sticky-within", "container");
  });
});
