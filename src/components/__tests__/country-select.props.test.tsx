import { createRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { CountrySelect } from "../country-select";
import { WriteLockProvider } from "../write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * CountrySelect 0.23 — a `ref` to the trigger (kastlan: react-hook-form's
 * focus-on-error), `clearable` from the later list (a country that can be unset), and
 * `aria-labelledby` reaching the trigger (a form's own label names it).
 */

function Clearable({ initial = "AT", onChange = () => {}, ...props }: {
  initial?: string | null;
  onChange?: (code: string | null) => void;
  disabled?: boolean;
  disabledReason?: string;
  commit?: boolean;
  clearLabel?: string;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <CountrySelect
      label="Nationality"
      clearable
      {...props}
      value={value}
      onChange={(code) => {
        setValue(code);
        onChange(code);
      }}
    />
  );
}

const trigger = () => screen.getByRole("combobox", { name: /Nationality/ });

describe("CountrySelect ref (kastlan)", () => {
  it("points at the focusable trigger", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<CountrySelect ref={ref} label="Country" value="CH" onChange={() => {}} />);
    expect(ref.current).toBe(screen.getByRole("combobox", { name: "Country: Switzerland" }));
    ref.current!.focus();
    expect(ref.current).toHaveFocus();
  });

  it("still anchors and returns focus to the trigger, with a callback ref", () => {
    let seen: HTMLButtonElement | null = null;
    render(<CountrySelect ref={(el) => void (seen = el)} label="Country" value={null} onChange={() => {}} />);
    const button = screen.getByRole("combobox", { name: "Country" });
    expect(seen).toBe(button);
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(button).toHaveFocus();
  });

  it("points at the trigger under a lock too, where it stays focusable", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <CountrySelect ref={ref} label="Country" value="CH" onChange={() => {}} disabledReason="Owner only" />,
    );
    expect(ref.current).toHaveAttribute("aria-disabled", "true");
    ref.current!.focus();
    expect(ref.current).toHaveFocus();
  });
});

describe("CountrySelect clearable", () => {
  it("offers a clear in place of the chevron, which hands onChange null", () => {
    const onChange = vi.fn();
    render(<Clearable onChange={onChange} />);
    const clear = screen.getByRole("button", { name: "Clear" });
    // Out of the tab order, as on EntityCombobox: a pointer shortcut.
    expect(clear).toHaveAttribute("tabindex", "-1");
    fireEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith(null);
    expect(onChange).toHaveBeenCalledTimes(1);
    // A clear does not open the list, and once empty there is nothing left to clear.
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    expect(trigger()).toHaveAccessibleName("Nationality");
  });

  it("clears from the keyboard with Delete or Backspace on the closed trigger", () => {
    const onChange = vi.fn();
    const { unmount } = render(<Clearable onChange={onChange} />);
    fireEvent.keyDown(trigger(), { key: "Delete" });
    expect(onChange).toHaveBeenLastCalledWith(null);
    unmount();
    render(<Clearable onChange={onChange} initial="DE" />);
    fireEvent.keyDown(trigger(), { key: "Backspace" });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("is not offered without `clearable`, and Delete does nothing there", () => {
    const onChange = vi.fn();
    render(<CountrySelect label="Country" value="CH" onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Delete" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is not offered while disabled or locked — a clear is a change", () => {
    const onChange = vi.fn();
    const { unmount } = render(<Clearable onChange={onChange} disabled />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    unmount();
    render(
      <WriteLockProvider locked reason="Read-only">
        <Clearable onChange={onChange} commit />
      </WriteLockProvider>,
    );
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    fireEvent.keyDown(trigger(), { key: "Delete" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is named by the combobox family's `clear`, or by `clearLabel`", () => {
    const { unmount } = render(
      <UiKitProvider labels={{ combobox: { clear: "Leeren" } }}>
        <Clearable />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Leeren" })).toBeInTheDocument();
    unmount();
    render(<Clearable clearLabel="Remove the country" />);
    expect(screen.getByRole("button", { name: "Remove the country" })).toBeInTheDocument();
  });

  it("types onChange to take null only when clearable", () => {
    const takesString = (code: string) => void code;
    // The field as it always was: a `string` handler is fine.
    render(<CountrySelect label="A" value="CH" onChange={takesString} />);
    // @ts-expect-error — a clearable field hands `null` to a handler that cannot take it
    render(<CountrySelect label="B" value="CH" clearable onChange={takesString} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });
});

describe("CountrySelect aria-labelledby", () => {
  it("names the trigger by the caller's element and the chosen country, not the wrapper", () => {
    const { container } = render(
      <>
        <span id="ext-label">Place of birth</span>
        <CountrySelect aria-labelledby="ext-label" value="CH" onChange={() => {}} />
      </>,
    );
    const button = screen.getByRole("combobox", { name: "Place of birth Switzerland" });
    expect(button).not.toHaveAttribute("aria-label");
    expect(container.querySelector("div[aria-labelledby]")).toBeNull();
  });

  it("empty: the label alone, and no `country` fallback word in the box", () => {
    render(
      <>
        <span id="ext-label">Place of birth</span>
        <CountrySelect aria-labelledby="ext-label" value={null} onChange={() => {}} />
      </>,
    );
    const button = screen.getByRole("combobox", { name: "Place of birth" });
    expect(button).toHaveTextContent(/^$/);
  });

  it("an aria-label still wins", () => {
    render(
      <>
        <span id="ext-label">Place of birth</span>
        <CountrySelect aria-labelledby="ext-label" aria-label="Birth country" value="CH" onChange={() => {}} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Birth country" })).toBeInTheDocument();
  });
});
