import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { IconButton, Input, Label, Select, Tabs } from "../ui";
import type { TabItem } from "../ui";
import { SearchField } from "../search-field";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * Field anatomy for 0.6.0: the pieces three apps hand-rolled around the kit's fields
 * because the kit's own could not be sized, labelled or extended to fit — kastlan's
 * label above a field and its toolbar select, lenkbank's row/chip icon actions and its
 * sheet tabs, keksdose's header search.
 */

const classes = (el: Element) => el.className.split(/\s+/);

describe("Label", () => {
  it("is a real label: a click on it focuses its control", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
      </>,
    );
    await user.click(screen.getByText("Name"));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
  });

  it("draws the required mark but keeps it out of the control's name", () => {
    render(
      <>
        <Label htmlFor="iban" required>
          IBAN
        </Label>
        <Input id="iban" required />
      </>,
    );
    const field = screen.getByRole("textbox", { name: "IBAN" });
    // The mark is on screen…
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    // …and "required" is what the control itself says.
    expect(field).toBeRequired();
  });

  it("has a compact size for a toolbar", () => {
    render(<Label size="sm">As of</Label>);
    expect(classes(screen.getByText("As of"))).toContain("text-xs");
  });
});

describe("Select size", () => {
  it("sizes an unlabelled select down to the toolbar height", () => {
    render(
      <Select size="sm" aria-label="Period">
        <option>Month</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Period" });
    expect(classes(select)).toEqual(expect.arrayContaining(["h-7", "text-xs", "py-0"]));
    // The word never reaches the DOM — `size="sm"` on a <select> is not a number.
    expect(select).not.toHaveAttribute("size");
  });

  it("still passes a NUMBER through as the native list-box rows", () => {
    render(
      <Select size={4} aria-label="Accounts">
        <option>A</option>
      </Select>,
    );
    expect(screen.getByRole("listbox", { name: "Accounts" })).toHaveAttribute("size", "4");
  });

  it("puts selectClassName on the <select>, className on the wrapper", () => {
    render(
      <Select aria-label="Sort" className="w-40" selectClassName="font-mono">
        <option>Name</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Sort" });
    expect(classes(select)).toContain("font-mono");
    expect(classes(select)).not.toContain("w-40");
    expect(classes(select.parentElement!)).toContain("w-40");
  });

  it("ignores `sm` on a labelled select, which needs the tall box for its label", () => {
    render(
      <Select size="sm" label="Period">
        <option>Month</option>
      </Select>,
    );
    expect(classes(screen.getByRole("combobox", { name: "Period" }))).not.toContain("h-7");
  });
});

describe("IconButton", () => {
  it("keeps the two existing sizes and adds the two small steps", () => {
    render(
      <>
        <IconButton aria-label="md" />
        <IconButton aria-label="sm" size="sm" />
        <IconButton aria-label="xs" size="xs" />
        <IconButton aria-label="2xs" size="2xs" />
      </>,
    );
    expect(classes(screen.getByRole("button", { name: "md" }))).toContain("size-9");
    expect(classes(screen.getByRole("button", { name: "sm" }))).toContain("size-8");
    expect(classes(screen.getByRole("button", { name: "xs" }))).toContain("size-7");
    expect(classes(screen.getByRole("button", { name: "2xs" }))).toContain("size-6");
  });

  it("turns red on hover with tone=danger, from the danger tokens", () => {
    render(<IconButton aria-label="Delete" tone="danger" />);
    const cls = classes(screen.getByRole("button", { name: "Delete" }));
    expect(cls).toContain("hover:text-[var(--danger)]");
    expect(cls).toContain("hover:bg-[var(--danger-bg)]");
  });

  it("keeps a click and its Enter from reaching a clickable row", async () => {
    const user = userEvent.setup();
    const row = vi.fn();
    const remove = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onClick={row} onKeyDown={row}>
        <IconButton aria-label="Delete" stopPropagation onClick={remove}>
          <Trash2 />
        </IconButton>
      </div>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    await user.click(button);
    button.focus();
    await user.keyboard("{Enter}");
    expect(remove).toHaveBeenCalledTimes(2);
    expect(row).not.toHaveBeenCalled();
  });
});

/* ── Tabs: add / remove / adornments ──────────────────────────────────────── */

type Sheet = "a" | "b" | "c" | "d";
const SHEETS: TabItem<Sheet>[] = [
  { id: "a", label: "40 km/h" },
  { id: "b", label: "80 km/h", detail: "loop 2" },
  { id: "c", label: "120 km/h", empty: true, icon: <span data-testid="swatch" /> },
];

function Workbook({ onRemove: spy, busy }: { onRemove?: (id: Sheet) => void; busy?: boolean }) {
  const [tabs, setTabs] = useState(SHEETS);
  const [active, setActive] = useState<Sheet>("b");
  return (
    <>
      <Tabs
        aria-label="Sheets"
        tabs={tabs}
        active={active}
        onChange={setActive}
        busy={busy}
        onRemove={(id) => {
          spy?.(id);
          const index = tabs.findIndex((t) => t.id === id);
          const next = tabs.filter((t) => t.id !== id);
          setTabs(next);
          if (id === active) setActive((next[index - 1] ?? next[0]).id);
        }}
        onAdd={() => setTabs((t) => [...t, { id: "d", label: "160 km/h" }])}
        addLabel="Add loop"
      />
      <button type="button">elsewhere</button>
    </>
  );
}

describe("Tabs — add, remove, adornments", () => {
  it("names the × after its tab and shows it on the open tab only", () => {
    render(<Workbook />);
    expect(screen.getByRole("button", { name: "Remove 80 km/h" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove 40 km/h" })).toBeNull();
  });

  it("reserves the ×'s room on every removable tab, so opening one moves nothing", () => {
    render(<Workbook />);
    for (const t of screen.getAllByRole("tab")) expect(classes(t)).toContain("pe-8");
  });

  it("removes through the × and puts focus on the caller's new selection", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Workbook onRemove={spy} />);
    await user.click(screen.getByRole("button", { name: "Remove 80 km/h" }));
    expect(spy).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("tab", { name: /80 km\/h/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveAttribute("aria-selected", "true");
  });

  it("removes the FOCUSED tab on Delete and focuses its neighbour", async () => {
    const user = userEvent.setup();
    render(<Workbook />);
    screen.getByRole("tab", { name: /80 km\/h/ }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveFocus();
    await user.keyboard("{Delete}");
    expect(screen.queryByRole("tab", { name: "40 km/h" })).toBeNull();
    expect(screen.getByRole("tab", { name: /80 km\/h/ })).toHaveFocus();
  });

  it("announces Delete as the tab's shortcut", () => {
    render(<Workbook />);
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Delete",
    );
  });

  it("does not remove anything while busy", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Workbook onRemove={spy} busy />);
    expect(screen.getByRole("button", { name: "Remove 80 km/h" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add loop" })).toBeDisabled();
    screen.getByRole("tab", { name: /80 km\/h/ }).focus();
    await user.keyboard("{Delete}");
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps the add button and the × out of the tab order's single stop", async () => {
    const user = userEvent.setup();
    render(<Workbook />);
    await user.tab();
    expect(screen.getByRole("tab", { name: /80 km\/h/ })).toHaveFocus();
    await user.tab();
    // Not the ×: the add button, which is an ordinary action after the strip.
    expect(screen.getByRole("button", { name: "Add loop" })).toHaveFocus();
  });

  it("adds through a button OUTSIDE the tablist, since a tablist owns only tabs", async () => {
    const user = userEvent.setup();
    render(<Workbook />);
    const list = screen.getByRole("tablist", { name: "Sheets" });
    const add = screen.getByRole("button", { name: "Add loop" });
    expect(list).not.toContainElement(add);
    await user.click(add);
    expect(within(list).getByRole("tab", { name: "160 km/h" })).toBeInTheDocument();
  });

  it("draws the detail line into the name, the icon out of it, and dashes an empty tab", () => {
    render(<Workbook />);
    expect(screen.getByRole("tab", { name: "80 km/h loop 2" })).toBeInTheDocument();
    const empty = screen.getByRole("tab", { name: "120 km/h" });
    expect(screen.getByTestId("swatch").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(empty.firstElementChild!.className).toContain("border-dashed");
  });

  it("keeps a tab marked removable={false}", () => {
    render(
      <Tabs
        tabs={[{ id: "x", label: "Base", removable: false }]}
        active="x"
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("tab", { name: "Base" })).not.toHaveAttribute("aria-keyshortcuts");
  });

  it("speaks the provider's language for its own strings", () => {
    render(
      <UiKitProvider labels={{ tabs: { add: "Blatt hinzufügen", remove: (t) => `${t} entfernen` } }}>
        <Tabs
          tabs={[{ id: "x", label: <b>Eins</b>, name: "Eins" }]}
          active="x"
          onChange={vi.fn()}
          onRemove={vi.fn()}
          onAdd={vi.fn()}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Eins entfernen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blatt hinzufügen" })).toBeInTheDocument();
  });

  it("renders exactly the old strip when none of the new props are set", () => {
    const { container } = render(
      <Tabs tabs={[{ id: "x", label: "X" }]} active="x" onChange={vi.fn()} className="mb-4" />,
    );
    const list = screen.getByRole("tablist");
    expect(container.firstElementChild).toBe(list);
    expect(classes(list)).toContain("mb-4");
    expect(screen.getByRole("tab", { name: "X" }).parentElement).toBe(list);
  });
});

describe("SearchField — inline variant", () => {
  it("drops the field chrome and its type size, keeping the searchbox", () => {
    render(<SearchField variant="inline" value="" onChange={vi.fn()} aria-label="Search" />);
    const box = screen.getByRole("searchbox", { name: "Search" });
    const cls = classes(box);
    expect(cls).toContain("border-0");
    expect(cls).toContain("bg-transparent");
    expect(cls).not.toContain("text-sm");
    expect(cls).not.toContain("shadow-sm");
  });

  it("puts inputClassName on the input, className on the wrapper", () => {
    render(
      <SearchField
        value=""
        onChange={vi.fn()}
        aria-label="Search"
        className="flex-1"
        inputClassName="text-base"
      />,
    );
    const box = screen.getByRole("searchbox", { name: "Search" });
    expect(classes(box)).toContain("text-base");
    expect(classes(box)).not.toContain("text-sm");
    expect(classes(box.parentElement!)).toContain("flex-1");
  });

  it("keeps its clear button in the inline form", () => {
    const onChange = vi.fn();
    render(
      <SearchField variant="inline" value="rent" onChange={onChange} aria-label="Search" clearLabel="Clear" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
