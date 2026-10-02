import { useState } from "react";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OneTimeCodeInput } from "../one-time-code-input";
import type { OneTimeCodeInputProps } from "../one-time-code-input";
import { FieldHint } from "../ui";

/** A controlled field, as an app holds it; `onChange` / `onComplete` spies optional. */
function Harness({
  initial = "",
  onChange,
  ...props
}: Partial<OneTimeCodeInputProps> & { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <OneTimeCodeInput
      label="Verification code"
      {...props}
      value={value}
      onChange={(code) => {
        setValue(code);
        onChange?.(code);
      }}
    />
  );
}

/** A paste event carrying `text`, dispatched the way a browser does. */
function paste(input: HTMLElement, text: string) {
  const event = createEvent.paste(input, {
    clipboardData: { getData: (type: string) => (type === "text" || type === "text/plain" ? text : "") },
  });
  fireEvent(input, event);
  return event;
}

describe("OneTimeCodeInput", () => {
  it("is one text field for the platform's code autofill: numeric keypad, one-time-code, no maxLength", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Verification code");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("pattern", "[0-9]*");
    // The browser would truncate a paste to it BEFORE the cleaning saw it.
    expect(input).not.toHaveAttribute("maxlength");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("takes digits only, as a string that keeps its leading zeros", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByLabelText("Verification code");
    await userEvent.type(input, "0a1 2-3x");
    expect(input).toHaveValue("0123");
    expect(onChange).toHaveBeenLastCalledWith("0123");
    // A refused character is no change at all.
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it("strips the spaces and dashes of a pasted code", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByLabelText("Verification code");
    // What the browser's default insertion produces for a paste into an empty field.
    fireEvent.change(input, { target: { value: "012 345" } });
    expect(input).toHaveValue("012345");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "012-345" } });
    expect(input).toHaveValue("012345");
    expect(onChange).toHaveBeenLastCalledWith("012345");
  });

  it("folds full-width digits from an input method to ASCII", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Verification code");
    fireEvent.change(input, { target: { value: "０１２３４５" } });
    expect(input).toHaveValue("012345");
  });

  it("replaces the field with a pasted whole code, wherever the caret is", () => {
    const onChange = vi.fn();
    render(<Harness initial="98" onChange={onChange} />);
    const input = screen.getByLabelText("Verification code");
    const event = paste(input, " 123-456 ");
    expect(event.defaultPrevented).toBe(true);
    expect(input).toHaveValue("123456");
    expect(onChange).toHaveBeenCalledWith("123456");
  });

  it("leaves a partial paste to the browser's insertion, then cleans it", () => {
    render(<Harness initial="12" />);
    const input = screen.getByLabelText("Verification code");
    const event = paste(input, "3 4");
    expect(event.defaultPrevented).toBe(false);
    fireEvent.change(input, { target: { value: "123 4" } });
    expect(input).toHaveValue("1234");
  });

  it("refuses a digit past `length` once full, and keeps the first `length` of a long paste", async () => {
    render(<Harness initial="1234" length={4} />);
    const input = screen.getByLabelText("Verification code");
    await userEvent.type(input, "5");
    expect(input).toHaveValue("1234");

    render(<Harness length={4} label="Second" />);
    const second = screen.getByLabelText("Second");
    fireEvent.change(second, { target: { value: "987654" } });
    expect(second).toHaveValue("9876");
  });

  it("keeps the caret where it was when a character is dropped", () => {
    render(<Harness initial="1234" />);
    const input = screen.getByLabelText("Verification code") as HTMLInputElement;
    // A space typed after the second digit: the raw text is "12 34", caret after it.
    // The prototype's setter, as the browser's own typing does: the element's own
    // `value` is React's tracker, and setting it would hide the change from React.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "12 34");
    input.setSelectionRange(3, 3);
    fireEvent.change(input);
    expect(input).toHaveValue("1234");
    expect(input.selectionStart).toBe(2);
  });

  it("calls onComplete when an edit fills the code, and never submits", async () => {
    const onComplete = vi.fn();
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness onComplete={onComplete} />
      </form>,
    );
    const input = screen.getByLabelText("Verification code");
    await userEvent.type(input, "00042");
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.type(input, "7");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("000427");
    expect(onSubmit).not.toHaveBeenCalled();
    // A refused seventh digit changes nothing, so it completes nothing.
    await userEvent.type(input, "8");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not call onComplete for a value set from outside", () => {
    const onComplete = vi.fn();
    render(<OneTimeCodeInput label="Code" value="123456" onChange={() => {}} onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("reads like every kit field: a text hint and an error under it, described in that order", () => {
    render(
      <OneTimeCodeInput
        label="Code"
        value=""
        onChange={() => {}}
        aria-describedby="outside"
        hint="Six digits from your authenticator app"
        error="That code has expired"
      />,
    );
    const input = screen.getByLabelText("Code");
    const hint = screen.getByText("Six digits from your authenticator app");
    const error = screen.getByText("That code has expired");
    expect(input).toHaveAttribute("aria-describedby", `outside ${hint.id} ${error.id}`);
    expect(input).toHaveAttribute("aria-invalid", "true");
    // Hint first on screen too: the standing advice, then the news.
    expect(hint.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts a FieldHint on the label line, and at the end edge without a label", () => {
    const { unmount } = render(
      <OneTimeCodeInput label="Code" value="" onChange={() => {}} hint={<FieldHint label="Where to find it" />} />,
    );
    expect(screen.getByRole("button", { name: "Where to find it" })).toBeInTheDocument();
    unmount();
    render(
      <OneTimeCodeInput aria-label="Code" value="" onChange={() => {}} hint={<FieldHint label="Where to find it" />} />,
    );
    expect(screen.getByRole("button", { name: "Where to find it" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Code" })).toBeInTheDocument();
  });

  it("keeps the same input element when an error comes and goes", () => {
    const { rerender } = render(<OneTimeCodeInput label="Code" value="1" onChange={() => {}} error={undefined} />);
    const before = screen.getByLabelText("Code");
    rerender(<OneTimeCodeInput label="Code" value="1" onChange={() => {}} error="Wrong code" />);
    expect(screen.getByLabelText("Code")).toBe(before);
    rerender(<OneTimeCodeInput label="Code" value="1" onChange={() => {}} error={null} />);
    expect(screen.getByLabelText("Code")).toBe(before);
  });

  it("unlabelled, shows the caller's placeholder and takes its name from aria-labelledby", () => {
    render(
      <>
        <p id="prompt">Enter the code from your app</p>
        <OneTimeCodeInput aria-labelledby="prompt" placeholder="000000" value="" onChange={() => {}} />
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Enter the code from your app" });
    expect(input).toHaveAttribute("placeholder", "000000");
  });

  describe("readOnlyUntilFocus", () => {
    it("is read-only until focused, looking editable all the while, then writable for good", async () => {
      render(<Harness readOnlyUntilFocus />);
      const input = screen.getByLabelText("Verification code");
      expect(input).toHaveAttribute("readonly");
      // FIELD_WRITABLE_LOOK cancels FIELD_BASE's read-only grey.
      expect(input.className).toContain("[&[readonly]]:bg-[var(--bg-surface)]");
      await userEvent.click(input);
      expect(input).not.toHaveAttribute("readonly");
      await userEvent.type(input, "123");
      expect(input).toHaveValue("123");
      input.blur();
      expect(input).not.toHaveAttribute("readonly");
    });

    it("is off by default, and a caller's own readOnly keeps the settled grey", () => {
      render(
        <>
          <OneTimeCodeInput label="Plain" value="" onChange={() => {}} />
          <OneTimeCodeInput label="Locked" value="123456" readOnly readOnlyUntilFocus onChange={() => {}} />
        </>,
      );
      expect(screen.getByLabelText("Plain")).not.toHaveAttribute("readonly");
      const locked = screen.getByLabelText("Locked");
      fireEvent.focus(locked);
      expect(locked).toHaveAttribute("readonly");
      expect(locked.className).not.toContain("[&[readonly]]:bg-[var(--bg-surface)]");
    });

    it("lets a read-only field ignore a pasted code", () => {
      const onChange = vi.fn();
      render(<OneTimeCodeInput label="Locked" value="" readOnly onChange={onChange} />);
      const event = paste(screen.getByLabelText("Locked"), "123456");
      expect(event.defaultPrevented).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("still calls the caller's onFocus", () => {
      const onFocus = vi.fn();
      render(<Harness readOnlyUntilFocus onFocus={onFocus} />);
      fireEvent.focus(screen.getByLabelText("Verification code"));
      expect(onFocus).toHaveBeenCalledTimes(1);
    });
  });
});
