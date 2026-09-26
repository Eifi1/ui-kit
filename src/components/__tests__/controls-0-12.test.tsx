import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Field } from "../field";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { ToggleGroup } from "../toggle-group";
import { Button, Card } from "../ui";
import { List, ListItem } from "../list";
import { NumberField } from "../number-field";

/**
 * 0.12's field-and-row wave from kastlan's adoption notes: a Field whose label hides
 * on desktop, the controls that did not take Field's render-prop ids where they
 * belong, a destructive secondary button, an outline card, and a list row that can
 * hold more than a title.
 */

describe("Field labelVisibility", () => {
  it("keeps the label as the name while hiding it from md up", () => {
    render(
      <Field label="Account" labelVisibility="below-md">
        {(ids) => <input {...ids} />}
      </Field>,
    );
    const label = screen.getByText("Account");
    expect(label.className).toContain("md:sr-only");
    expect(label.className).not.toMatch(/(^|\s)sr-only/);
    expect(screen.getByRole("textbox", { name: "Account" })).toBeInTheDocument();
    // The hidden label's containing block stays local.
    expect(label.closest("[data-slot=field]")!.className).toContain("relative");
  });

  it("hides the label at every width with sr-only, and draws it by default", () => {
    const { rerender } = render(
      <Field label="Amount" labelVisibility="sr-only">
        {(ids) => <input {...ids} />}
      </Field>,
    );
    expect(screen.getByText("Amount").className).toMatch(/(^|\s)sr-only(\s|$)/);
    expect(screen.getByRole("textbox", { name: "Amount" })).toBeInTheDocument();
    rerender(<Field label="Amount">{(ids) => <input {...ids} />}</Field>);
    expect(screen.getByText("Amount").className).not.toContain("sr-only");
  });

  it("hands a group the label's id as the render-prop's second argument", () => {
    render(
      <Field label="Cap">{(ids, { labelId }) => <div role="group" {...ids} aria-labelledby={labelId} />}</Field>,
    );
    expect(screen.getByRole("group", { name: "Cap" })).toBeInTheDocument();
  });
});

describe("MultiEntityCombobox takes Field's ids on its trigger", () => {
  it("puts id, aria-describedby, aria-invalid and aria-required on the combobox, not the wrapper", () => {
    render(
      <Field label="To" required hint="Pick one or more" error="Required">
        {(ids) => (
          <MultiEntityCombobox
            {...ids}
            data-testid="wrapper"
            value={[]}
            onChange={vi.fn()}
            options={[{ value: 1, label: "Anna" }]}
          />
        )}
      </Field>,
    );
    const trigger = screen.getByRole("combobox", { name: "To" });
    expect(trigger).toHaveAttribute("aria-required", "true");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Pick one or more Required");
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper).not.toHaveAttribute("id");
    expect(wrapper).not.toHaveAttribute("aria-describedby");
    expect(wrapper).not.toHaveAttribute("aria-invalid");
  });

  it("merges a caller's describedby with its own error", () => {
    render(
      <>
        <p id="ext">External</p>
        <MultiEntityCombobox aria-label="Cc" aria-describedby="ext" error="Too many" value={[]} onChange={vi.fn()} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Cc" })).toHaveAccessibleDescription("External Too many");
  });
});

