import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Check } from "lucide-react";
import { FormActions } from "../form-actions";
import { UiKitProvider } from "../../i18n/kit-labels";
import { WriteLockProvider } from "../write-lock";

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

describe("FormActions per-breakpoint placement and bleed (keksdose 0.17 Q7)", () => {
  const viewport = (width: number) =>
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => {
        const min = /min-width:\s*(\d+)px/.exec(query);
        return {
          matches: min ? width >= Number(min[1]) : false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
      },
    });
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("is sticky on a phone and inline from md up", () => {
    viewport(390);
    const { container, unmount } = render(<FormActions placement={{ base: "sticky", md: "inline" }} />);
    let row = container.firstElementChild as HTMLElement;
    expect(row).toHaveAttribute("data-placement", "sticky");
    expect(row).toHaveClass("sticky");
    unmount();
    viewport(1280);
    const desk = render(<FormActions placement={{ base: "sticky", md: "inline" }} />);
    row = desk.container.firstElementChild as HTMLElement;
    expect(row).toHaveAttribute("data-placement", "inline");
    expect(row).not.toHaveClass("sticky");
    expect(row.style.bottom).toBe("");
  });

  it("renders the base placement without matchMedia", () => {
    const { container } = render(<FormActions placement={{ base: "sticky", lg: "inline" }} />);
    expect(container.firstElementChild).toHaveAttribute("data-placement", "sticky");
  });

  it("bleeds over the container's padding only while sticky", () => {
    viewport(390);
    const { container, unmount } = render(
      <FormActions placement={{ base: "sticky", md: "inline" }} stickyWithin="container" bleed="0.75rem" />,
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row.style.marginInline).toBe("calc(-0.75rem)");
    expect(row.style.paddingInline).toBe("0.75rem");
    unmount();
    viewport(1280);
    const desk = render(<FormActions placement={{ base: "sticky", md: "inline" }} bleed={12} />);
    const inline = desk.container.firstElementChild as HTMLElement;
    expect(inline.style.marginInline).toBe("");
    expect(inline.style.paddingInline).toBe("");
  });

  it("takes a number as px, and a caller's style still wins", () => {
    const { container } = render(<FormActions placement="sticky" bleed={12} style={{ paddingInline: 4 }} />);
    const row = container.firstElementChild as HTMLElement;
    expect(row.style.marginInline).toBe("calc(-12px)");
    expect(row.style.paddingInline).toBe("4px");
  });
});

describe("FormActions submitShortcut (keksdose K14)", () => {
  const chord = (el: Element, extra: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(el, { key: "Enter", ctrlKey: true, ...extra });

  function renderForm(props: Partial<React.ComponentProps<typeof FormActions>> = {}, outside = false) {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <>
        <form onSubmit={onSubmit}>
          <input aria-label="Payee" />
          <textarea aria-label="Memo" />
          <FormActions submitShortcut="mod-enter" {...props} />
        </form>
        {outside && <input aria-label="Elsewhere" />}
      </>,
    );
    return onSubmit;
  }

  it("Ctrl+Enter or Cmd+Enter inside the form presses Save, once", () => {
    const onSubmit = renderForm();
    chord(screen.getByRole("textbox", { name: "Payee" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    chord(screen.getByRole("textbox", { name: "Memo" }), { ctrlKey: false, metaKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("is exactly the chord: not with Shift or Alt, not plain Enter, not a held key's repeat", () => {
    const onSubmit = renderForm();
    const field = screen.getByRole("textbox", { name: "Memo" });
    chord(field, { shiftKey: true });
    chord(field, { altKey: true });
    chord(field, { ctrlKey: false });
    chord(field, { repeat: true });
    chord(field, { isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("is scoped to its own form", () => {
    const onSubmit = renderForm({}, true);
    chord(screen.getByRole("textbox", { name: "Elsewhere" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does nothing while Save could not be pressed: pending, submitDisabled, or a locked commit", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { rerender } = render(
      <form onSubmit={onSubmit}>
        <input aria-label="Payee" />
        <FormActions submitShortcut="mod-enter" pending />
      </form>,
    );
    const field = screen.getByRole("textbox", { name: "Payee" });
    chord(field);
    rerender(
      <form onSubmit={onSubmit}>
        <input aria-label="Payee" />
        <FormActions submitShortcut="mod-enter" submitDisabled submitDisabledReason="Unbalanced" />
      </form>,
    );
    chord(field);
    rerender(
      <WriteLockProvider locked reason="Read-only demo">
        <form onSubmit={onSubmit}>
          <input aria-label="Payee" />
          <FormActions submitShortcut="mod-enter" commit />
        </form>
      </WriteLockProvider>,
    );
    chord(screen.getByRole("textbox", { name: "Payee" }));
    expect(onSubmit).not.toHaveBeenCalled();
    // The lock covers commits only: the same row without `commit` saves.
    rerender(
      <WriteLockProvider locked reason="Read-only demo">
        <form onSubmit={onSubmit}>
          <input aria-label="Payee" />
          <FormActions submitShortcut="mod-enter" />
        </form>
      </WriteLockProvider>,
    );
    chord(screen.getByRole("textbox", { name: "Payee" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("leaves the chord to a field that handled it (keksdose live #202)", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <input aria-label="Stops it" onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()} />
        <input aria-label="Prevents it" onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} />
        <FormActions submitShortcut="mod-enter" />
      </form>,
    );
    chord(screen.getByRole("textbox", { name: "Stops it" }));
    chord(screen.getByRole("textbox", { name: "Prevents it" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit in the button mode, scoped to the row's container", () => {
    const onSubmit = vi.fn();
    render(
      <>
        <div>
          <input aria-label="Name" />
          <FormActions submitShortcut="mod-enter" onSubmit={onSubmit} />
        </div>
        <input aria-label="Elsewhere" />
      </>,
    );
    chord(screen.getByRole("textbox", { name: "Elsewhere" }));
    expect(onSubmit).not.toHaveBeenCalled();
    chord(screen.getByRole("textbox", { name: "Name" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("follows the `form` prop to a form rendered elsewhere (a dialog footer)", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <>
        <form id="edit-payee" onSubmit={onSubmit}>
          <input aria-label="Payee" />
        </form>
        <footer>
          <FormActions submitShortcut="mod-enter" form="edit-payee" />
        </footer>
      </>,
    );
    chord(screen.getByRole("textbox", { name: "Payee" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("announces the shortcut, and shows it only when asked, outside the button's name", () => {
    const { rerender } = render(<FormActions submitShortcut="mod-enter" onSubmit={() => {}} />);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-keyshortcuts", "Control+Enter Meta+Enter");
    expect(save.querySelector("kbd")).toBeNull();
    rerender(<FormActions submitShortcut="mod-enter" submitShortcutHint onSubmit={() => {}} />);
    const kbd = screen.getByRole("button", { name: "Save" }).querySelector("kbd")!;
    expect(kbd).toHaveAttribute("aria-hidden", "true");
    expect(kbd.textContent).toMatch(/^(Ctrl\+Enter|⌘ Enter)$/);
  });

  it("does nothing without submitShortcut, and keeps a caller's ref on Save", () => {
    const onSubmit = vi.fn();
    const ref = { current: null as HTMLButtonElement | null };
    render(
      <div>
        <input aria-label="Name" />
        <FormActions onSubmit={onSubmit} submitProps={{ ref }} />
      </div>,
    );
    chord(screen.getByRole("textbox", { name: "Name" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(ref.current).toBe(screen.getByRole("button", { name: "Save" }));
    expect(ref.current).not.toHaveAttribute("aria-keyshortcuts");
  });
});
