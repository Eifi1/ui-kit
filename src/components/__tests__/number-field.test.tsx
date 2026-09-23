import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberField } from "../number-field";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * NumberField — the parse/commit/revert loop lenkbank wrote on top of NumberInput
 * (73 call sites), its nullable twin (`OptionalNumber`) and kastlan's clamping money
 * field, as one control whose value is a number.
 */

function setup(props: Partial<Parameters<typeof NumberField>[0]> = {}) {
  const onCommit = vi.fn();
  const view = render(
    <NumberField label="Wheelbase" value={2700} digits={0} onCommit={onCommit} {...props} />,
  );
  return { onCommit, view, input: screen.getByRole("textbox") as HTMLInputElement };
}

describe("NumberField", () => {
  it("shows the number and commits the parsed number once, on blur", async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();
    expect(input).toHaveValue("2700");
    await user.clear(input);
    await user.type(input, "3000");
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(3000);
  });

  it("commits on Enter, and does not commit the same number again on the blur after", async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();
    await user.clear(input);
    await user.type(input, "2800{Enter}");
    await user.tab();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(2800);
  });

  it("does not commit when the value did not change", async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();
    await user.click(input);
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("evaluates a typed calculation", async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();
    await user.clear(input);
    await user.type(input, "2700+50");
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(2750);
    expect(input).toHaveValue("2750");
  });

  it("snaps an empty or unparsable draft back instead of committing 0 or NaN", async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();
    await user.clear(input);
    await user.tab();
    expect(input).toHaveValue("2700");
    await user.clear(input);
    await user.type(input, "-");
    await user.tab();
    expect(input).toHaveValue("2700");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commits null for an emptied nullable field, and shows null as empty", async () => {
    const user = userEvent.setup();
    const { onCommit, input, view } = setup({ nullable: true, value: 12 });
    await user.clear(input);
    await user.tab();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(null);
    view.rerender(<NumberField label="Wheelbase" nullable value={null} onCommit={onCommit} />);
    expect(input).toHaveValue("");
  });

  it("rounds to `digits` on commit and trims the padding", async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup({ digits: 2, value: 1 });
    await user.clear(input);
    await user.type(input, "1.23456");
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(1.23);
    expect(input).toHaveValue("1.23");
  });

  it("formats an incoming value to `digits`", () => {
    const { input } = setup({ digits: 3, value: 0.1 + 0.2 });
    expect(input).toHaveValue("0.3");
  });

  it("clamps into [min, max] and shows the clamped number", async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup({ min: 0, max: 100, value: 50 });
    await user.clear(input);
    await user.type(input, "500");
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(100);
    expect(input).toHaveValue("100");
    await user.clear(input);
    await user.type(input, "-5");
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(0);
  });

  it("shows the value clamped to max without committing when it was already there", async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup({ max: 100, value: 100 });
    await user.clear(input);
    await user.type(input, "900");
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue("100");
  });

  it("follows the value when it changes from outside", () => {
    const { view, input } = setup();
    view.rerender(<NumberField label="Wheelbase" value={2450} digits={0} onCommit={vi.fn()} />);
    expect(input).toHaveValue("2450");
  });

  describe("locale", () => {
    it("shows and parses a decimal comma under a German provider", async () => {
      const user = userEvent.setup();
      const onCommit = vi.fn();
      render(
        <UiKitProvider locale="de-DE">
          <NumberField label="Rate" value={1.5} onCommit={onCommit} />
        </UiKitProvider>,
      );
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("1,5");
      await user.clear(input);
      await user.type(input, "2,75");
      // The typed comma stays a comma — NumberInput's dot is mapped back.
      expect(input).toHaveValue("2,75");
      await user.tab();
      expect(onCommit).toHaveBeenCalledWith(2.75);
      expect(input).toHaveValue("2,75");
    });

    it("reads a typed dot as the decimal mark too, and evaluates comma calculations", async () => {
      const user = userEvent.setup();
      const onCommit = vi.fn();
      render(<NumberField label="Rate" value={0} locale="de" onCommit={onCommit} />);
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "1.5+1,25");
      expect(input).toHaveValue("1,5+1,25");
      await user.tab();
      expect(onCommit).toHaveBeenCalledWith(2.75);
      expect(input).toHaveValue("2,75");
    });

    it("keeps the dot for an English locale", () => {
      render(<NumberField label="Rate" value={1.5} locale="en-US" onCommit={vi.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("1.5");
    });

    it("falls back to the dot for an invalid locale tag instead of throwing", () => {
      render(<NumberField label="Rate" value={1.5} locale="not a locale!" onCommit={vi.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("1.5");
    });
  });

  describe("unit", () => {
    it("renders the unit as an aria-hidden suffix by default", () => {
      setup({ unit: "mm" });
      expect(screen.getByLabelText("Wheelbase")).toBeInTheDocument();
      expect(screen.getByText("mm")).toHaveAttribute("aria-hidden");
    });

    it("puts the unit in the label with unitPlacement=\"label\"", () => {
      setup({ unit: "mm", unitPlacement: "label" });
      expect(screen.getByLabelText("Wheelbase (mm)")).toBeInTheDocument();
      expect(screen.queryByText("mm")).not.toBeInTheDocument();
    });
  });

  describe("label, error, aria", () => {
    it("paints and announces `error`, merged with a caller's aria-describedby", () => {
      setup({ error: "Too long", "aria-describedby": "outer-hint" });
      const input = screen.getByLabelText("Wheelbase");
      expect(input).toHaveAttribute("aria-invalid", "true");
      const ids = input.getAttribute("aria-describedby")!.split(" ");
      expect(ids[0]).toBe("outer-hint");
      expect(document.getElementById(ids[1]!)).toHaveTextContent("Too long");
      expect(input).toHaveAccessibleDescription("Too long");
    });

    it("renders no wrapper and no description for a falsy error", () => {
      const { view } = setup({ error: false });
      expect(screen.getByLabelText("Wheelbase")).not.toHaveAttribute("aria-invalid");
      expect(screen.getByLabelText("Wheelbase")).not.toHaveAttribute("aria-describedby");
      // FloatingField's own `relative` div is the root.
      expect(view.container.firstElementChild).toHaveClass("relative");
    });

    it("takes `invalid` and a slot-injected aria-invalid", () => {
      const { view } = setup({ invalid: true });
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
      view.rerender(
        <NumberField label="Wheelbase" value={1} aria-invalid="true" onCommit={vi.fn()} />,
      );
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("puts a hint on the label line", () => {
      setup({ hint: <button type="button">Why?</button> });
      expect(screen.getByRole("button", { name: "Why?" })).toBeInTheDocument();
    });
  });

  it("passes NumberInput's props through", () => {
    setup({
      id: "wb",
      className: "w-32",
      inputClassName: "tabular-nums",
      placeholder: "0",
      disabled: true,
      calculator: false,
    });
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "wb");
    expect(input).toHaveClass("tabular-nums");
    expect(input).toBeDisabled();
    expect(input.parentElement).toHaveClass("w-32");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the calculator", () => {
    setup();
    expect(screen.getByRole("button", { name: /calculator/i })).toBeInTheDocument();
  });

  it("does not commit per keystroke even with fireEvent", () => {
    const { onCommit, input } = setup();
    fireEvent.change(input, { target: { value: "12" } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(12);
  });
});