describe("ToggleGroup label placement and Field wiring", () => {
  const options = [
    { value: "20", label: "20%" },
    { value: "15", label: "15%" },
  ] as const;

  function Above({ error }: { error?: string }) {
    const [v, setV] = useState<"20" | "15">("20");
    return (
      <ToggleGroup
        label="Cap"
        labelPlacement="above"
        error={error}
        className="outer"
        value={v}
        onChange={setV}
        options={[...options]}
      />
    );
  }

  it("labelPlacement='above' draws a Label over the bare group and names it", () => {
    const { container } = render(<Above />);
    const group = screen.getByRole("radiogroup", { name: "Cap" });
    // No field chrome: the group keeps its own box, the wrapper takes className.
    expect(group.className).toContain("border-[var(--border-strong)]");
    expect(group.className).not.toContain("outer");
    expect(container.firstElementChild!.className).toContain("outer");
    expect(screen.getByText("Cap").tagName).toBe("LABEL");
    fireEvent.click(screen.getByRole("radio", { name: "15%" }));
    expect(screen.getByRole("radio", { name: "15%" })).toHaveAttribute("aria-checked", "true");
  });

  it("labelPlacement='above' shows the error under the group and describes it", () => {
    render(<Above error="Pick one" />);
    const group = screen.getByRole("radiogroup", { name: "Cap" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAccessibleDescription("Pick one");
    expect(group.className).toContain("border-[var(--danger-border)]");
  });

  it("takes Field's id, description, invalid and label id as a bare group", () => {
    render(
      <Field label="Cap" hint="Tight markets: 15%" error="Required">
        {(ids, { labelId }) => (
          <ToggleGroup {...ids} aria-labelledby={labelId} value="20" onChange={vi.fn()} options={[...options]} />
        )}
      </Field>,
    );
    const group = screen.getByRole("radiogroup", { name: "Cap" });
    expect(group).toHaveAttribute("id");
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAccessibleDescription("Tight markets: 15% Required");
    // The border says what the attribute says.
    expect(group.className).toContain("border-[var(--danger-border)]");
  });
});

describe("Button tone='danger' on the boxed variants", () => {
  it("makes secondary an outlined destructive button", () => {
    render(
      <Button variant="secondary" tone="danger">
        Remove all
      </Button>,
    );
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("border-[var(--danger-border)]");
    expect(cls).toContain("text-[var(--danger)]");
    expect(cls).toContain("hover:bg-[var(--danger-bg)]");
    expect(cls).not.toContain("text-[var(--text-primary)]");
    expect(cls).not.toMatch(/(^|\s)border-\[var\(--border\)\]/);
  });

  it("makes primary a soft destructive button that fills on hover", () => {
    render(<Button tone="danger">Delete</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("bg-[var(--danger-bg)]");
    expect(cls).toContain("hover:bg-[var(--danger)]");
    expect(cls).not.toContain("bg-[var(--bg-surface-2)]");
  });

  it("leaves the solid danger and brand variants alone", () => {
    render(
      <>
        <Button variant="danger" tone="danger">
          A
        </Button>
        <Button variant="brand" tone="danger">
          B
        </Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "A" }).className).toContain("bg-[var(--danger)]");
    expect(screen.getByRole("button", { name: "A" }).className).not.toContain("bg-[var(--danger-bg)]");
    expect(screen.getByRole("button", { name: "B" }).className).toContain("bg-[var(--brand)]");
  });
});

describe("Card variant='outline'", () => {
  it("is bordered, shadowless and padded p-4 by default", () => {
    render(<Card variant="outline" data-testid="c">x</Card>);
    const cls = screen.getByTestId("c").className;
    expect(cls).toContain("border-[var(--border)]");
    expect(cls).not.toContain("shadow");
    expect(cls).toContain("p-4");
  });

  it("takes padding='sm', a tone on its border, and a caller's padding", () => {
    const { rerender } = render(
      <Card variant="outline" padding="sm" tone="warning" data-testid="c">
        x
      </Card>,
    );
    const cls = screen.getByTestId("c").className;
    expect(cls).toContain("p-3");
    expect(cls).not.toContain("p-4");
    expect(cls).toContain("border-[var(--warning-border)]");
    rerender(
      <Card variant="outline" padding="sm" className="p-1" data-testid="c">
        x
      </Card>,
    );
    expect(screen.getByTestId("c").className).toContain("p-1");
    expect(screen.getByTestId("c").className).not.toContain("p-3");
  });

  it("leaves the default card padding-less unless asked", () => {
    const { rerender } = render(<Card data-testid="c">x</Card>);
    expect(screen.getByTestId("c").className).not.toMatch(/(^|\s)p-\d/);
    rerender(<Card padding="md" data-testid="c">x</Card>);
    expect(screen.getByTestId("c").className).toContain("p-4");
  });
});

describe("ListItem body", () => {
  it("renders the body outside the row's target, as a group named by the title", () => {
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    render(
      <List>
        <ListItem title="Kitchen" subtitle="2 defects" onClick={onOpen}>
          <button type="button" onClick={onRemove}>
            Remove photo
          </button>
        </ListItem>
      </List>,
    );
    const target = screen.getByRole("button", { name: /Kitchen/ });
    const remove = screen.getByRole("button", { name: "Remove photo" });
    expect(target).not.toContainElement(remove);
    const group = screen.getByRole("group", { name: "Kitchen" });
    expect(group).toContainElement(remove);
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    // Both sit in the one list item.
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("moves the hover fill from the box to the target when there is a body", () => {
    render(
      <ListItem as="div" title="Hall" onClick={vi.fn()} className="box">
        <p>Notes</p>
      </ListItem>,
    );
    const target = screen.getByRole("button", { name: "Hall" });
    expect(target.className).toContain("hover:bg-[var(--bg-hover)]");
    const box = target.closest(".box")!;
    expect(box.className).not.toContain("hover:bg-[var(--bg-hover)]");
    expect(box.className).toContain("flex-col");
  });

  it("renders no group and keeps the flat row without a body", () => {
    render(<ListItem as="div" title="Hall" onClick={vi.fn()} />);
    expect(screen.queryByRole("group")).toBeNull();
  });
});

describe("NumberField takes Field's render-prop spread", () => {
  it("puts id, aria-describedby, aria-invalid and aria-required on the input", () => {
    render(
      <Field label="Debit" required hint="EUR" error="Required">
        {(ids) => <NumberField {...ids} value={null} onCommit={vi.fn()} calculator={false} />}
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Debit" });
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("EUR Required");
  });

  it("sets no aria-required when not required", () => {
    render(<NumberField ariaLabel="Qty" value={1} onCommit={vi.fn()} calculator={false} />);
    expect(screen.getByRole("textbox", { name: "Qty" })).not.toHaveAttribute("aria-required");
  });
});
