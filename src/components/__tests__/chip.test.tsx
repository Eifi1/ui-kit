import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Chip, ChipInput } from "../chip";

describe("Chip", () => {
  it("is inert by default — not a button, not a link", () => {
    render(<Chip>alpha</Chip>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
  });

  it("becomes a link when given an href, and marks the current one", () => {
    render(
      <Chip href="#overlays" selected>
        Overlays
      </Chip>,
    );
    const link = screen.getByRole("link", { name: "Overlays" });
    expect(link).toHaveAttribute("href", "#overlays");
    expect(link).toHaveAttribute("aria-current", "true");
  });

  it("becomes a toggle when given onClick, and reports its pressed state", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Chip onClick={onClick}>Unpaid</Chip>);
    const button = screen.getByRole("button", { name: "Unpaid" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    rerender(
      <Chip onClick={onClick} selected>
        Unpaid
      </Chip>,
    );
    expect(screen.getByRole("button", { name: "Unpaid" })).toHaveAttribute("aria-pressed", "true");
  });

  it("names the dismiss button after the value it removes", () => {
    // A row of eight chips otherwise gives a screen-reader user eight buttons all called
    // "Remove", with no way to tell which one they are on.
    render(<Chip onRemove={() => {}}>invoices</Chip>);
    expect(screen.getByRole("button", { name: "Remove: invoices" })).toBeInTheDocument();
  });

  it("removing does not also follow the link it sits on", () => {
    const onRemove = vi.fn();
    render(
      <Chip href="#x" onRemove={onRemove}>
        tag
      </Chip>,
    );
    // Two siblings, not a nested button: a button inside an anchor is invalid HTML and
    // browsers disagree about what it does.
    expect(screen.getByRole("link", { name: "tag" })).toBeInTheDocument();
    const remove = screen.getByRole("button", { name: "Remove: tag" });
    const event = fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledOnce();
    expect(event).toBe(false); // preventDefault was called
  });

  it("does not offer a link or a remove control while disabled", () => {
    render(
      <Chip href="#x" onRemove={() => {}} disabled>
        tag
      </Chip>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove: tag" })).toBeDisabled();
  });
});

function Harness(props: Partial<React.ComponentProps<typeof ChipInput>> = {}) {
  const [value, setValue] = useState<string[]>(props.value ?? []);
  return <ChipInput label="Tags" {...props} value={value} onChange={setValue} />;
}

describe("ChipInput", () => {
  const type = (text: string) => {
    const input = screen.getByLabelText("Tags");
    fireEvent.change(input, { target: { value: text } });
    return input;
  };

  it("commits on Enter", () => {
    render(<Harness />);
    fireEvent.keyDown(type("alpha"), { key: "Enter" });
    expect(screen.getByText("alpha")).toBeInTheDocument();
  });

  it("commits on a separator", () => {
    render(<Harness />);
    fireEvent.keyDown(type("beta"), { key: "," });
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("commits on blur, rather than silently discarding what was typed", () => {
    // The commonest complaint about this pattern: type a value, click elsewhere, lose it.
    render(<Harness />);
    fireEvent.blur(type("gamma"));
    expect(screen.getByText("gamma")).toBeInTheDocument();
  });

  it("trims, and refuses an empty commit", () => {
    render(<Harness />);
    fireEvent.keyDown(type("   "), { key: "Enter" });
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    fireEvent.keyDown(type("  spaced  "), { key: "Enter" });
    expect(screen.getByText("spaced")).toBeInTheDocument();
  });

  it("refuses a duplicate and says so", () => {
    render(<Harness value={["alpha"]} />);
    fireEvent.keyDown(type("alpha"), { key: "Enter" });
    expect(screen.getAllByText("alpha")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("already in the list");
  });

  it("allows duplicates when asked to", () => {
    render(<Harness value={["alpha"]} allowDuplicates />);
    fireEvent.keyDown(type("alpha"), { key: "Enter" });
    expect(screen.getAllByText("alpha")).toHaveLength(2);
  });

  it("stops at max and announces the limit", () => {
    render(<Harness value={["a", "b"]} max={2} />);
    fireEvent.keyDown(type("c"), { key: "Enter" });
    expect(screen.queryByText("c")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Limit of 2");
  });

  it("rejects with the validator's own message", () => {
    render(<Harness validate={(v) => (v.includes("@") ? null : "Needs an @")} />);
    fireEvent.keyDown(type("nope"), { key: "Enter" });
    expect(screen.queryByText("nope")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Needs an @");
  });

  it("splits a pasted list on the separators", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Tags");
    fireEvent.paste(input, { clipboardData: { getData: () => "one,two,three" } });
    for (const v of ["one", "two", "three"]) expect(screen.getByText(v)).toBeInTheDocument();
  });

  it("Backspace on an empty field moves to the last chip WITHOUT deleting it", () => {
    // Deleting straight away is a destructive action on a reflex key, with no feedback,
    // on a value that may have taken a while to type. Focus first; the second press is
    // then a deliberate one.
    render(<Harness value={["alpha", "beta"]} />);
    fireEvent.keyDown(screen.getByLabelText("Tags"), { key: "Backspace" });
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "beta" })).toHaveFocus();
  });

  it("removes the focused chip on a second Backspace, and announces it", () => {
    render(<Harness value={["alpha", "beta"]} />);
    fireEvent.keyDown(screen.getByLabelText("Tags"), { key: "Backspace" });
    fireEvent.keyDown(screen.getByRole("listitem", { name: "beta" }), { key: "Backspace" });
    expect(screen.queryByText("beta")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("beta removed");
  });

  it("moves between chips with the arrow keys", () => {
    render(<Harness value={["alpha", "beta"]} />);
    fireEvent.keyDown(screen.getByLabelText("Tags"), { key: "Backspace" });
    fireEvent.keyDown(screen.getByRole("listitem", { name: "beta" }), { key: "ArrowLeft" });
    expect(screen.getByRole("listitem", { name: "alpha" })).toHaveFocus();
  });

  it("keeps only one chip tabbable, so Tab leaves the field", () => {
    render(<Harness value={["a", "b", "c"]} />);
    const tabbable = screen.getAllByRole("listitem").filter((el) => el.tabIndex === 0);
    expect(tabbable).toHaveLength(0); // none until one is focused
  });

  it("Escape clears the draft but keeps the committed chips", () => {
    render(<Harness value={["kept"]} />);
    const input = type("discard me");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
    expect(screen.getByText("kept")).toBeInTheDocument();
  });

  it("wires the error to the input with aria-describedby", () => {
    render(<Harness error="Pick at least one" />);
    const input = screen.getByLabelText("Tags");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)).toHaveTextContent("Pick at least one");
  });

  it("takes translated labels", () => {
    render(<Harness value={["x"]} labels={{ remove: "Entfernen" }} />);
    expect(screen.getByRole("button", { name: "Entfernen: x" })).toBeInTheDocument();
  });

  it("hides its live region without inflating the document height", () => {
    render(<Harness />);
    expect(screen.getByRole("status")).toHaveClass("sr-only-fixed");
  });

  it("offers no remove control while disabled", () => {
    render(<Harness value={["a"]} disabled />);
    const list = screen.getByRole("list");
    expect(within(list).queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
  });
});

describe("Chip — what a caller can hand it (0.5.1)", () => {
  it("passes aria-*, title and id to the interactive element", () => {
    render(
      <>
        <p id="why">Hides snoozed categories</p>
        <Chip
          onClick={() => {}}
          id="snooze"
          title="Snooze"
          aria-describedby="why"
          aria-expanded={false}
          aria-controls="panel"
        >
          Snoozed
        </Chip>
      </>,
    );
    const chip = screen.getByRole("button", { name: "Snoozed" });
    expect(chip).toHaveAttribute("id", "snooze");
    expect(chip).toHaveAttribute("title", "Snooze");
    expect(chip).toHaveAccessibleDescription("Hides snoozed categories");
    expect(chip).toHaveAttribute("aria-expanded", "false");
    expect(chip).toHaveAttribute("aria-controls", "panel");
  });

  it("hands onClick the event, so a chip in a clickable row can stop it", () => {
    const row = vi.fn();
    render(
      <div onClick={row}>
        <Chip onClick={(e) => e.stopPropagation()}>Filter</Chip>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    expect(row).not.toHaveBeenCalled();
  });
});
