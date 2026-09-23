import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_PASSWORD_REVEAL_LABELS, Input, Select, Textarea } from "../ui";

/**
 * Audit 2026-09-22, §Accessibility: *"`invalid` sets aria-invalid but the package has
 * no way to attach the error text"* and *"Select silently deletes a caller's own
 * aria-invalid; Input does not"*.
 *
 * A field that announces "invalid" and nothing else has told a screen-reader user only
 * that they are stuck. Three Keksdose dialogs flag a mismatched passphrase; none of
 * them can say WHY, because the message is a sibling `<p>` the control does not point
 * at. `error` is that pointer — and it has to MERGE into `aria-describedby` rather
 * than own it, because a field that already describes itself with a hint would
 * otherwise trade the hint for the error.
 *
 * The password reveal toggle is in here too: it was `tabIndex={-1}`, i.e. a painted,
 * clickable control that Tab skipped, which is the one population that cannot check
 * what it typed by looking.
 */

const described = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);

/** The text of every element `el` points at with aria-describedby. */
const descriptions = (el: Element) =>
  described(el).map((id) => document.getElementById(id)?.textContent ?? `#${id} MISSING`);

describe("field error text", () => {
  describe("Input", () => {
    it("renders the message and points the control at it", () => {
      render(<Input label="Passphrase" error="Too short" />);
      const input = screen.getByLabelText("Passphrase");
      expect(screen.getByText("Too short")).toBeInTheDocument();
      expect(descriptions(input)).toEqual(["Too short"]);
    });

    it("implies aria-invalid without the caller also passing `invalid`", () => {
      render(<Input label="Passphrase" error="Too short" />);
      expect(screen.getByLabelText("Passphrase")).toHaveAttribute("aria-invalid", "true");
    });

    it("MERGES with an aria-describedby the caller already passed", () => {
      render(
        <div>
          <span id="pw-hint">At least twelve characters</span>
          <Input label="Passphrase" aria-describedby="pw-hint" error="Too short" />
        </div>,
      );
      const input = screen.getByLabelText("Passphrase");
      // The hint survives, and it stays FIRST: it is the standing advice, the error is
      // the news.
      expect(descriptions(input)).toEqual(["At least twelve characters", "Too short"]);
    });

    it("leaves `invalid` working alone, for a message that lives elsewhere", () => {
      render(<Input label="Passphrase" invalid />);
      const input = screen.getByLabelText("Passphrase");
      expect(input).toHaveAttribute("aria-invalid", "true");
      // No message means nothing to point at — a dangling id describes the field as
      // nothing at all.
      expect(described(input)).toEqual([]);
    });

    it("mints a distinct id per field, so two errors on one form do not collide", () => {
      render(
        <form>
          <Input label="One" error="First problem" />
          <Input label="Two" error="Second problem" />
        </form>,
      );
      expect(descriptions(screen.getByLabelText("One"))).toEqual(["First problem"]);
      expect(descriptions(screen.getByLabelText("Two"))).toEqual(["Second problem"]);
    });

    it("works on an unlabelled field too, and still forwards the ref", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} aria-label="Bare" error="Nope" />);
      const input = screen.getByLabelText("Bare");
      expect(ref.current).toBe(input);
      expect(descriptions(input)).toEqual(["Nope"]);
    });

    it("adds nothing at all when there is no message", () => {
      const { container } = render(<Input aria-label="Bare" />);
      // The bare field is a lone <input> a caller drops into a flex row; it may not
      // grow a wrapper for a message it does not have.
      expect(container.firstElementChild?.tagName).toBe("INPUT");
    });
  });

  describe("Select", () => {
    it("keeps a caller's own aria-invalid, the way Input does", () => {
      render(
        <Select label="Kind" aria-invalid="grammar">
          <option>a</option>
        </Select>,
      );
      expect(screen.getByLabelText("Kind")).toHaveAttribute("aria-invalid", "grammar");
    });

    it("keeps it on an unlabelled select as well", () => {
      render(
        <Select aria-label="Kind" aria-invalid="true">
          <option>a</option>
        </Select>,
      );
      expect(screen.getByLabelText("Kind")).toHaveAttribute("aria-invalid", "true");
    });

    it("forwards a caller's id to the element, so an outside <label for> can name it", () => {
      render(
        <div>
          <label htmlFor="kind">Kind</label>
          <Select id="kind">
            <option>a</option>
          </Select>
        </div>,
      );
      // Without the id the <select> is focusable and nameless: in the tab order, and
      // invisible to a screen reader.
      expect(screen.getByLabelText("Kind").tagName).toBe("SELECT");
    });

    it("carries an error message the same way Input does", () => {
      render(
        <Select label="Kind" error="Pick one">
          <option>a</option>
        </Select>,
      );
      const select = screen.getByLabelText("Kind");
      expect(select).toHaveAttribute("aria-invalid", "true");
      expect(descriptions(select)).toEqual(["Pick one"]);
    });
  });

  describe("Textarea", () => {
    it("carries an error message and merges the describedby", () => {
      render(
        <div>
          <span id="note-hint">Markdown is fine</span>
          <Textarea label="Note" aria-describedby="note-hint" error="Too long" />
        </div>,
      );
      const area = screen.getByLabelText("Note");
      expect(area).toHaveAttribute("aria-invalid", "true");
      expect(descriptions(area)).toEqual(["Markdown is fine", "Too long"]);
    });
  });

  describe("password reveal toggle", () => {
    // jsdom walks no tab order, so the thing that decides it is asserted directly:
    // `tabIndex={-1}` was a painted, clickable button that Tab skipped.
    it("is in the tab order", () => {
      render(<Input label="Passphrase" type="password" />);
      const toggle = screen.getByRole("button", { name: DEFAULT_PASSWORD_REVEAL_LABELS.show });
      expect(toggle).not.toHaveAttribute("tabindex");
      expect(toggle).not.toBeDisabled();
    });

    it("reveals and re-hides, and says which it will do next", () => {
      render(<Input label="Passphrase" type="password" />);
      const toggle = screen.getByRole("button", { name: DEFAULT_PASSWORD_REVEAL_LABELS.show });
      expect(screen.getByLabelText("Passphrase")).toHaveAttribute("type", "password");
      fireEvent.click(toggle);
      expect(screen.getByLabelText("Passphrase")).toHaveAttribute("type", "text");
      expect(toggle).toHaveAttribute("aria-pressed", "true");
      expect(toggle).toHaveAccessibleName(DEFAULT_PASSWORD_REVEAL_LABELS.hide);
      fireEvent.click(toggle);
      expect(screen.getByLabelText("Passphrase")).toHaveAttribute("type", "password");
    });

    it("takes its name from a prop, with an English default", () => {
      render(
        <Input
          label="Passphrase"
          type="password"
          passwordLabels={{ show: "Passwort anzeigen", hide: "Passwort verbergen" }}
        />,
      );
      expect(screen.getByRole("button", { name: "Passwort anzeigen" })).toBeInTheDocument();
    });

    it("falls back to the English default for a label the caller did not override", () => {
      render(<Input label="Passphrase" type="password" passwordLabels={{ show: "Zeigen" }} />);
      expect(screen.getByRole("button", { name: "Zeigen" })).toBeInTheDocument();
      expect(DEFAULT_PASSWORD_REVEAL_LABELS.hide).toBe("Hide password");
    });

    it("is not handed to the keyboard on a field the user may not edit", () => {
      render(<Input label="Passphrase" type="password" disabled />);
      expect(screen.getByRole("button", { name: DEFAULT_PASSWORD_REVEAL_LABELS.show })).toBeDisabled();
    });
  });
});
