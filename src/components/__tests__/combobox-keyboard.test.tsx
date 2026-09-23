import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Combobox } from "../combobox";

/**
 * The suggestion field, typed at rather than clicked.
 *
 * `combobox-aria.test.tsx` pins the ATTRIBUTES — role, `aria-expanded`,
 * `aria-controls`, `aria-activedescendant` — with `fireEvent`, which dispatches a
 * keydown straight at the element it is handed. That answers "is the handler
 * correct" and cannot answer "can a user get there": it never focuses anything, so
 * it would still pass if the field were unreachable by Tab, if the list opened on a
 * click only, or if typing did not filter.
 *
 * This is the same component driven the way it is used — Tab in, type, arrow, ↵ —
 * with `user-event`, which moves real focus and fires the full event sequence a
 * browser does (keydown → beforeinput → input → keyup, `document.activeElement`
 * moving with it).
 *
 * `Combobox` is the FREE-TEXT one: the typed text is the value, and the list only
 * suggests. So the keyboard has one case the pickers do not — Enter with nothing
 * highlighted keeps what was typed, and must not silently snap to a suggestion.
 */
const OPTIONS = ["Checking", "Savings", "Credit card"];

/** Controlled, as every caller has it: the field's value is the app's state. */
function Harness({ onChange = vi.fn() }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <button type="button">before</button>
      <Combobox
        label="Payee"
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
        options={OPTIONS}
      />
    </>
  );
}

const field = () => screen.getByRole("combobox", { name: "Payee" });

/** The option the field points at, resolved by id the way a reader does. */
function activeOption(): HTMLElement | null {
  const id = field().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
}

describe("the suggestion combobox's keyboard", () => {
  it("opens on focus from the keyboard, and offers the whole pool", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(field()).toHaveAttribute("aria-expanded", "false");

    await user.tab(); // the button before it
    await user.tab(); // the field
    expect(field()).toHaveFocus();
    expect(field()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(OPTIONS);
  });

  it("walks the list with the arrows and commits on Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(field());

    // Nothing is highlighted until an arrow is pressed: this field's value is the
    // typed text, so a highlight on open would make ↵ mean "accept a suggestion I
    // never asked for".
    expect(field()).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    expect(activeOption()).toHaveTextContent("Checking");
    await user.keyboard("{ArrowDown}");
    expect(activeOption()).toHaveTextContent("Savings");
    await user.keyboard("{ArrowUp}");
    expect(activeOption()).toHaveTextContent("Checking");

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("Checking");
    expect(field()).toHaveValue("Checking");
    expect(field()).toHaveAttribute("aria-expanded", "false");
  });

  it("filters as the user types, and ranks a prefix match first", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.keyboard("c");

    // "Checking" starts with it, "Credit card" too, "Savings" does not match at all.
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Checking",
      "Credit card",
    ]);

    await user.keyboard("r");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Credit card"]);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(field()).toHaveValue("Credit card");
  });

  it("keeps typed text that matches nothing, instead of snapping to a suggestion", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.keyboard("Bäckerei{Enter}");
    expect(field()).toHaveValue("Bäckerei");
    expect(field()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape without changing the value, and leaves focus in the field", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.keyboard("Sav{ArrowDown}{Escape}");

    expect(field()).toHaveAttribute("aria-expanded", "false");
    // Escape is "stop suggesting", not "undo my typing" — the field is a text field
    // whose text the user wrote.
    expect(field()).toHaveValue("Sav");
    expect(field()).toHaveFocus();
    expect(field()).not.toHaveAttribute("aria-activedescendant");
  });

  it("reopens with the full pool after a pick, rather than filtering by the answer", async () => {
    // dev#549: the committed value is not a query. Typing filters; opening does not.
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(field()).toHaveValue("Savings");

    await user.click(field());
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(OPTIONS);
  });
});
