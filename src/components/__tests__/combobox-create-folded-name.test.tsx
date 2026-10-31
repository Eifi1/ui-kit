import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";

/**
 * "Is the typed text a name that already exists" folds like the list's match does
 * (refactor audit 2026-10-30, DUP-5). The match moved onto `foldForSearch` in 0.34, but
 * the create row and the inline blur commit still compared with plain `toLowerCase` — so
 * typing "cafe" listed "Café" as a hit AND offered "Create “cafe”" beside it, the
 * invitation to a duplicate payee, account or shop chain; and "cafe" typed out and
 * tabbed away from did not pick Café.
 */
const OPTIONS = [
  { value: "p1", label: "Café Zürich" },
  { value: "p2", label: "Bakery" },
];

function Inline({
  onChange = vi.fn(),
  onCreate = vi.fn(),
}: {
  onChange?: (v: string | null) => void;
  onCreate?: () => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <InlineEntityCombobox<string>
        label="Payee"
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
        options={OPTIONS}
        onCreate={onCreate}
      />
      <button type="button">after</button>
    </>
  );
}

const createRow = () => screen.queryByRole("option", { name: /Create|Add/ })?.textContent ?? null;

describe("the create row is not offered for a name that differs only in case or accents", () => {
  it("InlineEntityCombobox", async () => {
    const user = userEvent.setup();
    render(<Inline />);
    await user.click(screen.getByRole("combobox", { name: "Payee" }));
    await user.keyboard("cafe zurich");
    expect(screen.getByRole("option", { name: "Café Zürich" })).toBeInTheDocument();
    expect(createRow()).toBeNull();
  });

  it("EntityCombobox", () => {
    render(
      <EntityCombobox<string> label="Payee" value={null} onChange={vi.fn()} options={OPTIONS} onCreate={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Payee/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: " CAFE ZURICH " } });
    expect(screen.getByRole("option", { name: "Café Zürich" })).toBeInTheDocument();
    expect(createRow()).toBeNull();
  });

  it("Combobox's `createLabel` row", async () => {
    const user = userEvent.setup();
    function Free() {
      const [value, setValue] = useState("");
      return (
        <Combobox
          label="Shop"
          value={value}
          onChange={setValue}
          options={["Café Zürich", "Bakery"]}
          createLabel={(v) => `Add “${v}”`}
        />
      );
    }
    render(<Free />);
    await user.click(screen.getByRole("combobox", { name: "Shop" }));
    await user.keyboard("cafe zurich");
    expect(screen.getByRole("option", { name: "Café Zürich" })).toBeInTheDocument();
    expect(createRow()).toBeNull();
  });
});

describe("InlineEntityCombobox's blur commit", () => {
  it("takes the name typed without its accents as that record", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Inline onChange={onChange} />);
    await user.click(screen.getByRole("combobox", { name: "Payee" }));
    await user.keyboard("cafe zurich");
    await user.tab();
    expect(onChange).toHaveBeenCalledWith("p1");
    expect(screen.getByRole("combobox", { name: "Payee" })).toHaveValue("Café Zürich");
  });
});
