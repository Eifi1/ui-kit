import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EntityCombobox } from "../entity-combobox";
import { GroupedPicker } from "../grouped-picker";

/**
 * A picker's query is its words, every one of which must appear in a row (0.51.4,
 * keksdose's /prices shop picker): "Migros Zürich" found nothing while the filter wanted
 * the whole query as one substring of one text.
 */

const SHOPS = [
  { value: "m-8004", label: "8004 Zürich", sublabel: "Migros", group: "Migros" },
  { value: "m-3011", label: "3011 Bern", sublabel: "Migros", group: "Migros" },
  { value: "c-8004", label: "8004 Zürich", sublabel: "Coop", group: "Coop" },
];

describe("multi-word search in the pickers", () => {
  it("EntityCombobox: each word in the label or the sublabel", () => {
    render(<EntityCombobox<string> label="Shop" value={null} onChange={() => {}} options={SHOPS} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Shop/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "migros zurich" } });
    const names = screen.getAllByRole("option").map((o) => o.textContent);
    expect(names).toHaveLength(1);
    expect(names[0]).toContain("8004 Zürich");
    expect(names[0]).toContain("Migros");
  });

  it("GroupedPicker: a word in the group's name and one in the item's label", () => {
    render(
      <GroupedPicker
        aria-label="Shop"
        buttonLabel="Shop"
        selected={null}
        onSelect={() => {}}
        filterPlaceholder="Filter"
        groups={[
          { key: "migros", label: "Migros", items: [{ key: "m-8004", label: "8004 Zürich" }, { key: "m-3011", label: "3011 Bern" }] },
          { key: "coop", label: "Coop", items: [{ key: "c-8004", label: "8004 Zürich" }] },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Shop/ }));
    const search = screen.getByPlaceholderText("Filter");
    fireEvent.change(search, { target: { value: "Migros 8004" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["8004 Zürich"]);
    // The group's name alone still keeps the whole group.
    fireEvent.change(search, { target: { value: "migros" } });
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });
});
